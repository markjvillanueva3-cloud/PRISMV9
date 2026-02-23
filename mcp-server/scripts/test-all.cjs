#!/usr/bin/env node
/**
 * PRISM Unified Test Runner
 * Runs all test suites in sequence and produces a unified JSON report.
 *
 * Suites:
 *   1. vitest — unit + integration tests
 *   2. prebuild-gate — critical file verification
 *   3. phantom-skill-detector — skill index integrity
 *   4. session-preflight — startup health checks
 *   5. build — esbuild bundle + size check
 *
 * Exit code: 0 = all pass, 1 = any fail
 * Output:  state/test-all-report.json
 */

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const BASE = path.resolve(__dirname, '..');
const STATE_DIR = path.join('C:\\PRISM', 'state');

if (!fs.existsSync(STATE_DIR)) fs.mkdirSync(STATE_DIR, { recursive: true });

// Resolve node_modules bin paths (avoids shell: true / npx .cmd issues on Windows)
const VITEST_BIN = path.join(BASE, 'node_modules', 'vitest', 'vitest.mjs');
const ESBUILD_BIN = path.join(BASE, 'node_modules', 'esbuild', 'bin', 'esbuild');

const report = {
  timestamp: new Date().toISOString(),
  suites: [],
  overall: 'PASS',
};

function runSuite(name, cmd, args, opts = {}) {
  const start = Date.now();
  const suite = { name, status: 'PASS', duration_ms: 0, output: '', details: {} };

  try {
    const output = execFileSync(cmd, args, {
      cwd: BASE,
      encoding: 'utf-8',
      timeout: opts.timeout || 120000,
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: false,
    });
    suite.output = output.trim().slice(-2000); // last 2KB
    suite.duration_ms = Date.now() - start;

    // Parse test count from vitest output
    if (name === 'vitest') {
      const testMatch = output.match(/(\d+) passed/);
      if (testMatch) suite.details.tests_passed = parseInt(testMatch[1]);
    }

    // Parse build size from esbuild output
    if (name === 'build') {
      const sizeMatch = output.match(/([\d.]+)mb/i);
      if (sizeMatch) suite.details.bundle_size_mb = parseFloat(sizeMatch[1]);
    }
  } catch (err) {
    suite.status = 'FAIL';
    suite.output = (err.stdout || '').trim().slice(-1000) + '\n' + (err.stderr || '').trim().slice(-1000);
    suite.duration_ms = Date.now() - start;
    report.overall = 'FAIL';
  }

  report.suites.push(suite);
  const icon = suite.status === 'PASS' ? '[PASS]' : '[FAIL]';
  console.log(`  ${icon} ${name}: ${suite.status} (${suite.duration_ms}ms)`);
  return suite.status === 'PASS';
}

console.log('PRISM Test Runner - Unified Pipeline');
console.log('====================================\n');

// Suite 1: Vitest (run via node to avoid npx .cmd issues on Windows)
runSuite('vitest', process.execPath, [VITEST_BIN, 'run', '--reporter=verbose'], { timeout: 180000 });

// Suite 2: Prebuild Gate
runSuite('prebuild-gate', process.execPath, ['scripts/prebuild-gate.cjs']);

// Suite 3: Phantom Skill Detector
runSuite('phantom-skills', process.execPath, ['scripts/phantom-skill-detector.cjs']);

// Suite 4: Session Preflight
runSuite('session-preflight', process.execPath, ['scripts/session_preflight.cjs']);

// Suite 5: Build (esbuild via node)
runSuite('build', process.execPath, [
  ESBUILD_BIN, 'src/index.ts',
  '--bundle', '--platform=node', '--target=node18',
  '--format=esm', '--outfile=dist/index.js'
], { timeout: 60000 });

// Build size check
const distFile = path.join(BASE, 'dist', 'index.js');
if (fs.existsSync(distFile)) {
  const sizeMB = fs.statSync(distFile).size / (1024 * 1024);
  report.build_size_mb = parseFloat(sizeMB.toFixed(1));
  if (sizeMB >= 8.0) {
    report.overall = 'FAIL';
    console.log(`  [FAIL] build-size: BLOCKED (${sizeMB.toFixed(1)}MB >= 8.0MB)`);
  } else if (sizeMB >= 6.5) {
    console.log(`  [WARN] build-size: WARN (${sizeMB.toFixed(1)}MB >= 6.5MB)`);
  } else {
    console.log(`  [PASS] build-size: OK (${sizeMB.toFixed(1)}MB)`);
  }
}

// Summary
console.log('\n====================================');
console.log(`Overall: ${report.overall}`);
console.log(`Suites: ${report.suites.filter(s => s.status === 'PASS').length}/${report.suites.length} passed`);
console.log(`Duration: ${report.suites.reduce((sum, s) => sum + s.duration_ms, 0)}ms`);

// Write report
const reportPath = path.join(STATE_DIR, 'test-all-report.json');
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log(`\nReport: ${reportPath}`);

process.exit(report.overall === 'PASS' ? 0 : 1);
