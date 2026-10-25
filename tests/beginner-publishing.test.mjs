import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAliveInJesus } from '../scripts/build-alive-in-jesus.mjs';
import { normalizeAliveInJesusMarkdown } from '../scripts/build-alive-in-jesus.mjs';

test('Published Beginner editions preserve weekly home stories and independent teacher programs', async () => {
  const release = await buildAliveInJesus('content', 'public');
  assert.equal(release.editions.some(p => p.id === 'alive-in-jesus-bg-pb'), true, 'audited and authorized editions must appear in production');
  const preview = await buildAliveInJesus('content', 'public-preview', { includeDrafts: true });
  const program = preview.editions.find(p => p.id === 'alive-in-jesus-bg-pb');
  assert.equal(program.editions.length, 2);
  for (const role of ['student', 'teacher']) {
    const edition = program.editions.find(e => e.id === `2026-q4-aij-beginner-${role}`);
    assert.equal(edition.dayOrder, null);
    const docs = preview.published.filter(p => p.value.editionId === edition.id);
    const weeks = docs.filter(p => /^lesson-\d{2}$/.test(p.value.lesson.id));
    assert.equal(weeks.length, 13);
    for (const week of weeks) {
      const readings = week.value.readings;
      assert.equal(readings.length, role === 'student' ? 3 : 9);
      if (role === 'student') assert.deepEqual(readings.map(r => r.key), ['story', 'play', 'parent-reflection']);
      for (const r of readings) {
        assert.doesNotMatch(r.content, /\^\[|\^\^\^|;;;|!a\[|!v\[|<callout>|\{"(?:style|credits)"|[\u0000-\u0008]/);
        assert.doesNotMatch(r.content, /Pertunangan|Saat Seorang Ibu Menelepon|PENAWARAN|KIND BOAZ|KANDANG KUDA/);
      }
    }
    assert.equal(docs.flatMap(p => p.value.pdfs).length, 0, 'English PDFs remain at the provider');
  }
});

test('Beginner video extension becomes a media link, not source markup', () => {
  const video='https://sabbath-school-resources-assets.adventech.io/en/aij/2025-04-bg-tg/assets/sand.mp4';
  assert.equal(normalizeAliveInJesusMarkdown(`;;;\n!v[${video}]\n^^^`), `[▶ Video demonstrasi](${video})`);
});


test('Beginner uses Indonesian Bible numbering for translated memory verses', async () => {
  const { readFile } = await import('node:fs/promises');
  const base='content/id/alive-in-jesus/beginner/2026-q4-year-a/student';
  assert.match(await readFile(`${base}/lesson-05/play.md`, 'utf8'), /Mazmur 34:11/);
  assert.match(await readFile(`${base}/lesson-11/play.md`, 'utf8'), /Yesaya 9:5/);
});


test('Beginner refuses publication when reviewed text changes', async t => {
  const { cp, mkdtemp, readFile, writeFile, rm } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const path = await import('node:path');
  const directory = await mkdtemp(path.join(tmpdir(), 'sabatku-beginner-review-'));
  t.after(async () => {
    assert.equal(path.dirname(directory), path.resolve(tmpdir()));
    await rm(directory, { recursive: true, force: true });
  });
  const edition = path.join(directory, 'id/alive-in-jesus/beginner/2026-q4-year-a/student');
  await cp('content/id/alive-in-jesus/beginner/2026-q4-year-a/student', edition, { recursive: true });
  const file = path.join(edition, 'lesson-01/story.md');
  await writeFile(file, (await readFile(file, 'utf8')) + '\nPerubahan tanpa audit ulang.\n');
  await assert.rejects(buildAliveInJesus(directory, path.join(directory, 'public')), /Markdown changed after team review/);
});


test('Beginner song cards preserve original English titles and Indonesian subtitles', async () => {
  const { beginnerSongs, bilingualBeginnerSongs } = await import('../scripts/beginner-song-titles.mjs');
  const release = await buildAliveInJesus('content', 'public');
  const titles = new Map(beginnerSongs.map(([file,en,id]) => [file, `${en} (${id}) · bahasa Inggris`]));
  let checked = 0;
  for (const doc of release.published.filter(p => p.value.editionId?.includes('beginner'))) {
    for (const reading of doc.value.readings) {
      assert.equal(bilingualBeginnerSongs(reading.content), reading.content, 'title normalization must be idempotent');
      for (const [,label,url] of reading.content.matchAll(/\[♫ ([^\]\n]+)\]\((https:\/\/[^)]+)\)/g)) {
        const expected = titles.get(new URL(url).pathname.split('/').at(-1));
        if (expected) { assert.equal(label, expected); checked++; }
      }
    }
  }
  assert.ok(checked > 150, `audited ${checked} song cards`);
  assert.equal(bilingualBeginnerSongs('Nyanyikan “Saatnya Berdoa”.'), 'Nyanyikan “When It’s Time to Pray” (Saatnya Berdoa).');
});
