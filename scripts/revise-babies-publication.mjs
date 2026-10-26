import {readFile, writeFile, readdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const target=path.join(root,'content/id/alive-in-jesus/babies/2026-annual');
const changes=JSON.parse(await readFile(path.join(root,'scripts/babies-publication-editorial.json'),'utf8'));
const prayers=JSON.parse(await readFile(path.join(root,'scripts/babies-publication-prayers.json'),'utf8'));
async function walk(dir){const result=[];for(const e of await readdir(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())result.push(...await walk(p));else if(e.name.endsWith('.md'))result.push(p);}return result;}
export function revisePublicationText(text,relative){
  let result=text;
  for(const [from,to] of changes.files[relative]??[]) {
    if(to.includes(from)&&result.includes(to)) continue;
    result=result.replaceAll(from,to);
  }
  for(const [from,to] of changes.global) result=result.replaceAll(from,to);
  if(prayers[relative]) {
    const start=result.indexOf('> **Pokok Doa**');
    if(start>=0){
      const rest=result.slice(start);
      const next=/\n(?:!\[|INSPIRASI|#{1,6} )/.exec(rest);
      const end=next?start+next.index:result.length;
      result=result.slice(0,start)+`> **Pokok Doa**\n>\n> ${prayers[relative]}\n\n`+result.slice(end).trimStart();
    }
  }
  result=result.replace(/^> (#{1,6} .+)$/gm,'$1')
    .replace(/^\\\+ /gm,'+ ').replace(/^\*\*\+\*\* /gm,'+ ')
    .replace(/\.\*\*\./g,'.**').replace(/\.\*\*, /g,'**, ')
    .replace(/\.\*\* (?=(?:dan|untuk|yang|saat|sementara|ketika|agar|dengan|di|jika|atas)\b)/g,'** ')
    .replace(/\.\*\*—/g,'**—')
    .replace(/^#{4,6} (?:\*\*)?Inspirasi bagi Saya(?:\*\*)?$/gm,'### Inspirasi bagi Saya')
    .replace(/^(?:### ){2,}/gm,'### ')
    .replace(/\n{3,}/g,'\n\n');
  return result.trimEnd()+'\n';
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  let count=0;
  for(const file of await walk(target)){
    const old=await readFile(file,'utf8');
    const relative=path.relative(target,file).split(path.sep).join('/');
    const result=revisePublicationText(old,relative);
    if(result!==old){await writeFile(file,result);count++;}
  }
  console.log(`Revised ${count} Indonesian reading files.`);
}
