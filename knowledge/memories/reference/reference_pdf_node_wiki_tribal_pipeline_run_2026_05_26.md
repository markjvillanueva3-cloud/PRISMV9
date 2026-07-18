---
name: pdf-node-wiki-tribal-pipeline-run-2026-05-26
description: "Ran existing PDF→nodes→wiki→tribal pipeline end-to-end on the resources/ + JM DIE/ corpus — 893 graph nodes + 12,642 bridge edges + 621 wiki tribal entries promoted"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.727Z
aliases: reference_pdf_node_wiki_tribal_pipeline_run_2026_05_26
---


# PDF→Nodes→Wiki→Tribal pipeline run (slot:delta 2026-05-26 /loop iter5+6)

User work order mid-/loop: *"there are pdfs in the resources folder and jm die folder for several cad cam software generate nodes for ALL text and content … convert to nodes to wire into cad and cam and generate wikis and tribal knowledge if we haven't done so already. then continue current tasks"*.

## Pre-existing infrastructure (Read-before-Write per R8)

PRISM already has a complete PDF→knowledge pipeline. None of this was built today; the work was operating it:

| Layer | Surface |
|---|---|
| Indexer | `scripts/build-cad-cam-resources-pdf-index.mjs` (kilo, 2026-05-26) — walks `resources/` and emits `mcp-server/data/state/cad-cam-resources-pdf-index.json` keyed by domain+software |
| Batch extractor | `scripts/batch-pdf-extract.mjs` (india, 2026-05-25 iter44) — pdftotext + heuristic tip harvest → `state/shared/extracted-pdfs/*.jsonl` |
| Spec emitter | `scripts/auto-resource-pdf-spec-emit.mjs` — AUTOGEN-EXTRACT-SPEC-*.md drops per PDF |
| Resource-PDF nodes | `scripts/generate-resource-pdf-features.mjs` → `state/shared/system-viz/resource-pdf-augmentation.json` (ghost.resource_pdfs roost) |
| Tip nodes | `scripts/generate-extracted-pdf-tips-features.mjs` → `extracted-pdf-tips-augmentation.json` (pivot per book + child per tip) |
| Coverage nodes | `scripts/generate-pdf-coverage-features.mjs` → `pdf-coverage-augmentation.json` (extracted vs pending) |
| Course bridge | `scripts/generate-pdf-course-bridge-features.mjs` → `pdf-course-bridge-augmentation.json` (PDFs ↔ MIT-OCW + prism-training + handbook-pdfs) |
| Wiki promotion | `scripts/promote-tribal-to-wiki.mjs` → `knowledge/wiki/code-tribal/tribal-*.md` for tips with conf ≥ 90 |
| Engines | 10 PDF engines under `mcp-server/src/engines/PDF*Engine.ts` (Blueprint, Formula, MaterialProperty, Highlight, Structure, Table, Pipeline, SourceRegistry, HandbookBatchProcessor, BlueprintPatternRescue) |
| Wiki action surface | 10 actions under `knowledge/wiki/architecture/actions/{cad,cam,data,dev}/` for `pdf-{blueprint,pipeline,material,highlights,table,structure,formula}-*` |

## What this run produced

| Output | Count | Path |
|---|---|---|
| Resources PDFs indexed | 1,008 | `mcp-server/data/state/cad-cam-resources-pdf-index.json` |
| — by-domain | training:835, cam:111, catalog:38, cad:14, machine:9, mfg:1 | (above) |
| Resource-PDF graph nodes | 893 | `state/shared/system-viz/resource-pdf-augmentation.json` |
| Tip graph nodes | 605 (1 roost + 111 pivots + 493 tips) | `extracted-pdf-tips-augmentation.json` |
| Coverage nodes | 213 | `pdf-coverage-augmentation.json` |
| **PDF ↔ course bridge edges** | **12,642** | `pdf-course-bridge-augmentation.json` |
| Wiki tribal markdown entries | **621 newly promoted** | `knowledge/wiki/code-tribal/tribal-*.md` |

Course-bridge breakdown (12,642 edges, 893 PDF sources, 1,401 course sources):
- handbook-pdfs: 886
- prism-training: 414
- other-pdf: 772
- mit-ocw: 96
- resource-catalog: 64
- manual-pdf: 42
- machining-handbook: 13
- basic-training: 3
- blueprint-pdf: 2
- knowledge-pack: 1
- prism-personal: 1

Tribal wiki promotion: 3,919 candidate tips scanned, 628 above conf 90, 7 already existed, **621 newly written**.

## JM DIE PDFs deliberately deferred

`H:/prism/JM DIE/` has **85,244 PDFs**, mostly customer-job prints (electrode drawings, fastener blueprints, setup sheets) — domain is shop-floor blueprint extraction, not CAD/CAM software documentation. Existing `PDFBlueprintDimensionExtractorEngine` + `PDFBlueprintPatternRescueEngine` are the right tools, but full-corpus run is multi-hour and produces customer-specific tribal that doesn't generalize to template generation. Not run in this loop — surface as follow-up unit `U-JM-DIE-PDF-BLUEPRINT-MASS-EXTRACT` for a future delta or echo session.

## Commit posture

All outputs are state files in `H:/prism` shared tree. The shared tree has 14,060+ uncommitted changes (peer-contended per session-start dashboard); committing from here would absorb peer attribution per [[feedback_commit_to_slot_worktree]]. Outputs are regenerable in one re-run:

```bash
cd H:/prism
node scripts/build-cad-cam-resources-pdf-index.mjs
node scripts/generate-resource-pdf-features.mjs
node scripts/generate-extracted-pdf-tips-features.mjs
node scripts/generate-pdf-coverage-features.mjs
node scripts/generate-pdf-course-bridge-features.mjs
node scripts/promote-tribal-to-wiki.mjs --apply
```

The golf hygiene slot will drain the relevant pieces into commits during its next sweep. The 621 wiki entries + 1,711 node/edge augmentations sit on disk and will be picked up by the next `regen-viz` run for system-graph fold-in.

## Related
- [[reference_cad_live_regen_ms0_2026_05_26]] — delta's main current-task work (live-regen MS0)
- [[reference_u_tribal_to_wiki_promote_2026_05_20]] — original `promote-tribal-to-wiki.mjs` ship (echo, 2026-05-20)
- [[feedback_commit_to_slot_worktree]] — why nothing committed from H:/prism in this iter
- [[feedback_obsidian_brain]] — auto-feed pipeline that surfaces this memory back into the vault
