---
type: "chat-session"
source: "claude-code-cli"
session_id: "cdc4a2c4-eeb5-4533-9a1e-da4d27dadc81"
title: "Review the iter-2 changes to `H:/prism/scripts/lib/shipped-units-source-of-truth"
date: "2026-05-18"
first_ts: "2026-05-18T00:08:56.622Z"
last_ts: "2026-05-18T00:09:34.074Z"
cwd: "H:\\prism"
messages: 7
user_msgs: 3
assistant_msgs: 4
raw_file: "H:/.claude/projects/H--prism/cdc4a2c4-eeb5-4533-9a1e-da4d27dadc81/subagents/agent-a1e9c8f5c5b796704.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:27"
---

# Review the iter-2 changes to `H:/prism/scripts/lib/shipped-units-source-of-truth

> **claude-code-cli** | 2026-05-18 | 7 msgs (3 user / 4 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/cdc4a2c4-eeb5-4533-9a1e-da4d27dadc81/subagents/agent-a1e9c8f5c5b796704.jsonl`

## Transcript

### User | 2026-05-18T00:08:56.622Z

Review the iter-2 changes to `H:/prism/scripts/lib/shipped-units-source-of-truth.mjs` (the helper that powers PRISM's pickup pickers).

Context: Iter 1 of this /loop shipped commit c84a0c7cbc which unioned MILESTONE_PROGRESS + envelope statuses to fix a stop-the-line picker bug. Per-file scrutiny flagged two P1 follow-ups that iter 2 addresses:
1. **U-ID pattern gate** — restrict the shipped union to IDs matching `/^U-/i` to prevent milestone-id collision with pickup candidates. Applied to BOTH `readShippedFromProgress` AND `collectCompletedFromEnvelope`. Uses `.trim()` before regex test to tolerate leading/trailing whitespace in IDs.
2. **mtime memoization** — module-level `_unionCache` keyed on (`progressMtime`, `maxMtimeIn(envelopesDir)`). Cache only applies to default-path calls (no args). Custom-path calls (hermetic tests) always re-read. Cache returns a COPY of the Set so caller mutation can't poison subsequent reads. `_resetShippedUnionCache()` exported for test hygiene.

Live perf: cold 111ms → warm 11ms (9.3× speedup).

The picker chain is: Stop hooks fire ~10-50× per session across 13 chats, each invoking `slot-queue.mjs --pick` and/or `priority-queue.mjs`, each of those calling the helper at least once. The cache materially matters.

Tests: 26 in `H:/prism/scripts/lib/shipped-units-source-of-truth.test.mjs`. New ones cover:
- U-ID gate rejects milestone-id with status:completed (test 7)
- U-ID gate rejects findings (F1/G9) and lowercase milestone shapes (test 8)
- mtime cache returns identical sets across calls (test 23)
- mtime cache returns a COPY so caller mutation doesn't poison cache (test 24)
- Custom paths bypass cache (test 25)
- Touching a real envelope's mtime triggers invalidation (test 26)

Verify:
1. Cache correctness — is there a TOCTOU race between the mtime read and the JSON parse? If an envelope is written between `maxMtimeInDir` and `readShippedFromEnvelopes`, the cache stores stale content with a fresh mtime stamp. Likelihood vs blast r
... [+880 chars truncated]

### Assistant | 2026-05-18T00:09:02.971Z

I'll analyze the iter-2 changes to the shipped-units helper.

### Assistant | 2026-05-18T00:09:03.947Z

[tool_use: Read]

### Assistant | 2026-05-18T00:09:04.505Z

[tool_use: Read]

### User | 2026-05-18T00:09:04.988Z

[tool_result] 1	#!/usr/bin/env node
2	// scripts/lib/shipped-units-source-of-truth.mjs
3	//
4	// Canonical set of unit-ids that should be SKIPPED by any /pick-unit picker.
5	//
6	// Two sources, unioned (a unit is "shipped" if EITHER source agrees):
7	//   (a) MILESTONE_PROGRESS.json — git-inferred (commit subject matches
8	//       [MILESTONE]/U-ID), authoritative for "git actually reflects this".
9	//   (b) m
... [+9442 chars truncated]

### User | 2026-05-18T00:09:05.282Z

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
... [+15973 chars truncated]

### Assistant | 2026-05-18T00:09:34.074Z

## Code Quality Analysis Report

### Summary
- Overall Quality Score: 8/10
- Files Analyzed: 2 (impl + tests)
- Issues Found: 5 (1 P1, 3 P2, 1 P3)
- Grade: PASS (with one P1 to fix before next iter)

### P1 — Test 26 mtime-invalidation is non-load-bearing
`buildShippedIdsUnion — mtime cache invalidates on envelope touch` (line 325) asserts only `after.size > 0`. A cache-hit returning the stale-but-correct set passes identically. The test **does not verify invalidation occurred** — it could pass with the cache logic deleted. Fix: capture `_unionCache.envMtime` via an exported peek (or `describeShippedSources` extension), assert pre-touch mtime ≠ post-touch mtime AND that a re-read happened (e.g., spy on `fs.readdirSync` via injected dep, or assert `after !== cached_reference`). As written, this test sells reviewers a guarantee it doesn't provide — Karpathy R9 violation.

### P2 — TOCTOU race between mtime fingerprint and JSON parse
`buildShippedIdsUnion` reads `progMtime`/`envMtime` (lines 158-159) BEFORE `readShippedFromProgress`/`readShippedFromEnvelopes` (lines 165-166). An envelope written between those calls is parsed-into-cache but stamped with the pre-write mtime — next call hits cache, ignores the change until the NEXT mutation. Blast radius: a unit close-out written mid-Stop-hook stays invisible until any other envelope is touched. Likelihood: low (Stop hooks are short; envelope writes are operator-paced), but the picker chain fires 10-50×/session × 13 chats. Fix: read mtimes AFTER the reads, OR re-stat post-read and bail to no-cache on mismatch.

### P2 — In-process cache is per-process; not documented
Stop hooks spawn fresh node processes per fire — each pays the 111ms cold cost. The cache helps `--describe`/`--check` repeated CLI use and long-lived processes (Monitor loops), not the Stop-hook hot path the comment cites (line 138-139). Either: (a) correct the comment to name actual beneficiaries, or (b) add a `state/shared/.shipped-union-cache.json` disk-c
... [+1031 chars truncated]
