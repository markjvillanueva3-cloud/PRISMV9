# AUTOGEN EXTRACT SPEC — RESOURCE PDFS/InventorCAM2024_Geodesic_Machining.pdf

Generated 2026-05-24T20:49:59.297Z by scripts/auto-resource-pdf-spec-emit.mjs (slot:india).
Advisory + must_human_verify. /pdf-learn executes this spec to deliver the actual extracted assets.

| Field | Value |
|---|---|
| PDF id | `RESOURCE PDFS/InventorCAM2024_Geodesic_Machining.pdf` |
| Slug | `resource_pdfs_inventorcam2024_geodesic_machining_pdf` |
| Kind | `machining-handbook` |
| Source path | `H:\PRISM\resources\RESOURCE PDFS\InventorCAM2024_Geodesic_Machining.pdf` |
| Size | 5.2 MB |

## Build targets (auto-derived per kind)

**Engines:** `PdfMachiningHandbookExtractorEngine`

**Formulas:** `per-handbook-formula-set (Kienzle, Taylor, surface-finish, deflection)`

**Nodes (pointer-memory kinds):** `node_formula_handbook`, `node_tip_handbook`, `node_concept_handbook`

**Tribal tips target:** 30 (Knowledge-Conversion-MS0 lane A direct-wire)

## /pdf-learn execution loop

```bash
# 1. Extract PDF text (pdfjs / pdftotext fallback)
# 2. Run /pdf-learn pipeline — tribal tips, formulas, citations
# 3. Emit per-formula + per-tip + per-concept memory nodes
# 4. Update wiki entry under knowledge/wiki/architecture/pdf-extracts/<slug>.md
# 5. Bridge nodes to existing engines via system-viz augmentation
```

## PSN synergy targets

- **Tribal** — extracted tips flow to KnowledgeTip[] via Knowledge-Conversion-MS0 lane A
- **Wiki** — per-PDF wiki entry under knowledge/wiki/architecture/pdf-extracts/
- **Memories** — per-formula / per-tip / per-concept pointer-memory files (Obsidian auto-mirror)
- **System Viz** — pdf-extract.<slug> child node under ghost.resource_pdfs roost
- **Engines** — extracted formulas wired to the named Engine (NOT stubbed — PRISM blocks placeholders)
- **PRISM AI** — prism_ai:ai_resource_training_data consumes this spec dir

Related: [[reference_college_course_autogen_specs_2026_05_24]] · [[knowledge-conversion-ms0]]
