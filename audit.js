const fs=require('fs'),path=require('path');
const B='C:\\PRISM\\mcp-server',S=path.join(B,'src');
const r=(p)=>{try{return fs.readFileSync(p,'utf-8')}catch{return''}};
const d=(p)=>fs.readdirSync(p).filter(f=>f.endsWith('.ts'));
const out={dispatchers:[],engines:[],orchestration:[],hooks:{},py_in_mcp:[],data_reg:[]};

// 1. DISPATCHERS
console.log('==== DISPATCHERS ====');
const dp=path.join(S,'tools','dispatchers');
for(const f of d(dp)){
  const c=r(path.join(dp,f)),L=c.split('\n').length;
  const cases=[...c.matchAll(/case\s+['"](\w+)['"]/g)].map(m=>m[1]);
  const warns=[...c.matchAll(/(placeholder|hardcoded|TODO|FIXME|stub|fake|deprecated|not.implement)/gi)].map(m=>m[1].toLowerCase());
  const engs=[...c.matchAll(/from\s+['"]([^'"]*[Ee]ngine[^'"]*)['"]/g)].map(m=>m[1]);
  console.log(`${f}|${L}L|${cases.length}acts|warns:${[...new Set(warns)].join(',')||'none'}|engines:${engs.length}`);
  console.log(`  actions: ${cases.join(', ')}`);
  out.dispatchers.push({f,L,acts:cases.length,cases,warns:[...new Set(warns)]});
}
const totActs=out.dispatchers.reduce((s,d)=>s+d.acts,0);
const totLines=out.dispatchers.reduce((s,d)=>s+d.L,0);
console.log(`\nTOTAL: ${out.dispatchers.length} dispatchers, ${totActs} actions, ${totLines} lines`);

// 2. ENGINES
console.log('\n==== ENGINES ====');
const ep=path.join(S,'engines');
if(fs.existsSync(ep)){
  for(const f of d(ep)){
    const c=r(path.join(ep,f)),L=c.split('\n').length;
    const exp=[...c.matchAll(/export\s+(?:class|function|const|async\s+function)\s+(\w+)/g)].map(m=>m[1]);
    console.log(`${f}|${L}L|exports:${exp.join(',')}`);
    out.engines.push({f,L,exports:exp});
  }
}else console.log('NO engines/ dir');

// 3. ORCHESTRATION
console.log('\n==== ORCHESTRATION ====');
const op=path.join(S,'orchestration');
if(fs.existsSync(op)){
  for(const f of fs.readdirSync(op).filter(x=>x.endsWith('.ts'))){
    const c=r(path.join(op,f)),L=c.split('\n').length;
    const cls=[...c.matchAll(/class\s+(\w+)/g)].map(m=>m[1]);
    const meths=[...c.matchAll(/(?:async\s+)?(?:private|public|protected)\s+(\w+)\s*\(/g)].map(m=>m[1]);
    const apiRefs=(c.match(/anthropic|claude|api_key|ANTHROPIC_API/gi)||[]).length;
    console.log(`${f}|${L}L|classes:${cls.join(',')}|methods:${meths.length}|apiRefs:${apiRefs}`);
    out.orchestration.push({f,L,classes:cls,methods:meths.length,apiRefs});
  }
}

// 4. HOOKS
console.log('\n==== HOOKS ====');
const hookDir=path.join(S,'hooks');
if(fs.existsSync(hookDir)){
  for(const f of fs.readdirSync(hookDir).filter(x=>x.endsWith('.ts'))){
    const c=r(path.join(hookDir,f)),L=c.split('\n').length;
    const regs=[...c.matchAll(/register(?:Hook|Phase0|Cadence|AutoFire)?\s*\(\s*['"]([^'"]+)['"]/g)].map(m=>m[1]);
    const blocking=(c.match(/blocking|pre.output|BLOCK/gi)||[]).length;
    console.log(`${f}|${L}L|registered:${regs.length}|blockingRefs:${blocking}`);
    if(regs.length>0)console.log(`  hooks: ${regs.slice(0,15).join(', ')}`);
  }
}
