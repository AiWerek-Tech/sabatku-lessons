import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { kindergartenSongs, labelKindergartenSongs, songLabel } from '../scripts/kindergarten-song-labels.mjs';

const base = new URL('../content/id/alive-in-jesus/kindergarten/2026-q4-year-a/', import.meta.url);
async function documents(directory = base) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = new URL(`${entry.name}${entry.isDirectory() ? '/' : ''}`, directory);
    if (entry.isDirectory()) result.push(...await documents(file));
    else if (entry.name.endsWith('.md')) result.push({ file, text: await readFile(file, 'utf8') });
  }
  return result;
}

test('song labels retain English names without changing narrative, lyrics, URLs or independent references', () => {
  const input = 'Firman Tuhan mengajar kita tentang Hari Sabat.\n\n**MENYANYI:** Nyanyikan lagu-lagu berikut:\n\n- “Tuhan Menolongku”\n- “Yesus Mengasihi Aku (Lagu Sabat)”\n\n[♫ Tuhan Menolongku](https://example.org/god-helps-me.mp3?updated)\n\nNyanyikan “God Will Take Care of You” (Buku Nyanyian, no. 99).\n\n### Lirik\n\nYesus mengasihiku, ini aku tahu.\n\nBuatlah kartu “Semoga Cepat Sembuh”.';
  const output = labelKindergartenSongs(input);
  assert.match(output, /“God Helps Me” \(Tuhan Menolongku\)/);
  assert.match(output, /“Jesus Loves Me \(Sabbath Song\)” \(Yesus Mengasihiku \(Lagu Sabat\)\)/);
  assert.match(output, /\[♫ God Helps Me \(Tuhan Menolongku\)\]\(https:\/\/example.org\/god-helps-me.mp3\?updated\)/);
  assert.match(output, /\(Allah Akan Memeliharamu\) \(Buku Nyanyian, no. 99\)/);
  assert.ok(output.startsWith('Firman Tuhan mengajar kita tentang Hari Sabat.'));
  assert.ok(output.includes('Yesus mengasihiku, ini aku tahu.'));
  assert.ok(output.includes('Buatlah kartu “Semoga Cepat Sembuh”.'));
  assert.equal(labelKindergartenSongs(output), output, 'nested subtitles must not grow when normalization is repeated');
});

test('published Kindergarten documents have canonical song labels and stable presentation', async () => {
  const files = await documents();
  assert.equal(files.length, 211);
  let audioCount = 0;
  for (const { file, text } of files) {
    assert.equal(labelKindergartenSongs(text), text, `noncanonical song reference: ${file}`);
    for (const [, label, url] of text.matchAll(/\[♫ ([^\]]+)\]\(([^)]+)\)/g)) {
      const asset = new URL(url).pathname.split('/').at(-1);
      if (/^KD-\d+\.mp3$/.test(asset)) continue; // Spoken podcasts are not songs.
      const song = kindergartenSongs.find(item => item.asset === asset);
      assert.ok(song, `unknown song asset ${asset}`);
      assert.equal(label, songLabel(song), `${file}: ${asset}`);
      audioCount++;
    }
    assert.doesNotMatch(text, /Contoh pesawat Lazarus|menjepit Yesus|murid pasak|\*\*KEAHLIAN:\*\*|penawaran misi|perasaan mereka yang hebat|Klik untuk Menampilkan Jawabannya/);
  }
  assert.ok(audioCount > 150);
});

test('editorial revision preserves original human approval provenance', async () => {
  for (const role of ['student', 'teacher']) {
    const review = JSON.parse(await readFile(new URL(`${role}/source-review.json`, base), 'utf8'));
    assert.equal(review.status, 'approved');
    assert.equal(review.previousApproval.reviewer, 'Tim SabatKu');
    assert.match(review.reviewer, /Codex/);
  }
});
