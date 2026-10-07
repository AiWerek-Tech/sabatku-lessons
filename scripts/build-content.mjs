import { readFile, readdir, mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceRoot = path.join(root, 'content');
const outputRoot = path.join(root, 'public');
const dayOrder = ['sabbath', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const idPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function json(file) {
  try { return JSON.parse(await readFile(file, 'utf8')); }
  catch (error) { throw new Error(`${path.relative(root, file)}: ${error.message}`); }
}

async function writeJson(file, value) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function assertDate(value, label) {
  assert(typeof value === 'string' && datePattern.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`)), `${label} must be YYYY-MM-DD`);
}

async function main() {
  const languages = await readdir(sourceRoot, { withFileTypes: true });
  const editions = [];
  const published = [];

  for (const language of languages.filter(entry => entry.isDirectory() && entry.name !== '_template')) {
    const programRoot = path.join(sourceRoot, language.name, 'adult-easy-reading');
    let quarterlies = [];
    try { quarterlies = await readdir(programRoot, { withFileTypes: true }); }
    catch { continue; }

    for (const quarterly of quarterlies.filter(entry => entry.isDirectory())) {
      const editionDir = path.join(programRoot, quarterly.name);
      const edition = await json(path.join(editionDir, 'edition.json'));
      assert(edition.id === quarterly.name && idPattern.test(edition.id), `${quarterly.name}: edition id must match its folder and use lowercase kebab-case`);
      assert(edition.programId === 'adult-easy-reading', `${edition.id}: programId must be adult-easy-reading`);
      assert(edition.locale === language.name, `${edition.id}: locale must match language folder`);
      assertDate(edition.startDate, `${edition.id}.startDate`);
      assertDate(edition.endDate, `${edition.id}.endDate`);
      assert(edition.title && !edition.title.startsWith('GANTI '), `${edition.id}: replace the title placeholder`);
      assert(edition.sourceName && edition.attribution && edition.rightsStatement && !/GANTI/.test(`${edition.attribution} ${edition.rightsStatement}`), `${edition.id}: approved source, attribution, and rights statement are required`);
      if (edition.publicationStatus !== 'published') continue;

      const lessonFolders = (await readdir(editionDir, { withFileTypes: true }))
        .filter(entry => entry.isDirectory() && /^lesson-\d{2}$/.test(entry.name))
        .sort((a, b) => a.name.localeCompare(b.name));
      assert(lessonFolders.length > 0, `${edition.id}: no lesson folders found`);
      const lessons = [];

      for (const folder of lessonFolders) {
        const lessonDir = path.join(editionDir, folder.name);
        const lesson = await json(path.join(lessonDir, 'lesson.json'));
        assert(lesson.id === folder.name, `${edition.id}/${folder.name}: lesson id must match folder`);
        assert(lesson.title && !lesson.title.startsWith('GANTI '), `${edition.id}/${folder.name}: replace the title placeholder`);
        assertDate(lesson.startDate, `${lesson.id}.startDate`);
        assertDate(lesson.endDate, `${lesson.id}.endDate`);
        assert(Array.isArray(lesson.readings) && lesson.readings.length === 7, `${edition.id}/${lesson.id}: exactly seven daily readings are required in v1`);
        assert(lesson.readings.map(reading => reading.key).join(',') === dayOrder.join(','), `${edition.id}/${lesson.id}: readings must be ordered Sabat petang through Jumat`);
        const readings = [];

        for (const reading of lesson.readings) {
          assertDate(reading.date, `${lesson.id}/${reading.key}.date`);
          assert(reading.file === `${reading.key}.md`, `${lesson.id}/${reading.key}: filename must match reading key`);
          const markdown = (await readFile(path.join(lessonDir, reading.file), 'utf8')).trim();
          assert(markdown.length > 0 && !markdown.includes('GANTI DENGAN'), `${edition.id}/${lesson.id}/${reading.file}: replace the template text`);
          readings.push({
            id: `adult-easy-reading:${edition.locale}:${edition.id}:${lesson.id}:${reading.key}`,
            key: reading.key,
            title: reading.title,
            date: reading.date,
            format: 'text/markdown',
            content: markdown
          });
        }

        const lessonOutput = {
          schemaVersion: 'sabatku-lessons-v1',
          editionId: edition.id,
          programId: edition.programId,
          locale: edition.locale,
          lesson: { id: lesson.id, title: lesson.title, startDate: lesson.startDate, endDate: lesson.endDate },
          readings
        };
        const lessonUrl = `editions/${edition.id}/lessons/${lesson.id}/index.json`;
        lessons.push({ id: lesson.id, title: lesson.title, startDate: lesson.startDate, endDate: lesson.endDate, url: lessonUrl });
        published.push({ path: lessonUrl, value: lessonOutput });
      }

      const editionUrl = `editions/${edition.id}/index.json`;
      const editionOutput = {
        schemaVersion: 'sabatku-lessons-v1',
        id: edition.id,
        programId: edition.programId,
        locale: edition.locale,
        title: edition.title,
        description: edition.description,
        startDate: edition.startDate,
        endDate: edition.endDate,
        cover: edition.cover,
        sourceName: edition.sourceName,
        attribution: edition.attribution,
        rightsStatement: edition.rightsStatement,
        lessons
      };
      editions.push({
        id: edition.id,
        programId: edition.programId,
        locale: edition.locale,
        title: edition.title,
        description: edition.description,
        startDate: edition.startDate,
        endDate: edition.endDate,
        cover: edition.cover,
        sourceName: edition.sourceName,
        attribution: edition.attribution,
        rightsStatement: edition.rightsStatement,
        url: editionUrl
      });
      published.push({ path: editionUrl, value: editionOutput });
    }
  }

  const catalog = {
    schemaVersion: 'sabatku-lessons-catalog-v1',
    generatedAt: new Date().toISOString(),
    programs: [{ id: 'adult-easy-reading', locale: 'id', title: 'Dewasa Mudah Dibaca', editions }]
  };

  const checkOnly = process.argv.includes('--check');
  if (checkOnly) {
    console.log(`Valid: ${editions.length} published edition(s), ${published.length - editions.length} lesson document(s).`);
    return;
  }

  await rm(outputRoot, { recursive: true, force: true });
  await writeJson(path.join(outputRoot, 'catalog.json'), catalog);
  for (const file of published) await writeJson(path.join(outputRoot, file.path), file.value);
  await writeFile(path.join(outputRoot, '.nojekyll'), '', 'utf8');
  console.log(`Built ${editions.length} edition(s) and ${published.length - editions.length} lesson document(s) into public/.`);
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
