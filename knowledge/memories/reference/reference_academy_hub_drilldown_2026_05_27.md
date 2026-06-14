---
name: reference-academy-hub-drilldown-2026-05-27
description: Authorship note — lima session 92ef25c0 authored the AcademyHub drill-down component (523 lines) + App.tsx route wiring. Per /goal "too much scrolling, can we organize better?". Absorbed into peer commit a7a4e1b4ef (slot:whiskey) via parallel `git add` on shared tree. 3-step flow: Domain → Sub-category chips → Generate Optimized Coursework (Kahn topo-sort over prereq DAG).
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.006Z
aliases: reference_academy_hub_drilldown_2026_05_27
---


# Academy Hub drill-down — authorship note (lima, 2026-05-27)

## Operator prompt

"too much scrolling, can we organize better? allow user to click on major domains
then select sub categories then at the bottom have a big button saying generate
optimized course work so it orders the courses in order."

## What lima built

`mcp-server/web/src/components/learning/AcademyHub.tsx` (523 lines, NEW):

- 5 expandable domain cards (Foundations / Programming / Machining / Optimization /
  Business) — tap to expand, each shows icon + blurb + selected-count badge
- 28 sub-category chips total — each chip has a keyword/domain predicate against
  `Course.title.toLowerCase().includes(...)` and shows live course count
- Sticky bottom action bar with 48pt "Generate Optimized Coursework (N courses)"
  + "Clear" secondary
- Result panel: courses ordered by Kahn's algorithm topo-sort over the
  `prerequisites: string[]` DAG. Numbered 1..N, L0→L3 tiebreak, total hours,
  deep-link to /learning/academy/:courseId
- Cycle detection: cycle members fall to the end with amber banner
- Missing-prereq warning: course's prereq is in ALL_COURSES but not in selection
  → flag so user can add it

`mcp-server/web/src/App.tsx` (EDIT):
- lazyNamed `AcademyHub` import added at line 125
- `/learning/academy` → `AcademyHub` (replaces `CourseCatalog`)
- `/learning/academy/all` → `CourseCatalog` (legacy flat catalog preserved for
  power users)
- `/learning/academy/:courseId` unchanged

## Sub-category taxonomy (28 chips)

| Domain | Sub-categories |
|---|---|
| Foundations | Onboarding & Safety · Print/GD&T · G-Code Basics · All Foundations |
| Programming | CAD · CAM · 5-Axis · Post-Processors · Complex Geometry · All Programming |
| Machining | Mill · Lathe · EDM · Hard Machining · JM Fleet · Chip Control · All Machining |
| Optimization | Speed/Feed · Tooling · Workholding · FEA · Cycle Time · All Optimization |
| Business | Quoting · Accounting · Lean/Sigma · QC · Logistics · All Business |

## Git capture

Both files absorbed into commit `a7a4e1b4ef` (slot:whiskey iter317) via parallel
`git add` on shared tree H:/prism. Same absorption pattern as the earlier
`56930728f5` (echo) and `b644804e48` (lima — committed before peers caught up).

Per [[feedback_commit_to_slot_worktree]]: shared-tree work is vulnerable to
peer-commit absorption. Functionally fine — code is on disk + in git history.
Future infra work of this kind should still attempt slot-worktree where
possible to preserve attribution; doing it on shared-tree is justified when
the artifact is [MAIN]-level (App.tsx routing, public/ deploy assets, vite
config) rather than slot-lima curriculum content.

## How the apprentice arc completes

Earlier this session:
- `4ec78cc987` — phone infra (dev-seed, cloudflared tunnel, vercel.json,
  Playwright smoke, onboarding doc)
- `b644804e48` — per-employee curriculum tracks + 3-card dev-seed picker
- `56930728f5` (absorbed) — video embed + 27 YouTube picks + route fix

This commit (absorbed into `a7a4e1b4ef`) closes:
- Cognitive-overload bug: 60+ flat courses → 3-step drill-down
- Pedagogy bug: hand-picked courses had no enforced prereq order →
  Kahn topo-sort guarantees it

Net effect: Justin opens his phone → taps Justin card on dev-seed → lands
in /learning/academy → sees 5 big domain cards → expands "Foundations" →
taps "Onboarding & Safety" chip → taps "Generate Optimized Coursework" →
gets course-0a → course-0b → course-0c in prereq order → starts course-0a.

## R12 honest deferrals
- Sub-category predicates are keyword-based. Robust to course renames but a
  `tags: string[]` field on CourseBlueprint would be cleaner. Tracked as
  `U-ACADEMY-TAG-METADATA`.
- No "save my picks" persistence — every visit starts fresh. Tracked as
  `U-ACADEMY-PICKS-PERSIST` (save selectedSubIds to
  `prism_academy_track:<userId>` via the existing per-employee storage
  convention).
- Per-employee tracks from `employee-tracks.ts` not yet auto-selected — Justin
  picks his own sub-categories rather than seeing his pre-defined 16-course
  track. Tracked as `U-ACADEMY-TRACK-AUTOSELECT`.
