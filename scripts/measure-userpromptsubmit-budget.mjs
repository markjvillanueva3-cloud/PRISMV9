#!/usr/bin/env node
/**
 * measure-userpromptsubmit-budget.mjs — quantify per-prompt injection size
 * across the 15+ UserPromptSubmit injectors active in this fleet.
 *
 * MEMORY-WIKI-OPTIMIZATION-MS0 / U-MWO08 (slot:bravo 2026-05-26). Closes the
 * "Per-prompt injection budget cap" unit by giving operators a measurement
 * surface they can plug into a HARD CAP enforcement hook later (separate
 * unit). This script ONLY measures — never blocks. The enforcement gate is
 * left to a follow-up so operators see the data first.
 *
 * STEADY-STATE extension (TOKEN-EFFICIENCY-INJECT/U-INJECTION-STEADY-STATE-PROBE,
 * 2026-06-11, slot:bravo): `--steady-state` probes each injector TWICE under one
 * session id so first-emit (one-time priming) is separated from the throttled/
 * deduped repeat -- the honest recurring per-prompt cost the CAP gate enforces
 * on. `--write-snapshot` persists it to STEADY_SNAPSHOT_PATH for the gate to read
 * without re-probing the whole fleet. Single-pass behaviour below is unchanged.
 *
 * Strategy: run every injector hook in dry-mode (stdin = `{"prompt":"PROBE"}`)
 * and measure the `hookSpecificOutput.additionalContext` length emitted.
 * Budget: ≤3 KB per UserPromptSubmit across all injectors (spec target).
 *
 * Detection: scan H:/.claude/settings.json `hooks.UserPromptSubmit[*].hooks`
 * for `command: "node <path>.mjs"` and probe each. Hooks emitting non-JSON or
 * not matching the additionalContext shape are recorded but not counted.
 *
 * Usage:  node scripts/measure-userpromptsubmit-budget.mjs [--json] [--probe <text>]
 * Exit:   0 ok (≤budget) · 1 budget exceeded · 2 runtime error
 *
 * @module scripts/measure-userpromptsubmit-budget
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, "..");

export const BUDGET_BYTES = 3 * 1024;   // 3 KB per spec target
export const PROBE_PROMPT_DEFAULT = "What's the current memory wiki strategy?";
export const PROBE_TIMEOUT_MS = 5000;

/** Pure: extract hook command paths from a settings.json object. */
export function extractUserPromptHooks(settings) {
  const out = [];
  const ups = settings?.hooks?.UserPromptSubmit;
  if (!Array.isArray(ups)) return out;
  for (const group of ups) {
    if (!Array.isArray(group?.hooks)) continue;
    for (const h of group.hooks) {
      if (h?.type !== "command" || typeof h.command !== "string") continue;
      // Match `node ... <file>.mjs` (or `.cjs`/`.js`), tolerating "..." or '...' quoting.
      const m = h.command.match(/(?:["'\s]|^)([^"'\s]+\.(?:mjs|cjs|js))(?:["'\s]|$)/);
      if (!m) continue;
      out.push({ command: h.command, scriptPath: m[1], timeoutMs: h.timeout ?? null });
    }
  }
  return out;
}

/** Pure: estimate the additionalContext byte size from a hook's stdout JSON. */
export function parseHookOutput(stdout) {
  try {
    const parsed = JSON.parse(stdout);
    const ctx = parsed?.hookSpecificOutput?.additionalContext;
    if (typeof ctx === "string") {
      return { ok: true, contextBytes: Buffer.byteLength(ctx, "utf8") };
    }
    if (typeof parsed?.systemMessage === "string") {
      return { ok: true, contextBytes: Buffer.byteLength(parsed.systemMessage, "utf8") };
    }
    return { ok: true, contextBytes: 0 };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e), contextBytes: 0 };
  }
}

/** I/O: probe one hook. */
export function probeHook(scriptPath, prompt, { timeoutMs = PROBE_TIMEOUT_MS, execPath = process.execPath, spawn = spawnSync, sessionId = null } = {}) {
  try {
    // session_id is included only when provided so the throttle/dedup injectors
    // (which key on session id) behave identically across a measurement's two
    // passes -- the steady-state probe needs both calls to share one session.
    const payload = sessionId ? { prompt, session_id: sessionId } : { prompt };
    const res = spawn(execPath, [scriptPath], {
      input: JSON.stringify(payload),
      timeout: timeoutMs,
      encoding: "utf8",
    });
    if (res.error) return { ok: false, reason: "spawn-failed", error: res.error.message, contextBytes: 0 };
    if (res.status !== 0 && !res.stdout) return { ok: false, reason: `exit-${res.status}`, contextBytes: 0 };
    return parseHookOutput(res.stdout ?? "");
  } catch (e) {
    return { ok: false, reason: "exception", error: e instanceof Error ? e.message : String(e), contextBytes: 0 };
  }
}

/** Path of the steady-state budget snapshot the CAP gate reads (atomic-written). */
export const STEADY_SNAPSHOT_PATH = path.join(ROOT, "state", "shared", "injection-budget-snapshot.json");

/**
 * I/O: probe one hook TWICE under the SAME session id to separate first-emit
 * (one-time cache-priming content) from STEADY-STATE (the throttled/deduped
 * repeat -- the real recurring per-prompt cost). Session-keyed throttle/dedup
 * markers written by the first call take effect on the second, so the second
 * emission is what every subsequent prompt in a live session actually pays.
 * Example gap this corrects: slot-domain-awareness 1461 B first vs ~126 B steady.
 */
export function probeHookSteadyState(scriptPath, prompt, sessionId, opts = {}) {
  const first = probeHook(scriptPath, prompt, { ...opts, sessionId });
  const steady = probeHook(scriptPath, prompt, { ...opts, sessionId });
  const firstBytes = first.contextBytes || 0;
  const steadyBytes = steady.contextBytes || 0;
  return {
    ok: Boolean(first.ok && steady.ok),
    firstBytes,
    steadyBytes,
    savedBytes: Math.max(0, firstBytes - steadyBytes),
    reason: first.ok ? (steady.ok ? undefined : steady.reason) : first.reason,
  };
}

/** Pure: summarize steady-state probes into first-emit vs steady fleet totals. */
export function summarizeSteadyProbes(steadyProbes, { capBytes = BUDGET_BYTES, nowIso = new Date().toISOString() } = {}) {
  const firstTotalBytes = steadyProbes.reduce((s, p) => s + (p.firstBytes || 0), 0);
  const steadyTotalBytes = steadyProbes.reduce((s, p) => s + (p.steadyBytes || 0), 0);
  const topBySteady = [...steadyProbes]
    .filter((p) => (p.steadyBytes || 0) > 0)
    .sort((a, b) => b.steadyBytes - a.steadyBytes)
    .slice(0, 5);
  return {
    schemaVersion: "1.1.0",
    measured_at: nowIso,
    capBytes,
    firstTotalBytes,
    steadyTotalBytes,
    savedByThrottling: Math.max(0, firstTotalBytes - steadyTotalBytes),
    steadyOverCap: steadyTotalBytes > capBytes,
    steadyOverByBytes: Math.max(0, steadyTotalBytes - capBytes),
    probeCount: steadyProbes.length,
    succeededCount: steadyProbes.filter((p) => p.ok).length,
    failedCount: steadyProbes.filter((p) => !p.ok).length,
    topBySteady: topBySteady.map((p) => ({ scriptPath: p.scriptPath, firstBytes: p.firstBytes, steadyBytes: p.steadyBytes })),
  };
}

/** Render compact markdown for the steady-state report (ASCII-only). */
export function renderSteadyReport(summary) {
  const lines = [
    `# UserPromptSubmit STEADY-STATE budget (injection-budget CAP probe)`,
    ``,
    `Measured: ${summary.measured_at}`,
    `Cap: ${summary.capBytes} bytes (${(summary.capBytes / 1024).toFixed(1)} KB)`,
    `First-emit total: ${summary.firstTotalBytes} bytes (${(summary.firstTotalBytes / 1024).toFixed(1)} KB) -- one-time, overstates recurring cost`,
    `STEADY total: ${summary.steadyTotalBytes} bytes (${(summary.steadyTotalBytes / 1024).toFixed(1)} KB) ${summary.steadyOverCap ? "OVER CAP" : "within cap"}`,
    `Saved by throttle/dedup: ${summary.savedByThrottling} bytes`,
    ``,
    `## Top steady-state consumers`,
    ``,
    `| Script | First B | Steady B |`,
    `|--------|--------:|---------:|`,
  ];
  for (const c of summary.topBySteady) {
    lines.push(`| ${path.basename(c.scriptPath)} | ${c.firstBytes} | ${c.steadyBytes} |`);
  }
  return lines.join("\n");
}

/** Pure: build a report from probed results. */
export function buildBudgetReport(probes) {
  const totalBytes = probes.reduce((s, p) => s + (p.contextBytes || 0), 0);
  const overBudget = totalBytes > BUDGET_BYTES;
  const topConsumers = [...probes]
    .filter((p) => p.contextBytes > 0)
    .sort((a, b) => b.contextBytes - a.contextBytes)
    .slice(0, 5);
  return {
    schemaVersion: "1.0.0",
    measured_at: new Date().toISOString(),
    budgetBytes: BUDGET_BYTES,
    totalBytes,
    overBudget,
    overByBytes: Math.max(0, totalBytes - BUDGET_BYTES),
    probeCount: probes.length,
    succeededCount: probes.filter((p) => p.ok).length,
    failedCount: probes.filter((p) => !p.ok).length,
    topConsumers: topConsumers.map((p) => ({ scriptPath: p.scriptPath, contextBytes: p.contextBytes })),
  };
}

/** Render compact markdown table. */
export function renderReport(report) {
  const lines = [
    `# UserPromptSubmit budget report (U-MWO08)`,
    ``,
    `Measured: ${report.measured_at}`,
    `Budget: ${report.budgetBytes} bytes (${(report.budgetBytes / 1024).toFixed(1)} KB)`,
    `Total: ${report.totalBytes} bytes (${(report.totalBytes / 1024).toFixed(1)} KB) ${report.overBudget ? "✗ OVER" : "✓ within"}`,
    `Probed: ${report.probeCount} (${report.succeededCount} ok, ${report.failedCount} failed)`,
    ``,
    `## Top consumers`,
    ``,
    `| Script | Bytes | KB |`,
    `|--------|------:|---:|`,
  ];
  for (const c of report.topConsumers) {
    lines.push(`| ${path.basename(c.scriptPath)} | ${c.contextBytes} | ${(c.contextBytes / 1024).toFixed(2)} |`);
  }
  return lines.join("\n");
}

/** Read user settings.json from the canonical location. */
export function loadSettings({ fsImpl = fs, home = os.homedir() } = {}) {
  const settingsPath = path.join(home, ".claude", "settings.json");
  try {
    return { settings: JSON.parse(fsImpl.readFileSync(settingsPath, "utf8")), path: settingsPath };
  } catch (e) {
    return { settings: null, path: settingsPath, error: e instanceof Error ? e.message : String(e) };
  }
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("measure-userpromptsubmit-budget.mjs")) {
  try {
    const argv = process.argv.slice(2);
    const probeIdx = argv.indexOf("--probe");
    const probe = probeIdx >= 0 ? argv[probeIdx + 1] : PROBE_PROMPT_DEFAULT;
    const { settings, error } = loadSettings();
    if (!settings) {
      process.stderr.write(`Failed to load settings.json: ${error}\n`);
      process.exit(2);
    }
    const hooks = extractUserPromptHooks(settings);

    // --steady-state: two-pass session-id-aware probe (the honest recurring cost).
    if (argv.includes("--steady-state")) {
      const sessionId = `probe-${Date.now()}-${process.pid}`;
      const steadyProbes = hooks.map((h) => ({
        scriptPath: h.scriptPath,
        ...probeHookSteadyState(h.scriptPath, probe, sessionId, { timeoutMs: h.timeoutMs ?? PROBE_TIMEOUT_MS }),
      }));
      const summary = summarizeSteadyProbes(steadyProbes);
      if (argv.includes("--write-snapshot")) {
        try {
          const snapshot = { ...summary, perHook: steadyProbes.map((p) => ({ scriptPath: p.scriptPath, firstBytes: p.firstBytes, steadyBytes: p.steadyBytes, ok: p.ok })) };
          const tmp = `${STEADY_SNAPSHOT_PATH}.${process.pid}.tmp`;
          fs.writeFileSync(tmp, `${JSON.stringify(snapshot, null, 2)}\n`);
          fs.renameSync(tmp, STEADY_SNAPSHOT_PATH);
        } catch (e) {
          process.stderr.write(`steady-state snapshot write failed: ${e instanceof Error ? e.message : String(e)}\n`);
        }
      }
      if (argv.includes("--json")) {
        process.stdout.write(`${JSON.stringify({ summary, steadyProbes }, null, 2)}\n`);
      } else {
        process.stdout.write(`${renderSteadyReport(summary)}\n`);
      }
      process.exit(summary.steadyOverCap ? 1 : 0);
    }

    const probes = hooks.map((h) => ({ scriptPath: h.scriptPath, ...probeHook(h.scriptPath, probe, { timeoutMs: h.timeoutMs ?? PROBE_TIMEOUT_MS }) }));
    const report = buildBudgetReport(probes);
    if (argv.includes("--json")) {
      process.stdout.write(`${JSON.stringify({ report, probes }, null, 2)}\n`);
    } else {
      process.stdout.write(`${renderReport(report)}\n`);
    }
    process.exit(report.overBudget ? 1 : 0);
  } catch (e) {
    process.stderr.write(`measure-userpromptsubmit-budget: ${e instanceof Error ? e.message : String(e)}\n`);
    process.exit(2);
  }
}
