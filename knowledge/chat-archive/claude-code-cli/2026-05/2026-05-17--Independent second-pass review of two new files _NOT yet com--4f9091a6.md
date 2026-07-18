---
type: "chat-session"
source: "claude-code-cli"
session_id: "4f9091a6-8bca-47ed-922c-3b04ad3f75e5"
title: "Independent second-pass review of two new files (NOT yet committed): 1. H:/prism"
date: "2026-05-17"
first_ts: "2026-05-17T23:47:48.047Z"
last_ts: "2026-05-17T23:48:58.112Z"
cwd: "H:\\PRISM"
messages: 11
user_msgs: 5
assistant_msgs: 6
raw_file: "H:/.claude/projects/H--prism/4f9091a6-8bca-47ed-922c-3b04ad3f75e5/subagents/agent-abb41d06257dd6915.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:12"
---

# Independent second-pass review of two new files (NOT yet committed): 1. H:/prism

> **claude-code-cli** | 2026-05-17 | 11 msgs (5 user / 6 assistant) | cwd: H:\PRISM
> Raw: `H:/.claude/projects/H--prism/4f9091a6-8bca-47ed-922c-3b04ad3f75e5/subagents/agent-abb41d06257dd6915.jsonl`

## Transcript

### User | 2026-05-17T23:47:48.047Z

Independent second-pass review of two new files (NOT yet committed):

1. H:/prism/scripts/extract-domain-pipeline-units.mjs (CJS-like ESM, exports loadConfig/extractCells/cellToUnit/buildStageLabelMap/buildMilestone)
2. H:/prism/scripts/extract-domain-pipeline-units.test.mjs (node:test, 20 cases, all PASS)

CRITICAL CONTEXT — assume the first reviewer caught straightforward bugs. Your job is to find what they MISSED:

(a) **Integration with slot-queue.mjs**: the output milestone JSON lands at mcp-server/data/milestones/DOMAIN-PIPELINE-MS0.json. Look at H:/prism/scripts/slot-queue.mjs and how it joins atomic-roadmap-style milestone files. Will the new file actually be picked up? Does the unit schema (id/title/status/domain/slot/...) match what slot-queue + allocate-domains-to-slots.mjs expect? The other milestones in mcp-server/data/milestones/ (especially FEATURE-GAP-AUDIT-MS0.json) are reference shapes.

(b) **Hidden coupling**: would running this extractor twice (idempotent re-run) leave roadmap-index.json or MILESTONE_PROGRESS.json in a consistent state? If a unit's status field flips from "not_started" → "completed" later (per [[feedback_roadmap_close_out]]), would re-running the extractor stomp it?

(c) **Doctrine conformance**: CLAUDE.md says "Standing rule: finish EVERY task before reporting done." Per CLAUDE.md [[feedback_roadmap_close_out]] the 5-surface close-out (envelope+roadmap-index+MILESTONE_PROGRESS+BUILD_STATE+chat-bus) — should this extractor register itself in roadmap-index.json? Or is that a separate close-out step?

(d) **R12 fail-loud**: are there any silent-success failure modes? E.g., what if state/shared/specs/DOMAIN-PIPELINE-MS0-CONFIG.json is missing the canonical_stages array — does buildStageLabelMap silently emit empty labels?

(e) **Hostile-input safety**: the config is operator-edited JSON. What if an operator sets `status: "BUILT"` (uppercase) by accident — would the cell be falsely treated as not-built?

Return:
- PASS or FAIL verdi
... [+117 chars truncated]

### Assistant | 2026-05-17T23:48:06.383Z

I'll examine the two files plus the integration touchpoints.

### Assistant | 2026-05-17T23:48:06.907Z

[tool_use: Read]

### Assistant | 2026-05-17T23:48:07.433Z

[tool_use: Read]

### Assistant | 2026-05-17T23:48:07.958Z

[tool_use: Read]

### Assistant | 2026-05-17T23:48:08.622Z

[tool_use: Read]

### User | 2026-05-17T23:48:09.250Z

[tool_result] 1	/**
2	 * Tests for extract-domain-pipeline-units.mjs
3	 * Run: node --test H:/prism/scripts/extract-domain-pipeline-units.test.mjs
4	 */
5	import { test } from "node:test";
6	import assert from "node:assert/strict";
7	import fs from "node:fs";
8	import path from "node:path";
9	import {
10	  loadConfig,
11	  extractCells,
12	  cellToUnit,
13	  buildStageLabelMap,
14	  buildMilestone,
15	} from ".
... [+8479 chars truncated]

### User | 2026-05-17T23:48:09.261Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * extract-domain-pipeline-units.mjs — DOMAIN-PIPELINE-MS0/U-DPM0-CELL-EXTRACT
4	 *
5	 * Scans state/shared/specs/DOMAIN-PIPELINE-MS0-CONFIG.json and emits
6	 * mcp-server/data/milestones/DOMAIN-PIPELINE-MS0.json with one roadmap
7	 * unit per (domain × stage) cell whose status !== "built".
8	 *
9	 * Deterministic. Idempotent. Advisory + mustHumanVerify per CLAUDE.md

... [+9307 chars truncated]

### User | 2026-05-17T23:48:11.298Z

[tool_result] 1	#!/usr/bin/env node
2	// scripts/slot-queue.mjs — per-slot unit queue API for /checkin-<nato> auto-loop
3	//
4	// Reads state/shared/slot-task-queues.json; cross-checks MILESTONE_PROGRESS (shipped)
5	// and slot-task-claims.json (peer-claimed in-flight) and depends_on graph.
6	//
7	// CLI:
8	//   node scripts/slot-queue.mjs --pick --slot <nato> [--json]    next eligible unit (skipped if shipped/
... [+7475 chars truncated]

### User | 2026-05-17T23:48:12.298Z

[tool_result] 1	{
2	  "id": "FEATURE-GAP-AUDIT-MS0",
3	  "version": "1.0.0",
4	  "title": "Feature-Gap Audit — canonicalize 64 PRISM features absent from the task queue",
5	  "brief": "Surfaces and registers as roadmap units the substantial PRISM features that were absent from the task queue at the time of the 2026-05-17 /forge-audit-v2 6-agent scan. Sources: (a) unwired-engine backlog per domain (674 unwired, 
... [+4265 chars truncated]

### Assistant | 2026-05-17T23:48:58.112Z

Acknowledged on the read-once reminder. I have the file content from my earlier read; I'll work from that.

**VERDICT: FAIL** — two P0 integration bugs that break the milestone's stated purpose.

---

**P0-1 — Output milestone is NOT reachable by `slot-queue.mjs --pick`** (`extract-domain-pipeline-units.mjs`, no specific line — architectural)

The CLAUDE.md brief promises "slot routing comes directly from the config... so allocate-domains-to-slots.mjs picks each unit up automatically." But `slot-queue.mjs` reads only `state/shared/slot-task-queues.json` (line 18, hard-coded `QUEUE_FILE`). It never reads `mcp-server/data/milestones/*.json` directly — it depends on `allocate-domains-to-slots.mjs` having previously injected milestone units into the slot-queues file.

Writing `DOMAIN-PIPELINE-MS0.json` into `mcp-server/data/milestones/` is necessary but **not sufficient**. The extractor must either (a) trigger `allocate-domains-to-slots.mjs` / `topup-slot-queues.mjs` as a post-step, or (b) document the operator-required follow-on command. The current `wrote ${outPath}` success message implies the units are live in the pickup queues — they are not. **R12 violation: silent-success.**

**Fix:** After `atomicWriteJson`, emit a loud follow-on hint: `process.stdout.write("NEXT: run 'node scripts/allocate-domains-to-slots.mjs' to inject into slot queues\n")`. Better: spawn it (`execFileSync`) unless `--no-allocate` set, with the same advisory-only doctrine.

---

**P0-2 — Re-running the extractor STOMPS shipped status** (`extract-domain-pipeline-units.mjs:97`)

`cellToUnit()` hard-codes `status: "not_started"`. Per `feedback_roadmap_close_out`, units flip to `completed` in the milestone envelope when they ship (see `FEATURE-GAP-AUDIT-MS0.json:22` — `"status": "completed"` for `U-GAP-MILL-FFT-CHATTER`). The extractor writes the entire `milestone.units[]` array atomically every run — there is **no read-merge**. A second run after a unit ships silently reverts its status to `not_
... [+3524 chars truncated]
