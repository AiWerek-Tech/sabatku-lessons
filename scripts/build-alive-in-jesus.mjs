import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';

const idPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const dayKeyPattern = /^[a-z][a-z0-9-]{0,59}$/;
const trackProgramSuffix = { babies: 'bb-pb', beginner: 'bg-pb', kindergarten: 'kd-pb', primary: 'pr-pb', junior: 'jr', teen: 'teen', youth: 'youth' };
const hash = value => createHash('sha256').update(value, 'utf8').digest('hex');

// Adventech's layout annotations are presentation metadata, not reading text.
export function normalizeAliveInJesusMarkdown(markdown) {
  let styledHeadingNext = false;
  let calloutNext = false;
  const output = [];
  for (const sourceLine of markdown.replace(/\r\n/g, '\n').split('\n')) {
    let line = sourceLine.trimEnd();
    const styleLine = /^\s*(?:[-*+]\s+)?(\{"style"\s*:.*\})\s*$/.exec(line);
    if (styleLine) {
      let style = {};
      try { style = JSON.parse(styleLine[1]).style ?? {}; } catch { /* Ignore malformed presentation metadata. */ }
      const textStyle = style.text ?? {};
      styledHeadingNext = !style.block?.backgroundColor && textStyle.typeface === 'Trashbone-Regular' && textStyle.size === 'xl';
      calloutNext = Boolean(style.block?.backgroundColor);
      continue;
    }
    if (/^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/.test(line)) continue;
    if (line.trim() === '```') continue;
    if (line.startsWith('```=')) {
      output.push(`### ${line.slice(4).trim()}`);
      continue;
    }

    // The audio extension includes an Adventech URL and a credits JSON object.
    // Publish it as a clean, tappable song title and keep credits out of reading text.
    const audio = /^\s*!a\[([^\]]+)\]\s+(.+?)\s*$/.exec(line);
    if (audio) {
      const metadataStart = audio[2].search(/\s+\{\s*"(?:credits|title|copyright)"\s*:/);
      const rawTitle = (metadataStart >= 0 ? audio[2].slice(0, metadataStart) : audio[2]).trim();
      const title = rawTitle.replace(/^["“”']|["“”']$/g, '').trim();
      if (title && /^https:\/\//i.test(audio[1])) line = `[♫ ${title}](${audio[1]})`;
      else line = title;
    }

    // Turn Adventech's styled inline labels into real Markdown emphasis.
    line = line.replace(/\*\*\^\[([^\]]+)\]\((\{"style"[^\n]*?\})\)\*\*/g, '**$1**');
    line = line.replace(/\^\[([^\]]+)\]\((\{"style"[^\n]*?\})\)/g, '**$1**');
    const explicitLineBreak = /\\\s*$/.test(line);
    line = line.replace(/\\\s*$/, '').replace(/(\d+)\\\./g, '$1.');
    if (!line.trim()) {
      output.push(line);
      continue;
    }

    let semanticHeading = false;
    if (styledHeadingNext && line.trim() && !line.trimStart().startsWith('^[')) {
      line = `### ${line.trim().replace(/^\*\*(.+)\*\*$/, '$1')}`;
      semanticHeading = true;
    } else if (/^\s*\*\*[^*\n]{2,100}\*\*\s+\([^)\n]{2,100}\)\s*$/.test(line)) {
      // Teacher program sections include the duration in parentheses; keep it with its heading.
      line = `### ${line.trim().replace(/^\*\*(.+?)\*\*/, '$1')}`;
      semanticHeading = true;
    } else if (/^\s*\*\*[^*\n]{2,100}\*\*\s*$/.test(line) && !/^\s*\*\*[“"‘']/.test(line) && !/[.!?]\*\*\s*$/.test(line)) {
      // Standalone bold labels are semantic section titles in the source book.
      line = `### ${line.trim().replace(/^\*\*(.+)\*\*$/, '$1')}`;
      semanticHeading = true;
    } else if (calloutNext && line.trim()) {
      line = `> ${line.trim()}`;
    }
    if (explicitLineBreak && !semanticHeading) line += '\\';
    styledHeadingNext = false;
    calloutNext = false;
    output.push(line);
    // Keep a styled section title in its own Markdown block. Some Adventech
    // exports mark the title and following paragraph with a hard line break
    // instead of a blank line; without this boundary the reader styles the
    // paragraph as part of the heading.
    if (semanticHeading) output.push('');
  }
  return output.join('\n')
    .replace(/\n{3,}/g, '\n\n').trim();
}

async function readJson(file) {
  try { return JSON.parse(await readFile(file, 'utf8')); }
  catch (error) { throw new Error(`${file}: ${error.message}`); }
}

async function markdownFileHashes(root) {
  const hashes = {};
  async function visit(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) await visit(absolute);
      else if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
        const relative = path.relative(root, absolute).split(path.sep).join('/');
        const content = (await readFile(absolute, 'utf8')).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        hashes[relative] = hash(content);
      }
    }
  }
  await visit(root);
  return Object.fromEntries(Object.entries(hashes).sort(([a], [b]) => a.localeCompare(b)));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertDate(value, label) {
  assert(typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`)), `${label} must be YYYY-MM-DD`);
}

function isInside(date, start, end) {
  return date >= start && date <= end;
}

/** Build track-specific Alive in Jesus publications without imposing one cadence or day order. */
export async function buildAliveInJesus(sourceRoot, outputRoot) {
  const root = path.join(sourceRoot, 'id', 'alive-in-jesus');
  const editions = [];
  const published = [];
  const assetDirectories = [];
  let trackFolders = [];
  try { trackFolders = await readdir(root, { withFileTypes: true }); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }

  for (const trackFolder of trackFolders.filter(entry => entry.isDirectory())) {
    const trackId = trackFolder.name;
    assert(idPattern.test(trackId), `Alive in Jesus track folder ${trackId} must use lowercase kebab-case`);
    const trackRoot = path.join(root, trackId);
    const cycleFolders = await readdir(trackRoot, { withFileTypes: true });

    for (const cycleFolder of cycleFolders.filter(entry => entry.isDirectory())) {
      const cycleRoot = path.join(trackRoot, cycleFolder.name);
      const cycleEntries = await readdir(cycleRoot, { withFileTypes: true });
      const publicationDirs = cycleEntries.some(entry => entry.isFile() && entry.name === 'edition.json') ? [cycleRoot] : [];
      if (publicationDirs.length === 0) {
        for (const roleFolder of cycleEntries.filter(entry => entry.isDirectory())) {
          const roleDir = path.join(cycleRoot, roleFolder.name);
          const roleEntries = await readdir(roleDir, { withFileTypes: true });
          if (roleEntries.some(entry => entry.isFile() && entry.name === 'edition.json')) publicationDirs.push(roleDir);
        }
      }

      for (const editionDir of publicationDirs) {
      const edition = await readJson(path.join(editionDir, 'edition.json'));
      if (edition.publicationStatus === 'withdrawn') continue;
      assert(typeof edition.id === 'string' && idPattern.test(edition.id), `${trackId}/${cycleFolder.name}: edition id must use lowercase kebab-case`);
      assert(edition.programId === `alive-in-jesus-${trackProgramSuffix[trackId] ?? trackId}`, `${edition.id}: programId must map to its AIJ track`);
      assert(edition.trackId === trackId && edition.locale === 'id', `${edition.id}: trackId and Indonesian locale are required`);
      assert(['student-guide', 'parent-book', 'teacher-guide', 'parent-time-handout', 'family-resources'].includes(edition.bookRole), `${edition.id}: unsupported bookRole`);
      assert(edition.title && edition.cycleId && edition.sourceName && edition.attribution && edition.rightsStatement, `${edition.id}: title, cycle, source and rights metadata are required`);
      assertDate(edition.startDate, `${edition.id}.startDate`);
      assertDate(edition.endDate, `${edition.id}.endDate`);
      assert(edition.startDate <= edition.endDate, `${edition.id}: edition dates are reversed`);

      const unitFolders = (await readdir(editionDir, { withFileTypes: true }))
        .filter(entry => entry.isDirectory() && /^(?:lesson|unit)-[a-z0-9-]{1,40}$/.test(entry.name))
        .sort((a, b) => a.name.localeCompare(b.name));
      assert(unitFolders.length > 0, `${edition.id}: at least one unit is required`);
      const lessonList = [];
      const lessonDocuments = [];
      const declaredDayOrder = edition.dayOrder ?? null;
      if (declaredDayOrder) {
        assert(Array.isArray(declaredDayOrder) && declaredDayOrder.length > 0 && declaredDayOrder.every(key => dayKeyPattern.test(key)), `${edition.id}.dayOrder is invalid`);
      }

      for (const folder of unitFolders) {
        const lessonDir = path.join(editionDir, folder.name);
        const lesson = await readJson(path.join(lessonDir, 'lesson.json'));
        assert(lesson.id === folder.name && lesson.title, `${edition.id}/${folder.name}: id and title are required`);
        assertDate(lesson.startDate, `${lesson.id}.startDate`);
        assertDate(lesson.endDate, `${lesson.id}.endDate`);
        assert(lesson.startDate <= lesson.endDate && isInside(lesson.startDate, edition.startDate, edition.endDate) && isInside(lesson.endDate, edition.startDate, edition.endDate), `${lesson.id}: unit dates must be within the edition`);
        assert(Array.isArray(lesson.readings) && lesson.readings.length > 0, `${edition.id}/${lesson.id}: at least one reading document is required`);
        if (declaredDayOrder && !folder.name.startsWith('unit-resource-')) assert(lesson.readings.map(item => item.key).join(',') === declaredDayOrder.join(','), `${edition.id}/${lesson.id}: readings must follow this edition's declared day order`);

        const readings = [];
        const seenKeys = new Set();
        for (const reading of lesson.readings) {
          assert(dayKeyPattern.test(reading.key ?? '') && !seenKeys.has(reading.key), `${edition.id}/${lesson.id}: reading keys must be unique and stable`);
          seenKeys.add(reading.key);
          assertDate(reading.date, `${lesson.id}/${reading.key}.date`);
          assert(isInside(reading.date, lesson.startDate, lesson.endDate), `${lesson.id}/${reading.key}: date must be within the unit`);
          assert(reading.file === `${reading.key}.md`, `${lesson.id}/${reading.key}: filename must match its key`);
          const sourceMarkdown = (await readFile(path.join(lessonDir, reading.file), 'utf8')).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
          const content = normalizeAliveInJesusMarkdown(sourceMarkdown);
          assert(content.length > 0 && !content.includes('GANTI DENGAN'), `${edition.id}/${lesson.id}/${reading.file}: published reading cannot be empty or a template`);
          readings.push({
            id: `${edition.programId}:id:${edition.id}:${lesson.id}:${reading.key}`,
            key: reading.key,
            title: reading.title || lesson.title,
            date: reading.date,
            format: 'text/markdown',
            content,
          });
        }

        const supplementaryReadings = [];
        for (const resource of edition.supplementaryReadings ?? []) {
          assert(dayKeyPattern.test(resource.key ?? '') && !seenKeys.has(resource.key), `${edition.id}: invalid supplementary key`);
          seenKeys.add(resource.key);
          assert(typeof resource.file === 'string' && !path.isAbsolute(resource.file) && !resource.file.split(/[\\/]/).includes('..'), `${edition.id}: invalid supplementary file`);
          const resourceMarkdown = (await readFile(path.join(editionDir, resource.file), 'utf8')).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
          const content = normalizeAliveInJesusMarkdown(resourceMarkdown);
          assert(resource.title && content.length, `${edition.id}: supplementary reading is empty`);
          supplementaryReadings.push({ key: resource.key, title: resource.title, format: 'text/markdown', content, scope: 'edition' });
        }
        const lessonUrl = `editions/${edition.id}/lessons/${lesson.id}/index.json`;
        lessonList.push({ id: lesson.id, title: lesson.title, startDate: lesson.startDate, endDate: lesson.endDate, url: lessonUrl });
        lessonDocuments.push({
          path: lessonUrl,
          value: {
            schemaVersion: 'sabatku-lessons-v1',
            editionId: edition.id,
            programId: edition.programId,
            locale: edition.locale,
            trackId,
            cycleId: edition.cycleId,
            bookRole: edition.bookRole,
            lesson: { id: lesson.id, title: lesson.title, startDate: lesson.startDate, endDate: lesson.endDate },
            readings,
            supplementaryReadings,
            pdfs: [],
          },
        });
      }

      if (edition.sourceReviewRequired === true) {
        const review = await readJson(path.join(editionDir, 'source-review.json'));
        assert(review.schemaVersion === 'alive-in-jesus-translation-review-v1', `${edition.id}: source-review.json is missing or invalid`);
        assert(review.editionId === edition.id && review.status === 'approved', `${edition.id}: Indonesian translation is not approved for publication`);
        assert(typeof review.reviewer === 'string' && review.reviewer.trim() && /^\d{4}-\d{2}-\d{2}$/.test(review.reviewedAt ?? ''), `${edition.id}: team reviewer and review date are required`);
        assert(review.sourceAudit && review.sourceAudit.matchedFiles > 0 && review.sourceAudit.missingEnglish?.length === 0 && review.sourceAudit.missingIndonesian?.length === 0 && Object.keys(review.sourceAudit.sourceChecksums ?? {}).length === review.sourceAudit.matchedFiles, `${edition.id}: source/translation audit must pair every Markdown file before approval`);
        const expected = await markdownFileHashes(editionDir);
        const recorded = Object.fromEntries(Object.entries(review.translationFiles ?? {}).sort(([a], [b]) => a.localeCompare(b)));
        assert(JSON.stringify(recorded) === JSON.stringify(expected), `${edition.id}: Markdown changed after team review; run the source audit and obtain renewed approval`);
      }

      const editionUrl = `editions/${edition.id}/index.json`;
      const publicEdition = {
        schemaVersion: 'sabatku-lessons-v1',
        id: edition.id,
        programId: edition.programId,
        locale: edition.locale,
        trackId,
        cycleId: edition.cycleId,
        bookRole: edition.bookRole,
        structureType: edition.structureType,
        dayOrder: declaredDayOrder,
        title: edition.title,
        description: edition.description,
        theme: edition.theme,
        startDate: edition.startDate,
        endDate: edition.endDate,
        cover: edition.cover ?? null,
        sourceName: edition.sourceName,
        sourceUrl: edition.sourceUrl ?? null,
        attribution: edition.attribution,
        rightsStatement: edition.rightsStatement,
        ...(Number.isFinite(edition.estimatedImageBytes) ? { estimatedImageBytes: edition.estimatedImageBytes } : {}),
        lessons: lessonList,
      };
      editions.push(publicEdition);
      published.push({ path: editionUrl, value: publicEdition }, ...lessonDocuments);
      assetDirectories.push({ source: path.join(editionDir, 'assets'), destination: path.join(outputRoot, 'editions', edition.id, 'assets') });
      }
    }
  }

  const programs = new Map();
  for (const edition of editions) {
    const entry = programs.get(edition.programId) ?? { id: edition.programId, locale: 'id', title: `Alive in Jesus · ${trackAppLabel(edition.trackId)}`, editions: [] };
    entry.editions.push(edition);
    programs.set(edition.programId, entry);
  }
  for (const edition of editions) {
    const files = published.filter(document => document.path.startsWith(`editions/${edition.id}/`));
    for (const document of files) document.value.assetRevisions = await assetRevisions(document, edition, published, assetDirectories, outputRoot);
    const byPath = new Map(files.map(document => [document.path, document]));
    for (const document of files) {
      if (!document.path.endsWith('/index.json') || !Array.isArray(document.value.lessons)) continue;
      for (const lesson of document.value.lessons) {
        const detail = byPath.get(lesson.url);
        assert(detail, `${document.path}: missing detail ${lesson.id}`);
        lesson.revision = hash(JSON.stringify(detail.value.readings.map(({ key, title, date, content }) => [key, title, date, content])));
        lesson.readings = detail.value.readings.map(({ key, title, date }) => ({ key, title, date }));
        lesson.pdfs = [];
      }
    }
  }

  return { editions: [...programs.values()], published, assetDirectories };
}

function trackAppLabel(trackId) {
  return ({ babies: 'Baby Steps', beginner: 'Beginners', kindergarten: 'Kindergarten', primary: 'Primary', junior: 'Junior', teen: 'Teen', youth: 'Youth' })[trackId] ?? trackId;
}

async function assetRevisions(document, edition, allPublished, assetDirectories, outputRoot) {
  const value = document.value;
  const references = new Set();
  if (typeof value.cover === 'string') references.add(value.cover);
  for (const reading of [...(value.readings ?? []), ...(value.supplementaryReadings ?? [])]) {
    for (const match of reading.content.matchAll(/!\[[^\]]*\]\(([^)\s]+)(?:\s+[^)]*)?\)/g)) references.add(match[1]);
  }
  const assetDirectory = assetDirectories.find(asset => path.resolve(asset.destination) === path.resolve(outputRoot, 'editions', edition.id, 'assets'));
  const revisions = {};
  for (const reference of references) {
    const url = reference.startsWith('editions/')
      ? new URL(reference, 'https://aiwerek-tech.github.io/sabatku-lessons/')
      : new URL(reference, new URL(document.path, 'https://aiwerek-tech.github.io/sabatku-lessons/'));
    if (url.origin !== 'https://aiwerek-tech.github.io') continue;
    const prefix = `/sabatku-lessons/editions/${edition.id}/assets/`;
    if (!url.pathname.startsWith(prefix)) continue;
    const name = decodeURIComponent(url.pathname.slice(prefix.length));
    assert(assetDirectory && name && !name.includes('..'), `${document.path}: invalid local asset ${reference}`);
    const bytes = await readFile(path.join(assetDirectory.source, ...name.split('/')));
    revisions[`editions/${edition.id}/assets/${name}`] = createHash('sha256').update(bytes).digest('hex');
  }
  return Object.fromEntries(Object.entries(revisions).sort(([a], [b]) => a.localeCompare(b)));
}
