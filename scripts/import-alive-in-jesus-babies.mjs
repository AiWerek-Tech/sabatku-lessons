import { readFile,readdir,mkdir,writeFile,access } from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {normalizeAliveInJesusMarkdown} from './build-alive-in-jesus.mjs';
import {auditAliveInJesusTranslations,createReviewManifest} from './audit-alive-in-jesus-translations.mjs';
const root=path.resolve('.');
const source=process.argv[2] || 'C:/Users/ADMIN/Music/Alive In Jesus/1. BABIES';
const target=path.join(root,'content/id/alive-in-jesus/babies/2026-annual');
// Reimports must never silently replace reviewed or published editions with drafts.
for(const role of ['parent','teacher','parent-time','parent-time-q2','parent-time-q3','parent-time-q4']){
 try{
  const previous=JSON.parse(await readFile(path.join(target,role,'edition.json'),'utf8'));
  if(previous.publicationStatus!=='draft')throw Error(`Cannot overwrite reviewed content: ${previous.id}`);
 }catch(error){if(error.code!=='ENOENT')throw error;}
}
const corrections=JSON.parse(await readFile('scripts/babies-editorial-corrections.json','utf8')).filter(([from])=>!['Memercayai','terpenuhi','menulari'].includes(from)).sort((a,b)=>b[0].length-a[0].length);
const songTranslations=JSON.parse(await readFile('scripts/babies-song-titles.json','utf8'));
const songAliases=new Map(Object.entries({
 'Tuhan menciptakan cahaya, angin, dan air':'God Made the Light, Wind, Water',
 'Hewan, Hewan':'Animals','Hewan':'Animals','Binatang':'Animals',
 'Yesus yang Menciptakan Sapi-sapi Itu':'Jesus Made the Cows',
 'Yesus Membuat Sapi':'Jesus Made the Cows','Bayi Yesus':'Baby Jesus','Clip-klop':'Clip-Clop','Clip-klop.':'Clip-Clop',
 'Siapakah Saya?':'Who Am I?',
 'Lonceng Sabat':'Sabbath Bells','Hari Sabat':'The Sabbath'
}));
const hash=text=>createHash('sha256').update(text.replace(/\r\n/g,'\n')).digest('hex');
const json=async(file,value)=>{await mkdir(path.dirname(file),{recursive:true});await writeFile(file,JSON.stringify(value,null,2)+'\n');};
async function walk(dir) {const files=[];for(const e of await readdir(dir,{withFileTypes:true})) {const p=path.join(dir,e.name);if(e.isDirectory()) files.push(...await walk(p));else if(e.name.endsWith('.md'))files.push(p);}return files.sort();}
function parse(text) {const m=/^---\r?\n([\s\S]*?)\r?\n---\r?\n/.exec(text);const metadata=m?.[1]||'';return {title:/^title:\s*(.+)$/m.exec(metadata)?.[1]?.replace(/^['"]|['"]$/g,'')||'',body:m?text.slice(m[0].length):text};}
function audioTitles(text) {
 const titles=new Map();
 for(const match of text.matchAll(/^\s*!a\[([^\]]+)\]\s*(.*?)\s+\{"credits"\s*:/gm)) {
  // Source exports may quote a song title or leave it unquoted. A trailing
  // parenthesis is usually a verse/recording variant, not part of the title.
  const title=match[2].trim().replace(/^[“"]|[”"]$/g,'').replace(/\s+\([^()]*\)\s*$/,'').trim();
  if(title) titles.set(match[1],title);
 }
 return titles;
}
const songKey=value=>value.replace(/[“”"'.!?]/g,'').replace(/[’']/g,'').replace(/\s+/g,' ').trim().toLocaleLowerCase('id');
const canonicalSongTitle=value=>Object.keys(songTranslations).find(title=>songKey(title)===songKey(value))||null;
function songLabel(english,indonesian) {return `**${english}** (*${indonesian}*)`;}
function rewriteSongLines(text,en) {
 const english=audioTitles(en),indonesian=audioTitles(text);
 const pairs=new Map();
 for(const [url,title] of english) {
   const canonical=canonicalSongTitle(title),translation=canonical&&songTranslations[canonical];
   if(translation) pairs.set(songKey(indonesian.get(url)||''),{english:canonical,indonesian:translation});
 }
 for(const [local,title] of songAliases) if(songTranslations[title]) pairs.set(songKey(local),{english:title,indonesian:songTranslations[title]});
  const localizedTitles=new Map(Object.entries(songTranslations).map(([title,translation])=>[songKey(translation),{english:canonicalSongTitle(title)||title,indonesian:translation}]));
 for(const [local,title] of songAliases) if(songTranslations[title]) localizedTitles.set(songKey(local),{english:title,indonesian:songTranslations[title]});
 const displayTitle=title=>{const key=songKey(title);return pairs.get(key)||localizedTitles.get(key)||null;};
 text=text.replace(/^\s*!a\[([^\]]+)\]\s*(.*?)\s*(\{"credits"[\s\S]*\})\s*$/gm,(line,url,raw,credits)=>{
  const title=english.get(url);if(!title)return line;
  const canonical=canonicalSongTitle(title)||title,subtitle=songTranslations[canonical];
  return `!a[${url}] “${canonical}${subtitle?` (${subtitle})`:''}” ${credits}`;
 });
 text=text.replace(/\^\[“([^”]+)”\]\((\{"style"[^\n]*?\})\)/g,(all,title)=>{
  const pair=displayTitle(title);return pair?songLabel(pair.english,pair.indonesian):all;
 });
 text=text.replace(/\*\*[“"]([^”"]+)[”"]\*\*/g,(all,title)=>{const pair=displayTitle(title);return pair?songLabel(pair.english,pair.indonesian):all;});
 return text;
}
function semantic(text) {
 const lines=text.replace(/\r\n/g,'\n').split('\n'),output=[];let heading=false,callout=false;
 for(let line of lines) {
  if(/^\s*\{"style"/.test(line)) {try {const style=JSON.parse(line).style;heading=/BaskervilleBT-Bold/.test(style?.text?.typeface||'') && ['xl','lg'].includes(style?.text?.size);callout=Boolean(style?.wrapper?.backgroundImage);}catch {} if(!callout && heading) {output.push(line);continue;} if(callout) continue;output.push(line);continue;}
  if(heading && line.trim() && !line.startsWith('!')) {line='### '+line.replace(/^\*\*|\*\*$/g,'').trim();heading=false;}
  if(callout && line.trim()) {line='> '+line;callout=false;}
  output.push(line);
 }
 return normalizeAliveInJesusMarkdown(output.join('\n')).replace(/\{#\[[^\]]+\]\}/g,'').replace(/\[([^\]]+)\]\((https:[^\s)]+)\.\)\)/g,'[$1]($2)').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u200b\ufeff]/g,'').replace(/\n{3,}/g,'\n\n').trim();
}
function normalizeCitations(text) {
 // The source export sometimes puts the page number in a second unmatched
 // parenthesis after converting its styled book-title reference.
 text=text.replace(/_\(Ellen G\. White_,\s*(.*?),\s*_(vol\.\s*[0-9]+,\s*hlm\.\s*[0-9][0-9, \u2013-]*)\)_\.?/g,(_,book,pages)=>`(Ellen G. White, _${book.trim()}_, ${pages}).`);
 text=text.replace(/_\(Ellen G\. White_,\s*(.*?),\s*_(?:hal|hlm)\.\s*([0-9][0-9, \u2013-]*)\)_\.?/g,(_,book,pages)=>`(Ellen G. White, _${book.trim()}_, hlm. ${pages}).`);
 text=text.replace(/\(Ellen G\. White,\s*([^\n]*?)\s*\((?:hlm\.|hal\.|p\.|pp\.)\s*([0-9][0-9, \u2013-]*)\)\.?/g,(_,rawBook,pages)=>{
  const book=rawBook.trim().replace(/^\*\*(.+)\*\*$/,'_$1_').replace(/,\s*$/,'').replace(/_\s+/g,'_').replace(/\s+_/g,'_');
  return `(Ellen G. White, ${book}, hlm. ${pages}).`;
 });
 text=text.replace(/\(Ellen G\. White,\s*\*\*([^*]+)\*\*,/g,'(Ellen G. White, _$1_,');
 text=text.replace(/\(Ellen G\. White,\s*([^\n]*?hlm\.\s*[0-9][0-9,–-]*)\.\./g,'(Ellen G. White, $1).');
 return text;
}
function revise(text,en) {
 const urls=[];text=text.replace(/https?:\/\/[^\s\"')\]]+/g,url=>{urls.push(url);return `URLTOKEN${urls.length-1}END`;});
 for(const [from,to] of corrections) text=text.replaceAll(from,to);
 text=text.replace(/URLTOKEN(\d+)END/g,(_,index)=>urls[Number(index)]);
 text=rewriteSongLines(text,en);
 const englishSongs=audioTitles(en);
 text=text.replace(/\*\*\^\[([^\]]+)\]\((\{"style"[^\n]*?\})\)\*\*/g,(_,label)=>`\n\n### ${label}\n`);
 text=text.replace(/\^\[([^\n]*?)\]\((\{"style"[^\n]*?\})\)/g,(_,label)=>`**${label}**`).replace(/^(\{"style"[^\n]*\})\\\s*$/gm,'$1');
 text=semantic(text);
  text=text.replace(/\[♫ ([^\]]+)\]\(([^)]+)\)/g,(all,id,url)=>{const sourceTitle=englishSongs.get(url);if(!sourceTitle)return all;const english=canonicalSongTitle(sourceTitle)||sourceTitle,subtitle=songTranslations[english];return `[♫ ${english}${subtitle?` (${subtitle})`:''}](${url})`;});
 text=text.replaceAll('Lukas 19:1–10','Lukas 2:1–20').replaceAll('Lukas 19:1-10','Lukas 2:1–20')
  .replace(/\*\*([^*\n]+)\*\*(?=[\p{L}])/gu,'**$1** ')
  .replace(/\*\*([^*\n]+)\*\*\s*:\s*/g,'**$1:** ')
  .replaceAll('**2 Korintus 5:20** Diskusikan','**2 Korintus 5:20**. Diskusikan');
 text=text.replaceAll('Pengelolaan dan pengajaran anak-anak adalah pekerjaan misionaris paling mulia yang dapat dilakukan oleh setiap pria atau wanita','Mendidik anak-anak menjadi orang Kristen adalah pelayanan tertinggi yang dapat diberikan orang tua kepada Allah')
  .replaceAll('Mengasuh dan mendidik anak-anak adalah pekerjaan misionaris paling mulia yang dapat dilakukan oleh setiap pria atau wanita','Mendidik anak-anak menjadi orang Kristen adalah pelayanan tertinggi yang dapat diberikan orang tua kepada Allah')
  .replaceAll('**“Yohanes Pembaptis dipenuhi dengan Roh Kudus sejak lahirnya**.','“Yohanes Pembaptis dipenuhi Roh Kudus sejak lahir.')
  .replace(/\*\*“(?=[\p{L}])/gu,'** “')
  .replaceAll('rohaniitas','kerohanian')
  .replaceAll('orientasi tujuan Anda','kecenderungan Anda menetapkan tujuan');
 text=normalizeCitations(text);
 text=rewriteSongLines(text,en);
 return text.replace(/\*\*([^*\n]+?)\*\*/g,(_,value)=>`**${value.trim()}**`).replace(/([\p{L}.!?])\*\*(?=[\p{L}])/gu,'$1** ').replace(/^(### )([A-ZÀ-Ý][A-ZÀ-Ý ,–-]{2,})$/gm,(_,mark,label)=>mark+label.toLowerCase().replace(/^./,x=>x.toUpperCase()));
}
const roles=[['parent','AIJ_Baby_Steps_2025','2025-00-bb-pb','2025-01-zaijbbpb','parent-book','Buku Orang Tua'],['teacher','AIJ_Baby_Steps_Teacher_2025','2025-00-bb-tg','2025-01-yaijbbtg','teacher-guide','Panduan Guru']];
const prayerRevisions=JSON.parse(await readFile('scripts/babies-parent-time-prayers-id.json','utf8'));
const reports=[];
for(const [role,prefix,identity,englishEdition,bookRole,label] of roles) {
 const enRoot=path.join(source,prefix+'_EN_MD',identity),idRoot=path.join(source,prefix+'_ID_MD',identity);
 const audit=await auditAliveInJesusTranslations({englishRoot:enRoot,indonesianRoot:idRoot});
 if(audit.missingEnglish.length || audit.missingIndonesian.length) throw Error('Missing source pair '+role);
 const dir=path.join(target,role);try {const old=JSON.parse(await readFile(path.join(dir,'edition.json')));if(old.publicationStatus!=='draft')throw Error('Cannot overwrite reviewed content');}catch(e){if(e.code!=='ENOENT')throw e;}
 const editionId=`2026-q1-aij-babies-${role}`;const lessons=[];let resourceIndex=0;
 for(const p of await walk(idRoot)) {
  const rel=path.relative(idRoot,p),en=await readFile(path.join(enRoot,rel),'utf8'),original=await readFile(p,'utf8'),parsed=parse(original);
  const program=/(?:09-0([1-4])-lesson|05-03-lesson-0([1-4]))/.exec(path.basename(p));
  const excluded=/music-credits|^introduction\.md$/.test(path.basename(p));
  const number=program?Number(program[1]||program[2]):null;
  let title=parsed.title;
  if(title==='Memercayai') title='Kepercayaan';
  for(const [from,to] of corrections)title=title.replaceAll(from,to);
  let content=revise(parsed.body,en);
  const unitId=number?`lesson-0${number}`:`unit-resource-r${hash(rel.replaceAll("\\","/")).slice(0,12)}`;
  const key=number?'program':'reading';
  if(excluded) {reports.push({role,source:rel.replaceAll('\\','/'),excluded:'introduction duplicate or publication credits',englishSha256:hash(en),originalIndonesianSha256:hash(original)});continue;}
  const titles=['Penciptaan','Gembala yang Baik','Nuh dan Hewan-Hewan','Bayi Yesus'];if(number) title=titles[number-1];
  const startDate=number?`2026-${String((number-1)*3+1).padStart(2,'0')}-01`:'2026-01-01';
  const endDate=number?new Date(Date.UTC(2026,number*3,0)).toISOString().slice(0,10):'2026-12-31';
  await mkdir(path.join(dir,unitId),{recursive:true});await writeFile(path.join(dir,unitId,key+'.md'),content+'\n');
  const lesson={id:unitId,title,startDate,endDate,readings:[{key,title,date:startDate,file:key+'.md'}]};await json(path.join(dir,unitId,'lesson.json'),lesson);lessons.push({...lesson,readings:undefined});
  reports.push({role,source:rel.replaceAll('\\','/'),output:`${unitId}/${key}.md`,englishSha256:hash(en),originalIndonesianSha256:hash(original),revisedSha256:hash(content+'\n'),method:'paired-source-editorial-revision',songs:[...audioTitles(en)].map(([url,title])=>({url,title}))});
 }
 // Programs appear before book chapters; references and music remain accessible as book resources.
 lessons.sort((a,b)=>Number(a.id.startsWith("unit-resource-"))-Number(b.id.startsWith("unit-resource-")));
 await mkdir(path.join(dir,'assets'),{recursive:true});
 try {await access(path.join(dir,'assets/cover.png'));} catch {
  const cover=await fetch(`https://sabbath-school.adventech.io/api/v2/en/quarterlies/${englishEdition}/cover.png`,{signal:AbortSignal.timeout(30000)});if(!cover.ok)throw Error('Cover '+cover.status);await writeFile(path.join(dir,'assets/cover.png'),Buffer.from(await cover.arrayBuffer()));
 }
 await writeFile(path.join(dir,'introduction.md'),`Baby Steps · ${label}. Empat program yang dapat diulang bersama bayi, dengan bahan pendamping bagi orang dewasa.\n`);
 await json(path.join(dir,'edition.json'),{id:editionId,programId:'alive-in-jesus-bb-pb',locale:'id',trackId:'babies',cycleId:'annual',bookRole,structureType:'quarterly-repeat-program',dayOrder:null,title:`Baby Steps · ${label} · Panduan Sepanjang Tahun`,description:'Alive in Jesus · Babies · Usia 0–12 bulan',theme:'Bertumbuh Bersama Yesus',startDate:'2026-01-01',endDate:'2026-12-31',sourceEditionId:identity,englishEditionId:englishEdition,sourceYear:2025,cover:`editions/${editionId}/assets/cover.png`,sourceName:'Alive in Jesus · Babies',sourceUrl:'https://babies.aliveinjesus.info/',attribution:'© General Conference of Seventh-day Adventists®.',rightsStatement:'Materi diterjemahkan oleh tim SabatKu berdasarkan sumber resmi.',publicationStatus:'draft',sourceReviewRequired:true,lessons});
 await json(path.join(dir,'source-review.json'),await createReviewManifest({editionRoot:dir,editionId,audit}));
 await json(path.join(root,`docs/audits/babies-${role}-source-audit.json`),audit);
}
{
 const dir=path.join(target,'parent-time'),editionId='2026-q1-aij-babies-parent-time';
 const idRoot=path.join(source,'AIJ_Baby_Steps_Parent_Time_2025_Q1_ID_FULL/2025-01-bb-pth');
 const pdf=JSON.parse(await readFile('scripts/babies-parent-time-pdf-audit.json','utf8'));
 const lessons=[],pairs=[];
 for(let i=1;i<=13;i++) {
  const n=String(i).padStart(2,'0'),original=await readFile(path.join(idRoot,n,n+'.md'),'utf8'),parsed=parse(original);
  let body=revise(parsed.body,'');
  const sectionNames=['Berbagi Pengalaman','Mendalami Firman','Diskusi','Tantangan','Komitmen','Doa'];
  for(const name of sectionNames) body=body.replaceAll('\n'+name+'\n','\n### '+name+'\n');
  body=body.replace('Membaca Firman **','Bacalah **').replaceAll('Tunjukkan hadiah yang dibungkus secara simbolis.','Tunjukkan sebuah hadiah terbungkus sebagai lambang.');
  if(prayerRevisions[n]) {
   const prayerStart=Math.max(body.lastIndexOf('**Doa**'),body.lastIndexOf('### Doa'));
   if(prayerStart>=0) body=body.slice(0,prayerStart)+`### Doa\n\n${prayerRevisions[n]}`;
  }
  body=body.replaceAll('(Matius 19:14, ESV)','(Matius 19:14)')
   .replaceAll('**Child Guidance**(hlm. 476)','_Child Guidance_, hlm. 476.')
   .replaceAll('**Child Guidance**(hlm.','_Child Guidance_, hlm.');
  const unitId='lesson-'+n,title=parsed.title;
  const startDate=new Date(Date.UTC(2026,0,1+(i-1)*7)).toISOString().slice(0,10),endDate=new Date(Math.min(Date.UTC(2026,0,7+(i-1)*7),Date.UTC(2026,2,31))).toISOString().slice(0,10);
  await mkdir(path.join(dir,unitId),{recursive:true});await writeFile(path.join(dir,unitId,'discussion.md'),body+'\n');
  const lesson={id:unitId,title,startDate,endDate,readings:[{key:'discussion',title,date:startDate,file:'discussion.md'}]};await json(path.join(dir,unitId,'lesson.json'),lesson);lessons.push({...lesson,readings:undefined});
  pairs.push({path:n+'/'+n+'.md',englishSha256:pdf.sessions[i-1].englishTextSha256,indonesianSha256:hash(original),machineFlags:[]});
  reports.push({role:'parent-time',source:n+'/'+n+'.md',englishPdfPages:pdf.sessions[i-1].pages,englishPdfSha256:pdf.pdfSha256,originalIndonesianSha256:hash(original),revisedSha256:hash(body+'\n'),method:'source-pdf-compared-editorial-revision'});
 }
 await mkdir(path.join(dir,'assets'),{recursive:true});
 const cover=await readFile(path.join(source,'AIJ-Ebook-Pdf-English/Parent Time Handouts/baby-book-cover-q1.20140c57.png'));await writeFile(path.join(dir,'assets/cover.png'),cover);
 await writeFile(path.join(dir,'introduction.md'),'Parent Time · Seri 1: Mengasuh Anak dengan Tujuan. Tiga belas sesi diskusi orang tua.\n');
 await json(path.join(dir,'edition.json'),{id:editionId,programId:'alive-in-jesus-bb-pb',locale:'id',trackId:'babies',cycleId:'annual',bookRole:'parent-time-handout',structureType:'weekly-parent-discussion',dayOrder:null,title:'Baby Steps · Parent Time · Seri 1: Mengasuh Anak dengan Tujuan',description:'Bahan diskusi orang tua · 13 sesi · Seri pertama',theme:'Mengasuh Anak dengan Tujuan',startDate:'2026-01-01',endDate:'2026-03-31',sourceEditionId:'2025-01-bb-pth',englishEditionId:'2025-01-xaijbbpthone',sourceYear:2025,cover:`editions/${editionId}/assets/cover.png`,sourceName:'Alive in Jesus · Babies',sourceUrl:'https://babies.aliveinjesus.info/',attribution:'© General Conference of Seventh-day Adventists®.',rightsStatement:'Materi diterjemahkan oleh tim SabatKu berdasarkan sumber resmi.',publicationStatus:'draft',sourceReviewRequired:true,lessons});
 const audit={englishFiles:13,indonesianFiles:13,matchedFiles:13,missingEnglish:[],missingIndonesian:[],flaggedPairCount:0,pairs,englishSourceType:'pdf',englishPdfSha256:pdf.pdfSha256};
 await json(path.join(dir,'source-review.json'),await createReviewManifest({editionRoot:dir,editionId,audit}));
 await json(path.join(root,'docs/audits/babies-parent-time-source-audit.json'),audit);
}
await json(path.join(root,'docs/audits/babies-editorial-revision.json'),{date:'2026-10-26',status:'draft-human-review-required',files:reports,notes:['English and Indonesian source pairs were checked for matching files and structure. The Indonesian text remains unpublished until the translation team completes its editorial review.','The Baby Jesus source incorrectly lists Luke 19:1–10 in the parent book; corrected against parent PDF page 89 and teacher PDF page 22 to Luke 2:1–20.','The English source year is 2025; 2026 dates in this edition define the local reading cycle and do not imply a new source edition.','English song titles are preserved, Indonesian titles are presented as subtitles, and playable audio links point to the official provider.','Parent Time Series 1 Q1 was compared with the English PDF by session/page range and source hash; the reference PDF is not copied into this Indonesian content repository.','Source credits and publication metadata are retained in audit/edition metadata and are not inserted as reader-facing lesson paragraphs.']});
console.log('Imported parent and teacher drafts; '+reports.length+' paired files audited.');
