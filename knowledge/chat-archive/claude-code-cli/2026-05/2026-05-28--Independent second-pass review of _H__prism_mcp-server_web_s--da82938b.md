---
type: "chat-session"
source: "claude-code-cli"
session_id: "da82938b-ba3a-452f-acb4-9121b315e6cc"
title: "Independent second-pass review of `H:/prism/mcp-server/web/src/components/learni"
date: "2026-05-28"
first_ts: "2026-05-28T01:09:41.003Z"
last_ts: "2026-05-28T01:14:57.828Z"
cwd: "H:\\prism-slot-lima"
messages: 42
user_msgs: 18
assistant_msgs: 24
raw_file: "H:/.claude/projects/H--prism-slot-lima/da82938b-ba3a-452f-acb4-9121b315e6cc/subagents/agent-a59863b106228bff9.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:01"
---

# Independent second-pass review of `H:/prism/mcp-server/web/src/components/learni

> **claude-code-cli** | 2026-05-28 | 42 msgs (18 user / 24 assistant) | cwd: H:\prism-slot-lima
> Raw: `H:/.claude/projects/H--prism-slot-lima/da82938b-ba3a-452f-acb4-9121b315e6cc/subagents/agent-a59863b106228bff9.jsonl`

## Transcript

### User | 2026-05-28T01:09:41.003Z

Independent second-pass review of `H:/prism/mcp-server/web/src/components/learning/AcademyHub.tsx` (REWRITTEN this session, ~520 LOC). A separate reviewer is doing UI/React correctness; YOUR weight is correctness + silent-breakage + regression risk + integration coupling.

Context: This component is the primary `/learning/academy` route — what every PRISM apprentice / programmer / manager hits when they tap "Learning" on the dashboard. Prior version had three open R12 deferrals (`U-ACADEMY-PICKS-PERSIST`, `U-ACADEMY-TRACK-AUTOSELECT`, `U-ACADEMY-TAG-METADATA`). This rewrite closes the first two; the third is the only one still open.

Verify against this contract:
1. **Silent regression — does it still serve the pre-existing apprentice flow?** Read the prior commit `12770635c4` (or what's now on slot/lima HEAD) for AcademyHub.tsx behavior. The new version MUST preserve: Kahn topo-sort, cycle detection, missing-prereq warning, sticky bottom action bar on phone, the 5 domain cards, the 28 sub-cat predicates. If ANY are degraded, flag P0.
2. **Topo-sort fidelity** — `topoSortByPrereq` was copied verbatim from prior version. Verify byte-equivalence. If there's a subtle drift (e.g. `parseInt` radix, sort comparator sign), flag P0.
3. **Predicate table** — `DOMAIN_BLOCKS` was copied from prior version. Verify all 28 sub-cats are present with identical predicates. A predicate drift = silent regression of the apprentice's search.
4. **Hook usage order** — `useCourses(studentId)` returns 6 things; does the new code use the right ones in the right contexts? Specifically `startCourse` — is it correctly called on `commitPath` AFTER `saveActivePath` (storage write must precede state side-effect)?
5. **`tracksToSubCatIds` logic** — walk through with `JUSTIN_TRACK` (course-0a, 0b, 0c, 1, 2, 3, 14, 15, 16, 46, 45, 60, 9, 39, 22). Does it produce a reasonable set of sub-cats? Check: does it over-pick "*-all" categories (which would flood the result with un-track courses)? Does it cor
... [+1739 chars truncated]

### Assistant | 2026-05-28T01:09:53.168Z

I'll perform a rigorous independent second-pass review of the rewritten `AcademyHub.tsx`.

### Assistant | 2026-05-28T01:09:53.837Z

[tool_use: Read]

### User | 2026-05-28T01:09:58.685Z

[tool_result] 1	/**
2	 * AcademyHub — drill-down hub for the PRISM Academy with desktop responsiveness,
3	 * picks persistence, per-employee track auto-select, and active learning path commit.
4	 *
5	 * History:
6	 *   - 2026-05-27 (peer 92ef25c0): NEW component, 3-step mobile drill-down
7	 *     (Domain → Sub-category chips → Generate Optimized Coursework).
8	 *   - 2026-05-27 (claude-da82938b, this commit): f
... [+36205 chars truncated]

### Assistant | 2026-05-28T01:10:01.125Z

Now let me read the prior version to compare against and check the dependencies.

### Assistant | 2026-05-28T01:10:02.558Z

[tool_use: Bash]

### User | 2026-05-28T01:10:09.120Z

[tool_result] a7a4e1b4ef [MAIN] [WHISKEY-LATHE-CLOSED-LOOP-MS0]/U-CL1-OPERATOR-OVERRIDE-CAPTURE (slot:whiskey iter317): wire submit...

### Assistant | 2026-05-28T01:10:11.900Z

[tool_use: Bash]

### User | 2026-05-28T01:10:49.994Z

[tool_result] a7a4e1b4ef [MAIN] [WHISKEY-LATHE-CLOSED-LOOP-MS0]/U-CL1-OPERATOR-OVERRIDE-CAP...

### Assistant | 2026-05-28T01:10:55.120Z

[tool_use: Bash]

### User | 2026-05-28T01:11:01.159Z

[tool_result] a7a4e1b4ef [MAIN] [WHISKEY-LATHE-CLOSED-LOOP-MS0]/U-CL1-OPERATOR-OVERRIDE-CAP...

### Assistant | 2026-05-28T01:11:05.700Z

[tool_use: Bash]

### Assistant | 2026-05-28T01:11:06.206Z

[tool_use: Glob]

### Assistant | 2026-05-28T01:11:06.675Z

[tool_use: Glob]

### Assistant | 2026-05-28T01:11:07.145Z

[tool_use: Glob]

### User | 2026-05-28T01:11:10.350Z

[tool_result] a7a4e1b4ef [MAIN] [WHISKEY-LATHE-CLOSED-LOOP-MS0]/U-CL1-OPERATOR-OVERRIDE-CAP...

### User | 2026-05-28T01:11:31.804Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-05-28T01:11:32.441Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-05-28T01:11:32.443Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### Assistant | 2026-05-28T01:11:35.756Z

Note on log flag: the prior call did use `--oneline`; the hook reminder is general. Continuing the review with existing reads only.

### Assistant | 2026-05-28T01:11:36.777Z

[tool_use: Read]

### Assistant | 2026-05-28T01:11:37.273Z

[tool_use: Read]

### Assistant | 2026-05-28T01:11:37.633Z

[tool_use: Read]

### User | 2026-05-28T01:11:38.971Z

[tool_result] File does not exist. Note: your current working directory is H:\prism-slot-lima.

### User | 2026-05-28T01:11:40.446Z

[tool_result] File does not exist. Note: your current working directory is H:\prism-slot-lima.

### User | 2026-05-28T01:11:42.881Z

[tool_result] 1	/**
2	 * MS3-U01: Academy Courses Hook
3	 * Wraps static course data + localStorage progress tracking.
4	 * Later can swap to API-backed progress without changing component interfaces.
5	 */
6	import { useState, useCallback, useMemo, useEffect } from 'react';
7	import {
8	  ALL_COURSES, getCourseById, getCourseForLesson,
9	  arePrerequisitesMet,
10	  TOTAL_LESSONS,
11	} from '../data/academy';
1
... [+6966 chars truncated]

### Assistant | 2026-05-28T01:11:47.730Z

Critical finding immediately visible: `useCourses` takes ZERO arguments — but `AcademyHub.tsx:411` calls `useCourses(studentId)`. This is a P0 build/silent-regression issue. Let me check the storage lib and the prior AcademyHub to confirm baseline behavior.

### Assistant | 2026-05-28T01:11:48.165Z

[tool_use: Glob]

### Assistant | 2026-05-28T01:11:48.360Z

[tool_use: Glob]

### User | 2026-05-28T01:12:10.009Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-05-28T01:12:10.013Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### Assistant | 2026-05-28T01:12:13.074Z

Let me narrow scope and use Read directly.

### Assistant | 2026-05-28T01:12:14.251Z

[tool_use: Read]

### Assistant | 2026-05-28T01:12:14.699Z

[tool_use: Read]

### Assistant | 2026-05-28T01:12:15.156Z

[tool_use: Read]

### User | 2026-05-28T01:12:16.521Z

[tool_result] File does not exist. Note: your current working directory is H:\prism-slot-lima.

### User | 2026-05-28T01:12:16.523Z

[tool_result] File does not exist. Note: your current working directory is H:\prism-slot-lima.

### User | 2026-05-28T01:12:17.892Z

[tool_result] File does not exist. Note: your current working directory is H:\prism-slot-lima.

### Assistant | 2026-05-28T01:12:25.909Z

The dependencies (academyPicksStorage, employee-tracks, useStudentId) don't exist on disk — these are NEW files that the rewrite assumes were created alongside it but the read tool reports "File does not exist". Let me verify with Bash via ls to confirm they're truly missing vs path issue.

### Assistant | 2026-05-28T01:12:27.775Z

[tool_use: Bash]

### User | 2026-05-28T01:12:48.422Z

[tool_result] OfflineQueueManager.ts  5.8K
OptimisticSyncManager.ts  13.2K
resilientFetch.ts  5.6K
---
academy.ts  137.9K
calculatorHolderLibrary.ts  13.3K
calculatorProgrammingCatalogSupplements.ts  414B
calculatorWorkholding.ts  11.1K
calculatorWorkspace.ts  170.6K
camAiAlerts.ts  5.4K
machines.ts  3.6K
materials.ts  5.2K
operations.ts  4.5K
tools.ts  6.4K
---
useAdmin.ts  2.5K
useAuth.ts  1.6K
useCam.ts  1.7
... [+613 chars truncated]

### Assistant | 2026-05-28T01:14:57.828Z

Confirmed: `academyPicksStorage.ts`, `employee-tracks.ts`, and `useStudentId.ts` do NOT exist in `mcp-server/web/src/lib|data|hooks`. The rewrite imports 3 modules that don't ship in this slot.

I have enough evidence. The watchdog flagged the previous bash as 30-40s; I'll skip further filesystem probes and finalize the review.

---

## INDEPENDENT SECOND-PASS REVIEW — VERDICT: **FAIL**

Five P0 findings — three are **build-breakers**, one is a **silent regression vs the prior version's contract**, one is a **semantic bug in the new logic**.

### P0-1 — `useCourses` is called with an argument the hook does not accept (BUILD-BREAKER)
**File:** `mcp-server/web/src/components/learning/AcademyHub.tsx:411`
```ts
const { isCourseComplete, completedCourseIds, stats, startCourse } = useCourses(studentId);
```
**Reality:** `mcp-server/web/src/hooks/useCourses.ts:99` — `export function useCourses() { ... }`. ZERO args. Component-side `studentId` is silently ignored. **`tsc --strict` will reject this** under `noImplicitAny`/`TS2554 "Expected 0 arguments, but got 1"`. Contract item 4 ("the hook returns 6 things in the right contexts") is FALSE — the hook returns ~12 things but takes 0 args; the rewrite was written against a `useCourses(studentId)` contract that does not exist on disk.

The prior worker-swap concern raised in contract item 8 is **moot** — there is no `studentId`-keyed worker swap because `useCourses` doesn't take `studentId`. All progress is read from one global `localStorage` key `prism_academy_progress_v2`, so per-student isolation that the new component assumes is **silently absent**: a logged-out demo user and a logged-in JM Die employee share the same progress store.

**Fix:** EITHER (a) extend `useCourses` to accept `studentId` and key `STORAGE_KEY` by it (the contract the rewrite expects), OR (b) drop the arg in AcademyHub.tsx:411 and accept that all chats share one progress store. (a) is the operator-intent fix.

### P0-2 — Three imported modules do not 
... [+18343 chars truncated]
