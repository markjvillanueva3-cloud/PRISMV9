---
name: reference_lima_academy_three_leg_ship
description: A PRISM Academy course ships only with 3 legs — data file + CurriculumEngine wiring + web blueprint. A data file alone is invisible.
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.195Z
aliases: reference_lima_academy_three_leg_ship
---


The #1 academy (slot:lima) trap: writing `mcp-server/src/data/academy/course-N-<topic>.ts` and declaring the course shipped. It is NOT shipped. A course is SHIPPED only when all THREE legs exist:

1. **Data** — `mcp-server/src/data/academy/course-N-<topic>.ts` with modules.
2. **Wiring** — imported into `CurriculumEngine.ts`: `import { COURSE_N_MODULES }` + a `RICH_MODULES["course-N"]` key + a `courseDefinitions` entry.
3. **Visibility** — a `web/src/data/academy.ts` `COURSE_BLUEPRINTS` entry so the web `/learning/academy` + apprentice phone can render it.

A data file with no wiring + no blueprint is dead weight — invisible to learners and to `academy_courses`.

**How to apply:** Use `scripts/scaffold-academy-course.mjs --num N --topic "<t>"` which emits all 3 legs in one command. Before reporting a course done, verify: `grep -c 'id: "course-N"' CurriculumEngine.ts` (≥1) AND the blueprint exists in `web/src/data/academy.ts`. Encoded in the lima soul refuse #6. See [[reference_lima_scaffold_force_multiplier]], [[reference_lima_branch_drift_academy]].
