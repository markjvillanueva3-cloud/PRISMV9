---
name: reference_oscar_machdb_enricher_2026_06_27
description: "MACHINE-DB Phase-3 enricher + SFC wire (U-MACHDB-03/04, slot:oscar) — physics/class gap-fill over all 1015 machines + 4 live bug fixes"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.691Z
aliases: reference_oscar_machdb_enricher_2026_06_27
---


# MACHINE-DB enricher + SFC wire (slot:oscar, 2026-06-27, session 19f150b9)

Continued the **MACHINE-DB Perfection Program** (`state/shared/specs/MACHINE-DB-PERFECTION-PROGRAM-2026-06-26.md`).
Population = **1015 machines / 43 manufacturers** (`MachineRegistry.ts`). Prior units: U-MACHDB-01 audit,
U-MACHDB-PROGRAM 6-phase plan, U-MACHDB-02 `machine-normalizer.ts` (canonical schema + 7-key power union).

## U-MACHDB-03 (480bc25147) — Phase-3 physics/class gap-fill enricher
`mcp-server/src/registries/machine-enricher.ts` — pure, deterministic. `classifyMachine` → kind / build-tier /
rpmClass / wayType / effective-modal-mass, then `enrichMachine` fills the GAP-band attrs the normalizer leaves
undefined: way_type, accel/jerk/g-force, ISO-1940 balance grade, FRF (f_n=(1/2π)√(k/m_eff), k in N/µm×1e6),
accuracy/repeatability, spindle bore (taper-interface map incl D1+A2 lathe noses), thermal-comp, controller
corner-control, surface-finish Ra, build-quality/robustness, kinematics, rapid, look-ahead, weight. Fills
MISSING only (never overwrites OEM); every fill tagged `inferred:<basis>` in `_provenance`. Verify script
`scripts/enrich-machine-completeness.mjs` → `MACHINE-ENRICHMENT-VERIFY-2026-06-26.md`: **16 GAP attrs → 0**
across all 1015 (independently re-measured). 23 tests; physics-reviewer + reviewer per-file PASS; tsc-clean.

## U-MACHDB-04 (6347cc480f) — P5 wire into SFC resolveMachine
`registryMachineToCatalog(raw)` (pure, in machine-enricher.ts) maps a raw registry machine → the
`MACHINE_CATALOG_QUICK` entry shape via normalize+enrich. `SpeedFeedOrchestratorEngine.resolveMachine`'s
registry fallback now delegates to it (2 lines, `?? catalogMatch` preserves prior behavior). 6 adapter tests
(29 total); tsc-clean; live-validated.

## 4 LIVE BUGS found + fixed (R12 / reusable lessons)
1. **False-precision classification cascade** — `measuredAcc<=3 → tier=precision` overrode a known production
   brand (Haas VF → precision → 0.1µm Ra / 210 N/µm, physically wrong). Raw accuracy is unit-fragile (mm
   mis-stored as µm, or a mislabeled repeatability value). FIX: a KNOWN brand is authoritative; measured
   accuracy only sets tier when the brand is UNKNOWN, sanity-gated to [1,50]µm. precision tier 156→52.
   **Lesson:** trust the more reliable signal (brand) over a noisy single reading (R7); a sub-1µm "accuracy"
   is a unit-confusion tell, not ultra-precision.
2. **Power-key silent drop** — `resolveMachine` read `spindle.power_continuous` ONLY; 14/1015 machines store
   power under a variant key (power_kW/peakHp/...) → resolved to the 15 kW default (wrong MRR/torque ceiling
   → wrong feed). FIX: route through the normalizer's 7-key union. **Lesson:** a consumer reading ONE canonical
   key over a fragmented schema silently drops the variant-keyed records — normalize at the read boundary.
3. **Hard-coded nat_freq_hz=800** in resolveMachine — physically wrong (dominant structural modes ~40-250 Hz),
   feeds chatter stability. FIX: FRF spring-mass model; 1006 machines now real (INDEX_G420 216 Hz).
4. **Hard-coded guideway='linear'** in resolveMachine — FIX: from derived way_type (substring-matched so
   canonical `box_way` AND raw OEM `box` both resolve). **Lesson:** an enriched field can carry a raw OEM
   string OR the canonical enum — match by substring, not `===`.

## NEXT (program, dependency order)
- **U-MACHDB-05 (P3b):** OEM-precision overrides — JM fleet (5 mills + 7 Okuma lathes) + high-use machines get
  real datasheet values (OEM-first), flowing through the never-overwrite-OEM guard.
- **P4:** new SFC physics engines consuming the enriched data — feed per-machine FRF into the EXISTING
  `ChatterStabilityLobeEngine` (dedup! known 0-lobe regression — foxtrot/mill), torque-curve-aware power
  limiter (`machine-torque-curves.json` unjoined), taper-stiffness deflection term, accel/jerk effective-feed.
- **P5 follow-up:** dispatcher round-trip E2E for resolveMachine; verify the SFC page uses the new resolved caps.
- **P1:** add missing brands (Tornos, Willemin, Roeders, GF AgieCharmilles, etc.).

Files: `machine-enricher.ts` + `__tests__/machine-enricher.test.ts` + `scripts/enrich-machine-completeness.mjs`
+ `SpeedFeedOrchestratorEngine.ts` (resolveMachine block). See [[feedback_check_units_first]].
