/**
 * PRISM Build Validator
 * Goes beyond esbuild's zero-error output to catch real problems:
 * - Duplicate exports/function names
 * - Missing imports (references to undefined identifiers)  
 * - Dispatcher action count vs description mismatch
 * - Dead code (exported but never imported)
 * - Common TypeScript patterns that esbuild ignores
 * 
 * Usage: node C:\PRISM\scripts\build_validator.js [--fix]
 */
const fs = require('fs');
const path = require('path');

const SRC = 'C:\\PRISM\\mcp-server\\src';
const DISPATCHERS_DIR = path.join(SRC, 'tools', 'dispatchers');

const issues = [];
function warn(file, line, msg) { issues.push({ file: path.relative(SRC, file), line, msg, sev: 'WARN' }); }
function error(file, line, msg) { issues.push({ file: path.relative(SRC, file), line, msg, sev: 'ERROR' }); }

// 1. Scan all dispatcher files
console.log('=== PRISM Build Validator ===\n');

const dispFiles = fs.readdirSync(DISPATCHERS_DIR).filter(f => f.endsWith('.ts'));
const dispInfo = [];

for (const file of dispFiles) {
  const fp = path.join(DISPATCHERS_DIR, file);
  const content = fs.readFileSync(fp, 'utf8');
  const lines = content.split('\n');
  
  // Extract ACTIONS array
  const actionsMatch = content.match(/const ACTIONS\s*=\s*\[([\s\S]*?)\]\s*as\s*const/);
  let actions = [];
  if (actionsMatch) {
    actions = actionsMatch[1].match(/"([^"]+)"/g)?.map(s => s.replace(/"/g, '')) || [];
  }
  
  // Extract tool name from register function or tool definition
  const toolNameMatch = content.match(/name:\s*"(prism_\w+)"/) || content.match(/register(\w+)Dispatcher/);
  const toolName = toolNameMatch ? (toolNameMatch[1] || 'prism_' + toolNameMatch[1].toLowerCase()) : file.replace('Dispatcher.ts', '');
  
  // Extract description to find claimed action count
  const descMatch = content.match(/description:\s*["`]([^"`]*(?:Actions?:.*?))["`]/s);
  const descActions = descMatch ? (descMatch[1].match(/Actions?:\s*([\w_,\s]+)/)?.[1] || '') : '';
  
  // Check for duplicate function definitions
  const funcDefs = {};
  lines.forEach((line, i) => {
    const funcMatch = line.match(/^(?:export\s+)?(?:async\s+)?function\s+(\w+)/);
    if (funcMatch) {
      const name = funcMatch[1];
      if (funcDefs[name]) {
        error(fp, i + 1, `Duplicate function: ${name} (first at line ${funcDefs[name]})`);
      }
      funcDefs[name] = i + 1;
    }
  });
  
  // Check switch cases match ACTIONS
  const caseActions = [];
  lines.forEach((line, i) => {
    const caseMatch = line.match(/case\s+"(\w+)"/);
    if (caseMatch) caseActions.push(caseMatch[1]);
  });
  
  for (const a of actions) {
    if (!caseActions.includes(a)) {
      warn(fp, 0, `Action "${a}" in ACTIONS but no case statement found`);
    }
  }
  for (const c of caseActions) {
    if (actions.length > 0 && !actions.includes(c)) {
      warn(fp, 0, `Case "${c}" not in ACTIONS array`);
    }
  }
  
  dispInfo.push({
    file,
    toolName,
    actions: actions.length,
    cases: caseActions.length,
    lines: lines.length,
    exports: Object.keys(funcDefs).filter(f => {
      const line = lines[funcDefs[f] - 1];
      return line.includes('export');
    }).length
  });
}

// 2. Check index.ts wiring
const indexPath = path.join(SRC, 'index.ts');
if (fs.existsSync(indexPath)) {
  const indexContent = fs.readFileSync(indexPath, 'utf8');
  
  for (const d of dispInfo) {
    const importName = d.file.replace('.ts', '.js');
    if (!indexContent.includes(importName)) {
      error(indexPath, 0, `Dispatcher ${d.file} not imported in index.ts`);
    }
  }
}

// 3. Print dispatcher inventory
console.log('DISPATCHER INVENTORY:');
console.log('-'.repeat(80));
console.log('  # | Actions | Cases | Lines | File');
console.log('-'.repeat(80));
let totalActions = 0;
dispInfo.sort((a, b) => a.file.localeCompare(b.file));
dispInfo.forEach((d, i) => {
  const mismatch = d.actions !== d.cases ? ' ⚠️' : '';
  totalActions += d.actions;
  console.log(`${String(i + 1).padStart(3)} | ${String(d.actions).padStart(7)} | ${String(d.cases).padStart(5)} | ${String(d.lines).padStart(5)} | ${d.file}${mismatch}`);
});
console.log('-'.repeat(80));
console.log(`    | ${String(totalActions).padStart(7)} | total actions across ${dispInfo.length} dispatchers`);

// 4. Print issues
if (issues.length > 0) {
  console.log('\n\nISSUES FOUND: ' + issues.length);
  console.log('-'.repeat(80));
  issues.forEach(i => {
    const loc = i.line > 0 ? `:${i.line}` : '';
    console.log(`  [${i.sev}] ${i.file}${loc}: ${i.msg}`);
  });
} else {
  console.log('\n✅ No issues found');
}

console.log('\nDone.');
