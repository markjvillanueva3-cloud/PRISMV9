---
name: reference_material_db_descriptive_key_two_facet_2026_06_21
description: "CORRECTED 2026-06-21 (slot:india ground-truth run): the CANONICAL_MATERIAL_DB descriptive-key gap is NOT safe-additive facet (a) -- it is a PHYSICS-DOMAIN unit (oscar/physics-reviewer) with 2 unresolved data conflicts (Inconel 718 3200-vs-3000, brass-vs-aluminum per-ISO machinability) that cannot reach green by aliasing. Real latent production bug also found. Full ready-to-execute spec below."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.649Z
aliases: reference_material_db_descriptive_key_two_facet_2026_06_21
---


**SHIPPED 2026-06-21, commit `b60bba5e8b` (slot:india, U-MATDB-DESCRIPTIVE-KEY-ALIAS):** the aliasing portion is DONE -- non-enumerable descriptive-name aliases now resolve on CANONICAL_MATERIAL_DB (design (i)), un-breaking the 8 production undefined-fallbacks AND fixing 2 u-arch3 tests (L424 kc1_1-ISO + L460 thermal) + 1 canonical-material-db-extensions test. A/B 45->42 failed, ZERO regressions; 2-arm scrutiny PASS. ONLY the 2 PHYSICS-DATA questions remain (for oscar/physics-reviewer): L360 inconel_718 3200-vs-test-3000 + L472 brass-vs-aluminum per-ISO machinability. Detail below.

**CORRECTION (slot:india 2026-06-21, ran the actual test + read the build site end-to-end).** The prior "two-facet / facet (a) is SAFE-ADDITIVE" framing in this file was WRONG. Ground truth below supersedes it. This is a PHYSICS-DOMAIN unit (oscar / physics-reviewer), NOT a clean india AI-training pick, and it cannot be driven to green by additive aliasing alone.

**GROUND TRUTH -- `npx vitest run src/__tests__/u-arch3-material-resolution.test.ts` = exactly 4 fails (NOT ~147; that number conflated 3 separate files):**
1. **L360** `CANONICAL_MATERIAL_DB.inconel_718.kc1_1` -> expects **3000**.
2. **L424** `.steel`=1800 / `.stainless_304`=2100 / `.cast_iron`=1100 / `.aluminum_6061`=700 / `.titanium_gr5`=2800 / `.hardened_steel`=3200 (descriptive keys -> `undefined.kc1_1` throws).
3. **L460** thermal ordering via `.aluminum_6061` / `.steel` / `.stainless_304` / `.titanium_gr5` `.k_thermal`.
4. **L472** machinability ordering `.brass` > `.aluminum_6061` > `.steel` > `.stainless_304` > `.titanium_gr5` > `.inconel_718`.

**BUILD SITE (verified, constants.ts):** `_RAW_MATERIAL_DB` (L143-166) is keyed by 15 SHORT codes: `1018,1045,4140,304,316,6061,7075,Ti-6Al-4V,Inconel 718,D2,A2,tungsten_carbide,gray_iron,C11000,C26000`. `CANONICAL_MATERIAL_DB = Object.fromEntries(...)` (L1372) keeps those exact short keys; `buildMaterialPhysics(raw, undefined, key)` uses the key as the `AISI_CUTTING_COEFFICIENTS` (L1251) override lookup. `AISI_ALIAS` (L172) maps descriptive->short but is a SEPARATE map, never folded onto the DB.

**THE CONTRADICTION (why facet (a) is NOT safe-additive):** the SAME test file asserts `Object.keys(CANONICAL_MATERIAL_DB).length === 15` (L405-409). Adding 8 descriptive ALIAS keys as own-enumerable properties makes the count 23 -> breaks L409. So you cannot "just alias." Options: (i) make aliases NON-ENUMERABLE via `Object.defineProperty(enumerable:false)` so `Object.keys/entries/values` still see only the 15 canonical materials (count + range/ordering iteration tests L433/440/447/453 unaffected) while `.steel`/`["steel"]` resolve; or (ii) re-key `_RAW_MATERIAL_DB` to descriptive names + invert AISI_ALIAS (big blast radius). (i) is the bounded design.

**VERIFIED descriptive->short kc1_1 (6 of 7 line up; aliasing fixes L424 + L460 cleanly):** steel->1045=1800 OK · stainless_304->304=2100 OK · cast_iron->gray_iron=1100 OK · aluminum_6061->6061=700 OK · titanium_gr5->Ti-6Al-4V=2800 OK · hardened_steel->D2=3200 OK. NOTE `titanium_gr5` + `hardened_steel` are NOT yet in AISI_ALIAS (add `titanium_gr5->Ti-6Al-4V`, `hardened_steel->D2` for resolver parity).

**THE 2 GENUINE PHYSICS-DATA QUESTIONS (NOT aliasing; defer to oscar/physics-reviewer; india refuses to guess physics constants):**
- **L360 Inconel 718 kc1_1:** canonical `AISI_CUTTING_COEFFICIENTS["Inconel 718"]` = **3200** (constants.ts:1265, deliberate per-material override ABOVE the ISO-S base 2800; physically sensible -- Inconel machines harder than Ti). Test asserts **3000**. R7 conflict: EITHER the test is stale (align 3000->3200, the source-of-truth-wins move) OR 3200 is wrong (needs a sourced correction). Ordering L362 (inconel>titanium) holds either way. Needs a SOURCED decision (Sandvik/Kennametal kc1.1 for Inconel 718), not a guess.
- **L472 brass vs aluminum machinability:** `machinability_factor` comes from per-ISO `MACHINABILITY_FACTOR_BY_ISO[iso]`; brass (C26000) and aluminum_6061 (6061) are BOTH ISO N -> identical factor -> `brass > aluminum` can never hold. Requires PER-MATERIAL machinability factors (a real modeling addition), not aliasing.

**REAL LATENT PRODUCTION BUG found in the same sweep (R12, worth its own fix):** ~8 production engines use `CANONICAL_MATERIAL_DB.steel` as a safety fallback (`... || CANONICAL_MATERIAL_DB.steel`) and `MATERIAL_DB.carbide` -- but `.steel`/`.carbide` are descriptive keys that DO NOT EXIST on the short-code DB -> resolve to `undefined` RIGHT NOW. Sites: PostProcessorAICoordinationBridge:281, PostProcessorPhysicsAwareGeneratorEngine:407, PostProcessorUnifiedPhysicsOrchestrationEngine:469, MasterPostProcessorAGIOrchestrationEngine:746/900, LatheBayesianOptimizationEngine:1722/1726, LatheGeneticAlgorithmEngine:1835, ElectrodeDeepLearningEngine:880, CuttingThermalEngine:179-180 (`.carbide`). The non-enumerable descriptive-alias fix (design (i)) un-breaks ALL of these at once with zero physics-value change -- this is the strongest reason to do design (i), independent of the tests.

**RECOMMENDED EXECUTION (for oscar / physics slot, NOT india):** (1) add non-enumerable descriptive aliases for every AISI_ALIAS target onto CANONICAL_MATERIAL_DB after L1392 (+`titanium_gr5`,`hardened_steel`,`carbide`) -> fixes L424+L460 + the 8 production undefined-fallbacks, count test untouched; (2) physics-reviewer-gated SOURCED decision on Inconel 718 kc1_1 (3000 vs 3200) -> fixes L360; (3) per-material machinability_factor for at least brass/aluminum -> fixes L472. Steps (2)(3) are physics-data, physics-reviewer mandatory. Parent: [[reference_india_ai_red_batch_2026_06_21]] item #7.
