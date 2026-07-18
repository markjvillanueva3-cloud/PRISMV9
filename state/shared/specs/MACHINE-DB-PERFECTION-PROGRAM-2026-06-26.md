# Machine-Database Perfection Program (slot:oscar, 2026-06-26)

> Operator directive (2026-06-26): "Check ALL machines... ensure they ALL have accurate kinematics,
> work envelopes, way type, rigidity, thermo, spindle Ø/caps, table type/weight, g-forces (accel/jerk),
> high-speed, look-ahead, corner-rounding, surface-finish, controller caps... deep assessment if we have
> ALL common + uncommon brands/makes/models; assess other high-ROI SFC gaps from all physical/math/
> scientific data; fill everything to 100%; build any needed algorithms/formulas/engines; synchronize +
> synergize + wire to frontend; then exhaustive live simulation: every machine x all compatible holders/
> tooling/inserts x all compatible toolpaths x all materials x max workholding/fixturing variations x max
> finish/accuracy variations."

This is a multi-session PROGRAM. Phase 0 (assessment) is complete + committed; Phases 1-6 are the build.

## PHASE 0 — ASSESSMENT (DONE, U-MACHDB-01 + this spec)

### Enumeration
- **1015 machines**, 43 manufacturers (`machineRegistry`, `mcp-server/src/registries/MachineRegistry.ts`).
- Audit artifact: `state/shared/specs/MACHINE-COMPLETENESS-AUDIT-2026-06-26.{json,md}` (regenerable via
  `mcp-server/scripts/audit-machine-completeness.mjs`).

### Brand/model completeness
Strong core: haas 150, mazak 110, dmg mori 96, hurco 70, dn solutions(Doosan) 63, okuma 62, brother 46,
makino 32, matsuura 32, hyundai-wia 26 + Hermle/Grob/Kern/Yasda/Kitamura/OKK/Toyoda (5-axis/precision),
Citizen/Star/Tsugami/Index/Traub/Nakamura-Tome/EMAG/Hardinge (Swiss/turning).
**GAPS (add in Phase 1):** Tornos, Willemin-Macodel, Roeders (HS mold/graphite -- die-shop relevant),
GF AgieCharmilles + Mitsubishi + ONA (EDM -- currently only sodick 5), Niigata/Toshiba-Shibaura (HMC/large),
Hwacheon/Goodway/Victor/Johnford/You-Ji/Tongtai/Litz (Taiwanese/Korean value), Breton/Zimmermann/FPT/
Correa/Nicolas-Correa/Soraluce (large gantry/5-axis aerospace), + model-depth gaps inside present brands.

### Per-attribute coverage (1015) -- the 22 operator attributes
STRONG(>95%): spindle rpm/power/torque/taper, controller model, work envelope.
PARTIAL: table type/load 71%, weight 36%, high-speed 32%, look-ahead 27%, kinematics 21%, rapid 15%.
GAP(<15%): way-type ~6%, accel/g-force 4%, accuracy 1%, repeatability 5%, jerk 0%, spindle-bore ~7%,
balance 0%, FRF-rigidity 0%, thermal-comp ~1%, corner-rounding ~2%, surface-finish 0%, build-quality 0%,
robustness 0%.

### Additional HIGH-ROI SFC-accuracy data gaps (beyond the 22) -- ranked by speed/feed impact
1. **FRF / tap-test modal data (0/1015)** -- per-machine natural-freq/damping/stiffness -> Altintas stability
   lobes -> chatter-free max DOC. TOP lever. (`ChatterStabilityLobeEngine` also reportedly returns 0 lobes.)
2. **Spindle torque/power CURVE** -- `machine-torque-curves.json` (1.25MB) exists but is NOT joined to the
   registry -> torque-knee-aware power limiting (low-rpm torque-limited roughing currently approximated).
3. **Spindle-nose / taper interface stiffness** -- CAT40 vs HSK-A63 vs CAPTO-C6 differ greatly -> deflection
   + chatter. Taper dist is well-covered (CAT40 171, BT40 151, HSK-A63 138, CAT50 73...), stiffness is not.
4. **Accel/jerk (4%/0%)** -- achievable feed is accel-limited at corners/small features -> real effective
   chip-load + cycle time (not just fz*z*rpm).
5. **Gear ranges (5)** -- geared spindles deliver high torque at low rpm (heavy tool-steel roughing).
6. **Damping ratio + way type -> max stable DOC**; **thermal growth -> finish-tolerance accuracy**;
   **bearing arrangement/preload -> spindle stiffness**; **coolant pressure/TSC (818) -> achievable Vc/life**.

### Schema fragmentation (the prerequisite problem)
Data is NOT normalized: spindle power under 7 keys (power_continuous 985 / power_kW 448 / power_kw 222 /
peakHp 123 / continuousHp / power_hp / power), rpm under 4 (max_rpm 987 / rpm 672 / maxRpm 162 / ratedRpm).
A consumer reading ONE canonical key silently drops machines on variants. Normalize FIRST.

## PHASES 1-6 (BUILD)

- **P1 -- Brand/model completeness:** add the missing brands + deepen model rosters (OEM spec sheets);
  target "all common + the uncommon" makes/models. Each machine enters with the canonical schema (P2).
- **P2 -- Canonical schema + normalizer (U-MACHDB-02):** ONE Machine schema (superset of all 22 + the high-ROI
  fields: frf, torque_curve, taper_stiffness, accel/jerk, gear_ranges, damping, thermal_growth, balance,
  bearing, way_type, surface_finish, build_quality) + key-alias map for the ~100 variants. Pure + tested.
- **P3 -- Normalize + fill to 100% (U-MACHDB-03/04):** normalize all 1015; fill every gap with PER-FIELD
  provenance (`source: oem | catalog | inferred`). Sources priority: OEM spec sheets ->
  machine-kinematics-enriched / machine-torque-curves / gwizard / hsm-advisor catalogs -> physics/class-derived
  defaults (accel/jerk by guideway+class; balance grade by rpm class; FRF by mass/class regression; taper
  stiffness by interface). JM fleet + high-use machines OEM-first.
- **P4 -- New SFC physics (build them all):** per-machine FRF stability-lobe engine (+ fix the 0-lobe
  regression), torque-curve-aware power limiter, taper/interface-stiffness deflection term, accel/jerk
  effective-feed + cycle-time model, gear-range torque selector. Constants from `src/physics/constants.ts`;
  physics-reviewer on every force/stability formula (oscar-soul). Wire each into `SpeedFeedOrchestratorEngine`.
- **P5 -- Synchronize + synergize + wire FE:** single SoT registry -> sf_orchestrate resolves per-machine
  caps from normalized data (replace MACHINE_CATALOG_QUICK's 15) -> Kienzle SFC page + all SFC consumers.
- **P6 -- Exhaustive live simulation:** combinatorial sim over every machine x compatible {holder, tool,
  insert} x compatible toolpath types x all materials x max workholding/fixturing variations x max
  finish/accuracy targets. Compatibility filters (taper<->holder, machine-kind<->toolpath, material<->tool
  coating, envelope<->stock) prune the space; assert each result physics-valid (Vc/feed in band, S(x)>=gate,
  no chatter/over-power/over-deflection). Harness streams + persists results (resumable), bands by machine.

## Build order (logical, R13): P2 (normalize) -> P3 (fill) in parallel with P1 (brands) -> P4 (engines)
-> P5 (wire) -> P6 (sim). Normalization unblocks everything (consumers stop dropping variant machines).

## Status
- [x] P0 assessment (U-MACHDB-01 audit + this program spec).
- [x] P2 canonical schema + normalizer (U-MACHDB-02, `machine-normalizer.ts`).
- [x] P3 enricher — physics/class gap-fill layer (U-MACHDB-03, `machine-enricher.ts` + `enrich-machine-completeness.mjs`).
      LIVE PROOF (`MACHINE-ENRICHMENT-VERIFY-2026-06-26`): over all 1015 machines the 16 GAP-band
      attributes (way_type, accel/jerk/g-force, ISO-1940 balance, FRF, accuracy/repeatability, bore,
      thermal, corner, surface-finish, build-quality/robustness, kinematics, rapid, look-ahead) drop
      from GAP(<15%) to 0 remaining GAP — every fill tagged `inferred:<basis>` with provenance; source-
      dependent fields (bore needs a taper, weight an envelope) stay <100% honestly (NOT fabricated).
- [ ] P3b — OEM-precision overrides (U-MACHDB-04): JM fleet + high-use machines OEM-first datasheet values.
- [ ] P1 (brands), P4 (new SFC physics engines), P5 (wire to sf_orchestrate/SFC page), P6 (live sim).
- Sibling workstream: Kienzle SFC frontend (U-KSF-01 done; U-KSF-02..07 pending) -- consumes P5 output.
