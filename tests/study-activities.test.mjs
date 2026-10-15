import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {validateStudyActivity,publishInteractiveReading} from '../scripts/study-activities.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../content/id/realtime-faith/2026-q4-rt');
const docs=await Promise.all(Array.from({length:13},(_,n)=>readFile(path.join(root,`lesson-${String(n+1).padStart(2,'0')}`,'interactions.json'),'utf8').then(JSON.parse)));
const activities=docs.flatMap(doc=>Object.values(doc.days).flatMap(day=>day.blocks.filter(b=>b.activity).map(b=>b.activity)));
test('all 93 activities and all ten games are solvable with complete stable keys',()=>{
  assert.equal(activities.length,93);
  assert.equal(new Set(activities.map(a=>a.id)).size,93);
  activities.forEach(validateStudyActivity);
  for(const [kind,count] of Object.entries({'word-search':5,cipher:2,maze:1,crossword:1,'drop-quote':1}))assert.equal(activities.filter(a=>a.kind===kind).length,count);
  assert.equal(docs[5].days.wednesday.blocks.find(b=>b.activity?.kind==='fill').activity.items.length,5);
  assert.equal(docs[12].days.friday.blocks.find(b=>b.activity?.kind==='journal').activity.items.filter(q=>q.group.startsWith('Hari ')).length,45);
});
test('an activity change changes the existing v1 content revision input',()=>{
  const source=structuredClone(docs[1].days.wednesday);
  const first=publishInteractiveReading(source);
  source.blocks.find(b=>b.activity).activity.title+=' diperbarui';
  const second=publishInteractiveReading(source);
  assert.notEqual(first.format,second.format);
  assert.equal(first.format,`text/markdown; interactive-sha256=${createHash('sha256').update(first.interactiveContent).digest('hex')}`);
});
test('invalid keys, duplicate identities and impossible puzzle paths cannot publish',()=>{
  const source=activities.find(a=>a.kind==='word-search');
  const broken=structuredClone(source);broken.items[0].path[0]=9999;
  assert.throws(()=>validateStudyActivity(broken),/Unsolvable/);
  const badId=structuredClone(source);badId.id='../../another-account';
  assert.throws(()=>validateStudyActivity(badId),/identity/);
  assert.throws(()=>publishInteractiveReading({version:1,blocks:[{activity:source},{activity:source}]}),/Duplicate/);
});
test('cipher hints and column letter pools are independently verified',()=>{
  const cipher=structuredClone(activities.find(a=>a.kind==='cipher'));cipher.givens.Q='A';
  assert.throws(()=>validateStudyActivity(cipher),/initial cipher hints/);
  const drop=structuredClone(activities.find(a=>a.kind==='drop-quote'));drop.pools[0]+='Z';
  assert.throws(()=>validateStudyActivity(drop),/wrong letters/);
});
