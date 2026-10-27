import { cp, mkdir, readFile, readdir, writeFile, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { auditAliveInJesusTranslations, createReviewManifest } from './audit-alive-in-jesus-translations.mjs';
import { normalizeAliveInJesusMarkdown } from './build-alive-in-jesus.mjs';
import { labelKindergartenSongs } from './kindergarten-song-labels.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.resolve(process.argv[2] || 'C:/Users/ADMIN/Music/Alive In Jesus/3. KINDERGARTEN');
const target = path.join(root, 'content/id/alive-in-jesus/kindergarten/2026-q4-year-a');
const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'sabbath'];
const assert = (value, message) => { if (!value) throw new Error(message); };
const json = (file, value) => writeFile(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');

function parse(text) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(text);
  const metadata = {};
  for (const line of match?.[1].split(/\r?\n/) ?? []) {
    const field = /^(title|date|subtitle):\s*(.*?)\s*$/.exec(line);
    if (field) metadata[field[1]] = field[2].replace(/^(["'])(.*)\1$/, '$2');
  }
  return { ...metadata, body: match ? text.slice(match[0].length).trim() : text.trim() };
}

// Copyediting only: preserve names, Scripture wording and facts for team review.
function presentation(text) {
  return labelKindergartenSongs(normalizeAliveInJesusMarkdown(text))
    .replaceAll('Bagan Penawaran', 'Bagan Persembahan')
    .replaceAll('bagan penawaran', 'bagan persembahan')
    .replaceAll('Keyakinan Fundamental', 'Kepercayaan Dasar')
    .replaceAll('Gambaran Umum Kuartal 3 Taman Kanak-Kanak', 'Ikhtisar Kindergarten · Triwulan IV')
    .replaceAll('semester lalu', 'triwulan sebelumnya');
}

const teacherLabels = {
  overview: 'Ikhtisar Pelajaran', 'a-quiet-moment': 'Saat Teduh Guru',
  'simple-program-outline': 'Garis Besar Program', 'program-preparation': 'Persiapan Program',
  'full-program-outline': 'Program Lengkap', 'tell-the-story': 'Ceritakan Kisahnya',
  'mission-story': 'Kisah Misi', 'nature-lesson': 'Pelajaran Alam', craft: 'Kerajinan', resource: 'Bahan Kegiatan',
};
const resources = [
  ['000-kindergarten-teacher', 'about-curriculum', 'Mengenal Kurikulum Kindergarten'],
  ['001-tips-for-telling-bible-stories', 'storytelling', 'Petunjuk Bercerita'],
  ['002-kindergarten-quarter-3-overview', 'quarter-overview', 'Ikhtisar Kindergarten · Triwulan IV'],
  ['003-quarterly-crafts', 'quarterly-crafts', 'Kerajinan Triwulan'],
  ['004-nature-cards', 'nature-cards', 'Kartu Alam'],
  ['005-mission-fast-facts', 'mission-facts', 'Fakta Singkat Misi'],
  ['006-music', 'music', 'Musik untuk Kelas'],
];

async function saveReading(directory, key, title, date, body) {
  await writeFile(path.join(directory, `${key}.md`), `${presentation(body)}\n`, 'utf8');
  return { key, title, date, file: `${key}.md` };
}

async function main() {
  // Never overwrite reviewed lessons or subsequent editorial work when rerun.
  try {
    await access(target);
    if (!process.argv.includes('--refresh-draft')) throw new Error(`Target already exists: ${target}`);
    for (const role of ['student', 'teacher']) {
      const edition = JSON.parse(await readFile(path.join(target, role, 'edition.json'), 'utf8'));
      assert(edition.publicationStatus === 'draft', 'Only an unpublished draft can be regenerated');
    }
  }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  const studentSource = path.join(source, 'AIJ_Kindergarten_2026_Q4_ID_MD/2026-04-kd');
  const teacherSource = path.join(source, 'AIJ_Kindergarten_Teacher_2026_Q4_ID_MD/2026-04-kd-tg');
  const periods = [];
  for (const role of ['student', 'teacher']) {
    const directory = path.join(target, role);
    await mkdir(path.join(directory, 'assets'), { recursive: true });
    const sourceDirectory = role === 'student' ? studentSource : teacherSource;
    const id = `2026-q4-aij-kindergarten-${role}`;
    const lessons = [];
    for (let week = 1; week <= 13; week++) {
      const number = String(week).padStart(2, '0');
      const lessonId = `lesson-${number}`;
      const lessonDirectory = path.join(directory, lessonId);
      await mkdir(lessonDirectory, { recursive: true });
      const sunday = parse(await readFile(path.join(studentSource, number, '01.md'), 'utf8'));
      const iso = value => { const [d, m, y] = value.split('/'); return `${y}-${m}-${d}`; };
      const startDate = iso(sunday.date);
      const endDate = iso(parse(await readFile(path.join(studentSource, number, '07.md'), 'utf8')).date);
      assert(new Date(`${startDate}T00:00:00Z`).getUTCDay() === 0, `Week ${week}: expected Sunday`);
      periods[week - 1] = { startDate, endDate };
      const readings = [];
      if (role === 'student') {
        for (const [index, key] of days.entries()) {
          const parsed = parse(await readFile(path.join(sourceDirectory, number, `${String(index + 1).padStart(2, '0')}.md`), 'utf8'));
          const date = iso(parsed.date);
          assert(new Date(`${date}T00:00:00Z`) - new Date(`${startDate}T00:00:00Z`) === index * 86400000, `Week ${week}: nonconsecutive dates`);
          readings.push(await saveReading(lessonDirectory, key, parsed.title, date, parsed.body));
        }
      } else {
        for (const file of (await readdir(path.join(sourceDirectory, number))).filter(file => file.endsWith('.md')).sort()) {
          const parsed = parse(await readFile(path.join(sourceDirectory, number, file), 'utf8'));
          const key = file.replace(/^\d+-/, '').replace(/\.md$/, '');
          assert(teacherLabels[key], `Unknown teacher section: ${file}`);
          // No repeated lesson title inside the overview: it is already in the reader header.
          readings.push(await saveReading(lessonDirectory, key, teacherLabels[key], endDate, parsed.body));
        }
      }
      const lesson = { id: lessonId, title: sunday.title, startDate, endDate, readings };
      await json(path.join(lessonDirectory, 'lesson.json'), lesson);
      lessons.push({ id: lessonId, title: sunday.title, startDate, endDate });
    }
    const startDate = periods[0].startDate, endDate = periods[12].endDate;
    if (role === 'student') {
      const resourceDirectory = path.join(directory, 'unit-resource-family');
      await mkdir(resourceDirectory, { recursive: true });
      const readings = [];
      for (const [folder, filename, key, title] of [
        ['00-kindergarten-parents', 'kindergarten-parents.md', 'parents-letter', 'Surat untuk Orang Tua'],
        ['00-short-devotions', 'short-devotions.md', 'family-devotions', 'Renungan Singkat'],
        ['00-kindergarten-friends', 'kindergarten-friends.md', 'kindergarten-friends', 'Halo, Anak-Anak!'],
        ['00-music-and-podcasts', '00-music-and-podcasts.md', 'music-and-podcasts', 'Musik dan Podcast'],
      ]) {
        const parsed = parse(await readFile(path.join(sourceDirectory, folder, filename), 'utf8'));
        readings.push(await saveReading(resourceDirectory, key, title, startDate, parsed.body));
      }
      const resource = { id: 'unit-resource-family', title: 'Bahan Pendamping Keluarga', startDate, endDate, readings };
      await json(path.join(resourceDirectory, 'lesson.json'), resource);
      lessons.push({ ...resource, readings: undefined });
    } else {
      for (const [folder, key, title] of resources) {
        const resourceDirectory = path.join(directory, `unit-resource-${key}`);
        await mkdir(resourceDirectory, { recursive: true });
        const texts = [];
        for (const file of (await readdir(path.join(sourceDirectory, folder))).filter(file => file.endsWith('.md')).sort()) {
          texts.push(parse(await readFile(path.join(sourceDirectory, folder, file), 'utf8')).body);
        }
        if (key === 'about-curriculum') texts.unshift(parse(await readFile(path.join(sourceDirectory, 'introduction.md'), 'utf8')).body);
        const readings = [await saveReading(resourceDirectory, 'resource', title, startDate, texts.join('\n\n'))];
        const resource = { id: `unit-resource-${key}`, title, startDate, endDate, readings };
        await json(path.join(resourceDirectory, 'lesson.json'), resource);
        lessons.push({ ...resource, readings: undefined });
      }
    }
    await cp(path.join(source, role === 'student' ? 'cover-student.png' : 'penuntun-guru.png'), path.join(directory, 'assets/cover.png'));
    await writeFile(path.join(directory, 'introduction.md'), `${parse(await readFile(path.join(sourceDirectory, 'introduction.md'), 'utf8')).body}\n`, 'utf8');
    await json(path.join(directory, 'edition.json'), {
      id, programId: 'alive-in-jesus-kd-pb', locale: 'id', trackId: 'kindergarten', cycleId: 'year-a',
      bookRole: role === 'student' ? 'student-guide' : 'teacher-guide',
      structureType: role === 'student' ? 'weekly-story-with-daily-reading' : 'weekly-class-program',
      dayOrder: role === 'student' ? days : null,
      title: `Alive in Jesus · Kindergarten · Panduan ${role === 'student' ? 'Murid' : 'Guru'} · Triwulan IV 2026`,
      description: 'Kindergarten · Usia 4–6 tahun · Tahun A · Triwulan IV 2026',
      theme: 'Yesus Mampu Melakukan Apa Saja', startDate, endDate,
      cover: `editions/${id}/assets/cover.png`,
      sourceName: 'Alive in Jesus · Kindergarten', sourceUrl: `https://kindergarten.aliveinjesus.info/${role === 'student' ? 'students' : 'teachers'}?year=yearA&quarter=quarter4`,
      attribution: '© 2026 General Conference of Seventh-day Adventists®. Terjemahan Bahasa Indonesia oleh tim SabatKu.',
      rightsStatement: 'Hak atas materi sumber tetap pada pemiliknya.',
      publicationStatus: 'draft', sourceReviewRequired: true, lessons,
    });
    const englishDirectory = path.join(source, role === 'student' ? 'AIJ_Kindergarten_2026_Q4_EN_MD/2026-04-kd' : 'AIJ_Kindergarten_Teacher_2026_Q4_EN_MD/2026-04-kd-tg');
    const audit = await auditAliveInJesusTranslations({ englishRoot: englishDirectory, indonesianRoot: sourceDirectory });
    assert(audit.missingEnglish.length === 0 && audit.missingIndonesian.length === 0, `${role}: missing source pairs`);
    await json(path.join(directory, 'source-review.json'), await createReviewManifest({ editionRoot: directory, editionId: id, audit }));
    await mkdir(path.join(root, 'docs/audits'), { recursive: true });
    await json(path.join(root, `docs/audits/kindergarten-${role}-source-audit.json`), audit);
    console.log(`${role}: ${lessons.length} units, ${audit.matchedFiles} paired sources, ${audit.flaggedPairCount} structural flags. Draft imported.`);
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
