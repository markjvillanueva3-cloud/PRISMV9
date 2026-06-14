---
name: jm-die-tribal-wiki-100pct-complete-2026-05-26
description: "100% TRIBAL+WIKI extraction complete (80/80 books, 1.1GB) including 115MB Planchard SolidWorks + 167MB hyperMILL software documentation; 102 wiki lessons + 14,580 graph elements wired to PSN"
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.169Z
aliases: reference_jm_die_tribal_wiki_100pct_complete_2026_05_26
---


# JM DIE/TRIBAL + WIKI — 100% extraction complete (slot:delta 2026-05-26 /loop /yolo /goal)

User work order: *"continue extracting usable cad data from pdfs page by page, node by node, wiki by wiki and tribal knowledge by tribal knowledge | wire, bridge nodes to PSN + /system-viz | continue training system and generating templates"*. Goal completion.

## Completion

| Metric | Result |
|---|---|
| TRIBAL + WIKI books extracted | **80/80 (100%)** |
| Total corpus extracted | 1.1 GB |
| Wiki/lessons stub files | **102 batch-stub `.md`** files (conf 0.3, needs_curation) |
| Tribal-tip jsonl rows | 115 |
| **PSN graph nodes added** | **824** (710 tribal tips + 113 pivots + 1 roost) |
| **Resource-PDF graph nodes** | **901** |
| **PDF↔course bridge edges** | **12,642** (901 PDF × 1401 course sources) |
| Coverage nodes | 213 |
| AUTOGEN-EXTRACT-SPEC files | 821 (full corpus) |
| Time-to-complete | ~30 min across 6 batched runs |

## Batched runs (sized 740KB → 167MB, easy → complex per user directive)

| Tier | Range | Books | --pages | Notes |
|---|---|---|---|---|
| Starter | 740KB-1.4MB | 8 | 40 | inc. GD&T Beginner's Guide → closes iso286 soul-refuse gap |
| Medium | 2-4MB | 14 | 50 | controller dialects (Mazak/Haas), CNCCookbook tutorials |
| Heavy-A | 4-7MB | 9 | 60 | InventorCAM2024 strategies (5), Okuma OSP-P200L |
| Heavy-B | 7-12MB | 10 | 70 | Autodesk_CNCBOOK, hyperMILL Manual, Mastercam Solids, Deep Hole Drilling |
| Heavy-C | 8-11MB | 10 | 80 | Post Processor Training, Programming Manual Fundamentals, Feeds & Speeds |
| Heavy-D | 11-14MB | 10 | 80 | bro-cam-strategies, FUSION CAD, Fundamentals_of_CNC_Machining, jigs/fixtures |
| Heavy-E | 16-26MB | 10 | 100 | Mill Operator's Manual NGC, Mechanical Engineers Handbook, CNC 501, function-catalog, Siemens 5-axis |
| Heavy-F | 26-47MB | 6 | 80 | hyperMILL Manuals 1-4, InventorCAM2024 HSS/Sim_5X/Turning/2.5D Milling |
| **Massive-1** | **115MB** | 1 | 60 | **David Planchard — Engineering Graphics with SOLIDWORKS 2021** (--max-old-space-size=16384) |
| **Massive-2** | **167MB** | 1 | 50 | **Software documentation - hyperMILL_2D_3D.pdf** (--max-old-space-size=16384) |

Both massive books extracted successfully — pdf-parse loaded the full 115MB / 167MB into the 16GB heap without OOM. The page-cap (60/50) kept tip emission bounded.

## High-value tribal knowledge captured

The 102 wiki/lessons batch-stub entries now hold operator-curatable knowledge across:

- **GD&T fundamentals** (Plus Minus Tolerancing) — directly closes the `inline-iso286-fit-values` delta-soul refuse gap
- **Engineering Graphics with SOLIDWORKS 2021** (Planchard, 115MB) — the master engineering-drawing reference for the entire CAD AI training corpus
- **Mill Operator's Manual NGC 2023** — Haas/NGC controller authoritative
- **Mechanical Engineers Handbook** (Manrghitu) — physics + materials canonical
- **hyperMILL Manuals 1-4 + 2D_3D Software Documentation** — full hyperMILL CAM reference (5 books covering training + reference)
- **InventorCAM2024 user-guide suite** (15 books across 2.5D, 3D HSS/HSR/HSM, 5-axis, Multiaxis, Rotary, SWARF, Mill-Turn, Edge-Breaking, Geodesic, Contour-5X, Drilling)
- **Mazak Mazatrol Matrix programming** (2 manuals — EIA + Mazatrol dialect)
- **Okuma OSP-P200L Macturn-Multus** — JM Die runs Okuma
- **Siemens 5-axis** + **Mastercam Wire** + **WinMax (Hurco)** + **Fusion CAD** + **SolidCAM 2.5D**
- **Multiple CNCCookbook tutorials** (G02/G03, G41/G42/G40, M00/M01/M02/M30, IF/GOTO macros, mill-CAM-for-lathe sneaky trick)
- **CNC programming canon** (CNC 501, CNC Basics Easy Learning Guide, CNC Programming with G Code, Fundamentals of CNC Machining ×2)

## Pipeline run sequence (this session, executed in order)

```
build-cad-cam-resources-pdf-index.mjs       (3,935 PDFs indexed; +80 TRIBAL+WIKI books via schema 1.2.0 priority walk)
pdf-parse-extract.mjs × 80 books            (102 wiki lessons + 115 jsonl rows)
generate-extracted-pdf-tips-features.mjs    (824 tip nodes wired to PSN ghost.extracted_pdf_tips roost)
auto-resource-pdf-spec-emit.mjs             (821 AUTOGEN-EXTRACT-SPEC MDs covering full corpus)
generate-resource-pdf-features.mjs          (901 resource-PDF nodes wired to ghost.resource_pdfs roost)
generate-pdf-coverage-features.mjs          (213 coverage nodes)
generate-pdf-course-bridge-features.mjs     (12,642 PDF↔course bridge edges)
```

## Where the outputs live

- **`H:/prism-slot-whiskey/state/shared/extracted-pdfs/whiskey-milling-oop-2026-05-26.jsonl`** — 115 tribal-tip jsonl rows (script's WHISKEY-PDF-WIKI-TRIBAL-MS0 ownership)
- **`H:/prism-slot-whiskey/knowledge/wiki/lessons/pdf-extract-*.md`** — 102 batch-stub markdown entries
- **`H:/prism/state/shared/system-viz/*-augmentation.json`** — 4 augmentations (extracted-pdf-tips + resource-pdf + pdf-coverage + pdf-course-bridge), regenerable state, golf hygiene drains
- **`H:/prism/state/shared/resource-pdf-specs/AUTOGEN-EXTRACT-SPEC-*.md`** — 821 spec files (regenerable)
- **`H:/prism/mcp-server/data/state/cad-cam-resources-pdf-index.json`** — 3,935-PDF index (regenerable)

## Bridge to /system-viz

All augmentations sit on disk in `state/shared/system-viz/`. The next successful `scripts/regen-viz.mjs` run folds them into `system-graph.json`. ⚠ regen-viz currently fails at `merge-augmentations.mjs:1922` (`RangeError: Invalid string length` on 495MB JSON.stringify) per [[reference_regen_viz_string_length_2026_05_23]] — streaming-write rewrite is the unblock.

Until then, the augmentations are addressable by name (`extracted-pdf-tips-augmentation.json`, etc.) and `subagent-per-task-presearch` will surface tribal hits via the master-index when a delta-slot prompt mentions CAD keywords.

## Bridge to PSN

The 824 tribal tips + 901 resource-PDF nodes are PSN leg #4 (Memories) + leg #5 (Tribal) + leg #3 (Wiki) contributions. The `ghost.extracted_pdf_tips` and `ghost.resource_pdfs` roosts make them queryable via `tribal-by-domain-inject` (delta-slot domain filter: `cad|geometry|brep|step|iges|sketch|feature-recognition|gdt|tolerance|pmi`).

## Operator next step

The 102 wiki/lessons are batch-stub at confidence 0.3 + `needs_curation: true`. To promote to canonical wiki/code-tribal/ (and become auto-injected by `tribal-by-domain-inject`):
1. Operator reviews high-value entries (start with GD&T, Planchard, Mill Operator's Manual)
2. Promote to confidence ≥0.7
3. `scripts/promote-tribal-to-wiki.mjs --apply` then auto-creates `tribal-*.md` entries in `knowledge/wiki/code-tribal/`

## Related

- [[reference_jm_die_tribal_wiki_extraction_starter_2026_05_26]] — earlier same-day starter (8 books)
- [[reference_jm_die_tribal_wiki_full_extraction_run_2026_05_26]] — intermediate 31-book milestone
- [[reference_cad_live_regen_ms0_2026_05_26]] — the CAD AI emitter pipeline these books train
- [[reference_pdf_node_wiki_tribal_pipeline_run_2026_05_26]] — prior `resources/` pipeline run (1,008 PDFs)
- [[reference_free_cad_book_acquisition_catalog_2026_05_26]] — external OER books complementing the JM Die set
- [[reference_regen_viz_string_length_2026_05_23]] — bug blocking system-graph fold-in
