#!/usr/bin/env node
/**
 * test-100-percent-gate.mjs — Stop Hook
 *
 * SAFETY-CRITICAL: Blocks any operation if tests do not achieve 100% pass rate.
 * Machined parts end up in crucial machinery — a mistake can be catastrophic.
 *
 * Triggers: Stop (before session end, commit, push)
 * Behavior: HARD BLOCK if any test failures detected
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

const sessionId = hookInput.session_id || process.env.CLAUDE_SESSION_ID || 'unknown';

/**
 * Check if we're in a context where tests should be validated
 */
function shouldValidate() {
  // Always validate on stop - this is safety-critical
  return true;
}

/**
 * Run vitest and check for 100% pass rate
 */
function checkTestPassRate() {
  const mcpServerPath = join(__dirname, '..', '..', 'mcp-server');

  if (!existsSync(join(mcpServerPath, 'package.json'))) {
    return { ok: true, message: 'Not in mcp-server context' };
  }

  try {
    // Run vitest with JSON reporter to get structured output
    const result = execSync('npx vitest run --reporter=json 2>&1', {
      cwd: mcpServerPath,
      encoding: 'utf-8',
      timeout: 300000, // 5 minute timeout
      maxBuffer: 50 * 1024 * 1024, // 50MB buffer
    });

    // Try to parse JSON output
    const jsonMatch = result.match(/\{[\s\S]*"numTotalTests"[\s\S]*\}/);
    if (jsonMatch) {
      const testResult = JSON.parse(jsonMatch[0]);
      const total = testResult.numTotalTests || 0;
      const passed = testResult.numPassedTests || 0;
      const failed = testResult.numFailedTests || 0;

      if (total === 0) {
        return { ok: true, message: 'No tests found' };
      }

      const passRate = (passed / total) * 100;

      if (failed > 0 || passRate < 100) {
        return {
          ok: false,
          message: `SAFETY BLOCK: Test pass rate is ${passRate.toFixed(1)}% (${passed}/${total}). ` +
                   `${failed} test(s) FAILED. 100% pass rate REQUIRED for safety-critical machining code. ` +
                   `Fix ALL failing tests before proceeding.`,
          details: {
            total,
            passed,
            failed,
            passRate,
          }
        };
      }

      return {
        ok: true,
        message: `✓ All ${total} tests pass (100%)`,
        details: { total, passed, failed, passRate: 100 }
      };
    }

    // Fallback: parse text output for pass/fail counts
    const passMatch = result.match(/(\d+)\s+pass/i);
    const failMatch = result.match(/(\d+)\s+fail/i);

    if (failMatch && parseInt(failMatch[1]) > 0) {
      const failed = parseInt(failMatch[1]);
      const passed = passMatch ? parseInt(passMatch[1]) : 0;
      const total = passed + failed;
      const passRate = total > 0 ? (passed / total) * 100 : 0;

      return {
        ok: false,
        message: `SAFETY BLOCK: ${failed} test(s) FAILED. Pass rate: ${passRate.toFixed(1)}%. ` +
                 `100% pass rate REQUIRED. Fix ALL failing tests.`,
        details: { total, passed, failed, passRate }
      };
    }

    // If we can't parse, assume success (tests ran without error exit)
    return { ok: true, message: '✓ Tests completed successfully' };

  } catch (error) {
    // Non-zero exit code means test failure
    const output = error.stdout || error.stderr || error.message || '';

    // Try to extract failure count
    const failMatch = output.match(/(\d+)\s+fail/i);
    const passMatch = output.match(/(\d+)\s+pass/i);

    if (failMatch) {
      const failed = parseInt(failMatch[1]);
      const passed = passMatch ? parseInt(passMatch[1]) : 0;
      const total = passed + failed;
      const passRate = total > 0 ? (passed / total) * 100 : 0;

      return {
        ok: false,
        message: `SAFETY BLOCK: ${failed} test(s) FAILED (${passRate.toFixed(1)}% pass rate). ` +
                 `100% REQUIRED for safety-critical code. ` +
                 `Machined parts in crucial machinery — mistakes can be catastrophic.`,
        details: { total, passed, failed, passRate }
      };
    }

    // Generic test failure
    return {
      ok: false,
      message: `SAFETY BLOCK: Test suite failed with error. 100% pass rate REQUIRED. ` +
               `Error: ${error.message?.slice(0, 200) || 'Unknown error'}`,
    };
  }
}

/**
 * Main hook execution
 */
function main() {
  if (!shouldValidate()) {
    // Output empty/success response
    console.log(JSON.stringify({ continue: true }));
    process.exit(0);
  }

  const result = checkTestPassRate();

  if (!result.ok) {
    // HARD BLOCK - output error and exit with failure
    console.error('');
    console.error('═══════════════════════════════════════════════════════════════════');
    console.error('  ⛔ SAFETY-CRITICAL TEST GATE — 100% PASS RATE REQUIRED');
    console.error('═══════════════════════════════════════════════════════════════════');
    console.error('');
    console.error(result.message);
    console.error('');
    if (result.details) {
      console.error(`  Total:  ${result.details.total}`);
      console.error(`  Passed: ${result.details.passed}`);
      console.error(`  Failed: ${result.details.failed}`);
      console.error(`  Rate:   ${result.details.passRate.toFixed(1)}%`);
    }
    console.error('');
    console.error('  This code controls CNC machines making real parts.');
    console.error('  Parts go into aircraft, medical devices, automotive safety systems.');
    console.error('  A bug can cause crashes, injuries, or death.');
    console.error('');
    console.error('  FIX ALL FAILING TESTS BEFORE PROCEEDING.');
    console.error('');
    console.error('═══════════════════════════════════════════════════════════════════');

    // Output block response
    console.log(JSON.stringify({
      continue: false,
      reason: result.message,
    }));
    process.exit(1);
  }

  // Success - allow continuation
  console.log(JSON.stringify({
    continue: true,
    message: result.message,
  }));
  process.exit(0);
}

main();
