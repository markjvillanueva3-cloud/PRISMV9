/**
 * PRISM Function Map
 * Shows all function/class/const signatures in a file with line numbers.
 * Saves 3-4 tool calls every time I need to find insertion points.
 * 
 * Usage: node C:\PRISM\scripts\func_map.js <filepath> [--exports-only]
 * 
 * Example: node scripts/func_map.js src/tools/dispatchers/sessionDispatcher.ts
 */
const fs = require('fs');
const path = require('path');

const target = process.argv[2];
const exportsOnly = process.argv.includes('--exports-only');

if (!target) {
  console.log('Usage: node func_map.js <filepath> [--exports-only]');
  console.log('  Shows function signatures with line numbers.');
  console.log('\nExamples:');
  console.log('  node scripts/func_map.js src/tools/dispatchers/sessionDispatcher.ts');
  console.log('  node scripts/func_map.js src/index.ts --exports-only');
  process.exit(1);
}

// Resolve path
let fp = target;
if (!path.isAbsolute(fp)) fp = path.join('C:\\PRISM\\mcp-server', fp);
if (!fs.existsSync(fp)) {
  // Try adding .ts
  if (fs.existsSync(fp + '.ts')) fp += '.ts';
  else { console.error('File not found: ' + fp); process.exit(1); }
}

const content = fs.readFileSync(fp, 'utf8');
const lines = content.split('\n');
const filename = path.basename(fp);

console.log(`\n=== ${filename} (${lines.length} lines) ===\n`);

const entries = [];

lines.forEach((line, i) => {
  const ln = i + 1;
  const trimmed = line.trimStart();
  
  // Functions
  const funcMatch = trimmed.match(/^(export\s+)?(async\s+)?function\s+(\w+)\s*(<[^>]*>)?\s*\(([^)]*)\)/);
  if (funcMatch) {
    if (exportsOnly && !funcMatch[1]) return;
    const exp = funcMatch[1] ? 'export ' : '';
    const async_ = funcMatch[2] || '';
    const params = funcMatch[5].length > 60 ? funcMatch[5].substring(0, 57) + '...' : funcMatch[5];
    entries.push({ ln, text: `${exp}${async_}function ${funcMatch[3]}(${params})`, type: 'func' });
    return;
  }
  
  // Arrow functions assigned to const
  const arrowMatch = trimmed.match(/^(export\s+)?(const|let)\s+(\w+)\s*(?::\s*\w+)?\s*=\s*(?:async\s*)?\(/);
  if (arrowMatch) {
    if (exportsOnly && !arrowMatch[1]) return;
    const exp = arrowMatch[1] ? 'export ' : '';
    entries.push({ ln, text: `${exp}const ${arrowMatch[3]} = (...)`, type: 'arrow' });
    return;
  }
  
  // Constants (non-function)
  const constMatch = trimmed.match(/^(export\s+)?const\s+(\w+)\s*(?::\s*([^=]+))?\s*=/);
  if (constMatch && !trimmed.includes('=>') && !trimmed.includes('function')) {
    if (exportsOnly && !constMatch[1]) return;
    const exp = constMatch[1] ? 'export ' : '';
    const type = constMatch[3] ? ': ' + constMatch[3].trim().substring(0, 40) : '';
    entries.push({ ln, text: `${exp}const ${constMatch[2]}${type}`, type: 'const' });
    return;
  }
  
  // Interfaces / Types
  const typeMatch = trimmed.match(/^(export\s+)?(interface|type)\s+(\w+)/);
  if (typeMatch) {
    if (exportsOnly && !typeMatch[1]) return;
    const exp = typeMatch[1] ? 'export ' : '';
    entries.push({ ln, text: `${exp}${typeMatch[2]} ${typeMatch[3]}`, type: 'type' });
    return;
  }
  
  // Import statements (summarized)
  const importMatch = trimmed.match(/^import\s+(?:{([^}]+)}|(\w+))\s+from\s+"([^"]+)"/);
  if (importMatch && !exportsOnly) {
    const what = importMatch[1] || importMatch[2];
    const from = importMatch[3];
    if (from.includes('./') || from.includes('../')) {
      entries.push({ ln, text: `import { ${what.trim()} } from "${from}"`, type: 'import' });
    }
  }
  
  // Switch case (for dispatchers)
  const caseMatch = trimmed.match(/^case\s+"(\w+)":/);
  if (caseMatch) {
    entries.push({ ln, text: `case "${caseMatch[1]}"`, type: 'case' });
  }
});

// Group and display
const groups = {};
for (const e of entries) {
  if (!groups[e.type]) groups[e.type] = [];
  groups[e.type].push(e);
}

const order = ['import', 'const', 'type', 'func', 'arrow', 'case'];
for (const type of order) {
  if (!groups[type] || groups[type].length === 0) continue;
  const label = { import: 'IMPORTS', const: 'CONSTANTS', type: 'TYPES', func: 'FUNCTIONS', arrow: 'ARROW FNS', case: 'SWITCH CASES' }[type];
  console.log(`--- ${label} (${groups[type].length}) ---`);
  for (const e of groups[type]) {
    console.log(`  L${String(e.ln).padStart(4)}  ${e.text}`);
  }
  console.log('');
}
