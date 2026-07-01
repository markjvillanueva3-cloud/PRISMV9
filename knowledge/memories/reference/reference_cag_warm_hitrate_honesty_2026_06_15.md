---
name: reference_cag_warm_hitrate_honesty_2026_06_15
description: "CAG-HITRATE-HONESTY/U-CAG-WARM-RATE (2026-06-15, slot:alpha): the CLAUDE-BRIEF '10% CAG hit-rate, below target' headline is a COLD-START artifact, NOT a cache defect -- 29 of 38 misses are single first-ever per-galaxy lookups a cold cache physically cannot serve. Added miss-reason segmentation (novel/cold vs invalidated vs error) + a warm hit-rate over RECOVERABLE traffic only, surfaced in CLI + headline + prism_session:cag_stats. Future chats: do NOT re-chase the raw 10% -- check warmHitRate + addressableMisses(invalidated) first."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.500Z
aliases: reference_cag_warm_hitrate_honesty_2026_06_15
---


# CAG warm hit-rate honesty (2026-06-15, slot:alpha)

The SessionStart CLAUDE-BRIEF headline "🧮 CAG substrate hit-rate: 10% over 42 lookups,
below 30% target" repeatedly triggers chats to "fix" the galaxy-reasoning-bridge CAG cache.
**It is a measurement artifact, not a defect.** Ground truth from the live stats file
(`state/shared/cache/cag-cache-stats.json`): 4 hits / 38 misses, and **29 of 34 galaxies
have exactly {hits:0,misses:1}** -- a single first-ever lookup each. A cold cache CANNOT hit
a never-before-asked question, so ~29 of the 38 misses are structurally unavoidable.

## What shipped (commits acd8708fe2 + 982d60faca, branch cad-fusion-live-ms0)
Miss-reason segmentation + a warm hit-rate that excludes unavoidable cold-start:
- **`novel`** = key never cached (cold first-touch OR new question) -- UNAVOIDABLE.
- **`invalidated`** = key WAS cached but the galaxy's doctrine-corpus fingerprint changed,
  wiping it -- the ONLY RECOVERABLE miss (the real fixable signal). The bridge classifies at
  the miss site: `cache.entries[key]` present-but-stale -> invalidated; absent -> novel.
- **`error`** = a cache-layer fault (wired into the bridge's catch block; counted distinctly).
- **`warmHitRate = hits / (hits + invalidated)`** -- rate over recoverable traffic only;
  returns **null (never a misleading 0)** when misses are untagged-legacy OR there is no warm
  traffic yet. `addressableMisses = invalidated` is the count a cache/fingerprint change could win.

## How to read it (the rule for future chats)
- `scripts/lib/galaxy-cag-cache.mjs` = source of truth (`warmRateFields`, `normalizeMissReasons`).
- `node scripts/cag-cache-stats.mjs` -> CLI shows warm-rate + [invalidated | cold/novel | untagged].
- `prism_session:cag_stats` -> same fields (dispatcher mirrors the math; KEEP-IN-SYNC parity test
  in both `galaxy-cag-cache-stats.test.mjs` + `sessionDispatcher.cagStats.e2e.test.ts`).
- **Decision: if warmHitRate is ~100% and addressableMisses==0 -> cache is healthy, the low raw
  rate is pure cold-start/low-volume; do NOT touch the cache.** Only a low warm-rate WITH
  invalidations (`!Ninval` flag in the CLI) is a genuine doctrine-churn problem worth fixing.
- Current live data is all-untagged-legacy -> warmHitRate shows "accumulating"; it sharpens as
  new reason-tagged traffic is recorded by the bridge.

## Provenance
77->92 tests across 4 surfaces (25 lib + 45 bridge + 10 headline + 12 dispatcher e2e), all
reference-value (R9). tsc clean. 3-of-3 scrutiny PASS (arms A+B+C); the 3 P2s they raised
(error bucket unwired, dispatcher e2e gap, no parity pin) were all closed in 982d60faca.
Builds on bravo's CAG telemetry chain [[reference_cag_telemetry_chain_complete_2026_06_14]] +
[[reference_cag_hitrate_telemetry_2026_06_14]].
