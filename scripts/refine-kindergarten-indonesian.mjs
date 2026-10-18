import { readFile, writeFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createReviewManifest } from './audit-alive-in-jesus-translations.mjs';

const base='content/id/alive-in-jesus/kindergarten/2026-q4-year-a';
const sha=s=>createHash('sha256').update(s.replace(/\r\n/g,'\n')).digest('hex');
const plain=s=>s.replaceAll('**','').replace(/\s+/g,' ').trim();
const corrections=JSON.parse(await readFile('scripts/kindergarten-editorial-corrections.json','utf8'));
const changes=[];
const journalPath='docs/audits/kindergarten-editorial-changes.json';
const previous=JSON.parse(await readFile(journalPath,'utf8').catch(()=>'{"changes":[]}'));
const cumulative=new Map(previous.changes.map(change=>[change.file,change]));
const protectedDocuments=new Set([
  'teacher/unit-resource-storytelling/resource.md',
  'teacher/unit-resource-about-curriculum/resource.md',
]);
for(const role of ['student','teacher']) {
  async function visit(directory) {
    for(const entry of await readdir(directory,{withFileTypes:true})) {
      const file=path.join(directory,entry.name);
      if(entry.isDirectory()) { await visit(file); continue; }
      if(!entry.name.endsWith('.md')) continue;
      const before=await readFile(file,'utf8');
      let text=before;
      const relative=path.relative(base,file).split(path.sep).join('/');
      // This resource was rewritten from the paired English source because
      // broad phrase substitutions had damaged translated links and grammar.
      if(!protectedDocuments.has(relative)) {
        for(const [from,to] of corrections.shared) text=text.replaceAll(from,to);
      }
      for(const [from,to] of corrections.files[relative]??[]) {
        if(text.includes(from)) text=text.replaceAll(from,to);
        else if(!text.includes(to) && !plain(text).includes(plain(to))) throw new Error(`${relative}: correction text not found: ${from.slice(0,100)}`);
      }
      text=text.replace(/(^|[.!?] )kamu\b/gm,'$1Kamu')
        .replace(/(\*\*[^*\n]*[.!?]\*\*\s+)kamu\b/g,'$1Kamu')
        .replace(/\bMinggu(?= ke-?\d| \d)/g,'Pekan')
        .replace(/\bminggu(?= ke-?\d| \d)/g,'pekan')
        .replace(/\bMinggu ini\b/g,'Pekan ini')
        .replace(/\bminggu ini\b/g,'pekan ini')
        .replace(/panduan siswa/gi,'Panduan Murid')
        .replace(/panduan guru/gi,'Panduan Guru')
        .replace(/powerpoint program/gi,'PowerPoint Program')
        .replaceAll('Gagasan Utama','Pesan Utama')
        .replaceAll('Tampilkan**►**','Tampilkan')
        .replace(/([.!?])\*\*►\*\*/g,'$1\n\n**►**');
      // The translated source split emphasis across words. Rebuild teacher agenda
      // and preparation emphasis from semantic labels, without altering wording.
      if(role==='teacher' && /\/(full-program-outline|program-preparation)\.md$/.test(relative)) {
        text=text.split(/\n\s*\n/).map(paragraph=> {
          if(paragraph.startsWith('#') || paragraph.startsWith('![') || paragraph.startsWith('[♫')) return paragraph;
          return paragraph.replaceAll('**','').replace(/(^|\n)([-*+]\s+)?([\p{Lu}][\p{Lu}\s/–—-]{2,60}|Pesan Utama|Poin Pembelajaran):/gu,'$1$2**$3:**');
        }).join('\n\n');
      }
      text=text.replace(/([^\s*])\*\*\(/g,'$1 **(').replace(/\)\*\*([^\s*.,;:!?])/g,')** $1').replaceAll('****(','** **(');
      if(text!==before) {
        await writeFile(file,text,'utf8');
        changes.push({file:relative,before:sha(before),after:sha(text)});
        const old=cumulative.get(relative);
        cumulative.set(relative,{file:relative,before:old?.before??sha(before),after:sha(text)});
      }
    }
  }
  await visit(path.join(base,role));
  const audit=JSON.parse(await readFile(`docs/audits/kindergarten-${role}-source-audit.json`,'utf8'));
  const manifest=await createReviewManifest({editionRoot:path.join(base,role),editionId:`2026-q4-aij-kindergarten-${role}`,audit});
  await writeFile(path.join(base,role,'source-review.json'),JSON.stringify(manifest,null,2)+'\n');
}
if(changes.length) await writeFile(journalPath,JSON.stringify({date:'2026-10-18',status:'editorial-revision-needs-team-review',baseline:'First recorded editorial pass per file; original source checksums are in source-audit manifests.',changes:[...cumulative.values()].sort((a,b)=>a.file.localeCompare(b.file))},null,2)+'\n');
console.log(`Refined ${changes.length} reading documents; review manifests refreshed.`);
