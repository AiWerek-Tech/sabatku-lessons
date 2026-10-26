import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {revisePublicationText} from '../scripts/revise-babies-publication.mjs';

const root='content/id/alive-in-jesus/babies/2026-annual';
test('Baby Steps editorial revisions can be reapplied without duplicating headings or prayers',async()=>{
  const audit=JSON.parse(await readFile('docs/audits/babies-publication-review.json','utf8'));
  for(const edition of audit.editions)for(const file of Object.keys(edition.translationFiles)){
    const relative=`${edition.folder}/${file}`;
    const text=await readFile(`${root}/${relative}`,'utf8');
    assert.equal(revisePublicationText(text,relative),text,relative);
  }
});
test('Parent Time challenges and verse quotations belong to the correct source session',async()=>{
  const q2=await readFile(`${root}/parent-time-q2/lesson-01/discussion.md`,'utf8');
  assert.match(q2,/penawar bagi keadaan kita yang suam-suam kuku/);
  assert.doesNotMatch(q2,/Dengarkan pasal pertama|tidak perlu menjadi teolog/);
  const q3=await readFile(`${root}/parent-time-q3/lesson-04/discussion.md`,'utf8');
  assert.match(q3,/Filipi 1:9, 10/);
  assert.match(q3,/membedakan apa yang terbaik/);
  const knowing=await readFile(`${root}/parent-time/lesson-03/discussion.md`,'utf8');
  assert.match(knowing,/hanya mengetahui tentang Tuhan/);
  assert.match(knowing,/mengenal Tuhan secara pribadi/);
});
test('Classroom objects and activities are translated by context and hazardous contact is prevented',async()=>{
  const materials=await readFile(`${root}/teacher/unit-resource-r612bc12bd06d/reading.md`,'utf8');
  assert.match(materials,/Kipas angin/);
  assert.match(materials,/Matahari dari kain flanel/);
  assert.doesNotMatch(materials,/Penggemar|Terasa seperti|lahir lebih awal/);
  const obedience=await readFile(`${root}/parent/unit-resource-r7e2b6aa34dad/reading.md`,'utf8');
  assert.match(obedience,/cegah tangannya menyentuh benda panas/);
  assert.doesNotMatch(obedience,/membiarkannya merasakan panasnya/);
});
