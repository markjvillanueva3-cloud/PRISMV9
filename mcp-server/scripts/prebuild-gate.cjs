#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const STATE_DIR = 'C:\\PRISM\\state';
const SNAPSHOT_FILE = path.join(STATE_DIR, 'pre_build_snapshot.json');
const BASE = 'C:\\PRISM\\mcp-server';

const CRITICAL_FILES = [
  'src/types/pfp-types.ts',
  'src/engines/PFPEngine.ts',
  'src/engines/PredictiveFailureEngine.ts',
  'src/engines/CollisionEngine.ts',
  'src/engines/SpindleProtectionEngine.ts',
  'src/engines/CoolantValidationEngine.ts',
  'src/engines/ToolBreakageEngine.ts',
  'src/engines/WorkholdingEngine.ts',
  'src/engines/ManufacturingCalculations.ts',
  'src/engines/AdvancedCalculations.ts',
  'src/engines/ThreadCalculationEngine.ts',
  'src/engines/ToolpathCalculations.ts',
  'src/tools/dispatchers/safetyDispatcher.ts',
  'src/tools/dispatchers/calcDispatcher.ts',
  'src/tools/dispatchers/threadDispatcher.ts',
  'src/tools/dispatchers/toolpathDispatcher.ts',
  'src/tools/dispatchers/pfpDispatcher.ts',
];

function hashFile(fp) {
  try { return crypto.createHash('md5').update(fs.readFileSync(fp)).digest('hex'); }
  catch { return null; }
}

function main() {
  console.log('[PREBUILD] Running pre-build gate...');
  const errors = [];
  for (const f of CRITICAL_FILES) {
    const fp = path.join(BASE, f);
    if (!fs.existsSync(fp)) errors.push(`CRITICAL: Missing safety file: ${f}`);
    else if (fs.statSync(fp).size === 0) errors.push(`CRITICAL: Empty safety file: ${f}`);
  }
  if (fs.existsSync(SNAPSHOT_FILE)) {
    const prev = JSON.parse(fs.readFileSync(SNAPSHOT_FILE, 'utf-8'));
    for (const [file, prevHash] of Object.entries(prev.hashes || {})) {
      if (hashFile(path.join(BASE, file)) === null && prevHash !== null)
        errors.push(`REGRESSION: File disappeared: ${file}`);
    }
  }
  const hashes = {};
  for (const f of CRITICAL_FILES) hashes[f] = hashFile(path.join(BASE, f));
  fs.mkdirSync(STATE_DIR, { recursive: true });
  fs.writeFileSync(SNAPSHOT_FILE, JSON.stringify({ timestamp: new Date().toISOString(), hashes, count: CRITICAL_FILES.length }, null, 2));
  // Build size check
  const distFile = path.join(BASE, 'dist', 'index.js');
  if (fs.existsSync(distFile)) {
    const sizeMB = fs.statSync(distFile).size / (1024 * 1024);
    const WARN_MB = 6.5;
    const BLOCK_MB = 8.0;
    if (sizeMB >= BLOCK_MB) {
      errors.push(`BUILD SIZE BLOCKED: dist/index.js is ${sizeMB.toFixed(1)}MB (limit: ${BLOCK_MB}MB)`);
    } else if (sizeMB >= WARN_MB) {
      console.warn(`[PREBUILD] WARNING: dist/index.js is ${sizeMB.toFixed(1)}MB (warn threshold: ${WARN_MB}MB)`);
    } else {
      console.log(`[PREBUILD] Build size OK: ${sizeMB.toFixed(1)}MB (warn: ${WARN_MB}MB, block: ${BLOCK_MB}MB)`);
    }
  }

  if (errors.length > 0) { console.error('[PREBUILD] GATE FAILED:'); errors.forEach(e => console.error(`  - ${e}`)); process.exit(1); }
  console.log(`[PREBUILD] Gate passed. ${CRITICAL_FILES.length} critical files verified.`);
}
main();
