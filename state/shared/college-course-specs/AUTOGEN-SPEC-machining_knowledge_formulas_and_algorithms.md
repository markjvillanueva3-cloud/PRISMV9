# AUTOGEN SPEC — MACHINING KNOWLEDGE FORMULAS AND ALGORITHMS

Generated 2026-05-24T08:00:18.564Z by scripts/auto-college-course-spec-emit.mjs (slot:india).
Advisory + must_human_verify. Lima slot executes this spec to deliver the actual assets.

| Field | Value |
|---|---|
| Course id | `MACHINING KNOWLEDGE FORMULAS AND ALGORITHMS` |
| Slug | `machining_knowledge_formulas_and_algorithms` |
| Kind | `knowledge-pack` |
| Domain | `physics` |
| Source path | `H:\PRISM\resources\MACHINING KNOWLEDGE FORMULAS AND ALGORITHMS` |

## Build targets (auto-derived per kind)

**Engines:** `MachiningKnowledgeFormulaExtractorEngine`

**Algorithms:** `FormulaSymbolNormalizer`, `UnitConversionInferrer`

**Formulas:** `per-handbook-canonical-formula-set`

**Skills:** `/college-extract-formula-handbook`

**Hooks:** `PreToolUse:Read for formula-PDF prefetch`

**Nodes (pointer-memory kinds):** `node_formula_canonical`, `node_handbook`

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
