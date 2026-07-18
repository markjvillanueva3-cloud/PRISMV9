---
type: "chat-session"
source: "claude-code-cli"
session_id: "0fe601c1-0fbe-4ef2-b6d5-64d54264beb1"
title: "RE-REVIEW after fixes to H:\\prism\\.claude\\hooks\\wiki-precheck-inject.mjs (U-CLEA"
date: "2026-05-14"
first_ts: "2026-05-14T13:59:14.086Z"
last_ts: "2026-05-14T13:59:52.590Z"
cwd: "H:\\prism"
messages: 5
user_msgs: 2
assistant_msgs: 3
raw_file: "H:/.claude/projects/H--prism/0fe601c1-0fbe-4ef2-b6d5-64d54264beb1/subagents/agent-ae9af27009b32a40b.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:06"
---

# RE-REVIEW after fixes to H:\prism\.claude\hooks\wiki-precheck-inject.mjs (U-CLEA

> **claude-code-cli** | 2026-05-14 | 5 msgs (2 user / 3 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/0fe601c1-0fbe-4ef2-b6d5-64d54264beb1/subagents/agent-ae9af27009b32a40b.jsonl`

## Transcript

### User | 2026-05-14T13:59:14.086Z

RE-REVIEW after fixes to H:\prism\.claude\hooks\wiki-precheck-inject.mjs (U-CLEANUP-D5). You previously returned VERDICT: FAIL on one P0.

YOUR P0 was: ReDoS in `matchBoostKeywords` — the glob→regex `[\w.-]*[\w.-]*` shape catastrophically backtracks on frontmatter-derived globs like `**/*.mjs` or `src/**` (you measured >30s hang on a UserPromptSubmit hook).

THE FIX: `matchBoostKeywords` no longer builds a regex AT ALL. The glob branch now splits the keyword on `*` and walks the literal segments with `promptLower.indexOf(seg, pos)` — each segment must appear in order, `*` is a free gap. O(prompt · segments), zero backtracking, no `new RegExp`. The all-`*` footgun guard (`k.replace(/\*/g,"").length===0`) is retained. A single bare stopword keyword is also now skipped (`STOP.has(k)` guard).

VERIFIED by smoke test: pathological globs (`**/*.mjs`, `src/**`, `**a`) against a 9000-char prompt return in 0.1ms; `*.mjs` matches "foo.mjs"; `**/*.mjs` requires `/` then `.mjs` in order; `src/**` matches a "src/" mention.

Re-read `matchBoostKeywords` end-to-end and confirm:
1. The ReDoS P0 is fully eliminated — there is no regex construction anywhere in the function, and the substring-walk cannot backtrack or loop unboundedly.
2. The glob semantics are still correct (segments matched in order, `*` = gap).
3. No new throw path (the function must never throw — it's on the hook critical path).
4. Your two P2s (dedup comment overstated; cache mtime tick) — the dedup comment was rewritten to "highest score wins; on a tie the first-inserted survives". Confirm that's now accurate.

Output any remaining P0/P1. End with `VERDICT: PASS` or `VERDICT: FAIL`.

### Assistant | 2026-05-14T13:59:17.819Z

I'll re-read the `matchBoostKeywords` function and verify the fixes.

### Assistant | 2026-05-14T13:59:18.457Z

[tool_use: Read]

### User | 2026-05-14T13:59:21.080Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T4
3	/**
4	 * wiki-precheck-inject.mjs — UserPromptSubmit hook.
5	 *
6	 * Karpathy LLM-Wiki integration: when the user's prompt mentions a concept
7	 * already in knowledge/wiki/index.md, inject the top-3 matching entries as
8	 * additionalContext so Claude doesn't re-derive what the wiki already knows.
9	 *
10	 * Scoring: BM25-lite over [[Name]] + description toke
... [+21501 chars truncated]

### Assistant | 2026-05-14T13:59:52.590Z

Re-reviewing `matchBoostKeywords` end-to-end (lines 114–141) plus the call site and the dedup comment.

## Verification

### 1. ReDoS P0 — ELIMINATED

The function body now contains **zero regex construction**:
- No `new RegExp`, no `RegExp(...)`, no implicit `.match()`/`.replace()` against a dynamic pattern.
- The only `.replace()` is `k.replace(/\*/g, "")` (line 119) — a *static literal* regex `/\*/g`, linear, not derived from input.
- The glob branch (lines 123–135) is a bounded loop: `k.split("*")` yields a fixed segment array; for each non-empty segment, one `promptLower.indexOf(seg, pos)` call. `indexOf` is non-backtracking native substring search. `pos` is monotonically non-decreasing (`pos = idx + seg.length`, and `idx >= pos` because `indexOf` searches from `pos`), so the loop runs exactly once per segment. Total work is O(prompt.length · segmentCount) — no nested backtracking, no unbounded iteration.
- The `else if (promptLower.includes(k))` branch (line 136) is likewise linear native substring search.

Confirmed: the catastrophic `[\w.-]*[\w.-]*` shape is gone entirely. Pathological globs like `**/*.mjs` split to `["", "", "/", ".mjs"]` → empty segments skipped → two `indexOf` calls. `src/**` → `["src/", "", ""]` → one `indexOf`. No hang path exists.

### 2. Glob semantics — CORRECT

- Segments are matched **in order**: `pos` advances past each match, so the next segment must occur at or after the previous one's end. ✔
- `*` is a **free gap**: empty segments (from leading/trailing `*` or consecutive `**`) are `continue`-skipped, contributing no constraint. ✔
- `*.mjs` → `["", ".mjs"]` → requires `.mjs` anywhere → matches `"foo.mjs"`. ✔
- `**/*.mjs` → `["", "", "/", ".mjs"]` → requires `/` then `.mjs` after it, in order. ✔
- `src/**` → `["src/", "", ""]` → requires `src/`. ✔
- `**a` → `["", "", "a"]` → requires `a`. ✔
- One minor semantic note (not a defect): `*` matches a zero-width gap, so `a*b` matches `"ab"`, and a literal `.` in a segment matches a li
... [+2854 chars truncated]
