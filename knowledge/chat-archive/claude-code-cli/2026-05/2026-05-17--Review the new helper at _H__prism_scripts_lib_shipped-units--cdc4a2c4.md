---
type: "chat-session"
source: "claude-code-cli"
session_id: "cdc4a2c4-eeb5-4533-9a1e-da4d27dadc81"
title: "Review the new helper at `H:/prism/scripts/lib/shipped-units-source-of-truth.mjs"
date: "2026-05-17"
first_ts: "2026-05-17T23:54:36.415Z"
last_ts: "2026-05-17T23:56:46.792Z"
cwd: "H:\\prism"
messages: 38
user_msgs: 18
assistant_msgs: 20
raw_file: "H:/.claude/projects/H--prism/cdc4a2c4-eeb5-4533-9a1e-da4d27dadc81/subagents/agent-aa318914b056d63e3.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:27"
---

# Review the new helper at `H:/prism/scripts/lib/shipped-units-source-of-truth.mjs

> **claude-code-cli** | 2026-05-17 | 38 msgs (18 user / 20 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/cdc4a2c4-eeb5-4533-9a1e-da4d27dadc81/subagents/agent-aa318914b056d63e3.jsonl`

## Transcript

### User | 2026-05-17T23:54:36.415Z

Review the new helper at `H:/prism/scripts/lib/shipped-units-source-of-truth.mjs` end-to-end.

Context: PRISM had two broken /pick-unit pickers that surfaced already-shipped units to autonomous /loop iterations:
1. `scripts/slot-queue.mjs` read `MILESTONE_PROGRESS.json m.shipped` as if it were an array of unit-ids, but that field is a NUMBER (the count). So `Array.isArray(...)` was always false → shipped set always empty → every unit appeared unshipped fleet-wide.
2. `.claude/helpers/priority-queue.mjs` correctly iterated `m.units[].shipped` but missed units that are marked `status:complete` in the milestone envelope while git-inference (the build-milestone-progress.mjs producer) couldn't tag them (unit bundled into a setup commit, non-canonical commit subject, etc.). Live drift count for CLEANUP-MS0: 6 such units, all reachable by pickup before the fix.

This helper is the new shared source of truth. It unions:
(a) MILESTONE_PROGRESS.milestones[].units[].shipped===true (git-confirmed)
(b) Every milestone envelope's recursive {id, status ∈ complete-set} pairs

It is now consumed by both pickers (`scripts/slot-queue.mjs` and `.claude/helpers/priority-queue.mjs`).

Companion test file: `H:/prism/scripts/lib/shipped-units-source-of-truth.test.mjs` (21 cases, all passing under `node --test`).

Verify:
1. Algorithmic correctness — does the recursive scan miss any reasonable shape of envelope? Are there envelope shapes where a unit's status lives off the unit id (e.g., status keyed by id in a sibling map)? Sample a few real envelopes under `mcp-server/data/milestones/` to confirm coverage.
2. Edge cases — empty progress file, malformed envelope, missing envelopes dir, very large envelopes (cycles already guarded), units missing IDs, status case-sensitivity.
3. Failure modes — never throws (advisory tool); on partial-read returns the partial set; on file system error returns empty.
4. Security — JSON.parse on attacker-controlled envelopes is OK (no eval); no prototype-poll
... [+683 chars truncated]

### Assistant | 2026-05-17T23:54:44.682Z

I'll review this helper end-to-end against the real codebase.

### Assistant | 2026-05-17T23:54:45.769Z

[tool_use: Read]

### Assistant | 2026-05-17T23:54:46.355Z

[tool_use: Read]

### User | 2026-05-17T23:54:46.652Z

[tool_result] 1	#!/usr/bin/env node
2	// scripts/lib/shipped-units-source-of-truth.mjs
3	//
4	// Canonical set of unit-ids that should be SKIPPED by any /pick-unit picker.
5	//
6	// Two sources, unioned (a unit is "shipped" if EITHER source agrees):
7	//   (a) MILESTONE_PROGRESS.json — git-inferred (commit subject matches
8	//       [MILESTONE]/U-ID), authoritative for "git actually reflects this".
9	//   (b) m
... [+6143 chars truncated]

### User | 2026-05-17T23:54:47.231Z

[tool_result] 1	#!/usr/bin/env node
2	// Tests for shipped-units-source-of-truth.mjs
3	//
4	// Hermetic — writes a temp progress.json + temp envelopes dir, never touches
5	// the real repo data. Real-data sanity smoke at the end against the live repo.
6	
7	import { test } from "node:test";
8	import assert from "node:assert/strict";
9	import fs from "node:fs";
10	import path from "node:path";
11	import os from "
... [+10662 chars truncated]

### Assistant | 2026-05-17T23:54:51.898Z

Let me check for additional call-sites and sample real envelopes to complete the review.

### Assistant | 2026-05-17T23:54:55.220Z

[tool_use: Grep]

### Assistant | 2026-05-17T23:54:55.290Z

[tool_use: Glob]

### User | 2026-05-17T23:55:17.741Z

[tool_result] Found 5 files
.claude\helpers\priority-queue.mjs
.claude\scripts\audit-to-units.mjs
.claude\scripts\roadmap-pass-record.mjs
.claude\scripts\envelope-sync-auto.mjs
.claude\scripts\auto-reconcile-drift.mjs

### User | 2026-05-17T23:55:17.742Z

[tool_result] <tool_use_error>InputValidationError: Glob failed due to the following issue:
An unexpected parameter `head_limit` was provided</tool_use_error>

### Assistant | 2026-05-17T23:55:21.584Z

[tool_use: Glob]

### Assistant | 2026-05-17T23:55:23.161Z

[tool_use: Grep]

### Assistant | 2026-05-17T23:55:24.411Z

[tool_use: Grep]

### User | 2026-05-17T23:55:24.463Z

[tool_result] 21: *     envelope status enum (not_started | in_progress | complete | etc.)
136:      shipped: p.shipped,

### User | 2026-05-17T23:55:25.632Z

[tool_result] 13://   node audit-to-units.mjs --exclude-shipped        # skip shipped paths
34:const EXCLUDE_SHIPPED = has("--exclude-shipped");
56:const shippedPaths = new Set();
60:      if (u.shipped) {
61:        for (const fp of u.files_modified || []) shippedPaths.add(fp.toLowerCase());
65:  log(`shipped-paths set: ${shippedPaths.size}`);
138:      if (p && shippedPaths.has(p.toLowerCase())) return false;
... [+225 chars truncated]

### User | 2026-05-17T23:55:30.900Z

[tool_result] mcp-server\data\milestones\REM-MS0.json
mcp-server\data\milestones\REM-MS1.json
mcp-server\data\milestones\SYS-MS3.json
mcp-server\data\milestones\SYS-MS0.json
mcp-server\data\milestones\SYS-MS4.json
mcp-server\data\milestones\SYS-MS7.json
mcp-server\data\milestones\SYS-MS5.json
mcp-server\data\milestones\SYS-MS6.json
mcp-server\data\milestones\SYS-MS2.json
mcp-server\data\milestones\PB-MS0.json
m
... [+3884 chars truncated]

### Assistant | 2026-05-17T23:55:40.058Z

[tool_use: Read]

### Assistant | 2026-05-17T23:55:40.507Z

[tool_use: Read]

### User | 2026-05-17T23:55:42.261Z

[tool_result] 1	{
2	  "id": "SYS-MS0",
3	  "title": "CLAUDE.md Modular Architecture",
4	  "track": "SYS",
5	  "status": "complete",
6	  "description": "Split monolithic CLAUDE.md (726 lines) into modular, path-based conditional loading. Fix stale counts across all 5 CLAUDE.md files. Based on Reddit modular architecture insights.",
7	  "units": [
8	    {
9	      "id": "SYS-MS0-U00",
10	      "title": "Audit Curr
... [+4085 chars truncated]

### User | 2026-05-17T23:55:42.768Z

[tool_result] 1	{
2	  "id": "REM-MS0",
3	  "title": "Safety-Critical Remediation",
4	  "track": "REM",
5	  "status": "complete",
6	  "description": "Fix all CRITICAL and safety-related MAJOR findings from QA audit",
7	  "units": [
8	    {
9	      "id": "REM-MS0-U00",
10	      "title": "WorkEnvelopeValidator C-axis Limits + Fixture Height",
11	      "status": "complete",
12	      "findings_resolved": ["C-001", "
... [+1346 chars truncated]

### Assistant | 2026-05-17T23:55:49.488Z

[tool_use: Grep]

### Assistant | 2026-05-17T23:55:50.822Z

[tool_use: Grep]

### User | 2026-05-17T23:55:50.860Z

[tool_result] Found 10 files limit: 10
mcp-server\data\milestones\COMMAND-KERNEL-MS0.json
mcp-server\data\milestones\INTEL-OLLAMA-OBSIDIAN-MS0.json
mcp-server\data\milestones\OBSIDIAN-INTELLIGENCE-MS3.json
mcp-server\data\milestones\VIZ-COVERAGE-MS0.json
mcp-server\data\milestones\SYSTEM-VIZ-BRAIN-MS0.json
mcp-server\data\milestones\MS-PRINT-PROGRAM-LOOP.json
mcp-server\data\milestones\RGS-TOOL-AUTOINVOKE-MS1.j
... [+147 chars truncated]

### User | 2026-05-17T23:55:52.576Z

[tool_result] Found 30 files limit: 30
scripts\lib\silent-close-out-drift.mjs
scripts\lib\shipped-units-source-of-truth.test.mjs
scripts\extract-domain-pipeline-units.mjs
scripts\slot-queue.mjs
scripts\lib\shipped-units-source-of-truth.mjs
scripts\lib\alpha-backlog-extract.mjs
scripts\extract-skill-triggers.mjs
scripts\claude-md-collapse-milestones.mjs
scripts\__tests__\fleet-task-health-watch.test.mjs
scripts\
... [+771 chars truncated]

### Assistant | 2026-05-17T23:55:57.237Z

[tool_use: Read]

### User | 2026-05-17T23:55:58.141Z

[tool_result] 1	{
2	  "schemaVersion": 4,
3	  "id": "CLEANUP-MS0",
4	  "title": "Cleanup Roadmap — 7th 'golf' chat slot for system hygiene (process reaping, peer-bug detection, system-viz grooming, wiring-potential, CLAUDE.md token slim)",
5	  "track": "CLEANUP",
6	  "roadmap": "cleanup",
7	  "priority": "P0",
8	  "owner": "claude-7f79dd78",
9	  "created_at": "2026-05-13T18:00:00.000Z",
10	  "updated_at": "2026
... [+3867 chars truncated]

### Assistant | 2026-05-17T23:56:01.565Z

[tool_use: Grep]

### Assistant | 2026-05-17T23:56:01.802Z

[tool_use: Grep]

### User | 2026-05-17T23:56:02.317Z

[tool_result] No matches found

### User | 2026-05-17T23:56:02.720Z

[tool_result] 35:// Canonical shipped-detection (was broken: read m.shipped as if it were an array
39://   (a) MILESTONE_PROGRESS m.units[].shipped===true (git-inferred)

### Assistant | 2026-05-17T23:56:08.986Z

[tool_use: Grep]

### User | 2026-05-17T23:56:10.047Z

[tool_result] 5: * Reads MILESTONE_PROGRESS.json, identifies the envelope-vs-git drift cases,
23:const MP = "H:/prism/state/shared/MILESTONE_PROGRESS.json";
50:    console.error(`MILESTONE_PROGRESS not found at ${MP}`);

### Assistant | 2026-05-17T23:56:10.414Z

[tool_use: Grep]

### User | 2026-05-17T23:56:11.076Z

[tool_result] 26:import { buildShippedIdsUnion } from "../../scripts/lib/shipped-units-source-of-truth.mjs";
56: * Build the set of unit-ids already shipped.
58: * Was: only read `progress.milestones[].units[].shipped===true` (git-inferred).
60: * had 6 envelope-complete units flagged shipped=false in MILESTONE_PROGRESS as
63: * Now: thin wrapper over buildShippedIdsUnion() which unions git-inferred +
68:export
... [+474 chars truncated]

### Assistant | 2026-05-17T23:56:11.376Z

[tool_use: Read]

### User | 2026-05-17T23:56:12.398Z

[tool_result] 600	          ],
601	          "completed_at": "2026-05-14T14:10:00.000Z",
602	          "completed_note": "golf-state-snapshot.mjs + 30-golf-state-snapshot.ps1 daily wrapper. 26-case vitest test incl. a real-better-sqlite3 dump-success test. Reclaimed from ghost task-claim by crashed chat 0fe601c1. Per-file scrutiny 2x PASS."
603	        },
604	        {
605	          "id": "U-CLEANUP-G13",
606	 
... [+1198 chars truncated]

### Assistant | 2026-05-17T23:56:46.792Z

I have everything I need. The envelope structure uses nested `phases[].units[]` — the recursive walk handles this correctly. Real envelopes use `status:"complete"`, schemaVersion variants, and arrays inside phase objects.

---

# Code Quality Analysis Report — `shipped-units-source-of-truth.mjs`

## Summary
- Overall Quality Score: **8.5/10**
- Files Analyzed: 2 (helper + tests) + 5 real envelopes + 5 call-sites
- Issues Found: 4 (1 P1, 3 P2)
- Verdict: **PASS** (P1 is a name-collision risk worth addressing in a follow-up unit, not a blocker)

## Critical Issues
**None (P0).** Algorithm is sound, never throws, fail-soft on every I/O error, advisory-only.

## P1 Issues

1. **Milestone-ID collision risk in the recursive walk.**
   - File: `scripts/lib/shipped-units-source-of-truth.mjs:64-66`
   - Walk adds ANY `{id,status:complete-ish}` pair, but envelopes also carry milestone-level `{id:"REM-MS0", status:"complete"}` (confirmed in `REM-MS0.json:2-5` and `SYS-MS0.json:1-5`). The test at line 103 documents this as intentional. If a pickup candidate's `id` ever collides with a milestone-id (e.g., a hypothetical unit named `U-SYS-MS0`), it would be falsely flagged shipped.
   - Mitigation: low live-risk today (unit-ids are `U-*` / milestone-ids are `*-MS#`), but the contract is unconstrained.
   - Suggestion: gate `out.add(...)` on a unit-id pattern (e.g., `/^U-/i` or "id contains `-U`") — OR document the union semantics as "IDs that are operator-marked complete, regardless of granularity." Cheap, fail-on-revert-testable.

## P2 Issues

2. **`progressOnly`/`envelopeOnly` mislabeled in `describeShippedSources`.**
   - File: `scripts/lib/shipped-units-source-of-truth.mjs:117-124`
   - `else if (inP) progressOnly++; else envelopeOnly++;` is reached only when `!(inP && inE)`. The branch is correct, but `inE` is never re-checked in the `else` arm — relies on union-membership invariant. Test at line 218 passes, but a malformed input that gets into `union` without being in eith
... [+2589 chars truncated]
