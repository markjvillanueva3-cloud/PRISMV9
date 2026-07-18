---
name: jm-die-tribal-wiki-full-extraction-run-2026-05-26
description: "23 TRIBAL+WIKI books extracted page-by-page; 710 tribal-tip + 901 resource-PDF + 213 coverage graph nodes; 12,642 bridge edges; 99 wiki/lessons stubs; PSN-wired and /system-viz augmentation-ready"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.627Z
aliases: reference_jm_die_tribal_wiki_full_extraction_run_2026_05_26
---


# JM DIE/TRIBAL + WIKI full extraction run (slot:delta 2026-05-26 /loop /yolo /goal)

User work order: *"continue extracting usable cad data from pdfs page by page, node by node, wiki by wiki and tribal knowledge by tribal knowledge | wire, bridge nodes to PSN + /system-viz | continue training system and generating templates"*.

## Extraction inventory

| Tier | Range | Books | Method |
|---|---|---|---|
| Starter | 740KB-1.4MB | 8 | `pdf-parse-extract.mjs --pages 40` |
| Medium | 2-4MB | 14 | `pdf-parse-extract.mjs --pages 50` |
| Heavy | 4-7MB | 9 | `pdf-parse-extract.mjs --pages 60` |
| **Total this run** | | **31 books** | |

Output target: `H:/prism-slot-whiskey/` (script ownership = WHISKEY-PDF-WIKI-TRIBAL-MS0)
- `state/shared/extracted-pdfs/whiskey-milling-oop-2026-05-26.jsonl` — 108 tribal-tip jsonl rows
- `knowledge/wiki/lessons/pdf-extract-*.md` — 99 batch-stub wiki entries (conf 0.3, needs_curation)

## PSN + /system-viz wiring (graph augmentations regenerated)

| Augmentation | Path | Nodes | Note |
|---|---|---|---|
| `extracted-pdf-tips-augmentation.json` | state/shared/system-viz/ | **710 tribal tips + 113 pivots + 1 roost = 824** | +217 new tribal tips vs prior |
| `resource-pdf-augmentation.json` | state/shared/system-viz/ | **901 PDF nodes + 1 roost** | +8 new (was 893) |
| `pdf-coverage-augmentation.json` | state/shared/system-viz/ | 213 | 210 extracted, 0 pending |
| `pdf-course-bridge-augmentation.json` | state/shared/system-viz/ | **12,642 PDF↔course edges** | 893 PDF × 1,401 course sources |

Also: `auto-resource-pdf-spec-emit.mjs` emitted **821 AUTOGEN-EXTRACT-SPEC-*.md** files (all CAD/CAM PDFs across the corpus). These are consumed by `generate-resource-pdf-features.mjs` to build per-book graph nodes.

## Pipeline run order (in this session)

```
1. build-cad-cam-resources-pdf-index.mjs      → 3,935 PDFs indexed (was 1,008)
2. pdf-parse-extract.mjs × 31 books           → 99 wiki/lessons + 108 jsonl rows
3. generate-extracted-pdf-tips-features.mjs   → 824 graph nodes
4. generate-pdf-coverage-features.mjs         → 213 nodes
5. generate-pdf-course-bridge-features.mjs    → 12,642 edges
6. auto-resource-pdf-spec-emit.mjs            → 821 spec MDs
7. generate-resource-pdf-features.mjs         → 901 resource-PDF nodes
```

All augmentations land in `state/shared/system-viz/` and will be folded into `system-graph.json` on the next successful `regen-viz.mjs` run. ⚠ regen-viz currently fails at `merge-augmentations.mjs:1922` (`RangeError: Invalid string length` on 495MB JSON.stringify) per the 2026-05-23 regression memory — until that's fixed via streaming-write rewrite, the augmentations sit on disk uncommitted-to-system-graph.

## Highest-value tribal knowledge captured

The starter 8 included **"The Beginner's Guide to GD&T - Plus Minus Tolerancing"** — page-by-page extraction now sits at `H:/prism-slot-whiskey/knowledge/wiki/lessons/pdf-extract-the-beginner-s-guide-to-gd-t-plus-minus-tolerancing.md`. Operator curation above conf 0.7 promotes this into the canonical wiki/code-tribal/ namespace, closing the `inline-iso286-fit-values` soul-refuse gap.

Other high-value captures:
- Programming Haas G/M-codes (controller dialect)
- 2× Mazak Mazatrol Matrix programming manuals (controller dialect)
- 5× InventorCAM2024 user guides (Geodesic/Multiaxis/Multiaxis-Drilling/Pro3D-HSM/Contour-5X/Rotary) — CAM strategy reference
- Multiple CNCCookbook tutorials (G02/G03 arc, G41/G42/G40 tool compensation, IF/GOTO macros)
- WinMax (Hurco) mill intro workbook
- Mastercam Wire tutorial (closes a WEDM gap)
- OSP-P200L Macturn-Multus operation manual (Okuma controller — JM Die uses Okuma)

## Remaining work — 49 PDFs (~880 MB)

| Tier | Range | Count | Recommendation |
|---|---|---|---|
| Larger-medium | 7-10MB | ~12 | Next-batch `--pages 70` |
| Heavy | 10-25MB | ~25 | Per-book `--pages 100`; ~3-5 min per book |
| Mid-large | 25-50MB | ~10 | Chapter-by-chapter; ~10 min per book |
| Massive | 50-115MB | 2 (David Planchard SolidWorks 2021 = 115MB, InventorCAM2024 2.5D = 48MB) | Forced chapter-by-chapter — pdf-parse-extract loads the whole PDF into RAM and 115MB will OOM at the 16GB heap |

Next-session unit: `U-JM-DIE-TRIBAL-WIKI-FINISH-49-REMAINING`.

## Commit posture

- `scripts/build-cad-cam-resources-pdf-index.mjs` schema 1.2.0 change: committed on `cad-fusion-live-ms0` shared tree at the previous turn (`U-IDX-JM-DIE-TRIBAL-WIKI-PRIORITY-WALK`).
- Augmentation JSONs in `state/shared/system-viz/`: regenerable state — golf hygiene drains.
- Wiki lessons + tribal jsonl in `H:/prism-slot-whiskey/`: whiskey owns the commit (its slot, its worktree).

## Related

- [[reference_jm_die_tribal_wiki_extraction_starter_2026_05_26]] — earlier in this same session, 8-book starter
- [[reference_pdf_node_wiki_tribal_pipeline_run_2026_05_26]] — prior resources/ pipeline run
- [[reference_cad_live_regen_ms0_2026_05_26]] — the CAD AI emitter pipeline these books train
- [[reference_regen_viz_string_length_2026_05_23]] — the merge-augmentations bug blocking system-graph fold-in
