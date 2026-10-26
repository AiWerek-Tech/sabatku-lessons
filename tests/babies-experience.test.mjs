import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import path from 'node:path';

const root=path.resolve('content/id/alive-in-jesus/babies/2026-annual');
const json=async file=>JSON.parse(await readFile(file,'utf8'));
async function markdownFiles(dir) {
  const result=[];
  for(const entry of await readdir(dir,{withFileTypes:true})) {
    const file=path.join(dir,entry.name);
    if(entry.isDirectory()) result.push(...await markdownFiles(file));
    else if(file.endsWith('.md')) result.push(file);
  }
  return result;
}

test('Baby Steps keeps parent, teacher and Parent Time publications distinct and approved for publication',async()=>{
  const expected=[
    ['parent','parent-book','quarterly-repeat-program',35],
    ['teacher','teacher-guide','quarterly-repeat-program',17],
    ['parent-time','parent-time-handout','weekly-parent-discussion',13],
    ['parent-time-q2','parent-time-handout','weekly-parent-discussion',13],
    ['parent-time-q3','parent-time-handout','weekly-parent-discussion',13],
    ['parent-time-q4','parent-time-handout','weekly-parent-discussion',13],
  ];
  for(const [folder,role,structure,count] of expected) {
    const dir=path.join(root,folder),edition=await json(path.join(dir,'edition.json'));
    const review=await json(path.join(dir,'source-review.json'));
    assert.equal(edition.trackId,'babies');
    assert.equal(edition.bookRole,role);
    assert.equal(edition.structureType,structure);
    assert.equal(edition.publicationStatus,'published');
    assert.equal(review.status,'approved');
    assert.equal(review.publicationAuthorization.type,'explicit-project-owner-instruction');
    assert.equal(edition.lessons.length,count);
    if(!folder.startsWith('parent-time')) assert.equal(edition.lessons.filter(x=>/^lesson-0[1-4]$/.test(x.id)).length,4);
    assert.equal(await readFile(path.join(dir,'assets/cover.png')).then(b=>b.length>0),true);
  }
});

test('Babies uses four repeatable quarterly programs and thirteen separate Parent Time sessions per quarter',async()=>{
  for(const role of ['parent','teacher']) {
    const edition=await json(path.join(root,role,'edition.json'));
    for(let i=1;i<=4;i++) {
      const unit=`lesson-${String(i).padStart(2,'0')}`;
      assert.ok(edition.lessons.some(x=>x.id===unit),`${role} is missing program ${i}`);
      const lesson=await json(path.join(root,role,unit,'lesson.json'));
      assert.equal(lesson.readings[0].key,'program');
    }
  }
  const handoutFolders=[
    ['parent-time','2025-01-xaijbbpthone'],
    ['parent-time-q2','2025-02-xaijbbpth2one'],
    ['parent-time-q3','2025-03-xaijbbpth3one'],
    ['parent-time-q4','2025-04-xaijbbpth4one'],
  ];
  for(const [folder,englishEditionId] of handoutFolders) {
    const handout=await json(path.join(root,folder,'edition.json'));
    assert.deepEqual(handout.lessons.map(x=>x.id),Array.from({length:13},(_,i)=>`lesson-${String(i+1).padStart(2,'0')}`));
    assert.equal(handout.englishEditionId,englishEditionId);
  }
});

test('reader content is cleaned up and song labels retain English titles with Indonesian subtitles',async()=>{
  const songTranslations=await json(path.resolve('scripts/babies-song-titles.json'));
  let audioLinkCount=0;
  for(const role of ['parent','teacher','parent-time','parent-time-q2','parent-time-q3','parent-time-q4']) {
    const files=await markdownFiles(path.join(root,role));
    for(const file of files) {
      const markdown=await readFile(file,'utf8');
      assert.doesNotMatch(markdown,/^---$|^\s*\{"style"|^\s*!a\[/m,file);
      for(const match of markdown.matchAll(/\[♫ ([^\]]+)\]\((https?:[^)]+)\)/g)) {
        audioLinkCount++;
        const label=/^(.*?) \((.+)\)$/.exec(match[1]);
        assert.ok(label,`Song link must show English title and Indonesian subtitle in ${file}: ${match[1]}`);
        assert.equal(songTranslations[label[1]],label[2],`Song subtitle must match the approved title map in ${file}: ${match[1]}`);
      }
    }
  }
  assert.ok(audioLinkCount>0,'Baby Steps audio links should be present');
  const program=await readFile(path.join(root,'parent','lesson-04','program.md'),'utf8');
  assert.match(program,/### Clip-Clop \(\*Klik-Klop\*\)/);
  assert.match(program,/\[♫ Clip-Clop \(Klik-Klop\)\]\(https:\/\/sabbath-school-resources-assets\.adventech\.io\//);
});

test('Baby Jesus references and Ellen White citations are normalized',async()=>{
  const babyJesus=await readFile(path.join(root,'parent','lesson-04','program.md'),'utf8');
  assert.match(babyJesus,/Lukas 2:1–20/);
  assert.match(babyJesus,/Mazmur 18:2/);
  assert.doesNotMatch(babyJesus,/Lukas 19:1–10|Lukas 19:1-10/);
  const parentTime=await readFile(path.join(root,'parent-time','lesson-01','discussion.md'),'utf8');
  assert.match(parentTime,/Ellen G\. White, _Child Guidance_, hlm\. 476\)\./);
  assert.doesNotMatch(parentTime,/hlm\. 476\.\./);
});
