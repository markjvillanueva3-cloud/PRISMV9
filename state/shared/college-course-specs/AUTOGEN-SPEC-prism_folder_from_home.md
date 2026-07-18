# AUTOGEN SPEC — PRISM FOLDER FROM HOME

Generated 2026-05-24T08:00:15.436Z by scripts/auto-college-course-spec-emit.mjs (slot:india).
Advisory + must_human_verify. Lima slot executes this spec to deliver the actual assets.

| Field | Value |
|---|---|
| Course id | `PRISM FOLDER FROM HOME` |
| Slug | `prism_folder_from_home` |
| Kind | `prism-personal` |
| Domain | `mixed` |
| Source path | `H:\PRISM\resources\PRISM FOLDER FROM HOME` |

## Build targets (auto-derived per kind)

**Engines:** `PersonalNotesExtractorEngine`

**Algorithms:** `MarkdownTopicCluster`

**Formulas:** `per-note-derived-rules`

**Skills:** `/college-extract-personal-notes`

**Hooks:** (none for this kind)

**Nodes (pointer-memory kinds):** `node_personal_note`, `node_topic_cluster`

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
