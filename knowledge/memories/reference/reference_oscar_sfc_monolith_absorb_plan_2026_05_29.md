---
name: reference_oscar_sfc_monolith_absorb_plan_2026_05_29
description: SFC monolith-extraction mining — 3 TIER-1 parity-critical gaps to absorb from H:/PRISM/extracted before vendor-parity testing; 2 false-positive gaps resolved.
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.258Z
aliases: reference_oscar_sfc_monolith_absorb_plan_2026_05_29
---


Operator (slot:oscar, 2026-05-29) asked to mine the **old v8.89 monolith** (`C:/PRISM/_BUILD/PRISM_v8_89_002_TRUE_100_PERCENT.html`, 986,622 lines) extraction trees — `H:/PRISM/extracted/` (740 files) + `H:/PRISM/extracted_modules/` (1048) = 1788 modules — for SFC content to improve the build **before full-variability vendor-parity testing vs HSMAdvisor/G-Wizard**.

**Method:** leveraged papa's existing classification (`state/shared/extracted-modules-classified.json`, dup_status per module) → filtered to 98 SFC-relevant → 3 parallel deep-read agents cross-referenced against the current oscar build (60+ SFC engines + `physics/constants.ts` + `registries/CoatingRegistry.ts`). Plan: `state/shared/specs/SFC-MONOLITH-ABSORB-PLAN-2026-05-29.md`.

**The current SFC build is mature — most legacy modules are DUP/inferior.** Only 3 items move the vendor-comparison NUMBER:

**TIER-1 (build before testing):**
- **T1-A · Extended Taylor {C,n,a,b}** — current life = simple `(C/Vc)^(1/n)` (feed/depth-BLIND); `CANONICAL_TAYLOR` is {C,n} only. Legacy `PRISM_TAYLOR_TOOL_LIFE.js` (90L) has `V·T^n·f^a·d^b=C`, 150 combos, a=0.30–0.88/b=0.05–0.21. **The exact axis where vendor tool-life diverges.** Highest ROI. + `PRISM_TAYLOR_ADVANCED` inverse `optimizeSpeed(targetLife)`.
- **T1-B · Semi-Discretization chatter** — `PRISM_PIML_CHATTER_ENGINE.semiDiscretization()` (Insperger-Stépán DDE). Current = Altintas-Budak analytic only, which over-predicts stable critical-DOC at ae<0.5D (adaptive roughing = JM Die regime).
- **T1-C · Johnson-Cook coeff COVERAGE** — JC model exists but only ~5 alloys; `PRISM_JOHNSON_COOK_DATABASE.js` (158L) has 62 materials' A,B,n,C,m,T_melt → ~57 net-new.

**TIER-2 nuggets:** constraint-intersection + `limitedBy` provenance (`PRISM_CALCULATOR_CONSTRAINT_ENGINE` — how HSMAdvisor reports "limited by spindle torque") · WOC/DOC + ae/ap-by-material defaults · series-stiffness deflection (holder+spindle+runout) · ~107 net-new material grades (`PRISM_EXTENDED_MATERIAL_CUTTING_DB` 356L archive) · engagement-angle target table · N1–N12 Ra + callout parser + cusp-height · economic-tool-life helpers.

**2 false-positive gaps resolved (R7 — surface conflict, don't average):**
- **Coatings = DUP not gap.** `CoatingRegistry.ts` already has 100+ coatings WITH speed/life multipliers; `COATINGS_COMPLETE` is property-only. Cherry-pick ~6 Balinit trade-names + DLC sp3 only.
- **Johnson-Cook MODEL exists** — only the coefficient *coverage* is the gap (T1-C), not the equation.

**Hard rules:** never inline constants (→ `constants.ts` via `SfcDatabaseRegistryEngine`); **PROVENANCE GATE** before parity use — `PRISM_TAYLOR_COMPLETE` (91k ULTRA) is SYNTHETIC (uniform a=0.75/b=0.15) — do NOT absorb; verify the 90L table + JC coeffs + ext-material sfm/ipt are measured before wiring into the parity path. DuplicationGuard before each absorb. `extracted/` is frozen.

Build order: U-OSC9-ABSORB-1 (T1-A) → ABSORB-2 (T1-B) → ABSORB-3 (T1-C) → ABSORB-4 (T2-A) → ABSORB-5 (T2-D) → batch T2-rest. Related: [[reference_oscar_sfc_db_registry_2026_05_29]], [[reference_oscar_sfc_domain_map_2026_05_27]], parity-readiness spec.
