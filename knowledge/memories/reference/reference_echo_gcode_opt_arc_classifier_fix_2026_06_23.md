---
name: reference_echo_gcode_opt_arc_classifier_fix_2026_06_23
description: "Echo fixed GCodeOptimizationEngine arc classifier — /G0?[23]/ false-matched the bare 2/3 in G20/G21/G28/G30, miscounting them as arcs + inflating cycle-time ~38%. Fix = negative-lookahead /G0?[23](?![0-9])/."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.559Z
aliases: reference_echo_gcode_opt_arc_classifier_fix_2026_06_23
---


**U-PP-GCODE-OPT-CLASSIFIER-TIGHTEN** (slot:echo, 2026-06-23, commit `39e8324c38` on `cad-fusion-live-ms0`).

**Bug:** `GCodeOptimizationEngine.analyze()` classified arc moves with `/G0?[23]/.test(line.code)`.
That regex matches a `G` + optional `0` + a bare `2`/`3` — so it FALSE-MATCHED the leading `2`/`3`
in **G20/G21** (inch/mm unit codes, in nearly every program header), **G28/G29** (return-to-reference),
and **G30-G39** (home / coordinate). Those got counted as arc moves AND had their distance added to
`total_feed_distance` with the `×1.5` arc heuristic — so `arc_moves`, `total_feed_distance`, and the
`estimated_time_sec` cycle-time estimate were all over-reported on essentially every real program.
Quantified on a `G21`/`G28`/`G02` program: est. time **26s → 16s** after the fix (a 38% overestimate,
dominated by the large G28 machine-home move being counted as a ×1.5 feed-arc).

**Fix:** negative lookahead → `/G0?[23](?![0-9])/`. Strictly removes false-positives; real arcs
`G2`/`G02`/`G3`/`G03` (spaced, compact `G2X10`, and decimal `G02.1`) still match. G28/G30 now fall
through to unclassified (no move type / no distance) — conservative + correct vs the old inflation.

**Reusable lesson (G-code parsing):** a classifier regex that matches a bare G-code digit (`G2`, `G3`,
`G0`, `G1`) MUST guard the digit boundary — a negated class `[^0-9]` or zero-width `(?![0-9])` — or it
false-matches every multi-digit G-code sharing that leading digit (G2x/G3x). The engine's own FEED
matcher already used `/G0?1[^0-9]/`; the arc branch was the inconsistent one. When you see one branch
guarded and a sibling unguarded, the unguarded one is probably the bug.

**Verification pattern that worked:** (1) blast-radius FIRST — grep consumers (`calcDispatcher`
gcode_analyze/optimize, ppg route; `EnergyOptimizationIntegration` actually uses a DIFFERENT engine,
GCodeEnergyOptimizerEngine) + confirm no consumer test asserts `arc_moves`/`feed_distance` on a G2x
program; (2) flip the prior characterization tests from bug-lock → fix-assert + add G20/G21/G30
regressions + keep G02/G2/G3→1 as the real-arc safety net; (3) 2-arm scrutiny on the ENGINE file (both
PASS, 98/98 relevant tests green). [[reference_echo_pp_missing_engine_tests_2026_06_23]]

**Still open (lower impact):** rapid matcher `/G0[0 ]/` misses compact `G0X10` (no space). Real G-code
uses `G0 `/`G00`, so deferred; a characterization test still locks the current behavior.
