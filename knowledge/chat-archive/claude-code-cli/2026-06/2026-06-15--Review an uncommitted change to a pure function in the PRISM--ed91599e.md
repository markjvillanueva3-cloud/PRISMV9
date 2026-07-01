---
type: "chat-session"
source: "claude-code-cli"
session_id: "ed91599e-19b8-4bdb-8ea8-87e47b6ee322"
title: "Review an uncommitted change to a pure function in the PRISM repo. Read BOTH fil"
date: "2026-06-15"
first_ts: "2026-06-15T22:19:07.074Z"
last_ts: "2026-06-15T22:20:32.452Z"
cwd: "H:\\prism-slot-sierra"
messages: 10
user_msgs: 4
assistant_msgs: 6
raw_file: "H:/.claude/projects/H--prism-slot-sierra/ed91599e-19b8-4bdb-8ea8-87e47b6ee322/subagents/agent-a9649d2bf7c2dc904.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:11"
---

# Review an uncommitted change to a pure function in the PRISM repo. Read BOTH fil

> **claude-code-cli** | 2026-06-15 | 10 msgs (4 user / 6 assistant) | cwd: H:\prism-slot-sierra
> Raw: `H:/.claude/projects/H--prism-slot-sierra/ed91599e-19b8-4bdb-8ea8-87e47b6ee322/subagents/agent-a9649d2bf7c2dc904.jsonl`

## Transcript

### User | 2026-06-15T22:19:07.074Z

Review an uncommitted change to a pure function in the PRISM repo. Read BOTH files END-TO-END:

1. H:/prism/scripts/build-milestone-progress.mjs  (modified — focus on exported `computeProgress`, the two new module-level Sets `ENVELOPE_DONE` and `TERMINAL_RESOLVED`, and the per-unit map + totals/drift/derivedStatus block, roughly lines 160-380)
2. H:/prism/scripts/build-milestone-progress.test.mjs  (added 6 test cases at the end)

INTENT (unit U-SVH-MSPROGRESS-SUPERSEDED): `computeProgress` builds, per milestone, a shipped/pending/drift report from milestone envelopes + git log. Two false-positive bugs in the milestone-envelope terminal-status vocabulary were fixed:
- (a) `superseded` units (deliberately not built) were counted toward `pending` (pending = total - shippedCount), so any milestone whose remainder is superseded falsely tripped the `claims_completed_but_units_pending` drift flag. Fix: new `TERMINAL_RESOLVED` set; per-unit `resolved` flag (only when NOT shipped); `accounted = shipped + resolved`; pending = total - accounted; drift + derivedStatus key off `accounted`.
- (b) units with envelope status `shipped` (vs only `complete`/`completed`) were NOT credited by the envelope-status fallback, so a `shipped`-status unit with no reachable git commit was mis-counted as pending. Fix: new `ENVELOPE_DONE` set {complete, completed, shipped} used (case-insensitively) at the envelope-status fallback.

VERIFY RIGOROUSLY — P0/P1/P2 with file:line, grade PASS/FAIL:
- Correctness: is `resolved` correctly mutually-exclusive with `shipped` (the `!isShipped &&` guard)? Can a unit be double-counted (both shipped and resolved), making accounted > total and pending negative? Walk the arithmetic: total = ms.units.length; does accounted ever exceed total?
- Does the drift logic still FIRE correctly for genuinely-pending units (a `completed` milestone with a real `not_started` unit must still flag `claims_completed_but_units_pending`)? Confirmed live: MS-DOCU-FINISH (pending3/re
... [+1216 chars truncated]

### Assistant | 2026-06-15T22:19:11.445Z

I'll read both files end-to-end before drawing any conclusions.

### Assistant | 2026-06-15T22:19:11.608Z

[tool_use: Read]

### Assistant | 2026-06-15T22:19:11.622Z

[tool_use: Read]

### User | 2026-06-15T22:19:17.514Z

[tool_result] 1	/**
2	 * build-milestone-progress.test.mjs — joint-unit regex + expandCombinedIds
3	 *
4	 * Regression coverage for the silent-close-out class of bugs where ship
5	 * commits using joint subjects like `[INTEL-OLLAMA-OBSIDIAN-MS0]/P23-U01+U02`
6	 * failed to credit one or more of the joint units in MILESTONE_PROGRESS.json.
7	 *
8	 * Two failure modes are pinned here:
9	 *   1. The phase-style reg
... [+13191 chars truncated]

### User | 2026-06-15T22:19:17.519Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * build-milestone-progress.mjs
4	 *
5	 * Generates state/shared/MILESTONE_PROGRESS.md + .json — a delta surface
6	 * showing what's actually shipped per milestone vs what the milestone
7	 * envelope JSONs claim.
8	 *
9	 * Why: roadmap-index.json carries `status: "not_started"` for milestones
10	 * we've already shipped 5+ units of (e.g. XPROC-NEURAL-OPTIMIZE-MS0 has

... [+26996 chars truncated]

### Assistant | 2026-06-15T22:19:21.045Z

Both files read end-to-end. Now I'll do the rigorous arithmetic and logic walk before rendering a verdict.

### Assistant | 2026-06-15T22:19:22.739Z

[tool_use: Grep]

### User | 2026-06-15T22:19:23.553Z

[tool_result] 15: * subtract "actually shipped" from "claimed pending".
22: *   4. Per milestone: total | shipped | pending counts; per unit a
108:  // that matches no envelope unit (silent close-out drift). All-digit parts
266:// unit with no reachable commit was mis-counted as pending (the sibling of the
268:export const ENVELOPE_DONE = new Set(["complete", "completed", "shipped"]);
271:// so they are RESOLVE
... [+3081 chars truncated]

### Assistant | 2026-06-15T22:20:32.452Z

I have everything I need. Let me now walk through each verification axis systematically.

---

**ARITHMETIC WALK — can `accounted` exceed `total`?**

`total = ms.units.length` (line 365)
Each unit goes through `ms.units.map(...)` (line 305) — exactly one iteration per unit.
Inside the map, `isShipped = !!hit` (line 338). `isResolved = !isShipped && TERMINAL_RESOLVED.has(...)` (line 347). The `!isShipped &&` guard is load-bearing: it makes the two flags strictly mutually exclusive. A unit can be in exactly one of three states: {shipped, resolved, neither}. `shippedCount` increments only on `isShipped`, `resolvedCount` only on `isResolved`. Since no unit can increment both, `accounted = shippedCount + resolvedCount` is bounded by `ms.units.length` exactly — `accounted` cannot exceed `total`, `pending` cannot go negative. **Double-counting is structurally impossible.**

---

**DOES THE DRIFT FLAG STILL FIRE ON GENUINELY-PENDING UNITS?**

Drift condition (line 400): `ms.status === "completed" && accounted < total`. A `not_started` unit has `envelopeStatus` that is either `null` or the literal string `"not_started"`. Neither appears in `ENVELOPE_DONE` (line 268: `{"complete","completed","shipped"}`) nor in `TERMINAL_RESOLVED` (line 276-284). So `isShipped=false`, `isResolved=false`, the unit contributes to `pending`, `accounted < total` holds, and the flag fires correctly. The code path for true-positive preservation is solid.

---

**DERIVEDSTATUS REORDER — edge cases**

New order (lines 387-394):
1. `total === 0` → `"no_units"`
2. `accounted === total` → `"completed_real"`
3. `shippedCount === 0` → `"not_started_real"`
4. else → `"in_progress_real"`

**Finding P1: 0-shipped + all-superseded milestone gets `"completed_real"` but `claimedStatus` of `"not_started"` does NOT trigger the `claims_not_started_but_has_shipped_units` drift check.** The drift check at line 399 gates on `shippedCount > 0`. An all-superseded milestone with `ms.status === "not_started"` will get `d
... [+8965 chars truncated]
