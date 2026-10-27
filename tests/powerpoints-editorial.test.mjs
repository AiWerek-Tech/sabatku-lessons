import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { labelPowerpointsSongs, powerpointsSongs } from '../scripts/powerpoints-editorial.mjs';
import { buildPowerpoints } from '../scripts/build-powerpoints.mjs';
import { buildSupplements } from '../scripts/build-supplements.mjs';

test('PowerPoints song names remain English without changing narrative or hymnal references', () => {
  const source = 'Kasih Allah memelihara kita.\n\n### Lagu yang Disarankan\n\n- “He’s Able” (*He Is Our Song*, no. 100).\n- “We Must Wait (on the Lord)” (*He Is Our Song*, no. 129).\n\nNyanyikan “We Three Kings”.\n\n## Bacaan Alkitab\n\nBacalah Matius 2:1–15.';
  const output = labelPowerpointsSongs(source);
  assert.ok(output.includes('“He’s Able” (Dia Sanggup) (*He Is Our Song*, no. 100)'));
  assert.ok(output.includes('“We Must Wait (on the Lord)” (Kita Harus Menantikan Tuhan) (*He Is Our Song*, no. 129)'));
  assert.ok(output.includes('“We Three Kings” (Kami Tiga Orang Majus)'));
  assert.ok(output.startsWith('Kasih Allah memelihara kita.'));
  assert.ok(output.endsWith('Bacalah Matius 2:1–15.'));
  assert.equal(labelPowerpointsSongs(output), output);
});

test('all Junior PowerPoints readings and teacher guides match their editorial audit', async () => {
  const report = JSON.parse(await readFile('docs/audits/powerpoints-publication-review-20261026.json', 'utf8'));
  assert.equal(report.documentsChecked, 104);
  assert.equal(Object.keys(report.sourcePdfs).length, 26);
  assert.equal(Object.keys(report.documentChecksums).length, 104);
  const songs = new Set(powerpointsSongs.map(([english, indonesian]) => `“${english}” (${indonesian})`));
  let songCount = 0;
  for (const [key, expected] of Object.entries(report.documentChecksums)) {
    const [role, lesson, ...parts] = key.split('/');
    const file = role === 'student' ? `content/id/powerpoints/2026-q4-pp/${lesson}/${parts.join('/')}` : `content/id/powerpoints-supplements/2026-q4/${lesson}/${parts.join('/')}`;
    const text = await readFile(file, 'utf8');
    const checksum = createHash('sha256').update(text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')).digest('hex');
    assert.equal(checksum, expected, key);
    assert.equal(labelPowerpointsSongs(text), text, key);
    assert.doesNotMatch(text, /perlu diperiksa|periksa redaksi|catatan penerjemah|Catatan sumber:|mempercayai|\bmazbah\b/i);
    if (role === 'teacher') {
      const section = /#{2,3} Lagu(?:-lagu)? yang Disarankan[^\n]*\r?\n([\s\S]*?)(?=\r?\n#{1,3} |$)/.exec(text)?.[1];
      assert.ok(section, `${lesson}: song section retained`);
      for (const line of section.split(/\r?\n/).filter(line => /^- “/.test(line))) {
        assert.ok([...songs].some(song => line.includes(song)), `${lesson}: unrecognized/missing English song title ${line}`);
        songCount++;
      }
    }
  }
  assert.ok(songCount > 30);
});

test('PowerPoints publication retains official English PDFs, puzzles and weekly companion bindings', async () => {
  const result = await buildPowerpoints('content', 'public');
  const lessons = result.published.filter(item => item.value.readings);
  const supplements = await buildSupplements('content');
  assert.equal(lessons.length, 13);
  for (const document of lessons) {
    const { lesson, readings, pdfs } = document.value;
    assert.equal(readings.length, 7);
    assert.equal(pdfs.length, 2);
    if (lesson.id !== 'lesson-03') assert.ok(readings[0].content.includes(`../../assets/puzzle-${lesson.id.slice(-2)}.png`), lesson.id);
    else assert.ok(readings[0].content.includes('THGELORDOISDISTRUSTLWORTHYOANDVFAITEHFUL'));
  }
  const teacher = await readFile('content/id/powerpoints-supplements/2026-q4/lesson-09/teacher-guide/content.md', 'utf8');
  assert.match(teacher, /“To God Be the Glory” \(Bagi Allah Segala Kemuliaan\) \(\*The SDA Hymnal\*, No\. 341\)/);
  assert.doesNotMatch(teacher, /He Is Our Song\*, No\. 341/);
  assert.ok(supplements.catalog.collections.some(collection => collection.id === 'powerpoints-supplements:id:2026-q4'));
});
