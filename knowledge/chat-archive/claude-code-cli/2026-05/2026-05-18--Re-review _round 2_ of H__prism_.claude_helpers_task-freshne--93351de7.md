---
type: "chat-session"
source: "claude-code-cli"
session_id: "93351de7-9846-43b7-a9a7-d6bd1f9b2abc"
title: "Re-review (round 2) of H:/prism/.claude/helpers/task-freshness.mjs — read the WH"
date: "2026-05-18"
first_ts: "2026-05-18T00:38:16.566Z"
last_ts: "2026-05-18T00:38:45.894Z"
cwd: "H:\\prism"
messages: 5
user_msgs: 2
assistant_msgs: 3
raw_file: "H:/.claude/projects/H--prism/93351de7-9846-43b7-a9a7-d6bd1f9b2abc/subagents/agent-aacb06876d10333c6.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:18"
---

# Re-review (round 2) of H:/prism/.claude/helpers/task-freshness.mjs — read the WH

> **claude-code-cli** | 2026-05-18 | 5 msgs (2 user / 3 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/93351de7-9846-43b7-a9a7-d6bd1f9b2abc/subagents/agent-aacb06876d10333c6.jsonl`

## Transcript

### User | 2026-05-18T00:38:16.566Z

Re-review (round 2) of H:/prism/.claude/helpers/task-freshness.mjs — read the WHOLE file. Round 1 found issues now fixed; verify the fixes are correct and introduced no regressions.

Fixes applied since round 1:
1. **P0 git-down silent-pass**: `countActivitySince` now sets `result.unprovable=true` when git is null. `decideFreshness` has a new branch (d): if `a.unprovable` and gen resolved + trusted + not-already-shipped + not-future → returns `{stale:true, severity:"freshness-unprovable"}`. Verify the branch ORDER is correct (already-shipped → gen-unknown → future → untrusted-anchor → unprovable → byHours/byCommits → fresh) and that no ordering lets a stale task slip through as fresh.
2. **P1-1 future genIso**: new branch — `ageHrs < 0` → `{stale:true, severity:"gen-in-future"}`. Verify it's positioned BEFORE the byHours/byCommits math.
3. **P1 file-mtime fork-storm**: `readGenerationTimestamp` now sets `out.trusted` via `isTrustedSource()` (true only for envelope.*/audit-spec/filename-date/git-first-touch; false for file-mtime/none). `decideFreshness` branch (c): `gen.trusted===false` → `{stale:true, severity:"gen-anchor-untrusted"}`. `evaluate()` now SKIPS the `countActivitySince` git spawn when `!gen.trusted`. Verify the finalize() helper sets trusted on EVERY return path of readGenerationTimestamp (there were 4 return points).
4. **P1 source_audit traversal**: `classifyTaskSource` now resolves the candidate and asserts `cand===rootResolved || cand.startsWith(rootResolved+path.sep)`. Verify an absolute or `../`-laden source_audit cannot escape.
5. **P1 NaN thresholds**: `decideFreshness` uses `Number.isFinite(sH)?sH:24`. Verify a string/NaN threshold can't make every task read fresh.
6. **P1 (smoke-found) isCli dead on win32**: now uses `fileURLToPath(import.meta.url)` instead of `new URL().pathname`. Verify import is present and the compare is correct.

Live smoke already confirmed: already-shipped unit→severity=already-shipped; bogus→gen-unknown-quiet; malforme
... [+268 chars truncated]

### Assistant | 2026-05-18T00:38:22.396Z

I'll read the entire file to verify the fixes.

### Assistant | 2026-05-18T00:38:22.397Z

[tool_use: Read]

### User | 2026-05-18T00:38:25.679Z

[tool_result] 1	#!/usr/bin/env node
2	// task-freshness.mjs — TASK-FRESHNESS-GATE-MS0/U-TFG01 (2026-05-18)
3	//
4	// Pure, dependency-injectable core for the task-freshness gate (R13 doctrine).
5	// A task's ground truth is its generation timestamp. Before a chat commits to
6	// building a unit, this module answers: "was this task's source generated
7	// before recent fleet activity, such that it may already be
... [+24718 chars truncated]

### Assistant | 2026-05-18T00:38:45.894Z

Verified all six fixes against the full file. Results below.

**(a) Fail-open contract — held on every exported fn**

- `classifyTaskSource` (122): regex guard + injected `statFile`; no throw path. Containment check (158-160) is pure string ops.
- `readGenerationTimestamp` (196): `finalize()` (199-202) runs on all 4 return paths — line 203 (unknown), 256 (genIso resolved), 263 (filename-date), 288 (mtime/none fallthrough). Every path sets `out.trusted` via `isTrustedSource`. ✓
- `countActivitySince` (295): `Date.parse` guards, try/catch on JSON.parse (333-337). No throw.
- `decideFreshness` (370): pure; optional-chained thresholds.
- `acknowledgmentValid`/`writeAcknowledgment`: try/catch wrapping fs, return false/null.
PASS.

**(b) 7-branch ordering — sound**

Order: (a) already-shipped 380 → (e) gen-unknown 392 → (b) gen-in-future 410 → (c) untrusted 423 → (d) unprovable 436 → (f/g) byHours/byCommits 449 → fresh 462.

The spec text in the prompt requested ordering `already-shipped → gen-unknown → future → untrusted → unprovable → byHours → fresh`. Code matches exactly. Critically:
- Future check (410) is BEFORE byHours/byCommits (446-447) — negative `ageHrs` can never reach the `ageHrs > staleHrs` math. ✓ (P1-1 fixed)
- Untrusted (423) and unprovable (436) both precede the freshness math and both return `stale:true`. No stale task slips through. ✓
- (e) at 392 correctly treats `a.unprovable` as activity (line 393) so a gen-unknown + git-down case is still `gen-unknown-with-activity` (stale), not quiet-pass. Defense-in-depth with branch (d). ✓
PASS.

**Per-fix verification**

1. P0 git-down: `countActivitySince` sets `unprovable=true` at 324 only when `git===null`. Branch (d) at 436 returns `stale:true`. `evaluate()` (532) also propagates `unprovable:false` default in the skip-stub — correct (skip implies untrusted, caught by (c) first). ✓
2. P1-1 future: branch (b) at 410, positioned before 446. ✓
3. P1 mtime fork-storm: `isTrustedSource` (192-194) — true only for 
... [+971 chars truncated]
