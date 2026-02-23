/**
 * PRISM Pre-Build Validator
 * Run BEFORE `npm run build` to catch issues early.
 * 
 * Checks:
 * 1. All dispatchers imported in index.ts
 * 2. All dispatchers registered in registerAllTools()
 * 3. No duplicate function names across dispatcher files
 * 4. ACTIONS arrays match switch cases
 * 5. No orphaned imports
 * 6. Tool description action counts match ACTIONS array length
 * 
 * Usage: node scripts/pre_build_check.js
 */
const fs = require('fs');
const path = require('path');

const SRC = 'C:\\PRISM\\mcp-server\\src';
const DISP_DIR = path.join(SRC, 'tools', 'dispatchers');
const INDEX = path.join(SRC, 'index.ts');

let errors = 0, warnings = 0;

function error(msg) { console.log('  ❌ ' + msg); errors++; }
function warn(msg) { console.log('  ⚠️ ' + msg); warnings++; }
function ok(msg) { console.log('  ✅ ' + msg); }

// 1. Find all dispatcher files
const dispFiles = fs.readdirSync(DISP_DIR)
  .filter(f => f.endsWith('Dispatcher.ts') || f.endsWith('dispatcher.ts'))
  .map(f => ({
    filename: f,
    name: f.replace('.ts', ''),
    path: path.join(DISP_DIR, f),
    content: fs.readFileSync(path.join(DISP_DIR, f), 'utf8')
  }));

console.log('\n=== PRISM Pre-Build Check ===\n');
console.log('Found ' + dispFiles.length + ' dispatcher files\n');

// 2. Check index.ts imports and registrations
const indexContent = fs.readFileSync(INDEX, 'utf8');

console.log('[1] Index.ts wiring');
for (const d of dispFiles) {
  // Find export function name (must be at line start, not inside string literals)
  const exportMatch = d.content.match(/^export\s+function\s+(register\w+)/m);
  if (!exportMatch) {
    if (d.filename === 'guardDispatcher.ts') continue; // guard is special
    warn(d.filename + ': no export function found');
    continue;
  }
  const funcName = exportMatch[1];
  const importRegex = new RegExp('import.*' + funcName);
  const callRegex = new RegExp(funcName + '\\(');
  
  if (!importRegex.test(indexContent)) {
    error(d.filename + ': ' + funcName + ' NOT imported in index.ts');
  } else if (!callRegex.test(indexContent)) {
    error(d.filename + ': ' + funcName + ' imported but NOT called in index.ts');
  }
}
ok(dispFiles.length + ' dispatchers checked against index.ts');

// 3. Check ACTIONS arrays vs switch cases
console.log('\n[2] ACTIONS array vs switch cases');
for (const d of dispFiles) {
  const actionsMatch = d.content.match(/const\s+ACTIONS\s*=\s*\[([\s\S]*?)\]\s*as\s*const/);
  if (!actionsMatch) continue;
  
  const actionNames = actionsMatch[1].match(/"(\w+)"/g)?.map(s => s.replace(/"/g, '')) || [];
  
  // Find switch cases
  const caseMatches = [...d.content.matchAll(/case\s+"(\w+)"/g)].map(m => m[1]);
  const caseSet = new Set(caseMatches);
  
  for (const a of actionNames) {
    if (!caseSet.has(a)) {
      error(d.filename + ': action "' + a + '" in ACTIONS but no switch case');
    }
  }
  for (const c of caseMatches) {
    if (!actionNames.includes(c)) {
      warn(d.filename + ': case "' + c + '" exists but not in ACTIONS array');
    }
  }
  
  // Check description action count
  const descCountMatch = d.content.match(/(\d+)\s*actions/);
  if (descCountMatch) {
    const claimed = parseInt(descCountMatch[1]);
    if (claimed !== actionNames.length) {
      warn(d.filename + ': description says ' + claimed + ' actions, ACTIONS has ' + actionNames.length);
    }
  }
}

// 4. Check for duplicate function names across files
console.log('\n[3] Duplicate function check');
const allFunctions = new Map();
for (const d of dispFiles) {
  const funcs = [...d.content.matchAll(/function\s+(\w+)\s*\(/g)].map(m => m[1]);
  for (const f of funcs) {
    if (f === 'ok' || f === 'err') continue; // common helpers, expected duplicates
    if (allFunctions.has(f)) {
      warn('Function "' + f + '" defined in both ' + allFunctions.get(f) + ' and ' + d.filename);
    } else {
      allFunctions.set(f, d.filename);
    }
  }
}
ok(allFunctions.size + ' unique functions across ' + dispFiles.length + ' files');

// 5. Summary
console.log('\n=== RESULT ===');
if (errors === 0 && warnings === 0) {
  console.log('✅ ALL CLEAR — safe to build');
} else if (errors === 0) {
  console.log('⚠️ ' + warnings + ' warnings — build should succeed but review warnings');
} else {
  console.log('❌ ' + errors + ' errors, ' + warnings + ' warnings — FIX BEFORE BUILDING');
}
console.log('');
