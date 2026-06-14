# AUTOGEN SPEC — MIT COURSES/10.34-fall-2015/static_resources/a3a66b7e9154e9f4de4095680e33ecf2_txKXRtlrFfI.pdf

Generated 2026-05-24T07:54:28.979Z by scripts/auto-college-course-spec-emit.mjs (slot:india).
Advisory + must_human_verify. Lima slot executes this spec to deliver the actual assets.

| Field | Value |
|---|---|
| Course id | `MIT COURSES/10.34-fall-2015/static_resources/a3a66b7e9154e9f4de4095680e33ecf2_txKXRtlrFfI.pdf` |
| Slug | `pdf-resources-mit_courses_10_34_fall_2015_static_resources_a3a66b7e9154e9f4de4095680e33ecf2_tx` |
| Kind | `handbook-pdfs` |
| Domain | `reference` |
| Source path | `H:\PRISM\resources\MIT COURSES\10.34-fall-2015\static_resources\a3a66b7e9154e9f4de4095680e33ecf2_txKXRtlrFfI.pdf` |

## Build targets (auto-derived per kind)

**Engines:** `HandbookPdfExtractorEngine`

**Algorithms:** `PdfTableExtractor`, `FigureToTribalTip`

**Formulas:** `per-handbook-table-set`

**Skills:** `/college-extract-handbook-pdf`

**Hooks:** `PreToolUse:Read /pdf-learn auto-route`

**Nodes (pointer-memory kinds):** `node_handbook`, `node_pdf_table`, `node_figure`

## Lima execution loop

```bash
# 1. live-extract this course (Playwright/WebFetch/PDF-OCR per kind)
node H:/prism/scripts/mit-extracted-node-emitter.mjs   # for mit-ocw kinds
# 2. wire formulas into named engines (build, not stub)
# 3. wire skills + hooks as slash commands + settings.json entries
# 4. re-run coverage audit to flip stuck->fully-wired
node H:/prism/scripts/mit-pipeline-coverage-audit.mjs
```

## PSN synergy targets

- **System Viz** — node pointers auto-indexed on next /system-viz regen
- **Obsidian** — memory files auto-fed on Stop
- **Wiki** — per-course wiki entry under knowledge/wiki/architecture/courses/
- **Tribal index** — Consuming engines row links to formula consumers
- **PRISM Academy UI (lima PWA)** — node_course + node_formula render as course cards
- **AI training data** — prism_ai:ai_resource_training_data consumes node pointers

Related: [[reference_mit_2_830_ewma_formula_engine_triplet_2026_05_23]] · [[reference_mit_ocw_resolver_joint_course_slug_bug_2026_05_23]] · `state/shared/MIT-PIPELINE-COVERAGE-2026-05-23.md`
