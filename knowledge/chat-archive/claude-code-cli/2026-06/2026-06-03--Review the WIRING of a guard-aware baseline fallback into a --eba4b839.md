---
type: "chat-session"
source: "claude-code-cli"
session_id: "eba4b839-de67-42ff-bc0e-3836c8de27d5"
title: "Review the WIRING of a guard-aware baseline fallback into a CLI training script."
date: "2026-06-03"
first_ts: "2026-06-03T00:54:25.149Z"
last_ts: "2026-06-03T00:55:45.211Z"
cwd: "H:\\prism"
messages: 16
user_msgs: 6
assistant_msgs: 10
raw_file: "H:/.claude/projects/H--prism/eba4b839-de67-42ff-bc0e-3836c8de27d5/subagents/agent-ae1fd98d545523359.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:31"
---

# Review the WIRING of a guard-aware baseline fallback into a CLI training script.

> **claude-code-cli** | 2026-06-03 | 16 msgs (6 user / 10 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/eba4b839-de67-42ff-bc0e-3836c8de27d5/subagents/agent-ae1fd98d545523359.jsonl`

## Transcript

### User | 2026-06-03T00:54:25.149Z

Review the WIRING of a guard-aware baseline fallback into a CLI training script. Read both files end-to-end.

CHANGED FILE: H:/prism/scripts/quoting-train-cycle.mjs  (focus on lines ~106-220: the fallback-policy flags block + the main() resolver wiring that replaced the old read+guard block; and the --json success output ~330-345 where baseline_source/baseline_fallback were added)
RESOLVER it calls: H:/prism/scripts/lib/quoting-baseline-resolve.mjs (already reviewed; just confirm the call contract matches)

WHAT IT MUST DO:
- Bare invocation (no --baseline) → fall back through canonical real corpora when the default poisoned stub is guard-refused (revives a dead loop).
- Explicit --baseline with no override → STRICT (guard-refuse exits 2) — must preserve the 9 existing guard-preflight tests.
- --no-fallback / --force-degenerate → strict.
- --fallback-corpus <path> → fall back to that path.
- 0-record/missing across all candidates → exit 1. Guard-refused + no admitted fallback → exit 2 (unless --force-degenerate).

VERIFY SPECIFICALLY: (1) the fallbackList policy branches (lines ~125-131) are exhaustive and correct — is there any arg combo that picks the wrong policy? e.g. --fallback-corpus + --no-fallback together; (2) the `let guard` / `if (!guard) guard = validateBaseline(records)` recompute is safe and guard.warnings is always available at the success output; (3) exit codes preserved: was exit 1 for 0-record/missing, exit 2 for refuse; (4) does `resolved.guard` correctly carry the CONFIGURED candidate's guard (with .total/.poisoned/.clean_count) into the refuse JSON, or could those be null when records>0; (5) any place `records` could be the poisoned set silently trained on without --force-degenerate.

The live bare-default run now returns ok:true, 47905 records, baseline_fallback populated, configured_refused:true. Report P0/P1/P2 with line numbers, grade PASS/FAIL. Concise — real findings only.

### Assistant | 2026-06-03T00:54:36.557Z

I'll review the wiring of the guard-aware baseline fallback. Let me read both files end-to-end.

### Assistant | 2026-06-03T00:54:36.765Z

[tool_use: Read]

### Assistant | 2026-06-03T00:54:36.969Z

[tool_use: Read]

### User | 2026-06-03T00:54:39.821Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * quoting-train-cycle — invoke QuotingTrainingOrchestratorEngine.runOnce() from cron/scheduler.
4	 *
5	 * Operator overnight directive: "keep training the system with quoting".
6	 * yolo-iter1 shipped the orchestrator engine; yolo-iter3 ships the cron-side
7	 * invoker so the loop can actually fire every N minutes via Windows Task Scheduler.
8	 *
9	 * Reads JM Die ba
... [+24550 chars truncated]

### User | 2026-06-03T00:54:39.995Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * quoting-baseline-resolve.mjs — guard-aware baseline selection for the quoting
4	 * closed-loop training cycle.
5	 *
6	 * QUOTING-SYNERGY-MS0/U-QP-BASELINE-FALLBACK (slot:charlie 2026-06-02).
7	 *
8	 * THE BUG THIS CLOSES (the dead closed loop):
9	 *   The default training baseline is `state/shared/quoting/baseline-records.json`,
10	 *   which is a 100-record BOOTST
... [+9206 chars truncated]

### Assistant | 2026-06-03T00:54:42.680Z

Now let me read the guard to confirm the `validateBaseline` return shape (does it return `.refuse`, `.reasons`, `.warnings`, `.total`, `.poisoned`, `.clean_count`?), since the CLI consumes those fields.

### Assistant | 2026-06-03T00:54:43.142Z

[tool_use: Read]

### User | 2026-06-03T00:54:45.440Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\quoting-baseline-guard.mjs' was already read 12m ago in this session and is unchanged (mtime 1780340521190). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-03T00:54:48.744Z

The guard was already read in this session. Let me locate its return shape via Grep to confirm the field names the CLI relies on.

### Assistant | 2026-06-03T00:54:49.754Z

[tool_use: Grep]

### User | 2026-06-03T00:54:53.864Z

[tool_result] 323:  return {
363:  return {
367:    warnings: deg.warnings ?? [],
368:    total: deg.total,
369:    poisoned: deg.machineNameCount,
370:    clean_count: cleanRecords.length,

### Assistant | 2026-06-03T00:54:55.563Z

Let me read the full guard return block to confirm `.refuse` is present and the exact shape.

### Assistant | 2026-06-03T00:54:56.413Z

[tool_use: Read]

### User | 2026-06-03T00:54:59.218Z

[tool_result] 355	 * degenerate baseline (the current state) refuses outright. Fail-loud by design.
356	 */
357	export function validateBaseline(records, opts = {}) {
358	  const recs = Array.isArray(records) ? records : [];
359	  const deg = detectDegeneracy(recs, opts);
360	  const cleanRecords = recs.filter((r) => !isMachineNameCustomer(r?.customer));
361	  const reasons = [...deg.flags];
362	  const refuse 
... [+318 chars truncated]

### Assistant | 2026-06-03T00:55:45.211Z

I now have the complete picture. The guard returns `{ ok, refuse, reasons, warnings, total, poisoned, clean_count, ... }`. Let me trace each verification point carefully.

Let me verify the contract match and edge cases in detail by examining the candidate-list dedup behavior, which is central to verification point (1).

Walking through the logic:

**Verification (1) — fallbackList policy branches (lines 131-134):**
```js
if (flag("no-fallback") || forceDegenerate) fallbackList = [];     // strict
else if (fallbackOverride) fallbackList = [fallbackOverride];        // override path
else if (!explicitBaseline) fallbackList = undefined;                // bare → default corpora
else fallbackList = [];                                              // explicit, strict
```
`--fallback-corpus` + `--no-fallback` together: `no-fallback` is checked first → `[]` (strict wins). That is the safe/correct precedence — `--no-fallback` is the more conservative directive. `--fallback-corpus` + `--force-degenerate`: `forceDegenerate` first → `[]`, but force-degenerate trains on the configured set anyway, so fallback is moot. Branches are exhaustive (every path assigns `fallbackList`). No combo picks a *wrong* (less-safe) policy.

**Verification (4) — `resolved.guard` carrying the CONFIGURED candidate's guard into the refuse JSON:** This is the one real concern. Let me trace it precisely.

In the refuse JSON (lines 176-198), `guard` = `resolved.guard`. In the no-admit fallthrough (resolver lines 184-196), `resolved.guard` = `c.guard` where `c = configured ?? {...guard: null}`. The `configured` object's `guard` is only non-null when the configured candidate **parsed with >0 records AND the guard ran** (resolver line 157). 

Now the CLI refuse block is only reached when `records.length > 0` (line 159 already exited for 0 records) AND `!resolved.ok`. Can `records > 0` while `resolved.guard` is null? `records` = `resolved.records` = `c.records`. In the no-admit return, `c.records` is non-em
... [+7410 chars truncated]
