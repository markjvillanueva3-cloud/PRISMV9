// audit_missing_bash.js — Find tasks still missing BASH commands
const fs = require('fs');
const lines = fs.readFileSync('C:\\PRISM\\mcp-server\\data\\docs\\roadmap\\PRISM_ROADMAP_v18.1.md', 'utf8').split('\n');
let phase = '', missing = [], total = 0, withBash = 0;

for (let i = 0; i < lines.length; i++) {
  const pm = lines[i].match(/^## \d+\. (R\d+)/);
  if (pm) phase = pm[1];
  
  const tm = lines[i].match(/^\s*TASK:\s*(MS\S+)/);
  if (!tm) continue;
  total++;
  const taskId = tm[1];
  
  // Find code block end
  let blockEnd = -1;
  let isCode = false;
  let isChat = false;
  for (let j = i+1; j < Math.min(i+30, lines.length); j++) {
    if (lines[j].trim().match(/^```\s*$/)) { blockEnd = j; break; }
    if (lines[j].includes('EXECUTOR: Code')) isCode = true;
    if (lines[j].includes('EXECUTOR: Chat')) isChat = true;
  }
  
  // Check for BASH after block
  let hasBash = false;
  let searchEnd = blockEnd > -1 ? blockEnd : i;
  for (let j = searchEnd; j < Math.min(searchEnd + 25, lines.length); j++) {
    if (lines[j].includes('**BASH:**')) { hasBash = true; break; }
    if (j > searchEnd + 2 && (lines[j].match(/^####/) || lines[j].match(/^###/) || lines[j].match(/^---/))) break;
    if (j > searchEnd + 2 && lines[j].match(/^\s*TASK:/)) break;
  }
  
  if (hasBash) { withBash++; continue; }
  
  missing.push(`${phase} ${taskId} (${isChat ? 'Chat' : isCode ? 'Code' : '???'}) L${i+1}`);
}

console.log(`Total: ${total}, With BASH: ${withBash}, Missing: ${missing.length}`);
console.log('\nMissing BASH:');
missing.forEach(m => console.log(`  ${m}`));
