import {readFile,readdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
const root='content/id/alive-in-jesus/babies/2026-annual';
async function walk(dir){let out=[];for(const e of await readdir(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())out.push(...await walk(p));else if(p.endsWith('.md'))out.push(p);}return out;}
const files=await walk(root),urls=new Set();
for(const file of files) for(const m of (await readFile(file,'utf8')).matchAll(/\]\((https:\/\/[^)]+)\)/g)) if(/\.(?:png|jpg|jpeg|mp3|mp4|pdf)(?:\?|$)/i.test(m[1]))urls.add(m[1]);
const list=[...urls];let index=0;const results=[];
await Promise.all(Array.from({length:5},async()=>{while(index<list.length){const url=list[index++];let result;
for(let retry=0;retry<2;retry++){try{const r=await fetch(url,{method:'HEAD',signal:AbortSignal.timeout(18000)});result={url,status:r.status,bytes:Number(r.headers.get('content-length'))||0,type:r.headers.get('content-type')};if(r.ok)break;}catch(e){result={url,status:0,error:e.message};}}
results.push(result);
}}));
await writeFile('docs/audits/babies-assets.json',JSON.stringify({date:'2026-10-26',total:results.length,failures:results.filter(r=>r.status!==200),assets:results},null,2)+'\n');
for(const role of ['parent','teacher','parent-time']) {const dir=path.join(root,role);const images=new Set();for(const file of files.filter(p=>p.startsWith(dir+path.sep))) for(const m of (await readFile(file,'utf8')).matchAll(/!\[[^\]]*\]\((https:\/\/[^)]+)\)/g))images.add(m[1]);
const p=path.join(dir,'edition.json'),v=JSON.parse(await readFile(p));v.estimatedImageBytes=[...images].reduce((sum,url)=>sum+(results.find(r=>r.url===url)?.bytes||0),0);await writeFile(p,JSON.stringify(v,null,2)+'\n');}
console.log(JSON.stringify({total:results.length,failures:results.filter(r=>r.status!==200)}));
