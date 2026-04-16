const fs=require('fs');
const b=fs.readFileSync(__dirname+'/../dist/index.js','utf-8').split('\n');
let s=-1,e=-1;
for(let i=0;i<b.length;i++){
  if(b[i].includes('// src/tools/autoHookWrapper.ts'))s=i;
  if(s>0&&i>s+10&&b[i].includes('// src/tests/smokeTests.ts')){e=i;break;}
}
console.log('Lines:',s+1,'-',e+1,'(',e-s,'lines)');
fs.writeFileSync(__dirname+'/../src/tools/autoHookWrapper.recovered.js', b.slice(s,e).join('\n'));
console.log('SAVED to src/tools/autoHookWrapper.recovered.js');