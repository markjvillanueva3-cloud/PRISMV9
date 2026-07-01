---
name: reference_g_item_triage_g1_dormant_2026_06_12
description: "A3 of the sierra completion-sweep (commit bc37a3ab45) triaged the SYSTEM-VIZ-HIGH-ROI G1-G10 backlog: 5 shipped, 2 open (G6/G7), 2 blocked-external (G9/G10), G1 type-backfill SHIPPED-BUT-DORMANT (lib+CLI, ZERO pipeline callers, fresh regens 84.6% untyped). RESOLVED 2026-06-12 (U-VIZ-G1-WIRE, commit 8458a1dab1): wired into merge-augmentations in FAIL-SOFT mode (onUnknown:skip), so the fail-loud hazard is moot -- live-proven 0%->99.9% typed on 336K real find-cache ids. The earlier 'canonical-validation-blocked' verdict was WRONG: fail-soft needs no live-graph validation to be safe, and the prefix set reads from the sidecar."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.601Z
aliases: reference_g_item_triage_g1_dormant_2026_06_12
---


# G1-G10 triage + the G1 dormant-asset finding -- U-SCS-G-TRIAGE (2026-06-12, slot:sierra, bc37a3ab45)

Triaging the 23-day-old `SYSTEM-VIZ-HIGH-ROI-AUDIT-2026-05-20.md` G-items against shipped reality
(file existence + wiring grep) showed it was MOSTLY already built: **5 SHIPPED** (G2 query-telemetry,
G3 ghost-wire-validate, G4 dead-pixel-detector [= the inventory A2 deliverable], G5 tribal-density,
G8 post-commit), **2 OPEN** generators (G6 per-slot heat, G7 sidecar fingerprints), **2
BLOCKED-EXTERNAL** (G9 host memory-pressure on --full, G10 operator retrain). Full table:
`state/shared/specs/SYSTEM-VIZ-HIGH-ROI-G-ITEMS-TRIAGE-2026-06-12.md`.

## The dormant-asset finding (G1)
`system-viz-type-backfill.mjs` (lib + standalone CLI, exports `inferType`/`applyTypeBackfill`/
`countTypeCoverage`, has a test) shipped as U-VIZ-G1-TYPE-BACKFILL -- but a scoped grep across
scripts/ + .claude/hooks/ + .claude/helpers/ found **ZERO callers**: it is NOT in `regen-viz.mjs`,
NOT in `merge-augmentations.mjs` (the wire-point its own spec named), NOT in any hook or scheduled
task. So the standalone CLI only runs if a human invokes it, and the next regen overwrites its output
-- the graph stays 84.6% untyped (211,975 / 250,497 nodes) and "every downstream classifier wakes
up" never landed. This is the canonical "built but dormant / never wired" the completion-sweep goal
exists to find. R8 lesson: an existing+tested asset is NOT live -- grep its CALLERS before trusting it.

## RESOLVED 2026-06-12 (U-VIZ-G1-WIRE, commit 8458a1dab1) -- the dormant asset is awake
The "canonical-validation-blocked" verdict below was WRONG (R12 self-correction). Two facts I missed:
1. **The lib ALREADY had fail-soft.** `applyTypeBackfill(graph, {onUnknown})` supports
   `"throw"|"allow"|"skip"`. Wiring with **`onUnknown:"skip"`** leaves a novel prefix untyped +
   counted in `report.unknownPrefixes`, NEVER throws -- so it CANNOT break regen. No wrapper needed;
   the fail-loud default stays on the standalone CLI where surfacing novel prefixes is correct.
2. **The prefix distribution is readable WITHOUT the 711MB graph** -- from the find-cache sidecar
   (55MB, parseable). 59 distinct prefixes; the existing map already covered ~96% of nodes.
Wired `applyTypeBackfill(G,{onUnknown:"skip"})` into `merge-augmentations.mjs` at the
`augmentationVersions`/`schemaVersion` anchor (byte-identical slot<->canonical -> clean B2 merge),
in-memory walk (cap-safe at 700MB+, no JSON.stringify), knob `PRISM_VIZ_TYPE_BACKFILL_DISABLE`.
Added 9 big live prefixes (ms-envelope/scriptlib/tribal-tip/college/training-source/extracted/
pdf-extract/pdf-coverage/memory_galaxies). **Live-validated: 0%->99.9% typed on 336,405 real
find-cache ids** (246 untyped across 13 micro-prefixes, vs the spec's <=12k target). 26 tests +
2-reviewer PASS. Applies to the live graph on the next canonical regen post-merge (B2).
**LESSON: before declaring a wiring "canonical-only / blocked", check whether the asset already has
a fail-soft mode and whether the validation data is in a sidecar -- I twice over-called env-blocks
this session ([[reference_sierra_completion_sweep_r8_closures_2026_06_12]]) that were actually doable.**

## (superseded) Why G1-WIRE looked canonical-validation-blocked
`applyTypeBackfill` is fail-LOUD on an unknown id-prefix BY DEFAULT -- but it has a fail-soft
`onUnknown:"skip"` mode (see RESOLVED above), so the mandatory-pass hazard was solvable in-slot.
Pairs with [[reference_sierra_completion_sweep_r8_closures_2026_06_12]] and
[[reference_system_viz_type_backfill_2026_05_20]] (the original G1 ship).
