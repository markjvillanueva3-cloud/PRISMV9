---
name: reference_india_awr16_canonical_kc_conflict_2026_06_23
description: "U-AWR16 (MaterialDatabaseEngine-U-AWR16.test.ts, 24/38 fail) is a CONTESTED SAFETY-CRITICAL physics-constants crossroad, NOT a clean india fix. Its per-grade kc1.1/Taylor value assertions DIRECTLY CONTRADICT the documented canonical ISO-group kc1.1 (CLAUDE.md/physics) AND the currently-GREEN material-db-descriptive-alias.test.ts, via the shared AISI override -> CANONICAL_MATERIAL_DB path (buildMaterialPhysics constants.ts:1318-1322). Several changes are SAFETY-NEGATIVE (force-reducing). DEFERRED to oscar/physics-reviewer/operator. india verified 2026-06-23."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.615Z
aliases: reference_india_awr16_canonical_kc_conflict_2026_06_23
---


# U-AWR16 canonical-kc1.1 conflict — DEFER to oscar/physics-reviewer (do NOT impulse-fix)

**Verified 2026-06-23 (slot:india).** `MaterialDatabaseEngine-U-AWR16.test.ts` = **24/38 fail**.
It splits into TWO halves:

## Half A — COVERAGE (additive, would be clean): ~8 tests
Wants `AISI_CUTTING_COEFFICIENTS` ≥25 grades (currently 17). Missing keys it asserts `toBeDefined`:
`12L14, 8620, H13, S7, M2, 17-4` (table has `17-4PH`), `6061-T6/7075-T6/2024-T3` (table has bare `6061/7075`),
`Hastelloy C276, C360, C110, Gray Iron Class 30` (table has `gray_iron`), `Ductile Iron 65-45-12` (table has `ductile_iron`),
`Delrin, UHMW`. Adding NEW keys with real published values is additive — BUT the descriptive-name keys
(`6061-T6` vs `6061`, `Gray Iron Class 30` vs `gray_iron`) duplicate existing short-code grades = a key-naming
convention question, not pure addition.

## Half B — VALUE PARITY (CONTESTED, SAFETY-CRITICAL — the blocker): ~16 tests
U-AWR16 asserts per-grade kc1.1/mc + Taylor C/n that CONTRADICT the documented canonical ISO-group values
(CLAUDE.md + `src/physics/CLAUDE.md`: P1800/M2100/K1100/N700/S2800/H3200) and the **currently-GREEN**
`material-db-descriptive-alias.test.ts`:

| grade | current (=canonical, alias-test GREEN) | U-AWR16 wants | force direction |
|---|---|---|---|
| Ti-6Al-4V | kc1_1 2800 (ISO-S) | 1970 | **−30% (UNDER-predicts force = safety-negative)** |
| Inconel 718 | 3200 | 2700 | −16% |
| D2 | 3200 (ISO-H) | 2850 | −11% |
| 304 | 2100 (ISO-M) | 2350 | +12% |
| 4140 | 1950 | 2500 | +28% |
| 1018 | 1700 | 1780 | +5% |
| Ti Taylor C | 150 | (n/a) | — |
| Inconel Taylor C | 120 | 55 | tool-life model |

**Why india must NOT build this:** `AISI_CUTTING_COEFFICIENTS` flows into `CANONICAL_MATERIAL_DB` via
`buildMaterialPhysics(raw, undefined, key)` (constants.ts:1380-1384) where the AISI per-grade override takes
precedence (line 1318-1322). So changing AISI `Ti-6Al-4V` 2800→1970 ALSO sets `CANONICAL_MATERIAL_DB.titanium_gr5.kc1_1`
to 1970, which (a) **breaks the green alias test** (asserts 2800, lines 44-46) and (b) **reduces computed cutting
force on a safety-critical path** (Fc = kc1_1·ap·fz^(1-mc)). This is a genuine R7 conflict: **ISO-group canonical
kc1.1 vs per-grade kc1.1 philosophy** — a physics-domain decision for oscar/physics-reviewer/operator, NOT a
unilateral india edit. Source-of-truth today = the documented ISO-group canonical (+ the green alias test).

## Recommendation (for oscar / physics-reviewer)
1. DECIDE: does PRISM adopt per-grade kc1.1 (more accurate, but must re-validate every consumer's safety margin
   and accept force-direction changes) OR keep ISO-group canonical (then U-AWR16's Half-B values are wrong and
   the test should be re-baselined to the canonical values)?
2. If per-grade is adopted: physics-reviewer must verify EVERY value against published sources (Machinery's Handbook /
   Kennametal / Sandvik / ASM), re-run all force/safety tests, and migrate the alias test + CANONICAL_MATERIAL_DB
   together (R15). Force-reducing changes (Ti/Inconel/D2) need explicit safety sign-off.
3. Half-A coverage (new non-conflicting grades) can ship independently once the key-naming convention
   (short-code `6061` vs descriptive `6061-T6`) is settled.

Sibling: [[reference_india_ai_red_batch_2026_06_21]] (#7 first flagged this), the now-GREEN
`material-db-descriptive-alias.test.ts` (MATERIAL-DB-FIX/U-MATDB-DESCRIPTIVE-KEY-ALIAS decided the key convention).
The separate `CANONICAL_MATERIAL_DB.inconel_718` 3000(u-arch3)-vs-3200(alias) conflict is ALSO oscar-deferred.
