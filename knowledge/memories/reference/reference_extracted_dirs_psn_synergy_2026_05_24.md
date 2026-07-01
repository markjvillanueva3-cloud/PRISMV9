---
name: extracted-dirs-psn-synergy-2026-05-24
description: "H:/prism/extracted_modules + H:/prism/extracted (50 top-level categories, 1342 files) are now PSN-registered via generate-extracted-modules-features.mjs. Closes the gap surfaced by operator directive 'ensure they're all noded and mapped in system-viz and PSN'."
aliases: reference_extracted_dirs_psn_synergy_2026_05_24
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.569Z
---


# Extracted-dirs → PSN synergy (U-PSN-EXTRACTED-DIRS-NODE-MAP, golf 2026-05-24)

## What happened

Operator directive: *"H:\PRISM\extracted_modules H:\PRISM\extracted check both those sources, ensure they're all noded and mapped in system-viz and PSN. synergize them to the full PSN system if there's data in there still not in our system."*

Pre-discovery: `grep -c 'extracted' state/shared/system-viz/system-graph.json` returned **0 hits**. Both directories — containing 50 top-level categories and 1342 files of monolith-extracted engines / algorithms / formulas / materials / catalogs / databases — were ENTIRELY missing from the PSN graph substrate.

## What shipped

`scripts/generate-extracted-modules-features.mjs` (203 lines) — pure generator + CLI that probes both source dirs, emits a `system-viz` augmentation JSON with:

| roost | source | categories | files |
|-------|--------|------------|-------|
| `ghost.extracted_modules` | `H:/prism/extracted_modules` | 21 top-level (COMPLETE/ FINAL/ GIANT/ MEGA/ ULTRA/ ai_ml_engines/ complete_extraction/ databases/ geometry_engines/ physics_engines/ priority_extraction/ stubs/ + 9 manifest JSONs) | 1048 |
| `ghost.extracted` | `H:/prism/extracted` | 29 top-level (algorithms/ business/ catalogs/ constants/ controllers/ core/ engines/ formulas/ infrastructure/ integration/ knowledge_bases/ learning/ machines/ materials/ + 15 backup/variant dirs) | 294 |

**Total: 52 new ghost-nodes** (2 parent roosts + 50 category children) queued in `state/shared/system-viz/extracted-modules-augmentation.json`.

## How they synergize to PSN

The 50 category nodes are now first-class citizens of PSN leg #6 (System Viz) by file presence + cheap-probe metadata (file count + most-recent mtime per category). When `regen-viz.mjs` next runs successfully, every PSN-aware tool (master-index, /system-viz, subagent-context, awareness-snapshot, GNN tier-5 wiring inference) gains visibility into 1342 previously-orphaned files.

## Pending: visual surfacing blocked by regen-viz

The augmentation JSON is on disk and `merge-augmentations.mjs` HAS been wired to splice it. Standalone run of `merge-augmentations.mjs` failed with V8 heap exhaustion (~3GB allocation crash) — same pre-existing `U-SYSTEM-VIZ-REGEN-FIX` issue surfaced by the regen-viz banner ("merge augmentations exit 1") and previously filed in `state/shared/pending-wires.md`.

**Operator workaround until regen-viz is fixed:**
- The 52-node list lives at `H:/prism/state/shared/system-viz/extracted-modules-augmentation.json`
- Direct read: `node -e "const j = JSON.parse(require('node:fs').readFileSync('H:/prism/state/shared/system-viz/extracted-modules-augmentation.json','utf8')); for (const n of j.newNodes) console.log(n.id + '\t' + n.label);"`

## Wiring

- `scripts/generate-extracted-modules-features.mjs` — generator
- `scripts/regen-viz.mjs` FAST[] — registered (next regen-viz run picks it up)
- `scripts/merge-augmentations.mjs` — splice block added (currently OOM-blocked)
- `state/shared/system-viz/extracted-modules-augmentation.json` — augmentation payload

## Linked

- [[feedback_psn_definition]] — canonical 11-leg taxonomy (leg #6 System Viz is the render substrate)
- [[reference_regen_viz_string_length_2026_05_23]] — known V8 heap issue on the merge step
- [[reference_u_regen_viz_merge_faillod_2026_05_17]] — fail-loud doctrine for regen merge step
