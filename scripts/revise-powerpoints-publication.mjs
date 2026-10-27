import { readFile, writeFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { labelPowerpointsSongs } from './powerpoints-editorial.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const base = path.join(root, 'content/id');
const source = path.resolve(process.argv[2] ?? 'C:/Users/ADMIN/Music/Junior Powerpoints/Pdf English');
const fixes = JSON.parse(await readFile(new URL('./powerpoints-publication-corrections.json', import.meta.url), 'utf8'));
const sha = text => createHash('sha256').update(text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')).digest('hex');
const plans = [];
const evidence = {};
const media = text => [...text.matchAll(/!?\[[^\]]*\]\(([^)]+)\)/g)].map(match => match[1]);
const restoredMedia = { 'student/lesson-02/sabbath.md': '../../assets/puzzle-02.png' };
for (let number = 1; number <= 13; number++) {
  const n = String(number).padStart(2, '0');
  for (const suffix of ['', '-T']) {
    const name = `PP-26-Q4-L${n}${suffix}.pdf`;
    evidence[name] = createHash('sha256').update(await readFile(path.join(source, name))).digest('hex');
  }
  for (const [role, dir] of [['student', `powerpoints/2026-q4-pp/lesson-${n}`], ['teacher', `powerpoints-supplements/2026-q4/lesson-${n}`]]) {
    const files = role === 'student' ? (await readdir(path.join(base, dir))).filter(file => file.endsWith('.md')) : ['teacher-guide/content.md'];
    for (const file of files) {
      const absolute = path.join(base, dir, file);
      const key = `${role}/lesson-${n}/${file}`;
      const before = await readFile(absolute, 'utf8');
      let text = before.replace(/\r\n/g, '\n');
      for (const [from, to] of [...fixes.shared, ...(fixes.files[key] ?? [])]) {
        if (!text.includes(from) && !text.includes(to) && fixes.files[key]?.some(pair => pair[0] === from)) throw new Error(`Stale correction ${key}: ${from}`);
        text = text.replaceAll(from, to);
      }
      if (role === 'teacher') text = text.split('\n').filter(line => ![
        /^\*Catatan sumber:\*/, /^Halaman 91 pada penuntun guru merupakan halaman kosong/,
        /^Bagian ini dicetak ulang sebagai referensi bagi guru dalam PDF sumber/,
        /^Pada bagian ini, sumber penuntun guru mencetak ulang kisah siswa/,
        /^\*Bagian berikut mempertahankan materi siswa yang juga dicetak ulang/,
      ].some(pattern => pattern.test(line))).join('\n');
      text = labelPowerpointsSongs(text);
      text = text.trimEnd() + '\n';
      if (before.includes('\r\n')) text = text.replace(/\n/g, '\r\n');
      if (labelPowerpointsSongs(text) !== text) throw new Error(`Unstable song labels in ${key}`);
      const originalMedia = media(before);
      const restored = restoredMedia[key];
      if (restored && !originalMedia.includes(restored)) {
        await readFile(path.join(base, 'powerpoints/2026-q4-pp/assets', path.basename(restored)));
        originalMedia.push(restored);
      }
      if (JSON.stringify(originalMedia) !== JSON.stringify(media(text))) throw new Error(`Media changed in ${key}`);
      plans.push({ absolute, key, before, text });
    }
  }
}
// Check the full revision before touching any published file.
const changed = plans.filter(plan => plan.before !== plan.text);
for (const plan of changed) await writeFile(plan.absolute, plan.text, 'utf8');
for (let number = 1; number <= 13; number++) {
  const n = String(number).padStart(2, '0');
  if (!changed.some(plan => plan.key.startsWith(`teacher/lesson-${n}/`))) continue;
  const resourcePath = path.join(base, `powerpoints-supplements/2026-q4/lesson-${n}/resources.json`);
  const document = JSON.parse(await readFile(resourcePath, 'utf8'));
  for (const resource of document.resources.filter(resource => resource.kind === 'teacher-guide')) resource.revision = (resource.revision ?? 1) + 1;
  await writeFile(resourcePath, JSON.stringify(document, null, 2) + '\n');
}
const reportPath = path.join(root, 'docs/audits/powerpoints-publication-review-20261026.json');
const previous = JSON.parse(await readFile(reportPath, 'utf8').catch(() => '{"changes":[]}'));
const changes = new Map(previous.changes.map(change => [change.file, change]));
for (const plan of changed) changes.set(plan.key, { file: plan.key, before: changes.get(plan.key)?.before ?? sha(plan.before), after: sha(plan.text) });
if (changed.length) await writeFile(reportPath, JSON.stringify({
  date: '2026-10-26', reviewer: 'Codex', scope: 'Junior PowerPoints 2026 Q4 Indonesian student readings and weekly teacher guides',
  authorization: 'Project owner requested the same translation and English song-title audit as Primary and Beginner.',
  documentsChecked: plans.length, sourcePdfs: evidence,
  findings: [
    'Preserve seven student days, all thirteen weekly teacher guides, numbered covers, puzzles and official English PDF links.',
    'Song names already in English remain unchanged; add Indonesian title meanings in parentheses while preserving hymnal titles and numbers.',
    'Remove unfinished translation-review instructions from the Proverbs 16:3 and 1 John 4:19 puzzle quotations. Keep the existing source-based meaning and do not falsely label it an exact TB 1974 quotation.',
    'Correct mezbah spelling, memercayai, journal terminology, unclear activity instructions, literal phrasing and adult-facing language.',
    'Teacher lesson 9 suggested-song list incorrectly names He Is Our Song for no. 341; the full activity and The SDA Hymnal identify To God Be the Glory. Correct that local bibliography mismatch.',
    'The Nehemiah 13 Wednesday exercise in lesson 9 follows the English source, so its reference was retained.',
      'Restore the existing lesson-02 puzzle asset inline instead of a noninteractive local source filename; lesson-03 remains its original text-based letter puzzle.',
    'Adapt the printed-journal location instruction for app readers without introducing unsupported navigation claims. No translator or editorial notes added to lesson text.'
  ],
  limitations: 'AI editorial audit; no new human approval or Android device testing claimed.',
  documentChecksums: Object.fromEntries(plans.map(plan => [plan.key, sha(plan.text)])),
  changes: [...changes.values()].sort((a, b) => a.file.localeCompare(b.file))
}, null, 2) + '\n');
console.log(`Junior PowerPoints: ${plans.length} documents checked, ${changed.length} updated.`);
