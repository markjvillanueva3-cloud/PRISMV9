# AUTOGEN SPEC — JM DIE/CNC LATHE/JHON/upset , 2 SPEAD DRILLS ENMILL BORRING BAR 870 THEN 875 ON X

Generated 2026-05-24T08:05:27.716Z by scripts/auto-college-course-spec-emit.mjs (slot:india).
Advisory + must_human_verify. Lima slot executes this spec to deliver the actual assets.

| Field | Value |
|---|---|
| Course id | `JM DIE/CNC LATHE/JHON/upset , 2 SPEAD DRILLS ENMILL BORRING BAR 870 THEN 875 ON X` |
| Slug | `jm-die-cnc_lathe_jhon_upset_2_spead_drills_enmill_borring_bar_870_then_875_on_x` |
| Kind | `prism-training` |
| Domain | `shop-floor` |
| Source path | `H:\PRISM\JM DIE\CNC LATHE\JHON\upset , 2 SPEAD DRILLS ENMILL BORRING BAR 870 THEN 875 ON X` |

## Build targets (auto-derived per kind)

**Engines:** `PrismTrainingModuleParserEngine`, `PrismTutorialStepExtractorEngine`

**Algorithms:** `StepSequenceExtractor`, `ScreenshotCaptionMatcher`

**Formulas:** `per-tutorial-procedure-set`

**Skills:** `/college-extract-prism-training-<slug>`

**Hooks:** `PostToolUse:Write to log training-step completions`

**Nodes (pointer-memory kinds):** `node_training_module`, `node_training_step`, `node_screenshot`

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
