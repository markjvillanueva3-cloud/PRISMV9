// fix_missing_gates.js — Add GATE: YOLO to 9 tag tasks missing it
const fs = require('fs');
const filePath = 'C:\\PRISM\\mcp-server\\data\\docs\\roadmap\\PRISM_ROADMAP_v18.1.md';
const lines = fs.readFileSync(filePath, 'utf8').split('\n');

const targets = ['R3-MS5-T3','R5-MS5-T2','R6-MS4-T2','R7-MS5-T2','R8-MS4-T2','R9-MS6-T2','R10-MS5-T2','R11-MS5-T2','R12-MS5-T2'];
let phase = '', fixed = 0;

for (let i = 0; i < lines.length; i++) {
  const pm = lines[i].match(/^## \d+\. (R\d+)/);
  if (pm) phase = pm[1];
  
  const tm = lines[i].match(/^\s*TASK:\s*(MS\S+)/);
  if (!tm) continue;
  const fullId = `${phase}-${tm[1]}`;
  
  if (!targets.includes(fullId)) continue;
  
  // Check if GATE already exists in block
  let hasGate = false;
  let executorLine = -1;
  for (let j = i+1; j < Math.min(i+20, lines.length); j++) {
    if (lines[j].trim().match(/^```\s*$/)) break;
    if (lines[j].match(/GATE:/)) hasGate = true;
    if (lines[j].match(/EXECUTOR:/)) executorLine = j;
  }
  
  if (!hasGate && executorLine > -1) {
    // Insert GATE after EXECUTOR line
    lines.splice(executorLine + 1, 0, '  GATE: YOLO | ESTIMATED_CALLS: 3');
    fixed++;
    console.log(`Fixed: ${fullId} @ L${executorLine+1}`);
  }
}

fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
console.log(`\nTotal fixed: ${fixed}`);
