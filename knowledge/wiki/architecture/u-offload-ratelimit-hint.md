---
title: U-OFFLOAD-RATELIMIT-HINT — hint-aware Ollama offload rate-limit gate
node_type: architecture
unit: U-OFFLOAD-RATELIMIT-HINT
milestone: U-OFFLOAD-AUDIT
slot: charlie
shipped: 2026-05-18
status: shipped
---

# U-OFFLOAD-RATELIMIT-HINT

Root-cause leg of **U-OFFLOAD-AUDIT** — the charlie pickup from golf's
`state/shared/dashboards/FLEET-PENDING-EXTRACT-2026-05-18.md` redistribution
("853 fleet-reaper-coordinator suggestions → 0 conversions").

## The gap

`ollama-task-offloader.mjs` has a per-category self-throttle, `isRateLimited()`
(60s window, `RATE_LIMIT_MS`, lowered from 5min by OLLAMA-OFFLOAD-R4). It fired
**first** in the suggest path and was **independent of the fleet-reaper routing
hint**. So when the coordinator wrote an *aggressive-offload* hint ("GPU idle,
commit pressure high — offload more"), that hint could lower the confidence and
inject thresholds — but a category suggested <60s ago was still silently
skipped before any of that mattered. ~43 of 119 offloader suggests in the live
ledger were `reason:"rate-limited"` self-throttle skips the coordinator's
"be more aggressive" signal could never reach.

This is distinct from the **accounting** half (golf's headline number): the
89 `fleet-reaper-coordinator` `suggest` events are infra capacity actions
(prewarm/hint), already separated from the offload-rate denominator by
`U-OE-DASH-KEEP-BREAKDOWN` (commit `baef3c361d`, charlie, same day). The
remaining real lever was this wiring gap.

## The fix

New pure exported `effectiveRateLimitMs(hint, baseMs, floorMs)`:

```
hint == null            → baseMs              (load-bearing back-compat path)
aggressive hint active   → max(floor, round(base * (1 - min(1,|Δ|/CAP))))
```

- `Δ` = `hint.thresholdDelta` (producer emits `[-0.30, 0]`; `CAP =
  HINT_THRESHOLD_DELTA_CAP = 0.30`).
- `Math.abs` + `min(1,…)` ⇒ a spec-violating positive or over-cap Δ still
  yields a window in `[floor, base]` — never negative / NaN / longer than base.
- `RATE_LIMIT_FLOOR_MS = 5000` — at max aggression a single classifier path is
  still capped ~12×/min (vs 60×/min un-floored), bounding an Ollama storm.
- floor can never exceed base (tiny-base edge: `min(floorMs, base)`).

`isRateLimited(category, hint = null)` now gates on
`effectiveRateLimitMs(hint, RATE_LIMIT_MS)`; the single callsite passes the
in-scope `hint` already loaded by `loadRoutingHint()` (no extra I/O).

## Safety / invariants

- **Back-compat is load-bearing**: `hint == null` (99%+ of calls) returns
  `baseMs` byte-identically. Test-pinned + source-grep regression-guarded
  (fail-on-revert if a refactor drops the `hint` arg — the exact bug class).
- Pure, total, throw-free — a UserPromptSubmit hook must never throw.
- Cross-process contract byte-verified against producer
  `fleet-reaper-sweep.mjs` (`HINT_PATH`, `HINT_SCHEMA_VERSION`, CAP all match;
  `"auto"` neutralization → `loadRoutingHint` null → base).

## Tests

`.claude/hooks/__tests__/ollama-task-offloader-ratelimit.test.mjs` — 15
node:test cases: back-compat invariant, proportional scaling (−0.03→54000,
−0.15→30000), monotonicity, defensive clamps (positive/over-cap/NaN/tiny-base),
200-iter property (output always finite ∈ [floor,base]), 3 source-grep
fail-on-revert guards.

## Per-file scrutiny

4 reviewer agents (code-analyzer + independent reviewer ×2 files): **all
VERDICT PASS, 0 P0/P1**. P2 (handoff-logged, not blocking per gate doctrine):
`isRateLimited` end-to-end is verified only transitively (pure helper + grep) —
no live hint+ledger integration oracle. Recurring repo class
([[reference_rgs_tool_autoinvoke_ms1_2026_05_16]], [[reference_slot_bind_enforce_2026_05_18]]).
Follow-up unit: **U-OFFLOAD-RATELIMIT-INTEGRATION-ORACLE**.

## Sisters

- [[reference_ollama_expand_charlie_iter_2026_05_18]] — U-OE-DASH-KEEP-BREAKDOWN, the accounting half.
- [[ollama-pipeline-ms0]] — the broader Ollama offload wiring doctrine.
- [[fleet-reaper]] — the routing-hint producer (FLEET-REAPER-MS1 coordinator).
