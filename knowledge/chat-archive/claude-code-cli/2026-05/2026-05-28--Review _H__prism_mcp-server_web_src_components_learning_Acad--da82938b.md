---
type: "chat-session"
source: "claude-code-cli"
session_id: "da82938b-ba3a-452f-acb4-9121b315e6cc"
title: "Review `H:/prism/mcp-server/web/src/components/learning/AcademyHub.tsx` (REWRITT"
date: "2026-05-28"
first_ts: "2026-05-28T01:09:41.009Z"
last_ts: "2026-05-28T01:12:43.999Z"
cwd: "H:\\prism-slot-lima"
messages: 31
user_msgs: 13
assistant_msgs: 18
raw_file: "H:/.claude/projects/H--prism-slot-lima/da82938b-ba3a-452f-acb4-9121b315e6cc/subagents/agent-aafb1c717cb92c86f.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:01"
---

# Review `H:/prism/mcp-server/web/src/components/learning/AcademyHub.tsx` (REWRITT

> **claude-code-cli** | 2026-05-28 | 31 msgs (13 user / 18 assistant) | cwd: H:\prism-slot-lima
> Raw: `H:/.claude/projects/H--prism-slot-lima/da82938b-ba3a-452f-acb4-9121b315e6cc/subagents/agent-aafb1c717cb92c86f.jsonl`

## Transcript

### User | 2026-05-28T01:09:41.009Z

Review `H:/prism/mcp-server/web/src/components/learning/AcademyHub.tsx` (REWRITTEN this session, ~520 LOC). A separate reviewer is also reviewing it; YOUR weight is the UI/React/integration/UX correctness pass.

Context: the prior version (~520 LOC) was a mobile-first 3-step drill-down hub for the PRISM Academy (5 domain cards → 28 sub-category chips → "Generate Optimized Coursework" sticky-bottom button → Kahn topo-sort result). This rewrite ADDS, all in one component:
  1. Desktop responsive layout — was `max-w-3xl` phone-only; now `max-w-6xl` with `lg:grid-cols-[minmax(0,1fr)_320px]` two-column on desktop. Domain cards become a 2-col grid on lg; expanded card spans both cols and grabs row 1. Right rail "Your picks" panel sticky on lg+. Bottom action bar fixed on mobile, in-flow on lg.
  2. Picks persistence — load/save via the NEW `H:/prism/mcp-server/web/src/lib/academyPicksStorage.ts` (separate ~210 LOC file with its own 30-test suite). `useEffect` on mount loads via `loadPicks(studentId)`; subsequent effect saves via `savePicks(studentId, ...)` on change. `hydrated` flag guards against the first-render-clobbers-localStorage-with-empty-state bug.
  3. Employee track auto-select banner — on first visit (no persisted picks), if `studentId` matches a `JM_DIE_EMPLOYEES` profile (justin-apprentice / chris-programmer / mark-manager), call `tracksToSubCatIds(track.course_ids)` to populate `selectedSubIds`. Banner: "Loaded Justin's training path — N courses, ~Xh. Start fresh / Looks good". Dismissable.
  4. Completion badges in result — pulls `isCourseComplete` + `completedCourseIds` from `useCourses(studentId)` hook. Already-done courses render with ✓ instead of number, emerald-50 bg, "complete" label.
  5. "Start this path" — on result panel, commits sorted courses to active learning path via `saveActivePath` + calls `startCourse(courseIds[0])`. Toggle button changes to "Path active · Remove" with `clearActivePath`.

Files this depends on (verify they exist + have th
... [+2922 chars truncated]

### Assistant | 2026-05-28T01:09:53.444Z

I'll review the rewritten AcademyHub.tsx with focus on UI/React/integration/UX correctness.

### Assistant | 2026-05-28T01:09:54.054Z

[tool_use: Read]

### User | 2026-05-28T01:09:58.666Z

[tool_result] 1	/**
2	 * AcademyHub — drill-down hub for the PRISM Academy with desktop responsiveness,
3	 * picks persistence, per-employee track auto-select, and active learning path commit.
4	 *
5	 * History:
6	 *   - 2026-05-27 (peer 92ef25c0): NEW component, 3-step mobile drill-down
7	 *     (Domain → Sub-category chips → Generate Optimized Coursework).
8	 *   - 2026-05-27 (claude-da82938b, this commit): f
... [+36205 chars truncated]

### Assistant | 2026-05-28T01:10:03.206Z

Now let me verify the dependency files exist and check their exports.

### Assistant | 2026-05-28T01:10:05.197Z

[tool_use: Bash]

### User | 2026-05-28T01:10:11.776Z

[tool_result] H:/prism/mcp-server/web/src/data/academy.ts  104.3K
H:/prism/mcp-server/web/src/data/employee-tracks.ts  9.5K
H:/prism/mcp-server/web/src/hooks/useCourses.ts  8.7K
H:/prism/mcp-server/web/src/hooks/useStudentId.ts  988B
H:/prism/mcp-server/web/src/lib/academyPicksStorage.ts  7.9K

### Assistant | 2026-05-28T01:10:16.952Z

Acknowledged. Files all exist. Now reading the dependencies to verify the contract.

### Assistant | 2026-05-28T01:10:17.663Z

[tool_use: Read]

### Assistant | 2026-05-28T01:10:18.709Z

[tool_use: Read]

### Assistant | 2026-05-28T01:10:19.037Z

[tool_use: Read]

### Assistant | 2026-05-28T01:10:19.107Z

[tool_use: Read]

### User | 2026-05-28T01:10:21.990Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\web\src\hooks\useStudentId.ts' was already read 11m ago in this session and is unchanged (mtime 1779554666460). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-05-28T01:10:22.005Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\web\src\lib\academyPicksStorage.ts' was already read 24s ago in this session and is unchanged (mtime 1779930079457). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE
... [+3 chars truncated]

### User | 2026-05-28T01:10:24.758Z

[tool_result] 1	/**
2	 * Per-Employee Curriculum Tracks — JM Die personnel
3	 *
4	 * Per operator directive 2026-05-27 (lima session 92ef25c0): "Mark (CNC mill manager,
5	 * programs all mills + lathes, engineer, quoting + purchasing + scheduling); Chris
6	 * (Haas VF-2 + Hurco + Okuma 5-axis programmer, 5 yrs); Justin (apprentice — Excel
7	 * macros for electrodes, Fusion CAM templates for Roku-Roku, engraving
... [+9600 chars truncated]

### User | 2026-05-28T01:10:24.764Z

[tool_result] 1	/**
2	 * MS3-U01: Academy Courses Hook
3	 * Wraps static course data + localStorage progress tracking.
4	 * Later can swap to API-backed progress without changing component interfaces.
5	 *
6	 * PRISM-ACADEMY-MOBILE-MS0/U-PAM-AUTH (2026-05-23): accepts an optional
7	 * `studentId` so shop tablets shared across workers don't cross-pollute
8	 * progress. When `studentId` is null/absent (un-authent
... [+9052 chars truncated]

### Assistant | 2026-05-28T01:10:28.252Z

I have already read `useStudentId.ts` and `academyPicksStorage.ts` earlier in the session per the guard. Let me re-grep for the critical pieces I need.

### Assistant | 2026-05-28T01:10:29.906Z

[tool_use: Grep]

### Assistant | 2026-05-28T01:10:30.851Z

[tool_use: Grep]

### Assistant | 2026-05-28T01:10:31.907Z

[tool_use: Grep]

### User | 2026-05-28T01:10:34.332Z

[tool_result] 16:export function useStudentId(): string | null {

### User | 2026-05-28T01:10:34.334Z

[tool_result] 43:export type CourseLevel = 'L0' | 'L1' | 'L2' | 'L3';
44:export type CourseDomain = 'Foundations' | 'Programming' | 'Machining' | 'Optimization' | 'Business';
45:export type ProgramId = 'foundations' | 'operator-core' | 'programming-master' | 'leadership';
46:export type SpecializationTrackId =
55:export type LessonSectionType = 'text' | 'calculator' | 'diagram' | 'sandbox' | 'video' | '3d_viewe
... [+1539 chars truncated]

### User | 2026-05-28T01:10:37.778Z

[tool_result] 29:export const PICKS_KEY_PREFIX = 'prism_academy_picks_v1';
30:export const PATH_KEY_PREFIX = 'prism_academy_active_path_v1';
31:export const PICKS_ANON_KEY = `${PICKS_KEY_PREFIX}:anon`;
32:export const PATH_ANON_KEY = `${PATH_KEY_PREFIX}:anon`;
36:export interface AcademyPicks {
44:export interface ActiveLearningPath {
77:export function picksKey(studentId: string | null | undefined): string {
8
... [+343 chars truncated]

### Assistant | 2026-05-28T01:10:41.543Z

Acknowledged. Now I have all the contracts I need. Let me verify the `pathSavedAt` reload behavior, the `useStudentId` shape, and the `loadActivePath` interaction with `pathSavedAt`.

### Assistant | 2026-05-28T01:10:42.550Z

[tool_use: Read]

### Assistant | 2026-05-28T01:10:44.090Z

[tool_use: Read]

### Assistant | 2026-05-28T01:10:44.249Z

[tool_use: Read]

### User | 2026-05-28T01:10:45.547Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\web\src\hooks\useStudentId.ts' was already read 11m ago in this session and is unchanged (mtime 1779554666460). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-05-28T01:10:48.874Z

[tool_result] 36	export interface AcademyPicks {
37	  selectedSubIds: string[];
38	  openDomain: string | null;
39	  loadedTrackId: string | null;
40	  trackBannerDismissed: boolean;
41	  updatedAt: string;
42	}
43	
44	export interface ActiveLearningPath {
45	  courseIds: string[];
46	  loadedTrackId: string | null;
47	  startedAt: string;
48	}
49	
50	type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 're
... [+2103 chars truncated]

### User | 2026-05-28T01:10:51.324Z

[tool_result] 148	export function loadActivePath(
149	  studentId: string | null | undefined,
150	  storage?: StorageLike,
151	): ActiveLearningPath | null {
152	  const store = resolveStorage(storage);
153	  try {
154	    const raw = store.getItem(pathKey(studentId));
155	    if (!raw) return null;
156	    const parsed: unknown = JSON.parse(raw);
157	    if (typeof parsed !== 'object' || parsed === null) retur
... [+1177 chars truncated]

### Assistant | 2026-05-28T01:12:43.999Z

I have all the contracts I need. Walking the contract methodically now.

---

## VERDICT: **FAIL** — 3 P1 findings (1 user-data-loss, 2 visible-state-bugs) + 5 P2 + 2 P3

The component is well-structured and the React patterns are mostly correct, but it ships with **three reproducible bugs that will degrade user trust on day 1**: pathSavedAt does not survive refresh (the "Path active" pill silently lies), the autosave effect deletes the user's persisted picks the very first render after a worker swap on a shared tablet, and the desktop grid layout breaks when the 5th domain is expanded.

---

### P1 — pathSavedAt never re-hydrates from storage; refresh silently demotes "Path active" to "Start this path"
**File/line:** `AcademyHub.tsx:419` (state declaration) + `:426-446` (hydration effect) + `:543-559` (commit/clear) + `:730-748` (button render)

**Repro:** User selects sub-cats → clicks "Start this path" → the button renders **"Path active · Remove"** in amber. Refresh the page. Component remounts, `pathSavedAt` defaults to `null`, hydration effect ONLY reads `loadPicks` (not `loadActivePath`), so the button renders **"Start this path"** in green again — even though `localStorage[prism_academy_active_path_v1:<id>]` still holds the committed path. Clicking it now saves a SECOND active path with a fresh `startedAt`. The user reasonably believes their previous commit was lost.

**Why it's P1, not P2:** the storage layer was deliberately split into two keys (`PICKS_KEY_PREFIX` for picks, `PATH_KEY_PREFIX` for active path) and `loadActivePath` was exported for exactly this use. The component imports `clearActivePath` + `saveActivePath` but **never imports `loadActivePath`**. The contract was designed correctly and the consumer dropped the rehydration call.

**Fix:**
```tsx
// add to import
import { loadPicks, savePicks, saveActivePath, clearActivePath, loadActivePath, type AcademyPicks } from '../../lib/academyPicksStorage';

// in the hydration effect (line 426), after
... [+16420 chars truncated]
