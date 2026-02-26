const fs = require('fs');
const dir = 'C:\\PRISM\\mcp-server\\data\\docs\\roadmap';

const phases = [
  {file:'PHASE_DA_DEV_ACCELERATION.md', skills:'prism-session-master, prism-anti-regression, prism-error-handling', hooks:'DISPATCH, FILE, STATE', data:'C:\\PRISM\\skills-consolidated, C:\\PRISM\\mcp-server\\scripts'},
  {file:'PHASE_R1_REGISTRY.md', skills:'prism-material-physics, prism-cutting-mechanics, prism-cutting-tools', hooks:'DISPATCH, FILE, STATE, DATA', data:'C:\\PRISM\\data\\materials, C:\\PRISM\\extracted\\machines, C:\\PRISM\\extracted\\tools'},
  {file:'PHASE_R2_SAFETY.md', skills:'prism-safety-framework, prism-master-equation, prism-cutting-mechanics, prism-material-physics', hooks:'DISPATCH, FILE, STATE, CALC, FORMULA, SAFETY', data:'C:\\PRISM\\data\\materials, C:\\PRISM\\mcp-server\\src\\engines'},
  {file:'PHASE_R3_CAMPAIGNS.md', skills:'prism-formula-evolution, prism-cam-strategies, prism-combination-engine, prism-signal-processing', hooks:'DISPATCH, FILE, STATE, CALC, FORMULA, INTEL', data:'C:\\PRISM\\data\\materials, C:\\PRISM\\mcp-server\\src\\engines'},
  {file:'PHASE_R4_ENTERPRISE.md', skills:'prism-hook-system, prism-design-patterns, prism-codebase-packaging', hooks:'DISPATCH, FILE, STATE, AGENT, ORCH, BATCH', data:'C:\\PRISM\\mcp-server\\src\\dispatchers'},
  {file:'PHASE_R5_VISUAL.md', skills:'prism-design-patterns, prism-perf-patterns', hooks:'DISPATCH, FILE, STATE, BATCH', data:'C:\\PRISM\\mcp-server\\src'},
  {file:'PHASE_R6_PRODUCTION.md', skills:'prism-anti-regression, prism-safety-framework, prism-perf-patterns', hooks:'ALL (production = every hook active)', data:'C:\\PRISM\\mcp-server'},
  {file:'PHASE_R7_INTELLIGENCE.md', skills:'prism-master-equation, prism-material-physics, prism-cutting-mechanics, prism-process-optimizer', hooks:'ALL', data:'C:\\PRISM\\data\\materials, C:\\PRISM\\mcp-server\\src\\engines'},
  {file:'PHASE_R8_EXPERIENCE.md', skills:'prism-skill-orchestrator, prism-prompt-eng, prism-session-master', hooks:'ALL', data:'C:\\PRISM\\skills-consolidated, C:\\PRISM\\mcp-server\\src'},
  {file:'PHASE_R9_INTEGRATION.md', skills:'prism-design-patterns, prism-codebase-packaging, prism-hook-system', hooks:'ALL', data:'C:\\PRISM\\mcp-server\\src'},
  {file:'PHASE_R10_REVOLUTION.md', skills:'prism-master-equation, prism-material-physics, prism-process-optimizer', hooks:'ALL', data:'C:\\PRISM\\data\\materials, C:\\PRISM\\mcp-server\\src\\engines'},
  {file:'PHASE_R11_PRODUCT.md', skills:'prism-codebase-packaging, prism-perf-patterns, prism-anti-regression', hooks:'ALL', data:'C:\\PRISM\\mcp-server'},
];

let results = [];
phases.forEach(p => {
  const fp = dir + '\\' + p.file;
  let c = fs.readFileSync(fp, 'utf8');
  
  if (c.includes('RECOMMENDED_SKILLS:')) {
    results.push('SKIP: ' + p.file + ' (already has)');
    return;
  }
  
  const block = `### RECOMMENDED_SKILLS: ${p.skills}\n### HOOKS_EXPECTED: ${p.hooks}\n### DATA_PATHS: ${p.data}\n`;
  
  // Find the first "# " or "## " heading line, insert block after it
  const lines = c.split('\n');
  let insertAfter = -1;
  for (let i = 0; i < Math.min(lines.length, 20); i++) {
    if (lines[i].startsWith('# PHASE') || lines[i].startsWith('## PHASE') || lines[i].match(/^#\s+PRISM/)) {
      insertAfter = i;
      break;
    }
  }
  
  if (insertAfter === -1) {
    // Try finding any heading
    for (let i = 0; i < Math.min(lines.length, 30); i++) {
      if (lines[i].startsWith('#')) {
        insertAfter = i;
        break;
      }
    }
  }
  
  if (insertAfter >= 0) {
    lines.splice(insertAfter + 1, 0, block);
    fs.writeFileSync(fp, lines.join('\n'), 'utf8');
    results.push('PATCHED: ' + p.file + ' (after line ' + insertAfter + ': "' + lines[insertAfter].substring(0,60) + '")');
  } else {
    results.push('FAIL: ' + p.file);
  }
});

results.forEach(r => console.log(r));
