import { readFile, readdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { labelPrimarySongs } from './primary-song-labels.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const base = path.join(root, 'content/id/alive-in-jesus/primary/2026-q4-year-a');
const source = path.resolve(process.argv[2] ?? 'C:/Users/ADMIN/Music/Alive In Jesus/4. PRIMARY');
const fixes = JSON.parse(await readFile(new URL('./primary-publication-corrections.json', import.meta.url), 'utf8'));
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
for (const [role, folder] of [['student', 'AIJ_Primary_2026_Q4_EN_MD/2026-04-pr'], ['teacher', 'AIJ_Primary_Teacher_2026_Q4_EN_MD/2026-04-pr-tg']]) sources[role] = {
  folder, checksums: Object.fromEntries((await markdown(path.join(source, folder))).map(([key, text]) => [key, sha(text)]))
};
const plans = [];
const urls = text => [...text.matchAll(/https:\/\/[^\s)\]]+/g)].map(match => match[0]);
for (const role of ['student', 'teacher']) {
  for (const [file, before] of await markdown(path.join(base, role))) {
    const windowsNewlines = before.includes('\r\n');
    let text = before.replace(/\r\n/g, '\n');
    const key = `${role}/${file}`;
    for (const [from, to] of [...fixes.shared, ...(role === 'teacher' ? fixes.teacher : []), ...(fixes.files[key] ?? [])]) {
      if (!text.includes(from) && !text.includes(to) && fixes.files[key]?.some(pair => pair[0] === from)) throw new Error(`Stale correction ${key}: ${from}`);
      text = text.replaceAll(from, to);
    }
    if (role === 'teacher') {
      text = text.replace(/Anak-anak akan:[\s\S]*?(?=\n---|\n##|$)/g, section => section
        .replaceAll('**Ketahuilah**', '**Mengetahui**').replaceAll('**Rasakan**', '**Merasakan**')
        .replaceAll('**Berikan tanggapan**', '**Menanggapi**').replaceAll('**Berikan respons**', '**Menanggapi**'));
    }
    text = labelPrimarySongs(text);
    if (windowsNewlines) text = text.replace(/\n/g, '\r\n');
    if (JSON.stringify(urls(before)) !== JSON.stringify(urls(text))) throw new Error(`Unexpected media/reference URL change in ${key}`);
    if (labelPrimarySongs(text) !== text) throw new Error(`Unstable song labels in ${key}`);
    plans.push({ role, file, before, text });
  }
}
// Source evidence, replacements and media checks must all pass before any write.
const changes = plans.filter(plan => plan.before !== plan.text);
for (const plan of changes) await writeFile(path.join(base, plan.role, plan.file), plan.text, 'utf8');
for (const role of ['student', 'teacher']) {
  if (!changes.some(change => change.role === role)) continue;
  const reviewPath = path.join(base, role, 'source-review.json');
  const review = JSON.parse(await readFile(reviewPath, 'utf8'));
  review.previousApproval ??= { reviewer: review.reviewer, reviewedAt: review.reviewedAt, note: review.note };
  review.reviewer = 'Codex (audit editorial lanjutan atas permintaan pemilik proyek)';
  review.reviewedAt = '2026-10-26';
  review.note = 'Perbaikan bahasa dan judul lagu berdasarkan instruksi pemilik proyek. Persetujuan Tim SabatKu sebelumnya dipertahankan pada previousApproval. Revisi ini adalah audit AI, bukan klaim pemeriksaan manusia baru.';
  review.translationFiles = Object.fromEntries(plans.filter(plan => plan.role === role).map(plan => [plan.file, sha(plan.text)]));
  review.editorialAudit = 'docs/audits/primary-publication-review-20261026.json';
  await writeFile(reviewPath, JSON.stringify(review, null, 2) + '\n');
}
if (changes.length) {
  const reportPath = path.join(root, 'docs/audits/primary-publication-review-20261026.json');
  const old = JSON.parse(await readFile(reportPath, 'utf8').catch(() => '{"changes":[]}'));
  const cumulative = new Map(old.changes.map(change => [change.file, change]));
  for (const plan of changes) {
    const key = `${plan.role}/${plan.file}`;
    cumulative.set(key, { file: key, before: cumulative.get(key)?.before ?? sha(plan.before), after: sha(plan.text) });
  }
  await writeFile(reportPath, JSON.stringify({
    date: '2026-10-26', reviewer: 'Codex', scope: 'Primary Indonesian student and teacher publications', documentsChecked: plans.length,
    englishSources: sources,
    findings: [
      'Preserve seven dated student readings per week and the independent weekly teacher guide.',
      'Retain original English song names for provider recordings and hymns, with Indonesian subtitles; keep lyrics, reference links and ordinary narrative in Indonesian.',
      'Quarterly playlist means the playlist for the current quarter, not playback once every three months; craft means kerajinan, not keahlian.',
      'Correct unfinished twinkling translation, cardboard/wooden props, actors and movement direction in the healing story; remove English-specific three-word counts from Indonesian narration.',
      'Correct grammatical learning objectives and idiomatic descriptions; preserve the existing approved Bible quotations and local verse numbering.',
      'All original media and reference URLs remain intact; no editorial notes added to lesson text.'
    ],
    limitations: 'AI editorial audit, without claiming a new human review, exhaustive perfection of every sentence or Android device testing.',
    changes: [...cumulative.values()].sort((a, b) => a.file.localeCompare(b.file))
  }, null, 2) + '\n');
}
console.log(`Primary editorial revision: ${plans.length} documents checked, ${changes.length} updated.`);
