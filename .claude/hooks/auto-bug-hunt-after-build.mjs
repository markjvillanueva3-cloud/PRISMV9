#!/usr/bin/env node
// tier: T3
/**
 * auto-bug-hunt-after-build.mjs — PostToolUse:Bash hook.
 *
 * Detects when a build/test/typecheck command FAILED and surfaces a
 * structured bug-hunt prompt as additionalContext so the model knows
 * to investigate before moving on. Safety-critical context:
 * shipping a build that we let fail silently is exactly the path
 * that produces the 92/97-style incident.
 *
 * Detection: tool_input.command matches a build/test/typecheck pattern
 * AND (exit_code != 0 OR output contains failure markers).
 *
 * Per-session dedup: same (sid, command-family) only fires once per
 * DEDUP_WINDOW_MS (default 10 min). Avoids inject-spam when the model
 * is already iterating on the same failure.
 *
 * Triggers /scrutinize-style action by emitting an additionalContext
 * directive. Does NOT block the tool call (PostToolUse can't anyway).
 *
 * @hook PostToolUse:Bash
 */

import * as fs from "node:fs";
import * as path from "node:path";

const CACHE_DIR = path.resolve("H:/prism/.claude/cache");
const DEDUP_WINDOW_MS = 10 * 60 * 1000;

// Command-family patterns. Each detects a distinct build/test surface.
const BUILD_PATTERNS = [
  { family: "vitest",     re: /\bvitest(?:\s|$)/ },
  { family: "tsc",        re: /\btsc(?:\s|$|\.exe)/ },
  { family: "npm-test",   re: /\bnpm\s+(?:run\s+)?test(?:\s|$|:)/ },
  { family: "npm-build",  re: /\bnpm\s+(?:run\s+)?build(?:\s|$|:)/ },
  { family: "npm-ci",     re: /\bnpm\s+ci(?:\s|$)/ },
  { family: "vitest-via-node", re: /node[^\s]*vitest/ },
];

// Failure markers to scan in stdout when exit_code is unavailable.
// Each marker must be SPECIFIC enough to not false-positive on commit
// messages, lint-staged wrapper output, or git push status. The earlier
// generic /\bFAILED?\b/ matched "lint-staged failed" and triggered on
// every successful commit — bug fixed by requiring failure markers to
// be in canonical tool-output shape.
const FAILURE_MARKERS = [
  /^\s*FAIL\s+\S+/m,                    // vitest: "FAIL src/foo.test.ts"
  /Test Files\s+\d+\s+failed/,          // vitest summary
  /Tests\s+\d+\s+failed/,               // vitest summary
  /\berror\s+TS\d+\b/,                  // tsc errors
  /^npm\s+ERR!/m,                       // npm errors at line start
  /^\s*AssertionError/m,                // assertion failures
  /^\s*\d+\s+(failed|failing)\b/im,     // generic test reporter "N failed"
];

function readStdinSafe() {
  try {
    if (process.stdin.isTTY) return null;
    const buf = fs.readFileSync(0, "utf-8");
    if (!buf || !buf.trim().startsWith("{")) return null;
    return JSON.parse(buf);
  } catch { return null; }
}
function emit(obj) { process.stdout.write(JSON.stringify(obj)); }

function safeSid(sid) {
  if (typeof sid !== "string" || !sid) return "global";
  return sid.replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 64) || "global";
}
function dedupPath(sid, family) {
  return path.join(CACHE_DIR, `bug-hunt-${safeSid(sid)}-${family}.marker`);
}

function recentlyFired(sid, family) {
  try {
    const p = dedupPath(sid, family);
    if (!fs.existsSync(p)) return false;
    const age = Date.now() - fs.statSync(p).mtimeMs;
    return age < DEDUP_WINDOW_MS;
  } catch { return false; }
}
function markFired(sid, family) {
  try {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    fs.writeFileSync(dedupPath(sid, family), JSON.stringify({
      family,
      fired_at: new Date().toISOString(),
    }));
  } catch { /* ignore */ }
}

function detectFamily(cmd) {
  // Only inspect the LAST segment of a chained command (after && / || / ; / |).
  // Earlier behavior tested the whole string, which matched 'vitest' inside
  // heredoc commit messages and 'tsc' inside log greps. The last segment is
  // the command whose exit code/output we're actually evaluating.
  const segments = cmd.split(/&&|\|\||;|\|/).map((s) => s.trim()).filter(Boolean);
  const last = (segments[segments.length - 1] ?? cmd).replace(/^(rtk\s+)?/, "").trim();
  for (const { family, re } of BUILD_PATTERNS) {
    if (re.test(last)) return family;
  }
  return null;
}

function looksFailed(toolResponse) {
  // Try explicit exit code first — most reliable signal.
  const exitCode = toolResponse?.exit_code
    ?? toolResponse?.exitCode
    ?? toolResponse?.exit;
  if (typeof exitCode === "number" && Number.isFinite(exitCode) && exitCode !== 0) {
    return { failed: true, signal: `exit=${exitCode}` };
  }
  // Fallback: scan output for failure markers.
  const out = toolResponse?.output
    ?? toolResponse?.stdout
    ?? toolResponse?.content
    ?? "";
  if (typeof out !== "string" || out.length === 0) return { failed: false };
  for (const re of FAILURE_MARKERS) {
    const m = out.match(re);
    if (m) return { failed: true, signal: `marker:${m[0]}` };
  }
  return { failed: false };
}

function huntPrompt(family, signal, cmd) {
  // Family-specific hunt instructions — what to look at first per category.
  const familyHints = {
    vitest: [
      "1. Re-run the failing test file with --reporter=verbose to see the assertion diff.",
      "2. Decide: is the test wrong (update assertion) or is the code wrong (fix code)?",
      "3. If the failure is a regression, run `git log -p <file>` for recent changes.",
      "4. NEVER comment out, .skip, or weaken assertions to get to green.",
    ],
    "vitest-via-node": [
      "1. Same as vitest: re-run with --reporter=verbose and inspect the diff.",
      "2. Fix CODE, not the test — unless the assertion is provably wrong.",
    ],
    tsc: [
      "1. Read the FIRST tsc error fully (subsequent errors often cascade from it).",
      "2. Fix at the root: missing import, wrong generic, narrow type.",
      "3. NEVER suppress with @ts-ignore or @ts-expect-error.",
      "4. Verify the fix narrows the error count: `npx tsc --noEmit | grep -c 'error TS'`.",
    ],
    "npm-test": [
      "1. Same as vitest — re-run the failing suite with verbose reporter.",
      "2. Confirm the test report at mcp-server/data/state/TEST_COVERAGE_INDEX.json is fresh after fix.",
    ],
    "npm-build": [
      "1. The build failed — read the first error block, not the summary.",
      "2. Build failures often cascade from one root cause; fix the root.",
      "3. Confirm `npm run build:fast` succeeds end-to-end before continuing.",
    ],
    "npm-ci": [
      "1. Dependency install/audit failed — read npm WARN/ERR! lines verbatim.",
      "2. Lock file conflict? Re-run `rm -rf node_modules && npm ci`.",
      "3. Vulnerability found? Decide: patch, override, or accept (ledger it).",
    ],
  };
  const hints = familyHints[family] ?? familyHints.vitest;
  return [
    `🔬 AUTO-BUG-HUNT — ${family} command FAILED (${signal}).`,
    `Command: ${cmd.length > 120 ? cmd.slice(0, 120) + "…" : cmd}`,
    ``,
    `SAFETY-CRITICAL: this is CNC code. A failed build/test that ships becomes a crashed machine.`,
    `Investigate before moving on:`,
    ...hints,
    ``,
    `If ambiguous, invoke /scrutinize for a structured review pass before proceeding.`,
  ].join("\n");
}

function main() {
  const stdin = readStdinSafe();
  const passthrough = () => emit({ continue: true });
  if (!stdin || stdin.tool_name !== "Bash") return passthrough();

  const cmd = stdin.tool_input?.command ?? "";
  if (typeof cmd !== "string" || cmd.length === 0) return passthrough();

  const family = detectFamily(cmd);
  if (!family) return passthrough();

  const { failed, signal } = looksFailed(stdin.tool_response);
  if (!failed) return passthrough();

  const sid = stdin.session_id;
  if (recentlyFired(sid, family)) return passthrough();
  markFired(sid, family);

  emit({
    continue: true,
    hookSpecificOutput: {
      hookEventName: "PostToolUse",
      additionalContext: huntPrompt(family, signal, cmd),
    },
  });
}

try { main(); } catch { process.stdout.write(JSON.stringify({ continue: true })); }
