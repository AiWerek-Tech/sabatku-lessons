import {readFile,readdir} from 'node:fs/promises';
import path from 'node:path';

const keys=['sabbath','sunday','monday','tuesday','wednesday','thursday','friday'];
const assert=(value,message)=>{if(!value) throw new Error(message);};
const json=async file=>JSON.parse(await readFile(file,'utf8'));
const addDays=(date,days)=>new Date(Date.parse(date+'T00:00:00Z')+days*86400000).toISOString().slice(0,10);

/** Publish Junior PowerPoints through the same seven-day reader contract. */
export async function buildPowerpoints(sourceRoot,outputRoot) {
  const editions=[],published=[],assetDirectories=[];
  let folders=[];
  const root=path.join(sourceRoot,'id','powerpoints');
  try {folders=await readdir(root,{withFileTypes:true});} catch(error) {if(error.code!=='ENOENT') throw error;}
  for(const folder of folders.filter(item=>item.isDirectory())) {
    const dir=path.join(root,folder.name),edition=await json(path.join(dir,'edition.json'));
    if(edition.publicationStatus!=='published') continue;
    assert(edition.id===folder.name && /^\d{4}-q[1-4]-pp$/.test(edition.id) && edition.programId==='powerpoints' && edition.locale==='id','Invalid PowerPoints identity');
    assert(edition.lessons.length===13 && edition.attribution && edition.rightsStatement,'Incomplete PowerPoints edition');
    assert(edition.theme==='Kasih Karunia Allah Memulihkan Kita' && edition.title.includes(edition.theme),'PowerPoints quarter theme must appear in edition title and metadata');
    const lessons=[];
    for(const [number,entry] of edition.lessons.entries()) {
      assert(entry.id===`lesson-${String(number+1).padStart(2,'0')}`,'Invalid PowerPoints lesson sequence');
      const lessonDir=path.join(dir,entry.id),lesson=await json(path.join(lessonDir,'lesson.json'));
      assert(lesson.id===entry.id && lesson.readings.map(item=>item.key).join()===keys.join(),'PowerPoints needs seven ordered days');
      const expectedCover=`lesson-cover-${String(number+1).padStart(2,'0')}.jpg`;
      assert(lesson.illustration===`../../assets/${expectedCover}` && lesson.illustrationStatus==='available','PowerPoints lesson cover metadata is missing or mismatched');
      await readFile(path.join(dir,'assets',expectedCover));
      assert(typeof entry.teacherGuideAvailable==='boolean' && lesson.teacherGuideAvailable===entry.teacherGuideAvailable,'PowerPoints guide availability mismatch');
      assert(new Date(lesson.startDate+'T00:00:00Z').getUTCDay()===6,'PowerPoints week must start Saturday');
      assert(lesson.endDate===addDays(lesson.startDate,6) && lesson.discussionDate===addDays(lesson.startDate,7),'Invalid PowerPoints calendar');
      assert(lesson.startDate===addDays(edition.startDate,number*7) && lesson.startDate===entry.startDate && lesson.endDate===entry.endDate,'PowerPoints index/calendar mismatch');
      const readings=[];
      for(const [index,reading] of lesson.readings.entries()) {
        assert(reading.date===addDays(lesson.startDate,index) && reading.file===`${keys[index]}.md`,'Invalid PowerPoints daily calendar/file');
        const content=(await readFile(path.join(lessonDir,reading.file),'utf8')).trim();
        assert(content && !content.includes('PERLU DITINJAU'),'Empty or editorial-only PowerPoints reading');
        if(reading.key==='sabbath') assert(content.startsWith(`![lesson-cover](../../assets/${expectedCover})`),`${entry.id}: Sabbath reading must begin with its numbered lesson cover`);
        for(const match of content.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)) {
          assert(/^\.\.\/\.\.\/assets\/[\w.-]+$/.test(match[1]),'Unsafe PowerPoints image path');
          await readFile(path.join(dir,'assets',path.basename(match[1])));
        }
        readings.push({...reading,id:`powerpoints:id:${edition.id}:${entry.id}:${reading.key}`,format:'text/markdown',content});
      }
      for(const heading of ['Ayat Hafalan','Pesan Utama','Referensi Utama','Kisah Alkitab']) assert(readings[0].content.includes(`## ${heading}`),`${entry.id}: missing ${heading}`);
      const pdfs=lesson.pdfs??[];
      const [year,quarter]=edition.id.split('-');
      const officialBase=`https://www.juniorpowerpoints.org/assets/juniors/Lessons/${year}/${quarter.toUpperCase()}/English`;
      const basename=`PP-${year.slice(-2)}-${quarter.toUpperCase()}-L${String(number+1).padStart(2,'0')}`;
      for(const pdf of pdfs) {
        assert(['english-student','english-teacher'].includes(pdf.id),'Unknown PowerPoints PDF role');
        const teacher=pdf.id==='english-teacher';
        assert(pdf.src===`${officialBase}/${teacher?'Teacher':'Student'}/${basename}${teacher?'-T':''}.pdf`,'Official PowerPoints PDF must match this quarter and lesson');
      }
      assert(pdfs.length===new Set(pdfs.map(pdf=>pdf.id)).size,'Duplicate PowerPoints PDF role');
      const url=`editions/${edition.id}/lessons/${entry.id}/index.json`;
      lessons.push({...entry,url});
      published.push({path:url,value:{schemaVersion:'sabatku-lessons-v1',editionId:edition.id,programId:'powerpoints',locale:'id',lesson:{...entry,illustration:lesson.illustration,illustrationStatus:lesson.illustrationStatus},readings,pdfs,supplementaryReadings:[]}});
    }
    assert(edition.endDate===lessons.at(-1).endDate,'Invalid PowerPoints edition end date');
    const value={...edition,schemaVersion:'sabatku-lessons-v1',lessons};
    published.push({path:`editions/${edition.id}/index.json`,value});
    editions.push({...value,url:`editions/${edition.id}/index.json`});
    assetDirectories.push({source:path.join(dir,'assets'),destination:path.join(outputRoot,'editions',edition.id,'assets')});
  }
  return {editions,published,assetDirectories};
}
