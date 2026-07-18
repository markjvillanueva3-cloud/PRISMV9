---
name: reference_cag_warm_rate_legacy_quarantine_2026_06_16
description: "SHIPPED 2026-06-16 (slot:alpha): U-CAG-WARM-RATE-LEGACY-QUARANTINE made the CAG (cache-augmented generation) warm-hit-rate COMPUTE (was permanently n/a fleet-wide). Root cause: misses predating miss-reason instrumentation can never be classified, so warmRateFields' unclassified null-guard never cleared. Fix: snapshotLegacyBaseline freezes each scope's untagged count once; warmRateFields subtracts it so warm-rate computes over the post-instrumentation window; a NEW untagged miss beyond the baseline still nulls (un-instrumented caller never masked). Genuine improvement to a goal-named AI subsystem; live-validated n/a -> 100%."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.500Z
aliases: reference_cag_warm_rate_legacy_quarantine_2026_06_16
---


# CAG warm-rate legacy-quarantine -- SHIPPED (2026-06-16, slot:alpha)

## The silent-metric-death + fix
`warmHitRate` (CAG efficiency over RECOVERABLE traffic, PSN leg #10) was permanently `n/a`
fleet-wide. Root cause: 38 misses predated miss-reason tagging (legacy/untagged); they can NEVER be
classified, so `warmRateFields`' `unclassifiedMisses > 0 -> null` guard never cleared, even as new
tagged traffic accumulated. The metric was honest (untagged split untrusted) but PERMANENTLY dead.

Fix (`scripts/lib/galaxy-cag-cache.mjs`): `snapshotLegacyBaseline(stats)` freezes each scope's
untagged count ONCE into `legacyUntaggedBaseline` (idempotent `typeof !== "number"` guard);
`bumpCagStat` snapshots BEFORE incrementing (so a galaxy's pre-instrumentation untagged misses freeze
on first event); `warmRateFields(h, m, r, legacyBaseline=0)` subtracts it ->
`unclassifiedMisses = max(0, misses - classified - legacy)`. Warm-rate then computes over the
POST-instrumentation window (every new miss IS tagged -- recordCagStat always passes a reason).
**Safety (R12):** a NEW untagged miss beyond the frozen baseline still nulls warm-rate -- an
un-instrumented caller is NEVER masked (adversarial `leaky`-galaxy e2e pins this).

## Wired + validated
- WIRE: `summarizeCagStats` threads the baseline; the LIVE `sessionDispatcher` `cag_stats` action
  mirror updated EXACTLY (KEEP-IN-SYNC, `typeof===number` guard form); `cag-cache-stats.mjs` CLI shows
  `legacy-quarantined: N`. Migration applied to the live sink (34 galaxies, overall baseline 38).
- TEST: 40 lib (`galaxy-cag-cache-stats.test.mjs`) + 13 dispatcher e2e (`sessionDispatcher.cagStats.e2e.test.ts`,
  incl. the adversarial leaky-galaxy null case). KEEP-IN-SYNC test cross-pins lib<->dispatcher.
- VALIDATE: live `node scripts/cag-cache-stats.mjs` -> warm-rate **100.0%** (was n/a), mill/lathe 100%,
  `[... | untagged: 0 | legacy-quarantined: 38]`. 2-arm scrutiny PASS (1 P2 coercion-form tightened).

## Why this is the Goal-B (AI-systems) contribution alpha CAN make
The /goal names "cag + rag + hybrids" as AI systems to improve. CAG is alpha's owned lane (token-
optimization / prompt-cache routing). This is a REAL improvement to a goal-named AI subsystem
(a dead efficiency metric now works), validated with a live number -- distinct from the NN/GNN Brier
item which is GPU+india-gated ([[reference_ai_synergy_allgalaxy_verified_2026_06_16]]). Sibling of
[[reference_cag_warm_hitrate_honesty_2026_06_15]] (the telemetry-honesty unit this completes).
