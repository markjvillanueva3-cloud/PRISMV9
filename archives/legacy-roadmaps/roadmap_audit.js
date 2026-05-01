const fs = require('fs');
const path = require('path');

console.log('=== COMPREHENSIVE FILE STATE AUDIT ===\n');

// 1. Safety tool handlers — exact function signatures
const toolFiles = {
  'toolBreakageTools.ts': 'C:\\PRISM\\mcp-server\\src\\tools\\toolBreakageTools.ts',
  'workholdingTools.ts': 'C:\\PRISM\\mcp-server\\src\\tools\\workholdingTools.ts',
  'spindleProtectionTools.ts': 'C:\\PRISM\\mcp-server\\src\\tools\\spindleProtectionTools.ts',
  'collisionTools.ts': 'C:\\PRISM\\mcp-server\\src\\tools\\collisionTools.ts',
  'coolantValidationTools.ts': 'C:\\PRISM\\mcp-server\\src\\tools\\coolantValidationTools.ts',
  'threadTools.ts': 'C:\\PRISM\\mcp-server\\src\\tools\\threadTools.ts'
};

for (const [name, fp] of Object.entries(toolFiles)) {
  const content = fs.readFileSync(fp, 'utf8');
  const lines = content.split('\n').length;
  
  // Get the main dispatch function signature
  const handlers = [...content.matchAll(/export\s+async\s+function\s+(\w+)\s*\(([^)]*)\)/g)];
  const inputSchemas = [...content.matchAll(/inputSchema:\s*\{[^}]*properties:\s*\{([^}]*)\}/gs)];
  
  console.log(`${name} (${lines} lines):`);
  handlers.forEach(h => {
    console.log(`  handler: ${h[1]}(${h[2].substring(0, 60)})`);
  });
  
  // Get required params per action
  const actions = [...content.matchAll(/case\s+['"](\w+)['"]/g)].map(m => m[1]);
  if (actions.length > 0) console.log(`  actions: ${actions.join(', ')}`);
  console.log();
}

// 2. Safety dispatcher current state
console.log('--- SAFETY DISPATCHER ---');
const sd = fs.readFileSync('C:\\PRISM\\mcp-server\\src\\tools\\dispatchers\\safetyDispatcher.ts', 'utf8');
console.log(`Lines: ${sd.split('\n').length}`);
console.log(`Has normalization: ${sd.includes('toUpperCase')}`);
console.log(`Has tool defaults: ${sd.includes('shankDiameter')}`);

// 3. Thread dispatcher current state
console.log('\n--- THREAD DISPATCHER ---');
const td = fs.readFileSync('C:\\PRISM\\mcp-server\\src\\tools\\dispatchers\\threadDispatcher.ts', 'utf8');
console.log(`Lines: ${td.split('\n').length}`);

// 4. Data dispatcher — where to add job_planner
console.log('\n--- DATA DISPATCHER ---');
const dd = fs.readFileSync('C:\\PRISM\\mcp-server\\src\\tools\\dispatchers\\dataDispatcher.ts', 'utf8');
console.log(`Lines: ${dd.split('\n').length}`);
const ddActions = [...dd.matchAll(/case\s+["'](\w+)["']/g)].map(m => m[1]);
console.log(`Actions: ${ddActions.length} — ${ddActions.join(', ')}`);

// 5. Calc dispatcher
console.log('\n--- CALC DISPATCHER ---');
const cd = fs.readFileSync('C:\\PRISM\\mcp-server\\src\\tools\\dispatchers\\calcDispatcher.ts', 'utf8');
console.log(`Lines: ${cd.split('\n').length}`);
const cdActions = [...cd.matchAll(/case\s+["'](\w+)["']/g)].map(m => m[1]);
console.log(`Actions: ${cdActions.length} — ${cdActions.join(', ')}`);

// 6. Toolpath dispatcher
console.log('\n--- TOOLPATH DISPATCHER ---');
const tpd = fs.readFileSync('C:\\PRISM\\mcp-server\\src\\tools\\dispatchers\\toolpathDispatcher.ts', 'utf8');
console.log(`Lines: ${tpd.split('\n').length}`);
const tpdActions = [...tpd.matchAll(/case\s+["'](\w+)["']/g)].map(m => m[1]);
console.log(`Actions: ${tpdActions.length} — ${tpdActions.join(', ')}`);

// 7. Engine method inventory for wiring
console.log('\n--- ENGINE CLASSES (methods available for wiring) ---');
const engines = [
  ['ToolBreakageEngine', 'C:\\PRISM\\mcp-server\\src\\engines\\ToolBreakageEngine.ts'],
  ['WorkholdingEngine', 'C:\\PRISM\\mcp-server\\src\\engines\\WorkholdingEngine.ts'],
  ['SpindleProtectionEngine', 'C:\\PRISM\\mcp-server\\src\\engines\\SpindleProtectionEngine.ts'],
  ['CollisionEngine', 'C:\\PRISM\\mcp-server\\src\\engines\\CollisionEngine.ts'],
  ['CoolantValidationEngine', 'C:\\PRISM\\mcp-server\\src\\engines\\CoolantValidationEngine.ts'],
];
for (const [name, fp] of engines) {
  const content = fs.readFileSync(fp, 'utf8');
  // Find class methods
  const methods = [...content.matchAll(/(?:public|async|private)\s+(?:async\s+)?(\w+)\s*\(/g)].map(m => m[1]).filter(m => !['constructor'].includes(m));
  console.log(`${name}: ${methods.join(', ')}`);
}

// 8. What the toolpath tool functions look like
console.log('\n--- TOOLPATH TOOL FUNCTIONS ---');
const tpToolsDir = 'C:\\PRISM\\mcp-server\\src\\tools';
for (const f of fs.readdirSync(tpToolsDir).filter(f => f.includes('toolpath') && f.endsWith('.ts'))) {
  const content = fs.readFileSync(path.join(tpToolsDir, f), 'utf8');
  const exports = [...content.matchAll(/export\s+(?:async\s+)?function\s+(\w+)/g)].map(m => m[1]);
  console.log(`  ${f}: ${exports.join(', ')}`);
}
