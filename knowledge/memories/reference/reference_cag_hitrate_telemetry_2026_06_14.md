---
name: cag-hitrate-telemetry-2026-06-14
description: 2026-06-14 (slot:bravo) — shipped fleet-wide CAG hit-rate observability on the galaxy-reasoning-bridge (PSN leg #10, all 34 galaxies). The CAG/RAG AI substrate had ZERO hit/miss visibility; added fail-soft recordCagStat + CLI dashboard. Commit 5d08e32cc1, 2/2 per-file scrutiny PASS, live-validated.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.499Z
aliases: reference_cag_hitrate_telemetry_2026_06_14
---


2026-06-14 (slot:bravo, session 17b9f42e, AGENTIC-SUBSTRATE-BRIDGE /loop iter1) — `U-CAG-HITRATE-TELEMETRY`.

## What + why
`scripts/lib/galaxy-reasoning-bridge.mjs` (the shared CAG/RAG reasoning substrate for ALL 34 galaxies, PSN leg #10) had no hit/miss observability -- the offload/cache rate the fleet wants to optimize was invisible. Added fail-soft telemetry so it can be measured.

## Files (commit 5d08e32cc1, [MAIN-FORCE] cad-fusion-live-ms0)
- `scripts/lib/galaxy-cag-cache.mjs`: added pure `bumpCagStat`/`summarizeCagStats` (count math, divide-by-zero-guarded), `readCagStats`, fail-soft `recordCagStat` (atomic tmp+rename, NEVER throws -- telemetry must not break reasoning), `cagStatsFileFor(cagFile)` (derives the stats sink beside cagFile so temp-cagFile tests auto-isolate), `CAG_STATS_FILE` = `state/shared/cache/cag-cache-stats.json`.
- `galaxy-reasoning-bridge.mjs reasonForGalaxy`: records a HIT at the cache-hit branch; records a MISS at lookup (right after getCached returns falsy, inside the cache try) so the denominator = every cagOn lookup. Both fail-soft, zero control-flow/return change.
- `scripts/cag-cache-stats.mjs`: CLI dashboard consumer (`--json`/`--file`) -- the R15 WIRE (reads the sink).
- Tests: `galaxy-cag-cache-stats.test.mjs` (9 R9 tests: pure math, fail-soft unwritable-path doesNotThrow, cagStatsFileFor / + \\ paths, directional hitRate 1->0.5->1/3). Fixed a PRE-EXISTING hermeticity leak in `galaxy-reasoning-bridge.test.mjs` ('bad galaxy' test called reasonForGalaxy with no cagFile -> wrote REAL cache+stats; now temp cagFile+cagStatsFile).

## Verification (R15)
- TEST: 9 new + 52 existing bridge/cache pass; real stats file NOT recreated by the suite (hermetic verified).
- VALIDATE (live): 2 real `reasonForGalaxy("hermes-zulu")` calls (both degraded -- big model slow) -> telemetry recorded 2 misses, hitRate 0, byGalaxy populated. Miss-at-lookup proven live; hit path proven by the round-trip unit test.
- Per-file scrutiny 2/2 PASS (code-analyzer + reviewer): deep-verified fail-soft, exactly-once hit/miss, no double-count on cache-error, correct per-galaxy math.

## Use it
`node scripts/cag-cache-stats.mjs` (human) or `--json`. Non-blocking notes (deferred): RMW loses occasional increment under 34-galaxy concurrency (accepted -- hit RATE robust); cagStatsFileFor unchanged on a trailing-separator dir path (latent only -- cagFile is always a .json). → [[reference_agentic_substrate_bridge_2026_06_14]] · [[reference_bridge_cag_usedmodel_fix_2026_06_13]]
