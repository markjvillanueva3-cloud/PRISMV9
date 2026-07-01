#!/usr/bin/env node
// tier: T2
/**
 * meta-systems-health-inject.mjs -- SessionStart inject hook.
 *
 * Surfaces, once per session, any of the 4 orchestration META-SYSTEMS that is
 * currently DEGRADED (DOWN / UNDER-UTILIZED) -- ollama offload, hermes proxy,
 * octopus consensus drain, obsidian galaxy-synthesis. Healthy substrates are
 * SILENT (mirrors the PSN-leg-state hook: only what needs attention appears).
 *
 * WHY THIS HOOK EXISTS (the gap it closes):
 *   The meta-systems utilization probe (reconcileMetaSystems in
 *   scripts/reconcile-zulu-ledger.mjs) computes "is each substrate actually
 *   USED, not just built" -- but it was MANUAL-ONLY: no cron, no hook read it.
 *   So when the hermes proxy died (missing aiohttp dep, 2026-06-23) and the
 *   octopus drain silently stalled (Windows cp.spawn ENOENT, same week), each
 *   degradation hid for >48h until a zulu chat happened to run the reconciler
 *   by hand. This hook makes the verdict AUTO-SURFACE on every SessionStart
 *   (every new session + every /compact resume), fleet-wide across all 26
 *   slots -- so the NEXT dead substrate is caught in hours, not days.
 *
 *   It complements (does NOT duplicate) the PSN-leg-state hook, which grades
 *   the 11-leg KNOWLEDGE network (wiki/memory/tribal/NN-GNN/...); this grades
 *   the 4 ORCHESTRATION substrates' UTILIZATION. Distinct taxonomy + source.
 *   Also distinct from substrate-health-inject (config declared-vs-actual
 *   drift) and sierra-graph-health-inject (system-viz graph regen).
 *
 * Mechanism: dynamic-imports the reconciler via an absolute file:// URL (the
 * module is import-safe behind an isMain() guard) and calls
 * reconcileMetaSystemsLive() in-process. The HEALTHY path is all fast local fs
 * reads, NO network; a single timeout-bounded Hermes /health GET fires ONLY when
 * the offload ledger's lifetime fail-rate would otherwise alarm DOWN -- so a
 * recovered transient outage (high lifetime fail-rate, proxy healthy now) never
 * pins a fleet-wide false "HERMES DOWN". No subprocess, no scheduled task.
 *
 * Fail-safe: continueOnError. Any error -> emit {continue:true} with no
 * context so a broken probe never blocks the session.
 *
 * Disable: PRISM_META_HEALTH_INJECT_DISABLE=1
 */

import { readFileSync } from "node:fs";
import { pathToFileURL, fileURLToPath } from "node:url";

const RECONCILER = "H:/prism/scripts/reconcile-zulu-ledger.mjs";

// Per-substrate runnable self-heal command (the verdict's own `action` text is a
// hint; this is the exact command to ACTUATE the fix). Keyed by `system`.
const SELF_HEAL = {
  hermes: "node H:/prism/scripts/hermes-proxy-ensure.mjs",
  ollama: "node H:/prism/mcp-server/scripts/ollama-docker-launcher.mjs --services=ollama --skip-pull",
  octopus: "node H:/prism/.claude/scripts/consensus-queue-drain.mjs --max=5",
  obsidian: "node H:/prism/scripts/galaxy-synthesis-refresh.mjs",
};

/**
 * Build the advisory string for a set of meta-system verdicts, or null when
 * every substrate is UTILIZED (silent-when-healthy). Pure -- fixture-testable,
 * no IO. `verdicts` is the reconcileMetaSystems() return: array of
 * { system, status, evidence, action }.
 */
export function formatMetaHealthAdvisory(verdicts) {
  if (!Array.isArray(verdicts) || verdicts.length === 0) return null;
  const degraded = verdicts.filter((v) => v && v.status && v.status !== "UTILIZED");
  if (degraded.length === 0) return null;

  // DOWN is more severe than UNDER-UTILIZED -- sort DOWN first so the worst is read first.
  const sev = (s) => (s === "DOWN" ? 0 : 1);
  degraded.sort((a, b) => sev(a.status) - sev(b.status));

  const lines = [];
  lines.push(`## Meta-systems health -- ${degraded.length}/${verdicts.length} substrate(s) degraded`);
  lines.push("_Auto-checked at SessionStart (ollama offload, hermes proxy, octopus drain, obsidian synthesis). Healthy substrates are silent._");
  lines.push("");
  for (const v of degraded) {
    const sys = String(v.system || "?").toUpperCase();
    lines.push(`- **${sys} [${v.status}]** -- ${v.evidence || "(no evidence)"}`);
    if (v.action) lines.push(`  -> ${v.action}`);
    const heal = SELF_HEAL[v.system];
    if (heal) lines.push(`  self-heal: \`${heal}\``);
  }
  lines.push("");
  lines.push("_Probe: reconcileMetaSystems (scripts/reconcile-zulu-ledger.mjs). Disable: `PRISM_META_HEALTH_INJECT_DISABLE=1`._");
  return lines.join("\n");
}

function emit(eventName, additionalContext) {
  const out = { continue: true };
  // Silent path (all substrates healthy) INTENTIONALLY omits hookSpecificOutput -> a bare
  // {continue:true} injects nothing (no per-session noise). Do NOT "fix" this to always-emit.
  if (additionalContext) {
    out.hookSpecificOutput = { hookEventName: eventName, additionalContext };
  }
  process.stdout.write(JSON.stringify(out));
}

function readStdinEvent() {
  try {
    if (process.stdin.isTTY) return "SessionStart";
    const raw = readFileSync(0, "utf8");
    const data = JSON.parse(raw);
    return data?.hook_event_name || data?.hookEventName || "SessionStart";
  } catch {
    return "SessionStart";
  }
}

async function main() {
  if (process.env.PRISM_META_HEALTH_INJECT_DISABLE === "1") {
    return emit("SessionStart", null);
  }
  const eventName = readStdinEvent();
  let verdicts = null;
  try {
    const mod = await import(pathToFileURL(RECONCILER).href);
    // Live variant: gates the Hermes DOWN verdict on a real proxy probe (only when the ledger would
    // alarm) so a recovered outage doesn't false-flag. Falls back to sync if an older module is loaded.
    verdicts = mod.reconcileMetaSystemsLive ? await mod.reconcileMetaSystemsLive() : mod.reconcileMetaSystems();
  } catch {
    return emit(eventName, null); // probe unavailable -> stay silent, never block
  }
  const advisory = formatMetaHealthAdvisory(verdicts);
  return emit(eventName, advisory);
}

// import-safe: only run when invoked directly (so the test can import the pure fn).
// Uses the same import.meta.url idiom as the sibling reconciler (robust vs symlink/wrapper
// argv rewrites; R11 conformance) rather than a literal-suffix argv[1] match.
function isMain() {
  try {
    return fileURLToPath(import.meta.url) === process.argv[1];
  } catch {
    return false;
  }
}
if (isMain()) {
  void main().catch(() => process.stdout.write(JSON.stringify({ continue: true })));
}
