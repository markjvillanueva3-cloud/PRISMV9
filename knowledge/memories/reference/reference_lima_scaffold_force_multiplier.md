---
name: reference_lima_scaffold_force_multiplier
description: scripts/scaffold-academy-course.mjs collapses the 4-step manual course wiring (data file + CurriculumEngine import/RICH_MODULES/courseDefinitions + web blueprint) into 1 command.
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.198Z
aliases: reference_lima_scaffold_force_multiplier
---


The highest-leverage academy dev tool (slot:lima). Hand-wiring a new course is a 4-edit ritual that's easy to half-do (the 3-leg-ship trap, [[reference_lima_academy_three_leg_ship]]): write the data file, add the import to CurriculumEngine, add the RICH_MODULES key, add the courseDefinitions entry, add the web blueprint.

`scripts/scaffold-academy-course.mjs` does all of it in one command — emits the data-file stub + wires CurriculumEngine (import + RICH_MODULES + courseDefinitions) + adds the `web/src/data/academy.ts` blueprint. Pilot (PRISM-ACADEMY-FEATURES-MS0): course-43 'Process Validation IQ/OQ/PQ' scaffolded end-to-end in ~30s.

**How to apply:** `node scripts/scaffold-academy-course.mjs --num N --topic "<topic>"` to start ANY new course, then fill the module bodies (with citations + constants.ts links). NEVER hand-wire the 4 steps — it's how courses ship with a missing leg. Present in the slot/lima worktree (not yet in integration — [[reference_lima_branch_drift_academy]]). See [[reference_lima_academy_audits]] for the post-scaffold verification.
