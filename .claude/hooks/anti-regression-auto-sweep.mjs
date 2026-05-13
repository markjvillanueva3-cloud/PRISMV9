#!/usr/bin/env node
// tier: T3
/**
 * anti-regression-auto-sweep.mjs — PostToolUse hook
 *
 * Milestone: U-AF05 (autonomous-foolproof) / harness-recovery-2026-05-06.
 *
 * After every Bash invocation that was a `git commit`, this hook runs (or
 * reads a cached) vitest sweep and asks `decideAntiRegressionSweep` from
 * `lib/autonomous-foolproof-logic.mjs` whether the autonomous loop should
 * be blocked because tests regressed.
 *
 * Design:
 *   - Pure I/O glue. Decision policy lives in
 *     lib/autonomous-foolproof-logic.mjs:340 (`decideAntiRegressionSweep`).
 *     14 vitest cases there cover all branches; we do not duplicate the logic.
 *   - Fast-paths first: non-Bash tools, non-commit commands, and
 *     non-autonomous mode all exit in <5 ms with `{continue: true}`.
 *   - Vitest is only spawned in autonomous-mode commit calls. The 130 s
 *     hook timeout in settings.json sizes for ~3000 tests; the internal
 *     subprocess timeout is held at 110 s so the harness never has to
 *     SIGTERM us mid-run.
 *   - On any failure (parse error, spawn fail, timeout) we exit `{continue:true}`.
 *     `continueOnError: true` in settings.json means a broken sweep does
 *     not hard-block the chain — but a *real* regression detection still
 *     emits `{continue:false, decision:"regression-detected"}` per policy.
 *
 * Replaces the 1-line stub that previously occupied this path. The stub
 * was placed there in 2026-04-21 to displace earlier corrupt markdown
 * content that crashed Node on every PostToolUse with
 * `ERR_INVALID_OR_UNEXPECTED_TOKEN`. The stub did its job; this is the
 * intended-final implementation.
 */

import { spawnSync } from "node:child_process";
import { decideAntiRegressionSweep } from "./lib/autonomous-foolproof-logic.mjs";

const VITEST_TIMEOUT_MS = 110_000; // 20s margin under 130s hook budget
const STDIN_READ_TIMEOUT_MS = 1500; // hard cap waiting for hook envelope
const SELF_TIMEOUT_MARGIN_MS = 5000; // overall hook budget = vitest + this
const COMMIT_RX = /^\s*(?:rtk\s+)?git\s+commit\b/;

function emit(payload) {
  try {
    process.stdout.write(JSON.stringify(payload));
  } catch {
    // stdout closed; nothing we can do
  }
  process.exit(0);
}

async function readStdin() {
  return new Promise((resolve) => {
    let data = "";
    let settled = false;
    const finish = (v) => {
      if (settled) return;
      settled = true;
      resolve(v);
    };
    process.stdin.setEncoding("utf-8");
    process.stdin.on("data", (chunk) => (data += chunk));
    process.stdin.on("end", () => {
      try {
        finish(data ? JSON.parse(data) : {});
      } catch {
        finish({});
      }
    });
    process.stdin.on("error", () => finish({}));
    // Hard cap: never block past STDIN_READ_TIMEOUT_MS waiting for stdin.
    setTimeout(() => finish(safeParse(data)), STDIN_READ_TIMEOUT_MS).unref();
  });
}

function safeParse(s) {
  if (!s) return {};
  try {
    return JSON.parse(s);
  } catch {
    return {};
  }
}

function isCommitInvocation(envelope) {
  // Claude Code hook envelope: { tool_name, tool_input: {...}, ... }
  if (!envelope || typeof envelope !== "object") return false;
  const toolName = envelope.tool_name || envelope.toolName || "";
  if (toolName !== "Bash") return false;
  const cmd =
    (envelope.tool_input && envelope.tool_input.command) ||
    envelope.command ||
    "";
  return COMMIT_RX.test(String(cmd || ""));
}

function isAutonomousMode() {
  const v = process.env.PRISM_AUTONOMOUS;
  if (!v) return false;
  const s = String(v).toLowerCase();
  return s === "1" || s === "true" || s === "yes" || s === "on";
}

function runVitestSweep() {
  // We deliberately bound the run with --reporter=json so we can parse a
  // structured summary instead of scraping text. Spawn synchronously so
  // the hook stays a single-shot process under the 130s budget.
  let res;
  try {
    res = spawnSync(
      process.platform === "win32" ? "npx.cmd" : "npx",
      ["--no-install", "vitest", "run", "--reporter=json"],
      {
        cwd: "H:/prism/mcp-server",
        encoding: "utf-8",
        timeout: VITEST_TIMEOUT_MS,
        maxBuffer: 64 * 1024 * 1024,
        windowsHide: true,
      },
    );
  } catch {
    return null;
  }
  if (!res || res.error) return null;
  // vitest exits non-zero on test failure but still emits the JSON summary;
  // both stdout and stderr are inspected.
  const blob = `${res.stdout || ""}\n${res.stderr || ""}`;
  return parseVitestJson(blob);
}

function parseVitestJson(text) {
  if (!text || typeof text !== "string") return null;
  // The reporter emits one JSON object somewhere in the stream. Find each
  // top-level `{` ... matching `}` block; pick the last one that parses
  // and contains the expected counters.
  const candidates = [];
  let depth = 0;
  let start = -1;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === "{") {
      if (depth === 0) start = i;
      depth++;
    } else if (c === "}") {
      depth--;
      if (depth === 0 && start >= 0) {
        candidates.push(text.slice(start, i + 1));
        start = -1;
      }
    }
  }
  for (let i = candidates.length - 1; i >= 0; i--) {
    try {
      const j = JSON.parse(candidates[i]);
      const total = pickNumber(j, ["numTotalTests", "totalTests"]);
      const passed = pickNumber(j, ["numPassedTests", "passed"]);
      const failed = pickNumber(j, ["numFailedTests", "failed"]);
      if (Number.isFinite(total) && Number.isFinite(passed) && Number.isFinite(failed)) {
        return {
          totalTests: total,
          passed,
          failed,
          failedFiles: extractFailedFiles(j),
        };
      }
    } catch {
      // try next candidate
    }
  }
  return null;
}

function pickNumber(obj, keys) {
  for (const k of keys) {
    if (obj && Number.isFinite(obj[k])) return Number(obj[k]);
  }
  return Number.NaN;
}

function extractFailedFiles(j) {
  try {
    const out = [];
    const results = Array.isArray(j.testResults) ? j.testResults : [];
    for (const tr of results) {
      const failed = Number(tr.numFailingTests || 0);
      if (failed > 0 && tr.name) out.push(String(tr.name));
    }
    return out;
  } catch {
    return [];
  }
}

(async function main() {
  // Hard wall-clock guard: if anything below misbehaves, we still exit cleanly.
  const guard = setTimeout(
    () => emit({ continue: true, reason: "hook-self-timeout" }),
    VITEST_TIMEOUT_MS + SELF_TIMEOUT_MARGIN_MS,
  );
  guard.unref();

  const envelope = await readStdin();
  const isCommit = isCommitInvocation(envelope);
  const isAutonomous = isAutonomousMode();

  // Fast paths (no subprocess) — match the policy function's early-exit reasons.
  if (!isCommit) return emit({ continue: true, reason: "not-a-commit" });
  if (!isAutonomous) return emit({ continue: true, reason: "non-autonomous" });

  // Real path: run vitest, ask the policy.
  const sweep = runVitestSweep();
  const decision = decideAntiRegressionSweep({
    isAutonomous,
    isCommit,
    sweepResult: sweep,
  });

  // The policy returns {continue, reason, ...}. Pass it through verbatim so
  // the harness sees the same contract the unit tests assert.
  emit(decision);
})().catch(() => emit({ continue: true, reason: "hook-uncaught-error" }));
