---
name: reference_oscar_toolsteel_condition_classification_2026_05_31
description: Fixed the hardened/annealed tool-steel ISO misclassification in physics/constants.ts (condition-aware) — oscar↔foxtrot coordination
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.262Z
aliases: reference_oscar_toolsteel_condition_classification_2026_05_31
---


OSCAR-SFC-9AXIS-MS0/U-OSC9-TOOLSTEEL-CONDITION (slot:oscar, 2026-05-31, commit `d724159fa3`). Operator-directed: "coordinate with foxtrot to fix the misclassification of hardened tool steels and annealed tool steels."

**Root cause (verified in `mcp-server/src/physics/constants.ts`):** tool steels were classified CONDITION-BLIND to ISO group H. `_RAW_MATERIAL_DB` had D2/A2 only as hardened (HRC 62/60, iso_group H, taylor_C 120 = CBN regime); `AISI_ALIAS["tool_steel"]="D2"`; `_MATERIAL_KEYWORD_TO_ISO["tool_steel"]="H"`; **no annealed path existed**. So ANNEALED tool steel — the as-supplied/pre-heat-treat condition you actually machine (~200 HB, machines like ISO-P 4140 at kc 1800) — was forced into the H regime (kc 3200, HRC-62 CBN speeds) → over-predicted cutting force + wrong speeds/feeds + wrong tool class.

**Fix (additive, preserves the conservative H default for unknown condition):**
1. Annealed `D2_annealed`/`A2_annealed`/`O1_annealed`/`H13_annealed` entries as ISO **P** (ASTM A681 / ASM Vol.1 annealed Brinell ~192-217 HB; ASM Vol.16 turning Taylor, AMBER-flagged representative).
2. Condition-aware `AISI_ALIAS` (`_annealed`/`_hardened` variants; bare `o1`/`h13` → annealed since those grades are machined soft then hardened) + `_MATERIAL_KEYWORD_TO_ISO` annealed/soft keywords.
3. `toolSteelISOForCondition(condition?, hardnessHRC?)` classifier + `TOOL_STEEL_HARDENED_HRC_MIN = 45` (ISO 513 H-group onset per Sandvik/CLAUDE.md "H: HRC 45-65"). Resolution: **measured hardness wins** (≥45→H, else P) → named condition → **conservative H default** (assuming soft on possibly-hard stock is the dangerous error: under-force + over-speed on 60 HRC → tool shatter).

15 tests through the PUBLIC surface (`getKienzle`/`getTaylor`/`resolveMaterial`): annealed D2 now `getKienzle.kc1_1`=1800 (=1045/ISO P); hardened D2 stays 3200 (ISO H). 2-of-2 physics scrutiny PASS (physics-review-agent + reviewer).

**Key architectural gotcha (both reviewers flagged):** `getKienzle`/`getTaylor` return the **per-ISO-GROUP** coefficient via `_resolveISO` — NOT the per-grade `taylor_C` on the raw DB row. So `getTaylor("D2_annealed").C` = 350 (P-group), not the 220 on the raw entry; the per-grade values surface only via `resolveMaterial()`/`buildMaterialPhysics()`. The classification fix rides entirely on the iso_group field. Documented inline.

**Coordination (oscar ↔ foxtrot):** posted diagnosis + ownership split + shipped commit to `state/shared/AGENT_CHAT` via `agent-coordination.mjs post --agent oscar`. **Foxtrot owns the suspected INVERSE error in the mill domain:** the monolith `materials-p-steels/tool-steels-*` catalog groups tool steels under ISO P, so a HARDENED tool steel selected there could inherit soft-P params (dangerous at 60 HRC) — foxtrot to audit + route the catalog through `toolSteelISOForCondition()`. The new classifier API is the shared contract.

**Pre-existing unrelated debt found (NOT this change):** (a) `canonical-material-db-extensions.test.ts` (U-LTH04b) asserts an inverted AISI_ALIAS schema that doesn't exist in current constants.ts — already red fleet-wide; (b) a `constants-drift-guard` + `NoInlinePhysicsConstantsEngine` co-run test-isolation artifact (drift-guard passes 7/7 in isolation; fails only when co-run — the FS-scanning guard interferes). Both should be triaged separately.

**Catalog side ALSO fixed (commit `24ba622459`, operator said "continue" → cross into mill catalog):** `web/src/data/calculatorWorkspace.ts` `deriveStaticMaterialIsoGroup()` returned `'H'` for EVERY `tool_steel` entry — the SAME error direction, not the inverse I'd hypothesized. All 6 catalog grades are annealed (h13/a2/s7/o2/d2 ~200-285 HB) or P20 prehard (28-32 HRC) → all wrongly hardened. New exported `deriveToolSteelIso(item)`: HRC rating wins (≥45→H) → HB (≥420 HB ≈45 HRC, ASTM E140) → annealed/soft keyword→P → conservative H. Mirrors the backend (web is import-sandboxed). 9 tests via exported enriched `MATERIAL_CATALOG`. **Steel-family generalization ALSO done (commit `47aa1f66d2`, operator "keep pushing through"):** closed the flagged `'steel'`-group gap — refactored `deriveToolSteelIso` → `classifySteelIsoByHardness(item, fallback)`; `'steel'` now classifies with fallback P + HRC≥45/HB≥420→H (so a hardened 4340/52100 @ ≥45 HRC → H instead of the dangerous P), `'tool_steel'` keeps fallback H. Narrowed the hard-keyword to `\bhardened\b` (excludes "prehardened" = sub-45-HRC = P). Net effect on current catalog = ZERO reclassification (no steel entry ≥45 HRC; 4140-ph 28-32 HRC stays P) — defensive correctness for hardened entries added during vendor-parity testing. 13 catalog tests. **Remaining for foxtrot:** verify heat-treat-SF + other mill catalogs consume the condition-aware path (the classifier itself is now complete on all 3 surfaces). Catalog commits (24ba622459, 47aa1f66d2) were SELF-REVIEW only (agent 2-of-2 session-limited until 12am Central — re-scrutiny queued); backend mirror d724159fa3 had full 2-of-2 PASS.

Cross-refs: [[reference_oscar_sfc_domain_map_2026_05_27]] · [[reference_oscar_sfc_monolith_absorb_plan_2026_05_29]] · [[feedback_foxtrot_canonical_constants_import]]. Session context: shipped after SFC frontend P1/P2/P3 + backend T1-A/B/C ([[reference_oscar_sfc_t1b_sdm_chatter_2026_05_30]]).
