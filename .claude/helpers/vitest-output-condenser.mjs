#!/usr/bin/env node
/**
 * vitest-output-condenser.mjs — PostToolUse hook for Bash
 *
 * Condenses verbose vitest/jest test output:
 *   - Removes passed test spam (✓ lines)
 *   - Keeps only failures and summary
 *   - Shows failure count + first 5 failure messages
 *
 * Reduces test output by 90%+ on large test suites.
 */

import { readFileSync } from "node:fs";
import process from "node:process";

// Parse stdin for hook input
let stdinInput = {};
try {
  const stdin = readFileSync(0, "utf-8").trim();
  if (stdin) stdinInput = JSON.parse(stdin);
} catch { /* No stdin */ }

function collectOutputText() {
  const parts = [];
  for (const [key, value] of Object.entries(process.env)) {
    if (typeof value === "string" && value.length > 0 && (
      key === "TOOL_RESULT" || key === "TOOL_OUTPUT" ||
      key.startsWith("TOOL_RESULT_") || key.startsWith("TOOL_OUTPUT_")
    )) {
      parts.push(value);
    }
  }
  return parts.join("\n");
}

function isTestCommand(command) {
  return /\b(vitest|jest|npm\s+test|npx\s+vitest|npx\s+jest)\b/.test(command);
}

function extractTestSummary(output) {
  const lines = output.split(/\r?\n/);
  const failures = [];
  const summary = { passed: 0, failed: 0, skipped: 0, total: 0, duration: "" };
  let inFailure = false;
  let currentFailure = [];

  for (const line of lines) {
    // Vitest/Jest summary patterns
    const testSummaryMatch = line.match(/Tests:\s*(\d+)\s*failed.*?(\d+)\s*passed.*?(\d+)\s*total/i) ||
                             line.match(/Test Suites:.*?(\d+)\s*failed.*?(\d+)\s*passed/i);
    if (testSummaryMatch) {
      summary.failed = parseInt(testSummaryMatch[1]) || 0;
      summary.passed = parseInt(testSummaryMatch[2]) || 0;
      summary.total = summary.failed + summary.passed;
    }

    // Alternative summary format
    const altMatch = line.match(/(\d+)\s*passed.*?(\d+)\s*failed/i);
    if (altMatch) {
      summary.passed = parseInt(altMatch[1]) || 0;
      summary.failed = parseInt(altMatch[2]) || 0;
      summary.total = summary.passed + summary.failed;
    }

    // Duration
    const durMatch = line.match(/Time:\s*([^\n]+)/i) || line.match(/Duration:\s*([^\n]+)/i);
    if (durMatch) {
      summary.duration = durMatch[1].trim();
    }

    // Detect failure start
    if (line.includes("FAIL") || line.includes("✗") || line.includes("×") || line.match(/^\s*\d+\)\s/)) {
      inFailure = true;
      currentFailure = [line];
    } else if (inFailure) {
      // Failure continues until empty line or new test
      if (line.trim() === "" || line.includes("✓") || line.includes("√")) {
        if (currentFailure.length > 0) {
          failures.push(currentFailure.join("\n").substring(0, 300));
        }
        inFailure = false;
        currentFailure = [];
      } else {
        currentFailure.push(line);
      }
    }

    // AssertionError pattern
    if (line.includes("AssertionError") || line.includes("Expected:") || line.includes("Received:")) {
      if (!inFailure) {
        failures.push(line.substring(0, 200));
      }
    }
  }

  // Capture last failure if still in one
  if (currentFailure.length > 0) {
    failures.push(currentFailure.join("\n").substring(0, 300));
  }

  return { failures, summary };
}

async function main() {
  const toolInput = stdinInput.tool_input || {};
  const command = toolInput.command || process.env.TOOL_INPUT_command || "";
  const output = collectOutputText();

  // Only process test commands with significant output
  if (!isTestCommand(command) || output.length < 1000) {
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }

  const { failures, summary } = extractTestSummary(output);

  // All tests passed — very brief summary
  if (summary.failed === 0 && summary.passed > 0) {
    const msg = `TEST PASS: ${summary.passed} tests passed${summary.duration ? ` in ${summary.duration}` : ""}`;
    const savedPct = Math.round((1 - msg.length / output.length) * 100);
    process.stdout.write(JSON.stringify({
      additionalContext: `${msg} [${savedPct}% condensed — ~${Math.round((output.length - msg.length) / 4)} tokens saved]`,
    }));
    return;
  }

  // Some failures — show summary + first 5 failures
  if (failures.length > 0 || summary.failed > 0) {
    const failureCount = Math.max(failures.length, summary.failed);
    const shownFailures = failures.slice(0, 5);

    let condensed = `TEST FAIL: ${failureCount} failures, ${summary.passed} passed${summary.duration ? ` in ${summary.duration}` : ""}\n\n`;
    condensed += "FAILURES:\n";
    condensed += shownFailures.map((f, i) => `${i + 1}. ${f.split("\n")[0]}`).join("\n");
    if (failures.length > 5) {
      condensed += `\n... and ${failures.length - 5} more failures`;
    }

    const savedPct = Math.round((1 - condensed.length / output.length) * 100);
    if (savedPct > 20) {
      process.stdout.write(JSON.stringify({
        additionalContext: `${condensed}\n\n[${savedPct}% condensed — ~${Math.round((output.length - condensed.length) / 4)} tokens saved. Run specific test for full trace.]`,
      }));
      return;
    }
  }

  process.stdout.write(JSON.stringify({ continue: true }));
}

main().catch(() => { process.stdout.write(JSON.stringify({ continue: true })); });
