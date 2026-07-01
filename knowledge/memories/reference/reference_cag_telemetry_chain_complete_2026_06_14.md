---
name: cag-telemetry-chain-complete-2026-06-14
description: 2026-06-14 (slot:bravo) — completed the CAG hit-rate telemetry chain end-to-end: record (recordCagStat) -> query (prism_session:cag_stats, U-CAG-STATS-DISPATCH 0babcb5f2f) -> surface (SessionStart headline, U-CAG-HITRATE-HEADLINE d24f48cd16). Includes the TS-can't-import-.mjs vs hook-CAN asymmetry pattern.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.500Z
aliases: reference_cag_telemetry_chain_complete_2026_06_14
---


2026-06-14 (slot:bravo, AGENTIC-SUBSTRATE-BRIDGE /loop iter6+iter8) — the CAG (cache-augmented reasoning) hit-rate telemetry on the galaxy-reasoning-bridge (PSN leg #10, all 34 galaxies) is now a complete **record -> query -> surface** chain.

## The chain
1. **record** — `recordCagStat(galaxy, hit, file)` in `scripts/lib/galaxy-cag-cache.mjs` (U-CAG-HITRATE-TELEMETRY 5d08e32cc1, iter1), called from `galaxy-reasoning-bridge.reasonForGalaxy`. Writes `state/shared/cache/cag-cache-stats.json` (fail-soft atomic tmp+rename).
2. **query** — `prism_session:cag_stats` (U-CAG-STATS-DISPATCH 0babcb5f2f) returns `{hits,misses,total,hitRate,galaxies,byGalaxy[]}` (total-desc array), divide-by-zero guarded, fail-soft, `cag_stats_file` test-override. 8 e2e round-trip tests.
3. **surface** — `.claude/hooks/session-start-cag-hitrate-headline.mjs` (U-CAG-HITRATE-HEADLINE d24f48cd16) emits a SessionStart awareness headline ("75% hit-rate over N lookups across M galaxies -- top: ..."), wired settings.json C:+H:, 7 tests. Knobs PRISM_CAG_HEADLINE_{DISABLE,MIN_TOTAL}.

## Reusable pattern: TS dispatcher CANNOT import a scripts/lib/*.mjs; a hook CAN
- The **dispatcher** (sessionDispatcher.ts) is inside the mcp-server TS build -> no precedent for importing `scripts/lib/*.mjs` (tsc/esbuild risk). So it **inline-mirrors** `summarizeCagStats()` math, with a comment pinning the .mjs as source-of-truth + a "keep in sync" warning. (Follows the loop_state_query inline precedent.)
- The **hook** (session-start-cag-hitrate-headline.mjs) is itself `.mjs` -> it **imports** `summarizeCagStats/readCagStats/CAG_STATS_FILE` directly (R8 reuse, zero duplication).
- So: same logic, two consumers, two correct strategies based on the build boundary. When you must mirror (TS side), comment the source-of-truth + "keep in sync"; a future change to the .mjs summarizer won't be auto-caught on the TS side (logged P2).

→ [[reference_cag_hitrate_telemetry_2026_06_14]] · [[feedback_harness_only_tools_wall_2026_06_14]] · [[reference_agentic_substrate_bridge_2026_06_14]]
