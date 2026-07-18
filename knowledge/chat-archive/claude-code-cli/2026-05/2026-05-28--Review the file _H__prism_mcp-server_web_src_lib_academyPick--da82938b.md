---
type: "chat-session"
source: "claude-code-cli"
session_id: "da82938b-ba3a-452f-acb4-9121b315e6cc"
title: "Review the file `H:/prism/mcp-server/web/src/lib/academyPicksStorage.ts` (newly "
date: "2026-05-28"
first_ts: "2026-05-28T01:09:41.007Z"
last_ts: "2026-05-28T01:11:39.141Z"
cwd: "H:\\prism-slot-lima"
messages: 12
user_msgs: 5
assistant_msgs: 7
raw_file: "H:/.claude/projects/H--prism-slot-lima/da82938b-ba3a-452f-acb4-9121b315e6cc/subagents/agent-a26f33283d44fc24f.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:01"
---

# Review the file `H:/prism/mcp-server/web/src/lib/academyPicksStorage.ts` (newly 

> **claude-code-cli** | 2026-05-28 | 12 msgs (5 user / 7 assistant) | cwd: H:\prism-slot-lima
> Raw: `H:/.claude/projects/H--prism-slot-lima/da82938b-ba3a-452f-acb4-9121b315e6cc/subagents/agent-a26f33283d44fc24f.jsonl`

## Transcript

### User | 2026-05-28T01:09:41.007Z

Review the file `H:/prism/mcp-server/web/src/lib/academyPicksStorage.ts` (newly created this session, ~210 LOC).

This is a NEW persistence helper for the PRISM Academy frontend that:
- Saves user "picks" (selected sub-categories + open domain + loaded employee track) to localStorage, namespaced per worker via `sanitizeStudentId` from sibling `academyStorageKey.ts`
- Saves an "active learning path" (ordered course-ids) so other components (CourseDetail, dashboard widget) can show progress
- Uses pure functions with injectable Storage (Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>) for testability
- Has try/catch around every JSON op (fail-soft per CLAUDE.md R12)
- Probes localStorage at runtime to handle Safari private-mode + SSR (degrades to no-op storage)

Sibling pattern reference: `H:/prism/mcp-server/web/src/lib/academyStorageKey.ts` (the existing per-worker progress key derivation lib) — newer file should match the same conventions.

Tests: `H:/prism/mcp-server/web/src/__tests__/academyPicksStorage.test.ts` — 30 tests PASS (load/save/clear round trip; per-worker isolation; corrupt JSON; throwing storage; hostile payloads with non-string elements; oversize id sanitization; pathPosition + pathProgress derived queries).

Verify against this contract:
1. Per-worker isolation actually works (Justin saving does NOT bleed into Chris's bucket).
2. Bad localStorage data NEVER crashes (corrupt JSON, hostile shape, null, non-object → null return).
3. SSR / no-localStorage / locked-down browser does NOT crash.
4. The `resolveStorage()` probe — does it actually catch Safari private-mode setItem-throws? Walk through the logic.
5. `pathProgress` rounding behavior + empty-path edge.
6. `pathPosition` is 1-based + correctly returns null when not in path.
7. Are there any silent breakages (e.g. `coerceStringArray` rejecting legitimate course-ids)?
8. Type safety — any unsafe casts that could mask real bugs?

REPORT FORMAT:
- PASS/FAIL verdict
- For each finding: severity 
... [+194 chars truncated]

### Assistant | 2026-05-28T01:09:53.670Z

I'll analyze this code review request systematically. Let me read both files end-to-end first.

### Assistant | 2026-05-28T01:09:54.187Z

[tool_use: Read]

### Assistant | 2026-05-28T01:09:55.269Z

[tool_use: Read]

### Assistant | 2026-05-28T01:09:55.377Z

[tool_use: Read]

### User | 2026-05-28T01:09:57.491Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\web\src\lib\academyStorageKey.ts' was already read 9m ago in this session and is unchanged (mtime 1779554098222). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-05-28T01:09:58.688Z

[tool_result] 1	/**
2	 * academyPicksStorage.test.ts — per-worker picks + active-path persistence.
3	 *
4	 * Per PRISM-ACADEMY-FEATURES-MS0 (lima, 2026-05-27) closing U-ACADEMY-PICKS-PERSIST
5	 * + companion "active learning path" gap.
6	 *
7	 * Coverage floor (per CLAUDE.md):
8	 *   • happy path (load/save/clear round trip) + per-worker isolation
9	 *   • ≥3 failure modes (bad JSON, throwing storage, missing f
... [+14074 chars truncated]

### User | 2026-05-28T01:09:58.690Z

[tool_result] 1	/**
2	 * academyPicksStorage — pure per-worker persistence for AcademyHub picks
3	 * and the user's active generated learning path.
4	 *
5	 * Per PRISM-ACADEMY-FEATURES-MS0 — operator directive 2026-05-27 (lima):
6	 * "do everything to make improvements to make it more user friendly".
7	 *
8	 * Closes two of the open Hub R12 deferrals (see
9	 * reference_academy_hub_drilldown_2026_05_27):
10	 * 
... [+7886 chars truncated]

### Assistant | 2026-05-28T01:10:02.796Z

I have both files. Let me also pull the sibling `academyStorageKey.ts` (referenced from system memory) and verify `sanitizeStudentId`'s behavior since it's load-bearing for the per-worker isolation contract.

### Assistant | 2026-05-28T01:10:04.227Z

[tool_use: Grep]

### User | 2026-05-28T01:10:07.194Z

[tool_result] 36:export function sanitizeStudentId(raw: unknown): string | null {
37-  if (typeof raw !== 'string') return null;
38-  const trimmed = raw.trim();
39-  if (trimmed.length === 0) return null;
40-  const safe = trimmed
41-    .toLowerCase()
42-    .replace(/[^a-z0-9._-]+/g, '_')
43-    .replace(/^_+|_+$/g, '')
44-    .slice(0, 64);
45-  return safe.length === 0 ? null : safe;
46-}
47-
48-/**
49- * 
... [+2015 chars truncated]

### Assistant | 2026-05-28T01:11:39.141Z

Good — sanitizeStudentId confirmed: trim → lowercase → replace non-`[a-z0-9._-]` with `_` → strip leading/trailing `_` → slice(0,64) → null if empty.

Now walking the contract end-to-end.

---

## Code Quality Analysis Report — `academyPicksStorage.ts`

### Summary
- **Overall Quality Score: 8.5 / 10**
- **Verdict: PASS (ship as-is on contract; P2/P3 follow-ups recommended)**
- **Files Analyzed: 2** (lib + test, plus sibling cross-check)
- **Issues Found: 6** (0 P0, 1 P1, 3 P2, 2 P3)
- **Technical Debt Estimate: ~45 min**

The file does what it claims. Per-worker isolation, fail-soft I/O, SSR/Safari-private degradation, and hostile-payload coercion all hold under walkthrough. Style and structure match the sibling `academyStorageKey.ts` exactly (Karpathy R8 satisfied — read-before-write conformance to local conventions). No silent breakages, no R12 violations, no inlined physics constants (N/A here anyway).

---

### Contract walkthrough — each of the 8 points

**1. Per-worker isolation — PASS.**
`picksKey('justin-apprentice')` → `prism_academy_picks_v1:justin-apprentice`; `picksKey('chris-programmer')` → `prism_academy_picks_v1:chris-programmer`. Distinct keys → distinct buckets. Test L103-114 proves it; sanitization is delegated to the already-shipped `sanitizeStudentId` (verified L36-46 of sibling). The intentional `alice/bob` ≡ `alice_bob` collision (test L215-226) is correctly called out as by-design — the sibling key has the same property, so this matches the existing per-worker contract rather than introducing new aliasing.

**2. Bad localStorage data NEVER crashes — PASS.**
Walked every degenerate input on `loadPicks`/`loadActivePath`:
- `null` (missing key) → L101/L155 early-return `null`
- Corrupt JSON → `JSON.parse` throws → caught at L113/L166 → return `null`
- `JSON.stringify('a string')` → `typeof parsed !== 'object'` at L103/L157 → `null`
- `JSON.stringify(42)` → same path → `null`
- `'null'` → `parsed === null` short-circuit at L103/L157 → `null` (thi
... [+12559 chars truncated]
