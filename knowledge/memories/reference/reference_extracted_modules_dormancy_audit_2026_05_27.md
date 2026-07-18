---
name: reference-extracted-modules-dormancy-audit-2026-05-27
description: "Sierra audit of H:/prism/extracted + H:/prism/extracted_modules for /system-viz synergy gaps. 1788 modules total, 653 nodified (37%), 1135 dormant — 6 ranked synergy units proposed."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.569Z
aliases: reference_extracted_modules_dormancy_audit_2026_05_27
---


## Inventory baseline (audit 2026-05-27, sierra)

Pipeline from [[reference_extracted_modules_pipeline_2026_05_26]] (slot:papa) already shipped:
- Manifest + classification of **1788 modules** across 50 categories
- **653 L10 nodes** in `extracted-modules-detail-augmentation.json` + 786 edges
- Existing edge kinds: `wire_target` (541), `bridge_to_existing` (245)

## Coverage gap

**1135 modules NOT in /system-viz** (63% of corpus). Breakdown:

| Status | Count | In /system-viz? |
|---|---|---|
| WIRE_CANDIDATE top-200 by lines | 200 | ✓ |
| WIRE_CANDIDATE tail #201-#1259 | **1059** | ✗ dormant |
| DATABASE | 208 | ✓ |
| DUP_KEEP_EXISTING | 111 | ✓ |
| PARTIAL_OVERLAP | 134 | ✓ |
| STUB | 57 | ✗ (intentional — <30 lines) |
| META | 19 | ✗ (intentional — index files) |

## Dormant tail by type (1059 WIRE_CANDIDATEs beyond top-200)

| Type | Count | Synergy value |
|---|---|---|
| misc | 480 | LOW — mostly alarm catalogs + material generated lists |
| engine | 183 | **HIGH** — pre-built engine logic awaiting wiring |
| ai_ml | 94 | **HIGH** — feeds PSN leg #11 (PRISM AI) |
| algorithm | 64 | **HIGH** — feeds PSN leg #8 (Algorithms) |
| geometry | 44 | MEDIUM — CAD kernel candidates |
| system | 36 | MEDIUM |
| test | 33 | LOW — orphan test logic |
| cam | 32 | **HIGH** — pre-built toolpath logic |
| tool / machine | 46 | MEDIUM — catalog augmentation |
| physics | 21 | **HIGH** — Taylor/Kienzle/EKF candidates → mcp-server/src/physics/constants.ts |
| material | 7 | MEDIUM |
| util | 19 | LOW |

## Dispatcher distribution of dormant tail

| Dispatcher | Dormant count |
|---|---|
| prism_dev | 663 |
| prism_ai | 94 |
| prism_calc | 85 |
| prism_data | 53 |
| prism_cad | 44 |
| prism_session | 36 |
| prism_cam | 32 |
| n/a (unrouteable) | 52 |

## 6 proposed synergy units (ranked by leverage)

### S1 — U-EXTRACTED-TAIL-TYPED-FILTER (HIGH leverage, ~2h)
Extend `generate-extracted-modules-detail-features.mjs` to include WIRE_CANDIDATE tail filtered to the 5 high-value types (engine + ai_ml + algorithm + cam + physics = 394 modules). Surfaces the pre-built engine logic that's been invisible since the iter-21 ship's conservative top-200 cap. Adds ~394 L10 nodes + ~788 edges. Replaces the existing follow-up [[reference_extracted_modules_pipeline_2026_05_26]] §"U-EXTRACTED-PER-FILE-COMPLETE" with a typed filter (avoids 480 noisy misc adds).

### S2 — U-EXTRACTED-PSN-CROSS-LEG-BRIDGES (HIGH leverage, ~3h)
Add explicit edges from extracted-module nodes to other PSN legs:
- 94 ai_ml modules → PSN leg #11 nodes (AISystemRouterEngine, PRISMSelfAwarenessEngine, PRISMCreativeReasoningEngine)
- 21 physics modules → PSN leg #9 (`mcp-server/src/physics/constants.ts`, Kienzle/Taylor formula nodes)
- 64 algorithm modules → PSN leg #8 (`mcp-server/src/algorithms/*` registry nodes)
- 32 cam modules → PSN leg #7 ToolpathStrategyEngine + CAM dispatchers
Closes the [[feedback_psn_definition]] 11-leg expectation — currently only leg #6 (system-viz) carries the extracted corpus.

### S3 — U-EXTRACTED-DB-CONSUMER-EDGES (MEDIUM leverage, ~2h)
208 DATABASE nodes are isolated terminals — no edges to consumer engines. Add `consumed_by` edges:
- FANUC_ALARMS_MASTER + 9 other ALARM DBs → alarm-resolver engines + post-processor lint
- MATERIALS_MASTER + 12 material DBs → SpeedFeedCalculator + MaterialLookupEngine
- MANUFACTURER_CATALOG_DB → ToolSelectionRecommender
- FIXTURE_DATABASE → FixtureDesignEngine + workholding engines
Makes the 1.1MB classified.json's DB-to-consumer relationships visible.

### S4 — U-EXTRACTED-DISPATCHER-ROUTING-ROOST (MEDIUM leverage, ~1.5h)
1028 modules recommend `prism_dev` absorption but no edge from module → dispatcher node in /system-viz. Add a fan-IN roost: each `prism_*` dispatcher node receives a count badge "+N candidates to absorb". Guides /pick-unit selection: dispatchers see their own backlog. Replaces existing follow-up §"U-EXTRACTED-FORGE-PICKUP".

### S5 — U-EXTRACTED-HASH-COLLISION-DEDUP (LOW leverage, ~1h)
SHA-256 in manifest shows DUPLICATE FILES across stockpiles (e.g. PRISM_FEATURE_STRATEGY_COMPLETE appears twice with slightly different line counts — extraction artifacts). Build a dedup roost listing same-hash / near-hash collisions to guide cleanup. ~50-100 collisions estimated.

### S6 — U-EXTRACTED-BRIDGE-EDGE-VALIDATION (closes existing P2 follow-up, ~1h)
245 `bridge_to_existing` edges silently drop if engine name shape mismatches. Add a fail-loud roost listing unresolved bridge targets so operators can fix the name-shape mapping. Pre-existing P2 follow-up per [[reference_extracted_modules_pipeline_2026_05_26]]; previously unscoped.

## Ranking summary

| Unit | Leverage | Effort | New /system-viz nodes |
|---|---|---|---|
| S1 — typed tail filter | HIGH | 2h | ~394 |
| S2 — PSN cross-leg bridges | HIGH | 3h | 0 (edges only, ~211) |
| S3 — DB consumer edges | MEDIUM | 2h | 0 (edges only, ~150) |
| S4 — dispatcher routing roost | MEDIUM | 1.5h | ~7 (dispatcher counters) |
| S5 — hash collision dedup | LOW | 1h | ~50 |
| S6 — bridge edge validation | LOW (closes follow-up) | 1h | ~50 |

Total proposed: **+501 nodes + 1199 edges** atop current 653/786. Pre-existing regen-viz V8 OOM (see [[reference_regen_viz_string_length_2026_05_23]]) is the gate before any of these materialize.

## What's NOT worth synergizing

- **480 misc tail** — mostly auto-generated material catalogs + alarm verified-vs-final duplicates. Low signal, would clutter the graph. Skip.
- **57 STUBs** — correctly filtered today. Re-stub-builds are tracked elsewhere via STUB-HUNT-MS0.
- **19 META files** — index/summary docs already covered by manifest itself.

## Operator pick path

If operator picks any of S1-S6, the existing pipeline in `scripts/generate-extracted-modules-detail-features.mjs` is the extension point. Pattern:
1. Read `state/shared/extracted-modules-classified.json`
2. Filter to scope
3. Emit augmentation file
4. Splice already exists via `extractedModulesDetail` loader in `merge-augmentations.mjs`

## Related

[[reference_extracted_modules_pipeline_2026_05_26]] · [[feedback_psn_definition]] · [[reference_regen_viz_string_length_2026_05_23]] · [[reference_cag_injectors_consume_2026_05_27]]
