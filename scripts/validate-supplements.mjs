import { readdir, readFile, lstat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const json = async file => JSON.parse(await readFile(file, 'utf8'));

const publicationStatuses = new Set(['draft', 'published']);

/** Validate editorial sources and enforce complete metadata for published resources. */
export async function validateSupplements(contentRoot = path.join(root, 'content')) {
  let count = 0;
  for (const locale of await readdir(contentRoot, { withFileTypes: true })) {
    if (!locale.isDirectory() || locale.name.startsWith('_')) continue;
    const base = path.join(contentRoot, locale.name, 'adult-supplements');
    let quarters;
    try { quarters = await readdir(base, { withFileTypes: true }); }
    catch (error) { if (error.code === 'ENOENT') continue; throw error; }
    const ids = new Set();
    for (const quarter of quarters.filter(entry => entry.isDirectory())) {
      assert(/^\d{4}-q[1-4]$/.test(quarter.name), `Invalid supplement quarter: ${quarter.name}`);
      const dir = path.join(base, quarter.name);
      const collection = await json(path.join(dir, 'collection.json'));
      assert(collection.schemaVersion === 'sabatku-supplements-v1' && collection.locale === locale.name && collection.quarter === quarter.name, `${dir}: collection identity mismatch`);
      assert(collection.audienceCategory === 'adult' && collection.programRole === 'supplement', `${dir}: supplements belong to Adult`);
      assert(publicationStatuses.has(collection.publicationStatus), `${dir}: collection publicationStatus must be draft or published`);
      assert(collection.id === `adult-supplements:${locale.name}:${quarter.name}` && typeof collection.title === 'string' && collection.title.trim() && Number.isInteger(collection.revision) && collection.revision > 0, `${dir}: collection metadata incomplete`);
      assert(Array.isArray(collection.editionBindings) && collection.editionBindings.length > 0, `${dir}: edition bindings required`);
      const boundPrograms = new Set();
      for (const binding of collection.editionBindings) {
        assert(['adult-standard', 'adult-easy-reading'].includes(binding.programId) && !boundPrograms.has(binding.programId), `${dir}: invalid or duplicate edition binding`);
        assert(binding.locale === locale.name && typeof binding.editionId === 'string' && /^[a-zA-Z0-9-]+$/.test(binding.editionId) && ['{number:02}', 'lesson-{number:02}'].includes(binding.unitIdPattern), `${dir}: invalid edition target`);
        boundPrograms.add(binding.programId);
      }
      assert(Array.isArray(collection.lessons) && collection.lessons.length > 0, `${dir}: lesson index required`);
      assert(new Set(collection.lessons.map(x => x.lessonId)).size === collection.lessons.length, `${dir}: duplicate lesson index`);
      let publishedResourceCount = 0;
      for (const lesson of collection.lessons) {
        assert(/^lesson-\d{2}$/.test(lesson.lessonId) && lesson.manifest === `${lesson.lessonId}/resources.json`, `${dir}: invalid lesson path`);
        const lessonDir = path.join(dir, lesson.lessonId);
        const manifest = await json(path.join(lessonDir, 'resources.json'));
        const studyId = `adult:${quarter.name}:${lesson.lessonId}`;
        assert(manifest.schemaVersion === 'sabatku-supplement-resources-v1' && manifest.studyId === studyId && manifest.locale === locale.name, `${lessonDir}: study identity mismatch`);
        assert(Array.isArray(manifest.resources), `${lessonDir}: resources must be an array`);
        for (const resource of manifest.resources) {
          const label = `${lessonDir}/${resource.key}`;
          assert(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(resource.key), `${label}: invalid key`);
          assert(resource.id === `adult-supplement:${locale.name}:${quarter.name}:${lesson.lessonId}:${resource.key}` && !ids.has(resource.id), `${label}: invalid or duplicate resource ID`);
          ids.add(resource.id);
          assert(resource.scope === 'weekly' && resource.studyId === studyId && resource.locale === locale.name, `${label}: wrong study relation`);
          assert(publicationStatuses.has(resource.publicationStatus), `${label}: publicationStatus must be draft or published`);
          assert(resource.audienceCategory === 'adult' && resource.programRole === 'supplement', `${label}: invalid audience/role`);
          assert(['summary', 'teacher-guide', 'discussion-outline'].includes(resource.kind), `${label}: invalid resource kind`);
          assert(resource.title?.trim() && resource.source?.id && Number.isInteger(resource.revision) && resource.revision > 0, `${label}: metadata incomplete`);
          assert(typeof resource.source.name === 'string' && resource.source.name.trim() && (resource.source.url === null || typeof resource.source.url === 'string') && ['original', 'translation', 'adaptation'].includes(resource.editorialType), `${label}: source/editorial metadata incomplete`);
          assert(Array.isArray(resource.appliesToPrograms) && resource.appliesToPrograms.length > 0 && resource.appliesToPrograms.every(id => ['adult-standard', 'adult-easy-reading'].includes(id)), `${label}: explicit Adult edition links required`);
          assert(new Set(resource.appliesToPrograms).size === resource.appliesToPrograms.length && resource.appliesToPrograms.every(id => boundPrograms.has(id)), `${label}: edition links must be unique and bound in collection`);
          assert(Array.isArray(resource.formats), `${label}: formats must be an array`);
          const formats = new Set();
          const files = new Set();
          for (const format of resource.formats) {
            assert(['text/markdown', 'application/pdf'].includes(format.mediaType) && !formats.has(format.mediaType), `${label}: invalid or duplicate format`);
            formats.add(format.mediaType);
            const extension = format.mediaType === 'text/markdown' ? '.md' : '.pdf';
            assert(typeof format.file === 'string' && format.file.startsWith(`${resource.key}/`) && !format.file.includes('\\') && !format.file.split('/').some(x => ['..', '.', ''].includes(x)) && format.file.endsWith(extension), `${label}: unsafe or mismatched format path`);
            assert(!files.has(format.file), `${label}: duplicate format file ${format.file}`);
            files.add(format.file);
            const file = path.join(lessonDir, format.file);
            let current = lessonDir;
            for (const segment of format.file.split('/')) {
              current = path.join(current, segment);
              assert(!(await lstat(current)).isSymbolicLink(), `${label}: symlink assets are not allowed`);
            }
            const bytes = await readFile(file);
            assert(bytes.length > 0, `${label}: empty file`);
            if (extension === '.pdf') assert(bytes.subarray(0, 5).toString() === '%PDF-', `${label}: invalid PDF header`);
            if (extension === '.md') {
              const markdown = bytes.toString('utf8').trim();
              assert(markdown.length > 0 && !/^(?:#\s*)?(?:DRAF KERANGKA|GANTI DENGAN|MATERI RESMI MENUNGGU)/im.test(markdown), `${label}: replace draft or placeholder Markdown before publication`);
              assert(!/<\/?[A-Za-z][A-Za-z0-9-]*(?:\s[^<>]*)?\s*\/?>/i.test(markdown), `${label}: raw HTML is not allowed in published Markdown`);
              for (const destination of [...markdown.matchAll(/\]\((<[^>]*>|[^)\s]+)(?:\s+[^)]*)?\)/g)].map(match => match[1].replace(/^<|>$/g, ''))) {
                assert(!/^(?:javascript|data|file|vbscript):/i.test(destination) && !destination.startsWith('//'), `${label}: unsafe Markdown link destination`);
                assert(!destination.split(/[?#]/, 1)[0].split('/').includes('..'), `${label}: Markdown links may not traverse parent paths`);
              }
            }
          }
          if (resource.publicationStatus === 'published') {
            publishedResourceCount++;
            assert(formats.size > 0, `${label}: published resources need at least one available format`);
            assert(typeof resource.attribution === 'string' && resource.attribution.trim(), `${label}: published resources need attribution`);
            assert(typeof resource.rightsStatement === 'string' && resource.rightsStatement.trim(), `${label}: published resources need a rights statement`);
            if (resource.editorialType === 'translation') assert(typeof resource.translationTeam === 'string' && resource.translationTeam.trim(), `${label}: translated resources need a named translation team`);
          }
          count++;
        }
      }
      if (collection.publicationStatus === 'published') {
        assert(publishedResourceCount > 0, `${dir}: published collection must contain at least one published resource`);
      }
      assert(publishedResourceCount === 0 || collection.publicationStatus === 'published', `${dir}: publish the collection index when publishing a resource`);
    }
  }
  return count;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  validateSupplements().then(count => console.log(`Valid supplement resources: ${count} source resource(s).`))
    .catch(error => { console.error(error.message); process.exitCode = 1; });
}
