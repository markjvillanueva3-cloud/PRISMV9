#!/usr/bin/env node
/**
 * bench-octopus-overhead.mjs — INTEL-OLLAMA-OBSIDIAN-MS0 / OCTOPUS-CONSENSUS
 *
 * Measures the wall-clock cost of running each octopus PostToolUse hook script
 * directly (without going through the Claude Code harness). Octopus's broad
 * `Bash|Edit|Write|Read|WebFetch|Grep` matcher fires `post-tool-dispatch.sh`
 * on every tool call, plus other matchers for specific Bash patterns.
 *
 * This script runs each hook against an empty stdin payload N times and
 * reports per-hook mean/p50/p95/total. Use it to decide whether to leave
 * octopus enabled, or `claude plugin disable octo`.
 *
 * Usage:
 *   node scripts/bench-octopus-overhead.mjs              # default 10 iterations
 *   node scripts/bench-octopus-overhead.mjs --n=20       # custom iterations
 *   node scripts/bench-octopus-overhead.mjs --json       # machine-readable
 *
 * Caveats:
 *   - Measures hook execution in isolation; doesn't measure harness overhead
 *     of dispatching hooks (which is small but non-zero).
 *   - Hooks may behave differently under matcher conditions; we feed empty
 *     env vars so they take their cheapest path. Real overhead may be higher
 *     when matchers actually fire (e.g. orchestrate.sh detection).
 */

import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

const N = parseInt(process.argv.find((a) => a.startsWith("--n="))?.split("=")[1] ?? "10", 10);
const JSON_OUT = process.argv.includes("--json");

const PLUGIN_ROOT = path.join(os.homedir(), ".claude/plugins/cache/nyldn-plugins/octo/9.30.0");
const POST_TOOL_HOOK = path.join(PLUGIN_ROOT, "hooks/post-tool-dispatch.sh");
const USER_PROMPT_HOOK = path.join(PLUGIN_ROOT, "hooks/user-prompt-submit.sh");
const DONE_CRITERIA_HOOK = path.join(PLUGIN_ROOT, "hooks/done-criteria.sh");
const PRE_COMMIT_HOOK = path.join(PLUGIN_ROOT, ".claude/hooks/pre-commit.sh");

const HOOKS = [
  { name: "post-tool-dispatch (every Bash|Edit|Write|Read|...)", path: POST_TOOL_HOOK, fires: "every tool call" },
  { name: "user-prompt-submit (every prompt)", path: USER_PROMPT_HOOK, fires: "every prompt" },
  { name: "done-criteria (every prompt)", path: DONE_CRITERIA_HOOK, fires: "every prompt" },
  { name: "pre-commit (Edit/Write only)", path: PRE_COMMIT_HOOK, fires: "Edit/Write only" },
];

function toBashPath(p) {
  // C:\Users\Foo → /c/Users/Foo for git-bash compatibility
  return p.replace(/^([A-Za-z]):\\/, (_, d) => `/${d.toLowerCase()}/`).replace(/\\/g, "/");
}

function runHook(file) {
  return new Promise((resolve) => {
    const start = Date.now();
    let settled = false;
    const settle = (r) => { if (!settled) { settled = true; resolve(r); } };
    let child;
    const bashFile = process.platform === "win32" ? toBashPath(file) : file;
    try {
      child = spawn("bash", [bashFile], {
        stdio: ["pipe", "pipe", "pipe"],
        windowsHide: true,
        env: {
          ...process.env,
          CLAUDE_PLUGIN_ROOT: PLUGIN_ROOT,
          TOOL_NAME: "Read",
          USER_PROMPT: "ping",
        },
      });
    } catch (e) {
      return settle({ ok: false, ms: Date.now() - start, error: e.message });
    }
    const t = setTimeout(() => {
      try { child.kill(); } catch { /* ignore */ }
      settle({ ok: false, ms: Date.now() - start, error: "timeout" });
    }, 30_000);
    child.stdout.on("data", () => { /* discard */ });
    child.stderr.on("data", () => { /* discard */ });
    child.on("error", (e) => { clearTimeout(t); settle({ ok: false, ms: Date.now() - start, error: e.message }); });
    child.on("exit", (code) => {
      clearTimeout(t);
      settle({ ok: code === 0, ms: Date.now() - start, error: code !== 0 ? `exit ${code}` : null });
    });
    try { child.stdin.write("{}"); child.stdin.end(); } catch { /* ignore */ }
  });
}

function stats(arr) {
  if (arr.length === 0) return { n: 0 };
  const sorted = [...arr].sort((a, b) => a - b);
  const sum = sorted.reduce((s, x) => s + x, 0);
  return {
    n: arr.length,
    meanMs: Math.round(sum / arr.length),
    p50Ms: sorted[Math.floor(sorted.length / 2)],
    p95Ms: sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))],
    minMs: sorted[0],
    maxMs: sorted[sorted.length - 1],
    totalMs: sum,
  };
}

async function existsFile(p) {
  try { await fs.access(p); return true; } catch { return false; }
}

async function main() {
  const results = [];

  for (const h of HOOKS) {
    if (!(await existsFile(h.path))) {
      results.push({ ...h, missing: true });
      continue;
    }
    const ok = [];
    const fail = [];
    // 1 warmup
    await runHook(h.path);
    for (let i = 0; i < N; i++) {
      const r = await runHook(h.path);
      if (r.ok) ok.push(r.ms);
      else fail.push(r);
    }
    results.push({
      ...h,
      iterations: N,
      okCount: ok.length,
      failCount: fail.length,
      okStats: stats(ok),
      firstFailError: fail[0]?.error ?? null,
    });
  }

  // Cumulative impact estimate per typical chat turn
  const postToolStats = results.find((r) => r.path === POST_TOOL_HOOK)?.okStats ?? {};
  const userPromptStats = results.find((r) => r.path === USER_PROMPT_HOOK)?.okStats ?? {};
  const doneCriteriaStats = results.find((r) => r.path === DONE_CRITERIA_HOOK)?.okStats ?? {};

  const TYPICAL_TOOL_CALLS_PER_TURN = 5;
  const turnOverheadMs = (postToolStats.meanMs ?? 0) * TYPICAL_TOOL_CALLS_PER_TURN
    + (userPromptStats.meanMs ?? 0)
    + (doneCriteriaStats.meanMs ?? 0);

  const summary = {
    machine: os.hostname(),
    iterations: N,
    pluginRoot: PLUGIN_ROOT,
    estimatedOverheadPerTurnMs: turnOverheadMs,
    estimatedOverheadPerTurnNote: `Assumes ${TYPICAL_TOOL_CALLS_PER_TURN} tool calls per turn × post-tool-dispatch + 1× user-prompt + 1× done-criteria. Real cost varies with prompt patterns + matcher hits.`,
    results,
  };

  if (JSON_OUT) {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  console.log(`\nOctopus hook overhead benchmark (n=${N} iterations + 1 warmup, machine=${os.hostname()})\n`);
  console.log("hook                                                  fires                    n   mean    p50    p95   max  fails");
  console.log("─".repeat(120));
  for (const r of results) {
    if (r.missing) {
      console.log(`${r.name.padEnd(54)} ${r.fires.padEnd(24)} MISSING`);
      continue;
    }
    const s = r.okStats;
    console.log(`${r.name.padEnd(54)} ${r.fires.padEnd(24)} ${String(r.okCount).padStart(3)} ${String(s.meanMs).padStart(5)}ms ${String(s.p50Ms).padStart(5)}ms ${String(s.p95Ms).padStart(5)}ms ${String(s.maxMs).padStart(5)}ms ${r.failCount}`);
  }
  console.log("\nEstimated overhead per typical chat turn:");
  console.log(`  ~${turnOverheadMs}ms   (${TYPICAL_TOOL_CALLS_PER_TURN} tool calls × post-tool-dispatch + 1× user-prompt + 1× done-criteria)`);
  console.log("\nDecision:");
  if (turnOverheadMs > 5000) {
    console.log(`  ⚠ >5s per turn — consider 'claude plugin disable octo' for PRISM-physics work`);
  } else if (turnOverheadMs > 1000) {
    console.log(`  ⚠ ${turnOverheadMs}ms per turn — noticeable but tolerable`);
  } else {
    console.log(`  ✓ ${turnOverheadMs}ms per turn — keep enabled`);
  }
}

main().catch((e) => {
  console.error(`bench failed: ${e.message ?? String(e)}`);
  process.exit(1);
});
