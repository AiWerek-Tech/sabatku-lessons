import { readFile, readdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { bilingualBeginnerSongs } from './beginner-song-titles.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const base = path.join(root, 'content/id/alive-in-jesus/beginner/2026-q4-year-a');
const source = path.resolve(process.argv[2] ?? 'C:/Users/ADMIN/Music/Alive In Jesus/2. BEGINER');
const fixes = JSON.parse(await readFile(new URL('./beginner-publication-corrections.json', import.meta.url), 'utf8'));
const sha = text => createHash('sha256').update(text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')).digest('hex');
async function markdown(directory, prefix = '') {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const key = prefix + entry.name;
    if (entry.isDirectory()) files.push(...await markdown(path.join(directory, entry.name), key + '/'));
    else if (entry.name.endsWith('.md')) files.push([key, await readFile(path.join(directory, entry.name), 'utf8')]);
  }
  return files.sort(([a], [b]) => a.localeCompare(b));
}
const sources = {};
for (const [role, folder] of [['student', 'AIJ_Beginner_2026_Q4_EN_MD/2026-04-bg'], ['teacher', 'AIJ_Beginner_Teacher_2026_Q4_EN_MD/2026-04-bg-tg']]) {
  sources[role] = { folder, checksums: Object.fromEntries((await markdown(path.join(source, folder))).map(([key, text]) => [key, sha(text)])) };
}
const plans = [];
const urls = text => [...text.matchAll(/https:\/\/[^\s)]+/g)].map(match => match[0]);
for (const role of ['student', 'teacher']) {
  for (const [file, before] of await markdown(path.join(base, role))) {
    let text = before;
    const key = `${role}/${file}`;
    for (const [from, to] of [...(role === 'teacher' ? fixes.teacher : []), ...(fixes.files[key] ?? []), ...fixes.shared]) {
      if (!text.includes(from) && !text.includes(to) && fixes.files[key]?.some(pair => pair[0] === from)) throw new Error(`Stale correction ${key}: ${from}`);
      text = text.replaceAll(from, to);
    }
    text = bilingualBeginnerSongs(text);
    if (JSON.stringify(urls(before)) !== JSON.stringify(urls(text))) throw new Error(`Unexpected media/reference URL change in ${key}`);
    if (bilingualBeginnerSongs(text) !== text) throw new Error(`Unstable song labels in ${key}`);
    plans.push({ role, file, before, text });
  }
}
// Complete all source, correction and media checks before changing any document.
const changes = plans.filter(plan => plan.before !== plan.text);
for (const plan of changes) await writeFile(path.join(base, plan.role, plan.file), plan.text, 'utf8');
for (const role of ['student', 'teacher']) {
  if (!changes.some(change => change.role === role)) continue;
  const reviewPath = path.join(base, role, 'source-review.json');
  const review = JSON.parse(await readFile(reviewPath, 'utf8'));
  review.previousApproval ??= { reviewer: review.reviewer, reviewedAt: review.reviewedAt, note: review.note };
  review.reviewer = 'Codex (audit editorial lanjutan atas permintaan pemilik proyek)';
  review.reviewedAt = '2026-10-26';
  review.note = 'Audit lanjutan terhadap bahasa dan judul lagu; publikasi tetap mengikuti instruksi pemilik proyek. Riwayat penilaian sebelumnya dipertahankan. Ini merupakan audit AI, bukan klaim persetujuan manusia baru.';
  review.translationFiles = Object.fromEntries(plans.filter(plan => plan.role === role).map(plan => [plan.file, sha(plan.text)]));
  review.editorialAudit = 'docs/audits/beginner-publication-review-20261026.json';
  await writeFile(reviewPath, JSON.stringify(review, null, 2) + '\n');
}
if (changes.length) {
  const reportPath = path.join(root, 'docs/audits/beginner-publication-review-20261026.json');
  const old = JSON.parse(await readFile(reportPath, 'utf8').catch(() => '{"changes":[]}'));
  const cumulative = new Map(old.changes.map(change => [change.file, change]));
  for (const plan of changes) {
    const key = `${plan.role}/${plan.file}`;
    cumulative.set(key, { file: key, before: cumulative.get(key)?.before ?? sha(plan.before), after: sha(plan.text) });
  }
  await writeFile(reportPath, JSON.stringify({
    date: '2026-10-26', reviewer: 'Codex', scope: 'Beginner Indonesian student/home and teacher publications',
    documentsChecked: plans.length, englishSources: sources,
    findings: [
      'Keep the weekly repeatable home-story structure and independent interactive teacher program; do not impose Kindergarten daily readings.',
      'English song titles retained; Indonesian subtitles, apostrophe variants and quoted-title aliases handled without translating a doll label or Bible narrative into a song title.',
      'Teacher directions revised for clear actors, natural motion/sound descriptions, appropriate props and consistent weekly messages.',
      'Correct grammatical mengajak to ajak, clarify Kemah Suci, moncong lumba-lumba and perfumed gifts, and distinguish donkey hoofbeats from speech.',
      'The English preparation resource itself refers to Creation-day activities; generalized this inherited mismatch to the activity being taught for the present quarter.',
      'The short Matthew 1:21 memory verse intentionally follows the English curriculum excerpt. Indonesian Isaiah 9:5 and Psalm 34:11 references remain unchanged.',
      'Preserve the official provider media URLs including the reused 2025 asset paths supplied by the English 2026 edition.'
    ],
    limitations: 'AI editorial audit, without claiming new human approval or Android device testing.',
    changes: [...cumulative.values()].sort((a, b) => a.file.localeCompare(b.file))
  }, null, 2) + '\n');
}
console.log(`Beginner editorial revision: ${plans.length} documents checked, ${changes.length} updated.`);
