# WIRE-UNWIRED-MS0/U-WIRE-LSHP — [MAIN] [WIRE-UNWIRED-MS0]/U-WIRE-LSHP: wire LoewenShawHeatPartitionEngine into prism_dev (4 metal-cutting heat actions)

**Commit:** `c67a3249713a` · **By:** markjvillanueva3-cloud · **At:** 2026-05-17T10:42:09-05:00
**Tags:** wire-unwired-ms0, u-wire-lshp, auto-distilled

## Subject
[MAIN] [WIRE-UNWIRED-MS0]/U-WIRE-LSHP: wire LoewenShawHeatPartitionEngine into prism_dev (4 metal-cutting heat actions)

## Body
```
[MAIN] [WIRE-UNWIRED-MS0]/U-WIRE-LSHP: wire LoewenShawHeatPartitionEngine into prism_dev (4 metal-cutting heat actions)

Wires classical metal-cutting heat-flow physics (Shaw 2005 static model
+ Loewen-Shaw 1954 dynamic model + Carslaw-Jaeger 1959 effusivity +
Jaeger 1942 moving-source Peclet). Engine-pair test pre-existed.

4 pure-compute actions through prism_dev:
  lshp_calculate                       calculate(params) - full Q-partition + temps
  lshp_compare_static_vs_dynamic       compareStaticVsDynamic(params) - Shaw vs Loewen-Shaw
  lshp_calculate_by_material_name      calculateByMaterialName(...) - DB lookup wrapper
  lshp_get_material_properties         getMaterialProperties(name) - 13-material DB

DEFER (sub-helpers, internal):
  calculateEffusivity, calculatePecletNumber, calculateStaticPartition,
  calculateSpeedFactor, classifyHeatRegime, calculateChipTemperature
  — all consumed by calculate(); surfacing them adds 6 single-method
  actions for no caller benefit.

Wire-level discriminators:
  - partition_ratio + heat_regime top-level (slim-resistant)
  - max_chip_temperature + max_tool_temperature flattened
  - confidence + warning_count surfaced
  - found discriminator on get_material_properties (null-resilient)
  - try/catch envelope on calculate_by_material_name (engine throws
    'Unknown chip material: <name>' on miss)

Tests: 26/26 PASS dispatcher round-trip.

Algebraic invariants exercised:
  - partitionRatio ∈ [0, 1]
  - Σ partition_percent (chip+workpiece+tool) ≈ 100%
  - chip effusivity = √(ρ·c·k) — for steel: √(7850·486·50) ≈ 13811
  - Peclet number ∝ V (higher cutting speed → higher Pe always)
  - Static vs dynamic delta GROWS with cutting speed (Pe dominance)
  - VARIABILITY: 3 materials (steel/aluminum/inconel) yield ≥2 distinct
    partition ratios (proves DEFAULT_MATERIALS table is consulted)
  - Material DB: 'steel' returns ρ=7850, c=486, k=50; 'aluminum' k=167
  - 5 tool materials confirmed (carbide/ceramic/cbn/pcd/hss)
  - Error envelope: unknown material → 'Unknown chip material' caught

WIRE-UNWIRED-MS0 progress: 33->34 wires this session.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (4)
- .../dispatcher.loewenShawHeatPartition.test.ts     | 297 +++++++++++++++++++++
- mcp-server/src/schemas/devActionSchemas.ts         |  86 ++++++
- mcp-server/src/tools/dispatchers/devDispatcher.ts  |  83 ++++++
- 3 files changed, 466 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show c67a3249713a`
- Milestone envelope: `mcp-server/data/milestones/WIRE-UNWIRED-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._