---
type: "chat-session"
source: "claude-code-cli"
session_id: "321c1d3f-573b-4b70-b640-f87f9336e18a"
title: "Review a focused change to a PRISM post-processor training harness. Read these t"
date: "2026-06-01"
first_ts: "2026-06-01T16:19:25.874Z"
last_ts: "2026-06-01T16:20:19.562Z"
cwd: "H:\\prism"
messages: 7
user_msgs: 3
assistant_msgs: 4
raw_file: "H:/.claude/projects/H--prism/321c1d3f-573b-4b70-b640-f87f9336e18a/subagents/agent-a8c02b800d68194f3.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:09"
---

# Review a focused change to a PRISM post-processor training harness. Read these t

> **claude-code-cli** | 2026-06-01 | 7 msgs (3 user / 4 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/321c1d3f-573b-4b70-b640-f87f9336e18a/subagents/agent-a8c02b800d68194f3.jsonl`

## Transcript

### User | 2026-06-01T16:19:25.874Z

Review a focused change to a PRISM post-processor training harness. Read these two files END TO END:
- H:/prism/scripts/post-training-harness.mjs  (the change adds a "Knowledge enrichment leg" — search for `controllerForKnowledge`, `checkPlaybookConformance`, `knowledgeEnrich`, `summarizeEnrich`, `buildKnowledgePack`, `renderKnowledgeTraveler`, `enrichMachine`, `processTypeForPost`, `classifyOp`, `aggregateSources`, and the `knowledge` wiring inside `trainPost` + the `--from-knowledge` flag in `main()`)
- H:/prism/scripts/post-training-harness.test.mjs (the new `describe` blocks for those exports)

CONTEXT / SPEC: This leg composes the live MCP action `prism_shop_practice:tribal_enrich` (which returns `{tribal_tips, playbook_rules, controller_tips, knowledge_sources}`) per operation to (a) emit an operator-facing "knowledge traveler" markdown beside each generated NC, and (b) mechanically check the playbook SEQUENCING rules (SEQ-001 face-first, SEQ-003 rough-before-finish) against a job's operation order. It mirrors the existing `sfcEnrich` pattern (injectable `fetchImpl`, pure core, fail-loud per R12). It must NOT make a post's emission verdict (`card.perfect`) depend on knowledge conformance — sequencing is a job/CAM-ordering property, kept separate.

Verify specifically (flag P0/P1):
1. CORRECTNESS of `checkPlaybookConformance`: SEQ-001 (face must be index 0 in a multi-op job; n/a for single-op or no-face), SEQ-003 (max rough index < min finish index; n/a without a rough+finish pair). Any off-by-one / wrong applies/pass logic?
2. `knowledgeEnrich` fail-loud: does it correctly throw on error envelope / blocked / empty-knowledge payloads, and dedupe by (operation,material)?
3. Does the `knowledge` block in `trainPost` correctly avoid affecting lint/structural verdicts, and is it only run for successfully-generated jobs?
4. Any silent-failure (R12), inlined constant, unhandled NaN/empty, or unawaited promise?
5. Test integrity: are assertions real (reference values,
... [+219 chars truncated]

### Assistant | 2026-06-01T16:19:38.537Z

I'll review both files end to end now.

### Assistant | 2026-06-01T16:19:39.067Z

[tool_use: Read]

### Assistant | 2026-06-01T16:19:39.191Z

[tool_use: Read]

### User | 2026-06-01T16:19:42.440Z

[tool_result] 1	#!/usr/bin/env node
2	// post-training-harness.mjs — train a post processor toward "perfect" over a job corpus. slot:echo.
3	//
4	// Generalizes the single-job closed loop (post-closed-loop-tick) into a CORPUS- and POST-parameterized
5	// training loop, so the SAME machinery perfects the two Hurco posts AND generalizes to Haas + Okuma
6	// (incl. LB3000 lathe + Multus mill-turn). For each (post 
... [+34632 chars truncated]

### User | 2026-06-01T16:19:43.462Z

[tool_result] 1	// Tests for post-training-harness.mjs — hermetic, real-value (R9). Injected child-process runner.
2	import { describe, it, expect, beforeEach, afterEach } from 'vitest';
3	import { mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs';
4	import { tmpdir } from 'node:os';
5	import { join } from 'node:path';
6	import { scoreJob, buildScorecard, lintFile, structuralFile, scoreExisting, ex
... [+30518 chars truncated]

### Assistant | 2026-06-01T16:20:19.562Z

Both files read end to end. Findings below.

## P0/P1 Findings

**P1-1 — `aggregateSources` throws on a deduped/sparse `perOp` summary; mismatched with `summarizeEnrich(null)` contract.** `post-training-harness.mjs:320` does `po.summary.counts.tips` with no guard. `summarizeEnrich` is documented + tested (`test:367`) to tolerate a null payload returning `{counts:{tips:0,...}}`, so a summary always has `.counts` — but `aggregateSources` assumes every `po` has a `.summary` object. In `trainPost` the call is `aggregateSources(ke.perOp)` where each element is `{op,material,summary}`, so today it's safe. The latent risk: `aggregateSources` is an exported pure fn whose only failure path (a `perOp` element missing `summary`) is never tested, and it will throw `Cannot read properties of undefined`. This is P1 (not P0) because all live callers populate `summary`. Fix (defensive, matches the null-tolerant sibling): `for (const po of perOp || []) { const c = po && po.summary && po.summary.counts; if (!c) continue; total.tips += c.tips; ... }`.

**P1-2 — knowledge leg silently drops the conformance signal from the emission ledger but ALSO never surfaces a sequencing VIOLATION as a non-zero exit or deviation — confirmed intentional, but the console line at `:533` can misreport.** Logic at `:533`: `${c.violated ? \`${c.violated} VIOLATION\` : 'conformant'}`. `c.violated` is a count (number). For a job where `checkPlaybookConformance` returns `violated: 0` it prints "conformant" — correct. This is fine. No fix; flagging only that the separation from `card.perfect` is correct per spec (verified: `trainPost:444-454` runs knowledge in a `try/catch` that only pushes to `knowledgeCards`, never touches `verdicts`/`deviations`/`buildScorecard` inputs). PASS on spec item 3.

The substantive items:

**Verification of the 5 required checks:**

1. **`checkPlaybookConformance` correctness — CORRECT.** SEQ-001 (`:290-294`): `faceApplies = faceIdxs.length>0 && ops.length>1`; `facePass = faceIdx
... [+3102 chars truncated]
