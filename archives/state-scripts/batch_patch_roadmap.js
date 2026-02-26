// batch_patch_roadmap.js — Fix all 46 missing metadata fields
// UTF-8 aware, line-number based patching
const fs = require('fs');
const path = 'C:\\PRISM\\mcp-server\\data\\docs\\roadmap\\PRISM_ROADMAP_v18.1.md';
const lines = fs.readFileSync(path, 'utf8').split('\n');
let patches = 0;
let currentPhase = '';
let currentPhaseLayer = 0;

// Phase → Layer mapping
const phaseLayers = {
  'R2': 2, 'R3': 3, 'R4': 6, 'R5': 7, 'R6': 8,
  'R7': 9, 'R8': 10, 'R9': 11, 'R10': 12, 'R11': 13,
  'R12': 14, 'R13': 15
};

// Phase → common paths
const phaseState = {
  'R3': { quality: 'tests/r3/intelligence-tests.ts results', tag: 'r3-intelligence' },
  'R4': { quality: 'state/results/R4_QUALITY_REPORT.json', tag: 'r4-enterprise' },
  'R5': { quality: 'state/results/R5_QUALITY_REPORT.json', tag: 'r5-postproc' },
  'R6': { quality: 'state/results/R6_QUALITY_REPORT.json', tag: 'r6-deploy' },
  'R7': { quality: 'state/results/R7_QUALITY_REPORT.json', tag: 'r7-pipeline' },
  'R8': { quality: 'state/results/R8_QUALITY_REPORT.json', tag: 'r8-plugins' },
  'R9': { quality: 'state/results/R9_QUALITY_REPORT.json', tag: 'r9-dsl' },
  'R10': { quality: 'state/results/R10_QUALITY_REPORT.json', tag: 'r10-ml' },
  'R11': { quality: 'state/results/R11_QUALITY_REPORT.json', tag: 'r11-ui' },
  'R12': { quality: 'state/results/R12_QUALITY_REPORT.json', tag: 'r12-twin' },
  'R13': { quality: 'state/results/R13_QUALITY_REPORT.json', tag: 'r13-saas-v1.0' },
};

function insertAfterLine(lineIdx, newLine) {
  lines.splice(lineIdx + 1, 0, newLine);
  patches++;
  return 1; // offset for subsequent inserts
}

for (let i = 0; i < lines.length; i++) {
  // Track current phase
  const phaseMatch = lines[i].match(/^## \d+\. (R\d+)/);
  if (phaseMatch) {
    currentPhase = phaseMatch[1];
    currentPhaseLayer = phaseLayers[currentPhase] || 0;
  }

  // Find TASK blocks
  const taskMatch = lines[i].match(/^\s*TASK: (MS\d+-\S+)/);
  if (!taskMatch) continue;
  
  const taskId = taskMatch[1];
  const taskLineIdx = i;
  
  // Scan the task block (next 20 lines until ```)
  let hasReads = false, hasWrites = false, hasProvides = false, hasLayer = false;
  let blockEnd = -1;
  for (let j = i + 1; j < Math.min(i + 25, lines.length); j++) {
    if (lines[j].match(/^```/)) { blockEnd = j; break; }
    if (lines[j].includes('READS_FROM:')) hasReads = true;
    if (lines[j].includes('WRITES_TO:')) hasWrites = true;
    if (lines[j].includes('PROVIDES:')) hasProvides = true;
    if (lines[j].includes('LAYER:')) hasLayer = true;
  }
  
  if (blockEnd === -1) continue; // malformed block
  
  const missing = [];
  if (!hasReads) missing.push('R');
  if (!hasWrites) missing.push('W');
  if (!hasProvides) missing.push('P');
  if (!hasLayer) missing.push('L');
  
  if (missing.length === 0) continue; // complete
  
  const ps = phaseState[currentPhase] || { quality: `state/results/${currentPhase}_QUALITY_REPORT.json`, tag: `${currentPhase.toLowerCase()}-complete` };
  const nextPhase = 'R' + (parseInt(currentPhase.replace('R','')) + 1);
  
  // Determine task type
  const isQualityScoring = lines[taskLineIdx - 2] && (
    lines[taskLineIdx - 2].includes('Quality Scoring') || 
    lines[taskLineIdx - 2].includes('quality scoring')
  );
  const isTag = lines[taskLineIdx - 2] && (
    lines[taskLineIdx - 2].includes('Tag') ||
    lines[taskLineIdx - 2].includes('Position')
  );
  const isGate = taskId.includes('GATE');
  
  // Insert missing fields before the closing ```
  let insertPoint = blockEnd - 1;
  let offset = 0;
  
  if (!hasLayer) {
    offset += insertAfterLine(insertPoint + offset, `  LAYER: ${currentPhaseLayer}`);
  }
  
  if (!hasReads) {
    let readsVal;
    if (isQualityScoring || isGate) {
      readsVal = `[tests/ (phase test results), dist/ (build artifacts)]`;
    } else if (isTag) {
      readsVal = `[${ps.quality}]`;
    } else {
      readsVal = `[see step-by-step for specific files]`;
    }
    offset += insertAfterLine(insertPoint + offset, `  READS_FROM: ${readsVal}`);
  }
  
  if (!hasWrites) {
    let writesVal;
    if (isQualityScoring) {
      writesVal = `[${ps.quality}]`;
    } else if (isTag) {
      writesVal = `[git tag ${ps.tag}, state/CURRENT_POSITION.md, state/ACTION_TRACKER.md]`;
    } else if (isGate) {
      writesVal = `[state/CALIBRATION_STATE.json]`;
    } else {
      writesVal = `[see step-by-step for target files]`;
    }
    offset += insertAfterLine(insertPoint + offset, `  WRITES_TO: ${writesVal}`);
  }
  
  if (!hasProvides) {
    let provVal;
    if (isTag) {
      provVal = `[${currentPhase} marked complete → ${nextPhase} dependency satisfied]`;
    } else if (isQualityScoring) {
      provVal = `[Ω score → tag task]`;
    } else if (isGate) {
      provVal = `[Gate passed → next milestone]`;
    } else {
      provVal = `[see PROVIDES in step-by-step]`;
    }
    offset += insertAfterLine(insertPoint + offset, `  PROVIDES: ${provVal}`);
  }
  
  console.log(`✅ L${i+1} ${taskId} (${currentPhase}) | +${missing.join('')} | type=${isQualityScoring?'QS':isTag?'TAG':isGate?'GATE':'IMPL'}`);
  
  // Skip past the block we just edited
  i = blockEnd + offset;
}

fs.writeFileSync(path, lines.join('\n'), 'utf8');
console.log(`\nTotal patches: ${patches} field insertions across ${currentPhase} phases`);
