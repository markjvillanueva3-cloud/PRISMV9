---
name: reference_programcompare_modal_regex_bug_2026_06_01
description: "ProgramCompareEngine cycle-time/distance estimation was wrong for two-digit G-codes (G00/G01) — modal regex /G0[^0-9]/ never matched them. Fixed 2026-06-01."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.123Z
aliases: reference_programcompare_modal_regex_bug_2026_06_01
---


# ProgramCompareEngine modal-regex bug — G00/G01 never detected (slot foxtrot, 2026-06-01)

**Bug:** `ProgramCompareEngine.ts` `estimateCycleTime()` and `estimateDistance()` detected modal motion with `/G0[^0-9]/` and `/G1[^0-9]/`. That only matches the **single-digit** form `G0 `/`G1 ` — it **silently misses the standard two-digit form `G00`/`G01`** (the char after `G0` is a digit, so `[^0-9]` fails). Result: for any program using `G00`/`G01` (the majority), **every move was counted as rapid**, `feedDist=0`, so feed-time and cut-distance estimates were garbage. Affected every consumer of `compare()`/`comparePhysics()`/`compareCycleTime()` — wired in `camDispatcher` + `productDispatcher`.

**Caught by:** building `mill_enhancement_verify` (U-MILL-ENHANCE-VERIFY) — a doubled-feed program showed `cycle_time_delta_pct === 0` instead of ~-50%, because both versions read as all-rapid.

**Fix (commit this session):** match both forms —
`/(?:^|[^0-9.])G00?(?:[^0-9.]|$)/` for G0/G00, `/(?:^|[^0-9.])G0?1(?:[^0-9.]|$)/` for G1/G01 (and G2/G3 analogues in estimateCycleTime). Whole-word match so G02/G10/G17 don't false-trigger.

**Regression check:** the engine's own milestone test (`ck-ms12-ux`), `pp-cross-cam-diff`, `CAMUtilityEngines`, and the new 9-case `mill-enhancement-verify` all PASS — no consumer relied on the buggy all-rapid behavior. (21 unrelated pre-existing failures in ppg-comprehensive-v11 / ppg-real-programs / ck-ms13-exports: missing `clearCache`/`generatePhysicsReport`/`stats` methods, missing worktree okuma data dir, header-enrichment — none touched by this fix; owned by echo/oscar.)

## How to apply
- When parsing G-code modal state, ALWAYS match both `Gn` and `G0n` forms. The naive `/G0[^0-9]/` is a recurring trap.
- Relates: [[reference_mill_course_plotting_substrate_2026_05_31]] · [[feedback_always_capture_lessons]] · [[feedback_verify_actual_contract_not_proxy]]
