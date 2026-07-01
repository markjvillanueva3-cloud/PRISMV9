---
name: reference_lima_branch_drift_academy
description: slot/lima carries the course-35..60 backend expansion; the integration tree lags (37 wired/15 web blueprints). Never report a course count as fact — read CurriculumEngine.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.643Z
aliases: reference_lima_branch_drift_academy
---


Verified 2026-05-28 via 4-agent inventory. The academy domain has diverged across trees:

- **slot/lima worktree** (where lima commits): ~55 `course-*.ts` data files (through course-60), ~60 `courseDefinitions` wired, `scaffold-academy-course.mjs` + both audit scripts + `CourseCertificate.tsx` present.
- **integration tree `H:/prism`** (cad-fusion-live-ms0): only ~37 wired courses, 15 web `COURSE_BLUEPRINTS`, lacks the scaffold/audit scripts + CourseCertificate.tsx.

The backend course CATALOG runs ahead of CurriculumEngine WIRING which runs ahead of the WEB blueprints — a three-tier lag, compounded by branch divergence. Golf integrates slot branches (slot version wins on add/add merge per [[reference_india_ai_training_galaxy_2026_05_28]]).

**How to apply:** NEVER quote a course count as fact in any doc (per CLAUDE.md "do not hardcode counts"). Run `ls mcp-server/src/data/academy/course-*.ts | wc -l` (catalog) and `grep -c 'id: "course-' CurriculumEngine.ts` (wired) in the tree you're actually in. They differ. The wired set is the shipped set. See [[reference_lima_academy_three_leg_ship]].
