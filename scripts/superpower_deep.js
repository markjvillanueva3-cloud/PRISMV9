const fs = require('fs');
const path = require('path');

console.log('=== UNTAPPED SUPERPOWER SCAN ===\n');

// 1. ToolpathStrategyRegistry — 4450 lines is MASSIVE. What strategies exist?
console.log('--- TOOLPATH STRATEGY REGISTRY (4450 lines) ---');
const tpsr = fs.readFileSync('C:\\PRISM\\mcp-server\\src\\registries\\ToolpathStrategyRegistry.ts', 'utf8');
const strategies = [...tpsr.matchAll(/id:\s*["']([^"']+)["']/g)].map(m => m[1]);
console.log(`  Strategies: ${strategies.length}`);
strategies.forEach(s => console.log(`    ${s}`));

// 2. ToolBreakageEngine — 1072 lines
console.log('\n--- TOOL BREAKAGE ENGINE (1072 lines) ---');
const tbe = fs.readFileSync('C:\\PRISM\\mcp-server\\src\\engines\\ToolBreakageEngine.ts', 'utf8');
const tbeExports = [...tbe.matchAll(/export\s+(?:function|class|interface|type)\s+(\w+)/g)].map(m => m[1]);
console.log(`  Exports: ${tbeExports.join(', ')}`);

// 3. WorkholdingEngine — 1410 lines  
console.log('\n--- WORKHOLDING ENGINE (1410 lines) ---');
const whe = fs.readFileSync('C:\\PRISM\\mcp-server\\src\\engines\\WorkholdingEngine.ts', 'utf8');
const wheExports = [...whe.matchAll(/export\s+(?:function|class|interface|type)\s+(\w+)/g)].map(m => m[1]);
console.log(`  Exports: ${wheExports.join(', ')}`);

// 4. SpindleProtectionEngine — 902 lines
console.log('\n--- SPINDLE PROTECTION ENGINE (902 lines) ---');
const spe = fs.readFileSync('C:\\PRISM\\mcp-server\\src\\engines\\SpindleProtectionEngine.ts', 'utf8');
const speExports = [...spe.matchAll(/export\s+(?:function|class|interface|type)\s+(\w+)/g)].map(m => m[1]);
console.log(`  Exports: ${speExports.join(', ')}`);

// 5. CollisionEngine — 1924 lines
console.log('\n--- COLLISION ENGINE (1924 lines) ---');
const ce = fs.readFileSync('C:\\PRISM\\mcp-server\\src\\engines\\CollisionEngine.ts', 'utf8');
const ceExports = [...ce.matchAll(/export\s+(?:function|class|interface|type)\s+(\w+)/g)].map(m => m[1]);
console.log(`  Exports: ${ceExports.join(', ')}`);

// 6. CoolantValidationEngine — 753 lines
console.log('\n--- COOLANT VALIDATION ENGINE (753 lines) ---');
const cve = fs.readFileSync('C:\\PRISM\\mcp-server\\src\\engines\\CoolantValidationEngine.ts', 'utf8');
const cveExports = [...cve.matchAll(/export\s+(?:function|class|interface|type)\s+(\w+)/g)].map(m => m[1]);
console.log(`  Exports: ${cveExports.join(', ')}`);

// 7. Skills with manufacturing knowledge (not dev patterns)
console.log('\n--- MANUFACTURING KNOWLEDGE SKILLS ---');
const skillDir = 'C:\\PRISM\\skills-consolidated';
const mfgSkills = ['prism-cutting-mechanics', 'prism-material-physics', 'prism-cam-strategies', 
  'prism-speed-feed-engine', 'prism-process-optimizer', 'prism-cutting-tools', 'prism-tool-selector',
  'prism-signal-processing', 'prism-formula-evolution', 'prism-combination-engine', 'prism-master-equation',
  'prism-workholding-strategy', 'prism-gcode-reference', 'prism-fanuc-programming', 'prism-siemens-programming',
  'prism-heidenhain-programming', 'prism-post-processor-reference', 'prism-threading-mastery',
  'prism-controller-quick-ref', 'prism-safety-framework', 'prism-uncertainty-propagation',
  'prism-performance-patterns', 'prism-algorithm-selector', 'prism-expert-personas',
  'prism-synergy-calculator', 'prism-predictive-maintenance', 'prism-unit-converter'];
let totalKB = 0;
for (const sk of mfgSkills) {
  const fp = path.join(skillDir, sk, 'SKILL.md');
  try {
    const sz = fs.statSync(fp).size;
    totalKB += sz;
    console.log(`  ${sk}: ${(sz/1024).toFixed(0)}KB`);
  } catch(e) {}
}
console.log(`  TOTAL manufacturing knowledge: ${(totalKB/1024).toFixed(0)}KB`);

// 8. Check what dispatchers exist but DON'T have wired actions yet
console.log('\n--- DISPATCHER → ENGINE WIRING GAPS ---');
const dispDir = 'C:\\PRISM\\mcp-server\\src\\tools\\dispatchers';
for (const f of fs.readdirSync(dispDir).filter(f => f.endsWith('Dispatcher.ts'))) {
  const content = fs.readFileSync(path.join(dispDir, f), 'utf8');
  const cases = [...content.matchAll(/case\s+["'](\w+)["']/g)].map(m => m[1]);
  console.log(`  ${f}: ${cases.length} actions`);
}

// 9. Check ThreadCalculationEngine
console.log('\n--- THREAD CALCULATION ENGINE ---');
const tce = fs.readFileSync('C:\\PRISM\\mcp-server\\src\\engines\\ThreadCalculationEngine.ts', 'utf8');
const tceMethods = [...tce.matchAll(/(?:public|static)\s+(\w+)\s*\(/g)].map(m => m[1]);
console.log(`  Methods: ${tceMethods.join(', ')}`);

// 10. PFP Engine (Predictive Failure Prevention)
console.log('\n--- PFP ENGINE ---');
const pfp = fs.readFileSync('C:\\PRISM\\mcp-server\\src\\engines\\PFPEngine.ts', 'utf8');
const pfpMethods = [...pfp.matchAll(/(?:public|async)\s+(\w+)\s*\(/g)].map(m => m[1]);
console.log(`  Methods: ${pfpMethods.join(', ')}`);
