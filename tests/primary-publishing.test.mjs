import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { buildAliveInJesus } from '../scripts/build-alive-in-jesus.mjs';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

test('Primary preserves team approval provenance and audited checksums while publishing normalized readings and audio', async () => {
  const out = await mkdtemp(path.join(tmpdir(), 'sabatku-primary-'));
  try {
    const published = await buildAliveInJesus('content', out);
    const program = published.editions.find(program => program.id === 'alive-in-jesus-pr-pb');
    assert.equal(program.editions.length, 2);
    const student = program.editions.find(edition => edition.bookRole === 'student-guide');
    const teacher = program.editions.find(edition => edition.bookRole === 'teacher-guide');
    assert.deepEqual(student.dayOrder, ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'sabbath']);
    assert.equal(teacher.dayOrder, null);

    const documents = role => published.published.filter(item => item.value.editionId === `2026-q4-aij-primary-${role}`);
    assert.equal(documents('student').flatMap(item => item.value.readings).length, 95);
    assert.equal(documents('teacher').flatMap(item => item.value.readings).length, 19);

    for (const role of ['student', 'teacher']) {
      const reviewPath = path.resolve(`content/id/alive-in-jesus/primary/2026-q4-year-a/${role}/source-review.json`);
      const review = JSON.parse(await readFile(reviewPath, 'utf8'));
      assert.equal(review.status, 'approved');
      assert.equal(review.previousApproval?.reviewer ?? review.reviewer, 'Tim SabatKu');
      if (review.previousApproval) {
        assert.match(review.reviewer, /Codex/);
        assert.match(review.note, /bukan klaim pemeriksaan manusia baru/);
      }
      for (const [relativePath, expectedHash] of Object.entries(review.translationFiles)) {
        const fileText = (await readFile(path.resolve(`content/id/alive-in-jesus/primary/2026-q4-year-a/${role}`, relativePath), 'utf8')).replace(/\r\n/g, '\n');
        const actualHash = createHash('sha256').update(fileText).digest('hex');
        assert.equal(actualHash, expectedHash, `Approved checksum must remain intact for ${role}/${relativePath}`);
      }
      for (const document of documents(role)) {
        for (const reading of document.value.readings) {
          assert.doesNotMatch(reading.content, /!a\[|\^\[|\{"(?:style|credits)"/);
          assert.doesNotMatch(reading.content, /\[!aij-/i, `Published ${reading.id} should normalize [!aij-*] callouts`);
        }
      }
    }

    const familyMusic = documents('student')
      .flatMap(item => item.value.readings)
      .find(reading => reading.id?.includes('music-and-podcasts') || reading.key === 'music-and-podcasts');
    assert.ok(familyMusic, 'Primary student family resources include a music and podcast reading');
    assert.match(familyMusic.content, /### Podcast Mingguan/);
    assert.match(familyMusic.content, /PR-01\.mp3/);
    assert.match(familyMusic.content, /PR-13\.mp3/);
  } finally {
    await rm(out, { recursive: true, force: true });
  }
});
