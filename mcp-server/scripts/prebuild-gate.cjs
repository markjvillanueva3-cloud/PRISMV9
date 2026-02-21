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
  if (errors.length > 0) { console.error('[PREBUILD] GATE FAILED:'); errors.forEach(e => console.error(`  - ${e}`)); process.exit(1); }
  console.log(`[PREBUILD] Gate passed. ${CRITICAL_FILES.length} critical files verified.`);
}
main();
