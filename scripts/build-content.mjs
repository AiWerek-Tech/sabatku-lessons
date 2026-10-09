import { buildCornerstone } from './build-cornerstone.mjs';
import { readFile, readdir, mkdir, rm, writeFile, cp } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateSupplements } from './validate-supplements.mjs';
import { buildSupplements } from './build-supplements.mjs';

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

async function pdfResources(lesson, editionDir, label) {
  const resources = lesson.pdfs ?? [];
  assert(Array.isArray(resources), `${label}.pdfs must be an array`);
  const ids = new Set();
  return Promise.all(resources.map(async (pdf, index) => {
    assert(pdf && /^[a-zA-Z0-9_-]{1,100}$/.test(pdf.id ?? '') && pdf.title && typeof pdf.file === 'string', `${label}.pdfs[${index}] needs a valid id, title, and file`);
    assert(!ids.has(pdf.id), `${label}.pdfs contains duplicate id ${pdf.id}`);
    ids.add(pdf.id);
    assert(pdf.file.startsWith('../../assets/') && pdf.file.toLowerCase().endsWith('.pdf') && !pdf.file.split(/[\\/]/).includes('..', 2), `${label}.pdfs[${index}].file must point to a PDF in edition assets`);
    const assetName = pdf.file.slice('../../assets/'.length);
    assert(assetName && !assetName.startsWith('/') && !assetName.split(/[\\/]/).includes('..'), `${label}.pdfs[${index}].file escapes edition assets`);
    try { await readFile(path.join(editionDir, 'assets', assetName)); }
    catch { throw new Error(`${label}.pdfs[${index}]: missing asset ${assetName}`); }
    return { id: pdf.id, title: pdf.title, src: pdf.file };
  }));
}

async function main() {
  await validateSupplements(sourceRoot);
  const supplementPublications = await buildSupplements(sourceRoot);
  const languages = await readdir(sourceRoot, { withFileTypes: true });
  const editions = [];
  const published = [];
  const assetDirectories = [];

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
      const introduction = edition.introductionFile ? (await readFile(path.join(editionDir, edition.introductionFile), 'utf8')).trim() : null;
      const publicationNotes = edition.publicationNotesFile ? (await readFile(path.join(editionDir, edition.publicationNotesFile), 'utf8')).trim() : null;

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
        const lessonStart = Date.parse(`${lesson.startDate}T00:00:00Z`);
        const readings = [];

        for (const reading of lesson.readings) {
          assertDate(reading.date, `${lesson.id}/${reading.key}.date`);
          assert(reading.file === `${reading.key}.md`, `${lesson.id}/${reading.key}: filename must match reading key`);
          const expectedDate = new Date(lessonStart + dayOrder.indexOf(reading.key) * 86400000).toISOString().slice(0, 10);
          assert(reading.date === expectedDate, `${lesson.id}/${reading.key}: date must be ${expectedDate}`);
          const markdown = (await readFile(path.join(lessonDir, reading.file), 'utf8')).trim();
          assert(markdown.length > 0 && !markdown.includes('GANTI DENGAN'), `${edition.id}/${lesson.id}/${reading.file}: replace the template text`);
          for (const assetPath of [...markdown.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)].map(match => match[1])) {
            assert(!path.isAbsolute(assetPath) && !assetPath.split(/[\\/]/).includes('..') || assetPath.startsWith('../../assets/'), `${lesson.id}/${reading.file}: image path must stay inside the edition assets`);
            const assetName = path.basename(assetPath);
            try { await readFile(path.join(editionDir, 'assets', assetName)); }
            catch { throw new Error(`${edition.id}/${lesson.id}/${reading.file}: missing asset ${assetName}`); }
          }
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
          readings,
          pdfs: await pdfResources(lesson, editionDir, `${edition.id}/${lesson.id}`)
        };
        const supplementaryReadings = [];
        for (const item of lesson.supplementaryReadings ?? []) {
          assert(item.key && item.title && item.file, `${edition.id}/${lesson.id}: supplementary reading needs key, title, and file`);
          const content = (await readFile(path.join(lessonDir, item.file), 'utf8')).trim();
          assert(content.length > 0 && !content.includes('GANTI DENGAN'), `${edition.id}/${lesson.id}/${item.file}: replace the template text`);
          supplementaryReadings.push({
            id: `adult-easy-reading:${edition.locale}:${edition.id}:${lesson.id}:${item.key}`,
            key: item.key,
            title: item.title,
            format: 'text/markdown',
            content
          });
        }
        lessonOutput.supplementaryReadings = supplementaryReadings;
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
        introduction: introduction ? { format: 'text/markdown', content: introduction } : null,
        publicationNotes: publicationNotes ? { format: 'text/markdown', content: publicationNotes } : null,
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
        introduction: introduction ? { format: 'text/markdown', content: introduction } : null,
        publicationNotes: publicationNotes ? { format: 'text/markdown', content: publicationNotes } : null,
        url: editionUrl
      });
      published.push({ path: editionUrl, value: editionOutput });
      assetDirectories.push({ source: path.join(editionDir, 'assets'), destination: path.join(outputRoot, 'editions', edition.id, 'assets') });
    }
  }

  const egwEditions = [];
  const egwRoot = path.join(sourceRoot, 'id', 'adult-egw-notes');
  let egwFolders = [];
  try { egwFolders = await readdir(egwRoot, { withFileTypes: true }); }
  catch { /* EGW Notes are an optional companion program. */ }
  for (const folder of egwFolders.filter(entry => entry.isDirectory())) {
    const editionDir = path.join(egwRoot, folder.name);
    const edition = await json(path.join(editionDir, 'edition.json'));
    assert(edition.id === folder.name && idPattern.test(edition.id), `${folder.name}: EGW edition id must match its folder`);
    assert(edition.programId === 'adult-egw-notes' && edition.locale === 'id', `${edition.id}: EGW Notes must use the Indonesian companion program`);
    assertDate(edition.startDate, `${edition.id}.startDate`);
    assertDate(edition.endDate, `${edition.id}.endDate`);
    assert(edition.title && edition.sourceName && edition.attribution && edition.rightsStatement, `${edition.id}: source and attribution metadata are required`);
    if (edition.publicationStatus !== 'published') continue;

    const lessonFolders = (await readdir(editionDir, { withFileTypes: true }))
      .filter(entry => entry.isDirectory() && /^lesson-\d{2}$/.test(entry.name))
      .sort((a, b) => a.name.localeCompare(b.name));
    assert(lessonFolders.length === 13, `${edition.id}: exactly 13 weekly EGW notes are required`);
    const lessons = [];
    for (const lessonFolder of lessonFolders) {
      const lessonDir = path.join(editionDir, lessonFolder.name);
      const lesson = await json(path.join(lessonDir, 'lesson.json'));
      assert(lesson.id === lessonFolder.name && lesson.title && lesson.notesFile, `${edition.id}/${lessonFolder.name}: valid lesson metadata is required`);
      assertDate(lesson.startDate, `${lesson.id}.startDate`);
      assertDate(lesson.endDate, `${lesson.id}.endDate`);
      const markdown = (await readFile(path.join(lessonDir, lesson.notesFile), 'utf8')).trim();
      assert(markdown.length > 0 && !markdown.includes('DRAF KERANGKA') && !markdown.includes('GANTI DENGAN'), `${lesson.id}: official notes content is required before publication`);
      const companionReadings = edition.lessons.find(item => item.id === lesson.id)?.companionReadings;
      assert(Array.isArray(companionReadings) && companionReadings.length === 7, `${lesson.id}: seven companion mappings are required`);
      assert(companionReadings.map(item => item.dayKey).join(',') === dayOrder.join(','), `${lesson.id}: companion days must follow Sabbath evening through Friday`);
      for (const assetPath of [...markdown.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)].map(match => match[1])) {
        const assetName = assetPath.replaceAll('\\', '/').slice('../../assets/'.length);
        assert(assetPath.startsWith('../../assets/') && assetName && !assetName.split('/').includes('..'), `${lesson.id}: EGW illustrations must use the edition assets folder`);
        try { await readFile(path.join(editionDir, 'assets', path.basename(assetPath))); }
        catch { throw new Error(`${edition.id}/${lesson.id}: missing illustration ${path.basename(assetPath)}`); }
      }
      const lessonUrl = `editions/${edition.id}/lessons/${lesson.id}/index.json`;
      const dailySections = markdown.split(/(?=^##\s+)/m).map(section => section.trim()).filter(section => section.startsWith('## '));
      assert(dailySections.length === 7, `${lesson.id}: EGW Notes must contain seven day sections`);
      const dayNames = ['Sabat Petang', 'Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'];
      const readings = dailySections.map((content, index) => {
        const sectionTitle = content.match(/^##\s+(.+)$/m)?.[1]?.trim() ?? '';
        assert(sectionTitle.startsWith(dayNames[index]), `${lesson.id}: expected the ${dayNames[index]} section at position ${index + 1}`);
        const title = content.match(/^###\s+(.+)$/m)?.[1]?.trim() || lesson.title;
        const date = new Date(Date.parse(`${lesson.startDate}T00:00:00Z`) + index * 86400000).toISOString().slice(0, 10);
        return {
          id: `adult-egw-notes:${edition.locale}:${edition.id}:${lesson.id}:${dayOrder[index]}`,
          key: dayOrder[index], title, date, format: 'text/markdown', content
        };
      });
      const lessonOutput = {
        schemaVersion: 'sabatku-lessons-v1', editionId: edition.id, programId: edition.programId, locale: edition.locale,
        lesson: { id: lesson.id, title: lesson.title, startDate: lesson.startDate, endDate: lesson.endDate },
        readings,
        companionReadings,
        pdfs: await pdfResources(lesson, editionDir, `${edition.id}/${lesson.id}`)
      };
      lessons.push({ id: lesson.id, title: lesson.title, startDate: lesson.startDate, endDate: lesson.endDate, url: lessonUrl });
      published.push({ path: lessonUrl, value: lessonOutput });
    }
    const editionUrl = `editions/${edition.id}/index.json`;
    const editionOutput = {
      schemaVersion: 'sabatku-lessons-v1', id: edition.id, programId: edition.programId, locale: edition.locale,
      title: edition.title, description: edition.description, startDate: edition.startDate, endDate: edition.endDate,
      cover: edition.cover, sourceName: edition.sourceName, attribution: edition.attribution,
      rightsStatement: edition.rightsStatement, lessons
    };
    egwEditions.push({
      id: edition.id, programId: edition.programId, locale: edition.locale, title: edition.title,
      description: edition.description, startDate: edition.startDate, endDate: edition.endDate,
      cover: edition.cover, sourceName: edition.sourceName, attribution: edition.attribution,
      rightsStatement: edition.rightsStatement, url: editionUrl
    });
    published.push({ path: editionUrl, value: editionOutput });
    assetDirectories.push({ source: path.join(editionDir, 'assets'), destination: path.join(outputRoot, 'editions', edition.id, 'assets') });
  }

  // InVerse follows its own Sunday-to-Sabbath weekly cycle and content labels.
  // Draft editions remain in the editorial tree but never enter the public catalog.
  const inverseEditions = [];
  const inverseRoot = path.join(sourceRoot, 'id', 'inverse');
  let inverseFolders = [];
  try { inverseFolders = await readdir(inverseRoot, { withFileTypes: true }); }
  catch { /* InVerse is an optional Indonesian program. */ }
  const inverseDayOrder = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'sabbath'];
  const inverseReadingLabels = ['inTro', 'inGest', 'inTerpret', 'inSpect', 'inVite', 'inSight', 'inQuire'];
  const inverseReadingLabelLine = new RegExp(`^\\s{0,3}(?:#{1,6}\\s*)?(?:${inverseReadingLabels.join('|')})\\s*$`, 'gim');
  for (const folder of inverseFolders.filter(entry => entry.isDirectory())) {
    const editionDir = path.join(inverseRoot, folder.name);
    const edition = await json(path.join(editionDir, 'edition.json'));
    assert(edition.id === folder.name && idPattern.test(edition.id), `${folder.name}: InVerse edition id must match its folder`);
    assert(edition.programId === 'inverse' && edition.locale === 'id', `${edition.id}: InVerse must use the Indonesian inverse program`);
    assertDate(edition.startDate, `${edition.id}.startDate`);
    assertDate(edition.endDate, `${edition.id}.endDate`);
    assert(edition.title && edition.sourceName && edition.attribution && edition.rightsStatement, `${edition.id}: source and attribution metadata are required`);
    const lessonFolders = (await readdir(editionDir, { withFileTypes: true }))
      .filter(entry => entry.isDirectory() && /^lesson-\d{2}$/.test(entry.name))
      .sort((a, b) => a.name.localeCompare(b.name));
    assert(lessonFolders.length === 13, `${edition.id}: exactly 13 weekly InVerse lessons are required`);
    for (const lessonFolder of lessonFolders) {
      const lessonDir = path.join(editionDir, lessonFolder.name);
      const lesson = await json(path.join(lessonDir, 'lesson.json'));
      assert(lesson.id === lessonFolder.name && lesson.title && lesson.sourceTitle, `${edition.id}/${lessonFolder.name}: valid Indonesian and source lesson titles are required`);
      assert(Array.isArray(lesson.pdfs) && lesson.pdfs.length === 1, `${edition.id}/${lessonFolder.name}: exactly one per-lesson PDF is required`);
      assertDate(lesson.startDate, `${lesson.id}.startDate`);
      assertDate(lesson.endDate, `${lesson.id}.endDate`);
      assert(Array.isArray(lesson.readings) && lesson.readings.length === 7, `${lesson.id}: exactly seven InVerse readings are required`);
      assert(lesson.readings.map(reading => reading.key).join(',') === inverseDayOrder.join(','), `${lesson.id}: InVerse readings must follow Sunday through Sabbath`);
      const lessonStart = Date.parse(`${lesson.startDate}T00:00:00Z`);
      for (const [index, reading] of lesson.readings.entries()) {
        assertDate(reading.date, `${lesson.id}/${reading.key}.date`);
        assert(reading.file === `${reading.key}.md`, `${lesson.id}/${reading.key}: filename must match reading key`);
        const expectedDate = new Date(lessonStart + index * 86400000).toISOString().slice(0, 10);
        assert(reading.date === expectedDate, `${lesson.id}/${reading.key}: date must be ${expectedDate}`);
        const markdown = (await readFile(path.join(lessonDir, reading.file), 'utf8')).trim();
        assert(markdown.length > 0, `${edition.id}/${lesson.id}/${reading.file}: reading file is required even for a draft`);
        assert(/^##\s+\S/m.test(markdown), `${edition.id}/${lesson.id}/${reading.file}: a daily reading title is required`);
        for (const assetPath of [...markdown.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)].map(match => match[1])) {
          assert(assetPath.startsWith('../assets/') && !assetPath.split(/[\\/]/).includes('..', 2), `${lesson.id}/${reading.file}: InVerse image must use the edition assets folder`);
          const assetName = assetPath.slice('../assets/'.length);
          assert(assetName && !assetName.split(/[\\/]/).includes('..'), `${lesson.id}/${reading.file}: image path escapes edition assets`);
          try { await readFile(path.join(editionDir, 'assets', assetName)); }
          catch { assert(false, `${lesson.id}/${reading.file}: missing image ${assetPath}`); }
        }
        const misplacedLabel = inverseReadingLabelLine.exec(markdown);
        inverseReadingLabelLine.lastIndex = 0;
        assert(!misplacedLabel, `${edition.id}/${lesson.id}/${reading.file}: contains another day's InVerse section label ${misplacedLabel?.[0]?.trim()}`);
      }
    }
    if (edition.publicationStatus !== 'published') continue;

    const lessons = [];
    for (const lessonFolder of lessonFolders) {
      const lessonDir = path.join(editionDir, lessonFolder.name);
      const lesson = await json(path.join(lessonDir, 'lesson.json'));
      assert(lesson.id === lessonFolder.name && lesson.title && lesson.sourceTitle, `${edition.id}/${lessonFolder.name}: valid Indonesian and source lesson titles are required`);
      assertDate(lesson.startDate, `${lesson.id}.startDate`);
      assertDate(lesson.endDate, `${lesson.id}.endDate`);
      assert(Array.isArray(lesson.readings) && lesson.readings.length === 7, `${lesson.id}: exactly seven InVerse readings are required`);
      assert(lesson.readings.map(reading => reading.key).join(',') === inverseDayOrder.join(','), `${lesson.id}: InVerse readings must follow Sunday through Sabbath`);
      const lessonStart = Date.parse(`${lesson.startDate}T00:00:00Z`);
      const readings = [];
      for (const [index, reading] of lesson.readings.entries()) {
        assertDate(reading.date, `${lesson.id}/${reading.key}.date`);
        assert(reading.file === `${reading.key}.md`, `${lesson.id}/${reading.key}: filename must match reading key`);
        const expectedDate = new Date(lessonStart + index * 86400000).toISOString().slice(0, 10);
        assert(reading.date === expectedDate, `${lesson.id}/${reading.key}: date must be ${expectedDate}`);
        const markdown = (await readFile(path.join(lessonDir, reading.file), 'utf8')).trim();
        assert(markdown.length > 0 && !markdown.includes('DRAF KERANGKA') && !markdown.includes('MATERI RESMI MENUNGGU'), `${edition.id}/${lesson.id}/${reading.file}: official Indonesian content is required before publication`);
        const publicMarkdown = markdown.replace(/(!\[[^\]]*\]\()\.\.\/assets\//g, '$1../../assets/');
        readings.push({
          id: `inverse:${edition.locale}:${edition.id}:${lesson.id}:${reading.key}`,
          key: reading.key,
          title: reading.title,
          date: reading.date,
          format: 'text/markdown',
          content: publicMarkdown
        });
      }
      const lessonUrl = `editions/${edition.id}/lessons/${lesson.id}/index.json`;
      const lessonOutput = {
        schemaVersion: 'sabatku-lessons-v1', editionId: edition.id, programId: edition.programId, locale: edition.locale,
        lesson: { id: lesson.id, title: lesson.title, startDate: lesson.startDate, endDate: lesson.endDate, illustration: lesson.illustration?.replace('../assets/', '../../assets/') },
        readings,
        pdfs: await pdfResources(lesson, editionDir, `${edition.id}/${lesson.id}`)
      };
      lessons.push({ id: lesson.id, title: lesson.title, startDate: lesson.startDate, endDate: lesson.endDate, url: lessonUrl });
      published.push({ path: lessonUrl, value: lessonOutput });
    }
    const editionUrl = `editions/${edition.id}/index.json`;
    const editionOutput = {
      schemaVersion: 'sabatku-lessons-v1', id: edition.id, programId: edition.programId, locale: edition.locale,
      title: edition.title, description: edition.description, startDate: edition.startDate, endDate: edition.endDate,
      cover: edition.cover, sourceName: edition.sourceName, attribution: edition.attribution,
      rightsStatement: edition.rightsStatement, lessons
    };
    inverseEditions.push({
      id: edition.id, programId: edition.programId, locale: edition.locale, title: edition.title,
      description: edition.description, startDate: edition.startDate, endDate: edition.endDate,
      cover: edition.cover, sourceName: edition.sourceName, attribution: edition.attribution,
      rightsStatement: edition.rightsStatement, url: editionUrl
    });
    published.push({ path: editionUrl, value: editionOutput });
    assetDirectories.push({ source: path.join(editionDir, 'assets'), destination: path.join(outputRoot, 'editions', edition.id, 'assets') });
  }

  const cornerstone = await buildCornerstone(sourceRoot,outputRoot);
  const cornerstoneEditions = cornerstone.editions;
  published.push(...cornerstone.published);
  assetDirectories.push(...cornerstone.assetDirectories);
  const programMetadata = {
    cornerstone: {audienceCategory: 'children-youth', ageRange: {min:15,max:18,unit:'years'},programRole:'curriculum',audienceLabel:{id:'Remaja',en:'Youth'}},
    'adult-easy-reading': {
      audienceCategory: 'adult', ageRange: null, programRole: 'edition',
      audienceLabel: { id: 'Dewasa', en: 'Adult' }
    },
    'adult-egw-notes': {
      audienceCategory: 'adult', ageRange: null, programRole: 'supplement',
      audienceLabel: { id: 'Dewasa', en: 'Adult' }
    },
    inverse: {
      audienceCategory: 'youth-adult', ageRange: { min: 18, max: 35, unit: 'years', plus: true }, programRole: 'curriculum',
      audienceLabel: { id: 'Pemuda Dewasa', en: 'Youth Adult' }
    }
  };
  const withAudience = program => ({ ...program, ...programMetadata[program.id] });
  // Keep downloaded edition and lesson documents self-describing, not only the catalog index.
  for (const edition of [...editions, ...egwEditions, ...inverseEditions, ...cornerstoneEditions]) {
    Object.assign(edition, programMetadata[edition.programId]);
  }
  for (const document of published) {
    Object.assign(document.value, programMetadata[document.value.programId]);
  }
  const catalog = {
    schemaVersion: 'sabatku-lessons-catalog-v1',
    generatedAt: new Date().toISOString(),
    supplements: { url: 'supplements/catalog.json', collectionCount: supplementPublications.catalog.collections.length },
    programs: [
      withAudience({ id: 'adult-easy-reading', locale: 'id', title: 'SS Dewasa Mudah Dibaca', editions }),
      ...(egwEditions.length ? [withAudience({ id: 'adult-egw-notes', locale: 'id', title: 'Suplemen EGW Notes', editions: egwEditions })] : []),
      ...(inverseEditions.length ? [withAudience({ id: 'inverse', locale: 'id', title: 'InVerse · Pemuda Dewasa', editions: inverseEditions })] : []),
      ...(cornerstoneEditions.length ? [withAudience({id:'cornerstone',locale:'id',title:'Cornerstone Connections · Remaja',editions:cornerstoneEditions})] : [])
    ]
  };

  const checkOnly = process.argv.includes('--check');
  if (checkOnly) {
    console.log(`Valid: ${editions.length + egwEditions.length + inverseEditions.length + cornerstoneEditions.length} published edition(s), ${published.length - editions.length - egwEditions.length - inverseEditions.length - cornerstoneEditions.length} lesson document(s), ${supplementPublications.resourceCount} published supplement resource(s).`);
    return;
  }

  await rm(outputRoot, { recursive: true, force: true });
  await writeJson(path.join(outputRoot, 'catalog.json'), catalog);
  await writeJson(path.join(outputRoot, 'supplements', 'catalog.json'), supplementPublications.catalog);
  for (const file of published) await writeJson(path.join(outputRoot, file.path), file.value);
  for (const document of supplementPublications.documents) await writeJson(path.join(outputRoot, document.path), document.value);
  for (const asset of supplementPublications.assets) {
    await mkdir(path.dirname(path.join(outputRoot, asset.path)), { recursive: true });
    await writeFile(path.join(outputRoot, asset.path), asset.bytes);
  }
  for (const assets of assetDirectories) {
    try { await cp(assets.source, assets.destination, { recursive: true }); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  await writeFile(path.join(outputRoot, '.nojekyll'), '', 'utf8');
  console.log(`Built ${editions.length + egwEditions.length + inverseEditions.length + cornerstoneEditions.length} edition(s), ${published.length - editions.length - egwEditions.length - inverseEditions.length - cornerstoneEditions.length} lesson document(s), and ${supplementPublications.resourceCount} supplement resource(s) into public/.`);
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
