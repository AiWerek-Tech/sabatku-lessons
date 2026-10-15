import {createHash} from 'node:crypto';
const assert=(v,message)=>{if(!v)throw new Error(message);};
const id=/^[A-Za-z0-9_-]{1,80}$/;
export const activityKinds=new Set(['journal','fill','matching','choice','budget','word-search','maze','cipher','crossword','drop-quote']);
const normal=s=>s.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
function letters(a,path) {return path.map(i=>a.grid[Math.floor(i/a.grid[0].length)][i%a.grid[0].length]).join('');}
export function validateStudyActivity(a) {
  assert(id.test(a.id) && Number.isInteger(a.answerVersion) && a.answerVersion>0 && a.answerVersion<=1000 && activityKinds.has(a.kind),'Invalid activity identity or kind');
  assert(typeof a.title==='string' && a.title.length>0 && a.title.length<=160 && typeof a.instruction==='string' && a.instruction.length<=4000,'Missing activity title/instructions');
  const items=a.items??[];
  assert(items.length<=128 && new Set(items.map(q=>q.id)).size===items.length,'Duplicated or excessive activity items');
  if(['journal','fill','matching','choice','budget','word-search','crossword'].includes(a.kind))assert(items.length>0,'Activity must contain questions');
  if(['matching','choice'].includes(a.kind))assert(items.every(q=>q.choices?.length && q.correct?.length),'Missing choice answer key');
  for(const q of items) {
    assert(id.test(q.id) && typeof q.prompt==='string' && q.prompt.trim() && q.prompt.length<=12000,'Invalid question identity/prompt');
    if(q.choices) {
      assert(q.choices.length<=40 && new Set(q.choices.map(c=>c.id)).size===q.choices.length && q.choices.every(c=>id.test(c.id)&&c.label),'Invalid choices');
      if(a.kind!=='journal')assert(q.correct?.length && (q.multiple || q.correct.length===1) && q.correct.every(c=>q.choices.some(o=>o.id===c)),'Unverified answer key');
    }
    if(a.kind==='fill')assert(q.blanks?.length && q.blanks.length===q.prompt.split('___').length-1 && q.blanks.every(b=>b.length&&b.every(s=>typeof s==='string'&&s.trim())),'Incomplete fill answer key');
  }
  if(a.grid) assert(a.grid.length>0 && a.grid.length<=32 && a.grid[0].length>0 && a.grid[0].length<=32 && a.grid.every(r=>r.length===a.grid[0].length),'Invalid activity grid');
  const width=a.grid?.[0].length;
  const inGrid=p=>p.every(i=>Number.isInteger(i)&&i>=0&&i<a.grid.length*width);
  if(['word-search','crossword'].includes(a.kind)) for(const q of items) {
    assert(q.path?.length===q.word.length && inGrid(q.path) && letters(a,q.path)===q.word,'Unsolvable grid word');
    if(a.kind==='word-search') {
      const rs=q.path.map(i=>Math.floor(i/width)),cs=q.path.map(i=>i%width);
      assert(q.path.length>1 && Math.abs(rs[1]-rs[0])<=1 && Math.abs(cs[1]-cs[0])<=1 && q.path[0]!==q.path[1] && q.path.slice(1).every((_,i)=>rs[i+1]-rs[i]===rs[1]-rs[0] && cs[i+1]-cs[i]===cs[1]-cs[0]),'Word path must be straight and adjacent');
    }
    if(a.kind==='crossword')assert(['down','across'].includes(q.direction) && q.path.every((v,i)=>v===q.path[0]+i*(q.direction==='down'?width:1)) && (q.direction==='down'||Math.floor(q.path[0]/width)===Math.floor(q.path.at(-1)/width)),'Invalid crossword direction');
  }
  if(a.kind==='word-search' && a.secret) {
    const used=new Set(items.flatMap(q=>q.path));
    const hidden=[...a.grid.slice(0,2).join('')].filter((c,i)=>!used.has(i)&&/[A-Z]/.test(c)).join('');
    assert(normal(hidden)===normal(a.secret),'Hidden message does not match remaining letters');
  }
  if(a.kind==='maze') {
    assert(a.solution?.length && inGrid(a.solution) && new Set(a.solution).size===a.solution.length,'Invalid maze solution');
    assert(letters(a,a.solution)===normal(a.verse).toUpperCase(),'Maze solution does not spell the source verse');
    assert(a.solution.slice(1).every((n,i)=>Math.abs(Math.floor(n/width)-Math.floor(a.solution[i]/width))<=1&&Math.abs(n%width-a.solution[i]%width)<=1),'Disconnected maze path');
  }
  if(a.kind==='cipher') {
    assert(a.cipher && a.mapping && Object.keys(a.mapping).some(k=>!(k in (a.givens??{}))) && [...a.cipher.replace(/[^A-Z]/g,'')].every(c=>/^[A-Z]$/.test(a.mapping[c])),'Incomplete cipher key');
    assert(new Set(Object.values(a.mapping)).size===Object.keys(a.mapping).length,'Cipher key must be one-to-one');
    assert(Object.entries(a.givens??{}).every(([k,v])=>a.mapping[k]===v),'Incorrect initial cipher hints');
  }
  if(a.kind==='drop-quote') {
    assert(a.grid.some(row=>row.includes('_')) && a.solution?.length===a.grid.length && a.pools?.length===width && a.solution.every(r=>r.length===width),'Invalid drop-quote grid');
    assert(a.grid.every((row,r)=>[...row].every((c,col)=>c==='_'?/^[A-Z]$/.test(a.solution[r][col]):c===a.solution[r][col])),'Drop-quote solution does not match the printed mask');
    const sorted=s=>[...s].sort().join('');
    for(let c=0;c<width;c++) assert(sorted(a.pools[c])===sorted(a.solution.map(r=>r[c]).filter(v=>/[A-Z]/.test(v)).join('')),'Drop-quote column has the wrong letters');
  }
  return a;
}
export function publishInteractiveReading(doc) {
  assert(doc?.version===1 && Array.isArray(doc.blocks) && doc.blocks.length<=300,'Invalid interactive reading');
  const ids=new Set();
  for(const b of doc.blocks) {
    assert((typeof b.markdown==='string')!==Boolean(b.activity),'A reading block must contain text or an activity');
    if(b.activity) {validateStudyActivity(b.activity);assert(!ids.has(b.activity.id),'Duplicate activity ID');ids.add(b.activity.id);}
  }
  if(!ids.size)return {};
  const interactiveContent=JSON.stringify(doc);
  assert(Buffer.byteLength(interactiveContent)<500_000,'Interactive reading too large');
  // A legal media-type parameter lets existing v1 clients validate the same
  // revision while continuing to read their original Markdown fallback.
  const hash=createHash('sha256').update(interactiveContent).digest('hex');
  return {interactiveContent,format:`text/markdown; interactive-sha256=${hash}`};
}
