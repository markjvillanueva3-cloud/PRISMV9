#!/usr/bin/env node
/**
 * File Safety Classification for YOLO mode
 * SAFETY=high: Never auto-edit without approval (engines, calculations, safety)
 * SAFETY=medium: Auto-edit with snapshot (dispatchers, hooks)  
 * SAFETY=low: Free to auto-edit (docs, scripts, state files)
 */
const fs = require('fs');
const path = require('path');

const CLASSIFICATIONS = {
  high: [
    /engines\/(.*Calculation|.*Safety|PFP|Collision|Spindle|Coolant|ToolBreakage|Workholding)/i,
    /dispatchers\/(safety|calc|thread|toolpath|pfp)/i,
    /types\/pfp-types/i,
    /engines\/Formula/i,
  ],
  medium: [
    /dispatchers\//i,
    /engines\//i,
    /hooks\//i,
    /tools\/autoHookWrapper/i,
    /index\.ts$/i,
  ],
  low: [
    /scripts\//i,
    /data\//i,
    /docs\//i,
    /\.md$/i,
    /\.json$/i,
    /state\//i,
  ]
};

function classifyFile(filepath) {
  const rel = filepath.replace(/\\/g, '/');
  for (const level of ['high', 'medium', 'low']) {
    for (const pattern of CLASSIFICATIONS[level]) {
      if (pattern.test(rel)) return level;
    }
  }
  return 'medium'; // default
}

function classifyAll(baseDir) {
  const results = { high: [], medium: [], low: [] };
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') walk(full);
      else if (entry.isFile() && entry.name.endsWith('.ts')) {
        const level = classifyFile(full);
        results[level].push(path.relative(baseDir, full));
      }
    }
  }
  walk(baseDir);
  return results;
}

if (require.main === module) {
  const results = classifyAll('C:\\PRISM\\mcp-server\\src');
  console.log(`[SAFETY CLASSIFICATION]`);
  console.log(`  HIGH (no auto-edit): ${results.high.length} files`);
  console.log(`  MEDIUM (snapshot first): ${results.medium.length} files`);
  console.log(`  LOW (free edit): ${results.low.length} files`);
  fs.writeFileSync('C:\\PRISM\\state\\file_safety_map.json', JSON.stringify(results, null, 2));
  console.log('Saved to C:\\PRISM\\state\\file_safety_map.json');
}

module.exports = { classifyFile, classifyAll };
