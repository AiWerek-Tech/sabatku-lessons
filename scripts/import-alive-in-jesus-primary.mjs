import { cp, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeAliveInJesusMarkdown } from './build-alive-in-jesus.mjs';
import { labelPrimarySongs } from './primary-song-labels.mjs';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceRoot = process.argv[2] || 'C:/Users/ADMIN/Music/Alive In Jesus/4. PRIMARY';
const targetRoot = path.join(repositoryRoot, 'content/id/alive-in-jesus/primary/2026-q4-year-a');
const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'sabbath'];
const weekDates = [];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function frontmatter(text) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(text);
  const values = {};
  if (match) {
    for (const line of match[1].split(/\r?\n/)) {
      const pair = /^([A-Za-z][A-Za-z0-9]*):\s*(.*)$/.exec(line);
      if (pair) values[pair[1]] = pair[2].trim().replace(/^(?:"(.*)"|'(.*)')$/, (_, doubleQuoted, singleQuoted) => doubleQuoted ?? singleQuoted);
    }
  }
  return { values, body: match ? text.slice(match[0].length).trim() : text.trim() };
}

function isoDate(value, label) {
  assert(/^\d{2}\/\d{2}\/\d{4}$/.test(value ?? ''), `${label}: date must use DD/MM/YYYY`);
  const [day, month, year] = value.split('/');
  return `${year}-${month}-${day}`;
}

function writeJson(file, value) {
  return writeFile(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function roleEdition(role, id, title, sourceUrl, cover, lessons, dayOrder = null) {
  return {
    id,
    programId: 'alive-in-jesus-pr-pb',
    locale: 'id',
    trackId: 'primary',
    cycleId: 'year-a',
    bookRole: role,
    structureType: role === 'student-guide' ? 'weekly-story-with-daily-reading' : 'track-specific-companion-resource',
    dayOrder,
    title,
    description: 'Alive in Jesus · Primary · Tahun A · Triwulan IV 2026',
    theme: 'Yesus Dapat Melakukan Segala Sesuatu',
    startDate: '2026-09-27',
    endDate: '2026-12-26',
    cover,
    sourceName: 'Alive in Jesus · Primary',
    sourceUrl,
    attribution: '© 2026 General Conference of Seventh-day Adventists®. Edisi Bahasa Indonesia diterjemahkan oleh tim SabatKu.',
    rightsStatement: 'Terjemahan tim SabatKu. Hak atas materi sumber tetap pada pemiliknya.',
    publicationStatus: 'published',
    lessons,
  };
}

async function markdownFile(file, title) {
  const original = await readFile(file, 'utf8');
  const parsed = frontmatter(original);
  return { content: `${labelPrimarySongs(normalizeAliveInJesusMarkdown(parsed.body))}\n`, title: parsed.values.title || title || path.basename(file, '.md') };
}

async function writeRoleEdition(roleDirectory, edition) {
  await mkdir(path.join(roleDirectory, 'assets'), { recursive: true });
  await writeJson(path.join(roleDirectory, 'edition.json'), {
    ...edition,
    lessons: edition.lessons.map(({ id, title, startDate, endDate }) => ({ id, title, startDate, endDate })),
  });
  for (const lesson of edition.lessons) {
    const folder = path.join(roleDirectory, lesson.id);
    await mkdir(folder, { recursive: true });
    await writeJson(path.join(folder, 'lesson.json'), {
      id: lesson.id,
      title: lesson.title,
      startDate: lesson.startDate,
      endDate: lesson.endDate,
      readings: lesson.readings.map(({ key, title, date, file }) => ({ key, title, date, file })),
    });
    for (const reading of lesson.readings) {
      await writeFile(path.join(folder, reading.file), reading.content, 'utf8');
    }
  }
}

async function main() {
  for (const role of ['student', 'teacher']) {
    const existing = await readFile(path.join(targetRoot, role, 'edition.json'), 'utf8').catch(error => {
      if (error.code === 'ENOENT') return null;
      throw error;
    });
    if (existing && (JSON.parse(existing).publicationStatus === 'published' || JSON.parse(existing).sourceReviewRequired)) {
      throw new Error('Reviewed/published Primary content must not be overwritten by the source importer. Apply an audited editorial revision instead.');
    }
  }
  const studentSource = path.join(sourceRoot, 'AIJ_Primary_2026_Q4_ID_MD');
  const teacherSource = path.join(sourceRoot, 'AIJ_Primary_Teacher_2026_Q4_ID_MD');
  const studentTarget = path.join(targetRoot, 'student');
  const teacherTarget = path.join(targetRoot, 'teacher');
  await mkdir(targetRoot, { recursive: true });

  const studentLessons = [];
  for (let week = 1; week <= 13; week++) {
    const lessonId = `lesson-${String(week).padStart(2, '0')}`;
    const readings = [];
    let weekTitle = '';
    for (let day = 0; day < dayKeys.length; day++) {
      const sourceFile = path.join(studentSource, String(week).padStart(2, '0'), `${String(day + 1).padStart(2, '0')}.md`);
      const { values, body } = frontmatter(await readFile(sourceFile, 'utf8'));
      assert(values.title && values.date, `${sourceFile}: title and date frontmatter are required`);
      const date = isoDate(values.date, sourceFile);
      if (day === 0) { weekTitle = values.title; weekDates[week - 1] = date; }
      if (day === dayKeys.length - 1) weekDates[week] = date;
      readings.push({
        key: dayKeys[day],
        title: values.title,
        date,
        file: `${dayKeys[day]}.md`,
        content: `${labelPrimarySongs(normalizeAliveInJesusMarkdown(body))}\n`,
      });
    }
    studentLessons.push({ id: lessonId, title: weekTitle, startDate: readings[0].date, endDate: readings.at(-1).date, readings });
  }
  assert(weekDates[0] === '2026-09-27' && weekDates[13] === '2026-12-26', 'Primary Q4 2026 dates do not match the supplied edition.');

  const familyFolders = [
    ['00-primary-parents', 'primary-parents.md', 'Surat untuk Orang Tua'],
    ['00-short-devotions', 'short-devotions.md', 'Renungan Singkat untuk Keluarga'],
    ['00-primary-friends', 'primary-friends.md', 'Primary Friends'],
    ['00-music-and-podcasts', '00-music-and-podcasts.md', 'Musik dan Podcast'],
  ];
  const familyReadings = [];
  for (const [folder, file, title] of familyFolders) {
    const sourceFile = path.join(studentSource, folder, file);
    const { content, title: sourceTitle } = await markdownFile(sourceFile, title);
    const key = ({
      '00-primary-parents': 'parents-letter',
      '00-short-devotions': 'family-devotions',
      '00-primary-friends': 'primary-friends',
      '00-music-and-podcasts': 'music-and-podcasts',
    })[folder];
    familyReadings.push({ key, title: sourceTitle || title, date: '2026-09-27', file: `${key}.md`, content });
  }
  studentLessons.push({
    id: 'unit-resource-family',
    title: 'Bacaan Tambahan untuk Keluarga',
    startDate: '2026-09-27',
    endDate: '2026-12-26',
    readings: familyReadings,
  });

  const studentEdition = roleEdition(
    'student-guide', '2026-q4-aij-primary-student', 'Alive in Jesus · Primary · Panduan Murid · Triwulan IV 2026',
    'https://primary.aliveinjesus.info/students', 'editions/2026-q4-aij-primary-student/assets/cover.png',
    studentLessons, dayKeys,
  );
  await writeRoleEdition(studentTarget, studentEdition);
  await cp(path.join(sourceRoot, 'cover student.png'), path.join(studentTarget, 'assets/cover.png'));

  const teacherLessons = [];
  for (let week = 1; week <= 13; week++) {
    const lessonId = `lesson-${String(week).padStart(2, '0')}`;
    const weekFolder = path.join(teacherSource, String(week).padStart(2, '0'));
    const files = (await readdir(weekFolder)).filter(name => name.endsWith('.md')).sort();
    const sections = [];
    for (const name of files) {
      const sectionLabel = name.replace(/^\d+-/, '').replace(/\.md$/, '').replace(/-/g, ' ')
        .replace(/\b\w/g, letter => letter.toUpperCase());
      const sourceFile = path.join(weekFolder, name);
      const section = await markdownFile(sourceFile, sectionLabel);
      sections.push(`## ${section.title}\n\n${section.content.trim()}`);
    }
    const sourceOverview = await readFile(path.join(weekFolder, '01-overview.md'), 'utf8');
    const overviewTitle = frontmatter(sourceOverview).values.title || studentLessons[week - 1].title;
    const startDate = studentLessons[week - 1].startDate;
    const endDate = studentLessons[week - 1].endDate;
    teacherLessons.push({
      id: lessonId,
      title: overviewTitle,
      startDate,
      endDate,
      readings: [{ key: 'teacher-guide', title: `Panduan Guru · ${overviewTitle}`, date: endDate, file: 'teacher-guide.md', content: `${labelPrimarySongs(normalizeAliveInJesusMarkdown(sections.join('\n\n---\n\n')))}\n` }],
    });
  }
  const globalTeacherFolders = [
    ['000-primary-teacher', 'Tentang Kurikulum Primary'],
    ['001-tips-for-telling-bible-stories', 'Tips Menceritakan Kisah Alkitab'],
    ['002-craft-resources', 'Sumber Kerajinan'],
    ['003-character-cards', 'Kartu Karakter'],
    ['004-mission-fast-facts', 'Fakta Misi'],
    ['005-music', 'Musik'],
  ];
  for (const [index, [folderName, title]] of globalTeacherFolders.entries()) {
    const folder = path.join(teacherSource, folderName);
    const files = (await readdir(folder)).filter(name => name.endsWith('.md')).sort();
    const parts = [];
    for (const name of files) parts.push((await markdownFile(path.join(folder, name))).content.trim());
    teacherLessons.push({
      id: `unit-resource-${String(index + 1).padStart(2, '0')}`,
      title,
      startDate: '2026-09-27',
      endDate: '2026-12-26',
      readings: [{ key: 'resource', title, date: '2026-09-27', file: 'resource.md', content: `${normalizeAliveInJesusMarkdown(parts.join('\n\n---\n\n'))}\n` }],
    });
  }
  const teacherEdition = roleEdition(
    'teacher-guide', '2026-q4-aij-primary-teacher', 'Alive in Jesus · Primary · Panduan Guru · Triwulan IV 2026',
    'https://primary.aliveinjesus.info/teachers', 'editions/2026-q4-aij-primary-teacher/assets/cover.png', teacherLessons,
  );
  await writeRoleEdition(teacherTarget, teacherEdition);
  await cp(path.join(sourceRoot, 'cover teacher.png'), path.join(teacherTarget, 'assets/cover.png'));

  const teacherIntroduction = `${normalizeAliveInJesusMarkdown(frontmatter(await readFile(path.join(teacherSource, 'introduction.md'), 'utf8')).body)}\n`;
  const studentIntroduction = `${normalizeAliveInJesusMarkdown(frontmatter(await readFile(path.join(studentSource, 'introduction.md'), 'utf8')).body)}\n`;
  await writeFile(path.join(studentTarget, 'introduction.md'), studentIntroduction, 'utf8');
  await writeFile(path.join(teacherTarget, 'introduction.md'), teacherIntroduction, 'utf8');
  console.log(`Imported Primary student and teacher books, with family readings inside the student edition, to ${path.relative(repositoryRoot, targetRoot)}.`);
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
