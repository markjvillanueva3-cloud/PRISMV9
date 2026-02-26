/**
 * PRISM Anti-Regression Snapshot
 * Take a snapshot BEFORE making changes, compare AFTER to catch regressions.
 * 
 * Captures: line count, function count, export count, action count per file.
 * Comparison shows what was added/removed/changed.
 * 
 * Usage:
 *   node scripts/snapshot.js take [label]    → saves snapshot
 *   node scripts/snapshot.js diff [label]    → compares current vs snapshot
 *   node scripts/snapshot.js list            → shows saved snapshots
 * 
 * Snapshots stored in C:\PRISM\state\snapshots\
 */
const fs = require('fs');
const path = require('path');

const SNAP_DIR = 'C:\\PRISM\\state\\snapshots';
const DISP_DIR = 'C:\\PRISM\\mcp-server\\src\\tools\\dispatchers';
const SRC_DIR = 'C:\\PRISM\\mcp-server\\src';

if (!fs.existsSync(SNAP_DIR)) fs.mkdirSync(SNAP_DIR, { recursive: true });

const cmd = process.argv[2] || 'help';
const label = process.argv[3] || 'latest';

function scanFile(fp) {
  const content = fs.readFileSync(fp, 'utf8');
  const lines = content.split('\n');
  const funcs = [...content.matchAll(/(?:export\s+)?(?:async\s+)?function\s+(\w+)/g)].map(m => m[1]);
  const exports = [...content.matchAll(/export\s+(?:async\s+)?(?:function|const|class|interface|type)\s+(\w+)/g)].map(m => m[1]);
  const actions = (content.match(/const\s+ACTIONS\s*=\s*\[([\s\S]*?)\]\s*as\s*const/) || [null, ''])[1];
  const actionList = actions ? (actions.match(/"(\w+)"/g) || []).map(s => s.replace(/"/g, '')) : [];
  
  return {
    lines: lines.length,
    bytes: fs.statSync(fp).size,
    functions: funcs,
    exports: exports,
    actions: actionList
  };
}

function scanAll() {
  const result = {};
  
  // Scan dispatchers
  for (const f of fs.readdirSync(DISP_DIR).filter(f => f.endsWith('.ts'))) {
    result['dispatchers/' + f] = scanFile(path.join(DISP_DIR, f));
  }
  
  // Scan key non-dispatcher files
  const keyFiles = ['index.ts', 'agentExecutor.ts', 'cadenceExecutor.ts', 'autoHookWrapper.ts'];
  for (const f of keyFiles) {
    const fp = path.join(SRC_DIR, f);
    if (fs.existsSync(fp)) result[f] = scanFile(fp);
  }
  
  return result;
}

if (cmd === 'take') {
  const data = scanAll();
  const snapFile = path.join(SNAP_DIR, label + '.json');
  fs.writeFileSync(snapFile, JSON.stringify({ timestamp: new Date().toISOString(), label, files: data }, null, 2));
  
  const fileCount = Object.keys(data).length;
  const totalFuncs = Object.values(data).reduce((s, f) => s + f.functions.length, 0);
  const totalActions = Object.values(data).reduce((s, f) => s + f.actions.length, 0);
  console.log(`✅ Snapshot "${label}" saved (${fileCount} files, ${totalFuncs} functions, ${totalActions} actions)`);
  
} else if (cmd === 'diff') {
  const snapFile = path.join(SNAP_DIR, label + '.json');
  if (!fs.existsSync(snapFile)) { console.error('No snapshot "' + label + '" found'); process.exit(1); }
  
  const snap = JSON.parse(fs.readFileSync(snapFile, 'utf8'));
  const current = scanAll();
  
  console.log(`\n=== Regression Check: "${label}" (${snap.timestamp}) vs NOW ===\n`);
  
  let regressions = 0, improvements = 0;
  
  // Check each snapshotted file
  for (const [file, old] of Object.entries(snap.files)) {
    const now = current[file];
    if (!now) { console.log(`  ❌ DELETED: ${file}`); regressions++; continue; }
    
    const issues = [];
    
    // Lost functions?
    const lostFuncs = old.functions.filter(f => !now.functions.includes(f));
    const newFuncs = now.functions.filter(f => !old.functions.includes(f));
    if (lostFuncs.length > 0) issues.push(`LOST functions: ${lostFuncs.join(', ')}`);
    if (newFuncs.length > 0) issues.push(`NEW functions: ${newFuncs.join(', ')}`);
    
    // Lost exports?
    const lostExports = old.exports.filter(e => !now.exports.includes(e));
    if (lostExports.length > 0) issues.push(`LOST exports: ${lostExports.join(', ')}`);
    
    // Lost actions?
    const lostActions = old.actions.filter(a => !now.actions.includes(a));
    const newActions = now.actions.filter(a => !old.actions.includes(a));
    if (lostActions.length > 0) issues.push(`LOST actions: ${lostActions.join(', ')}`);
    if (newActions.length > 0) issues.push(`NEW actions: ${newActions.join(', ')}`);
    
    // Size change
    const lineDiff = now.lines - old.lines;
    
    if (issues.length > 0 || Math.abs(lineDiff) > 20) {
      const sign = lineDiff > 0 ? '+' : '';
      console.log(`  ${file} (${sign}${lineDiff} lines):`);
      issues.forEach(i => {
        const isLoss = i.startsWith('LOST');
        console.log(`    ${isLoss ? '❌' : '✅'} ${i}`);
        if (isLoss) regressions++; else improvements++;
      });
    }
  }
  
  // Check for new files
  for (const file of Object.keys(current)) {
    if (!snap.files[file]) {
      console.log(`  ✅ NEW FILE: ${file} (${current[file].lines} lines, ${current[file].functions.length} funcs)`);
      improvements++;
    }
  }
  
  console.log(`\n--- Summary ---`);
  console.log(`Regressions: ${regressions} | Improvements: ${improvements}`);
  if (regressions === 0) console.log('✅ No regressions detected');
  else console.log('❌ REGRESSIONS FOUND — review before committing');
  
} else if (cmd === 'list') {
  const snaps = fs.readdirSync(SNAP_DIR).filter(f => f.endsWith('.json'));
  if (snaps.length === 0) { console.log('No snapshots found'); process.exit(0); }
  console.log('Saved snapshots:');
  for (const s of snaps) {
    const data = JSON.parse(fs.readFileSync(path.join(SNAP_DIR, s), 'utf8'));
    const fileCount = Object.keys(data.files).length;
    console.log(`  ${data.label.padEnd(20)} ${data.timestamp}  (${fileCount} files)`);
  }
  
} else {
  console.log('PRISM Anti-Regression Snapshot');
  console.log('  node scripts/snapshot.js take [label]  — capture current state');
  console.log('  node scripts/snapshot.js diff [label]  — compare vs snapshot');
  console.log('  node scripts/snapshot.js list           — show snapshots');
}
