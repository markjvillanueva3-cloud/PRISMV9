// tier: T4
// stop-bundle.mjs -- Consolidated Stop hooks using hook-runner library

import { runBundle, readStdin, emit } from "./lib/hook-runner.mjs";
import { fileURLToPath } from "node:url";

const HOOK_BASE = "H:/prism/.claude/hooks";

export const SUB_HOOKS = [
  { path: `${HOOK_BASE}/stop_on_cutting_calculation_protocol.mjs`, timeout: 5000, critical: true },
  { path: `${HOOK_BASE}/enforce-roadmap-closeout.mjs`, timeout: 5000, critical: true },
  { path: `${HOOK_BASE}/stop_on_uncommitted_critical.mjs`, timeout: 5000, critical: true },
  { path: `${HOOK_BASE}/commit-pressure-stop-gate.mjs`, timeout: 8000, critical: true },
  { path: `${HOOK_BASE}/stop_on_unsafe_gcode.mjs`, timeout: 3000, critical: true },
  { path: `${HOOK_BASE}/quality-dashboard-alert.mjs`, timeout: 5000, critical: false },
  { path: `${HOOK_BASE}/scrutinize-before-stop.mjs`, timeout: 10000, critical: true },
  { path: `${HOOK_BASE}/stop-goal-clear-advance.mjs`, timeout: 35000, critical: true },
  { path: `${HOOK_BASE}/enforce-handoff-topic.mjs`, timeout: 3000, critical: true },
  { path: `${HOOK_BASE}/error-pattern-promote.mjs`, timeout: 5000, critical: false },
  { path: `${HOOK_BASE}/leave-a-copy-behind-guard.mjs`, timeout: 5000, critical: false },
  { path: `${HOOK_BASE}/autonomous-loop-watchdog.mjs`, timeout: 3000, critical: false },
  { path: `${HOOK_BASE}/bash-orphan-cleaner.mjs`, timeout: 9000, critical: false },
  // DORMANT by default (arm with PRISM_TYPECHECK_GATE_ACTIVE=1) -- never affects Stop until opted in.
  // non-critical: a crash/timeout can't brick the bundle; still blocks (continue:false) when enforced.
  { path: `${HOOK_BASE}/stop_on_typecheck_errors.mjs`, timeout: 130000, critical: false },
];

function isBundleDisabled() {
  return process.env.PRISM_STOP_BUNDLE_DISABLE === "1";
}

async function main() {
  if (isBundleDisabled()) { emit({ continue: true }); return; }

  const payload = await readStdin();
  if (!payload) { emit({ continue: true }); return; }

  // Separate critical (sequential) and non-critical (parallel)
  const critical = SUB_HOOKS.filter(h => h.critical).map(({path, timeout}) => ({path, timeout}));
  const nonCritical = SUB_HOOKS.filter(h => !h.critical).map(({path, timeout}) => ({path, timeout}));

  let allContext = "";
  let blocked = false, blockReason = null;

  // Run critical sequentially
  for (const h of critical) {
    const result = await import("./lib/hook-runner.mjs").then(m => m.runHook(h.path, payload, h.timeout));
    if (!result.parsed) continue;
    if (result.parsed.continue === false || result.parsed.decision === "deny" || result.parsed.hookSpecificOutput?.permissionDecision === "deny") {
      blocked = true;
      blockReason = result.parsed.reason || result.parsed.stopReason || `Blocked by ${h.path}`;
    }
    if (result.parsed.additionalContext) allContext += result.parsed.additionalContext + "\n";
    if (result.parsed.hookSpecificOutput?.additionalContext) allContext += result.parsed.hookSpecificOutput.additionalContext + "\n";
  }

  if (!blocked && nonCritical.length > 0) {
    const nonCriticalResult = await runBundle(nonCritical, payload);
    if (!nonCriticalResult.continue) {
      blocked = true;
      blockReason = nonCriticalResult.stopReason;
    }
    if (nonCriticalResult.hookSpecificOutput?.additionalContext) {
      allContext += nonCriticalResult.hookSpecificOutput.additionalContext + "\n";
    }
  }

  if (blocked) {
    emit({ continue: false, stopReason: blockReason, systemMessage: blockReason });
    return;
  }

  const resp = { continue: true };
  if (allContext.trim()) {
    resp.hookSpecificOutput = { hookEventName: "Stop", additionalContext: allContext.trim() };
  }
  emit(resp);
}

const __isCLI = process.argv[1] && (() => {
  try { return fileURLToPath(import.meta.url) === process.argv[1]; } catch { return false; }
})();
if (__isCLI) {
  main().catch(err => {
    try { process.stderr.write(`stop-bundle error: ${err}\n`); } catch {}
    emit({ continue: true });
  });
}