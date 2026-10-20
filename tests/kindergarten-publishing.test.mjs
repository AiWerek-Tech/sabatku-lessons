import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAliveInJesus } from '../scripts/build-alive-in-jesus.mjs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

test('Approved Kindergarten publishes student daily readings and teacher program sections', async () => {
  const out = await mkdtemp(path.join(tmpdir(), 'sabatku-kindergarten-'));
  try {
    const published = await buildAliveInJesus('content', out);
    const program = published.editions.find(program => program.id === 'alive-in-jesus-kd-pb');
    assert.equal(program.editions.length, 2);
    const student = program.editions.find(edition => edition.bookRole === 'student-guide');
    const teacher = program.editions.find(edition => edition.bookRole === 'teacher-guide');
    assert.deepEqual(student.dayOrder, ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'sabbath']);
    assert.equal(teacher.dayOrder, null);
    const documents = role => published.published.filter(item => item.value.editionId === `2026-q4-aij-kindergarten-${role}`);
    assert.equal(documents('student').flatMap(item => item.value.readings).length, 95);
    assert.equal(documents('teacher').flatMap(item => item.value.readings).length, 114);
    assert.equal(documents('teacher').find(item => item.value.lesson.id === 'lesson-05').value.readings.length, 9);
    for (const role of ['student', 'teacher']) for (const document of documents(role)) {
      for (const reading of document.value.readings) {
        assert.doesNotMatch(reading.content, /!a\[|\^\[|\{"(?:style|credits)"/);
        assert.doesNotMatch(reading.content, /Bagan Penawaran|Gambaran Umum Kuartal 3/);
        assert.doesNotMatch(reading.content, /catatan penerjemah|catatan editor|TODO|FIXME/i);
      }
    }
    assert.match(documents('student')[0].value.readings[0].content, /### Pendongeng Terbaik/);
    const familyMusic=documents('student').flatMap(item=>item.value.readings).find(reading=>reading.id?.includes('music-and-podcasts') || reading.title?.match(/lagu|musik/i));
    assert.ok(familyMusic, 'student family resources include a music and podcast reading');
    assert.match(familyMusic.content, /Podcast Pekan/);
    assert.equal(published.published.filter(item => item.path.endsWith('.pdf')).length, 0);
  } finally { await rm(out, { recursive: true, force: true }); }
});
