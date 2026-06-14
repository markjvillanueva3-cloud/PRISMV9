---
name: reference-lathe-adaptive-pipeline-assessment-2026-05-27
description: "Pointer to lathe-adaptive-pipeline-assessment-2026-05-27 wiki entry. Answers operator's 7-decision closed-loop pipeline question — YES we have enough, ~66h MVP wiring (1 new engine + 11 integration units). v2 amend added simulation+collision decision after operator R7 catch."
type: reference
slot: whiskey
source: prism-memory
synced: 2026-06-09T14:54:09.186Z
aliases: reference_lathe_adaptive_pipeline_assessment_2026_05_27
---


# Lathe adaptive pipeline assessment — pointer

Operator directive 2026-05-27 (slot:whiskey, `C:/Users/wompu/OneDrive/Pictures/last.md`): assess + design closed-loop self-training adaptive lathe pipeline across **7 operator decisions** (machine / stock / sequence / toolpath / capability / post / **simulation+collision** — 7th added after operator R7 caught v1 miss).

Full assessment + design blueprint lives at:
**[[lathe-adaptive-pipeline-assessment-2026-05-27]]** (`knowledge/wiki/architecture/`)

## TL;DR

**YES — we have enough.** 6 of 7 operator-decision surfaces are HAVE; the 7th (raw bar-stock inventory) is the only true MISSING engine. All 4 self-training pillars exist + a 3-layer simulation/collision stack (math + CAM bridges + DL prediction). Bulk of remaining work is integration wiring.

## Build order (~66h MVP)

1. `U-LATHE-BARSTOCK-INVENTORY-ENGINE` (only new engine, ~8h, unblocks §B)
2. `U-LATHE-OUTCOME-BUS-WIRE` (~4h — the load-bearing edge that flips open→closed loop)
3. `U-LATHE-WIZARD-MACHINE-SELECT-WIRE` (~4h)
4. `U-LATHE-WIZARD-ROI-RANK-WIRE` (~3h)
5. `U-LATHE-WIZARD-SEQUENCE-WIRE` (~5h)
6. `U-LATHE-STOCK-EVOLUTION-CUTPLAN-WIRE` (~3h)
7. `U-LATHE-WIZARD-REAL-JM-DIE-VALIDATE` (~12h — confidence floor)
8. `U-LATHE-MCP-DISPATCHER-EXPOSE` (~3h — UX)
9. `U-LATHE-COLLISION-GATE-WIRE` (~5h — §E.5 math layer: InProcessStockModel + LatheCollisionZone + lathe_collision_check/_swing_check/_boring_reach)
10. `U-LATHE-CAM-BRIDGE-COLLISION-PARSE` (~10h — parse structured reports from hyperMILL/Mastercam/Fusion-360 native validators into wizard Stage 4 REASON)
11. `U-LATHE-VMDL-TRAIN-FROM-BREACHES` (~6h — LatheEnvelopeBreachReplayEngine MTConnect captures → VirtualMachiningDeepLearningEngine training)
12. `U-LATHE-INPROCESS-STOCK-WIRE` (~3h — InProcessStockModelEngine → BarStockCutPlanEngine remnant-tracking)

## dont-reinvent corrective (the value-add)

Agent B initially flagged `LatheBarStockODSelectorEngine` as MISSING. The `dont-reinvent` skill caught it: `StockSizeOptimizerEngine.ts` already covers this with 3 wired actions (`stock_size_optimize` + `stock_size_catalog` + `stock_size_nesting`) — "considers machining allowance + saw kerf + chuck grip + cutoff + nesting." Without this skill we would have proposed a duplicate engine.

## v2 amendment — simulation + collision (operator-caught v1 miss)

The v1 assessment listed 6 decisions and skipped simulation + collision-avoidance as a separate stage (mentioned only in §17 of the iter275 asset map; not pulled into the operator-decision table). Operator R7-surfaced: "we havent factored in simulation and collision avoidance. were using hypercad, mastercam and fusion internal collision avoidance and straight math which we should have engines and algorithms for." Verified inventory + patched the wiki with §1f (inventory), Decision 7 (assessment), §E.5 (blueprint stage), and 4 new gap units (#9-#12). Three-layer stack exists:

1. **Math (HAVE):** `CollisionDetectionEngine`, `LatheCollisionZoneEngine`, `InProcessStockModelEngine` + `prism_safety:check_toolpath_collision`/`check_fixture_clearance`/`calculate_safe_approach` + `prism_turning:lathe_collision_check`/`lathe_swing_check`/`lathe_boring_reach`
2. **CAM-native bridges (PARTIAL):** `hypermill_collision_check`/`hypermill_safety_audit`, `mastercam_safety_validate`/`_validate_all`/`_rules` (graph flags L8/stub), `fusion360_safety_*`, sibling bridges for NX/PowerMill/CATIA/SolidCAM/WorkNC. PARTIAL because collision-reports come back as opaque pass-through text — gap #10 parses them
3. **DL prediction (PARTIAL):** `VirtualMachiningDeepLearningEngine` — needs `LatheEnvelopeBreachReplayEngine` MTConnect breach captures wired into training corpus (gap #11)

## Surfaces composed for this assessment

- iter275 asset map (`[[reference_whiskey_lathe_complete_asset_map_2026_05_27]]`) — baseline
- iter143 wizard ship (`[[reference_whiskey_lathe_session_close_iter143_2026_05_27]]`) — foundation
- 2 parallel Explore agents (ERP/shop-floor + bar-feed/ROI/closed-loop) — gap-fill
- `dont-reinvent` skill — corrective grep on the 2 MISSING claims
- `feedback_wiki_for_how_to_memory_for_pointers` doctrine — extended how-to → wiki, pointer → memory
- whiskey soul refuse-list — §6 safety gates governing every pipeline stage

## Caveats

- MCP daemon was disconnected this session — could not run `prism_session:master_index_query` or `prism_session:dispatcher_map_compact` route-nudges. Composed via the iter275 asset map + Glob/Grep instead. Findings still robust (3 cross-verified sources per engine claim).
- HIGH confidence on engine-existence claims; MEDIUM on engine-completeness (some engines may have partial implementations not detected by name-match); LOW on Stage 5 wizard robustness against real 15K-line `.MIN` programs (iter143 only tested synthetic fixtures).

## Related

- [[lathe-adaptive-pipeline-assessment-2026-05-27]] — full wiki entry (this is its pointer)
- [[reference_whiskey_lathe_soul_designation_2026_05_27]] — slot soul governing §6 safety
- [[feedback_wiki_for_how_to_memory_for_pointers]] — doctrine that put the how-to in wiki
- [[feedback_psn_definition]] — 11-leg PSN this pipeline plugs into
