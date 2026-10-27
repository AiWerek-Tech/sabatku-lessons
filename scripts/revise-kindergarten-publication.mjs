import { readFile, writeFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { labelKindergartenSongs } from './kindergarten-song-labels.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const base = path.join(root, 'content/id/alive-in-jesus/kindergarten/2026-q4-year-a');
const fixes = JSON.parse(await readFile(new URL('./kindergarten-publication-corrections.json', import.meta.url), 'utf8'));
const sha = value => createHash('sha256').update(value.replace(/\r\n/g, '\n').replace(/\r/g, '\n')).digest('hex');
const changes = [];
for (const role of ['student', 'teacher']) {
  const editionRoot = path.join(base, role);
  const reviewed = JSON.parse(await readFile(path.join(editionRoot, 'source-review.json'), 'utf8'));
  const checksums = {};
  async function visit(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) { await visit(file); continue; }
      if (!entry.name.endsWith('.md')) continue;
      const before = await readFile(file, 'utf8');
      const relative = path.relative(base, file).split(path.sep).join('/');
      let text = before;
      for (const [from, to] of [...(role === 'teacher' ? fixes.sharedTeacher : []), ...(fixes.files[relative] ?? []), ...fixes.shared]) {
        if (!text.includes(from) && !text.includes(to) && fixes.files[relative]?.some(pair => pair[0] === from)) {
          throw new Error(`Stale correction in ${relative}: ${from}`);
        }
        text = text.replaceAll(from, to);
      }
      // Direct questions are spoken to children; instructions for the adult
      // teacher retain the respectful Anda form.
      if (role === 'teacher') text = text.split('\n').map(line => /^- (?:\*\*)?(?:Apa|Bagaimana|Pernahkah|Bisakah|Dapatkah|Mengapa|Siapa|Kapan)\b/.test(line)
        ? line.replaceAll('Anda', 'kamu') : line).join('\n');
      text = labelKindergartenSongs(text);
      const key = path.relative(editionRoot, file).split(path.sep).join('/');
      checksums[key] = sha(text);
      if (text !== before) {
        await writeFile(file, text, 'utf8');
        changes.push({ file: relative, before: sha(before), after: sha(text) });
      }
    }
  }
  await visit(editionRoot);
  const roleChanges = changes.filter(change => change.file.startsWith(`${role}/`));
  if (roleChanges.length) {
    // Preserve the actual team approval; do not attribute this AI editorial
    // revision to a new human review which has not taken place.
    reviewed.previousApproval ??= { reviewer: reviewed.reviewer, reviewedAt: reviewed.reviewedAt, note: reviewed.note };
    reviewed.reviewer = 'Codex · audit editorial atas permintaan pemilik proyek';
    reviewed.reviewedAt = '2026-10-26';
    reviewed.note = 'Perbaikan kebahasaan dan judul lagu berdasarkan instruksi pemilik proyek. Persetujuan Tim SabatKu sebelumnya dicatat pada previousApproval; revisi ini merupakan audit AI, bukan pemeriksaan manusia baru.';
    reviewed.translationFiles = Object.fromEntries(Object.entries(checksums).sort(([a], [b]) => a.localeCompare(b)));
    reviewed.editorialAudit = 'docs/audits/kindergarten-publication-review-20261026.json';
    await writeFile(path.join(editionRoot, 'source-review.json'), `${JSON.stringify(reviewed, null, 2)}\n`);
  }
}
if (changes.length) {
  const reportPath = path.join(root, 'docs/audits/kindergarten-publication-review-20261026.json');
  const previous = JSON.parse(await readFile(reportPath, 'utf8').catch(() => '{"changes":[]}'));
  const cumulative = new Map(previous.changes.map(change => [change.file, change]));
  for (const change of changes) cumulative.set(change.file, { ...change, before: cumulative.get(change.file)?.before ?? change.before });
  await writeFile(reportPath, `${JSON.stringify({
    date: '2026-10-26', reviewer: 'Codex', scope: 'Kindergarten student and teacher Indonesian publication',
    authorization: 'Project owner requested translation improvements and preservation of English song titles.',
    englishSources: ['AIJ_Kindergarten_2026_Q4_EN_MD/2026-04-kd', 'AIJ_Kindergarten_Teacher_2026_Q4_EN_MD/2026-04-kd-tg'],
    findings: [
      'English song titles retained in audio cards, singing instructions and lists; Indonesian meaning follows in parentheses. Song lyrics and ordinary Bible narrative remain Indonesian.',
      'Craft, offering, peg-person props and instrument cues corrected against corresponding English teacher text.',
      'Indonesian memory verse Diam! Tenanglah! has two words; the English three-word count is not applicable.',
      'Matthew 8:8 and 8:8–9 in student lesson 11 accurately cover the quoted words; English source references to 8:9 alone do not cover both sentences.',
      'Revised unclear pronouns, literal idioms and child-facing questions. No editorial comments added to lesson text.'
    ],
    limitation: 'Editorial AI audit; the original Tim SabatKu approval is preserved separately, without claiming a new human review.',
    changes: [...cumulative.values()].sort((a, b) => a.file.localeCompare(b.file))
  }, null, 2)}\n`);
}
console.log(`Kindergarten editorial revision: ${changes.length} documents updated.`);
