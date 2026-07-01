// TOKEN-SAVINGS-GREP-ROUTE / 2026-05-22, slot:alpha — mcp-route-suggest Grep tests.
//
// Verifies the new Grep branch added to mcp-route-suggest.mjs:
//   - Grep is now in the PreToolUse allowlist
//   - `isBroadGrep` classifier: content + no glob/type + prism path = broad
//   - Broad grep → TOKEN-SAVE route suggestion is injected
//   - Narrowed grep (glob/type/files_with_matches/non-prism) → silent passthrough
//
// Pure tests run isBroadGrep directly (exported). Integration tests spawn the
// hook as a subprocess with controlled JSON stdin, exactly matching production.

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import path from "node:path";
import { isBroadGrep } from "../mcp-route-suggest.mjs";

const HOOK = path.resolve("H:/prism/.claude/hooks/mcp-route-suggest.mjs");
// PORTABILITY (2026-06-09, slot:alpha): use the RUNNING node binary, not a
// hardcoded absolute path. The literal "H:/.claude/bin/portable-node" does not
// exist on every host/runner, so all 5 subprocess (Grep-branch) tests failed
// `spawn ... ENOENT` at HEAD — a fleet-wide stop_on_failing_tests hazard.
// process.execPath is always the valid interpreter (same fix the sibling
// doctrine-gate test already uses).
const NODE = process.execPath;

function runHook(stdinObj, timeoutMs = 10_000) {
  return new Promise((resolve, reject) => {
    const child = spawn(NODE, [HOOK], { stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error(`hook timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    child.stdout.on("data", (c) => (stdout += c));
    child.stderr.on("data", (c) => (stderr += c));
    child.on("close", () => {
      clearTimeout(timer);
      try {
        resolve({ stdout, stderr, parsed: JSON.parse(stdout || "{}") });
      } catch (e) {
        resolve({ stdout, stderr, parseError: e.message });
      }
    });
    child.stdin.write(JSON.stringify(stdinObj));
    child.stdin.end();
  });
}

function additionalContext(result) {
  return result?.parsed?.hookSpecificOutput?.additionalContext || "";
}

// ── isBroadGrep — pure unit tests ──────────────────────────────────────────
test("isBroadGrep — happy path: content + no narrowing + prism path", () => {
  assert.equal(
    isBroadGrep({ pattern: "foo", path: "H:/prism", output_mode: "content" }),
    true,
  );
});

test("isBroadGrep — happy path: content + no path (defaults to cwd ≈ prism)", () => {
  assert.equal(
    isBroadGrep({ pattern: "foo", path: "", output_mode: "content" }),
    true,
  );
});

test("isBroadGrep — files_with_matches → NOT broad (already cheap)", () => {
  assert.equal(
    isBroadGrep({ pattern: "foo", path: "H:/prism", output_mode: "files_with_matches" }),
    false,
  );
});

test("isBroadGrep — default output_mode → NOT broad (files_with_matches is default)", () => {
  assert.equal(
    isBroadGrep({ pattern: "foo", path: "H:/prism" }),
    false,
  );
});

test("isBroadGrep — glob filter present → narrowed, NOT broad", () => {
  assert.equal(
    isBroadGrep({ pattern: "foo", path: "H:/prism", output_mode: "content", glob: "**/*.ts" }),
    false,
  );
});

test("isBroadGrep — type filter present → narrowed, NOT broad", () => {
  assert.equal(
    isBroadGrep({ pattern: "foo", path: "H:/prism", output_mode: "content", type: "ts" }),
    false,
  );
});

test("isBroadGrep — non-prism path → NOT broad (out of scope)", () => {
  assert.equal(
    isBroadGrep({ pattern: "foo", path: "C:/Users/other", output_mode: "content" }),
    false,
  );
});

test("isBroadGrep — empty pattern → NOT broad (defensive)", () => {
  assert.equal(
    isBroadGrep({ pattern: "", path: "H:/prism", output_mode: "content" }),
    false,
  );
});

test("isBroadGrep — null/undefined/non-object → NOT broad (defensive)", () => {
  assert.equal(isBroadGrep(null), false);
  assert.equal(isBroadGrep(undefined), false);
  assert.equal(isBroadGrep("nope"), false);
  assert.equal(isBroadGrep(42), false);
});

test("isBroadGrep — backslash path normalized correctly", () => {
  assert.equal(
    isBroadGrep({ pattern: "foo", path: "H:\\PRISM\\mcp-server", output_mode: "content" }),
    true,
  );
});

// ── Subprocess integration — real stdin/stdout contract ────────────────────
test("hook → broad Grep emits TOKEN-SAVE additionalContext", async () => {
  const r = await runHook({
    session_id: "test-grep-broad-01",
    tool_name: "Grep",
    tool_input: { pattern: "Engine", path: "H:/prism", output_mode: "content" },
  });
  const ctx = additionalContext(r);
  assert.match(ctx, /TOKEN-SAVE/);
  assert.match(ctx, /master_index_query|code_search/);
});

test("hook → narrowed Grep (glob) is SILENT (no suggestion)", async () => {
  const r = await runHook({
    session_id: "test-grep-narrow-01",
    tool_name: "Grep",
    tool_input: { pattern: "Engine", path: "H:/prism", output_mode: "content", glob: "**/*.ts" },
  });
  // Either no additionalContext, or it doesn't contain TOKEN-SAVE.
  assert.doesNotMatch(additionalContext(r), /TOKEN-SAVE/);
});

test("hook → files_with_matches Grep is SILENT (already cheap)", async () => {
  const r = await runHook({
    session_id: "test-grep-fwm-01",
    tool_name: "Grep",
    tool_input: { pattern: "Engine", path: "H:/prism", output_mode: "files_with_matches" },
  });
  assert.doesNotMatch(additionalContext(r), /TOKEN-SAVE/);
});

test("hook → non-Grep tools NOT affected by the new branch", async () => {
  const r = await runHook({
    session_id: "test-grep-other-01",
    tool_name: "Read",
    tool_input: { file_path: "H:/prism/README.md" },
  });
  // The new TOKEN-SAVE message must NOT appear on a Read.
  assert.doesNotMatch(additionalContext(r), /TOKEN-SAVE/);
});

test("hook → non-prism path Grep is SILENT (out of scope)", async () => {
  const r = await runHook({
    session_id: "test-grep-elsewhere-01",
    tool_name: "Grep",
    tool_input: { pattern: "Engine", path: "C:/Users/other/repo", output_mode: "content" },
  });
  assert.doesNotMatch(additionalContext(r), /TOKEN-SAVE/);
});

// ── TOKEN-SAVINGS-PIVOT/U-NUDGE-SELF-AWARENESS (iter22, 2026-05-22) ──────
// formatTakeRateAdvisory — pure tests for the in-context fleet take-rate
// injector. Surfaces measured rate into each nudge so the model sees the
// gap before deciding whether to act on it.

import { formatTakeRateAdvisory } from "../mcp-route-suggest.mjs";

test("formatTakeRateAdvisory — happy path: fires>=5 + rate<20% returns line", () => {
  const r = formatTakeRateAdvisory({ totalFires: 284, takeupTotals: { totalTakeups: 1 } });
  assert.ok(r);
  assert.match(r, /1\/284/);
  assert.match(r, /0\.4%/);
  assert.match(r, /unactioned/);
});

test("formatTakeRateAdvisory — fires below minFires returns null", () => {
  assert.equal(formatTakeRateAdvisory({ totalFires: 3, takeupTotals: { totalTakeups: 0 } }), null);
  assert.equal(formatTakeRateAdvisory({ totalFires: 4, takeupTotals: { totalTakeups: 0 } }), null);
});

test("formatTakeRateAdvisory — rate at threshold returns null (>= threshold)", () => {
  // rate = 20/100 = 0.20 = threshold → silent
  assert.equal(formatTakeRateAdvisory({ totalFires: 100, takeupTotals: { totalTakeups: 20 } }), null);
});

test("formatTakeRateAdvisory — rate above threshold returns null", () => {
  // rate = 50/100 = 50% → silent (healthy)
  assert.equal(formatTakeRateAdvisory({ totalFires: 100, takeupTotals: { totalTakeups: 50 } }), null);
});

test("formatTakeRateAdvisory — missing takeupTotals defaults to 0", () => {
  const r = formatTakeRateAdvisory({ totalFires: 100 });
  assert.ok(r);
  assert.match(r, /0\/100/);
  assert.match(r, /0\.0%/);
});

test("formatTakeRateAdvisory — null/undefined/non-object → null", () => {
  assert.equal(formatTakeRateAdvisory(null), null);
  assert.equal(formatTakeRateAdvisory(undefined), null);
  assert.equal(formatTakeRateAdvisory("not-an-object"), null);
  assert.equal(formatTakeRateAdvisory({}), null);
});

test("formatTakeRateAdvisory — malformed totalFires → null (defensive)", () => {
  assert.equal(formatTakeRateAdvisory({ totalFires: "ten", takeupTotals: { totalTakeups: 0 } }), null);
  assert.equal(formatTakeRateAdvisory({ totalFires: NaN, takeupTotals: { totalTakeups: 0 } }), null);
  assert.equal(formatTakeRateAdvisory({ totalFires: Infinity, takeupTotals: { totalTakeups: 0 } }), null);
});

test("formatTakeRateAdvisory — malformed totalTakeups treated as 0", () => {
  const r = formatTakeRateAdvisory({ totalFires: 100, takeupTotals: { totalTakeups: "bogus" } });
  assert.ok(r);
  assert.match(r, /0\/100/);
});

test("formatTakeRateAdvisory — custom threshold respected", () => {
  // rate = 10/100 = 10%
  // threshold 50% → 10% < 50% → returns advisory
  assert.ok(formatTakeRateAdvisory({ totalFires: 100, takeupTotals: { totalTakeups: 10 } }, 0.50));
  // threshold 5% → 10% >= 5% → silent
  assert.equal(formatTakeRateAdvisory({ totalFires: 100, takeupTotals: { totalTakeups: 10 } }, 0.05), null);
});

test("formatTakeRateAdvisory — custom minFires respected", () => {
  // fires=3, minFires default 5 → null
  assert.equal(formatTakeRateAdvisory({ totalFires: 3, takeupTotals: { totalTakeups: 0 } }), null);
  // fires=3, minFires=3 → advisory (rate 0% < 20%)
  assert.ok(formatTakeRateAdvisory({ totalFires: 3, takeupTotals: { totalTakeups: 0 } }, 0.20, 3));
});

test("formatTakeRateAdvisory — boundary: exactly minFires", () => {
  const r = formatTakeRateAdvisory({ totalFires: 5, takeupTotals: { totalTakeups: 0 } });
  assert.ok(r);
  assert.match(r, /0\/5/);
});

test("formatTakeRateAdvisory — boundary: just below threshold (19.9%)", () => {
  // rate = 199/1000 = 0.199 < 0.20 → advisory
  const r = formatTakeRateAdvisory({ totalFires: 1000, takeupTotals: { totalTakeups: 199 } });
  assert.ok(r);
  assert.match(r, /199\/1000/);
});

test("formatTakeRateAdvisory — advisory format includes 'For THIS nudge' actionable line", () => {
  const r = formatTakeRateAdvisory({ totalFires: 284, takeupTotals: { totalTakeups: 1 } });
  assert.ok(r);
  assert.match(r, /For THIS nudge/);
  assert.match(r, /MCP action/);
});
