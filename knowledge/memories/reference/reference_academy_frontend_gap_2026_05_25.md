---
name: reference-academy-frontend-gap-2026-05-25
description: Academy frontend page does NOT exist + course Quiz shape mismatches between backend (permissive) and web (strict SourceModule Quiz type). 22+ course files would fail web tsc; backend tests pass 40/40 because backend Module type is more permissive. Discovered during lima iter41 (2026-05-25) attempt to wire courses 13-34 into web/src/data/academy.ts.
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.006Z
aliases: reference_academy_frontend_gap_2026_05_25
---


# Academy Frontend Gap (discovered 2026-05-25 lima iter41)

## What's built
- **Backend** (`mcp-server/src/data/academy/course-*.ts` + `CurriculumEngine.ts`): courses 0a/0b/0c/1-34 all wired into `RICH_MODULES` + `courseDefinitions`. 40/40 tests PASS.
- **Web blueprints** (`mcp-server/web/src/data/academy.ts`): ONLY courses 0a-12 + course-13-end-of-12 file imports. NO blueprints for course-13-34.
- **Web pages**: NO `AcademyPage.tsx` or similar consumer. No surface that renders the academy course catalog.

## What blocks wiring courses 13-34 into web/data/academy.ts
The web `SourceModule` interface expects `quiz: Quiz = { id, moduleId, questions, passingScore }`. But course-17, course-19, course-20, course-21, course-22 (and likely more) define `quiz: [{id, type, prompt, options, correctIndex, explanation, topicTags}, ...]` — an array of questions directly, not wrapped in a Quiz object.

Backend Module type is permissive (accepts either shape) so the backend tests pass. The web tsc surfaces 50+ TS2739 errors when those course files are transitively included via web/data/academy.ts.

Additional course-17 errors (`(117,23)` and `(262,23/57)`): `string` where `number` expected — separate field-type mismatch.

## Two paths for the next lima iter

### Path A — Lift the web blueprints anyway via cast (lower-friction)
The existing `sourceModules: COURSE_X_MODULES as SourceModule[]` pattern already does a type-assertion cast. But this DOES NOT suppress errors in the imported course .ts files themselves (tsc still type-checks them when their imports cross the web build's project boundary). Real fix needs:
- Either: web/tsconfig.json excludes `../src/data/academy/**` from its include (treat them as runtime-only loaded modules)
- Or: course-17/19-22+ files restructured to wrap question arrays in `{id, moduleId, questions, passingScore}` shape

### Path B — Build the Academy page first (higher-leverage)
The fact that no AcademyPage.tsx exists means even courses 0a-12 are wired but not visible. Build a mobile-first Academy page (Calculator Studio aesthetic per web/CLAUDE.md):
- Top: program selector (foundations / operator-core / programming-master / leadership)
- Middle: course-card grid (collapses to single-column on <600px per web/CLAUDE.md mobile rules)
- Card: title + icon + prereq chips + duration + L0/L1/L2/L3 badge
- Click → CourseDetailPage with lesson list + visual content (`<diagram>` blocks rendered as inline SVG; `<calculator>` blocks → embed Calculator Studio iframe; `<sandbox>` → CodeMirror or Monaco editor)
- Visual learning: render the ASCII force-vector diagrams in course-29-34 as `<pre>` blocks WITH a Mermaid/SVG re-render where possible
- Mobile gates: 44pt tap targets · `<MobileSafeArea>` wrapper · responsive at 5 viewports (375/390/412/768/1024 per web/CLAUDE.md)

Recommend: Path B first (renders something for the user), then Path A in parallel for the missing 13-34 blueprints.

## Iter41 cumulative state
- Backend: courses 0a/0b/0c/1-34 (16 courses 18-34 shipped this lima session iter25-iter41)
- Backend tests: 40/40 PASS (22 CurriculumEngine + 18 TrainingScheduler)
- Web: 0a-12 visible-but-no-page; 13-34 not in web blueprints
- Stop-hook /goal "ui/ux user friendly for phone and pc" + "interactivity + visual learning features" axes: NOT YET ADDRESSED. Frontend Academy page is the unit that closes both.

## Files referenced
- `mcp-server/src/engines/CurriculumEngine.ts` — backend catalog (correct, 40/40 PASS)
- `mcp-server/web/src/data/academy.ts` — frontend blueprints (only 0a-12)
- `mcp-server/web/CLAUDE.md` — mobile + aesthetic rules (Calculator Studio + 5-viewport responsiveness)
- `state/shared/specs/FRONTEND-MERGE-AUDIT-AND-PLAN-2026-05-25.md` — Phase E mobile mandate
