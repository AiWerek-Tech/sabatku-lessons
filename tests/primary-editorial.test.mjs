import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { primarySongs, labelPrimarySongs, primarySongLabel } from '../scripts/primary-song-labels.mjs';
import { normalizeAliveInJesusMarkdown } from '../scripts/build-alive-in-jesus.mjs';

const base = new URL('../content/id/alive-in-jesus/primary/2026-q4-year-a/', import.meta.url);
async function documents(directory = base) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = new URL(entry.name + (entry.isDirectory() ? '/' : ''), directory);
    if (entry.isDirectory()) files.push(...await documents(file));
    else if (entry.name.endsWith('.md')) files.push({ file, text: await readFile(file, 'utf8') });
  }
  return files;
}

test('Primary songs keep original English names without rewriting prose, lyrics or hymn references', () => {
  const input = 'Kasih Tuhan memberi kita damai.\n\n**NYANYIKAN:** Nyanyikan lagu berikut:\n\n- “Bantuan Saya”\n- “Kitab-kitab Alkitab”\n\n!a[https://example.org/my-help.mp3?updated] “Bantuan Saya” {"credits":[]}\n\nNyanyikan “Mencari yang Hilang” (The Seventh-day Adventist Hymnal, no. 373).\n\nLirik: Aku percaya kepada Tuhan.\n\nBacalah Yohanes 14:27.';
  const output = labelPrimarySongs(input);
  assert.ok(output.startsWith('Kasih Tuhan memberi kita damai.'));
  assert.ok(output.includes('“My Help” (Pertolonganku)'));
  assert.ok(output.includes('“Books of the Bible” (Kitab-kitab Alkitab)'));
  assert.ok(output.includes('[♫ My Help (Pertolonganku)](https://example.org/my-help.mp3?updated)'));
  assert.ok(output.includes('“Seeking the Lost” (Mencari yang Hilang) (The Seventh-day Adventist Hymnal, no. 373)'));
  assert.ok(output.includes('Lirik: Aku percaya kepada Tuhan.'));
  assert.ok(output.includes('Bacalah Yohanes 14:27.'));
  assert.equal(labelPrimarySongs(output), output);
});

test('all Primary music assets and published teaching instructions have stable editorial corrections', async () => {
  const files = await documents();
  assert.equal(files.length, 116);
  let checked = 0;
  for (const { file, text } of files) {
    assert.equal(labelPrimarySongs(text), text, `${file}: unstable song title`);
    assert.doesNotMatch(text, /setiap tiga bulan sekali|berkel twinkling|tiga kata sederhana|orang banyak mempersilakan dia masuk/);
    const rendered = normalizeAliveInJesusMarkdown(text);
    for (const [, label, url] of rendered.matchAll(/\[♫ ([^\]]+)\]\(([^)]+)\)/g)) {
      const asset = new URL(url).pathname.split('/').at(-1);
      if (/^PR-\d+\.mp3$/.test(asset)) continue;
      const song = primarySongs.find(song => song.asset === asset);
      assert.ok(song, `unknown recording ${asset}`);
      assert.equal(label, primarySongLabel(song), `${file}: ${asset}`);
      checked++;
    }
    if (file.pathname.includes('/teacher/lesson-')) {
      assert.doesNotMatch(rendered, /KEAHLIAN:|Keahlian:|\*\*Ketahuilah\*\*|\*\*Rasakan\*\*|\*\*Berikan tanggapan\*\*/);
    }
  }
  assert.ok(checked > 150, `audited ${checked} recordings`);
});

test('Primary source importer refuses to overwrite published editorial work', () => {
  assert.throws(() => execFileSync(process.execPath, ['scripts/import-alive-in-jesus-primary.mjs'], { encoding: 'utf8', stdio: 'pipe' }),
    error => /Reviewed\/published Primary content must not be overwritten/.test(error.stderr));
});
