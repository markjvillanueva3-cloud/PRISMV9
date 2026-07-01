---
type: "chat-session"
source: "claude-code-cli"
session_id: "8b4b9149-3502-4570-8dd8-b4bc90fad6ab"
title: "Review a consensus-computation fix in H:/prism/mcp-server/src/engines/SpeedFeedT"
date: "2026-06-08"
first_ts: "2026-06-08T18:58:39.429Z"
last_ts: "2026-06-08T19:00:22.646Z"
cwd: "H:\\prism\\mcp-server"
messages: 21
user_msgs: 8
assistant_msgs: 13
raw_file: "H:/.claude/projects/H--prism/8b4b9149-3502-4570-8dd8-b4bc90fad6ab/subagents/agent-a0aee899826c611ac.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:17"
---

# Review a consensus-computation fix in H:/prism/mcp-server/src/engines/SpeedFeedT

> **claude-code-cli** | 2026-06-08 | 21 msgs (8 user / 13 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/8b4b9149-3502-4570-8dd8-b4bc90fad6ab/subagents/agent-a0aee899826c611ac.jsonl`

## Transcript

### User | 2026-06-08T18:58:39.429Z

Review a consensus-computation fix in H:/prism/mcp-server/src/engines/SpeedFeedTriComparatorEngine.ts (around lines 240-258, the `externals` filter feeding `consensusOf`).

CONTEXT: This engine compares PRISM's physics speed/feed recommendation against external vendor systems (baseline DBs, HSMAdvisor live cut, G-Wizard crib) and computes a "consensus" = median across available external systems. A LIVE closed-loop test against real vendor data caught a bug: a misaligned HSMAdvisor advisory (a single open cut at 634 m/min, whose tool diameter does NOT match the canonical cut and whose material can't be verified) was being folded into the consensus median for EVERY material — so the titanium cell's consensus came out 345 m/min (physically impossible; would vaporize the tool), making PRISM's correct ~42 m/min look wrong.

THE FIX: `externals` now prefers aligned systems — when ≥1 aligned external exists, systems flagged `aligned:false` are excluded from the consensus; but when the ONLY external is misaligned, it falls back to including it (preserving the prior "include-but-flag" single-external contract).

Verify (cite file:line):
1. Is the fix logically correct? Does `aligned !== false` correctly include baseline (aligned===undefined) and aligned HSMAdvisor, while excluding explicitly-misaligned HSMAdvisor?
2. Is the fallback (when alignedExternals is empty, use allExternals) safe — does it preserve the documented single-misaligned-external behavior?
3. SAFETY: is there any scenario where this fix could make PRISM's recommendation LESS safe (e.g. consensus now too high, masking an under-speed)? The consensus is used for a PRISM-vs-consensus verdict, not directly for the cutting recommendation — confirm that.
4. Does the `prism_vs_consensus.external_systems_used` count stay consistent with the new `externals` set?
5. Any edge case: all externals misaligned + baseline excluded → does it degrade gracefully to PRISM-only?

Read the relevant methods (run(), consensusOf, hs
... [+74 chars truncated]

### Assistant | 2026-06-08T18:58:48.388Z

I'll review the consensus-computation fix. Let me start by reading the relevant file end-to-end.

### Assistant | 2026-06-08T18:58:49.047Z

[tool_use: Read]

### User | 2026-06-08T18:58:50.622Z

[tool_result] 1	/**
2	 * SpeedFeedTriComparatorEngine — unified PRISM vs HSMAdvisor vs G-Wizard comparison.
3	 *
4	 * The headline of OSCAR-SFC-3WAY-MS0. Stacks the three speed/feed "opinions" for ONE canonical
5	 * cut onto a single axis basis (PRISM-canonical metric: vc m/min, fz mm/tooth, rpm, feed mm/min,
6	 * mrr cm³/min) so an operator — or the self-tuning loop — can see at a glance where PRISM agrees
7	 
... [+25685 chars truncated]

### Assistant | 2026-06-08T18:59:00.698Z

I have the full file. The key logic is in `run()` (lines 241-273), `consensusOf` (445-457), `hsmAdvisorSystem` (354-405), and `prismVsConsensus` (459-503). Let me verify a couple of consumer details: where `external_systems_used` is consumed and how `pairwise` relates, plus confirm consensus is not fed into the actual cutting recommendation.

### Assistant | 2026-06-08T18:59:01.014Z

[tool_use: Grep]

### User | 2026-06-08T18:59:02.500Z

[tool_result] Found 207 files
src\__tests__\SpeedFeedTriComparatorEngine.test.ts
src\engines\SpeedFeedTriComparatorEngine.ts
src\__tests__\calcDispatcher.uwire-sfc-trivendor.test.ts
src\engines\MultiModelConsensusEngine.ts
src\tools\dispatchers\calcDispatcher.ts
src\__tests__\MultiModelConsensusRankTrajectories.test.ts
src\tools\dispatchers\aiReasoningDispatcher.ts
src\engines\OutcomeCaptureBusEngine.ts
src\too
... [+8726 chars truncated]

### Assistant | 2026-06-08T18:59:10.507Z

Let me look at how the calcDispatcher consumes this engine and the test file to confirm consensus is verdict-only (not fed to cutting recommendation), and check the dispatcher wiring for `external_systems_used`.

### Assistant | 2026-06-08T18:59:13.573Z

[tool_use: Grep]

### Assistant | 2026-06-08T18:59:13.575Z

[tool_use: Read]

### User | 2026-06-08T18:59:15.224Z

[tool_result] 1	/**
2	 * Tests for SpeedFeedTriComparatorEngine — unified PRISM vs HSMAdvisor vs G-Wizard.
3	 *
4	 * Each full run() costs ONE physics-orchestrator call (the engine reuses the baseline
5	 * comparator's single PRISM run), so the suite is bounded to 3 orchestrator calls with a
6	 * generous timeout for fleet-contention robustness. External systems (HSMAdvisor / G-Wizard)
7	 * are injected via *_s
... [+9992 chars truncated]

### User | 2026-06-08T18:59:18.116Z

[tool_result] H:\prism\mcp-server\src\tools\dispatchers\calcDispatcher.ts-1094-  // grades each tool optimal | conservative | aggressive | dangerous. Closes 2 of ~4 remaining unwired SF calculator engines.
H:\prism\mcp-server\src\tools\dispatchers\calcDispatcher.ts-1095-  "speed_feed_mine",
H:\prism\mcp-server\src\tools\dispatchers\calcDispatcher.ts-1096-  "speed_feed_compare_to_baseline",
src\tools\dispatchers
... [+2761 chars truncated]

### Assistant | 2026-06-08T18:59:25.461Z

I have everything I need. The dispatcher confirms the engine's output (`speed_feed_tri_compare`) is returned as a comparison report — there is no path where `consensus` is fed back into a cutting recommendation. Let me verify one downstream concern: whether any self-tuning engine consumes `consensus`/`prism_vs_consensus` to actually adjust PRISM's cutting recommendation (the docstring at line 32 names `SpeedFeedSelfTuningEngine`).

### Assistant | 2026-06-08T18:59:27.461Z

[tool_use: Grep]

### Assistant | 2026-06-08T18:59:27.699Z

[tool_use: Glob]

### User | 2026-06-08T18:59:29.496Z

[tool_result] No matches found

### User | 2026-06-08T18:59:30.526Z

[tool_result] No files found

### Assistant | 2026-06-08T18:59:38.864Z

The named `SpeedFeedSelfTuningEngine` does not exist on disk — the docstring reference is aspirational. Let me confirm no other engine consumes the tri-comparator's consensus to mutate a cutting recommendation.

### Assistant | 2026-06-08T18:59:39.827Z

[tool_use: Grep]

### User | 2026-06-08T18:59:43.236Z

[tool_result] src\tools\dispatchers\calcDispatcher.ts:1097:  // OSCAR-SFC-9AXIS-MS0/U-OSC-WIRE-TRIVENDOR (2026-06-08, slot:oscar): SpeedFeedTriComparatorEngine wire — the
src\tools\dispatchers\calcDispatcher.ts:1101:  "speed_feed_tri_compare",
src\tools\dispatchers\calcDispatcher.ts:9653:          // OSCAR-SFC-9AXIS-MS0/U-OSC-WIRE-TRIVENDOR (2026-06-08, slot:oscar): SpeedFeedTriComparatorEngine.run —
src\tools\
... [+2987 chars truncated]

### Assistant | 2026-06-08T19:00:22.646Z

Confirmed. The engine is consumed in exactly one place — `calcDispatcher.ts:9656-9660` as `speed_feed_tri_compare`, which returns the report object verbatim. No engine reads `consensus`/`prism_vs_consensus` to mutate a cutting recommendation. The consensus is purely a verdict/reporting signal.

I now have full understanding of all five questions. Here is my review.

---

## REVIEW VERDICT: PASS

File: `H:/prism/mcp-server/src/engines/SpeedFeedTriComparatorEngine.ts`

The fix at lines 255-257 is logically correct, dimensionally sound, and does not introduce a safety regression. All five verification points pass. Detail below, with cited file:line.

### 1. Fix logical correctness — CORRECT

`SpeedFeedTriComparatorEngine.ts:255-257`
```ts
const allExternals = systems.filter((s) => s.system !== "prism" && s.available && s.axes);
const alignedExternals = allExternals.filter((s) => s.aligned !== false);
const externals = alignedExternals.length > 0 ? alignedExternals : allExternals;
```

The `aligned !== false` predicate is the right test, not `aligned === true`. Tracing the three external producers:
- **Baseline** (`baselineSystem`, lines 338-349): never sets `aligned`, so `aligned === undefined` → `undefined !== false` is `true` → **included**. Correct: baseline has no tool-alignment concept and is the always-on grounded reference.
- **G-Wizard** (`gwizardSystem`, lines 424-435): never sets `aligned` → `undefined` → **included**. (See edge note below — this is correct but worth flagging.)
- **HSMAdvisor aligned** (`hsmAdvisorSystem`, line 395, `aligned: true`): `true !== false` → **included**. Correct.
- **HSMAdvisor misaligned** (line 380 `aligned = rel <= ALIGN_TOLERANCE` → `false`, or line 389 `aligned = false` when diameter unverifiable): `false !== false` → `false` → **excluded** when ≥1 aligned external exists. Correct — exactly the live-caught titanium pollutant.

Using `!== false` rather than `=== true` is the load-bearing choice: it correctly treats `undefined`
... [+5456 chars truncated]
