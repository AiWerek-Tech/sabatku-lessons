import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildPowerpoints} from '../scripts/build-powerpoints.mjs';
import {buildSupplements} from '../scripts/build-supplements.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
test('PowerPoints publishes 91 dated readings and official English PDFs without importing them',async()=>{
  const result=await buildPowerpoints(path.join(root,'content'),path.join(root,'public'));
  assert.equal(result.editions.length,1);
  const lessons=result.published.filter(item=>item.value.readings);
  assert.equal(lessons.length,13);
  assert.equal(lessons.flatMap(item=>item.value.readings).length,91);
  for(const lesson of lessons) {
    assert.equal(lesson.value.readings[0].key,'sabbath');
    assert.equal(lesson.value.readings.at(-1).key,'friday');
    assert.equal(lesson.value.pdfs.length,2);
    assert.ok(lesson.value.pdfs.every(pdf=>pdf.src.startsWith('https://www.juniorpowerpoints.org/')));
    assert.ok(lesson.value.readings.every(reading=>!reading.content.includes('PERLU DITINJAU')));
  }
  assert.equal(lessons[0].value.lesson.startDate,'2026-09-26');
  assert.equal(lessons[0].value.lesson.discussionDate,'2026-10-03');
  const supplements=await buildSupplements(path.join(root,'content'));
  const collection=supplements.catalog.collections.find(item=>item.id==='powerpoints-supplements:id:2026-q4');
  assert.ok(collection);
  const index=supplements.documents.find(item=>item.path===collection.url).value;
  assert.equal(index.lessons.length,13);
  assert.ok(index.lessons.some(item=>item.lessonId==='lesson-03'));
  assert.equal(collection.editionBindings[0].programId,'powerpoints');
});
