---
name: jm-die-lathe-upgrade-v2-physics-2026-05-24
description: "V2 of JM Die lathe program upgrader — physics-driven via UltimateSpeedFeedEngine.calculate, closes 5% PRISM-stack utilization gap from V1's hardcoded 180 SFM + 0.13 mm/rev + 1.5 mm DoC. Canonical template for upgrade engines in other domains."
aliases: reference_jm_die_lathe_upgrade_v2_physics_2026_05_24
type: reference
slot: whiskey
source: prism-memory
synced: 2026-06-09T14:54:09.167Z
---


# JM Die Lathe Upgrader V2 — physics-driven, ISO-group-aware

**Shipped 2026-05-24, slot whiskey iter9-iter10.** V2 closes the critique gap from `state/shared/dashboards/jm-die-lathe-upgrade-critique.md` (whiskey iter13) — V1 used ~5% of PRISM's manufacturing stack; V2 routes every per-machine S/F through the canonical `ultimateSpeedFeedEngine.calculate()` hub.

## What V2 fixes vs V1

| Axis | V1 | V2 |
|---|---|---|
| RPM source | hardcoded 180 SFM × π / (D × inch) | `ultimateSpeedFeedEngine.calculate({iso_group, tool_material, tool_coating, machine_max_rpm, machine_rigidity, optimize_for})` |
| Material → ISO | always treated as P group | 20+ materials → P/M/K/N/S/H via `MATERIAL_TO_ISO_GROUP` (tool steels → H, 1045/4140 → P, 304/316 → M, 6061/brass → N, Ti/Inconel → S, cast iron → K) |
| Feedrate | RPM × 0.13 mm/rev constant | engine-derived feed_per_rev × RPM with per-machine confidence |
| DoC | 1.5 mm × rigidity multiplier | engine output `axial_depth_mm.value` |
| Provenance | none | `rpm_confidence` + `rpm_source` per variant, `physicsBackend` + `engineVersion` on result |
| Optimization goal | none | `optimize_for: "tool_life" | "productivity" | "surface_finish" | "balanced"` (default balanced) |

## Engine contract

`JMDieLatheProgramUpgraderV2Engine.upgradeOne({sourcePath, programText?, material?, toolDiameterMm?, operation?, optimizeFor?})` →
`{sourcePath, partNumber, material, iso_group, engineVersion: "2.0.0", physicsBackend: "UltimateSpeedFeedEngine.calculate", variants[7], warnings[]}`

- Async (lazy-imports the heavy SpeedFeed engine for cold-start economy)
- Returns 1 variant per `JM_DIE_LATHES` entry (7 Okuma lathes)
- Default material `tool_steel` → ISO H (majority-of-jobs operator directive)
- Default tool: HSSco Allied TA insert + TiAlN coating, 12.7 mm holder
- RPM clamped to per-machine `spindleRpmMax`
- 19/19 tests pass — happy path, material override case-insensitivity, ISO mapping coverage P/M/K/N/S/H, RPM clamp, confidence + source provenance, unknown-material fall-through to H + warning, empty-programText survive

## Wiring

- Schema: `aiReasoningActionSchemas.ts` — action `jm_die_lathe_upgrade_v2`
- Dispatcher: `aiReasoningDispatcher.ts` ~line 893 — lazy import + await `upgradeOne`
- Batch CLI: `scripts/upgrade-jm-die-lathe-batch.mjs` — `PRISM_LATHE_UPGRADER_VERSION=v2` (default) | `=v1` (preserve baseline for diff)
- Output naming: `<customer>/PRISM_UPGRADED/<machineModel>/<partNumber>.nc` (machine in path, not filename)

## Full-corpus run

- Source corpus: 16,493 `.nc/.NC/.txt/.tap/.min/.cnc` files under `H:/PRISM/JM DIE/CNC LATHE/`
- Variants per program: 7 (one per JM Die lathe)
- Total V2 variants: ~115,451
- Background regen log: `state/shared/dashboards/jm-die-lathe-v2-corpus-run.log`
- Header excerpt (live V2 output):
  ```
  (=== PRISM JM-Die Lathe Upgrade v2.0.0 ===)
  (  iso_group: H)
  (  RPM: 1905 confidence=0.75 source=calculated)
  (  feedrate: 248 mm/min)
  (  physicsBackend: UltimateSpeedFeedEngine.calculate)
  (  rationale: physics: UltimateSpeedFeedEngine.calculate(operation=turning, iso=H, tool=hss+tialn, rigidity=medium, optimize_for=balanced); RPM clamped to spindle_max 6000.)
  ```

## Template for U-UPGRADE-MILL / U-UPGRADE-WEDM / U-UPGRADE-WELDER

The V2 engine docblock § "Template for other domains" names the 5-step canonical pattern. Future domain upgraders re-use steps 3-5 verbatim (canonical `ultimateSpeedFeedEngine.calculate` call + result wrap + provenance preserve); only steps 1-2 change (per-domain machine inventory + ISO group map for that operation).

This was the explicit goal of /goal #4 ("use this as training for the system so we know how to improve milling and wire and all other machines later"). V2 is the reference implementation; the 6 remaining critique units are scoped follow-ups, not blockers:

- U-UPGRADE-PRINT-LOOKUP — PRINTS/ folder material scan
- U-UPGRADE-CONTROLLER-POST — controller-specific G-code emission
- U-UPGRADE-SAFETY-GATE — Omega S(x) clearance before write
- U-UPGRADE-LIVE-TOOLING — live-tooling / multi-axis support
- U-UPGRADE-TRIBAL-INJECTION — tribal-knowledge consult
- U-UPGRADE-CHATTER-OPTIMAL — stability-lobe optimum spindle speed

## Cross-references

- Critique that drove V2: `state/shared/dashboards/jm-die-lathe-upgrade-critique.md`
- Operator-directive defaults: HSSco Allied TA + TiAlN + tool_steel default (R1+R7 — codified in engine constants, not hardcoded in scripts)
- Doctrine: [[feedback_shop_programs_amateur]] — trust source structure, override S/F values
- Per CLAUDE.md §AI SYSTEM ROUTING: `prism_calc` is the physics surface; V2 is the lathe-program consumer of that surface
