# UNIT-0038 — BREP Corpus Coverage Extension

**Unit ID**: 0038
**Domain**: CAD Modeling & Engineering (Domain 10)
**Title**: BREP Corpus Coverage Extension (STEP-only → full B-Rep manifest)
**Status**: Not Started
**Priority**: P1
**Estimated Effort**: 3-5 hours

## Description

The night-chain corpus harvest currently walks **STEP-only across 3 roots (2,378 files)**, but the canonical B-Rep manifest counts **3,359** — a ~981-file gap of `.igs`/`.iges`/`.x_t`/`.x_b` (Parasolid) + STEP files outside the harvested roots. This unit extends the harvester's roots/extensions so the closed-loop training covers ALL B-Rep CAD models, closing the "cad models" bucket to 100%. Smallest, cleanest, most-buildable-now unit (ledger §6b action 2).

## Acceptance Criteria

- [ ] Harvester `--roots`/extensions extended to cover .igs/.iges/.x_t/.x_b + out-of-root STEP
- [ ] Coverage measured: harvested count reconciled to the 3,359 manifest (or the delta explained per file class with a documented exclusion rationale — R12, no silent drop)
- [ ] IGES/Parasolid parsed by an existing reader (dedup — `cad-file-format-readers` reference); NO new parser without gap-analysis
- [ ] Real-data validation: harvest a real .igs + .x_t file end-to-end into a training pair
- [ ] Night-chain harvest stage updated; re-run proves the higher count
- [ ] 3-of-3 scrutiny; fail-loud + count on unparseable formats

## Dependencies

- UNIT-0034 (census)
- Existing: night-chain corpus-harvest stage, `cad-file-format-readers` (15 native readers per [[cad-file-format-readers]])
- canonical brep manifest (source of the 3,359 count)

## Deliverables

- Extended harvester (roots + extensions + reader routing)
- Coverage reconciliation report (harvested vs 3,359, gaps explained)
- Night-chain stage update

## Autonomous Execution Notes

Most-buildable-now. The risk is IGES/Parasolid read support — gap-analyze which of the 15 documented readers actually handle .igs/.x_t. If none do, scope to STEP-out-of-root coverage + queue the IGES/Parasolid reader as an explicit follow-up (don't fake coverage). Units INCH at JM — resolve per file.
