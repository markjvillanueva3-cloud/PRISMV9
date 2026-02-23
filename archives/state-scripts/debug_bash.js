// debug_bash.js — Debug why BASH commands aren't being added
const fs = require('fs');
const filePath = 'C:\\PRISM\\mcp-server\\data\\docs\\roadmap\\PRISM_ROADMAP_v18.1.md';
const lines = fs.readFileSync(filePath, 'utf8').split('\n');
let currentPhase = '';
let codeTasks = 0;
let withBash = 0;
let withoutBash = 0;

for (let i = 0; i < lines.length; i++) {
  const pm = lines[i].match(/^## \d+\. (R\d+)/);
  if (pm) currentPhase = pm[1];
  
  const tm = lines[i].match(/^\s*TASK: (MS\d+-\S+)/);
  if (!tm) continue;
  const taskId = tm[1];
  
  let isCode = false;
  let blockEnd = -1;
  
  for (let j = i + 1; j < Math.min(i + 25, lines.length); j++) {
    if (lines[j].match(/^```$/)) { blockEnd = j; break; }
    if (lines[j].includes('EXECUTOR: Code')) isCode = true;
  }
  
  if (!isCode) continue;
  codeTasks++;
  
  // Check for BASH
  let hasBash = false;
  if (blockEnd > -1) {
    for (let j = blockEnd; j < Math.min(blockEnd + 15, lines.length); j++) {
      if (lines[j].includes('**BASH:**') || lines[j].match(/^\*\*BASH/)) { hasBash = true; break; }
      if (lines[j].match(/^####/) || lines[j].match(/^###/) || lines[j].match(/^---/)) break;
    }
  }
  
  if (hasBash) {
    withBash++;
  } else {
    withoutBash++;
    if (withoutBash <= 5) {
      console.log(`MISSING L${i+1} ${taskId} (${currentPhase}) blockEnd=${blockEnd}`);
      if (blockEnd > -1) {
        for (let j = blockEnd; j < Math.min(blockEnd + 8, lines.length); j++) {
          console.log(`  L${j+1}: "${lines[j].substring(0,80)}"`);
        }
      }
    }
  }
}

console.log(`\nCode tasks: ${codeTasks}, with BASH: ${withBash}, without: ${withoutBash}`);
