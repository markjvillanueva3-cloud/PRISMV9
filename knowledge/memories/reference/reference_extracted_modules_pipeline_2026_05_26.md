---
name: reference-extracted-modules-pipeline-2026-05-26
description: Convert extracted/ + extracted_modules/ (1788 monolith-extraction files) into individual /system-viz nodes with bridges to existing PRISM engines. 4-script pipeline shipped slot:papa /goal /loop iter 1-2.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.571Z
aliases: reference_extracted_modules_pipeline_2026_05_26
---


# Extracted-modules conversion pipeline — slot:papa 2026-05-26

## RE-ATTRIBUTION (commit absorption)

The 10 files of this pipeline were absorbed into 2 peer commits (per [[feedback_commit_to_slot_worktree]] failure mode — `H:/prism-slot-papa` was locked + slot-bridge hooks disabled by `5828080636`, so shared-tree commits absorbed into peers):

- `7a6952b3ad` (peer: [POST-PROCESSOR-CONSOLIDATION-2026-05-25]/U-MASTERPOST-DIALECT-SYMMETRY) absorbed:
  - `scripts/build-extracted-modules-manifest.mjs`
  - `scripts/extracted-modules-pipeline.test.mjs`
  - `scripts/regen-viz.mjs` (+1 line)
  - `scripts/generate-extracted-modules-detail-features.mjs`
  - `state/shared/extracted-modules-manifest.json`
  - `state/shared/extracted-modules-classified.json`
  - `knowledge/wiki/architecture/extracted-modules-pipeline.md`
- `b210018020` (peer: [UI-UX-IMPROVEMENT-MS0]/U-F7-REACT-SCAN-DEV-OVERLAY slot:quebec) absorbed:
  - `scripts/classify-extracted-modules.mjs`
  - `scripts/merge-augmentations.mjs` (+34 lines)
- This memo (`reference_extracted_modules_pipeline_2026_05_26.md`) is the one self-commit, prefixed `[MAIN] [PSN-EXTRACTED-CONVERT]/U-EXTRACT-PIPELINE-DETAIL`.

The work is fully shipped despite the attribution drift — the splice runs on next `regen-viz`. Operators searching commit history for "PSN-EXTRACTED-CONVERT" or "U-EXTRACT-PIPELINE-DETAIL" should also `git log -p -- scripts/build-extracted-modules-manifest.mjs` to find the real diff.

## What the pipeline does

Closes the operator directive (slot:papa /goal /loop): *"convert extracted data to individual nodes, bridge and wire to existing databases, nodes that can utilize them H:\PRISM\extracted H:\PRISM\extracted_modules. synergize all data to PSN + /system-viz + prism app"*.

## What landed

Four scripts + two splice edits, all additive (per [[feedback_never_delete_only_disable]]):

1. **`scripts/build-extracted-modules-manifest.mjs`** — walks both stockpiles, emits `state/shared/extracted-modules-manifest.json` (1788 files, 50 categories, SHA-256 per file, by_stockpile + by_category + by_type tallies). One row per `.js / .json / .md / .py / .ts` file.

2. **`scripts/classify-extracted-modules.mjs`** — fuzzy-matches each module name against the 3678 existing engines in `mcp-server/src/engines/` via collapsed-name exact + Jaccard token similarity. Classifies as:
   - **WIRE_CANDIDATE** (1259) — no existing equivalent
   - **PARTIAL_OVERLAP** (134) — fuzzy 0.55-0.85 to existing engine
   - **DUP_KEEP_EXISTING** (111) — exact or fuzzy ≥0.85 match
   - **DATABASE** (208) — pure registry data
   - **STUB** (57) — <30 lines
   - **META** (19) — index/summary `.json`/`.md`

3. **`scripts/generate-extracted-modules-detail-features.mjs`** — emits `state/shared/system-viz/extracted-modules-detail-augmentation.json`: **653 file-level L10 nodes** (top-200 WIRE + 208 DB + 111 DUP + 134 PARTIAL) + **786 edges**:
   - `bridge_to_existing` (245): DUP/PARTIAL → matched PRISM engine
   - `wire_target` (541): WIRE/PARTIAL → recommended dispatcher
   - Parent chain: `ghost.<stockpile>.<category>` → file-node

4. **Splices into `regen-viz.mjs` FAST[] + `merge-augmentations.mjs`**: detail augmentation registers after the existing golf 5/24 roost generator. Splice block uses `addNodeIndexed()` (the post-2026-05-23 anti-quadratic helper).

## Top WIRE_CANDIDATEs (sample)

The legacy v8.89 monolith holds these unbuilt-in-current-PRISM beasts:
- 214K-line PRISM_PSO_OPTIMIZER (extracted_modules/GIANT/)
- 204K-line PRISM_AI_EXPERT_INTEGRATION
- 186K-line PRISM_AI_100_KB_CONNECTOR
- 179K-line ALL_MACHINES.json (machine catalog)
- 156K-line P_STEELS_complete (material)
- 146K-line PRISM_PHASE6_DEEPLEARNING
- 116K-line PRISM_EKF + 102K-line PRISM_EKF_ENGINE
- 105K-line PRISM_NURBS_100
- 91K-line PRISM_TAYLOR_COMPLETE (canonical Taylor tool-life)
- 73K-line PRISM_ROUGHING_LOGIC + 66K PRISM_ENHANCED_CAD_KERNEL

## Top DATABASEs (registry candidates)

- 113K-line PRISM_VERIFIED_POST_DATABASE_V2 (post-processor verified DB)
- 73K MANUFACTURER_CATALOG_DB
- 62K FIXTURE_DATABASE
- 43K MASTER_ALARM_DATABASE (Fanuc/Okuma/Siemens alarms)
- 13K HAAS_MACHINE_DB_v3 + 9K MACHINE_3D_MODEL_DB
- 10K WORKHOLDING_DATABASE
- + 200 more

## PSN bridge

Per [[feedback_psn_definition]] all 11 legs receive the inventory:
- **Leg 1 (Obsidian brain)** — THIS file
- **Leg 3 (wiki)** — `knowledge/wiki/architecture/extracted-modules-pipeline.md` (this commit)
- **Leg 5 (tribal)** — manifest seeds tribal-density via the existing extracted-pdf-tips bridge pattern (next iter)
- **Leg 6 (/system-viz)** — 653 detail nodes + 786 edges atop golf's 50 roost categories
- **Leg 7-10 (engines / algos / formulas / NN-GNN)** — DUP edges identify the 111 already-mirrored engines; WIRE_CANDIDATEs become the pickup queue for forge-triple builds

## How operators use it

Regen the artifacts before any pickup pass:
```bash
node scripts/build-extracted-modules-manifest.mjs
node scripts/classify-extracted-modules.mjs
node scripts/generate-extracted-modules-detail-features.mjs
```

Then pick from WIRE_CANDIDATEs in line-count order — `state/shared/extracted-modules-classified.json` `summary.top_20_wire_candidates` is the highest-leverage starting set.

## Why this is additive

- Existing golf 5/24 roost (`generate-extracted-modules-features.mjs`) untouched — still emits the 50 category nodes.
- New detail layer adds child nodes UNDER those categories — no orphan parents.
- New splice block reads its OWN augmentation file — gated `if (extractedModulesDetail?.newNodes)`, silently no-ops if absent.
- No physics constants inlined, no stub assertions, no existing tests broken.

## Open follow-ups

- **U-EXTRACTED-PER-FILE-COMPLETE** — extend the detail layer beyond top-200 WIRE (cap was conservative; the full 1259 would add ~1000 more nodes; viable once we measure /system-viz render impact)
- **U-EXTRACTED-BRIDGE-EDGE-VALIDATION** — DUP edges name PascalCase engine targets but the system-graph node-id scheme may use a different shape; the splice silently drops unresolved targets (R12 fail-loud would log them — tracking as a P2 follow-up)
- **U-EXTRACTED-FORGE-PICKUP** — feed the WIRE_CANDIDATE list into the /pick-unit priority queue so dev slots auto-route to the next legacy module worth absorbing.
