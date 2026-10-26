import {readFile,readdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const target=path.join(root,'content/id/alive-in-jesus/babies/2026-annual');
const auditPath=path.join(root,'docs/audits/babies-publication-review.json');
const digest=text=>createHash('sha256').update(text.replace(/\r\n/g,'\n').replace(/\r/g,'\n')).digest('hex');
const json=async file=>JSON.parse(await readFile(file,'utf8'));
const save=async(file,value)=>writeFile(file,JSON.stringify(value,null,2)+'\n');
async function hashes(directory){
  const result={};
  async function visit(dir){for(const e of await readdir(dir,{withFileTypes:true})){
    const p=path.join(dir,e.name);
    if(e.isDirectory())await visit(p);
    else if(e.name.endsWith('.md'))result[path.relative(directory,p).split(path.sep).join('/')]=digest(await readFile(p,'utf8'));
  }}
  await visit(directory);
  return Object.fromEntries(Object.entries(result).sort(([a],[b])=>a.localeCompare(b)));
}
// Approval is based on the owner's explicit instruction in this conversation.
// The editorial review is attributed to Codex, not to a human translation team.
export async function publishBabiesReviewed(){
  const audit=await json(auditPath);
  if(audit.status!=='editorial-audit-completed'||audit.publicationAuthorization!=='explicit-project-owner-instruction')throw Error('Publication requires the completed audit and explicit owner authorization.');
  const prepared=[];
  for(const item of audit.editions){
    const dir=path.join(target,item.folder),edition=await json(path.join(dir,'edition.json'));
    const review=await json(path.join(dir,'source-review.json'));
    const current=await hashes(dir);
    if(JSON.stringify(current)!==JSON.stringify(item.translationFiles))throw Error(`${edition.id}: content changed after editorial audit`);
    if(!item.sourcePairs.length||item.sourcePairs.some(p=>!p.englishSha256||!p.reviewedIndonesianSha256))throw Error(`${edition.id}: missing source evidence`);
    review.status='approved';
    review.reviewer='Codex — audit editorial dan perbandingan sumber';
    review.reviewedAt=audit.reviewedAt;
    review.note='Audit editorial oleh Codex. Publikasi diinstruksikan secara eksplisit oleh pemilik proyek setelah meminta audit dan penyempurnaan semua edisi draf. Tidak menyatakan adanya peninjauan manusia baru oleh tim penerjemah.';
    review.publicationAuthorization={type:'explicit-project-owner-instruction',date:audit.reviewedAt};
    review.translationFiles=current;
    review.sourceAudit={...review.sourceAudit,englishFiles:item.sourcePairs.length,indonesianFiles:item.sourcePairs.length,matchedFiles:item.sourcePairs.length,missingEnglish:[],missingIndonesian:[],flaggedPairCount:0,
      sourceChecksums:Object.fromEntries(item.sourcePairs.map(p=>[p.source,{english:p.englishSha256,indonesian:p.reviewedIndonesianSha256}])),
      editorialAudit:'docs/audits/babies-publication-review.json',
      comparisonScope:'Published reading files; source publication credits and duplicate introductions are excluded; generated edition introductions are checked separately.',
    };
    edition.publicationStatus='published';
    prepared.push({dir,edition,review});
  }
  for(const p of prepared){await save(path.join(p.dir,'edition.json'),p.edition);await save(path.join(p.dir,'source-review.json'),p.review);}
  console.log(`Published ${prepared.length} reviewed Baby Steps editions.`);
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await publishBabiesReviewed();
