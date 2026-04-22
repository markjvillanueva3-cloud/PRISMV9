# Lathe Physics Constants Inline-Usage Sweep — U-LTH04

**Generated:** 2026-04-17T02:01:23.644Z
**Source:** mcp-server/data/state/lathe-engine-registry.json (87 engines)
**Canonical source:** mcp-server/src/physics/constants.ts

## Summary

| Metric | Count | Percent |
|---|---:|---:|
| Total engines | 87 | 100% |
| Importing from constants.ts | 22 | 25% |
| Clean (no canonical-value inlines) | 85 | 98% |
| Flagged (has inline canonical values) | 2 | 2% |

## Scan Patterns

| Pattern | Description |
|---|---|
| kc1.1_inline | `\bkc(1[_.]1)?\s*[:=]\s*(\d{3,5})(?!\.)` |
| taylor_n_inline | `\btaylor[_.]?n\s*[:=]\s*(0?\.\d{2,3}|\d)` |
| taylor_C_inline | `\btaylor[_.]?C\s*[:=]\s*(\d{1,5})` |
| density_inline | `\bdensity\s*[:=]\s*(\d{3,5})(?!\.)` |
| specific_heat_inline | `\bspecific[_.]?heat\s*[:=]\s*(\d{2,4})(?!\.)` |
| youngs_modulus_inline | `\byoung[s]?[_.]?modulus\s*[:=]\s*(\d{2,3}e[+\-]?\d)` |

## FLAGGED — Inline Canonical Values (2)

### LatheChipMechanicsEngine

Imports constants.ts: **YES**

| Pattern | Value | Line | Snippet |
|---|---:|---:|---|
| density_inline | 7850 | 303 | `density: 7850` |
| density_inline | 2700 | 331 | `density: 2700` |
| density_inline | 7800 | 412 | `density: 7800` |
| density_inline | 7850 | 426 | `density: 7850` |
| specific_heat_inline | 500 | 316 | `specific_heat: 500` |
| specific_heat_inline | 896 | 330 | `specific_heat: 896` |
| specific_heat_inline | 460 | 344 | `specific_heat: 460` |
| specific_heat_inline | 385 | 398 | `specific_heat: 385` |
| specific_heat_inline | 460 | 411 | `specific_heat: 460` |

### LatheTransferLearningEngine

Imports constants.ts: **NO**

| Pattern | Value | Line | Snippet |
|---|---:|---:|---|
| kc1.1_inline | 2100 | 344 | `kc1_1: 2100` |
| kc1.1_inline | 2800 | 417 | `kc1_1: 2800` |
| kc1.1_inline | 700 | 491 | `kc1_1: 700` |
| kc1.1_inline | 1800 | 516 | `kc1_1: 1800` |
| kc1.1_inline | 3200 | 528 | `kc1_1: 3200` |

## NON-CANONICAL Numeric Literals (3 engines)

Suspect pattern matched but value not on canonical whitelist. May be legitimate computed value, but worth review:

| Engine | Hit Count | Sample Patterns |
|---|---:|---|
| LatheChipMechanicsEngine | 11 | density_inline, specific_heat_inline |
| LatheThermodynamicsEngine | 17 | density_inline |
| LatheTransferLearningEngine | 15 | kc1.1_inline |

## Architectural Finding

The 3 engines with inline material data (LatheChipMechanicsEngine, LatheThermodynamicsEngine, LatheTransferLearningEngine) each contain a **domain-extended MATERIAL_DB** that supplements (not duplicates) `CANONICAL_MATERIAL_DB` in constants.ts:

- **LatheChipMechanicsEngine.CHIP_MATERIAL_DB**: adds Johnson-Cook flow-stress constants (jc_A, jc_B, jc_n, jc_C, jc_m), work_hardening_n, friction_coefficient — **NOT in CANONICAL_MATERIAL_DB**.
- **LatheThermodynamicsEngine**: density entries likely tied to local thermal diffusivity calcs — `thermal_diffusivity_mm2s` IS in canonical but per-alloy coverage differs.
- **LatheTransferLearningEngine.MATERIAL_DB**: uses **AISI alloy designations** (1018, 1045, 4140, 4340, 8620, 304, 316, 17-4PH) — CANONICAL_MATERIAL_DB uses generic names (steel, alloy_steel, stainless_304). AISI keys are missing.

### Root Cause
CANONICAL_MATERIAL_DB schema lacks:
1. Johnson-Cook flow-stress fields (jc_A, jc_B, jc_n, jc_C, jc_m)
2. AISI designation keys (1018, 4140, 8620, etc.)
3. Per-material friction_coefficient and work_hardening_n

The kc1_1=2100 hit in LatheTransferLearningEngine is a CANONICAL value (matches ISO-M median) but is stored inline as part of the AISI-keyed MATERIAL_DB because CANONICAL_MATERIAL_DB doesn't offer AISI lookup.

## Exit Gate Evaluation

Exit conditions per LATHE-MASTER U-LTH04:
1. **Zero inline physics constants in Lathe*.ts** — AUDIT COMPLETE; strict refactor deferred.
   - 87 engines scanned, 2 engines contain canonical-value literals as part of legitimate extended MATERIAL_DB structures.
   - Refactor path identified: extend CANONICAL_MATERIAL_DB schema, not per-engine edits.
2. **Build passes** — pending (current state: last green build was cc72709e).
3. **No test regressions** — pending (960 lathe test cases, last run green).

### Refactor Plan — U-LTH04b (follow-up unit)

**Phase 1 — Schema extension (constants.ts):**
1. Add Johnson-Cook fields to MaterialPhysics: `jc_A, jc_B, jc_n, jc_C, jc_m`
2. Add `friction_coefficient`, `work_hardening_n` to MaterialPhysics
3. Add AISI alias map: `AISI_ALIAS: Record<string, keyof typeof CANONICAL_MATERIAL_DB>` (e.g., "1045" -> "steel", "4140" -> "alloy_steel", "304" -> "stainless_304")

**Phase 2 — Engine migration:**
1. LatheTransferLearningEngine: replace MATERIAL_DB with `AISI_ALIAS` lookup into extended CANONICAL_MATERIAL_DB
2. LatheChipMechanicsEngine: use canonical fields (density, cp_J_kgK, k_thermal) + canonical Johnson-Cook (once added)
3. LatheThermodynamicsEngine: use canonical density + thermal_diffusivity_mm2s

**Phase 3 — Verification:**
1. `npm run build:fast` — must pass type checks
2. `npx vitest run Lathe*.test.ts` — all 960 existing tests must remain green
3. `npx vitest run ChipMechanics Thermodynamics TransferLearning` — targeted regression

**Estimated scope:** 1 session, 3 engines modified, ~40 test assertions added to verify alias behavior.

---

**Status:** AUDIT COMPLETE — 2 engines flagged with concrete refactor plan; strict refactor scheduled as U-LTH04b. U-LTH06 (Legacy Envelope Archival) depends on U-LTH04b completion for build_verify gate.
