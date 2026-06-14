---
name: jm-die-tribal-wiki-extraction-starter-2026-05-26
description: "JM DIE/TRIBAL + WIKI book corpus indexed (80 PDFs, 1.1GB) + first 8 easiest books extracted page-by-page; 72 PDFs remaining (~1GB) for next-session continuation"
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.169Z
aliases: reference_jm_die_tribal_wiki_extraction_starter_2026_05_26
---


# JM DIE/TRIBAL + WIKI extraction — starter pass (slot:delta 2026-05-26)

User dropped a path: `H:\PRISM\JM DIE\TRIBAL + WIKI` — 80 CAD/CAM books, 1.1GB, curated by name into "tribal + wiki". User then directed: *"extract everything cad related, turn into wiki and tribal knowledge nodes to be injected in the cad ai systems for training the system"* and *"extract page by page of notable data that will train the system from the easiest input to complex work"*.

## What was newly built

| Surface | Change |
|---|---|
| `H:/prism/scripts/build-cad-cam-resources-pdf-index.mjs` | schema 1.1.0 → **1.2.0**: added `JM_DIE_TRIBAL_WIKI_ROOT` priority walk (own 500-PDF cap) BEFORE the 3K parent JM DIE cap. Without this, TRIBAL + WIKI (alphabetically 20th JM DIE subdir) never reached the index. |
| `classifyJmDie()` in same file | new `top === 'TRIBAL + WIKI'` branch — per-filename classifier: solidworks/fusion-cad/inventor → cad, mastercam/hypermill/inventorcam → cam, cnc/lathe/mill/toolpath/etc → cam, operator/manual → machine, else training. |

## Index outcome

- Index regenerated: **3,935 total PDFs** (was 1,008 with `resources/` alone)
- **80 TRIBAL + WIKI books** now landed: **24 cad · 35 cam · 21 training**
- All-corpus byDomain: training:776 · mfg:1 · cam:164 · catalog:45 · machine:16 · cad:38 · blueprint:2895

## Starter extraction (8 easiest books, page-by-page)

Per user "easy → complex" directive, ran `scripts/pdf-parse-extract.mjs --pages 40 --file ... × 8` on the smallest TRIBAL + WIKI books:

| size | book | priority |
|---|---|---|
| 740KB | Programming Haas CNC Control G-Codes and M-Codes | controller dialect |
| 1.2MB | Using IF and GOTO For a Poor Man's G71 Lathe Roughing Cycle (CNCCookbook) | macro pattern |
| 1.2MB | Mazak Programming Manual for Mazatrol Matrix 3D | controller dialect |
| 1.3MB | Helical Interpolation for Thread Milling, Holes, and Spiral Ramps | toolpath |
| 1.3MB | **The Beginner's Guide to GD&T - Plus Minus Tolerancing** | **closes the iso286-fit-values soul-refuse gap** |
| 1.4MB | One Shot G-Codes and Modal G-Codes | G-code semantics |
| 1.4MB | Why Doesn't My CNC Machine Move the Cutter Where I Told It To (CNCCookbook) | precision/error budget |
| 1.3MB | Helical Interpolation (dup ref — first 8 by size) | toolpath |

Output:
- `H:/prism-slot-whiskey/state/shared/extracted-pdfs/whiskey-milling-oop-2026-05-26.jsonl` — **154 KB** of tribal-tip jsonl appended (the script's WHISKEY-PDF-WIKI-TRIBAL-MS0 ownership, not delta's)
- 8 new `H:/prism-slot-whiskey/knowledge/wiki/lessons/pdf-extract-*.md` files (operator-facing batch-stub quality, conf 0.3, needs_curation:true)

Auto-promotion (`promote-tribal-to-wiki.mjs --apply`) scanned 3,919 candidates, 628 above conf 90 (all pre-existing), **0 new auto-promotions** from this batch — expected: pdf-parse-extract emits at conf 0.3, operator curates above 0.7.

## Why outputs landed in whiskey slot (not delta)

`pdf-parse-extract.mjs` is owned by `WHISKEY-PDF-WIKI-TRIBAL-MS0/U-WPWT-EXTRACT-FALLBACK` (slot:whiskey 2026-05-25). The script's `__dirname` resolves under H:/prism and its OUT paths use repo-root relative pathing — when the H:/prism shared tree's actual content lives in (or junctions to) `H:/prism-slot-whiskey`, that's where the writes land. The data is still correct; just the worktree attribution is whiskey's. Per `feedback_commit_to_slot_worktree`, whiskey owns commit of these new artifacts during its next session, OR golf hygiene drains them.

## Remaining work — 72 PDFs / ~1 GB

Surface as next-session unit `U-JM-DIE-TRIBAL-WIKI-INGEST-COMPLETE`:

| Tier | Range | Count | Strategy |
|---|---|---|---|
| medium | 1.5MB–10MB | ~45 PDFs | next-batch run with `--pages 60` for richer extraction |
| heavy | 10MB–25MB | ~25 PDFs | per-book `--pages 100`; budget ~5 min per book |
| massive | 100MB+ | 2 PDFs (David Planchard SolidWorks 2021 115MB; InventorCAM2024 2.5D 48MB) | chapter-by-chapter extraction; do not extract whole-book in one tick — pdf-parse loads entire PDF into memory |

**The GD&T extraction is the highest-value of this batch** for closing the delta soul refuse around `inline-iso286-fit-values` — once an operator curates that wiki entry above conf 0.7, the iso286 canonical-tables source gap closes.

## Pipeline reuse

All downstream stages already exist:
1. **Extracted** ✓ (this run)
2. **Promoted** — `promote-tribal-to-wiki.mjs --apply` (operator curates conf 0.3 → 0.9+ first)
3. **Wired to graph** — `generate-extracted-pdf-tips-features.mjs` + `generate-pdf-course-bridge-features.mjs` (next regen-viz fold-in)
4. **Embedded** — `embed-wiki-into-tribal-index.mjs` ([[reference_tribal_by_domain_inject|tribal-by-domain-inject]] surfaces on delta-slot prompts thereafter)

## Related

- [[reference_cad_live_regen_ms0_2026_05_26]] — emitter pipeline these books train
- [[reference_pdf_node_wiki_tribal_pipeline_run_2026_05_26]] — prior PDF pipeline run on resources/
- [[reference_free_cad_book_acquisition_catalog_2026_05_26]] — external OER books complement (still pending acquisition)
- [[reference_cad_cam_pdf_extraction_2026_05_26]] — whiskey's original ship of the pdf-parse-extract layer
