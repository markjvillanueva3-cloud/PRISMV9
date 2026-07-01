---
type: "chat-session"
source: "claude-code-cli"
session_id: "3b735015-a3e0-4ba4-8b97-35384113b9f9"
title: "Independent review of two new files for a PRISM Claude Code hook (HIGH-ROI-HOOKS"
date: "2026-05-18"
first_ts: "2026-05-18T02:36:22.612Z"
last_ts: "2026-05-18T02:38:59.653Z"
cwd: "H:\\prism"
messages: 14
user_msgs: 6
assistant_msgs: 8
raw_file: "H:/.claude/projects/H--prism/3b735015-a3e0-4ba4-8b97-35384113b9f9/subagents/agent-a3440db642b1d3aac.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:11"
---

# Independent review of two new files for a PRISM Claude Code hook (HIGH-ROI-HOOKS

> **claude-code-cli** | 2026-05-18 | 14 msgs (6 user / 8 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/3b735015-a3e0-4ba4-8b97-35384113b9f9/subagents/agent-a3440db642b1d3aac.jsonl`

## Transcript

### User | 2026-05-18T02:36:22.612Z

Independent review of two new files for a PRISM Claude Code hook (HIGH-ROI-HOOKS-MS0 / U-HRH02). Read both END TO END — assume nothing was caught by anyone else:
FILE 1: H:\PRISM\.claude\hooks\mcp-readonly-cache.mjs
FILE 2: H:\PRISM\.claude\hooks\mcp-readonly-cache.test.mjs

This PreToolUse hook denies a duplicate read-only `mcp__prism*` dispatcher call within a 3-min TTL (the prior result is already in the transcript). Sibling pattern: H:\PRISM\.claude\hooks\bash-result-cache.mjs.

Weight the review toward what a correctness reviewer is likely to MISS:
1. SAFETY of the read-only classifier: `isReadOnlyAction` decides whether an action may be denied. A FALSE POSITIVE (a mutating action classified read-only) is the dangerous case — denying its re-call drops a state mutation. Stress `MUTATING_VERB` and `READ_SUFFIX`: think of PRISM dispatcher actions that END in a read suffix but actually mutate, or that contain no listed mutating verb but still mutate (e.g. an action whose verb is `scan`, `predict`, `analyze`, `plan`, `evaluate`, `check`, `compute`, `detect`, `classify`, `rank`, `score`, `calc`, `assess` — are any of those mutating in PRISM? are they correctly NOT cached?). Also: an action that is read-only but whose RESULT is time-sensitive (`*_status`, `*_health`) — is a 3-min stale deny acceptable? Is the deny message honest about it?
2. The deny-loop escape: is the promise "the next attempt passes through" always kept? Trace `denies[key]` lifecycle — set on deny, cleared on the escape-pass AND overwritten on a miss. Edge: deny, then a DIFFERENT key call, then the same key again — does the escape still hold?
3. `stableStringify`: `JSON.stringify(v) ?? "null"` — when does `JSON.stringify` return `undefined`? (functions, undefined values inside params.) Does the `?? "null"` fallback create a key collision risk (two different param objects with `undefined` values → same key)? Is that a real wrong-deny risk or benign?
4. Concurrency: per-session file RMW with no lock.
... [+693 chars truncated]

### Assistant | 2026-05-18T02:36:38.987Z

I'll review both files end to end. Let me read them.

### Assistant | 2026-05-18T02:36:39.328Z

[tool_use: Read]

### Assistant | 2026-05-18T02:36:39.733Z

[tool_use: Read]

### Assistant | 2026-05-18T02:36:40.099Z

[tool_use: Read]

### User | 2026-05-18T02:36:43.543Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T1
3	/**
4	 * mcp-readonly-cache.mjs — duplicate read-only MCP dispatcher-call guard.
5	 *
6	 * HIGH-ROI-HOOKS-MS0 / U-HRH02. The MCP-tier sibling of bash-result-cache:
7	 * PRISM backend dev makes hundreds of `mcp__prism…` dispatcher calls per
8	 * session and frequently re-issues an IDENTICAL read-only one (re-checking
9	 * `gap_scan_read`, `db_health`, `master_i
... [+9473 chars truncated]

### User | 2026-05-18T02:36:43.717Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T1
3	/**
4	 * mcp-readonly-cache.test.mjs — HIGH-ROI-HOOKS-MS0 / U-HRH02.
5	 *
6	 * Pure-function coverage + subprocess integration oracles. Several oracles
7	 * are fail-on-revert guards: the "mutating action is never denied" oracle
8	 * would FAIL if the safety filter were reverted.
9	 *
10	 * Run: node --test H:/prism/.claude/hooks/mcp-readonly-cache.test.mjs
11
... [+9146 chars truncated]

### User | 2026-05-18T02:36:43.720Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T1
3	/**
4	 * Bash Result Cache — PreToolUse Hook
5	 *
6	 * Blocks duplicate Bash executions within a session for a narrow whitelist
7	 * of read-only, idempotent commands. Saves tokens on repeat `git log`,
8	 * `git diff`, `ls`, `wc`, `stat`-type probes that already returned in this
9	 * session.
10	 *
11	 * Cache key: sessionId + normalized command + cwd
12	 *
13
... [+6468 chars truncated]

### Assistant | 2026-05-18T02:36:48.578Z

Now let me verify a few PRISM dispatcher action semantics that are load-bearing for the safety review.

### Assistant | 2026-05-18T02:36:50.287Z

[tool_use: Grep]

### Assistant | 2026-05-18T02:36:51.080Z

[tool_use: Grep]

### User | 2026-05-18T02:36:53.180Z

[tool_result] No matches found

### User | 2026-05-18T02:36:57.852Z

[tool_result] No files found

### Assistant | 2026-05-18T02:38:59.653Z

I have enough to complete the review. Let me analyze the dispatcher action enums from the tool definitions, which are the canonical source.

## Review: mcp-readonly-cache.mjs + test

### Analysis of the read-only classifier against real PRISM dispatcher actions

I checked `READ_SUFFIX` / `MUTATING_VERB` against the actual dispatcher action enums in the tool schemas. Several **false positives** — mutating actions classified as read-only and therefore deny-able:

**`prism_atcs:queue_next`** — ends in `_next`... no, no read suffix. Safe.

**`prism_business` has actions ending in read suffixes that mutate** — checking the enum: `dispatch_get_queue`, `milestone_get_timeline`, `portal_get_quality_doc` are reads. But consider **`po_three_way_match`** — no read suffix, fine. The real problem cases:

**P1 — `*_list` mutating-then-listing actions misclassified.** Look at `prism_cad`: `cad_pipeline_status` is a read. But scan `prism_business`: there is **`tool_inv_reorder_list`** — ends in `_list`, contains no `MUTATING_VERB` token (`reorder` is not in the list). This action *computes a reorder list* — read-only in intent, so a deny is arguably acceptable. But the result is **time-sensitive inventory state**; a 3-min stale deny is borderline. Not a hard P1 by itself.

**P1 — the genuine false positives.** `MUTATING_VERB` is missing verbs that mutate in PRISM:

- **`prism_business:order_list`** — read. Fine.
- **`prism_cam:cam_cache_clear`** — `clear` is **NOT** in `MUTATING_VERB`. But no read suffix either, so not cached. Safe by suffix.
- **`prism_context:claim_file`** — `claim` IS listed. Good.
- **`prism_dev:checkpoint_create`** — `create` listed. Good.

The real exposure is **`prism_business:capacity_what_if`**, **`prism_cam:strategy_what_if`** — no read suffix, safe.

**The actual P0/P1 false positives I can confirm from the enums:**

1. **`prism_business:po_ap_aging`** — no read suffix, not cached. Safe.
2. **`prism_atcs:task_status`** — read suffix `status`, no mutating
... [+17827 chars truncated]
