---
type: "chat-session"
source: "claude-code-cli"
session_id: "b6c4b196-15eb-4d95-9474-abf1c8fbcb8c"
title: "Review the test file `H:/prism/scripts/lib/graphsage-predictor.test.mjs` end-to-"
date: "2026-05-16"
first_ts: "2026-05-16T13:54:14.855Z"
last_ts: "2026-05-16T13:54:39.101Z"
cwd: "H:\\prism"
messages: 7
user_msgs: 3
assistant_msgs: 4
raw_file: "H:/.claude/projects/H--prism/b6c4b196-15eb-4d95-9474-abf1c8fbcb8c/subagents/agent-ae1eab3de3459c626.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:24"
---

# Review the test file `H:/prism/scripts/lib/graphsage-predictor.test.mjs` end-to-

> **claude-code-cli** | 2026-05-16 | 7 msgs (3 user / 4 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/b6c4b196-15eb-4d95-9474-abf1c8fbcb8c/subagents/agent-ae1eab3de3459c626.jsonl`

## Transcript

### User | 2026-05-16T13:54:14.855Z

Review the test file `H:/prism/scripts/lib/graphsage-predictor.test.mjs` end-to-end for coverage quality and test integrity. The module under test is `H:/prism/scripts/lib/graphsage-predictor.mjs` (read it too) — the GraphSAGE link-prediction inference module, unit U-NNG-GRAPHSAGE-PREDICT (U5) of NN-GRAPH-MS0. `node:test` suite, 37 passing tests across 10 describe blocks.

The module exports: `PREDICT_DEFAULTS`, `loadPredictor`, `embedGraph`, `scoreLink`, `collectCandidateLinks`, `rankPredictions`, `predictMissingLinks`, `parseArgs`, `main`.

VERIFY (per CLAUDE.md R9 — tests verify intent, not behavior):
- **The load-bearing tests are in `describe("link-prediction signal ...")`.** They train a model on a graph with 3 held-out intra-cluster edges, then assert (1) every held-out intra-cluster edge scores higher than every cross-cluster non-edge, and (2) the held-out edges rank at the top of a mixed candidate list. Confirm these are REAL: would they FAIL if the predictor were broken (model not learning, calibration inverted, ranking sorted the wrong way, embeddings collapsed)? Is the training deterministic so the assertion is never flaky? Is the held-out-edge fixture sound — are those edges genuinely absent from the training graph?
- Does every other test assert a real value/invariant — no stub assertions, nothing that still passes if the function is gutted?
- Are the `assert.throws` tests genuinely triggering the intended guard?
- **Coverage:** cross-check the module's exported surface and every meaningful branch. Is `collectCandidateLinks` tested for the non-edge property, the 2-hop property, the bounding caps, and determinism? Is the no-calibrator path of `scoreLink` tested? Is the `embedGraph` inputDim-mismatch guard tested?
- The `main` CLI tests use real temp files — hermetic (cleanup in finally), deterministic, asserting real outcomes (exit code AND the written predictions file)?
- Fixtures: `clusterGraph`, `denseMinusHeldout`, `signalSetup` (memoized training),
... [+337 chars truncated]

### Assistant | 2026-05-16T13:54:18.470Z

I'll read both files to verify test quality and coverage.

### Assistant | 2026-05-16T13:54:18.471Z

[tool_use: Read]

### Assistant | 2026-05-16T13:54:18.649Z

[tool_use: Read]

### User | 2026-05-16T13:54:18.928Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\graphsage-predictor.mjs' was already read 22s ago in this session and is unchanged (mtime 1778939365496). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-05-16T13:54:19.416Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * graphsage-predictor.test.mjs — node:test suite for U5 (U-NNG-GRAPHSAGE-
4	 * PREDICT) of NN-GRAPH-MS0 (GraphSAGE link-prediction inference).
5	 *
6	 * Load-bearing invariants this suite pins:
7	 *  - the predictor surfaces REAL signal — trained on a graph with three
8	 *    held-out intra-cluster edges, it ranks those genuinely-missing edges
9	 *    ABOVE cross-clu
... [+18841 chars truncated]

### Assistant | 2026-05-16T13:54:39.101Z

## Test Coverage Review: graphsage-predictor.test.mjs

**Module:** `H:/prism/scripts/lib/graphsage-predictor.mjs` (GraphSAGE link-prediction inference, U5 of NN-GRAPH-MS0)

**Test File:** `H:/prism/scripts/lib/graphsage-predictor.test.mjs` (37 passing tests, 10 describe blocks)

---

### Load-Bearing Signal Tests (R9 Verification)

**Lines 297–320: "link-prediction signal"**

✓ **Signal test 1 (298–308):** Trains on 3 clusters (16 nodes each, 60 epochs, seed=5) with exactly 3 intra-cluster edges held out. Then asserts: `min(heldScores) > max(crossClusterScores)`. The held-out pairs are genuinely ABSENT from training (confirmed by `denseMinusHeldout` logic lines 79–81). **This test would FAIL** if:
  - The model never learned cluster structure (embeddings collapsed)
  - Ranking was inverted (calibration flipped)
  - The fixture didn't actually hold edges out
  
Sound. Cross-cluster pairs are real non-edges with no structural reason to connect.

✓ **Signal test 2 (310–319):** Takes the same trained predictor + mixes held-out edges with cross-cluster non-edges, ranks them all, asserts the top-K slots contain ONLY intra-cluster pairs. Uses `clusterOf()` helper to check source/target cluster membership. **Would FAIL** if ranking was unsorted, if held-out edges scored lower than cross-cluster, or if topK truncation was inverted. Sound.

✓ **Memoization** (lines 96–104): `signalSetup()` trains once, caches in `_signal`, reused across signal tests. **Risk:** mutable state leakage? No — the function returns a new object per call referencing the same immutable trained checkpoint. Tests read-only via `embedGraph` and `scoreLink`, no mutations observed. Safe.

---

### Exported Surface Coverage

| Export | Test Coverage | Quality |
|--------|---------------|---------|
| `PREDICT_DEFAULTS` | Lines 414–420 | ✓ Frozen, all integer fields checked |
| `loadPredictor` | Lines 112–141 | ✓ Object/JSON string, calibrator presence/absence, corrupt guard throws |
| `embedGraph` | Lines 14
... [+3267 chars truncated]
