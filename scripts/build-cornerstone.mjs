import {readFile,readdir} from 'node:fs/promises';
import path from 'node:path';

const WEEKLY_ACTIVITY_LABELS=['Buat itu Nyata'];
const BIBLE_REFERENCE=/^(?:Bacalah\s+)?(?:(?:1|2|3)\s+)?[\p{L}][\p{L}\s.'’\-]*\s+\d+(?::\d+(?:\s*[–—-]\s*\d+(?::\d+)?)?(?:\s*[–—-]\s*\d+(?::\d+)?)?)?$/u;
const assert=(ok,msg)=>{if(!ok) throw new Error(msg);};

function markdownSections(markdown) {
  const sections=[];
  let current=null;
  for(const line of markdown.split(/\r?\n/)) {
    const match=line.match(/^\s{0,3}(#{1,6})\s+(.+?)\s*#*\s*$/);
    if(match) {
      current={label:match[2].trim().replace(/\s+/g,' '),level:match[1].length,body:[]};
      sections.push(current);
    } else if(current) current.body.push(line);
  }
  return sections.map(section=>({...section,body:section.body.join('\n').trim()}));
}

function plainMarkdown(value) {
  return value.replace(/!\[([^\]]*)\]\([^)]+\)/g,'$1').replace(/\[([^\]]+)\]\([^)]+\)/g,'$1').replace(/[>*_`#]/g,'').trim();
}

function validateCornerstoneActivity(body,context) {
  const activityText=plainMarkdown(body);
  const numberedItems=[...body.matchAll(/^\s*\d+[.)]\s+(.+)$/gm)];
  const checkboxItems=[...body.matchAll(/^\s*[-*+]\s+\[[ xX]\]\s+\S.*$/gm)];
  const blankLines=[...body.matchAll(/^\s*\d+[.)]\s+_{3,}\s*$/gm)];

  const declaresScale=/\bA\s*=\s*Setuju\b[\s\S]*\bNS\s*=\s*Belum yakin\b[\s\S]*\bD\s*=\s*Tidak setuju\b/i.test(activityText);
  if(declaresScale) {
    const markedItems=[...body.matchAll(/^\s*\d+[.)]\s+.+\bA\s*\/\s*NS\s*\/\s*D\b.*$/gm)];
    assert(numberedItems.length>0 && markedItems.length===numberedItems.length,`${context}: every A/NS/D statement must carry its source choices`);
  } else assert(!/\bA\s*\/\s*NS\s*\/\s*D\b/.test(body),`${context}: A/NS/D choices need an explicit source definition`);

  if(/\bPilihan\s+A\b/i.test(activityText) || /\bPilihan\s+B\b/i.test(activityText)) {
    assert(/\bPilihan\s+A\b/i.test(activityText) && /\bPilihan\s+B\b/i.test(activityText),`${context}: two-choice activity must include both source options`);
  }

  if(/\bCocokkan\b/i.test(activityText) && /Kolom\s+A/i.test(activityText) && /Kolom\s+B/i.test(activityText)) {
    const columns=activityText.split(/Kolom\s+B/i);
    const listCount=text=>[...text.matchAll(/^\s*(?:[-*+]\s+|\d+[.)]\s+)\S.+$/gm)].length;
    assert(columns.length===2 && listCount(columns[0])>=2 && listCount(columns[1])>=2,`${context}: matching activity needs at least two entries in each column`);
  }

  if(/\bUrutkan\b/i.test(activityText)) assert(checkboxItems.length>=2,`${context}: ranking activity needs at least two selectable items`);
  if(/skala\s+1\s+sampai\s+10/i.test(activityText)) assert(numberedItems.length>=3,`${context}: 1–10 rating activity needs numbered situations`);
  if(/tuliskan\s+lima\s+ayat/i.test(activityText)) assert(blankLines.length>=5,`${context}: verse-fill activity needs five answer lines`);
}

export async function buildCornerstone(sourceRoot,outputRoot) {
  const editions=[],published=[],assetDirectories=[];
  const programRoot=path.join(sourceRoot,'id','cornerstone');
  let folders=[];
  try {folders=await readdir(programRoot,{withFileTypes:true});} catch(e) {if(e.code!=='ENOENT') throw e;}
  const keys=['sabbath','sunday','monday','tuesday','wednesday','thursday','friday'];
  const expectedSectionLabels={
    'key-text':'Ayat Inti',
    flashlight:'Sekilas Cahaya',
    'what-do-you-think':'Apakah Pendapatmu?',
    'into-the-story':'Ke Dalam Cerita',
    'out-of-the-story':'Keluar Cerita',
    'punch-lines':'Bagian Pokok',
    'did-you-know':'Apakah kamu tahu?',
    'further-insight':'Wawasan Tambahan',
    'connecting-to-life':'Buat itu Nyata',
    'weekly-reading':'Bacaan Pekan Ini'
  };
  const json=async p=>JSON.parse(await readFile(p,'utf8'));
  for(const folder of folders.filter(f=>f.isDirectory())) {
    const dir=path.join(programRoot,folder.name),edition=await json(path.join(dir,'edition.json'));
    assert(edition.id===folder.name && /^\d{4}-q[1-4]-cc$/.test(edition.id),'Invalid Cornerstone edition ID');
    assert(edition.programId==='cornerstone' && edition.locale==='id','Invalid Cornerstone program/locale');
    if(edition.publicationStatus!=='published') continue;
    assert(edition.attribution && edition.rightsStatement && edition.lessons.length===13,'Incomplete Cornerstone edition');
    for(const [key,label] of Object.entries(expectedSectionLabels)) assert(edition.sectionLabels?.[key]===label,`Cornerstone section label mismatch: ${key} must be “${label}”`);
    assert(typeof edition.cover==='string' && edition.cover.startsWith(`editions/${edition.id}/assets/`),'Cornerstone quarter cover must point to its published assets folder');
    await readFile(path.join(dir,'assets',path.basename(edition.cover)));
    const lessons=[];
    for(const [lessonIndex,entry] of edition.lessons.entries()) {
      assert(entry.id===`lesson-${String(lessonIndex+1).padStart(2,'0')}`,'Cornerstone lessons must be ordered and numbered 01–13');
      const lessonDir=path.join(dir,entry.id);
      const lesson=await json(path.join(lessonDir,'lesson.json'));
      assert(lesson.id===entry.id && Array.isArray(lesson.readings) && lesson.readings.length===keys.length && lesson.readings.map(r=>r.key).join()===keys.join(),'Invalid Cornerstone daily order or reading count');
      const markdownFiles=(await readdir(lessonDir)).filter(name=>name.endsWith('.md')).sort();
      assert(markdownFiles.length===keys.length && markdownFiles.join()===keys.map(key=>`${key}.md`).sort().join(),`${entry.id}: unexpected, missing, or unreferenced Markdown reading`);
      assert(new Date(lesson.startDate+'T00:00:00Z').getUTCDay()===6,'Cornerstone study week must start Saturday');
      const readings=[];
      const weeklySectionCounts=new Map();
      for(const [i,reading] of lesson.readings.entries()) {
        const date=new Date(Date.parse(lesson.startDate+'T00:00:00Z')+i*86400000).toISOString().slice(0,10);
        assert(reading.date===date && reading.file===keys[i]+'.md','Invalid Cornerstone reading calendar/file');
        assert(Array.isArray(reading.readingRefs) && reading.readingRefs.length>0,`${entry.id}/${reading.key}: Bible references are required`);
        const seenReferences=new Set();
        for(const reference of reading.readingRefs) {
          assert(typeof reference==='string' && BIBLE_REFERENCE.test(reference.trim()),`${entry.id}/${reading.key}: malformed Bible reference “${reference}”`);
          const normalized=reference.trim().replace(/^Bacalah\s+/i,'').replace(/[–—]/g,'-').toLocaleLowerCase('id');
          assert(!seenReferences.has(normalized),`${entry.id}/${reading.key}: duplicate Bible reference “${reference}”`);
          seenReferences.add(normalized);
        }
        const content=(await readFile(path.join(lessonDir,reading.file),'utf8')).trim();
        assert(content.length>0 && !content.startsWith('---'),'Empty reading or unstripped frontmatter');
        assert(!/^\s*(?:[-*+]\s*|\d+[.)]\s*)$/m.test(content),`${entry.id}/${reading.key}: empty activity/list item`);
        const sections=markdownSections(content);
        assert(sections.length>0,`${entry.id}/${reading.key}: no recognizable lesson headings`);
        const allowedHeadings=new Set([...Object.values(expectedSectionLabels),'Bacaan Alkitab']);
        for(const section of sections) {
          assert(allowedHeadings.has(section.label),`${entry.id}/${reading.key}: non-standard section heading “${section.label}”`);
          const sectionText=plainMarkdown(section.body);
          assert(sectionText.length>0,`${entry.id}/${reading.key}: empty “${section.label}” section`);
          weeklySectionCounts.set(section.label,(weeklySectionCounts.get(section.label)??0)+1);
        }
        const opinionLabel=expectedSectionLabels['what-do-you-think'];
        for(const section of sections.filter(item=>item.label===opinionLabel)) {
          validateCornerstoneActivity(section.body,`${entry.id}: ${opinionLabel}`);
        }
        for(const match of content.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)) {
          assert(/^\.\.\/\.\.\/assets\/[a-zA-Z0-9._-]+$/.test(match[1]),'Invalid Cornerstone image path');
          await readFile(path.join(dir,'assets',path.basename(match[1])));
        }
        readings.push({...reading,id:`cornerstone:id:${edition.id}:${lesson.id}:${reading.key}`,format:'text/markdown',content});
      }
      for(const label of Object.values(expectedSectionLabels)) {
        const expectedCount=WEEKLY_ACTIVITY_LABELS.includes(label)?keys.length:1;
        assert(weeklySectionCounts.get(label)===expectedCount,`${entry.id}: “${label}” must appear ${expectedCount} time(s) across the seven readings`);
      }
      assert((weeklySectionCounts.get('Bacaan Alkitab')??0)>=5,`${entry.id}: at least five daily readings must include the “Bacaan Alkitab” section`);
      const coverMatch=readings[0].content.match(/!\[lesson-cover\]\(\.\.\/\.\.\/assets\/([a-zA-Z0-9._-]+)\)/);
      assert(coverMatch && coverMatch[1].startsWith(`lesson-cover-${entry.id.slice(-2)}.`),`${entry.id}: Sabbath reading must include its numbered lesson-cover image`);
      assert(lesson.illustration===`../../assets/${coverMatch[1]}`,`${entry.id}: lesson illustration metadata and Sabbath cover must match`);
      await readFile(path.join(dir,'assets',coverMatch[1]));
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
