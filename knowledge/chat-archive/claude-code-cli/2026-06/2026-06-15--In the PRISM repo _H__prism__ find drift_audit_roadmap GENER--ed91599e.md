---
type: "chat-session"
source: "claude-code-cli"
session_id: "ed91599e-19b8-4bdb-8ea8-87e47b6ee322"
title: "In the PRISM repo (H:/prism), find drift/audit/roadmap GENERATOR scripts under s"
date: "2026-06-15"
first_ts: "2026-06-15T23:19:49.777Z"
last_ts: "2026-06-15T23:28:22.074Z"
cwd: "H:\\prism-slot-sierra"
messages: 49
user_msgs: 20
assistant_msgs: 29
raw_file: "H:/.claude/projects/H--prism-slot-sierra/ed91599e-19b8-4bdb-8ea8-87e47b6ee322/subagents/agent-a63655531f1eab98b.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:11"
---

# In the PRISM repo (H:/prism), find drift/audit/roadmap GENERATOR scripts under s

> **claude-code-cli** | 2026-06-15 | 49 msgs (20 user / 29 assistant) | cwd: H:\prism-slot-sierra
> Raw: `H:/.claude/projects/H--prism-slot-sierra/ed91599e-19b8-4bdb-8ea8-87e47b6ee322/subagents/agent-a63655531f1eab98b.jsonl`

## Transcript

### User | 2026-06-15T23:19:49.777Z

In the PRISM repo (H:/prism), find drift/audit/roadmap GENERATOR scripts under scripts/*.mjs and scripts/lib/*.mjs with status-vocabulary or crediting bugs SIBLING to one just fixed in build-milestone-progress.mjs (it was miscounting `superseded` and `shipped`-status units as pending, falsely tripping a `claims_completed_but_units_pending` drift flag; the fix added ENVELOPE_DONE={complete,completed,shipped} + TERMINAL_RESOLVED={superseded,...} sets).

READ the actual pending/shipped/status/drift logic in candidate files. Look for: hardcoded partial status lists (e.g. only checks 'complete'/'completed' but not 'shipped'; treats 'superseded'/'cancelled' as pending), a terminal status counted as not-done, cry-wolf drift signals, or `=== "complete"` style checks that should use a set.

Candidate files to inspect: scripts/build-state-snapshot.mjs, scripts/consolidate-roadmaps.mjs, scripts/node-staleness-rank.mjs, scripts/audit-close-out-candidates.mjs, scripts/close-out-milestone.mjs, scripts/roadmap-index*.mjs, scripts/svi-*.mjs, any scripts/*roadmap*.mjs or scripts/*milestone*.mjs or scripts/*progress*.mjs.

NOTE: build-milestone-progress.mjs itself is ALREADY FIXED (do not report it). node-staleness-rank.mjs CONSUMES MILESTONE_PROGRESS via regex (already transitively correct) - only report it if it has its OWN independent status logic.

Return a concise list. For each real finding: the file:line, the exact wrong logic (quote it), why it is a bug, and how to fix it. Report ONLY issues you can SEE in the code after reading it - no guesses. If a file is clean, say so. Default to fewer, high-confidence findings.

### Assistant | 2026-06-15T23:19:56.521Z

I'll systematically read the candidate files to find status-vocabulary bugs. Let me start with parallel reads of the most likely candidates.

### Assistant | 2026-06-15T23:19:57.046Z

[tool_use: Glob]

### Assistant | 2026-06-15T23:19:57.294Z

[tool_use: Glob]

### Assistant | 2026-06-15T23:19:57.487Z

[tool_use: Glob]

### User | 2026-06-15T23:20:09.678Z

[tool_result] No files found

### User | 2026-06-15T23:20:09.719Z

[tool_result] No files found

### User | 2026-06-15T23:20:09.769Z

[tool_result] No files found

### Assistant | 2026-06-15T23:20:13.510Z

The scripts are in the H:/prism main tree. Let me look there directly.

### Assistant | 2026-06-15T23:20:13.665Z

[tool_use: Glob]

### User | 2026-06-15T23:20:23.847Z

[tool_result] No files found

### Assistant | 2026-06-15T23:20:27.183Z

The H:/prism path isn't the working directory. Let me use the actual working directory.

### Assistant | 2026-06-15T23:20:28.145Z

[tool_use: Bash]

### User | 2026-06-15T23:20:42.035Z

[tool_result] H:/prism/scripts/_audit-foxtrot-mill-cam.mjs*
H:/prism/scripts/_classify-hooks.mjs*
H:/prism/scripts/_emergency-unwire-yolo-25.mjs*
H:/prism/scripts/_hook-audit-report.mjs*
H:/prism/scripts/_oneshot-rename-last-night.mjs*
H:/prism/scripts/_prep-hook-slices.mjs*
H:/prism/scripts/_restore-3-critical-hooks.mjs*
H:/prism/scripts/_restore-continuity-hooks.mjs*
H:/prism/scripts/_sfc-probe.mjs
H:/prism/s
... [+1936 chars truncated]

### Assistant | 2026-06-15T23:20:44.267Z

Now let me read the specific candidate files in parallel.

### Assistant | 2026-06-15T23:20:44.694Z

[tool_use: Read]

### Assistant | 2026-06-15T23:20:45.082Z

[tool_use: Read]

### Assistant | 2026-06-15T23:20:45.603Z

[tool_use: Read]

### User | 2026-06-15T23:20:54.938Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * build-state-snapshot.mjs
4	 *
5	 * Permanent-memory generator for "what's the state of PRISM right now?"
6	 * Auto-fed by SessionStart and the build-state-inject UserPromptSubmit
7	 * hook. Replaces ad-hoc derivation in every chat.
8	 *
9	 * Four dimensions answered:
10	 *   1. BUILT          — engines on disk that ARE wired and have wiki entries
11	 *   2. NEEDS_W
... [+30699 chars truncated]

### User | 2026-06-15T23:20:54.963Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * audit-close-out-candidates.mjs
4	 *
5	 * Cross-envelope close-out auditor. Detects units whose status is still
6	 * "pending" in `mcp-server/data/milestones/*.json` BUT whose declared
7	 * deliverable artifacts already exist on disk — i.e. silent close-out
8	 * debt.
9	 *
10	 * Output:
11	 *   - state/shared/CLOSE-OUT-CANDIDATES.json (machine)
12	 *   - state/share
... [+27178 chars truncated]

### User | 2026-06-15T23:20:54.991Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * consolidate-roadmaps.mjs — unify every PRISM roadmap into one inventory.
4	 *
5	 * Spec: ROADMAP-CONSOLIDATION (slot juliett, forge7, 2026-05-16).
6	 *
7	 * PRISM's planned work is scattered across uncoordinated sources. This script
8	 * merges them into a single consolidated inventory + a bridge/synergy layer:
9	 *
10	 *   STRUCTURED sources (deterministic):
11	 *
... [+24481 chars truncated]

### Assistant | 2026-06-15T23:21:01.329Z

Now let me read the remaining candidate files in parallel.

### Assistant | 2026-06-15T23:21:02.276Z

[tool_use: Read]

### Assistant | 2026-06-15T23:21:02.473Z

[tool_use: Read]

### Assistant | 2026-06-15T23:21:03.166Z

[tool_use: Bash]

### User | 2026-06-15T23:21:32.155Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * node-staleness-rank.mjs — META artifact for /forge-audit-v2
4	 *
5	 * Re-runnable measurement: ranks stale canonical-truth-source nodes,
6	 * recall/routing health, coverage gaps, and INJECTION QUALITY (auto-injection
7	 * hooks that fire on UserPromptSubmit/SessionStart).
8	 *
9	 * USAGE:
10	 *   node scripts/node-staleness-rank.mjs           # human-readable
11	 
... [+17764 chars truncated]

### User | 2026-06-15T23:21:37.879Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * close-out-milestone.mjs — One-command roadmap close-out (feedback_roadmap_close_out).
4	 *
5	 * Touches the four downstream surfaces that drift when you stop at the envelope:
6	 *
7	 *   1. mcp-server/data/milestones/<ID>.json   (verify, normalize updated_at)
8	 *   2. mcp-server/data/roadmap-index.json     (status, completed_units, completed_at)
9	 *   3. state/sh
... [+26542 chars truncated]

### User | 2026-06-15T23:25:09.706Z

[tool_result] generate-svi-component-features.mjs*

### Assistant | 2026-06-15T23:25:12.960Z

Now let me read the lib files that handle the actual status-classification logic:

### Assistant | 2026-06-15T23:25:13.346Z

[tool_use: Read]

### Assistant | 2026-06-15T23:25:14.202Z

[tool_use: Read]

### Assistant | 2026-06-15T23:25:14.658Z

[tool_use: Bash]

### User | 2026-06-15T23:25:58.238Z

[tool_result] 1	/**
2	 * silent-close-out-drift.mjs — detect envelope-complete + MILESTONE_PROGRESS-zero drift.
3	 *
4	 * A milestone envelope can have `status: complete` and `units[].status: complete` for all
5	 * units, while `MILESTONE_PROGRESS.json` (derived from git commit subjects matching
6	 * `[SCOPE]/U-ID`) shows `shipped: 0`. This happens when:
7	 *   - Units shipped under non-tagged commit subjects (
... [+6344 chars truncated]

### User | 2026-06-15T23:25:58.323Z

[tool_result] 1	/**
2	 * partial-milestone-drift.mjs — detect in-progress milestone + pending unit with on-disk engine.
3	 *
4	 * THIRD silent-drift class (after `silent-close-out-drift.mjs`'s envelope-complete-but-shipped-0
5	 * and `audit-close-out-candidates.mjs`'s envelope-pending-but-files-exist):
6	 *   envelope.status = "in_progress"
7	 *   + unit.status = "pending"
8	 *   + unit.title contains `XxxEngin
... [+5139 chars truncated]

### User | 2026-06-15T23:26:41.594Z

[tool_result] generate-svi-component-features.mjs*

### Assistant | 2026-06-15T23:26:44.945Z

Now let me check the roadmap-index script and the SVI script, plus look at the `build-milestone-progress.mjs` to understand the fixed pattern for comparison:

### Assistant | 2026-06-15T23:26:45.776Z

[tool_use: Bash]

### Assistant | 2026-06-15T23:26:47.059Z

[tool_use: Bash]

### User | 2026-06-15T23:27:07.472Z

[tool_result] TOOLKIT_ROADMAP.md
add-cleanup-roadmap-to-atomic.mjs*
audit-roadmap-drift.mjs*
audit-roadmap-viz-bindings.mjs*
consolidate-roadmaps.mjs*
consolidate-roadmaps.test.mjs*
emit-revenue-roadmap-html.mjs*
enrich-roadmap-knowledge.mjs*
export_roadmap_queue.py
generate-dormant-engine-roadmap.mjs*
inject-tribal-pipeline-into-atomic-roadmap.mjs*
merge-roadmap-sections.mjs*
reconcile-roadmap-drift.mjs*
recon
... [+193 chars truncated]

### User | 2026-06-15T23:27:09.523Z

[tool_result] 6: * showing what's actually shipped per milestone vs what the milestone
10: * we've already shipped 5+ units of (e.g. XPROC-NEURAL-OPTIMIZE-MS0 has
12: * shipped, but the envelope still says "not_started"). Parallel audit
15: * subtract "actually shipped" from "claimed pending".
22: *   4. Per milestone: total | shipped | pending counts; per unit a
23: *      shipped:true|false flag with commit S
... [+2334 chars truncated]

### Assistant | 2026-06-15T23:27:13.014Z

Now let me check `audit-roadmap-drift.mjs` and `reconcile-roadmap-drift.mjs`, and read the full build-milestone-progress around the TERMINAL_RESOLVED/ENVELOPE_DONE definitions:

### Assistant | 2026-06-15T23:27:13.438Z

[tool_use: Read]

### Assistant | 2026-06-15T23:27:13.811Z

[tool_use: Read]

### User | 2026-06-15T23:27:29.362Z

[tool_result] 1	#!/usr/bin/env node
2	// Audit roadmap-index.json against git log to detect status drift.
3	// For each milestone: count unique U-<unit-id> commits, compare to recorded
4	// completed_units. Emits drift report + suggested patches.
5	
6	import { execFileSync } from "node:child_process";
7	import { readFileSync, writeFileSync } from "node:fs";
8	import { resolve } from "node:path";
9	
10	const REP
... [+2756 chars truncated]

### User | 2026-06-15T23:27:30.307Z

[tool_result] 260	}
261	
262	// Terminal-DONE statuses: the envelope asserts the unit shipped. When no git
263	// commit proves it, the unit is still credited as shipped via the envelope-status
264	// fallback (and surfaced in envelopeAssertedCount as no-git-proof). "shipped" was
265	// previously NOT recognized here -- only complete/completed -- so a status:"shipped"
266	// unit with no reachable commit was mi
... [+5688 chars truncated]

### Assistant | 2026-06-15T23:27:35.984Z

I now have enough to make confident findings. Let me do one final targeted check on the `close-out-milestone.mjs` self-test guard (line 459) and the `partial-milestone-drift.mjs` `isOpenEnvelope` function:

### Assistant | 2026-06-15T23:27:39.572Z

[tool_use: Grep]

### User | 2026-06-15T23:27:45.137Z

[tool_result] H:\prism\scripts\agents\spawned-agent-context-lib.mjs:325:  const drifts = ms.filter((m) => m.claimedStatus !== m.derivedStatus).length;
H:\prism\scripts\allocate-domains-to-slots.mjs:87:  if (pending.length === 0 && prose.length === 0) {
H:\prism\scripts\audit-close-out-candidates.mjs:63:const PENDING_STATUSES = new Set([
H:\prism\scripts\audit-close-out-candidates.mjs:367:    if (!PENDING_STATUS
... [+7527 chars truncated]

### Assistant | 2026-06-15T23:28:22.074Z

I now have all the evidence I need. Here are the findings:

---

## Findings

### FINDING 1 — `scripts/lib/partial-milestone-drift.mjs:31-33` — `isOpenEnvelope` missing `"shipped"` from terminal set

**Wrong logic (lines 31-33):**
```js
function isOpenEnvelope(env) {
  const s = String(env?.status || "").toLowerCase();
  return s !== "complete" && s !== "completed" && s !== "shipped" && s !== "done";
}
```

This one is actually **correct** — it does include `"shipped"` and `"done"`. No bug here.

---

### FINDING 2 — `scripts/audit-roadmap-drift.mjs:14` — `SKIP_STATUSES` missing `"completed"` and `"shipped"`

**File:** `H:/prism/scripts/audit-roadmap-drift.mjs:14`

**Wrong logic:**
```js
const SKIP_STATUSES = new Set(["complete", "superseded", "consolidated", "deprecated"]);
```

**Why it is a bug:** The roadmap-index uses both `"complete"` (the canonical word written by `close-out-milestone.mjs`) and `"completed"` (the envelope canonical word, written in legacy entries and by operators). A milestone with `status: "completed"` in `roadmap-index.json` is done, but this set does not contain `"completed"`, so `audit-roadmap-drift` will re-analyze it, re-count its git commits, and potentially emit a spurious drift record for a fully-closed milestone. Similarly, `"shipped"` appears as a roadmap-index status in some envelopes (it is in `ENVELOPE_DONE` in `build-milestone-progress.mjs`) and would also not be skipped, generating cry-wolf drift reports for finished milestones.

**Fix:** Add the missing terminal synonyms:
```js
const SKIP_STATUSES = new Set(["complete", "completed", "shipped", "done", "superseded", "consolidated", "deprecated"]);
```

---

### FINDING 3 — `scripts/close-out-milestone.mjs:459` — self-test failure-mode guard only checks `"completed"`, not `"complete"`

**File:** `H:/prism/scripts/close-out-milestone.mjs:456-460`

**Wrong logic:**
```js
const env = { id: "X", status: "in_progress", completed_units: 2, total_units: 3 };
const force = false;
const
... [+3710 chars truncated]
