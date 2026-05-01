// add_bash_commands.js — Add BASH commands to all Code tasks missing them
// Handles Unicode properly, lenient regex for code block endings
const fs = require('fs');
const filePath = 'C:\\PRISM\\mcp-server\\data\\docs\\roadmap\\PRISM_ROADMAP_v18.1.md';
const lines = fs.readFileSync(filePath, 'utf8').split('\n');

let currentPhase = '';
let currentMS = '';
let insertions = [];

// Phase-specific test commands
const phaseTests = {
  'R2': 'npx tsx tests/r2/run-benchmarks.ts',
  'R3': 'npx tsx tests/r3/intelligence-tests.ts',
  'R4': 'npm run test:regression',
  'R5': 'npx tsx tests/r5/postproc-tests.ts',
  'R6': 'npm run test:critical && npm run test:regression',
  'R7': 'npx tsx tests/r7/pipeline-tests.ts',
  'R8': 'npx tsx tests/r8/plugin-tests.ts',
  'R9': 'npx tsx tests/r9/dsl-tests.ts',
  'R10': 'npx tsx tests/r10/ml-tests.ts',
  'R11': 'npx tsx tests/r11/ui-tests.ts',
  'R12': 'npx tsx tests/r12/twin-tests.ts',
  'R13': 'npx tsx tests/r13/platform-tests.ts',
};

for (let i = 0; i < lines.length; i++) {
  // Track phase
  const pm = lines[i].match(/^## \d+\. (R\d+)/);
  if (pm) currentPhase = pm[1];
  
  // Track milestone
  const msm = lines[i].match(/^### (MS\d+)/);
  if (msm) currentMS = msm[1];
  
  // Find TASK blocks
  const tm = lines[i].match(/^\s*TASK:\s*(MS\S+)/);
  if (!tm) continue;
  const taskId = tm[1];
  
  // Check if Code executor
  let isCode = false;
  let isGate = taskId.includes('GATE');
  let isTag = taskId.match(/T\d+$/) && false; // detect from content
  let blockEnd = -1;
  let writesTo = '';
  
  for (let j = i + 1; j < Math.min(i + 30, lines.length); j++) {
    if (lines[j].trim().match(/^```\s*$/)) { blockEnd = j; break; }
    if (lines[j].includes('EXECUTOR: Code')) isCode = true;
    if (lines[j].includes('Tag') && lines[j].includes('ARCHETYPE')) isTag = true;
    const wm = lines[j].match(/WRITES_TO:\s*\[(.+)\]/);
    if (wm) writesTo = wm[1];
  }
  
  if (!isCode || blockEnd === -1) continue;
  
  // Check if BASH already exists after block end
  let hasBash = false;
  for (let j = blockEnd + 1; j < Math.min(blockEnd + 20, lines.length); j++) {
    if (lines[j].includes('**BASH:**')) { hasBash = true; break; }
    if (lines[j].match(/^####/) || lines[j].match(/^###/) || lines[j].match(/^---/)) break;
    if (lines[j].match(/^\s*TASK:/)) break;
  }
  
  if (hasBash) continue;
  
  // Determine BASH command based on task type
  let bash = '';
  const testCmd = phaseTests[currentPhase] || 'npm run test:critical';
  
  if (isGate) {
    bash = `npm run build && powershell -File scripts/verify-build.ps1 && ${testCmd}`;
  } else if (isTag || taskId.includes('Tag') || writesTo.includes('git tag')) {
    bash = `git add -A && git commit -m "${currentPhase}-${taskId}: phase milestone" && git tag ${currentPhase.toLowerCase()}-${currentMS.toLowerCase() || 'complete'}`;
  } else if (writesTo.includes('Engine.ts') || writesTo.includes('Calculations.ts')) {
    // Engine implementation — build + test
    bash = `npm run build:fast && ${testCmd}`;
  } else if (writesTo.includes('Dispatcher') || writesTo.includes('dispatcher')) {
    // Dispatcher wiring
    bash = `npm run build:fast && node -e "const d=require('./dist/index.js'); console.log('Dispatcher wired OK')"`;
  } else if (writesTo.includes('test') || writesTo.includes('Test')) {
    // Test file creation
    bash = `npm run build:fast && ${testCmd}`;
  } else if (writesTo.includes('dist/')) {
    // Build output
    bash = `npm run build && powershell -File scripts/verify-build.ps1`;
  } else if (writesTo.includes('.md') || writesTo.includes('.json')) {
    // Doc/config — just verify build still passes
    bash = `npm run build:fast`;
  } else {
    // Default: build + phase test
    bash = `npm run build:fast && ${testCmd}`;
  }
  
  // Find insertion point — after step-by-step section or right after code block
  let insertAt = blockEnd + 1;
  for (let j = blockEnd + 1; j < Math.min(blockEnd + 30, lines.length); j++) {
    if (lines[j].match(/^####/) || lines[j].match(/^###/) || lines[j].match(/^---/)) {
      insertAt = j;
      break;
    }
    if (lines[j].match(/^\s*TASK:/)) {
      insertAt = j;
      break;
    }
    // Track past step-by-step, SUCCESS, logic chain sections
    if (lines[j].trim() === '' && j > blockEnd + 2) {
      // Check if next non-empty line is a new section
      for (let k = j + 1; k < Math.min(j + 3, lines.length); k++) {
        if (lines[k].match(/^####/) || lines[k].match(/^###/) || lines[k].match(/^---/) || lines[k].match(/^\s*TASK:/)) {
          insertAt = j + 1;
          break;
        }
      }
    }
    insertAt = j + 1;
  }
  
  insertions.push({
    line: insertAt,
    taskId: taskId,
    phase: currentPhase,
    bash: bash
  });
}

// Sort by line number descending so insertions don't shift earlier lines
insertions.sort((a, b) => b.line - a.line);

let added = 0;
for (const ins of insertions) {
  lines.splice(ins.line, 0, `**BASH:** \`${ins.bash}\``);
  added++;
}

fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
console.log(`Added ${added} BASH commands across ${new Set(insertions.map(i=>i.phase)).size} phases`);
insertions.reverse().forEach(i => console.log(`  ${i.phase} ${i.taskId} @ L${i.line}`));
