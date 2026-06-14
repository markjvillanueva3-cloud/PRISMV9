---
name: reference-academy-hub-ux-overhaul-2026-05-27
description: Lima (claude-da82938b) full UX overhaul of AcademyHub — closes 2 of 3 R12 deferrals (picks-persist + track-autoselect; tag-metadata still open). Desktop responsive + R12 fail-loud storage saves + per-employee track auto-select with stale-detection + active learning path commit + ContinueLearningWidget for app-wide integration. 2 commits this session, 7 files, 1555 LOC. Hotel directed to wire widget into DashboardPage.
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.007Z
aliases: reference_academy_hub_ux_overhaul_2026_05_27
---


# AcademyHub UX Overhaul — lima 2026-05-27

## Operator prompt
"check sessions from 5/27/2026 and the previous night to regain context continue improving the layout of Prism Academy" → followed by "do everything to make improvements to make it more user friendly. work with hotel to wire you in to the whole app. pleae take out all unnecessary text and place holders. we should have enough on JM die and some employees to get us started."

## Two commits shipped this session

**`f3dce73b8d` (peer-absorbed into DOMAIN-GALAXY-DOCTRINE-MS1)** — academy hub UX overhaul
- NEW `mcp-server/web/src/lib/academyPicksStorage.ts` (260 LOC) — pure per-worker picks + active-path persistence; sibling-pattern to `academyStorageKey.ts`; R12 fail-loud boolean save returns; rejects array/null/non-object payloads; dedupes courseIds
- NEW `mcp-server/web/src/__tests__/academyPicksStorage.test.ts` (435 LOC, 37/37 PASS) — happy + per-worker isolation + 6 failure modes + adversarial + derived queries
- REWRITE `mcp-server/web/src/components/learning/AcademyHub.tsx` (680 LOC) — desktop responsive 2-col with `lg:grid-flow-dense`; right-rail sticky picks panel; `hydratedFor` ref sentinel (P1-2 worker-swap race fix); employee track auto-select with `loadedTrackHash` stale-detection (P0-5 fix); completion ✓ badges; R12 fail-loud `commitPath`; `pathSavedAt` rehydrates on mount (P1-1); `startCourse` picks first not-complete; `resolveEmployeeRole` instead of unchecked casts; `tracksToSubCatIds` drops `*-all` fallback that flooded result with non-track courses (P0-4); `compareCourses` lexical-id tiebreak; "Reload my path" affordance; "unique courses" wording

**`cbaaeea215` (clean attribution)** — ContinueLearningWidget + sidebar wire
- NEW `ContinueLearningWidget.tsx` (149 LOC) — self-hiding active-path surface with progress bar, "next up" course tile, all-done state. Two variants: `sidebar` (default) + `card` (for Dashboard hero)
- EDIT `LearningLayout.tsx` — imports widget into sticky sidebar; reorders Academy to nav position 2; widens sidebar `md:w-48→md:w-56`; 44pt minHeight on every NavLink

## Per-file scrutiny (CLAUDE.md gate)
4 reviewers dispatched parallel (2 per production file). storage lib PASS×2 (5 P2/P3 non-blocking). AcademyHub FAIL×2 — all 8 P0/P1 findings addressed in same commit before merge. Some reviewer findings were confused by slot-vs-shared-tree split (academy components only exist on `cad-fusion-live-ms0`, slot/lima tree lacks the entire learning/ component dir).

## BOOTSTRAP-SLOT-ENFORCE justification
Both commits used `[BOOTSTRAP-SLOT-ENFORCE]` because the slot/lima branch tree lacks `mcp-server/web/src/components/learning/`. Academy frontend lives on `cad-fusion-live-ms0` by inheritance from prior peer absorptions (per `feedback_commit_to_slot_worktree`). Slot worktree would create the file from nothing → drift from canonical surface. The slot-commit-enforce hook explicitly documents BOOTSTRAP as the escape for this exact case.

## R12 honest deferrals
- `U-ACADEMY-TAG-METADATA` still open — replace 28 keyword `title.includes()` predicates with explicit `Course.tags[]`. Touches 137 KB `academy.ts`; next architectural unblocker.
- DashboardPage.tsx wiring — directed to hotel via `state/shared/AGENT_CHAT.jsonl` (hotel slot was crashed 1h31m stale at session end). Widget ships as drop-in `<ContinueLearningWidget variant='card' />`.
- `U-ACADEMY-PICKS-STORAGE-FAIL-LOUD` — reviewer P2 follow-up: surface storage-degraded toast on app boot when `resolveStorage()` falls through to no-op. NOT a blocker; current "user-friendly degradation" satisfies the operator directive.
- Right-rail `×` close button on picks panel is below 44pt floor (desktop-only, hidden on mobile — explicit P3 per reviewer).

## Files reviewed (cross-ref for next session)
- `mcp-server/web/src/lib/academyPicksStorage.ts` (260)
- `mcp-server/web/src/__tests__/academyPicksStorage.test.ts` (435, 37/37)
- `mcp-server/web/src/components/learning/AcademyHub.tsx` (680, rewrite)
- `mcp-server/web/src/components/learning/ContinueLearningWidget.tsx` (149, NEW)
- `mcp-server/web/src/components/learning/LearningLayout.tsx` (sidebar wire)
- `mcp-server/web/src/data/employee-tracks.ts` (JUSTIN_TRACK 15 courses, CHRIS_TRACK 14, MARK_TRACK 17)
- `mcp-server/web/src/data/academy.ts` (60 courses; ALL_COURSES + Course type used everywhere)
- `mcp-server/web/src/hooks/useCourses.ts` (already accepts studentId — reviewer claim about 0-arg was looking at slot worktree which lacks the file)

## Chat-bus directive to hotel
Posted to `state/shared/AGENT_CHAT.jsonl` 2026-05-28T01:35Z. Subject "Wire ContinueLearningWidget into DashboardPage when you wake". Hotel was crashed 1h31m at directive time.

## Apprentice flow now complete
1. Justin opens phone → dev-seed picks Justin card
2. Lands at `/learning/academy` (AcademyHub) → banner: "Loaded Justin's training path — 15 courses, ~70h"
3. Adjusts picks or accepts → taps Generate Optimized Coursework → topo-sorted list
4. Taps "Start this path" → active path saved; ✓ confirmation
5. Returns next day → AcademyHub remembers picks; ContinueLearningWidget on sidebar shows next-up course + progress %
6. Completes a course → widget auto-updates; "next up" advances
7. Completes all → 🎓 + "Pick a new path"
