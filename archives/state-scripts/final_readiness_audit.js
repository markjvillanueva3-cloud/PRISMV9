// final_readiness_audit.js — Complete roadmap v18.1 readiness check for Claude Code
const fs = require('fs');
const path = require('path');
const filePath = 'C:\\PRISM\\mcp-server\\data\\docs\\roadmap\\PRISM_ROADMAP_v18.1.md';
const lines = fs.readFileSync(filePath, 'utf8').split('\n');

const results = {
  totalTasks: 0,
  codeTasks: 0,
  chatTasks: 0,
  unknownExecutor: [],
  
  withBash: 0,
  codeWithoutBash: [],
  
  withProvides: 0,
  withReadsFrom: 0,
  withWritesTo: 0,
  withLayer: 0,
  withGate: 0,
  withExecutor: 0,
  withEstCalls: 0,
  
  missingFields: [],
  
  // File path validation
  badPaths: [],
  
  // Phase summary
  phases: {}
};

let phase = '', ms = '';

for (let i = 0; i < lines.length; i++) {
  const pm = lines[i].match(/^## \d+\. (R\d+)/);
  if (pm) phase = pm[1];
  
  const msm = lines[i].match(/^### (MS\d+)/);
  if (msm) ms = msm[1];
  
  const tm = lines[i].match(/^\s*TASK:\s*(MS\S+)/);
  if (!tm) continue;
  
  results.totalTasks++;
  const taskId = tm[1];
  const fullId = `${phase}-${taskId}`;
  
  if (!results.phases[phase]) results.phases[phase] = { total: 0, code: 0, chat: 0, bash: 0 };
  results.phases[phase].total++;
  
  // Parse block
  let blockEnd = -1;
  let isCode = false, isChat = false;
  let hasProvides = false, hasReads = false, hasWrites = false;
  let hasLayer = false, hasGate = false, hasExecutor = false, hasEstCalls = false;
  let writesTo = [];
  let readsFrom = [];
  
  for (let j = i+1; j < Math.min(i+30, lines.length); j++) {
    if (lines[j].trim().match(/^```\s*$/)) { blockEnd = j; break; }
    if (lines[j].includes('EXECUTOR: Code')) { isCode = true; hasExecutor = true; }
    if (lines[j].includes('EXECUTOR: Chat')) { isChat = true; hasExecutor = true; }
    if (lines[j].includes('PROVIDES:')) hasProvides = true;
    if (lines[j].includes('READS_FROM:')) { hasReads = true; readsFrom.push(lines[j]); }
    if (lines[j].includes('WRITES_TO:')) { hasWrites = true; writesTo.push(lines[j]); }
    if (lines[j].includes('LAYER:')) hasLayer = true;
    if (lines[j].match(/GATE:/)) hasGate = true;
    if (lines[j].includes('ESTIMATED_CALLS:')) hasEstCalls = true;
  }
  
  if (isCode) { results.codeTasks++; results.phases[phase].code++; }
  else if (isChat) { results.chatTasks++; results.phases[phase].chat++; }
  else results.unknownExecutor.push(fullId);
  
  if (hasProvides) results.withProvides++;
  if (hasReads) results.withReadsFrom++;
  if (hasWrites) results.withWritesTo++;
  if (hasLayer) results.withLayer++;
  if (hasGate) results.withGate++;
  if (hasExecutor) results.withExecutor++;
  if (hasEstCalls) results.withEstCalls++;
  
  // Check BASH
  let hasBash = false;
  if (blockEnd > -1) {
    for (let j = blockEnd; j < Math.min(blockEnd+25, lines.length); j++) {
      if (lines[j].includes('**BASH:**')) { hasBash = true; break; }
      if (j > blockEnd+2 && (lines[j].match(/^####/) || lines[j].match(/^###/) || lines[j].match(/^---/) || lines[j].match(/^\s*TASK:/))) break;
    }
  }
  if (hasBash) { results.withBash++; results.phases[phase].bash++; }
  else if (isCode) results.codeWithoutBash.push(fullId);
  
  // Missing fields
  let missing = [];
  if (!hasExecutor) missing.push('EXECUTOR');
  if (!hasProvides) missing.push('PROVIDES');
  if (!hasReads) missing.push('READS_FROM');
  if (!hasWrites) missing.push('WRITES_TO');
  if (!hasLayer) missing.push('LAYER');
  if (!hasGate) missing.push('GATE');
  if (missing.length > 0) results.missingFields.push({ task: fullId, missing });
  
  // Validate file paths in WRITES_TO
  const camelCaseEngines = ['manufacturingCalcEngine', 'advancedCalcEngine', 'toolpathCalcEngine', 
    'threadCalcEngine', 'safetyEngine', 'tenantEngine', 'bridgeEngine'];
  for (const line of [...writesTo, ...readsFrom]) {
    for (const bad of camelCaseEngines) {
      if (line.includes(bad)) results.badPaths.push({ task: fullId, bad, line: line.trim() });
    }
  }
}

// Check state files exist
const stateFiles = [
  'C:\\PRISM\\state\\CURRENT_POSITION.md',
  'C:\\PRISM\\state\\SWITCH_SIGNAL.md',
  'C:\\PRISM\\state\\CHAT_RESOLUTION.md',
  'C:\\PRISM\\state\\ACTION_TRACKER.md',
  'C:\\PRISM\\mcp-server\\data\\docs\\roadmap\\FILE_MAP.json',
];
const stateStatus = stateFiles.map(f => ({ file: f, exists: fs.existsSync(f) }));

// Check agent definitions exist
const agentFiles = [
  'C:\\PRISM\\mcp-server\\.claude\\agents\\safety-physics.md',
  'C:\\PRISM\\mcp-server\\.claude\\agents\\implementer.md',
  'C:\\PRISM\\mcp-server\\.claude\\agents\\verifier.md',
  'C:\\PRISM\\mcp-server\\.claude\\settings.json',
];
const agentStatus = agentFiles.map(f => ({ file: f, exists: fs.existsSync(f) }));

// Check hook scripts exist
const hookFiles = [
  'C:\\PRISM\\mcp-server\\scripts\\hooks\\pre-edit-safety-gate.ps1',
  'C:\\PRISM\\mcp-server\\scripts\\hooks\\anti-regression-gate.ps1',
  'C:\\PRISM\\mcp-server\\scripts\\hooks\\post-build-verify.ps1',
  'C:\\PRISM\\mcp-server\\scripts\\hooks\\teammate-quality-gate.ps1',
  'C:\\PRISM\\mcp-server\\scripts\\hooks\\teammate-reassign.ps1',
];
const hookStatus = hookFiles.map(f => ({ file: f, exists: fs.existsSync(f) }));

// Print report
console.log('═══════════════════════════════════════════════════════════');
console.log('  PRISM ROADMAP v18.1 — FINAL READINESS AUDIT');
console.log('═══════════════════════════════════════════════════════════\n');

console.log('TASK INVENTORY');
console.log(`  Total tasks:     ${results.totalTasks}`);
console.log(`  Code tasks:      ${results.codeTasks}`);
console.log(`  Chat tasks:      ${results.chatTasks}`);
console.log(`  Unknown exec:    ${results.unknownExecutor.length}`);
if (results.unknownExecutor.length) console.log(`    ${results.unknownExecutor.join(', ')}`);

console.log('\nMETADATA COMPLETENESS');
console.log(`  EXECUTOR:        ${results.withExecutor}/${results.totalTasks}`);
console.log(`  PROVIDES:        ${results.withProvides}/${results.totalTasks}`);
console.log(`  READS_FROM:      ${results.withReadsFrom}/${results.totalTasks}`);
console.log(`  WRITES_TO:       ${results.withWritesTo}/${results.totalTasks}`);
console.log(`  LAYER:           ${results.withLayer}/${results.totalTasks}`);
console.log(`  GATE:            ${results.withGate}/${results.totalTasks}`);
console.log(`  ESTIMATED_CALLS: ${results.withEstCalls}/${results.totalTasks}`);
console.log(`  BASH (Code only): ${results.withBash}/${results.codeTasks}`);

console.log('\nMISSING FIELDS');
if (results.missingFields.length === 0) console.log('  ✅ ALL TASKS COMPLETE');
else results.missingFields.forEach(m => console.log(`  ❌ ${m.task}: missing ${m.missing.join(', ')}`));

console.log('\nBAD FILE PATHS (camelCase → should be PascalCase)');
if (results.badPaths.length === 0) console.log('  ✅ NO BAD PATHS');
else results.badPaths.forEach(b => console.log(`  ❌ ${b.task}: "${b.bad}" found`));

console.log('\nCODE TASKS WITHOUT BASH');
if (results.codeWithoutBash.length === 0) console.log('  ✅ ALL CODE TASKS HAVE BASH');
else results.codeWithoutBash.forEach(t => console.log(`  ❌ ${t}`));

console.log('\nSTATE FILES');
stateStatus.forEach(s => console.log(`  ${s.exists ? '✅' : '❌'} ${s.file}`));

console.log('\nAGENT DEFINITIONS');
agentStatus.forEach(s => console.log(`  ${s.exists ? '✅' : '❌'} ${s.file}`));

console.log('\nHOOK SCRIPTS');
hookStatus.forEach(s => console.log(`  ${s.exists ? '✅' : '❌'} ${s.file}`));

console.log('\nPHASE SUMMARY');
console.log('  Phase | Total | Code | Chat | BASH | Coverage');
console.log('  ------|-------|------|------|------|--------');
Object.entries(results.phases).forEach(([p, d]) => {
  const cov = d.code > 0 ? Math.round(100*d.bash/d.code) : 100;
  console.log(`  ${p.padEnd(6)}| ${String(d.total).padEnd(6)}| ${String(d.code).padEnd(5)}| ${String(d.chat).padEnd(5)}| ${String(d.bash).padEnd(5)}| ${cov}%`);
});

// Overall score
const metaScore = (results.withExecutor + results.withProvides + results.withReadsFrom + 
  results.withWritesTo + results.withLayer + results.withGate) / (results.totalTasks * 6);
const bashScore = results.codeTasks > 0 ? results.withBash / results.codeTasks : 1;
const infraScore = (stateStatus.filter(s=>s.exists).length + agentStatus.filter(s=>s.exists).length + 
  hookStatus.filter(s=>s.exists).length) / (stateStatus.length + agentStatus.length + hookStatus.length);
const overall = (metaScore * 0.4 + bashScore * 0.35 + infraScore * 0.25);

console.log('\n═══════════════════════════════════════════════════════════');
console.log(`  READINESS SCORE: ${(overall * 100).toFixed(1)}%`);
console.log(`    Metadata:  ${(metaScore * 100).toFixed(1)}%`);
console.log(`    BASH:      ${(bashScore * 100).toFixed(1)}%`);
console.log(`    Infra:     ${(infraScore * 100).toFixed(1)}%`);
console.log(`  VERDICT: ${overall >= 0.90 ? '✅ READY FOR CLAUDE CODE' : overall >= 0.75 ? '⚠️ MOSTLY READY — minor gaps' : '❌ NOT READY — blocking issues'}`);
console.log('═══════════════════════════════════════════════════════════');
