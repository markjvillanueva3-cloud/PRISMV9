---
type: "chat-session"
source: "claude-code-cli"
session_id: "fbf28cc9-fd37-46b5-b8f8-0fd7aeae650f"
title: "Review a patched Stop hook for correctness. Read the WHOLE file end-to-end: `H:/"
date: "2026-05-18"
first_ts: "2026-05-18T02:14:31.335Z"
last_ts: "2026-05-18T02:15:18.593Z"
cwd: "H:\\prism"
messages: 5
user_msgs: 2
assistant_msgs: 3
raw_file: "H:/.claude/projects/H--prism/fbf28cc9-fd37-46b5-b8f8-0fd7aeae650f/subagents/agent-aa6a6a147b9e32eb4.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:33"
---

# Review a patched Stop hook for correctness. Read the WHOLE file end-to-end: `H:/

> **claude-code-cli** | 2026-05-18 | 5 msgs (2 user / 3 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/fbf28cc9-fd37-46b5-b8f8-0fd7aeae650f/subagents/agent-aa6a6a147b9e32eb4.jsonl`

## Transcript

### User | 2026-05-18T02:14:31.335Z

Review a patched Stop hook for correctness. Read the WHOLE file end-to-end: `H:/prism/.claude/hooks/stop-memory-size-watchdog.mjs`.

CONTEXT — what the patch does:
This is a Claude Code Stop hook (T3, non-blocking). Pre-patch it only WARNED when `C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md` reached ≥90% of the 24,576-byte Anthropic-harness truncation ceiling (a documented context-retention regression — past the ceiling the harness silently truncates the file, breaking fleet-wide memory recall).

The patch adds an ACT step: when MEMORY.md is at/over WARN, the hook now spawns `H:/prism/scripts/memory-compact.mjs --json` (a separate, well-tested rotator: lock-guarded, atomic write, verify-after-write, abort-not-proceed, self-throttled 30min — it rotates the oldest index entries to MEMORY-ARCHIVE.md). The hook re-stats MEMORY.md afterward and: (a) if now under WARN and a real rotation happened → emits a one-line ✅ confirmation (12h-throttled); (b) if still over → emits a result-aware ⚠️ advisory; (c) silent if compaction resolved it without rotating.

VERIFY THESE PROPERTIES — flag any as P0/P1:
1. Fail-soft: a compaction spawn failure / timeout / parse error must NEVER break Stop — must degrade to advisory-only (the pre-patch behavior). Check `tryCompact()` returns null cleanly on every failure mode and the caller handles null.
2. Flow ordering: the compaction ACT must run BEFORE the 12h advisory-throttle gate (`lastFireAgeMs() < TTL_MS`) — compaction cadence is owned by memory-compact's own 30min throttle, not the 12h advisory throttle. Confirm the ACT block is not throttled by the 12h gate.
3. Portable-node: the spawn uses `process.execPath` not bare "node" (PRISM runs portable-node; bare "node" → ENOENT).
4. Timeout budget: the Stop-hook budget is 3000ms; the spawn timeout (COMPACT_TIMEOUT_MS) must leave headroom.
5. No regression to pre-patch paths: under-WARN still `silent()`; disabled knob still `silent()`; the advisory still emits when genuinely st
... [+648 chars truncated]

### Assistant | 2026-05-18T02:14:42.313Z

I'll review the patched Stop hook end-to-end.

### Assistant | 2026-05-18T02:14:42.926Z

[tool_use: Read]

### User | 2026-05-18T02:14:47.579Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T3
3	/**
4	 * stop-memory-size-watchdog.mjs — Stop hook (T3, auto-compact + advisory)
5	 *
6	 * OBSOLESCENCE-CLEANUP-MS0/U-OBS-B1 (2026-05-17, slot mike).
7	 * ACT step added 2026-05-18 (slot echo) — see "Auto-compaction" below.
8	 *
9	 * Surfaces a one-line advisory at Stop when MEMORY.md is at or past the
10	 * 24,576-byte truncation ceiling. The U-MEMORY-COMPRES
... [+7844 chars truncated]

### Assistant | 2026-05-18T02:15:18.593Z

# VERDICT: PASS (with 2 P1 findings)

The patch is fundamentally sound — fail-soft is correct, ACT runs before the advisory throttle, portable-node is used, and the recompute logic is correct. Two real issues warrant fixing before this is robust under all the stated result shapes.

## Findings

**P1 — `compact.skipped` advisory branch is mislabeled for the `under_target` shape.** memory-compact returns `{ok:true,archived:0,reason:"under_target"}` when nothing to rotate. If MEMORY.md is over WARN but memory-compact computes "nothing to archive" (e.g. its archive target differs from this hook's WARN threshold, or all entries are pinned), `tryCompact()` returns that object. The `why` ladder (lines 174-178) then falls through to the *last* branch — `"auto-compaction ran but the index is still over threshold"` — which is actually correct text here. But the more subtle bug: there is **no `archived === 0 && reason` branch**, so an operator sees "ran but still over" with zero diagnostic of *why* it couldn't help (under_target vs genuinely-too-large). Recommend adding: `compact.ok && compact.archived === 0 ? \`auto-compaction made no change (${compact.reason || "nothing to rotate"})\` : ...` before the final fallback. Not silent breakage, but the advisory misleads the operator into running `--force` when `--force` won't help either.

**P1 — `lastFireMs` validation gap in `lastFireAgeMs()`.** Line 75: `Date.now() - (j.lastFireMs || 0)`. If the marker JSON is corrupt-but-parseable (e.g. `{"lastFireMs":"abc"}` or a future timestamp), `Date.now() - "abc"` → `NaN`, and `NaN < TTL_MS` and `NaN >= TTL_MS` are both `false`. Effect: the `archived > 0` confirmation branch (line 159) silently never fires (NaN fails `>= TTL_MS`), AND the advisory throttle (line 170) never throttles (NaN fails `< TTL_MS`) → advisory spams every Stop. Low-probability but it's an unhandled poison-input. Guard with `Number.isFinite(j.lastFireMs)` before the subtraction, returning `Infinity` otherwise.

## P
... [+2817 chars truncated]
