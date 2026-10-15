import {readFile,readdir} from 'node:fs/promises';
import path from 'node:path';

const keys=['sabbath','sunday','monday','tuesday','wednesday','thursday','friday'];
const assert=(value,message)=>{if(!value) throw new Error(message);};
const json=async file=>JSON.parse(await readFile(file,'utf8'));
const addDays=(date,days)=>new Date(Date.parse(date+'T00:00:00Z')+days*86400000).toISOString().slice(0,10);

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
    const lessons=[];
    for(const [number,entry] of edition.lessons.entries()) {
      const lessonId=`lesson-${String(number+1).padStart(2,'0')}`;
      assert(entry.id===lessonId,'Real-Time Faith lessons must be ordered and numbered 01–13');
      const lessonDir=path.join(dir,entry.id),lesson=await json(path.join(lessonDir,'lesson.json'));
      assert(lesson.id===entry.id && lesson.readings.map(item=>item.key).join()===keys.join(),'Real-Time Faith needs seven ordered readings');
      assert(new Date(lesson.startDate+'T00:00:00Z').getUTCDay()===6,'Real-Time Faith study week must start Saturday');
      assert(lesson.endDate===addDays(lesson.startDate,6) && lesson.discussionDate===addDays(lesson.startDate,7),'Invalid Real-Time Faith calendar');
      assert(lesson.startDate===addDays(edition.startDate,number*7) && lesson.startDate===entry.startDate && lesson.endDate===entry.endDate,'Real-Time Faith lesson/index calendar mismatch');
      const readings=[];
      for(const [index,reading] of lesson.readings.entries()) {
        assert(reading.date===addDays(lesson.startDate,index) && reading.file===`${keys[index]}.md`,'Invalid Real-Time Faith daily calendar/file');
        const content=(await readFile(path.join(lessonDir,reading.file),'utf8')).trim();
        assert(content && !content.includes('\uFFFD'),'Empty or damaged Real-Time Faith reading');
        readings.push({...reading,id:`realtime-faith:id:${edition.id}:${entry.id}:${reading.key}`,format:'text/markdown',content});
      }
      const pdfs=lesson.pdfs??[];
      assert(pdfs.length===1 && pdfs[0].id==='student-id' && pdfs[0].src===`../../assets/${entry.id}.pdf`,'Each Real-Time Faith lesson needs its translated student PDF');
      await readFile(path.join(dir,'assets',`${entry.id}.pdf`));
      const url=`editions/${edition.id}/lessons/${entry.id}/index.json`;
      lessons.push({...entry,url});
      published.push({path:url,value:{schemaVersion:'sabatku-lessons-v1',editionId:edition.id,programId:'realtime-faith',locale:'id',lesson:{...entry},readings,pdfs,supplementaryReadings:[]}});
    }
    assert(edition.endDate===lessons.at(-1).endDate,'Invalid Real-Time Faith edition dates');
    const value={...edition,schemaVersion:'sabatku-lessons-v1',lessons};
    published.push({path:`editions/${edition.id}/index.json`,value});
    editions.push({...value,url:`editions/${edition.id}/index.json`});
    assetDirectories.push({source:path.join(dir,'assets'),destination:path.join(outputRoot,'editions',edition.id,'assets')});
  }
  return {editions,published,assetDirectories};
}
