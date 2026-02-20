const fs = require('fs');
const path = require('path');

const roadmapDir = 'C:\\PRISM\\mcp-server\\data\\docs\\roadmap';

// Read CURRENT_POSITION.md
const posFile = path.join(roadmapDir, 'CURRENT_POSITION.md');
const posContent = fs.readFileSync(posFile, 'utf8');
const posLines = posContent.split('\n');

const currentMs = posLines.find(l => l.startsWith('CURRENT_MS:'));
const lastComplete = posLines.find(l => l.startsWith('LAST_COMPLETE:'));
const phase = posLines.find(l => l.startsWith('PHASE:'));

console.log('=== CURRENT_POSITION.md ===');
console.log(currentMs || 'MISSING: CURRENT_MS');
console.log(lastComplete || 'MISSING: LAST_COMPLETE');
console.log(phase || 'MISSING: PHASE');

// Read ROADMAP_TRACKER.md - find last COMPLETE entry
const trackerFile = path.join(roadmapDir, 'ROADMAP_TRACKER.md');
const trackerContent = fs.readFileSync(trackerFile, 'utf8');
const completedEntries = trackerContent.match(/\[\d{4}-\d{2}-\d{2}\]\s+\S+\s+(COMPLETE|CONDITIONAL PASS)/g) || [];
const lastEntry = completedEntries[completedEntries.length - 1] || 'NONE';

console.log('\n=== ROADMAP_TRACKER.md ===');
console.log('Last COMPLETE entry: ' + lastEntry);
console.log('Total COMPLETE entries: ' + completedEntries.length);

// Cross-validate
const posLastMs = lastComplete ? lastComplete.split(':')[1].trim().split(' ')[0] : 'UNKNOWN';
const trackerLastMs = lastEntry !== 'NONE' ? lastEntry.match(/\]\s+(\S+)/)[1] : 'UNKNOWN';

console.log('\n=== CROSS-VALIDATION ===');
if (posLastMs === trackerLastMs) {
  console.log('PASS: CURRENT_POSITION and ROADMAP_TRACKER agree on last complete: ' + posLastMs);
} else {
  console.log('WARN: MISMATCH detected!');
  console.log('  CURRENT_POSITION says: ' + posLastMs);
  console.log('  ROADMAP_TRACKER says: ' + trackerLastMs);
  console.log('  ACTION: Use the LATER one (most recent date). Update the other file.');
}

// Check SUBSTEP fields exist
const hasSubstep = posContent.includes('SUBSTEP_PROGRESS:');
console.log('\nSUBSTEP tracking: ' + (hasSubstep ? 'PRESENT' : 'MISSING'));

// Verify phase file exists for current phase
const phaseStr = phase ? phase.split(':')[1].trim().split(' ')[0] : '';
const phaseFileMap = {
  'DA': 'PHASE_DA_DEV_ACCELERATION.md',
  'P0': 'PHASE_P0_ACTIVATION.md',
  'R1': 'PHASE_R1_REGISTRY.md', 'R2': 'PHASE_R2_SAFETY.md',
  'R3': 'PHASE_R3_CAMPAIGNS.md', 'R4': 'PHASE_R4_ENTERPRISE.md',
  'R5': 'PHASE_R5_VISUAL.md', 'R6': 'PHASE_R6_PRODUCTION.md',
  'R7': 'PHASE_R7_INTELLIGENCE.md', 'R8': 'PHASE_R8_EXPERIENCE.md',
  'R9': 'PHASE_R9_INTEGRATION.md', 'R10': 'PHASE_R10_REVOLUTION.md',
  'R11': 'PHASE_R11_PRODUCT.md',
};
const expectedFile = phaseFileMap[phaseStr];
if (expectedFile) {
  const exists = fs.existsSync(path.join(roadmapDir, expectedFile));
  console.log('Phase file for ' + phaseStr + ': ' + (exists ? 'EXISTS' : 'MISSING: ' + expectedFile));
} else {
  console.log('Could not determine phase file for: ' + phaseStr);
}

console.log('\n=== VALIDATION COMPLETE ===');
