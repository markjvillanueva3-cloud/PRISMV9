---
title: College-Course AUTOGEN Specs
description: Auto-spec generator + execution-loop skill + system-viz roost for all college/training courses under H:/PRISM/resources.
slot: india
date: 2026-05-24
related:
  - mit-course-triplet-index-2026-05-23
  - mit-pipeline-coverage-2026-05-23
  - reference_mit_ocw_resolver_joint_course_slug_bug_2026_05_23
  - knowledge-conversion-ms0
  - reference_misc_tasks_extraction_2026_05_16
---

# College-Course AUTOGEN Specs

PSN-incorporated execution queue for every college/training course discoverable
under `H:/PRISM/resources`. Generator walks the resource tree, emits per-course
build blueprints, registers each course as a `college-course` ghost node in
`/system-viz`, and exposes a `/college-extract <slug>` skill that drives the
per-course execution loop (live extract → wire engines/formulas → emit pointer
nodes → re-run coverage audit).

## Shipped 2026-05-24 (slot:india, U-MIT-COLLEGE-AUTOGEN-SPECS, commit `fa0c809c1c`)

| Artifact | Path | Purpose |
|---|---|---|
| Generator | `scripts/auto-college-course-spec-emit.mjs` | Walks resources, emits 96 AUTOGEN-SPEC.md + master index |
| Specs | `state/shared/college-course-specs/AUTOGEN-SPEC-<slug>.md` | One spec per course (89 mit-ocw + 3 basic-training + 1 each prism-training, prism-personal, knowledge-pack, handbook-pdfs) |
| Index | `state/shared/COLLEGE-COURSE-AUTOGEN-INDEX-2026-05-24.md` | Master per-course table + by-kind summary |
| Skill | `.claude/commands/college-extract.md` (on-disk, gitignored) | `/college-extract <slug>` execution-loop skill |
| Viz augmentation | `scripts/generate-college-course-features.mjs` + `state/shared/system-viz/college-course-augmentation.json` | Emits `ghost.college_courses` roost + 96 child nodes for /system-viz |
| Viz registration | `scripts/regen-viz.mjs` FAST[] + `scripts/merge-augmentations.mjs` splice | Auto-includes the roost in every /system-viz rebuild |
| Tests | `scripts/generate-college-course-features.test.mjs` | 12/12 PASS (parseSpec, generate, readSpecsDir, edge cases) |

## Why advisory (not auto-build)

PRISM enforces COMPREHENSIVE-BUILD via `comprehensive-build-enforce` hook —
stub engines are blocked at the file-write boundary. The auto-spec generator
therefore emits **blueprints**, not auto-builds: each AUTOGEN-SPEC.md declares
the engines/algorithms/formulas/skills/hooks/nodes lima should generate, but
the actual building runs through `/college-extract <slug>` which does real
live extraction + real formula porting + real test scaffolding.

Each spec carries `Advisory + must_human_verify` in its header so downstream
consumers (lima, AI training-data registration, Prism App rendering) know
to treat the asset list as a recipe, not a manifest of shipped things.

## PSN synergization map

Per `feedback_psn_definition` (11 legs), here is how the AUTOGEN-SPEC inventory
threads through PSN:

| PSN leg | Wire mechanism | Status |
|---|---|---|
| **Obsidian brain** | `reference_college_course_autogen_specs_2026_05_24.md` memory file (auto-fed every Stop by `stop-obsidian-memory-feed.mjs`) | ✅ live |
| **PRISM OS** | `prism_operating_system` future action `os_college_course_list` (deferred — needs dispatcher edit, golf only) | 📝 lima follow-up |
| **Wiki** | `knowledge/wiki/architecture/college-course-autogen-specs.md` (this entry) + per-course entries under `knowledge/wiki/architecture/courses/<slug>.md` | ✅ live |
| **Memories** | One memory per course extraction (`reference_<slug>_live_extracted_<date>.md`), written by `/college-extract` step 10 | 📝 lima emits per-course |
| **Tribal** | Course formulas → `KnowledgeTip[]` via Knowledge-Conversion-MS0 pipeline (lane A direct-wire) | 📝 lima emits per-course |
| **System Viz** | `ghost.college_courses` roost (L8) + 96 `college-course` children (L9) — emitted by `generate-college-course-features.mjs` | ✅ live (this commit) |
| **Engines** | Per-spec named engines; built by lima via `/college-extract` (NOT stubbed) | 📝 lima builds on demand |
| **Algorithms** | Per-spec named algorithms (e.g. EWMA controller for MIT 2.830) | 📝 lima builds on demand |
| **Formulas** | Per-spec named formula sets ported to `src/physics/constants.ts` or per-engine methods | 📝 lima builds on demand |
| **NN/GNN** | Course nodes feed `node-embeddings-768d.jsonl` via GraphSAGE bridge — once present in graph, GNN tier-5 auto-classifies | 📝 next nn-graph retrain auto-picks up |
| **PRISM AI** | `prism_ai:ai_resource_training_data` consumes `state/shared/college-course-specs/` as a training source | 📝 needs lima action wire |

## Prism App integration

- **Course cards** — `lima PWA` renders one card per `ghost.college_courses` child via the existing system-viz reader.
- **Per-course detail page** — clicking a card opens the AUTOGEN-SPEC.md + live-extracted wiki entry side-by-side.
- **Execution status** — green if `## Live extraction` section exists; amber if scaffolded; red if blocked.
- **Search facets** — by `kind` (mit-ocw / basic-training / knowledge-pack / handbook-pdfs / prism-training / prism-personal) and `domain` (academic / shop-floor / physics / reference / mixed / cad-cam).

## Replay

```bash
# 1. Re-emit specs (idempotent — overwrites existing)
node H:/prism/scripts/auto-college-course-spec-emit.mjs

# 2. Re-emit viz augmentation (idempotent — same input → same output)
node H:/prism/scripts/generate-college-course-features.mjs

# 3. Re-run viz (folds the augmentation into system-graph.json)
node H:/prism/scripts/regen-viz.mjs --full

# 4. Execute one course end-to-end
# /college-extract mit-2_830j_spring_2008
```

## See also

- [[mit-course-triplet-index-2026-05-23]] — first triplet shipped (MIT 2.830 EWMA)
- [[mit-pipeline-coverage-2026-05-23]] — per-course coverage matrix (8-axis)
- [[knowledge-conversion-ms0]] — 3-lane conversion model (direct-wire / port-verify / forge-queue)
- [[reference_misc_tasks_extraction_2026_05_16]] — sibling pattern (auto-extract → system-viz roost)
- [[checkin-loop-fullstack]] — `/checkin-<nato> /loop` contract that drives all of this
