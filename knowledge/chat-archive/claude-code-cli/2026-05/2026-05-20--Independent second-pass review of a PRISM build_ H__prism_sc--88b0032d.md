---
type: "chat-session"
source: "claude-code-cli"
session_id: "88b0032d-0552-493b-a189-33c54e0904e9"
title: "Independent second-pass review of a PRISM build: H:/prism/scripts/handoff-prune-"
date: "2026-05-20"
first_ts: "2026-05-20T23:05:26.349Z"
last_ts: "2026-05-20T23:06:17.906Z"
cwd: "H:\\prism"
messages: 7
user_msgs: 3
assistant_msgs: 4
raw_file: "H:/.claude/projects/H--prism/88b0032d-0552-493b-a189-33c54e0904e9/subagents/agent-a27e53ebcc372eb20.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:16"
---

# Independent second-pass review of a PRISM build: H:/prism/scripts/handoff-prune-

> **claude-code-cli** | 2026-05-20 | 7 msgs (3 user / 4 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/88b0032d-0552-493b-a189-33c54e0904e9/subagents/agent-a27e53ebcc372eb20.jsonl`

## Transcript

### User | 2026-05-20T23:05:26.349Z

Independent second-pass review of a PRISM build: H:/prism/scripts/handoff-prune-cron.mjs + its test H:/prism/scripts/handoff-prune-cron.test.mjs (ECHO-UNDONE H6 — a monthly cron archiving handoff files older than 30 days from state/shared/handoffs/ into state/shared/handoffs/archive/<YYYY-MM>/).

Read both files fully. Do NOT assume the other reviewer caught everything. Weight your attention toward:
- Data-loss risk: archiving is fs.renameSync (move). If the destination archive/<YYYY-MM>/ and the source are on the same volume, rename is atomic — confirm. The clobber guard `if (fs.existsSync(dest)) continue;` — does this SILENTLY skip a file that should be archived, leaving it in the live dir forever AND not counted? Is that the right behavior or a silent-failure (R12)?
- Recursion safety: readHandoffFiles must NOT pick up files inside archive/ on a re-run (or it would re-archive them into archive/archive/...). It uses readdirSync(withFileTypes) + ent.isFile() — a subdirectory entry is not a file so it's skipped. Verify that reasoning holds and there's no path where an archived file re-enters the plan.
- Throttle correctness: the cron self-throttles to 30 days. On the FIRST ever run (no .prune-throttle.json) it must run. After a throttled (skipped) apply-run, is the throttle sidecar left untouched (so the next run still sees "due")? Trace it.
- parseWrittenAt robustness against a malformed/huge frontmatter; the readFileSync(...).slice(0,1024) head read.
- Determinism, magic numbers, naming vs sibling scripts.
- Test integrity: do the 14 tests encode WHY? Any tautological assertion?

Flag every P0 and P1. Grade PASS or FAIL. Report under 300 words.

### Assistant | 2026-05-20T23:05:45.491Z

I'll review both files now.

### Assistant | 2026-05-20T23:05:45.737Z

[tool_use: Read]

### Assistant | 2026-05-20T23:05:45.886Z

[tool_use: Read]

### User | 2026-05-20T23:06:02.861Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * handoff-prune-cron.mjs — ECHO-UNDONE H6 / U-HANDOFF-PRUNE-CRON.
4	 *
5	 * Counters handoff sprawl across the 26-slot fleet. state/shared/handoffs/
6	 * accumulates one HANDOFF-*.md per chat per topic and never self-cleans — 600+
7	 * files today. This archives every handoff untouched for >30 days into
8	 * state/shared/handoffs/archive/<YYYY-MM>/ (grouped by the ha
... [+9338 chars truncated]

### User | 2026-05-20T23:06:03.548Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * Tests for handoff-prune-cron.mjs (ECHO-UNDONE H6 / U-HANDOFF-PRUNE-CRON).
4	 * Run: node --test scripts/handoff-prune-cron.test.mjs
5	 */
6	import { test } from "node:test";
7	import assert from "node:assert/strict";
8	import {
9	  archiveSubdir,
10	  parseWrittenAt,
11	  planArchive,
12	  shouldRun,
13	  STALE_DAYS,
14	  THROTTLE_DAYS,
15	} from "./handoff-prune-c
... [+5299 chars truncated]

### Assistant | 2026-05-20T23:06:17.906Z

Independent second-pass review complete. Findings below.

## P1 Findings

**P1-1 — Throttle/dry-run schism (R12 silent-failure class).** The throttle gate (`shouldRun`) only governs `--apply`. But `writeThrottle` is only called *inside* the apply branch *after* moves succeed. Consider: `--apply` on a fleet host where `plan.length === 0` (line 187 returns at 190 *before* the throttle gate at 199 and before `writeThrottle`). A real apply-run with nothing stale **never records `lastRunAt`**. Next run still sees "no prior run recorded" → not actually throttled. The throttle only arms once at least one file moves. For a 30-day cadence that may be fine, but it is not what the doc claims ("self-throttles to once per 30 days"). Either move `writeThrottle` to fire on any non-throttled apply-run, or document that empty applies don't arm the throttle.

**P1-2 — `existsSync(dest) → continue` is a silent skip (R12).** A name-collision archived file is skipped, **left in the live dir forever, and not counted in `archived`**. JSON output `eligible` still counts it but nothing surfaces that it was orphaned. Handoff names are `HANDOFF-<instance>-<topic>.md`; an instance id can recur. This should log a `skipped[]` list or emit a WARN — currently it's a silent no-op masquerading as success.

## P0 Findings
None.

## Confirmed safe
- **Recursion:** `readdirSync(withFileTypes)` + `ent.isFile()` correctly skips the `archive/` subdir; no path re-archives. Sound.
- **Atomicity:** `archive/` is under `HANDOFFS_DIR` (same volume) → `renameSync` is atomic. Correct.
- **`parseWrittenAt`:** anchored `^...$/im` regex over a 1024-byte head; malformed/huge frontmatter degrades to `null` → mtime fallback. Robust.
- **Boundary test** (`STALE_DAYS` exact vs 1ms-under) and **non-HANDOFF/NaN filter** tests encode *why*, not tautologies.

## Test gaps (P2, non-blocking)
- No test for the empty-apply-doesn't-arm-throttle behavior (P1-1).
- No test for the `existsSync(dest)` clobber-skip path (P1-2) — the
... [+654 chars truncated]
