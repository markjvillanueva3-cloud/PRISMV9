#!/usr/bin/env node
// tier: T0
/**
 * injection-budget-cap-enforce.mjs -- PreToolUse(Write) per-prompt injection
 * budget CEILING gate (awareness ENFORCEMENT unit #3).
 *
 * TOKEN-EFFICIENCY-INJECT/U-INJECTION-BUDGET-CAP (2026-06-11, slot:bravo).
 *
 * Sibling to injection-knob-enforce.mjs on a DIFFERENT axis:
 *   - knob-enforce blocks a KNOBLESS recurring injector (un-silenceable).
 *   - THIS gate blocks the recurring injection budget from silently GROWING
 *     past a CAP: on Write of a new SessionStart/UserPromptSubmit context
 *     injector it reads the steady-state budget snapshot and BLOCKS when the
 *     fleet steady-state per-prompt total is already at/over the CAP -- forcing
 *     a trim/throttle of an existing injector before a new one is born.
 *
 * Self-protecting invariant (like knob-enforce): it fires only when the budget
 * is actually full, so today (steady floor ~244 B << 3 KB CAP) it is dormant --
 * it exists to stop the 12x creep the steady-state probe revealed is possible
 * (single-pass U-MWO08 read 2854 B where the throttled steady-state is 244 B).
 *
 * HONEST BY CONSTRUCTION: it enforces only on a FRESH snapshot (<= TTL). A
 * missing or stale snapshot -> fail-OPEN (never block on stale/absent data).
 * The snapshot is produced by:
 *   node scripts/measure-userpromptsubmit-budget.mjs --steady-state --write-snapshot
 * (intended to be refreshed by a scheduled task; until then the gate is a
 * fresh-data-only ceiling guard -- documented, not silent).
 *
 * It REUSES the census's recurring-injector detector (targetsRecurringInjection
 * from injection-knob-enforce, which wraps the census emitsContext) and the
 * steady-state module's STEADY_SNAPSHOT_PATH -- measure and enforce share one
 * definition so they cannot drift.
 *
 * SIGNAL: block IFF (1) Write of a .claude/hooks/<name>.mjs, (2) content is a
 *   SessionStart/UserPromptSubmit context injector, (3) snapshot is fresh, AND
 *   (4) snapshot.steadyTotalBytes >= cap.
 *
 * EXIT CONTRACT (Claude Code PreToolUse):
 *   allow:  {continue: true}
 *   block:  {hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"deny",permissionDecisionReason:"..."}}
 *   advise: {continue: true, systemMessage: "..."}   (when bypassed)
 *
 * Knobs:
 *   PRISM_INJECTION_BUDGET_CAP_BYTES=N   cap override (default 3072 = spec target)
 *   PRISM_INJECTION_BUDGET_CAP_TTL_MS=N  snapshot freshness window (default 24h)
 *   PRISM_INJECTION_BUDGET_CAP_DISABLE=1 downgrade the block to an advisory
 *
 * Test seam: evaluate({stdin, env, snapshot, nowMs}) is pure over its inputs
 * (snapshot injectable; nowMs injectable), so tests drive it without spawning.
 *
 * @module .claude/hooks/injection-budget-cap-enforce
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { targetsRecurringInjection } from "./injection-knob-enforce.mjs";
import { STEADY_SNAPSHOT_PATH } from "../../scripts/measure-userpromptsubmit-budget.mjs";

export const DEFAULT_CAP_BYTES = 3 * 1024;             // spec target; tighten via env as ceiling measurement improves
export const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;     // 24h freshness window

/** Pure: positive cap from env, else the default. */
export function capFromEnv(env = process.env) {
  const n = env?.PRISM_INJECTION_BUDGET_CAP_BYTES != null ? Number(env.PRISM_INJECTION_BUDGET_CAP_BYTES) : NaN;
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_CAP_BYTES;
}

/** Pure: positive TTL (ms) from env, else the default. */
export function ttlFromEnv(env = process.env) {
  const n = env?.PRISM_INJECTION_BUDGET_CAP_TTL_MS != null ? Number(env.PRISM_INJECTION_BUDGET_CAP_TTL_MS) : NaN;
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_TTL_MS;
}

/**
 * Read + validate the steady-state snapshot.
 * @returns {{ok:true, steadyTotalBytes:number, ageMs:number, top:object[]} | {ok:false, reason:string}}
 */
export function readSnapshot({ snapshotPath = STEADY_SNAPSHOT_PATH, fsImpl = fs, nowMs = Date.now() } = {}) {
  let raw;
  try {
    raw = fsImpl.readFileSync(snapshotPath, "utf8");
  } catch {
    return { ok: false, reason: "no snapshot on disk" };
  }
  let j;
  try {
    j = JSON.parse(raw);
  } catch {
    return { ok: false, reason: "snapshot is unparseable JSON" };
  }
  const steadyTotalBytes = Number(j?.steadyTotalBytes);
  if (!Number.isFinite(steadyTotalBytes)) return { ok: false, reason: "snapshot missing steadyTotalBytes" };
  const measuredMs = Date.parse(j?.measured_at ?? "");
  const ageMs = Number.isFinite(measuredMs) ? Math.max(0, nowMs - measuredMs) : Infinity;
  return { ok: true, steadyTotalBytes, ageMs, top: Array.isArray(j?.topBySteady) ? j.topBySteady : [] };
}

/**
 * @param {{stdin: object|null, env?: object, snapshot?: object, nowMs?: number}} opts
 * @returns {{action:"allow"|"block"|"advise", reason:string, steadyTotalBytes?:number, cap?:number}}
 */
export function evaluate({ stdin, env, snapshot, nowMs = Date.now() } = {}) {
  const e = env ?? process.env;
  if (String(stdin?.tool_name || "") !== "Write") return { action: "allow", reason: "tool is not Write" };

  const ti = stdin?.tool_input ?? {};
  const filePath = typeof ti.file_path === "string" ? ti.file_path.replace(/\\/g, "/") : "";
  if (!/\.claude\/hooks\/[^/]+\.mjs$/.test(filePath)) {
    return { action: "allow", reason: "not a .claude/hooks/*.mjs file" };
  }
  const content = typeof ti.content === "string" ? ti.content : "";
  if (!content) return { action: "allow", reason: "no content to assess (fail-open)" };
  if (!targetsRecurringInjection(content)) {
    return { action: "allow", reason: "not a SessionStart/UserPromptSubmit context injector" };
  }

  const snap = snapshot ?? readSnapshot({ nowMs });
  if (!snap.ok) return { action: "allow", reason: `fail-open: ${snap.reason}` };
  if (snap.ageMs > ttlFromEnv(e)) {
    return { action: "allow", reason: `fail-open: snapshot stale (${Math.round(snap.ageMs / 3600000)}h)` };
  }

  const cap = capFromEnv(e);
  if (snap.steadyTotalBytes < cap) {
    return { action: "allow", reason: `budget has headroom (${snap.steadyTotalBytes}/${cap} B steady)`, steadyTotalBytes: snap.steadyTotalBytes, cap };
  }

  const top = (snap.top || [])
    .slice(0, 3)
    .map((t) => `${path.basename(String(t?.scriptPath || ""))} ${t?.steadyBytes ?? "?"}B`)
    .join(", ");
  const reason =
    `INJECTION BUDGET FULL: per-prompt steady-state injection is ${snap.steadyTotalBytes}/${cap} B (at/over CAP). ` +
    `Adding a new SessionStart/UserPromptSubmit injector would push the recurring per-prompt context over budget. ` +
    `TRIM or tighten-throttle an existing injector first. Top steady consumers: ${top || "(see snapshot)"}. ` +
    `FIX: gate/throttle/dedup an existing injector, then refresh the snapshot:\n` +
    `  node scripts/measure-userpromptsubmit-budget.mjs --steady-state --write-snapshot\n` +
    `(Emergency bypass: PRISM_INJECTION_BUDGET_CAP_DISABLE=1.)`;
  const bypassed = e?.PRISM_INJECTION_BUDGET_CAP_DISABLE === "1";
  return { action: bypassed ? "advise" : "block", reason, steadyTotalBytes: snap.steadyTotalBytes, cap };
}

// ---- script entry ----------------------------------------------------------

function readStdinSafe() {
  try {
    if (process.stdin.isTTY) return null;
    const raw = fs.readFileSync(0, "utf-8");
    return raw.trim() ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function main() {
  let r;
  try {
    r = evaluate({ stdin: readStdinSafe() });
  } catch {
    // Fail OPEN: an enforcement gate that throws must never wedge legitimate work.
    r = { action: "allow", reason: "gate threw; failing open" };
  }
  if (r.action === "block") {
    process.stdout.write(JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: r.reason,
      },
    }));
  } else if (r.action === "advise") {
    process.stdout.write(JSON.stringify({ continue: true, systemMessage: `[injection-budget-cap] ${r.reason}` }));
  } else {
    process.stdout.write(JSON.stringify({ continue: true }));
  }
  process.exit(0);
}

const invokedAsScript = (() => {
  try {
    const self = new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/i, "$1");
    return path.resolve(self) === path.resolve(process.argv[1] ?? "");
  } catch {
    return false;
  }
})();
if (invokedAsScript) main();
