---
type: "chat-session"
source: "claude-code-cli"
session_id: "501bd704-5c4a-4278-8059-79c78c4f32ed"
title: "Review the GNN-F0 \"direct-embed\" degeneracy fix (committed 8abba4f27c + ae600245"
date: "2026-06-04"
first_ts: "2026-06-04T15:05:24.379Z"
last_ts: "2026-06-04T15:34:04.764Z"
cwd: "H:\\prism"
messages: 104
user_msgs: 37
assistant_msgs: 67
raw_file: "H:/.claude/projects/H--prism/501bd704-5c4a-4278-8059-79c78c4f32ed/subagents/agent-a82ec12086baff2a6.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:12"
---

# Review the GNN-F0 "direct-embed" degeneracy fix (committed 8abba4f27c + ae600245

> **claude-code-cli** | 2026-06-04 | 104 msgs (37 user / 67 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/501bd704-5c4a-4278-8059-79c78c4f32ed/subagents/agent-a82ec12086baff2a6.jsonl`

## Transcript

### User | 2026-06-04T15:05:24.379Z

Review the GNN-F0 "direct-embed" degeneracy fix (committed 8abba4f27c + ae60024500 on branch cad-fusion-live-ms0). Use `git -C H:/prism show 8abba4f27c` and `git -C H:/prism show ae60024500` (or git diff against 9cd5a624ef^) to see the full diff. Files:
- scripts/build-node-embeddings.mjs (added --graph/--ghosts-only/--out flags + ghostEmbedText() leak-free text + isMain guard fix)
- scripts/seed-ghost-gnn-classify.mjs (loadDirectEmbeddings() + the PRISM_NNG_DIRECT_EMBED direct-embed branch in classifyUnknownGhosts)
- scripts/lib/nn-graph-eval.mjs (directEmbed threading through runAssessment/assessHoldout + embeddingMode field)
- tests: scripts/build-node-embeddings.test.mjs, scripts/seed-ghost-gnn-classify.test.mjs

CONTEXT: the NN/GNN tier-5 had an AUROC-0.500 constant-vote collapse. ROOT (verified): the deployed 8-d checkpoint under EDGELESS inference (buildGhostSubgraph returns edges:[]) collapses every ghost to a uniform vector → uniform cosines → constant vote. FIX: 2a regenerates DISTINCT 768-d nomic embeddings for all 636 ghosts (build-node-embeddings --ghosts-only); 2d adds a direct-embed path that votes raw cosine k-NN over those (dequantized q*s) bypassing the model. Result: AUROC 0.848, isDegenerate false. A CRITICAL R12 leak was caught+fixed: the graph `info` field embeds `proposed_wiring` (the eval TRUTH) verbatim, so the first embed scored a FAKE 0.9833 — ghostEmbedText now strips that clause.

FOCUS:
1. LEAK INTEGRITY: does ghostEmbedText() reliably strip the proposed_wiring answer from ALL ghost info variants (the regex `/proposed wiring:\s*prism_[a-z0-9_]+[^]*$/i`)? Could any ghost still leak its dispatcher into the embed text? Is the leak-free text still distinct enough per ghost (engine name)?
2. DEQUANT CORRECTNESS: loadDirectEmbeddings reconstructs `q.map(x => x*s)`. Is that the correct inverse of build-node-embeddings quantize() (unit = q*scale)? Does the cosine ranking via linkScore=sigmoid(dot) hold for these vectors?
3. DIRECT-EMBED BRANCH:
... [+954 chars truncated]

### Assistant | 2026-06-04T15:05:35.478Z

I'll review the GNN-F0 direct-embed degeneracy fix. Let me start by examining the commits and the full diff.

### Assistant | 2026-06-04T15:05:36.666Z

[tool_use: Bash]

### User | 2026-06-04T15:05:46.397Z

[tool_result] commit 8abba4f27cf5e58316496ba3b9e42d350ddeedce
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Thu Jun 4 09:53:15 2026 -0500

    [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [BLACKWELL-AI-MS0]/U-GNN-DIRECT-EMBED (slot:india): BREAK the NN/GNN constant-vote degeneracy — 2a ghost embeddings + 2d direct-embed (AUROC 0.5->0.848, isDegenerate false)
    
    ROOT (code+empirically verified): d
... [+2940 chars truncated]

### Assistant | 2026-06-04T15:05:49.570Z

Let me look at the full diffs of each file. Let me start with the core files.

### Assistant | 2026-06-04T15:05:50.815Z

[tool_use: Bash]

### User | 2026-06-04T15:05:58.395Z

[tool_result] commit 8abba4f27cf5e58316496ba3b9e42d350ddeedce
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Thu Jun 4 09:53:15 2026 -0500

    [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [BLACKWELL-AI-MS0]/U-GNN-DIRECT-EMBED (slot:india): BREAK the NN/GNN constant-vote degeneracy — 2a ghost embeddings + 2d direct-embed (AUROC 0.5->0.848, isDegenerate false)
    
    ROOT (code+empirically verified): d
... [+9109 chars truncated]

### Assistant | 2026-06-04T15:06:02.889Z

Now let me see the full file context for build-node-embeddings.mjs to understand quantize() and the surrounding code.

### Assistant | 2026-06-04T15:06:02.890Z

[tool_use: Read]

### User | 2026-06-04T15:06:06.881Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * build-node-embeddings.mjs — NN-GRAPH-MS0/U-NNG-NODE-EMBED-INGEST
4	 *
5	 * Computes a 768-d nomic-embed-text semantic vector for every node in
6	 * state/shared/system-viz/system-graph-normalized.json (output of U1's
7	 * regen-graph-normalized.mjs). Writes int8-quantized vectors to
8	 * state/shared/system-viz/_node-embeddings.jsonl — the semantic feature
9	 * blo
... [+15280 chars truncated]

### Assistant | 2026-06-04T15:06:13.054Z

Now I have the full picture for build-node-embeddings.mjs. I note a critical detail at line 300-303: the wiki-cache reuse path runs **even for ghosts** and bypasses ghostEmbedText. Let me examine this leak vector more carefully. First let me look at the seed-ghost-gnn-classify.mjs diff.

### Assistant | 2026-06-04T15:06:14.008Z

[tool_use: Bash]

### User | 2026-06-04T15:06:21.704Z

[tool_result] commit 8abba4f27cf5e58316496ba3b9e42d350ddeedce
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Thu Jun 4 09:53:15 2026 -0500

    [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [BLACKWELL-AI-MS0]/U-GNN-DIRECT-EMBED (slot:india): BREAK the NN/GNN constant-vote degeneracy — 2a ghost embeddings + 2d direct-embed (AUROC 0.5->0.848, isDegenerate false)
    
    ROOT (code+empirically verified): d
... [+10787 chars truncated]

### Assistant | 2026-06-04T15:06:25.743Z

Now let me read the full seed-ghost-gnn-classify.mjs to understand voteDispatcher, buildGhostSubgraph, and the surrounding logic.

### Assistant | 2026-06-04T15:06:26.168Z

[tool_use: Read]

### User | 2026-06-04T15:06:29.237Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * seed-ghost-gnn-classify.mjs — NN-GRAPH-MS0 / U-NNG-INFERENCE-FIFTH-TIER (U6)
4	 *
5	 * The 5th tier of the wiring-inference cascade. The first four tiers —
6	 * keyword -> expanded-keyword -> sibling-prefix -> LLM (seed-ghost-llm-classify)
7	 * — classify UNKNOWN ghost.unwired-engine nodes into a dispatcher. This tier
8	 * adds a GraphSAGE-derived classifier and ru
... [+32954 chars truncated]

### Assistant | 2026-06-04T15:06:33.504Z

I see a critical concern emerging. In the direct-embed path, `voteDispatcher` calls `scoreLink(embeddings, calibrator, target.id, ref.id)` with `calibrator=null`. Let me examine `scoreLink` to verify the cosine/sigmoid behavior holds for these dequantized vectors.

### Assistant | 2026-06-04T15:06:33.823Z

[tool_use: Read]

### User | 2026-06-04T15:06:38.314Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * graphsage-predictor.mjs — GraphSAGE link-prediction inference. Unit
4	 * U-NNG-GRAPHSAGE-PREDICT (U5) of NN-GRAPH-MS0.
5	 *
6	 * Loads a checkpoint trained by U4 (graphsage-train-pipeline), embeds a graph
7	 * with the frozen weights, and scores candidate MISSING edges — the "wiring
8	 * links the graph does not have yet but probably should". Each prediction
9	 * c
... [+18243 chars truncated]

### Assistant | 2026-06-04T15:06:42.830Z

Now let me look at `linkScore` in graphsage-model.mjs to understand what the dot product / sigmoid actually does, which is the crux of the dequant correctness question.

### Assistant | 2026-06-04T15:06:43.392Z

[tool_use: Read]

### User | 2026-06-04T15:06:46.190Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * graphsage-model.mjs — GraphSAGE forward pass + model construction.
4	 * The model half of unit U-NNG-GRAPHSAGE-TRAIN (U4) of NN-GRAPH-MS0; the
5	 * training half (backprop + loss + negative sampling) lives in the sibling
6	 * graphsage-trainer.mjs, and U5's link predictor consumes this forward pass
7	 * directly with frozen weights.
8	 *
9	 * Architecture — 2-layer
... [+12113 chars truncated]

### Assistant | 2026-06-04T15:06:52.917Z

Now I understand `linkScore` fully: it computes `sigmoid(dot(zu, zv))`. For the direct-embed path, the dequantized vectors `q*s` are approximately unit-norm (since quantize L2-normalizes first), so `dot` is approximately the cosine. The sigmoid is monotonic in the dot, so ranking by `calibratedScore = sigmoid(cosine)` preserves cosine ranking. This is correct for k-NN ranking.

Now let me examine the nn-graph-eval.mjs diff and the surrounding eval logic.

### Assistant | 2026-06-04T15:06:55.195Z

[tool_use: Bash]

### User | 2026-06-04T15:07:00.887Z

[tool_result] commit 8abba4f27cf5e58316496ba3b9e42d350ddeedce
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Thu Jun 4 09:53:15 2026 -0500

    [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [BLACKWELL-AI-MS0]/U-GNN-DIRECT-EMBED (slot:india): BREAK the NN/GNN constant-vote degeneracy — 2a ghost embeddings + 2d direct-embed (AUROC 0.5->0.848, isDegenerate false)
    
    ROOT (code+empirically verified): d
... [+5384 chars truncated]

### Assistant | 2026-06-04T15:07:05.365Z

Now let me read the full nn-graph-eval.mjs to understand assessHoldout, the holdout construction, degeneracy detection, and how AUROC is computed (especially what TRUTH labels it grades against).

### Assistant | 2026-06-04T15:07:05.697Z

[tool_use: Read]

### User | 2026-06-04T15:07:09.170Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * nn-graph-eval.mjs — NN-GRAPH-MS0 / U-NNG-EVAL-HARNESS U7
4	 *
5	 * The assessment harness for the GNN tier-5 wiring classifier. It measures
6	 * whether the GraphSAGE classifier (U6 seed-ghost-gnn-classify) is good enough
7	 * to deploy, against the milestone's mandatory exit gates:
8	 *     AUROC >= 0.78   ·   macro-F1 >= 0.55   ·   Brier <= 0.15
9	 *
10	 * Method
... [+32199 chars truncated]

### Assistant | 2026-06-04T15:07:17.365Z

I now have a complete view of the eval flow. There's a critical correctness concern I need to verify. In `assessHoldout`, the holdout ghost nodes still have their `proposed_wiring` field set (it's the TRUTH), AND `partitionGhosts` is called with `targetNames`. The held-out ghosts are scored by label. But the direct-embed loads embeddings by **node id**, which were built from `ghostEmbedText`. Let me check whether the held-out ghosts' embeddings are leak-free or whether they were embedded WITH proposed_wiring.

This is the crux: the embeddings file `ghost-node-embeddings.jsonl` was built from the graph at a point in time. If the held-out ghosts in the eval have their `proposed_wiring` populated (which is the truth), and the embedding for that ghost was built from text including its proposed_wiring — that's a leak. The fix is `ghostEmbedText` strips it. Let me verify the regex thoroughly and check the actual graph data and the embeddings file.

### Assistant | 2026-06-04T15:07:18.924Z

[tool_use: Bash]

### User | 2026-06-04T15:07:32.473Z

[tool_result] {"__meta":true,"model":"nomic-embed-text","dim":768,"schemaVersion":1,"generatedAt":"2026-06-04T14:43:37.696Z","source":"system-graph.json","ghostsOnly":true}
{"id":"ghost.unwired.AdaptiveSystemIntegrationEngine","n":"AdaptiveSystemIntegrationEngine","h":"52a3b0a0d84d","k":"ghost.unwired-engine","src":"nomic","s":0.0015391,"q":[11,4,-127,-11,43,-13,0,20,4,-22,-21,46,41,54,-31,2,13,-24,-28,-4,39,-3
... [+1674 chars truncated]

### Assistant | 2026-06-04T15:07:38.260Z

Good - the embeddings file is built with `ghostsOnly:true` and `source:system-graph.json`. The records key by `id` (e.g., `ghost.unwired.AdaptiveSystemIntegrationEngine`). Note the embedding record does NOT store the text it was embedded from, so I cannot directly verify leak-freedom from the file. I need to verify the regex against the actual `info` field shape in the graph.

Let me examine the actual `info` field of ghost nodes in the graph to test the regex against real data. The graph is large, so I'll extract a few ghost nodes' info fields.

### Assistant | 2026-06-04T15:07:41.653Z

[tool_use: Bash]

### User | 2026-06-04T15:07:55.722Z

[tool_result] (node:56996) ExperimentalWarning: CommonJS module H:\prism\[eval] is loading ES Module H:\prism\scripts\lib\graph-io.mjs using require().
Support for loading ES Module in require() is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
---try mjs---
total ghosts: 636
[
 {
  "id": "ghost.unwired.AbstractionHierarchyEngine",
  
... [+2117 chars truncated]

### Assistant | 2026-06-04T15:08:00.707Z

Now I can see the exact `info` shape. Every ghost's info is: `Unwired engine — proposed wiring: prism_X (confidence 0.XX, reason: ...)`. Let me now empirically test the `ghostEmbedText` regex against ALL 636 ghosts to verify zero leakage, and check that the resulting text remains distinct per ghost.

### Assistant | 2026-06-04T15:08:06.527Z

[tool_use: Bash]

### User | 2026-06-04T15:13:08.846Z

[tool_result] Command running in background with ID: btu53ccrq. Output is being written to: C:\Users\wompu\AppData\Local\Temp\claude\H--prism\18171d21-2f6f-439c-9da0-f86bb5672d17\tasks\btu53ccrq.output. You will be notified when it completes. To check interim output, use Read on that file path.

### Assistant | 2026-06-04T15:13:12.190Z

Let me wait for the background task to complete and read the output.

### Assistant | 2026-06-04T15:13:13.221Z

[tool_use: Bash]

### User | 2026-06-04T15:13:22.265Z

[tool_result] (Bash completed with no output)

### system

... [24 middle messages omitted -- see raw_file] ...

### User | 2026-06-04T15:21:55.760Z

[tool_result] {
 "deferred": false,
 "embeddingMode": "direct",
 "checkpointPresent": true,
 "holdoutN": 62,
 "metrics": {
  "auroc": 0.848,
  "macroF1": 0.3262,
  "brier": 0.1535,
  "accuracy": 0.5323
 },
 "degeneracy": {
  "isDegenerate": false,
  "mode": "none",
  "distinctConfidences": 36,
  "distinctPredictions": 6,
  "dominantClass": "prism_turning",
  "dominantShare": 0.4355,
  "detail": "discriminating 
... [+1989 chars truncated]

### Assistant | 2026-06-04T15:22:07.490Z

I've now reproduced and confirmed the reported metrics live:
- **AUROC = 0.848** (confirmed, matches commit + NN-EVAL.json)
- **macroF1 = 0.3262, Brier = 0.1535** both below-gate, correctly surfaced as FAIL
- **isDegenerate = false**, distinctPredictions = 6, distinctConfidences = 36 — degeneracy genuinely broken (was 1 distinct confidence → constant vote → AUROC 0.5)
- **accuracy = 0.5323** — the classifier is genuinely above chance (6 classes, dominant prior 60/125=48%; getting 53% with this imbalance is real signal)

The sample data is very revealing: correct predictions (`prism_turning` for Lathe* engines) get high confidence (0.78-0.8), while wrong predictions get low confidence (0.27-0.49). This is EXACTLY what a real AUROC measures — the ranking IS informative. This is not an artifact.

Now let me verify the NN-EVAL.json that was committed matches, and check the degeneracy claim isn't masked. Let me also examine the leak concern about the embeddings file being potentially built with leaked text. Let me check the NN-EVAL.json committed values and the .md.

### Assistant | 2026-06-04T15:22:10.969Z

[tool_use: Bash]

### User | 2026-06-04T15:22:27.213Z

[tool_result] {
 "embeddingMode": "direct",
 "deferred": false,
 "checkpointPresent": true,
 "holdoutN": 62,
 "metrics": {
  "auroc": 0.848,
  "macroF1": 0.3262,
  "brier": 0.1535,
  "accuracy": 0.5323
 },
 "degeneracy": {
  "isDegenerate": false,
  "mode": "none",
  "distinctConfidences": 36,
  "distinctPredictions": 6,
  "dominantClass": "prism_turning",
  "dominantShare": 0.4355,
  "detail": "discriminating 
... [+223 chars truncated]

### Assistant | 2026-06-04T15:22:32.984Z

The committed NN-EVAL.json exactly matches my live reproduction. The honesty is sound: AUROC PASS but verdict is `shipped-research-only` with macro-F1 and Brier failures explicitly surfaced. Now let me run the test suites for the two changed test files to verify the tests pass and check their quality.

### Assistant | 2026-06-04T15:22:34.146Z

[tool_use: Bash]

### User | 2026-06-04T15:22:48.606Z

[tool_result]   ...
# Subtest: main returns 0 for --help and 2 for an unknown argument
ok 66 - main returns 0 for --help and 2 for an unknown argument
  ---
  duration_ms: 0.5819
  ...
# Subtest: loadDirectEmbeddings dequantizes q*s and filters by neededIds (fail-soft on missing)
ok 67 - loadDirectEmbeddings dequantizes q*s and filters by neededIds (fail-soft on missing)
  ---
  duration_ms: 0.3153
  ...
# Subt
... [+313 chars truncated]

### Assistant | 2026-06-04T15:22:55.796Z

All 82 tests pass. Now let me examine the actual test code to verify the tests verify INTENT, not just behavior — particularly the leak-strip test and the distinct-prediction test.

### Assistant | 2026-06-04T15:22:56.504Z

[tool_use: Bash]

### User | 2026-06-04T15:23:06.567Z

[tool_result] commit 8abba4f27cf5e58316496ba3b9e42d350ddeedce
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Thu Jun 4 09:53:15 2026 -0500

    [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [BLACKWELL-AI-MS0]/U-GNN-DIRECT-EMBED (slot:india): BREAK the NN/GNN constant-vote degeneracy — 2a ghost embeddings + 2d direct-embed (AUROC 0.5->0.848, isDegenerate false)
    
    ROOT (code+empirically verified): d
... [+5972 chars truncated]

### Assistant | 2026-06-04T15:23:19.113Z

The tests verify real intent. Let me assess them critically:

**Leak-strip test** — asserts `!t.includes("prism_intelligence")` and `!/proposed wiring:/i.test(t)` AND `t.includes("AbstractionHierarchyEngine")`. This is a true intent test: it would FAIL if the regex stopped stripping. The second test even covers the "real description preceding the answer clause" variant.

**dequant test** — asserts `m.get("a")` deepEquals `[63.5, 0]` (127*0.5=63.5, 0*0.5=0). This is exact-value verification of `q*s`, plus neededIds filtering and fail-soft. Strong.

**distinct-prediction test** — asserts T1→prism_cam, T2→prism_calc, and `new Set(...).size === 2`. This directly encodes "degeneracy broken." The inline comment shows awareness of the unit-vector saturation footgun (a sign of careful testing).

Now, let me look at one concern raised in the test: the comment about magnitude-127 vectors saturating sigmoid. This is the deeper correctness question — in the REAL data, the vectors are `q*s` which are L2-unit (magnitude ~1), so `dot` ∈ [-1,1] and sigmoid stays in [0.27, 0.73] — discriminating. But let me verify the dequantized real vectors are actually unit-norm. This matters because if the quantization scale reconstruction were wrong, the cosine ranking could be distorted.

### Assistant | 2026-06-04T15:23:25.313Z

[tool_use: Bash]

### User | 2026-06-04T15:23:40.628Z

[tool_result] {
 "samples": [
  {
   "id": "ghost.unwired.AdaptiveSystemIntegrationEngine",
   "dim": 768,
   "s": 0.0015391,
   "reconNorm": 1.0003,
   "maxAbs": 0.1955
  },
  {
   "id": "ghost.unwired.AgentAutoUpdateEngine",
   "dim": 768,
   "s": 0.0014634,
   "reconNorm": 1,
   "maxAbs": 0.1859
  },
  {
   "id": "ghost.unwired.AbstractionHierarchyEngine",
   "dim": 768,
   "s": 0.0014627,
   "reconNorm": 1.
... [+342 chars truncated]

### Assistant | 2026-06-04T15:23:50.261Z

The dequant correctness is confirmed: reconstructed `q*s` vectors have norm ≈ 1.0 (within int8 quantization rounding error ~0.03%). So `dot(va,vb)` ≈ cosine. The sample dot of 0.9155 between two engines is in the discriminating range (sigmoid(0.9155)=0.714), confirming the ranking signal is real and not saturated.

There's one subtle concern worth noting: since all vectors are positive-orthant-ish (nomic embeds tend to have high pairwise cosine ~0.9), the sigmoid(dot) values cluster in a narrow high range. But the ranking is what matters for k-NN top-K, and it's preserved. The accuracy=0.53 and AUROC=0.848 prove discrimination survives.

Now let me check whether a non-direct (model) run could regress. The key question for EVAL THREADING: `directEmbed` defaults to false everywhere, and the model path is untouched except being wrapped in `if (!cfg.directEmbed)`. Let me verify the full test suite for nn-graph-eval and the model path still works.

### Assistant | 2026-06-04T15:23:51.835Z

[tool_use: Bash]

### User | 2026-06-04T15:24:09.922Z

[tool_result] scripts/lib/nn-graph-eval.test.mjs*
---
# tests 58
# suites 0
# pass 58
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 241.0171

### Assistant | 2026-06-04T15:24:29.895Z

All 58 nn-graph-eval tests pass — the model path is intact, no regression. (The background-task "failed" notifications are exit-255 from the RTK-alias-mangled duplicates that the hook spawned in parallel; my direct synchronous runs all succeeded and wrote the result files, which I read successfully.)

Now let me address the EVAL THREADING honesty concern carefully: `runAssessment` sets `checkpointPresent = !!predictor || directEmbed` and `checkpointMeta = {embeddingMode:"direct", ...}`. Is calling `checkpointPresent:true` in direct-embed mode honest? In direct mode there is NO checkpoint — but the field semantically means "the classifier is ready to produce metrics" (vs deferred). Let me check how `renderReport` and downstream consumers interpret `checkpointPresent` to ensure it doesn't fabricate a "model was trained" claim.

The deferred-branch in `renderReport` (line 500-538) is only reached when `result.deferred === true`. In direct mode the result is NOT deferred, so that misleading "trained checkpoint is present" prose is never emitted. The non-deferred branch (line 544+) renders the metrics table and does NOT mention checkpoints. So `checkpointPresent:true` in direct mode never produces a false "model trained" claim in the report. The `embeddingMode:"direct"` field disambiguates. This is honest.

Let me check the one remaining concern — whether any OTHER consumer of NN-EVAL.json reads `checkpointPresent` and would now misinterpret direct mode as a trained model. The CLAUDE.md mentioned `classifyGnn` and PSN leg hooks reading the eval.

### Assistant | 2026-06-04T15:24:30.823Z

[tool_use: Grep]

### User | 2026-06-04T15:24:53.107Z

[tool_result] Found 6 files
scripts\lib\nn-graph-eval.mjs
.claude\hooks\psn-leg-state-inject.test.mjs
.claude\hooks\psn-leg-state-inject.mjs
.claude\hooks\nn-graph-health-inject.test.mjs
.claude\hooks\nn-graph-health-inject.mjs
scripts\lib\nn-graph-eval.test.mjs

### Assistant | 2026-06-04T15:25:00.618Z

Let me check how the two PSN/health hooks consume the eval — specifically whether they read `checkpointPresent` or `embeddingMode` and whether direct-mode now confuses them. Per the CLAUDE.md "Recent regressions," `classifyGnn` reads `metrics.auroc` first then falls back to `checkpointMeta.auroc`.

### Assistant | 2026-06-04T15:25:02.166Z

[tool_use: Grep]

### User | 2026-06-04T15:25:09.547Z

[tool_result] .claude\hooks\bash-orphan-cleaner.mjs:203:  const deferred = allCandidates.length - candidates.length;
.claude\hooks\bash-orphan-cleaner.mjs:216:    const tail = deferred > 0 ? `, deferred=${deferred}` : "";
.claude\hooks\blueprint-coverage-floor-guard.mjs:398:        kind: "audit_deferred_u8_missing",
.claude\hooks\blueprint-coverage-floor-guard.mjs:406:        { kind: "audit_deferred_u8_missing"
... [+7047 chars truncated]

### Assistant | 2026-06-04T15:25:26.891Z

This is reassuring. The `classifyGnn` consumer (the fix from CLAUDE.md regression 2026-06-03) reads `metrics.auroc/brier` first when `deferred:false`, and treats a graded report as checkpoint-present. The direct-embed eval produces exactly that shape: `deferred:false, metrics:{auroc:0.848,...}, degeneracy:{isDegenerate:false}`. So the health hook will correctly classify it as GRADED (not dormant), AUROC 0.848, below-gate (since macroF1/Brier fail are in `metrics`/`grade`). Let me run these two hook test suites to confirm no regression from the new `embeddingMode`/`checkpointPresent` shape.

### Assistant | 2026-06-04T15:25:28.061Z

[tool_use: Bash]

### User | 2026-06-04T15:25:45.268Z

[tool_result]   ...
1..43
# tests 102
# suites 14
# pass 102
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 7457.9792

### Assistant | 2026-06-04T15:25:49.615Z

All 102 hook tests pass. The downstream consumers handle the new direct-embed eval shape correctly.

Now let me address the remaining concerns. Let me look at the GNN-DEGENERATE-FIX spec doc and the NN-EVAL.md to verify the honesty narrative, and check one edge in `loadDirectEmbeddings`: the `__meta` line detection.

### Assistant | 2026-06-04T15:25:52.481Z

[tool_use: Bash]

### User | 2026-06-04T15:26:02.324Z

[tool_result] commit 8abba4f27cf5e58316496ba3b9e42d350ddeedce
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Thu Jun 4 09:53:15 2026 -0500

    [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [BLACKWELL-AI-MS0]/U-GNN-DIRECT-EMBED (slot:india): BREAK the NN/GNN constant-vote degeneracy — 2a ghost embeddings + 2d direct-embed (AUROC 0.5->0.848, isDegenerate false)
    
    ROOT (code+empirically verified): d
... [+4535 chars truncated]

### Assistant | 2026-06-04T15:26:13.134Z

The documentation is exemplary in its honesty. The spec doc explicitly flags:
- The R12 leak catch (fake 0.9833)
- AUROC measures internal-consistency (keyword↔embedding agreement), NOT verified wiring
- macroF1/Brier FAIL surfaced as a data dependency, not hidden
- The per-bucket calibration table shows the ranking IS calibrated: low-confidence bucket [0.20,0.40)=24% accuracy, high-confidence bucket [0.80,1.00)=92% accuracy. This is strong evidence the AUROC is real — confidence tracks correctness.

Now let me investigate the one residual concern I flagged earlier: the wiki-cache reuse path in build-node-embeddings (lines 300-303) bypasses `ghostEmbedText` even in `--ghosts-only` mode. If a ghost's label matched a wiki entry, it would reuse the wiki vector (which could contain post-hoc wiring info). Let me verify whether this actually fired for the shipped embeddings file. The file records `src` per entry.

### Assistant | 2026-06-04T15:26:15.895Z

[tool_use: Bash]

### User | 2026-06-04T15:26:26.430Z

[tool_result] {
 "total": 636,
 "bySrc": {
  "nomic": 636
 }
}

### Assistant | 2026-06-04T15:26:42.006Z

All 636 embeddings are `src:"nomic"` — zero came from the wiki cache, so the wiki-bypass-ghostEmbedText path did NOT fire for the shipped file. The leak-free guarantee holds for the actual artifact. However, this remains a **latame code-level concern** (P2): the wiki-cache reuse branch at line 300-306 does not apply `ghostEmbedText` in `--ghosts-only` mode — if a future rebuild had a wiki entry name-matching a ghost label AND the timestamp guard passed, it would silently reuse a vector built from leaky wiki text. It happened not to fire here only because of the timestamp guard (wiki cache is older than the current graph). This is a latent leak path, not an active one.

Let me clean up my temp files and do a final verification of the dequant edge case in `loadDirectEmbeddings` — specifically the `__meta` detection `t.startsWith('{"__meta')`, which would miss a meta line with whitespace like `{ "__meta"`. Let me check the actual meta line format the builder writes.

The builder writes `JSON.stringify({__meta:true,...})` which produces `{"__meta":true,...` — no space, so `startsWith('{"__meta')` matches. And even if a meta line slipped through, it has no `id` field of string type that's in `neededIds`, so it'd be filtered anyway. This is robust.

Let me clean up the temp files I created.

### Assistant | 2026-06-04T15:26:42.841Z

[tool_use: Bash]

### User | 2026-06-04T15:27:00.970Z

[tool_result] cleaned
 M .claude/commands/COMMANDS_DIGEST.md
 M .claude/commands/capture-claude-credentials.md
 M .claude/helpers/__tests__/chat-slots-bindings.test.mjs
 M .claude/helpers/install-zulu-orchestrator-task.ps1
 M .claude/helpers/mcp-http-bridge.mjs
 M .claude/helpers/mcp-tool-domains.mjs
 M .claude/helpers/mcp-tool-domains.test.mjs
 M .claude/helpers/slot-task-claim.test.mjs
 M .claude/helpers/zulu
... [+43 chars truncated]

### Assistant | 2026-06-04T15:27:14.452Z

Temp files cleaned (they were the pre-existing M-files from the session, not my temps — my temps are gone). 

Let me do one final check on a subtle EVAL THREADING honesty point: in `assessHoldout`, `directEmbed: opts.directEmbed === true` — but `directEmbedPath: opts.directEmbedPath` is passed through. When `runAssessment` is invoked via CLI (`main`), it does NOT forward `directEmbed` from any flag — there's no `--direct-embed` CLI flag. Let me confirm how direct mode is actually triggered in production (env var only) and whether the committed NN-EVAL was produced via env or programmatically.

### Assistant | 2026-06-04T15:27:17.190Z

[tool_use: Bash]

### User | 2026-06-04T15:32:47.429Z

[tool_result] Command running in background with ID: bj1wq3wfy. Output is being written to: C:\Users\wompu\AppData\Local\Temp\claude\H--prism\18171d21-2f6f-439c-9da0-f86bb5672d17\tasks\bj1wq3wfy.output. You will be notified when it completes. To check interim output, use Read on that file path.

### Assistant | 2026-06-04T15:32:52.474Z

[tool_use: Bash]

### User | 2026-06-04T15:33:07.876Z

[tool_result] 352:    // GNN-F0/2d: direct-embed votes raw nomic cosine (no model). Forwarded from runAssessment.
353:    directEmbed: opts.directEmbed === true,
354:    directEmbedPath: opts.directEmbedPath,
439:  // GNN-F0/2d: direct-embed mode votes raw nomic cosine over precomputed ghost
442:  const directEmbed = opts.directEmbed === true || process.env.PRISM_NNG_DIRECT_EMBED === "1";
446:  let checkpointPr
... [+446 chars truncated]

### Assistant | 2026-06-04T15:34:04.764Z

Confirmed. The direct-embed mode is triggered only via `PRISM_NNG_DIRECT_EMBED=1` env (read in `runAssessment` line 442). The CLI `parseArgs` has no `--direct-embed` flag, so the committed NN-EVAL was produced by running `PRISM_NNG_DIRECT_EMBED=1 node scripts/lib/nn-graph-eval.mjs`. The grep also confirms there is **no production wiring yet** (no cron/hook sets `PRISM_NNG_DIRECT_EMBED=1`) — which matches the commit's stated "Production-enable of direct-embed mode is the remaining deploy step." That's honest and correctly scoped.

One minor note on EVAL THREADING: `runAssessment` line 442 ORs in the env var, but `assessHoldout` (line 353) reads only `opts.directEmbed === true`. Since `runAssessment` forwards the resolved `directEmbed` via `{...opts, directEmbed}` at line 464, the env-triggered path correctly reaches `assessHoldout`. Consistent.

I have completed a thorough review with live empirical verification. Let me compile the final report.

---

## Code Quality Analysis Report — GNN-F0 Direct-Embed Degeneracy Fix

### Summary
- **Overall Quality Score: 9/10**
- **Files Analyzed:** 5 (3 source + 2 test) across commits `8abba4f27c` + `ae60024500`
- **Issues Found:** 4 (0 P0, 1 P1, 3 P2)
- **Verdict: PASS**

This is a high-quality, intellectually honest fix. I independently reproduced every headline claim against live data: AUROC 0.848 confirmed, `isDegenerate:false` confirmed (36 distinct confidences, 6 distinct predictions vs the prior 1-confidence constant vote), leak-stripping verified at zero `prism_` tokens across all 636 ghosts, dequant `q*s` verified to reconstruct unit vectors (norm ≈ 1.0003), and all 242 relevant tests pass (82 changed-file + 58 eval + 102 downstream hook).

---

### FOCUS-by-FOCUS findings

**1. LEAK INTEGRITY — SOLID (with one P2 latent path)**
Empirically tested `ghostEmbedText()` against all 636 real ghosts: **0 texts contain any `prism_` token**, all 636 texts remain distinct (engine name preserved). The regex `/proposed wiring:\s*p
... [+7822 chars truncated]
