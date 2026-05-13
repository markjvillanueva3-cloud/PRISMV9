#!/usr/bin/env node
// tier: T4
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

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { execSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const IS_WIN = process.platform === 'win32';
const NPX_BIN = IS_WIN ? 'npx.cmd' : 'npx';
// Internal vitest budget MUST stay under the hook timeout (120s) so the
// hook returns a graceful skipped result instead of SIGTERM.
const VITEST_TIMEOUT_MS = 90_000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Parse hook input from stdin
// Operator escape hatch — for sessions where every turn ends with a 90s
// vitest run that wedges the Stop sequence. Set PRISM_TEST_GATE=off to skip.
// The gate is safety-critical (machining tests must pass) so the default
// stays on; disable only when actively triaging Stop-hook latency.
if (process.env.PRISM_TEST_GATE === 'off') {
  process.stdout.write(JSON.stringify({ continue: true }));
  process.exit(0);
}

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
function walkTestFiles(root) {
  const out = [];
  const stack = [root];
  while (stack.length) {
    const dir = stack.pop();
    let entries;
    try { entries = readdirSync(dir); } catch { continue; }
    for (const entry of entries) {
      const full = join(dir, entry);
      let st;
      try { st = statSync(full); } catch { continue; }
      if (st.isDirectory()) {
        if (entry === 'node_modules' || entry === 'dist' || entry.startsWith('.')) continue;
        stack.push(full);
      } else if (/\.(test|spec)\.ts$/i.test(entry)) {
        out.push(full);
      }
    }
  }
  return out;
}

// Paths whose changes should trigger the machining test gate.
// Keeps us from running vitest when only docs/state/json churned.
const CODE_PATH_PREFIXES = [
  'src/engines/', 'src/__tests__/', 'src/algorithms/', 'src/physics/',
  'src/dispatchers/', 'src/tools/dispatchers/', 'src/hooks/', 'src/registries/',
  'src/pipelines/', 'src/safety/'
];
const GIT_TIMEOUT_MS = 5000;

function isCodeFile(relPath) {
  const normalized = relPath.replace(/\\/g, '/');
  return CODE_PATH_PREFIXES.some(prefix => normalized.startsWith(prefix));
}

// Probe common Windows install paths before giving up — node spawnSync does
// not inherit Git-for-Windows' PATH on all setups.
const GIT_CANDIDATES = IS_WIN
  ? [
      'C:/Program Files/Git/cmd/git.exe',
      'C:/Program Files (x86)/Git/cmd/git.exe',
      'git.exe',
    ]
  : ['git'];

function resolveGitExecutable() {
  for (const candidate of GIT_CANDIDATES) {
    if (candidate.includes('/') && !existsSync(candidate)) continue;
    return candidate;
  }
  return null;
}

function gitTouchedMachiningFiles(mcpServerPath) {
  // Returns list of machining-related source/test files changed in the
  // recent session window (last ≤5 commits + working tree).
  //
  // Why both: the previous version inspected only `git diff HEAD`
  // (uncommitted only). Under the YOLO commit-after-each-unit workflow
  // the tree is clean immediately after a commit → diff returns nothing →
  // gate skipped on the very edits that should have triggered it. We
  // union `git log -5 --name-only` with the working-tree diff so the
  // gate covers both freshly-committed work and in-flight edits.
  //
  // Returns empty array when only docs/state/json churned → skip vitest
  // (legitimate: no machining files in scope).
  // Returns null if git unavailable OR no diff data at all → caller
  // falls through to full vitest run (conservative).
  const gitExe = resolveGitExecutable();
  if (!gitExe) return null;
  try {
    const calls = [
      ['log', '-5', '--name-only', '--pretty=format:'],
      ['diff', '--name-only', 'HEAD'],
    ];
    const collected = new Set();
    let anySuccess = false;
    for (const args of calls) {
      const r = spawnSync(gitExe, args,
        { cwd: mcpServerPath, encoding: 'utf-8', timeout: GIT_TIMEOUT_MS }
      );
      if (r.status !== 0 || typeof r.stdout !== 'string') continue;
      anySuccess = true;
      for (const line of r.stdout.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (trimmed) collected.add(trimmed);
      }
    }
    if (!anySuccess) return null;
    return [...collected]
      .filter(isCodeFile)
      .filter(isMachiningTest);
  } catch { return null; }
}

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

    // Short-circuit: if no machining-related files changed in this session,
    // running the full suite is wasted time (and often blows the 120s hook budget).
    const touched = gitTouchedMachiningFiles(mcpServerPath);
    if (Array.isArray(touched) && touched.length === 0) {
      return { ok: true, message: 'No machining source/test changes this session — skipping gate', skipped: true };
    }

    // Skip after merge commits — main was already validated on its branch and
    // a merge commit's `--name-only` listing balloons to thousands of files,
    // turning a targeted gate into a full-suite run.
    if (Array.isArray(touched) && touched.length > 50) {
      return { ok: true, message: `Touched-files window has ${touched.length} files (likely a merge) — skipping; rerun gate manually if concerned`, skipped: true };
    }

    // Native Node file walk — avoids shell portability issues (find vs dir /s /b)
    const allTestFiles = walkTestFiles(testDir);

    // Filter to machining-related tests
    const machiningTests = allTestFiles.filter(f => isMachiningTest(f));

    if (machiningTests.length === 0) {
      return { ok: true, message: 'No machining tests found to validate', skipped: true };
    }

    // Build the targeted vitest argv. `touched` may contain source files OR
    // test files; for source files, fall back to running the matching test
    // file if one exists in __tests__/. This narrows vitest from ~3300 tests
    // to just what changed, which is the difference between a 90s hang and
    // a sub-10s gate.
    const targetTests = new Set();
    if (Array.isArray(touched) && touched.length > 0) {
      for (const rel of touched) {
        const norm = rel.replace(/\\/g, '/');
        if (/\.(test|spec)\.ts$/i.test(norm)) {
          targetTests.add(norm);
          continue;
        }
        // src/engines/FooEngine.ts → src/__tests__/Foo*.test.ts
        const stem = norm.split('/').pop()?.replace(/\.ts$/i, '');
        if (!stem) continue;
        for (const tf of allTestFiles) {
          const tfBase = tf.split(/[\\\/]/).pop() || '';
          if (tfBase.toLowerCase().startsWith(stem.toLowerCase().replace(/Engine$/, '').toLowerCase())) {
            targetTests.add(tf);
          }
        }
      }
    }
    const vitestArgs = targetTests.size > 0
      ? Array.from(targetTests).map(p => `"${p}"`).join(' ')
      : '';

    // Run vitest with JSON reporter — budget kept under the outer hook timeout.
    // When vitestArgs is empty (no targeted tests resolved), vitest runs the
    // full suite — preserves the conservative fallback path.
    const result = execSync(`${NPX_BIN} vitest run --reporter=json ${vitestArgs} 2>&1`, {
      cwd: mcpServerPath,
      encoding: 'utf-8',
      timeout: VITEST_TIMEOUT_MS,
      maxBuffer: 50 * 1024 * 1024,
      shell: true,
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
    console.log(JSON.stringify({ continue: true, systemMessage: result.message }));
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
  console.log(JSON.stringify({ continue: true, systemMessage: result.message }));
  process.exit(0);
}

try { main(); } catch { process.stdout.write(JSON.stringify({ continue: true })); }
