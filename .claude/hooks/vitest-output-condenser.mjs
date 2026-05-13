#!/usr/bin/env node
// tier: T3
/**
 * vitest-output-condenser.mjs — PostToolUse Bash hook.
 *
 * Detects vitest test output and emits a CONDENSED summary as
 * additionalContext. Vitest dumps full reporter output for every run —
 * for a 60-test passing suite that's ~2KB of mostly-noise.
 *
 * Detection: Bash command contains `vitest` AND output contains either
 * `Test Files`, `Tests `, or `Duration` summary lines.
 *
 * Condensing strategy:
 *   - All passed → one-liner with file/test/duration counts
 *   - Failures present → list each FAIL line + first 3 lines of context per failure
 *
 * No-op cases (pass-through):
 *   - Not a Bash tool
 *   - Not a vitest invocation
 *   - Output small (< 800 chars — already concise)
 *
 * @hook PostToolUse:Bash
 */

import * as fs from "node:fs";

const SMALL_THRESHOLD = 800;
const MAX_FAILURES_LISTED = 5;
const FAILURE_CONTEXT_LINES = 4;

function readStdinSafe() {
  try {
    if (process.stdin.isTTY) return null;
    const buf = fs.readFileSync(0, "utf-8");
    if (!buf || !buf.trim().startsWith("{")) return null;
    return JSON.parse(buf);
  } catch { return null; }
}
function emit(obj) { process.stdout.write(JSON.stringify(obj)); }

function main() {
  const stdin = readStdinSafe();
  const passthrough = () => emit({ continue: true });
  if (!stdin || stdin.tool_name !== "Bash") return passthrough();

  const cmd = stdin.tool_input?.command ?? "";
  if (!/vitest/.test(cmd)) return passthrough();

  const out = stdin.tool_response?.output
    ?? stdin.tool_response?.stdout
    ?? stdin.tool_response?.content
    ?? "";
  if (typeof out !== "string" || out.length < SMALL_THRESHOLD) return passthrough();

  // Parse vitest summary lines
  const fileSummary = out.match(/Test Files\s+(?:(\d+)\s+failed[^\n]*?\|)?\s*(\d+)\s+passed[^\n]*?\((\d+)\)/);
  const testSummary = out.match(/Tests\s+(?:(\d+)\s+failed[^\n]*?\|)?\s*(\d+)\s+passed[^\n]*?\((\d+)\)/);
  const duration = (out.match(/Duration\s+([0-9.smh]+)/) || [])[1];
  if (!fileSummary && !testSummary) return passthrough();

  const fileFailed = +(fileSummary?.[1] ?? 0);
  const filePassed = +(fileSummary?.[2] ?? 0);
  const fileTotal = +(fileSummary?.[3] ?? filePassed + fileFailed);
  const testFailed = +(testSummary?.[1] ?? 0);
  const testPassed = +(testSummary?.[2] ?? 0);
  const testTotal = +(testSummary?.[3] ?? testPassed + testFailed);

  if (testFailed === 0 && fileFailed === 0) {
    emit({
      continue: true,
      hookSpecificOutput: {
        hookEventName: "PostToolUse",
        additionalContext: `Vitest: ALL PASS — ${testPassed}/${testTotal} tests across ${filePassed}/${fileTotal} file(s)${duration ? ` in ${duration}` : ""}.`,
      },
    });
    return;
  }

  // Failures: pick out FAIL markers and a few lines after each
  const lines = out.split("\n");
  const failures = [];
  for (let i = 0; i < lines.length && failures.length < MAX_FAILURES_LISTED; i++) {
    if (/^\s*(FAIL|×)\s/.test(lines[i]) || /❯.*×/.test(lines[i])) {
      failures.push(lines.slice(i, i + FAILURE_CONTEXT_LINES).join("\n"));
    }
  }
  const failureBlock = failures.length > 0
    ? "\nFirst failures:\n" + failures.join("\n  ---\n")
    : "";

  emit({
    continue: true,
    hookSpecificOutput: {
      hookEventName: "PostToolUse",
      additionalContext: `Vitest: ${testFailed} FAILED, ${testPassed} passed (${testTotal} total) across ${fileFailed} failed file(s)${duration ? ` in ${duration}` : ""}.${failureBlock}`,
    },
  });
}

try { main(); } catch { process.stdout.write(JSON.stringify({ continue: true })); }
