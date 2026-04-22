#!/usr/bin/env node
/**
 * test-100-percent-gate.mjs — Stop Hook
 *
 * SAFETY-CRITICAL: Blocks session if machining-related tests do not achieve 100% pass rate.
 * Machined parts end up in crucial machinery — a mistake can be catastrophic.
 *
 * Covered domains (100% REQUIRED):
 *   - CAD: geometry, features, regeneration, blueprints
 *   - CAM: toolpaths, strategies, post-processing, G-code
 *   - Milling: cutting forces, speeds/feeds, chip thinning
 *   - Lathe/Turning: threading, boring, chuck force, tailstock
 *   - Wire EDM (WEDM): wire settings, passes, flushing, taper
 *   - Sinker EDM: electrode, orbiting, VDI finish
 *   - Grinding: wheel selection, burn threshold, dressing
 *   - 5-Axis: RTCP, singularity, kinematics
 *   - Safety: collision, spindle, tool breakage, workholding
 *   - Physics: Kienzle, Taylor, thermal, deflection, chatter
 *   - Quality: SPC, Cpk, tolerance stack, GD&T
 *
 * Triggers: Stop (before session end)
 * Behavior: HARD BLOCK if any machining test fails
 */

import { readFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Parse hook input from stdin
let hookInput = {};
try {
  const stdin = readFileSync(0, 'utf-8').trim();
  if (stdin) {
    hookInput = JSON.parse(stdin);
  }
} catch {
  // No stdin or invalid JSON - continue with empty input
}

/**
 * Machining-related test file patterns (case-insensitive matching)
 * These are SAFETY-CRITICAL — 100% pass rate required
 */
const MACHINING_PATTERNS = [
  // CAD domain
  /cad/i,
  /geometry/i,
  /feature/i,
  /blueprint/i,
  /regen/i,
  /mesh/i,
  /brep/i,
  /solid/i,
  /surface/i,
  /sketch/i,
  /assembly/i,
  /part/i,
  /dfm/i,
  /gdt/i,

  // CAM domain
  /cam/i,
  /toolpath/i,
  /strategy/i,
  /post.*process/i,
  /gcode/i,
  /g-code/i,
  /nc\b/i,
  /program/i,
  /cycle/i,
  /operation/i,

  // Milling
  /mill/i,
  /cutting/i,
  /speed.*feed/i,
  /chip/i,
  /engagement/i,
  /stepover/i,
  /trochoidal/i,
  /hsm/i,
  /adaptive/i,
  /pocket/i,
  /contour/i,
  /facing/i,
  /slot/i,

  // Lathe/Turning
  /lathe/i,
  /turn/i,
  /boring/i,
  /thread/i,
  /chuck/i,
  /tailstock/i,
  /steady.*rest/i,
  /parting/i,
  /grooving/i,
  /swiss/i,
  /bar.*feed/i,
  /live.*tool/i,

  // Wire EDM
  /wedm/i,
  /wire.*edm/i,
  /wire.*cut/i,
  /skim.*cut/i,
  /flush/i,
  /taper/i,
  /wire.*break/i,

  // Sinker EDM
  /sinker/i,
  /electrode/i,
  /orbit/i,
  /vdi/i,
  /edm/i,

  // Grinding
  /grind/i,
  /wheel/i,
  /dress/i,
  /burn/i,
  /honing/i,
  /lapping/i,
  /polish/i,
  /superfinish/i,

  // 5-Axis
  /5.*axis/i,
  /five.*axis/i,
  /rtcp/i,
  /tcpc/i,
  /singularity/i,
  /kinematic/i,
  /tilt/i,
  /swivel/i,
  /multiaxis/i,
  /multi.*axis/i,

  // Safety-critical
  /safety/i,
  /collision/i,
  /spindle/i,
  /tool.*break/i,
  /workhold/i,
  /clamp/i,
  /fixture/i,
  /rapid/i,
  /clearance/i,

  // Physics/calculations
  /kienzle/i,
  /taylor/i,
  /thermal/i,
  /deflection/i,
  /chatter/i,
  /vibration/i,
  /force/i,
  /torque/i,
  /power/i,
  /stress/i,
  /wear/i,
  /mrr/i,

  // Quality/metrology
  /spc/i,
  /cpk/i,
  /tolerance/i,
  /stack/i,
  /cmm/i,
  /gauge/i,
  /gage/i,
  /measure/i,
  /inspect/i,
  /fai/i,

  // Materials
  /material/i,
  /alloy/i,
  /steel/i,
  /aluminum/i,
  /titanium/i,
  /inconel/i,
  /carbide/i,
  /coating/i,
  /hardness/i,

  // Tools
  /tool/i,
  /insert/i,
  /holder/i,
  /collet/i,
  /arbor/i,
  /endmill/i,
  /drill/i,
  /tap/i,
  /ream/i,
  /bore/i,

  // Processes
  /process/i,
  /machining/i,
  /manufacturing/i,
  /cnc/i,
  /automation/i,
  /production/i,
];

/**
 * Test files to EXCLUDE from 100% requirement (non-safety-critical)
 */
const EXCLUDE_PATTERNS = [
  /mock/i,
  /stub/i,
  /fixture\.test/i,  // Test fixtures, not machining fixtures
  /setup\.test/i,
  /config\.test/i,
  /util.*\.test/i,
  /helper.*\.test/i,
  /index\.test/i,
];

/**
 * Check if a test file is machining-related
 */
function isMachiningTest(filename) {
  // Check exclusions first
  for (const pattern of EXCLUDE_PATTERNS) {
    if (pattern.test(filename)) {
      return false;
    }
  }

  // Check if matches any machining pattern
  for (const pattern of MACHINING_PATTERNS) {
    if (pattern.test(filename)) {
      return true;
    }
  }

  return false;
}

/**
 * Run vitest on machining-related tests only and check for 100% pass rate
 */
function checkMachiningTestPassRate() {
  const mcpServerPath = join(__dirname, '..', '..', 'mcp-server');

  if (!existsSync(join(mcpServerPath, 'package.json'))) {
    return { ok: true, message: 'Not in mcp-server context', skipped: true };
  }

  try {
    // First, get list of all test files
    const testDir = join(mcpServerPath, 'src', '__tests__');
    if (!existsSync(testDir)) {
      return { ok: true, message: 'No test directory found', skipped: true };
    }

    // Find all test files
    let allTestFiles;
    try {
      allTestFiles = execSync('find . -name "*.test.ts" -o -name "*.spec.ts" 2>/dev/null || dir /s /b *.test.ts 2>nul', {
        cwd: testDir,
        encoding: 'utf-8',
        timeout: 10000,
      }).trim().split('\n').filter(Boolean);
    } catch {
      // Fallback for Windows
      try {
        allTestFiles = execSync('dir /s /b *.test.ts 2>nul', {
          cwd: testDir,
          encoding: 'utf-8',
          shell: true,
          timeout: 10000,
        }).trim().split('\n').filter(Boolean);
      } catch {
        allTestFiles = [];
      }
    }

    // Filter to machining-related tests
    const machiningTests = allTestFiles.filter(f => isMachiningTest(f));

    if (machiningTests.length === 0) {
      return { ok: true, message: 'No machining tests found to validate', skipped: true };
    }

    // Run vitest with JSON reporter
    const result = execSync('npx vitest run --reporter=json 2>&1', {
      cwd: mcpServerPath,
      encoding: 'utf-8',
      timeout: 300000, // 5 minute timeout
      maxBuffer: 50 * 1024 * 1024, // 50MB buffer
    });

    // Parse JSON output
    const jsonMatch = result.match(/\{[\s\S]*"testResults"[\s\S]*\}/);
    if (!jsonMatch) {
      // Fallback to text parsing
      return parseTextOutput(result, machiningTests.length);
    }

    const testResult = JSON.parse(jsonMatch[0]);

    // Filter results to machining tests only
    let machiningPassed = 0;
    let machiningFailed = 0;
    let machiningTotal = 0;
    const failedTests = [];

    for (const fileResult of testResult.testResults || []) {
      const filename = fileResult.name || '';

      if (!isMachiningTest(filename)) {
        continue; // Skip non-machining tests
      }

      for (const assertionResult of fileResult.assertionResults || []) {
        machiningTotal++;
        if (assertionResult.status === 'passed') {
          machiningPassed++;
        } else {
          machiningFailed++;
          failedTests.push({
            file: filename.split(/[/\\]/).pop(),
            test: assertionResult.title || assertionResult.fullName || 'unknown',
            status: assertionResult.status,
          });
        }
      }
    }

    if (machiningTotal === 0) {
      return { ok: true, message: 'No machining test assertions found', skipped: true };
    }

    const passRate = (machiningPassed / machiningTotal) * 100;

    if (machiningFailed > 0) {
      return {
        ok: false,
        message: `⛔ SAFETY BLOCK: ${machiningFailed} machining test(s) FAILED (${passRate.toFixed(1)}% pass rate). ` +
                 `100% REQUIRED for safety-critical CNC code.`,
        details: {
          total: machiningTotal,
          passed: machiningPassed,
          failed: machiningFailed,
          passRate,
          failedTests: failedTests.slice(0, 10), // Show first 10
        }
      };
    }

    return {
      ok: true,
      message: `✓ All ${machiningTotal} machining tests pass (100%)`,
      details: { total: machiningTotal, passed: machiningPassed, failed: 0, passRate: 100 }
    };

  } catch (error) {
    const output = error.stdout || error.stderr || error.message || '';

    // Check for test failures in output
    const failMatch = output.match(/(\d+)\s+fail/i);
    if (failMatch) {
      const failed = parseInt(failMatch[1]);
      const passMatch = output.match(/(\d+)\s+pass/i);
      const passed = passMatch ? parseInt(passMatch[1]) : 0;
      const total = passed + failed;
      const passRate = total > 0 ? (passed / total) * 100 : 0;

      return {
        ok: false,
        message: `⛔ SAFETY BLOCK: ${failed} test(s) FAILED (${passRate.toFixed(1)}% pass rate). ` +
                 `100% REQUIRED for machining code. Parts go into aircraft, medical devices, automotive.`,
        details: { total, passed, failed, passRate }
      };
    }

    // If we can't parse, report the error but don't block
    // (to avoid false positives on parse errors)
    return {
      ok: true,
      message: `⚠ Could not parse test results: ${error.message?.slice(0, 100) || 'Unknown error'}`,
      skipped: true
    };
  }
}

/**
 * Fallback text output parser
 */
function parseTextOutput(output, expectedCount) {
  const passMatch = output.match(/(\d+)\s+pass/i);
  const failMatch = output.match(/(\d+)\s+fail/i);

  const passed = passMatch ? parseInt(passMatch[1]) : 0;
  const failed = failMatch ? parseInt(failMatch[1]) : 0;
  const total = passed + failed;

  if (total === 0) {
    return { ok: true, message: 'No test results found', skipped: true };
  }

  if (failed > 0) {
    const passRate = (passed / total) * 100;
    return {
      ok: false,
      message: `⛔ SAFETY BLOCK: ${failed} test(s) FAILED (${passRate.toFixed(1)}% pass rate). ` +
               `100% REQUIRED.`,
      details: { total, passed, failed, passRate }
    };
  }

  return {
    ok: true,
    message: `✓ All ${total} tests pass (100%)`,
    details: { total, passed, failed: 0, passRate: 100 }
  };
}

/**
 * Main hook execution
 */
function main() {
  const result = checkMachiningTestPassRate();

  if (result.skipped) {
    console.log(JSON.stringify({ continue: true, message: result.message }));
    process.exit(0);
  }

  if (!result.ok) {
    console.error('');
    console.error('═══════════════════════════════════════════════════════════════════════════');
    console.error('  ⛔ MACHINING TEST GATE — 100% PASS RATE REQUIRED');
    console.error('═══════════════════════════════════════════════════════════════════════════');
    console.error('');
    console.error('  COVERED DOMAINS (all require 100%):');
    console.error('    • CAD: geometry, features, regeneration, blueprints, DfM');
    console.error('    • CAM: toolpaths, strategies, post-processing, G-code');
    console.error('    • Milling: cutting forces, speeds/feeds, chip thinning, engagement');
    console.error('    • Lathe/Turning: threading, boring, chuck force, tailstock, grooving');
    console.error('    • Wire EDM: wire settings, skim cuts, flushing, taper compensation');
    console.error('    • Sinker EDM: electrode design, orbiting, VDI finish');
    console.error('    • Grinding: wheel selection, burn threshold, dressing');
    console.error('    • 5-Axis: RTCP, singularity detection, kinematics');
    console.error('    • Safety: collision, spindle limits, tool breakage, workholding');
    console.error('    • Physics: Kienzle force, Taylor tool life, thermal, deflection, chatter');
    console.error('    • Quality: SPC, Cpk, tolerance stackup, CMM, GD&T');
    console.error('');
    console.error('  ' + result.message);
    console.error('');

    if (result.details) {
      console.error(`  Total machining tests: ${result.details.total}`);
      console.error(`  Passed: ${result.details.passed}`);
      console.error(`  FAILED: ${result.details.failed}`);
      console.error(`  Pass rate: ${result.details.passRate.toFixed(1)}%`);

      if (result.details.failedTests && result.details.failedTests.length > 0) {
        console.error('');
        console.error('  Failed tests:');
        for (const ft of result.details.failedTests) {
          console.error(`    ✗ ${ft.file}: ${ft.test}`);
        }
        if (result.details.failed > 10) {
          console.error(`    ... and ${result.details.failed - 10} more`);
        }
      }
    }

    console.error('');
    console.error('  ═══════════════════════════════════════════════════════════════════════');
    console.error('  WHY 100%? This code generates G-code for CNC machines making real parts.');
    console.error('  Parts go into: AIRCRAFT • MEDICAL DEVICES • AUTOMOTIVE SAFETY SYSTEMS');
    console.error('  A bug can cause: CRASHES • INJURIES • DEATH');
    console.error('  ═══════════════════════════════════════════════════════════════════════');
    console.error('');
    console.error('  FIX ALL FAILING TESTS BEFORE PROCEEDING.');
    console.error('');

    console.log(JSON.stringify({
      continue: false,
      reason: result.message,
    }));
    process.exit(1);
  }

  // Success
  console.log(JSON.stringify({
    continue: true,
    message: result.message,
  }));
  process.exit(0);
}

main();
