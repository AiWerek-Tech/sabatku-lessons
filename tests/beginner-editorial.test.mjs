import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { bilingualBeginnerSongs } from '../scripts/beginner-song-titles.mjs';

const base = new URL('../content/id/alive-in-jesus/beginner/2026-q4-year-a/', import.meta.url);
const read = file => readFile(new URL(file, base), 'utf8');
test('Beginner keeps English song titles while preserving doll names, lyrics and reference links', () => {
  const source = 'Bungkus “Bayi Yesus” dengan selimut dan nyanyikan lagu pengantar tidur.\n\nNyanyikan "Bintang Natal".\n\nNyanyikan "God\'s Little Helper" (Penolong Kecil Tuhan).\n\nNyanyikan “Silent Night” (Malam Kudus) (Buku nyanyian, no. 1).\n\nLirik: Hari Sabat, hari yang indah.\n\n[♫ Tik-Tok](https://example.org/01-tick-tock.mp3?updated)';
  const result = bilingualBeginnerSongs(source);
  assert.ok(result.includes('Bungkus “Bayi Yesus” dengan selimut'));
  assert.ok(result.includes('"Christmas Star" (Bintang Natal)'));
  assert.ok(result.includes('"God’s Little Helper" (Penolong Kecil Tuhan)'));
  assert.ok(result.includes('“Silent Night” (Malam Kudus) (Buku nyanyian, no. 1)'));
  assert.ok(result.includes('Lirik: Hari Sabat, hari yang indah.'));
  assert.ok(result.includes('[♫ Tick-Tock (Tik-Tok) · bahasa Inggris](https://example.org/01-tick-tock.mp3?updated)'));
  assert.equal(bilingualBeginnerSongs(result), result);
  assert.equal(bilingualBeginnerSongs('Nyanyikan “Sabbath School Is Over” (Sekolah Sabat Telah Berakhir).'), 'Nyanyikan “Sabbath School Is Over” (Sekolah Sabat Telah Usai).');
});

test('Beginner teacher instructions and weekly messages remain aligned with the home guide', async () => {
  for (let week = 1; week <= 13; week++) {
    const id = String(week).padStart(2, '0');
    const story = await read(`teacher/lesson-${id}/story.md`);
    const memory = await read(`teacher/lesson-${id}/memory-verse.md`);
    assert.doesNotMatch(story, /tabernakel|kata keledai|dua guci parfum|memberikannya kepadanya|menggerakkan Orang Majus/);
    assert.doesNotMatch(memory, /dan mengajak/);
    if ([3, 5, 8, 10].includes(week)) {
      const home = await read(`student/lesson-${id}/story.md`);
      const message = /\*\*Pesan Utama:\*\* ([^\n]+)/.exec(home)[1];
      assert.ok(story.includes(`Ucapkan bersama: **${message}**`), `${id}: teacher and child messages must match`);
    }
  }
  const story10 = await read('teacher/lesson-10/story.md');
  assert.match(story10, /bunyi langkah keledai/);
  assert.match(await read('teacher/lesson-01/story.md'), /Tuhan telah memberikan Samuel kepada Hana/);
  assert.match(await read('student/lesson-10/parent-reflection.md'), /meminta-Nya/);
});

test('all Beginner publications are checked and review checksums match the revised Markdown', async () => {
  let count = 0;
  for (const role of ['student', 'teacher']) {
    const review = JSON.parse(await read(`${role}/source-review.json`));
    assert.equal(review.status, 'approved');
    assert.ok(review.previousApproval.reviewer);
    assert.match(review.reviewer, /Codex/);
    async function visit(directory, prefix = '') {
      for (const entry of await readdir(new URL(`${role}/${directory}`, base), { withFileTypes: true })) {
        const key = prefix + entry.name;
        if (entry.isDirectory()) { await visit(directory + entry.name + '/', key + '/'); continue; }
        if (!entry.name.endsWith('.md')) continue;
        const text = await read(`${role}/${key}`);
        assert.equal(bilingualBeginnerSongs(text), text, key);
        const hash = createHash('sha256').update(text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')).digest('hex');
        assert.equal(review.translationFiles[key], hash, key);
        count++;
      }
    }
    await visit('');
  }
  assert.equal(count, 170);
});
