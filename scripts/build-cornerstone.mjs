import {readFile,readdir} from 'node:fs/promises';
import path from 'node:path';

export async function buildCornerstone(sourceRoot,outputRoot) {
  const editions=[],published=[],assetDirectories=[];
  const programRoot=path.join(sourceRoot,'id','cornerstone');
  let folders=[];
  try {folders=await readdir(programRoot,{withFileTypes:true});} catch(e) {if(e.code!=='ENOENT') throw e;}
  const keys=['sabbath','sunday','monday','tuesday','wednesday','thursday','friday'];
  const json=async p=>JSON.parse(await readFile(p,'utf8'));
  const assert=(ok,msg)=>{if(!ok) throw new Error(msg);};
  for(const folder of folders.filter(f=>f.isDirectory())) {
    const dir=path.join(programRoot,folder.name),edition=await json(path.join(dir,'edition.json'));
    assert(edition.id===folder.name && /^\d{4}-q[1-4]-cc$/.test(edition.id),'Invalid Cornerstone edition ID');
    assert(edition.programId==='cornerstone' && edition.locale==='id','Invalid Cornerstone program/locale');
    if(edition.publicationStatus!=='published') continue;
    assert(edition.attribution && edition.rightsStatement && edition.lessons.length===13,'Incomplete Cornerstone edition');
    const lessons=[];
    for(const entry of edition.lessons) {
      assert(/^lesson-\d{2}$/.test(entry.id),'Invalid Cornerstone lesson ID');
      const lesson=await json(path.join(dir,entry.id,'lesson.json'));
      assert(lesson.id===entry.id && lesson.readings.map(r=>r.key).join()===keys.join(),'Invalid Cornerstone daily order');
      assert(new Date(lesson.startDate+'T00:00:00Z').getUTCDay()===6,'Cornerstone study week must start Saturday');
      const readings=[];
      for(const [i,reading] of lesson.readings.entries()) {
        const date=new Date(Date.parse(lesson.startDate+'T00:00:00Z')+i*86400000).toISOString().slice(0,10);
        assert(reading.date===date && reading.file===keys[i]+'.md','Invalid Cornerstone reading calendar/file');
        const content=(await readFile(path.join(dir,entry.id,reading.file),'utf8')).trim();
        assert(content.length>0 && !content.startsWith('---'),'Empty reading or unstripped frontmatter');
        for(const match of content.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)) {
          assert(/^\.\.\/\.\.\/assets\/[a-zA-Z0-9._-]+$/.test(match[1]),'Invalid Cornerstone image path');
          await readFile(path.join(dir,'assets',path.basename(match[1])));
        }
        readings.push({...reading,id:`cornerstone:id:${edition.id}:${lesson.id}:${reading.key}`,format:'text/markdown',content});
      }
      assert(lesson.endDate===readings[6].date && lesson.discussionDate===new Date(Date.parse(lesson.startDate+'T00:00:00Z')+7*86400000).toISOString().slice(0,10),'Invalid discussion date');
      const pdfs=[];
      for(const pdf of lesson.pdfs??[]) {
        assert(/^[a-zA-Z0-9_-]+$/.test(pdf.id) && /^\.\.\/\.\.\/assets\/[a-zA-Z0-9._-]+\.pdf$/.test(pdf.file),'Invalid Cornerstone PDF');
        await readFile(path.join(dir,'assets',path.basename(pdf.file)));
        pdfs.push({id:pdf.id,title:pdf.title,src:pdf.file});
      }
      const url=`editions/${edition.id}/lessons/${lesson.id}/index.json`;
      assert(lesson.startDate===entry.startDate && lesson.endDate===entry.endDate && lesson.discussionDate===entry.discussionDate,'Cornerstone lesson/index mismatch');
      if(lessons.length) assert(lesson.startDate===new Date(Date.parse(lessons.at(-1).startDate+'T00:00:00Z')+7*86400000).toISOString().slice(0,10),'Gap in Cornerstone weekly calendar');
      lessons.push({...entry,url});
      published.push({path:url,value:{schemaVersion:'sabatku-lessons-v1',editionId:edition.id,programId:'cornerstone',locale:'id',lesson:{id:lesson.id,title:lesson.title,startDate:lesson.startDate,endDate:lesson.endDate,discussionDate:lesson.discussionDate},readings,pdfs,supplementaryReadings:[],relatedResources:lesson.relatedResources??[],sectionLabels:edition.sectionLabels}});
    }
    assert(edition.startDate===lessons[0].startDate && edition.endDate===lessons.at(-1).endDate,'Invalid Cornerstone edition dates');
    const introduction={format:'text/markdown',content:await readFile(path.join(dir,edition.introductionFile),'utf8')};
    const value={...edition,schemaVersion:'sabatku-lessons-v1',introduction,lessons};
    published.push({path:`editions/${edition.id}/index.json`,value});
    editions.push({...value,url:`editions/${edition.id}/index.json`});
    assetDirectories.push({source:path.join(dir,'assets'),destination:path.join(outputRoot,'editions',edition.id,'assets')});
  }
  return {editions,published,assetDirectories};
}
