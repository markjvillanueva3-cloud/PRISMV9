// scripts/lib/stop-hook-timeout-budget.mjs
// ---------------------------------------
// TOKEN-SAVINGS-EXPAND/U-PSN-STOP-S2 (2026-05-23, slot:alpha)
//
// Per-Stop-hook timeout budget tracker. Stop hooks must complete within a
// hard total budget (default 5s) so /Stop never hangs the chat. This lib
// exposes pure helpers; individual Stop hooks can opt-in by checking the
// budget before kicking off expensive work.
//
// Pure functions; uses a process-local clock when no externalNow is passed.

export const DEFAULT_TOTAL_BUDGET_MS = 5000;
export const DEFAULT_PER_HOOK_MS = 800;

/**
 * Pure: create a budget tracker.
 *   { startedAt, totalBudgetMs, perHookMs, hooksFired: [] }
 */
export function newBudget(totalBudgetMs = DEFAULT_TOTAL_BUDGET_MS, perHookMs = DEFAULT_PER_HOOK_MS, now = Date.now()) {
  return {
    schemaVersion: "1.0.0",
    startedAt: now,
    totalBudgetMs,
    perHookMs,
    hooksFired: [],
  };
}

/**
 * Pure: check whether a Stop hook may run given the current budget state.
 * Returns { allow: bool, reason: string }.
 */
export function shouldRunHook(budget, hookName, now = Date.now()) {
  if (!budget) return { allow: true, reason: "no-budget" };
  const elapsed = now - (budget.startedAt ?? now);
  if (elapsed >= budget.totalBudgetMs) return { allow: false, reason: `total-budget-exhausted (${elapsed}/${budget.totalBudgetMs}ms)` };
  // Per-hook re-fire guard: if this hook already fired this Stop, deny.
  const already = (budget.hooksFired || []).find(h => h && h.name === hookName);
  if (already) return { allow: false, reason: `${hookName} already fired this Stop` };
  return { allow: true, reason: "ok" };
}

/**
 * Pure: record a hook run + return new budget.
 */
export function recordHookRun(budget, hookName, elapsedMs, now = Date.now()) {
  const base = budget && typeof budget === "object" ? budget : newBudget(undefined, undefined, now);
  const hooksFired = Array.isArray(base.hooksFired) ? [...base.hooksFired] : [];
  hooksFired.push({ name: hookName, elapsedMs: elapsedMs || 0, ts: now });
  return { ...base, hooksFired };
}

/**
 * Pure: aggregate budget usage report.
 */
export function reportBudget(budget, now = Date.now()) {
  if (!budget) return null;
  const totalMs = now - (budget.startedAt ?? now);
  const hooksFired = budget.hooksFired || [];
  const sumElapsed = hooksFired.reduce((s, h) => s + (h.elapsedMs || 0), 0);
  return {
    totalElapsedMs: totalMs,
    hooksFiredCount: hooksFired.length,
    sumHookElapsedMs: sumElapsed,
    overBudget: totalMs > (budget.totalBudgetMs || DEFAULT_TOTAL_BUDGET_MS),
  };
}
