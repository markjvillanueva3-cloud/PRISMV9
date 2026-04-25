# U-LPR07 — UNIFIED_STORE 7-Day Bake Protocol

> **Milestone:** LATHE-PROD-READY-MS0 / Phase-2a
> **Owner:** frontend
> **Status:** foundation complete · awaiting prod enablement
> **Updated:** 2026-04-25

## What shipped in U-LPR07

| Artifact | Path | Lines |
|---|---|---|
| Zustand store (no Immer in hot paths) | `mcp-server/web/src/stores/calculatorStore.ts` | ~640 |
| Feature flag (URL + localStorage override) | `mcp-server/web/src/stores/featureFlags.ts` | 58 |
| Migration bridge (useState ↔ store) | `mcp-server/web/src/stores/useCalculatorBridge.ts` | 100 |
| SLI capture (p95 latency / heap / FPS) | `mcp-server/web/src/stores/storeRolloutMetrics.ts` | 175 |
| Auto-rollback watchdog | `mcp-server/web/src/stores/storeRolloutWatchdog.ts` | 145 |

**Persist layer:** `version: 1` + `migrate()` shim. Partialize filters out ephemeral state (results, live catalogs, loading, error, file selections). Hydration safe under cold start, v0 legacy, and v1 payloads.

**Tests (web/):** 86/86 green across 5 store test files. Bridge tests caught and forced fix of a real `useSyncExternalStore` infinite-loop bug in the batch hook (selectors now wrapped in `useShallow`).

## Rollout SLIs (Frontend B2 acceptance)

| SLI | Threshold | Source |
|---|---|---|
| p95 calc-latency Δ | ≤ +10% vs UNIFIED_STORE=off baseline | `storeRolloutMetrics.snapshot().calcLatencyDeltaPct` |
| Heap growth | ≤ +15% from flag-flip-on snapshot | `storeRolloutMetrics.snapshot().heapGrowthPct` |
| FPS on scroll | ≥ 55 (min over window) | `storeRolloutMetrics.snapshot().fpsMin` |

Watchdog requires ≥30 latency samples and ≥30 FPS samples before evaluating those gates — prevents thrash on cold cache.

## 7-day bake procedure

1. **Day 0 — staging enable**
   - Deploy build with feature-flag UI toggle.
   - Set `?unified_store=true` cohort to ~10% of staging traffic via load-balancer header rule.
   - Call `storeRolloutMetrics.markHeapBaseline()` and `storeRolloutWatchdog.start()` in app bootstrap when flag is ON.
2. **Days 1–7 — observe**
   - Daily snapshot: `storeRolloutMetrics.snapshot()` → log to telemetry sink.
   - Any watchdog trip flips flag OFF automatically and emits `RollbackEvent`. Tripping is idempotent — investigate before `reset()`.
3. **Day 7 — prod gate**
   - All three SLIs healthy for full 7 days → flip prod default to ON.
   - Any rollback during bake → restart counter from Day 0 after fix + re-deploy.

## Rollback runbook

| Trigger | First action | Mitigation |
|---|---|---|
| `calc-latency-regression` | Confirm flag OFF in `featureFlags`. | Inspect store-backed render hot paths; profile with React DevTools. |
| `heap-growth-regression` | Confirm flag OFF. | Diff `storeRolloutMetrics.snapshot().heapStartBytes` vs current; suspect retained subscriptions. |
| `fps-regression` | Confirm flag OFF. | Identify scroll handler; check selector shapes; verify `useShallow` on every batch read. |

Manual override: `setFeatureFlag('UNIFIED_STORE', false)`. Cohort cookies persist; users with stuck cookies get fallback automatically.

## Phase-2a → 2b gate condition

Per LATHE-PROD-READY-MS0-PLAN.md:

> Phase 2a→2b entry condition: `UNIFIED_STORE=ON` in prod + 7 days no rollback + metrics gate pass.
> Store-dependent units (06, 08, 10) block. Store-independent units (09, 13, 15, BUNDLE-GATE, MOBILE) proceed.

When the gate opens, `U-LPR06`, `U-LPR08`, `U-LPR10` may begin migration of `CalculatorPage.tsx`'s 153 `useState` calls via `useCalculatorBridge`/`useCalculatorBridgeBatch`.

## Verification (this commit)

```bash
cd mcp-server/web
node node_modules/vitest/vitest.mjs run src/__tests__/stores/
# Test Files  5 passed (5)
#       Tests  86 passed (86)
```
