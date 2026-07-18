#!/usr/bin/env node
// scripts/measure-subagent-injection.mjs
//
// TOKEN-SAVINGS/U-SUBAGENT-INJECTION-MEASURE (2026-06-21, slot:alpha).
//
// Closes a real instrument gap in the injection-budget toolset (which alpha
// owns): SessionStart + UserPromptSubmit are already censused by
// `audit-injection-surface.mjs`, but the PER-SUBAGENT (Task/Agent-spawn)
// injection path is measured by NOTHING. The existing byte-probe
// (`measure-userpromptsubmit-budget.mjs#probeHook`) feeds a {prompt} stdin, so a
// PreToolUse hook that gates on `tool_name === "Task"` (e.g. agent-rules-inject)
// emits ZERO under it -> the spawn-time injection ceiling was never quantified.
//
// This script measures the additionalContext bytes prepended to a spawned
// subagent's context by feeding each Task/Agent-matched PreToolUse injector a
// REAL spawn-shaped stdin ({tool_name, tool_input:{subagent_type,description,
// prompt}}). It probes BOTH tool names ("Task" and "Agent") and reports the max
// per hook -- so it surfaces a Task->Agent rename gap (an injector wired under
// `^Task$`/gated on `=== "Task"` that no longer fires when the harness names the
// tool "Agent"). This is the `feedback_measure_injection_before_dedup_fix`
// discipline applied to the subagent path: MEASURE the ceiling before anyone
// "fixes" it.
//
// SAFETY: it probes ONLY hooks under an explicit Task/Agent matcher AND whose
// source emits context. Catch-all `.*` matcher groups are EXCLUDED on purpose --
// they host destructive guards (node-process-janitor, mcp-bridge-enforce) that
// must never be run by a measurement. It measures `additionalContext` only (what
// the SUBAGENT sees), not `systemMessage` (main-thread block notices).
//
// KARPATHY R3 surgical: no shared-lib change (reuses only the PURE path helpers
// extractHookPath/hookKeyFromPath from audit-injection-surface.mjs). R12 fail-loud:
// a hook that errors is recorded as a failed probe, never silently 0.
//
// Usage:
//   node scripts/measure-subagent-injection.mjs            # text report
//   node scripts/measure-subagent-injection.mjs --json
//   node scripts/measure-subagent-injection.mjs --list     # enumerate only (no spawn)
//   node scripts/measure-subagent-injection.mjs --settings PATH
//   node scripts/measure-subagent-injection.mjs --cap N     # override soft budget (bytes)
// Exit: 0 within cap, 1 over cap, 2 input failure.

import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { extractHookPath, hookKeyFromPath } from "./audit-injection-surface.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");
const DEFAULT_SETTINGS = process.env.PRISM_INJECTION_AUDIT_SETTINGS || "H:/.claude/settings.json";

// A spawned subagent should inherit LEAN rules + maybe a search hint. >8 KB of
// spawn-time additionalContext is genuine bloat worth flagging (the "Prompt is
// too long" risk compounds across every fan-out). Soft target -- reporting is the
// product; the cap just colors the headline. Override with --cap.
export const SUBAGENT_BUDGET_BYTES = 8 * 1024;
export const PROBE_TIMEOUT_MS = 5000;
// The two tool names the fleet's spawn injectors gate on. agent-rules-inject gates
// on "Task" (legacy); the Agent-matcher hooks gate on "Agent" (current harness).
// Probing BOTH names reveals which injectors actually fire + emit additionalContext
// under each -- a Task<->Agent rename can leave a "Task"-gated injector silently dead.
export const SPAWN_TOOL_NAMES = ["Task", "Agent"];

// ---------------------------------------------------------------------------
// Pure helpers (exported for tests)
// ---------------------------------------------------------------------------

// A matcher targets the subagent-spawn path iff it names Task or Agent EXPLICITLY.
// Catch-all (`.*`, `*`, empty) is deliberately NOT spawn-specific -- those groups
// host destructive guards we must never probe, and a catch-all fires on every
// tool, not the spawn path we are budgeting. Bash|Agent|Task|Workflow DOES count
// (it explicitly names Agent/Task).
export function isSpawnMatcher(matcher) {
  if (typeof matcher !== "string") return false;
  const m = matcher.trim();
  if (m === "" || m === "*" || m === ".*") return false;
  return /\b(?:Task|Agent|Workflow)\b/.test(m);
}

// Source emits subagent-visible context iff it writes additionalContext. (We do
// NOT count systemMessage -- that surfaces to the main thread on a block, not to
// the spawned subagent.)
export function emitsAdditionalContext(source) {
  return typeof source === "string" && source.includes("additionalContext");
}

// Enumerate the spawn-time context injectors from a settings object: every hook
// under a spawn matcher (isSpawnMatcher), deduped by key. readSource(path)->string|null
// gates on emitsAdditionalContext so pure guards (no context) are excluded.
export function enumerateSpawnInjectors(settings, readSource) {
  const groups = (settings && settings.hooks && settings.hooks.PreToolUse) || [];
  const seen = new Set();
  const out = [];
  for (const g of groups) {
    if (!isSpawnMatcher(g && g.matcher)) continue;
    for (const h of (g.hooks || [])) {
      if (!h || typeof h.command !== "string") continue;
      const path = extractHookPath(h.command);
      const key = hookKeyFromPath(path);
      if (!path || !key || seen.has(key)) continue;
      let src = null;
      try { src = readSource(path); } catch { src = null; }
      // Unreadable source -> include (fail-loud: we can't prove it emits nothing).
      if (src != null && !emitsAdditionalContext(src)) continue;
      seen.add(key);
      out.push({ matcher: g.matcher, command: h.command, path, key, sourceMissing: src == null });
    }
  }
  return out;
}

// Build the PreToolUse spawn stdin for a given tool name. Mirrors the real
// Task/Agent tool_input shape the injectors read (subagent_type/description/prompt).
export function buildSpawnPayload({ toolName, subagentType = "reviewer", description = "probe", prompt = "PROBE", sessionId = null } = {}) {
  const payload = {
    tool_name: toolName,
    toolName, // some hooks read camelCase
    tool_input: { subagent_type: subagentType, description, prompt },
    session_id: sessionId || undefined,
  };
  if (!sessionId) delete payload.session_id;
  return payload;
}

// Pure: additionalContext byte size from a hook's stdout JSON (0 if none/unparseable-but-empty).
export function parseAdditionalContextBytes(stdout) {
  try {
    const parsed = JSON.parse(stdout);
    const ctx = parsed && parsed.hookSpecificOutput && parsed.hookSpecificOutput.additionalContext;
    if (typeof ctx === "string") return { ok: true, bytes: Buffer.byteLength(ctx, "utf8") };
    return { ok: true, bytes: 0 };
  } catch (e) {
    return { ok: false, bytes: 0, error: e instanceof Error ? e.message : String(e) };
  }
}

// Pure: roll per-hook probe rows into the report. Each row:
//   { key, matcher, sourceMissing, byTool: {Task: bytes|null, Agent: bytes|null}, maxBytes, ok }
// maxBytes = realistic ceiling (whatever tool name makes the hook emit most).
export function summarizeSpawnInjection(rows, { capBytes = SUBAGENT_BUDGET_BYTES, nowIso = "" } = {}) {
  const emitting = rows.filter((r) => Number.isFinite(r.maxBytes) && r.maxBytes > 0);
  const totalBytes = emitting.reduce((s, r) => s + r.maxBytes, 0);
  const top = [...emitting].sort((a, b) => b.maxBytes - a.maxBytes);
  // A hook that emits under one tool name but 0 under the other = a name-gated
  // injector (the Task->Agent rename signal). Surface it explicitly.
  const nameGated = emitting.filter((r) => {
    const t = r.byTool.Task, a = r.byTool.Agent;
    return Number.isFinite(t) && Number.isFinite(a) && (t > 0) !== (a > 0);
  });
  return {
    schemaVersion: 1,
    measured_at: nowIso,
    capBytes,
    ceilingBytes: totalBytes,
    overCap: totalBytes > capBytes,
    overByBytes: Math.max(0, totalBytes - capBytes),
    injectorCount: rows.length,
    emittingCount: emitting.length,
    failedCount: rows.filter((r) => !r.ok).length,
    nameGated: nameGated.map((r) => ({ key: r.key, matcher: r.matcher, byTool: r.byTool })),
    top: top.map((r) => ({ key: r.key, matcher: r.matcher, maxBytes: r.maxBytes, byTool: r.byTool })),
  };
}

// ---------------------------------------------------------------------------
// I/O
// ---------------------------------------------------------------------------

function readSourceFromRepo(p) {
  const resolved = p.replace(/\$CLAUDE_PROJECT_DIR/g, REPO_ROOT).replace(/\$\{CLAUDE_PROJECT_DIR\}/g, REPO_ROOT);
  for (const c of [resolved, resolve(REPO_ROOT, resolved)]) {
    try { if (existsSync(c)) return readFileSync(c, "utf8"); } catch { /* next */ }
  }
  return null;
}

function resolveHookTarget(p) {
  const resolved = p.replace(/\$CLAUDE_PROJECT_DIR/g, REPO_ROOT).replace(/\$\{CLAUDE_PROJECT_DIR\}/g, REPO_ROOT);
  if (existsSync(resolved)) return resolved;
  const alt = resolve(REPO_ROOT, resolved);
  return existsSync(alt) ? alt : null;
}

// I/O: probe one injector under one tool name. Returns {ok, bytes}.
function probeOne(target, toolName, prompt, sessionId, spawn = spawnSync, execPath = process.execPath) {
  try {
    const payload = buildSpawnPayload({ toolName, prompt, sessionId });
    const res = spawn(execPath, [target], { input: JSON.stringify(payload), timeout: PROBE_TIMEOUT_MS, encoding: "utf8" });
    if (res.error) return { ok: false, bytes: 0, error: res.error.message };
    if (res.status !== 0 && !res.stdout) return { ok: false, bytes: 0, error: `exit-${res.status}` };
    return parseAdditionalContextBytes(res.stdout || "");
  } catch (e) {
    return { ok: false, bytes: 0, error: e instanceof Error ? e.message : String(e) };
  }
}

// I/O: probe each injector under every SPAWN_TOOL_NAME, take the max emission.
function probeInjectors(injectors, prompt, sessionId) {
  return injectors.map((inj) => {
    const target = resolveHookTarget(inj.path);
    const byTool = {};
    let ok = true;
    let maxBytes = 0;
    if (!target) {
      return { key: inj.key, matcher: inj.matcher, sourceMissing: true, byTool: {}, maxBytes: null, ok: false };
    }
    for (const tn of SPAWN_TOOL_NAMES) {
      const r = probeOne(target, tn, prompt, sessionId);
      byTool[tn] = r.ok ? r.bytes : null;
      if (!r.ok) ok = false;
      if (r.ok && r.bytes > maxBytes) maxBytes = r.bytes;
    }
    return { key: inj.key, matcher: inj.matcher, sourceMissing: false, byTool, maxBytes, ok };
  });
}

function renderText(summary) {
  const L = [];
  L.push("--- Subagent (Task/Agent-spawn) injection ceiling ---");
  L.push(`Measured: ${summary.measured_at}`);
  L.push(`Soft cap: ${summary.capBytes} bytes (${(summary.capBytes / 1024).toFixed(1)} KB)`);
  L.push(`CEILING (sum of max-per-injector additionalContext): ${summary.ceilingBytes} bytes (${(summary.ceilingBytes / 1024).toFixed(2)} KB) ${summary.overCap ? "OVER CAP" : "within cap"}`);
  L.push(`Spawn injectors: ${summary.injectorCount} (${summary.emittingCount} emit context, ${summary.failedCount} probe-failed)`);
  L.push("");
  if (summary.top.length === 0) {
    L.push("No spawn injector emitted additionalContext under either tool name.");
  } else {
    L.push("Per-injector ceiling (max over tool name):");
    for (const r of summary.top) {
      L.push(`  ${r.key}  ${r.maxBytes}B  [matcher=${r.matcher}]  Task=${r.byTool.Task}B Agent=${r.byTool.Agent}B`);
    }
  }
  if (summary.nameGated.length > 0) {
    L.push("");
    L.push("NAME-GATED injectors (emit under one tool name but 0 under the other -- Task<->Agent rename signal):");
    for (const r of summary.nameGated) {
      L.push(`  ${r.key}  Task=${r.byTool.Task}B Agent=${r.byTool.Agent}B`);
    }
  }
  return L.join("\n");
}

function isMain() {
  return process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
}

if (isMain()) {
  const argv = process.argv.slice(2);
  const opts = { json: false, list: false, settings: DEFAULT_SETTINGS, cap: SUBAGENT_BUDGET_BYTES, prompt: "PROBE" };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--json") opts.json = true;
    else if (a === "--list") opts.list = true;
    else if (a === "--settings") opts.settings = argv[++i];
    else if (a === "--cap") opts.cap = Number.parseInt(argv[++i], 10) || SUBAGENT_BUDGET_BYTES;
    else if (a === "--probe") opts.prompt = argv[++i];
    else if (a === "--help" || a === "-h") {
      console.log("measure-subagent-injection.mjs -- per-subagent (Task/Agent-spawn) injection ceiling\n  --json --list --settings PATH --cap N --probe TEXT");
      process.exit(0);
    } else { console.error(`unknown flag: ${a}`); process.exit(2); }
  }
  let settings;
  try { settings = JSON.parse(readFileSync(opts.settings, "utf8")); }
  catch (err) { console.error(`settings read failed (${opts.settings}): ${err instanceof Error ? err.message : err}`); process.exit(2); }
  const injectors = enumerateSpawnInjectors(settings, readSourceFromRepo);
  if (opts.list) {
    process.stdout.write(JSON.stringify({ schemaVersion: 1, injectors }, null, 2) + "\n");
    process.exit(0);
  }
  const sessionId = `subagent-probe-${process.pid}`;
  const rows = probeInjectors(injectors, opts.prompt, sessionId);
  const summary = summarizeSpawnInjection(rows, { capBytes: opts.cap, nowIso: new Date().toISOString() });
  if (opts.json) process.stdout.write(JSON.stringify({ ...summary, rows }, null, 2) + "\n");
  else process.stdout.write(renderText(summary) + "\n");
  process.exit(summary.overCap ? 1 : 0);
}
