import {readFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {publishInteractiveReading} from './study-activities.mjs';

const keys=['sabbath','sunday','monday','tuesday','wednesday','thursday','friday'];
const assert=(value,message)=>{if(!value) throw new Error(message);};
const json=async file=>JSON.parse(await readFile(file,'utf8'));
const addDays=(date,days)=>new Date(Date.parse(date+'T00:00:00Z')+days*86400000).toISOString().slice(0,10);
const sha256=value=>createHash('sha256').update(value).digest('hex');
const headings=['Untuk Dipelajari','Merespons','Jawaban Alkitab','Merenungkan','Konsep Alkitab','Menghubungkan','Menerapkan'];

/** Publish the translated Real-Time Faith workbook as seven daily readings with a weekly PDF attachment. */
export async function buildRealtimeFaith(sourceRoot,outputRoot) {
  const editions=[],published=[],assetDirectories=[];
  let folders=[];
  const root=path.join(sourceRoot,'id','realtime-faith');
  try {folders=await readdir(root,{withFileTypes:true});} catch(error) {if(error.code!=='ENOENT') throw error;}
  for(const folder of folders.filter(item=>item.isDirectory())) {
    const dir=path.join(root,folder.name),edition=await json(path.join(dir,'edition.json'));
    if(edition.publicationStatus!=='published') continue;
    assert(edition.id===folder.name && /^\d{4}-q[1-4]-rt$/.test(edition.id) && edition.programId==='realtime-faith' && edition.locale==='id','Invalid Real-Time Faith identity');
    assert(edition.lessons.length===13 && edition.attribution && edition.rightsStatement,'Incomplete Real-Time Faith edition');
    assert(edition.cover===`editions/${edition.id}/assets/cover.jpg`,'Real-Time Faith quarter cover metadata is missing or mismatched');
    const quarterCover=await readFile(path.join(dir,'assets','cover.jpg'));
    assert(quarterCover[0]===0xff && quarterCover[1]===0xd8 && quarterCover[2]===0xff,'Real-Time Faith quarter cover must be a JPEG');
    const review=await json(path.join(dir,'source-review.json'));
    assert(review.schemaVersion==='realtime-faith-source-review-v1' && review.status==='source-checked' && review.source?.pageCount===26 && /^[a-f0-9]{64}$/.test(review.source?.sha256),'Real-Time Faith source review is missing or incomplete');
    assert(Array.isArray(review.readings) && review.readings.length===91 && new Set(review.readings.map(item=>item.file)).size===91,'Real-Time Faith source review must cover 91 unique readings');
    assert(Array.isArray(review.visualActivities) && review.visualActivities.length===16 && new Set(review.visualActivities.map(item=>item.file)).size===16,'Real-Time Faith source worksheets are incomplete');
    const reviewedReadings=new Map(review.readings.map(item=>[item.file,item]));
    const visualFiles=new Set();
    for(const visual of review.visualActivities) {
      assert(/^lesson-\d{2}$/.test(visual.lessonId) && keys.includes(visual.day) && visual.file===`activity-${visual.lessonId.slice(-2)}-${visual.day}.png`,'Invalid Real-Time Faith source worksheet identity');
      const sourcePage=(Number(visual.lessonId.slice(-2))-1)*2+(keys.indexOf(visual.day)<3?1:2);
      assert(visual.sourcePage===sourcePage,'Real-Time Faith worksheet is assigned to the wrong source page');
      const bytes=await readFile(path.join(dir,'assets',visual.file));
      assert(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])) && sha256(bytes)===visual.sha256,`Missing or altered Real-Time Faith worksheet: ${visual.file}`);
    }
    const lessons=[];
    for(const [number,entry] of edition.lessons.entries()) {
      const lessonId=`lesson-${String(number+1).padStart(2,'0')}`;
      assert(entry.id===lessonId,'Real-Time Faith lessons must be ordered and numbered 01–13');
      const lessonDir=path.join(dir,entry.id),lesson=await json(path.join(lessonDir,'lesson.json'));
      const interactions=await json(path.join(lessonDir,'interactions.json'));
      assert(interactions.schemaVersion==='sabatku-study-activities-v1' && keys.every(key=>interactions.days[key]),`${lessonId}: missing daily interactions`);
      assert(lesson.id===entry.id && lesson.readings.map(item=>item.key).join()===keys.join(),'Real-Time Faith needs seven ordered readings');
      const lessonCover=`lesson-cover-${String(number+1).padStart(2,'0')}.jpg`;
      const lessonCoverReference=`../../assets/${lessonCover}`;
      assert(lesson.illustration===lessonCoverReference && lesson.illustrationStatus==='available',`${lessonId}: lesson cover metadata is missing or mismatched`);
      const lessonCoverBytes=await readFile(path.join(dir,'assets',lessonCover));
      assert(lessonCoverBytes[0]===0xff && lessonCoverBytes[1]===0xd8 && lessonCoverBytes[2]===0xff,`${lessonId}: lesson cover must be a JPEG`);
      assert(interactions.days.sabbath.blocks[0]?.markdown===`![lesson-cover](${lessonCoverReference})`,`${lessonId}: Sabbath activity must begin with its numbered lesson cover`);
      assert(new Date(lesson.startDate+'T00:00:00Z').getUTCDay()===6,'Real-Time Faith study week must start Saturday');
      assert(lesson.endDate===addDays(lesson.startDate,6) && lesson.discussionDate===addDays(lesson.startDate,7),'Invalid Real-Time Faith calendar');
      assert(lesson.startDate===addDays(edition.startDate,number*7) && lesson.startDate===entry.startDate && lesson.endDate===entry.endDate,'Real-Time Faith lesson/index calendar mismatch');
      const readings=[];
      const dailyBodies=new Set();
      for(const [index,reading] of lesson.readings.entries()) {
        assert(reading.date===addDays(lesson.startDate,index) && reading.file===`${keys[index]}.md`,'Invalid Real-Time Faith daily calendar/file');
        const sourceText=await readFile(path.join(lessonDir,reading.file),'utf8');
        const content=sourceText.trim();
        assert(content && !content.includes('\uFFFD'),'Empty or damaged Real-Time Faith reading');
        const reviewEntry=reviewedReadings.get(`${lessonId}/${reading.file}`);
        assert(reviewEntry?.sourcePage===number*2+(index<3?1:2) && reviewEntry.sha256===sha256(sourceText.replace(/\r\n/g,'\n')),`${lessonId}/${reading.file}: source review is missing or stale`);
        const dayHeading=headings[index].toLowerCase();
        assert(index===0 ? content.startsWith('## Kisah Pekan Ini') && content.includes('## Untuk Dipelajari') : content.toLowerCase().startsWith(`## ${dayHeading}`),`${lessonId}/${reading.file}: wrong daily heading`);
        assert(!/^(?:Sabat|Minggu|Senin|Selasa|Rabu|Kamis|Jumat)\s+(?:MERESPONS|MERENUNGKAN|MENERAPKAN|JAWABAN ALKITAB|KONSEP ALKITAB|MENGHUBUNGKAN)\b/im.test(content),`${lessonId}/${reading.file}: content from another weekday`);
        const body=content.replace(/^#{1,6}[^\n]*$/gm,'').replace(/\s+/g,' ').trim().toLowerCase();
        assert(!dailyBodies.has(body),`${lessonId}: duplicated daily content`);
        dailyBodies.add(body);
        for(const match of content.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)) {
          assert(/^\.\.\/\.\.\/assets\/activity-\d{2}-(?:sabbath|sunday|monday|tuesday|wednesday|thursday|friday)\.png$/.test(match[1]),'Unsafe Real-Time Faith worksheet path');
          const visual=review.visualActivities.find(item=>item.file===path.basename(match[1]));
          assert(visual?.lessonId===lessonId && visual.day===reading.key,`${lessonId}/${reading.file}: worksheet belongs to another lesson/day`);
          visualFiles.add(visual.file);
        }
        assert(interactions.sourceReadings?.[reading.key]===sha256(sourceText.replace(/\r\n/g,'\n')),`${lessonId}/${reading.file}: interactive reading needs review after source changes`);
        readings.push({...reading,id:`realtime-faith:id:${edition.id}:${entry.id}:${reading.key}`,format:'text/markdown',content,...publishInteractiveReading(interactions.days[reading.key])});
      }
      const pdfs=lesson.pdfs??[];
      assert(pdfs.length===1 && pdfs[0].id==='student-id' && pdfs[0].src===`../../assets/${entry.id}.pdf`,'Each Real-Time Faith lesson needs its translated student PDF');
      await readFile(path.join(dir,'assets',`${entry.id}.pdf`));
      const url=`editions/${edition.id}/lessons/${entry.id}/index.json`;
      lessons.push({...entry,url});
      published.push({path:url,value:{schemaVersion:'sabatku-lessons-v1',editionId:edition.id,programId:'realtime-faith',locale:'id',lesson:{...entry,illustration:lesson.illustration,illustrationStatus:lesson.illustrationStatus},readings,pdfs,supplementaryReadings:[]}});
    }
    assert(visualFiles.size===review.visualActivities.length,'Some reviewed Real-Time Faith worksheets are not linked from daily readings');
    assert(edition.endDate===lessons.at(-1).endDate,'Invalid Real-Time Faith edition dates');
    const value={...edition,schemaVersion:'sabatku-lessons-v1',lessons};
    published.push({path:`editions/${edition.id}/index.json`,value});
    editions.push({...value,url:`editions/${edition.id}/index.json`});
    assetDirectories.push({source:path.join(dir,'assets'),destination:path.join(outputRoot,'editions',edition.id,'assets')});
  }
  return {editions,published,assetDirectories};
}
