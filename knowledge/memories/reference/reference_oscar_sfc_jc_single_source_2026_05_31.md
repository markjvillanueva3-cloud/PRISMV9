---
name: oscar-sfc-jc-single-source-2026-05-31
description: "U-OSC9-JC-SINGLE-SOURCE — unified the two divergent Johnson-Cook DBs into src/physics/johnson-cook-coefficients.ts (65-key lossless union, commit 6952af30b9)"
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.257Z
aliases: reference_oscar_sfc_jc_single_source_2026_05_31
---


`U-OSC9-JC-SINGLE-SOURCE` (slot:oscar, 2026-05-31, commit `6952af30b9`) eliminated PRISM's two divergent Johnson-Cook coefficient databases:
- `JohnsonCookEngine.ts` had a local `DB` (62 keys, dispatcher-facing, was exact-match lookup).
- `JohnsonCookModel.ts` (algorithms/) had a local `JC_DATABASE` (63 keys, algorithm-registry, case/separator-insensitive lookup).

**Canonical single source:** new `mcp-server/src/physics/johnson-cook-coefficients.ts` — exports `JC_COEFFICIENTS` (65-key union), `JCParams`, `MaterialCategory`, `findJCMaterial()` (the stronger separator/case-insensitive resolver), `listJCMaterials()`, `JC_T_ROOM_K=293`, `JC_EPS_DOT_REF=1.0`. Re-exported from `constants.ts` as `JOHNSON_COOK_PARAMETERS` (the canonical "import from constants.ts" path; this export was previously MISSING — constants.ts had ZERO JC data, violating the physics-rule). Both engines now import the table/types/resolver/refs **aliased to their historical local names** (`JC_COEFFICIENTS as DB`, `findJCMaterial as findMaterial`, `JC_T_ROOM_K as T_ROOM`) so the method bodies stayed byte-identical.

**The merge was a lossless mechanical dedup — verified, not assumed.** Union = 65 keys = 60 byte-identical shared + engine-only `4350`(legacy non-standard)+`Ti_Grade5` + model-only `4340`(canonical JC-1983)+`Ti6Al4V`+`Inconel_718`. `Ti6Al4V`==`Ti_Grade5` (same alloy Ti-6Al-4V/Grade-5, identical coefficients) — BOTH keys retained so neither surface's `listAll()` drops a key. **Zero coefficient conflicts** across the 60 shared materials.

**Verification doctrine applied (the reusable lesson):** for a physics-data merge, do NOT trust a subagent's "verified programmatically" claim. I (a) hand-verified all shared keys field-by-field, then (b) ran a **programmatic transcription audit** — a regex diff of all 390 values in the new module vs the `git show HEAD:` originals of both files → `CLEAN: every original key present byte-identical, 0 conflicts, 0 phantoms, 0 missing`. The `physics-review-agent` could NOT do this (no Bash/git) and returned INCONCLUSIVE — a tooling limit, not a defect; I filled the gap myself per [[feedback_always_fill_gaps]]. Tests: 47/47 (new `JohnsonCookUnification.test.ts` single-source-invariant guard + coverage 63→65 + batch6 inconel-search 2→3 + 4350-now-visible). `tsc --noEmit` clean.

**ROUTED FOLLOW-UP (not done — different model family, out of "two JC databases" scope):** 4 unrelated engines still hold independent inline JC tables in a **°C reference frame** with divergent values — `UltimateSpeedFeedEngine.ts:~1512` (`JC_MATERIALS`), `SuperalloyMachiningEngine.ts:~102` (`ALLOY_PROPERTIES`), `LAMThermalSofteningEngine.ts:~64` (`JC_PARAMS`), `AdvancedPostPhysicsEngine.ts:~118` (`JC_DATABASE`, `T_melt_C`). Plus `AdvancedCuttingPhysicsEngine`'s `JohnsonCookMaterial` (`Tm`/`Tr` °C, +rho/cp). Repo-wide JC single-source needs a **separate unit with K↔°C unit-frame reconciliation** (candidate `U-OSC9-JC-CELSIUS-FAMILY-UNIFY`). A units mismatch here would be a real flow-stress error — see [[feedback_check_units_first]].

Relates to [[feedback_verify_actual_contract_not_proxy]] (verify the real artifact, not a proxy) and the SFC completeness roadmap M-PHYSICS milestone.
