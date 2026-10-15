import test from 'node:test';
import assert from 'node:assert/strict';
import {cp,mkdtemp,mkdir,readFile,writeFile,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildRealtimeFaith} from '../scripts/build-realtime-faith.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const editionRoot=path.join(root,'content/id/realtime-faith/2026-q4-rt');
const readJson=async file=>JSON.parse(await readFile(file,'utf8'));
const hash=value=>createHash('sha256').update(value).digest('hex');

test('Real-Time Faith publishes all reviewed readings, worksheets and original PDFs',async()=>{
  const result=await buildRealtimeFaith(path.join(root,'content'),path.join(root,'public'));
  const lessons=result.published.filter(item=>item.value.readings).map(item=>item.value);
  assert.equal(lessons.length,13);
  assert.equal(lessons.flatMap(lesson=>lesson.readings).length,91);
  const visualLinks=lessons.flatMap(lesson=>lesson.readings).flatMap(reading=>[...reading.content.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)]);
  assert.equal(visualLinks.length,16);
  for(const lesson of lessons) {
    assert.equal(lesson.pdfs.length,1);
    const pdf=await readFile(path.join(editionRoot,'assets',`${lesson.lesson.id}.pdf`));
    assert.equal(pdf.subarray(0,5).toString(),'%PDF-');
  }
  const get=(number,key)=>lessons[number-1].readings.find(reading=>reading.key===key).content;
  assert.match(get(4,'monday'),/Bacalah Kisah Para Rasul 1:9-11/);
  assert.doesNotMatch(get(4,'monday'),/Left Behind/);
  assert.equal([...get(4,'wednesday').matchAll(/^\d\. /gm)].length,12); // Eight choices plus four reflections.
  assert.equal([...get(4,'wednesday').matchAll(/^- [ABC]\. /gm)].length,24);
  assert.equal([...get(11,'wednesday').matchAll(/^- [A-G]\. /gm)].length,7);
  assert.match(get(5,'wednesday'),/1 Tesalonika 1:4–7/);
  assert.doesNotMatch(get(10,'wednesday'),/We all|Yahobus/);
  assert.match(get(9,'friday'),/Rencana Keuangan Sarah/);
  assert.equal([...get(9,'friday').matchAll(/: (\d+)%/g)].reduce((sum,match)=>sum+Number(match[1]),0),100);
  assert.equal([...get(13,'friday').matchAll(/^- \d{2}\.00–\d{2}\.00:/gm)].length,45);
  assert.equal([...get(12,'friday').matchAll(/^### Mentor yang Potensial [12]$/gm)].length,2);
});

async function fixture(t) {
  const directory=await mkdtemp(path.join(tmpdir(),'sabatku-rtf-review-'));
  t.after(()=>rm(directory,{recursive:true,force:true}));
  const edition=path.join(directory,'id/realtime-faith/2026-q4-rt');
  await mkdir(path.dirname(edition),{recursive:true});
  await cp(editionRoot,edition,{recursive:true,filter:file=>!file.endsWith('.pdf')});
  // This builder only checks attachment existence. Keep fixtures small; the
  // positive test above uses the actual publisher PDFs.
  for(let number=1;number<=13;number++) await writeFile(path.join(edition,'assets',`lesson-${String(number).padStart(2,'0')}.pdf`),'%PDF-fixture');
  return {directory,edition,build:()=>buildRealtimeFaith(directory,path.join(directory,'public'))};
}

async function updateReviewedText(edition,file,text) {
  await writeFile(path.join(edition,file),text);
  const review=await readJson(path.join(edition,'source-review.json'));
  review.readings.find(item=>item.file===file).sha256=hash(text.replace(/\r\n/g,'\n'));
  await writeFile(path.join(edition,'source-review.json'),JSON.stringify(review));
}

test('publication rejects an unreviewed edit',async t=>{
  const f=await fixture(t);
  await writeFile(path.join(f.edition,'lesson-01/sunday.md'),'## Merespons\n\nChanged without source review.\n');
  await assert.rejects(f.build,/source review is missing or stale/);
});

test('review checksums accept Windows line endings without changing the reviewed text',async t=>{
  const f=await fixture(t);
  const file=path.join(f.edition,'lesson-04/monday.md');
  const text=await readFile(file,'utf8');
  await writeFile(file,text.replace(/\r?\n/g,'\r\n'));
  const result=await f.build();
  assert.equal(result.editions.length,1);
});

test('publication rejects swapped weekdays even if checksums were updated',async t=>{
  const f=await fixture(t);
  const sunday=await readFile(path.join(f.edition,'lesson-04/sunday.md'),'utf8');
  await updateReviewedText(f.edition,'lesson-04/monday.md',sunday);
  await assert.rejects(f.build,/wrong daily heading/);
});

test('publication rejects duplicated content behind a correct weekday heading',async t=>{
  const f=await fixture(t);
  const sunday=await readFile(path.join(f.edition,'lesson-04/sunday.md'),'utf8');
  await updateReviewedText(f.edition,'lesson-04/monday.md',sunday.replace('## Merespons','## Jawaban Alkitab'));
  await assert.rejects(f.build,/duplicated daily content/);
});

test('publication rejects a damaged puzzle image',async t=>{
  const f=await fixture(t);
  await writeFile(path.join(f.edition,'assets/activity-06-monday.png'),'broken image');
  await assert.rejects(f.build,/Missing or altered.*worksheet/);
});
