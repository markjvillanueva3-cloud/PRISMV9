---
type: "chat-session"
source: "claude-code-cli"
session_id: "72879035-e0ca-4192-9498-ed9720495151"
title: "Review this test file end-to-end (whole file): `H:/prism/scripts/lib/gnn-active-"
date: "2026-06-11"
first_ts: "2026-06-11T03:50:34.361Z"
last_ts: "2026-06-11T03:51:16.272Z"
cwd: "H:\\prism-slot-india"
messages: 10
user_msgs: 4
assistant_msgs: 6
raw_file: "H:/.claude/projects/H--prism-slot-india/72879035-e0ca-4192-9498-ed9720495151/subagents/agent-ab88bee3ed34b0c82.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:57"
---

# Review this test file end-to-end (whole file): `H:/prism/scripts/lib/gnn-active-

> **claude-code-cli** | 2026-06-11 | 10 msgs (4 user / 6 assistant) | cwd: H:\prism-slot-india
> Raw: `H:/.claude/projects/H--prism-slot-india/72879035-e0ca-4192-9498-ed9720495151/subagents/agent-ab88bee3ed34b0c82.jsonl`

## Transcript

### User | 2026-06-11T03:50:34.361Z

Review this test file end-to-end (whole file): `H:/prism/scripts/lib/gnn-active-pool-select.test.mjs`, which tests `H:/prism/scripts/lib/gnn-active-pool-select.mjs` (a GNN active-learning ghost selector for PRISM slot:india).

The module ranks unlabeled "ghost" engine nodes for an operator to label, to grow the GNN reference pool and lift macro-F1. Acquisition = wU*uncertainty(1-confidence) + wB*classRarity(1-refCount/maxRef), then a greedy class-diversity re-rank. Pure functions: referenceClassDistribution, extractReferences, computeAcquisition, diversityRerank, selectFromClassifications (the R15 seam), selectActivePool (integration), writeWorklist.

Verify against PRISM's R9 standard (tests verify INTENT, not behavior; real reference values; NO `assert.ok(typeof x)` / toBeDefined stubs):
1. Do the assertions use REAL computed reference values (e.g. acquisition 0.64 = 0.6*0.40 + 0.4*1.0)? Independently recompute 2-3 of the asserted acquisition/rarity numbers from the documented formula and confirm they're correct (not just self-consistent with whatever the code outputs).
2. Does the suite actually encode the macro-F1-targeting INTENT — i.e. would a test FAIL if someone broke the class-balance term (e.g. removed classRarity)? Would a test catch a regression in the diversity re-rank (top-K monopolized by one class)?
3. Coverage adequacy: HAPPY x3, FAILURE >=3, ADVERSARIAL >=2 — are these genuinely distinct and meaningful, or padded? Are the critical edge cases covered (empty inputs, malformed entries, UNKNOWN-reference exclusion, all-confident inputs, single-class diversity, input non-mutation, determinism/tie-break)?
4. Any test that would pass even if the function were replaced by a hardcoded/stub return? Any tautological assertion?
5. Is the WIRING tested (selectActivePool forwards minConf:0; selectFromClassifications poolStats; writeWorklist via DI hooks)?

The tests currently PASS (26/26 via `node --test`). Report ONLY genuine gaps/weaknesses (P0 = a test that d
... [+150 chars truncated]

### Assistant | 2026-06-11T03:50:37.180Z

I'll review this test file end-to-end against PRISM's R9 standard. Let me start by reading both the test file and the module it tests.

### Assistant | 2026-06-11T03:50:37.354Z

[tool_use: Read]

### Assistant | 2026-06-11T03:50:37.469Z

[tool_use: Read]

### User | 2026-06-11T03:50:39.662Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * gnn-active-pool-select.test.mjs -- GNN active-learning ghost selector (AI-SYSTEMS #4)
4	 *
5	 * Pins the acquisition math + class-balance + diversity re-rank + the R15
6	 * selectFromClassifications seam (R9: real reference values, no `typeof x` stubs). Runs
7	 * via `node --test` (the scripts/lib convention -- vitest only globs src/__tests__).
8	 *
9	 * Coverage a
... [+15838 chars truncated]

### User | 2026-06-11T03:50:40.196Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * gnn-active-pool-select.mjs -- GNN active-learning ghost selector
4	 *   (AI-SYSTEMS-IMPROVEMENTS #4, slot:india, OBSIDIAN-AI-SYNERGY 2026-06-10)
5	 *
6	 * WHY THIS EXISTS
7	 *   The tier-5 ghost-wiring classifier (`seed-ghost-gnn-classify.mjs`) PASSES the
8	 *   AUROC gate (0.808 >= 0.78) but FAILS macro-F1 (0.439 < 0.55). Root cause, measured
9	 *   over NN-GRAPH 
... [+25302 chars truncated]

### Assistant | 2026-06-11T03:50:42.202Z

Now let me verify the critical reference values independently. I'll trace through a few key test assertions:

### Assistant | 2026-06-11T03:50:42.452Z

[tool_use: Read]

### User | 2026-06-11T03:50:44.572Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * seed-ghost-gnn-classify.mjs — NN-GRAPH-MS0 / U-NNG-INFERENCE-FIFTH-TIER (U6)
4	 *
5	 * The 5th tier of the wiring-inference cascade. The first four tiers —
6	 * keyword -> expanded-keyword -> sibling-prefix -> LLM (seed-ghost-llm-classify)
7	 * — classify UNKNOWN ghost.unwired-engine nodes into a dispatcher. This tier
8	 * adds a GraphSAGE-derived classifier and ru
... [+6007 chars truncated]

### Assistant | 2026-06-11T03:51:16.272Z

Let me verify the critical acquisition computations manually to assess test integrity.

**Verification of Reference Values (Test Line 89-94):**

Test asserts for the `computeAcquisition` "ZERO-reference class" case:
- Engine C (prism_safety, conf 0.60): acquisition = 0.64
  - Uncertainty = 1 - 0.60 = 0.40 ✓
  - ClassRarity = 1.0 (zero refs, absent from dist Map)
  - Acquisition = 0.6 × 0.40 + 0.4 × 1.0 = 0.24 + 0.40 = **0.64** ✓ CORRECT

- Engine B (prism_calc, conf 0.55): acquisition = 0.5367
  - Uncertainty = 1 - 0.55 = 0.45 ✓
  - MaxRef = 3 (from dist: prism_cam→3)
  - RefCount(prism_calc) = 1
  - ClassRarity = 1 - 1/3 = 0.6667 ✓
  - Acquisition = 0.6 × 0.45 + 0.4 × 0.6667 = 0.27 + 0.26668 = **0.53668** → rounds to **0.5367** ✓ CORRECT

- Engine A (prism_cam, conf 0.95): acquisition = 0.03
  - Uncertainty = 1 - 0.95 = 0.05 ✓
  - RefCount(prism_cam) = 3, MaxRef = 3
  - ClassRarity = 1 - 3/3 = 0 ✓
  - Acquisition = 0.6 × 0.05 + 0.4 × 0 = 0.03 + 0 = **0.03** ✓ CORRECT

**Verification (Test Line 97-108) — Rarity Inverse Frequency:**

dist = {a:4, b:2, c:1}, all confidence 0.5:
- Engine x (dispatcher a): rarity = 1 - 4/4 = **0** ✓
- Engine y (dispatcher b): rarity = 1 - 2/4 = **0.5** ✓
- Engine z (dispatcher c): rarity = 1 - 1/4 = **0.75** ✓

**Critical Gaps Found:**

1. **P0 — No regression test for the classRarity term removal.** Line 81-95 tests "zero-ref class wins," but this test PASSES IDENTICALLY if classRarity is completely removed from the formula. The test asserts the output ordering (C, B, A) and the final acquisition values, but those are consistent with EITHER the correct formula (0.6*U + 0.4*B) OR a broken formula that drops the B term entirely. To catch a regression where someone deletes `classRarity` from line 171 of the module, you would need a test that:
   - Compares the same engine's acquisition under TWO different reference distributions
   - Or asserts that `wB:0` yields different results than default (already exists at line 110, but it's a weigh
... [+6797 chars truncated]
