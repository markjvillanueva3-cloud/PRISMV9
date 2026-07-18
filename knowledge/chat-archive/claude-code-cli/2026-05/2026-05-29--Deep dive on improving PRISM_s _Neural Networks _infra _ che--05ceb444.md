---
type: "chat-session"
source: "claude-code-cli"
session_id: "05ceb444-c381-4be3-a54c-91d4043e4329"
title: "Deep dive on improving PRISM's \"Neural Networks (infra + checkpoint lifecycle)\"."
date: "2026-05-29"
first_ts: "2026-05-29T19:17:18.322Z"
last_ts: "2026-05-29T19:45:07.591Z"
cwd: "H:\\prism-slot-india"
messages: 60
user_msgs: 23
assistant_msgs: 37
raw_file: "H:/.claude/projects/H--prism-slot-india/05ceb444-c381-4be3-a54c-91d4043e4329/subagents/workflows/wf_d1cc0086-132/agent-a23dc723b856905c6.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:57"
---

# Deep dive on improving PRISM's "Neural Networks (infra + checkpoint lifecycle)".

> **claude-code-cli** | 2026-05-29 | 60 msgs (23 user / 37 assistant) | cwd: H:\prism-slot-india
> Raw: `H:/.claude/projects/H--prism-slot-india/05ceb444-c381-4be3-a54c-91d4043e4329/subagents/workflows/wf_d1cc0086-132/agent-a23dc723b856905c6.jsonl`

## Transcript

### User | 2026-05-29T19:17:18.322Z

Deep dive on improving PRISM's "Neural Networks (infra + checkpoint lifecycle)". Focus: NN infra, checkpoint/candidate promote lifecycle, embeddingSource mismatch (U-NN-PREDICTOR-EMBED-WIRE), retrain harness

PRISM grounding (READ real files in worktree H:/prism-slot-india; it is divergent from main H:/prism — NN-GRAPH state + many engines live ONLY on main):
- Galaxy brain: mcp-server/src/engines/ai-training/{KNOWLEDGE.md,RULES.md,MEMORY.md,PATHS.md}
- VERIFIED FACTS from the first deep-dive (do not re-litigate): closed-loop IS ignited at boot (index.ts:434 XProcNeuralAutoFireEngine.activate) but CrossProcessOutcomeStore is ephemeral (configureStorePath has 0 prod callers); CAG cold-anchor is a no-op (PromptCachingEngine output reaches no live call site; LLMEngine.ts:327 _callClaude sends plain string); NN-GRAPH AUROC 0.096 is the link-prediction PRETEXT diagnostic NOT the deploy gate (gate correctly DEFERRED on poolSize=0, data-side); stratified neg-sampling ALREADY coded (graphsage-trainer.mjs:167, main).
- Constraints: duplicationGuard THROWS on new dup engines; NEVER inline physics constants; NEVER bypass the NN deploy gate. Ollama /api/chat is DEAD this session (no live embed).

TASK: Read the relevant PRISM files (Read/Grep/Glob) to establish what EXISTS — cite real paths, do not guess. Then list concrete improvements with leverage(1-10), effort, venue, the PRISM target file/engine, the named technique, and duplicationRisk (search first — duplicationGuard THROWS). Prioritize genuinely high-impact wiring/coupling fixes over cosmetic ones; be honest about what's already built.
CRITICAL: You MUST finish by calling the StructuredOutput tool with your findings. Do your file reads FIRST, keep them focused, then call StructuredOutput. Do not end your turn with prose — the StructuredOutput call IS the deliverable.

### Assistant | 2026-05-29T19:17:33.309Z

I'll start by reading the galaxy brain files to establish the NN infra grounding, then dig into the specific files.

### Assistant | 2026-05-29T19:17:34.734Z

[tool_use: Bash]

### Assistant | 2026-05-29T19:17:35.323Z

[tool_use: Read]

### User | 2026-05-29T19:18:09.361Z

[tool_result] 1	# PATHS.md — slot:india (ai-training) H:/-wide path atlas
2	
3	> Converts future Grep/Glob from O(N) → O(1) for slot:india. **`(✓)` = verified on the canonical MAIN tree `H:/prism` (where shared/fleet substrate lives), 2026-05-28/29.**
4	> ⚠ **Worktree-staleness disclosure (R12/AI-T8):** this `slot/india` worktree is ~874 commits behind `origin/main`. The shared NN-GRAPH scripts (`scripts/lib/gr
... [+10967 chars truncated]

### User | 2026-05-29T19:21:24.970Z

[tool_result] AI-SYSTEMS-IMPROVEMENT-ROADMAP.md  10.6K
CLAUDE.md  12.6K
KNOWLEDGE.md  4.2K
MEMORY.md  8.5K
PATHS.md  11.1K
RULES.md  4.7K
TOOLBELT.md  3.7K
---DIR LISTING DONE---

### Assistant | 2026-05-29T19:21:28.941Z

The CLAUDE.md and PATHS.md make clear the worktree is ~874 commits behind main, and the NN-GRAPH scripts live on MAIN (`H:/prism`), not this worktree. Let me verify what actually exists in BOTH trees, and read the key files.

### Assistant | 2026-05-29T19:21:30.373Z

[tool_use: Read]

### Assistant | 2026-05-29T19:21:33.097Z

[tool_use: Bash]

### User | 2026-05-29T19:21:57.977Z

[tool_result] 1	# AI-Training Domain Rules + GSD Protocol (slot:india)
2	
3	> Domain-specific complement to global CLAUDE.md R1–R12 and the galaxy `CLAUDE.md`. These rules + the Get-Stuff-Done lifecycle govern ALL ai-training work (NN / GNN / LoRA / RAG / deep-learning / deep-reasoning / retrain / self-improvement loop). Distilled from india's session history + domain docs (U-PSGB-INDIA-AUDIT, 2026-05-28/29). L
... [+4391 chars truncated]

### User | 2026-05-29T19:26:42.978Z

[tool_result] === WORKTREE india: graphsage lib ===
=== MAIN prism: graphsage lib ===
H:/prism/scripts/lib/graphsage-checkpoint.mjs  10.9K
H:/prism/scripts/lib/graphsage-checkpoint.test.mjs  15.9K
H:/prism/scripts/lib/graphsage-model.mjs  11.2K
H:/prism/scripts/lib/graphsage-model.test.mjs  14.5K
H:/prism/scripts/lib/graphsage-predictor.mjs  16.7K
H:/prism/scripts/lib/graphsage-predictor.test.mjs  24.2K
H:/pris
... [+875 chars truncated]

### Assistant | 2026-05-29T19:26:47.620Z

Confirmed: NN-GRAPH lives only on MAIN (`H:/prism`). The worktree has none of it. Let me read the core files on main: the predictor (embeddingSource mismatch), the eval gate, the retrain lifecycle, and current NN-EVAL state.

### Assistant | 2026-05-29T19:26:48.074Z

[tool_use: Read]

### Assistant | 2026-05-29T19:26:48.592Z

[tool_use: Read]

### Assistant | 2026-05-29T19:26:48.898Z

[tool_use: Read]

### User | 2026-05-29T19:27:05.149Z

[tool_result] 1	{
2	  "deferred": true,
3	  "reason": "insufficient-reference-pool",
4	  "checkpointPresent": true,
5	  "poolSize": 0,
6	  "checkpointMeta": {
7	    "trainedAt": "2026-05-16T21:34:13.774Z",
8	    "nodeCount": 20460,
9	    "cappedNodes": 5998,
10	    "truncated": true,
11	    "edgeCount": 6562,
12	    "trainEdgeCount": 5250,
13	    "testEdgeCount": 1312,
14	    "evalNegativeCount": 1312,
15	    "
... [+342 chars truncated]

### User | 2026-05-29T19:27:05.287Z

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

### User | 2026-05-29T19:27:06.529Z

[tool_result] 1	{
2	  "schemaVersion": 1,
3	  "fingerprint": {
4	    "nodeCount": 288536,
5	    "edgeCount": 1056624,
6	    "ghostCount": 636
7	  },
8	  "recordedAt": "2026-05-25T20:56:00.359Z"
9	}

### Assistant | 2026-05-29T19:27:13.130Z

The READ-ONCE hint confirms I'm a continuation of a prior session that already explored these. Let me read the eval gate, the checkpoint lib (promote lifecycle), and the retrain lifecycle orchestrator — the core of the task.

### Assistant | 2026-05-29T19:27:13.618Z

[tool_use: Read]

### Assistant | 2026-05-29T19:27:13.928Z

[tool_use: Read]

### User | 2026-05-29T19:27:21.222Z

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
... [+25450 chars truncated]

### User | 2026-05-29T19:27:21.253Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * graphsage-checkpoint.mjs — JSON serialization of a trained GraphSAGE model.
4	 * Component (c) of unit U-NNG-GRAPHSAGE-TRAIN (U4) of NN-GRAPH-MS0.
5	 *
6	 * The U4 training script saves a trained model here; U5's link predictor
7	 * loads it and runs inference with frozen weights. A checkpoint is a plain
8	 * JSON-safe object — `saveCheckpoint` returns it (the call
... [+11601 chars truncated]

### Assistant | 2026-05-29T19:27:31.033Z

Now the retrain lifecycle orchestrator — the heart of the candidate→live promote discipline. Let me read it plus the live checkpoint metadata and check what the candidate checkpoint contains.

### Assistant | 2026-05-29T19:27:31.453Z

[tool_use: Read]

### User | 2026-05-29T19:28:02.733Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * nn-graph-retrain-lifecycle.mjs — NN-GRAPH-MS2 / U2-SELF-RETRAIN-LIFECYCLE
4	 *
5	 * The autonomous half of the GNN tier-5 wiring classifier. Runs as a Windows
6	 * scheduled task (see .claude/helpers/install-nn-graph-retrain-task.ps1),
7	 * independent of any Claude session, on a periodic poll:
8	 *
9	 *   1. FINGERPRINT  — read system-graph.json, summarize {nodeCo
... [+36711 chars truncated]

### Assistant | 2026-05-29T19:28:12.664Z

Now I have the full retrain lifecycle. Let me check the embedding-source bridge (the key to the embeddingSource mismatch), the candidate checkpoint metadata, and the train pipeline's loadEmbeddingFeatures + how the trainer stamps metadata.embeddingSource. These are the crux of U-NN-PREDICTOR-EMBED-WIRE.

### Assistant | 2026-05-29T19:28:13.509Z

[tool_use: Read]

### Assistant | 2026-05-29T19:28:16.803Z

[tool_use: Bash]

### User | 2026-05-29T19:28:41.340Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * graph-node-embedding-bridge.mjs — RAG-UPGRADE-MS0 / U-GNN-NODE-EMBED-BRIDGE
4	 *                                   (2026-05-23, slot golf).
5	 *
6	 * Closes the missing mapping layer that the empirical NN-GRAPH retrain
7	 * (commit-cluster 2026-05-22, `graphsage-checkpoint-768d-rag-upgrade.json`)
8	 * exposed: `embeddingHitCount=0`. The trainer's `loadEmbeddingFeat
... [+27148 chars truncated]

### User | 2026-05-29T19:33:50.223Z

[tool_result] === candidate checkpoint metadata (head) ===
{
  "schemaVersion": 1,
  "savedAt": "2026-05-25T20:57:52.208Z",
  "config": {
    "inputDim": 768,
    "hiddenDim": 64,
    "embedDim": 32,
    "seed": 1
  },
  "metadata": {
    "trainedAt": "2026-05-25T20:57:52.199Z",
    "nodeCount": 288262,
    "cappedNodes": 5998,
    "truncated": true,
    "edgeCount": 7517,
    "trainEdgeCount": 6014,
    "testE
... [+1415 chars truncated]

### Assistant | 2026-05-29T19:34:07.436Z

This is the critical finding. There's a **checkpoint/dim mismatch deadlock**:

- **Live checkpoint** (`graphsage-checkpoint.json`): `inputDim: 8` (projected hand-features), AUROC 0.096, trained 2026-05-16, NO `embeddingSource` in metadata.
- **Candidate checkpoint** (`graphsage-checkpoint.candidate.json`): `inputDim: 768`, AUROC 0.405 (link-prediction pretext), trained 2026-05-25, `embeddingHitCount: 3681`, `embeddingSource: H:\PRISM\...node-embeddings-768d.jsonl`, `stratifiedNegatives: true`.

The candidate is materially better (AUROC 0.405 vs 0.096, stratified negatives, real embeddings) but the deploy gate is **deferred on poolSize=0** (data-side), so the lifecycle has been unable to promote it. The 768d candidate has sat un-promoted since 2026-05-25.

Let me verify the eval path's embeddingSource forwarding when evaluating the candidate, and check the train pipeline's metadata stamping + the seed-ghost-classify reference-pool path. Also check `nn-eval-refresh` and the system-viz graph ghost count.

### Assistant | 2026-05-29T19:34:09.334Z

[tool_use: Bash]

### Assistant | 2026-05-29T19:34:11.996Z

[tool_use: Bash]

### User | 2026-05-29T19:36:39.246Z

[tool_result] === train pipeline: where it stamps metadata.embeddingSource + loadEmbeddingFeatures ===
rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
27 matches in 13 files:

569:0:when an embeddingSource is provided,
575:0:opts.readFileImpl })
586:0:when an embeddingSource is supplied,
733:0:stratifiedActive,
743:0:embeddingStats ? embeddingStats.hit : 0,
75:0:
... [+1885 chars truncated]

### User | 2026-05-29T19:36:41.289Z

[tool_result] === seed-ghost-gnn-classify: loadGnnCheckpoint + how predictor embeddingSource is wired for classify ===
rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
56 matches in 19 files:

111:0:finiteOr(pick(overrides.refMinConf, env.PRISM_NNG_REF_MIN_CONF), d.refMinConf...
133:0:true, predictor: loadPredictor(raw) };
141:0:when `targetNames` (a Set of labels
... [+3484 chars truncated]

### Assistant | 2026-05-29T19:36:53.245Z

Let me read the seed-ghost-gnn-classify around the embeddingSource forwarding (line 300-360) and the reference-pool seed file, plus check the live system-viz graph ghost count and whether a reference-pool seeding step exists. This determines whether the deferred gate is fixable.

### Assistant | 2026-05-29T19:36:54.167Z

[tool_use: Read]

### Assistant | 2026-05-29T19:36:54.275Z

[tool_use: Read]

### User | 2026-05-29T19:37:11.859Z

[tool_result] 255	/**
256	 * Classify the UNKNOWN ghost engines of `graph`. Returns
257	 * { skipped, reason, classifications, stats }:
258	 *   - skipped:true  — the GNN tier could not contribute (disabled / no
259	 *                     checkpoint / no references / embed failure); the caller
260	 *                     falls back to the LLM tier for every engine.
261	 *   - skipped:false — the tier ran; `class
... [+5465 chars truncated]

### User | 2026-05-29T19:37:11.950Z

[tool_result] 1	{
2	  "schemaVersion": "1.0.0",
3	  "generatedAt": "2026-05-23T20:30:00Z",
4	  "generatedBy": "alpha slot, claude-95e7030e, TOKEN-SAVINGS-PIVOT/U-PSN-NN-SEED (gap-fill 5/5)",
5	  "purpose": "Reference-pool seed for NN-GRAPH tier-5 (GraphSAGE wiring-inference). Currently dormant — AUROC 0.096 vs gate 0.78 because reference pool is 0-sized. This file provides 25+ seed examples drawn from the iter9
... [+6612 chars truncated]

### Assistant | 2026-05-29T19:37:21.362Z

Now I understand the full picture. The reference-pool seed file exists but its entries are `{sourceHook, ref, dispatcherFile}` shaped — NOT `ghost.unwired-engine` graph nodes with `proposed_wiring` + `confidence` that `buildHoldout`/`partitionGhosts` require. So this seed file is structurally disconnected from the eval harness — it cannot lift `poolSize=0`. The eval reads ghost nodes from the live `system-graph.json` only.

Let me verify the live graph's actual ghost count + ghost node shape (does the system-viz regen emit `proposed_wiring` + `confidence` on ghosts?), and check the awareness script + nn-eval-refresh to confirm the deferred-on-data state. This is the deciding evidence for the highest-leverage fix.

### Assistant | 2026-05-29T19:37:27.904Z

[tool_use: Bash]

### User | 2026-05-29T19:39:52.240Z

[tool_result] === live graph size + ghost node count + sample ghost shape ===
(node:93136) ExperimentalWarning: CommonJS module H:\prism-slot-india\[eval] is loading ES Module H:\prism\scripts\lib\graph-io.mjs using require().
Support for loading ES Module in require() is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
--- graph-io is 
... [+927 chars truncated]

### Assistant | 2026-05-29T19:39:56.855Z

Need a file:// URL for the dynamic import on Windows. Let me run the eval harness directly via its CLI in dry mode (no-write) against the live checkpoint — that's the authoritative way to see the current gate state and ghost pool.

### Assistant | 2026-05-29T19:39:58.140Z

[tool_use: Bash]

### User | 2026-05-29T19:41:02.941Z

[tool_result] # NN-GRAPH-MS0 GNN Tier-5 Assessment — NN-EVAL

**Assessed:** 2026-05-29T19:40:56.419Z  ·  **Holdout:** 62 reference ghosts

> Internal-consistency metric — measures whether the GNN agrees with the
> keyword/sibling tiers' high-confidence labels. NOT verified ground truth.

## Mandatory gates

| Metric | Value | Gate | Result |
|---|---|---|---|
| AUROC | 0.5 | >= 0.78 | FAIL |
| macro-F1 | 0.1333
... [+488 chars truncated]

### Assistant | 2026-05-29T19:41:14.156Z

Major new finding. The graph has regenerated since the saved NN-EVAL.json: the ghost pool is now **populated** (holdout 62 reference ghosts, poolSize ≥ 124), so the gate is **no longer deferred** — it now runs and FAILS (AUROC 0.5, macro-F1 0.133, Brier 0.26). The saved `NN-EVAL.json` (poolSize:0, deferred) is **stale**. This changes the priority calculus significantly.

Crucially: the eval ran against the **live 8d checkpoint** (inputDim 8, AUROC 0.096 link-pretext). The 768d candidate (AUROC 0.405, stratified) has never been promoted. Let me verify the candidate would eval better — run the eval against the candidate checkpoint, which exercises the full embeddingSource-forwarding path.

### Assistant | 2026-05-29T19:41:15.950Z

[tool_use: Bash]

### User | 2026-05-29T19:42:24.218Z

[tool_result] # NN-GRAPH-MS0 GNN Tier-5 Assessment — NN-EVAL

**Assessed:** 2026-05-29T19:42:15.656Z  ·  **Holdout:** 62 reference ghosts

> Internal-consistency metric — measures whether the GNN agrees with the
> keyword/sibling tiers' high-confidence labels. NOT verified ground truth.

## Mandatory gates

| Metric | Value | Gate | Result |
|---|---|---|---|
| AUROC | 0.6129 | >= 0.78 | FAIL |
| macro-F1 | 0.1
... [+525 chars truncated]

### Assistant | 2026-05-29T19:42:33.458Z

Decisive evidence. The 768d candidate evals at **AUROC 0.6129** vs the live 8d's **0.5** — a real +0.11 AUROC lift on the actual deploy-gate holdout (not just the link-pretext diagnostic). The embeddingSource forwarding works end-to-end (it loaded the 768d embeddings and produced differentiated confidence buckets). Still below the 0.78 gate, so promotion correctly stays blocked — but the candidate is the better model and the macro-F1 (0.13-0.14) is the binding constraint, not AUROC.

Key insight on macro-F1: holdout=62 but the buckets show all predictions cluster at 0.4 mean prob with accuracy ~0.5 — the classifier is barely better than chance on dispatcher assignment. The macro-F1 0.13 with ~12-class dispatcher space means most classes get F1=0.

Let me do quick dup-guard checks for my proposed improvements and confirm the nn-eval-refresh staleness + whether retrain lifecycle is scheduled. Then I have enough to write findings.

### Assistant | 2026-05-29T19:42:38.204Z

[tool_use: Bash]

### User | 2026-05-29T19:43:02.498Z

[tool_result] === retrain lifecycle status ===
NN-GRAPH retrain lifecycle — status

Live checkpoint: trained 2026-05-16T21:34:13.774Z
  AUROC 0.09607579891061868 · epochs 30 · stratified no
Drift baseline: recorded 2026-05-25T20:56:00.359Z
  nodes 288536 · edges 1056624 · ghosts 636
Last run: 2026-05-29T18:05:58.720Z — action=skip ok=true
  drift: no significant drift — nodes 3.8%, edges 3.6%, ghosts 0.0%; base
... [+1693 chars truncated]

### Assistant | 2026-05-29T19:43:15.785Z

I now have decisive evidence. Critical findings:

1. **The live checkpoint is the stale, WORSE model.** Live = 8d, AUROC 0.5 on holdout (chance). Candidate = 768d, AUROC 0.6129 on the SAME holdout. The candidate has been blocked from promotion since 2026-05-25 — correctly, because it's still <0.78, but it IS strictly better and the lifecycle has no path to deploy a "better-but-sub-gate" model.

2. **The retrain lifecycle is wedged in skip.** Status shows last run `action=skip` because drift (3.8% nodes, 3.6% edges, 0.0% ghosts) is below bands and baseline age 93h < 168h floor. The deterministic trainer over an unchanged graph reproduces the identical sub-gate candidate, so the maxAgeHours=168 floor will fire a wasted retrain every week with no metric improvement — the architecture changes needed to break 0.78 (macro-F1 is the binding constraint at 0.13) are NOT graph-drift-driven.

3. **`embeddingSource` wiring (U-NN-PREDICTOR-EMBED-WIRE) is COMPLETE and CORRECT** across all three call sites (predictor, eval via classify, lifecycle bridge). The candidate's metadata carries `embeddingSource`, and eval forwards it. Not a gap — it works.

4. **NN-EVAL.json is stale** (says deferred/poolSize:0; reality is graded/FAIL/poolSize≥124). The retrain lifecycle's `defaultEval` evaluates the **candidate** but the standalone `nn-eval-refresh`/SessionStart awareness reads frozen state.

5. **macro-F1 0.13 is the binding gate**, not AUROC. The internal-consistency eval scores dispatcher-class agreement over ~12 classes; chance-level voteShare means the GNN embedding space isn't separating dispatcher communities.

Let me do final dup-guard verification on my key proposals (promote-best-sub-gate ledger, F1-targeted loss).

### Assistant | 2026-05-29T19:43:20.002Z

[tool_use: Bash]

### User | 2026-05-29T19:43:38.323Z

[tool_result] === dup: candidate-vs-live comparison / shadow-deploy logic anywhere? ===
=== dup: any margin-loss / class-balanced / focal loss in trainer? ===
31 matches in 3 files:

470:0:[], finalLoss: NaN, epochs: 0, trained: false };
514:0:lossHistory[lossHistory.length - 1],
scripts/lib/graphsage-trainer.mjs:9:* sigmoid(z_u . z_v) and the loss is binary cross-entropy. Training pulls
scripts/lib/graphsage-t
... [+1817 chars truncated]

### Assistant | 2026-05-29T19:43:45.350Z

Confirmed: the india awareness script reads the **stale** `NN-EVAL.json` directly (line 27, `readJson(NN-EVAL.json)`) and reports DEFERRED/pool=0 — so every india session sees a false "gate deferred on data" status when the gate is actually graded-and-FAILING. The trainer uses plain BCE link-prediction loss with stratified negatives (no class-balanced/margin term for the dispatcher-classification objective the gate actually measures). No challenger/shadow-comparison logic exists anywhere (dup-clean).

I have comprehensive grounding. Writing findings now.

### Assistant | 2026-05-29T19:44:44.268Z

[tool_use: StructuredOutput]

### User | 2026-05-29T19:44:48.889Z

[tool_result] Structured output provided successfully

### Assistant | 2026-05-29T19:45:07.591Z

I've completed the deep-dive and returned findings via StructuredOutput. The headline result, grounded in live eval runs against the main tree (the worktree has none of the NN-GRAPH stack):

**The two P0 findings are state-divergence bugs, not code bugs:**
1. `NN-EVAL.json` is stale — it reports the gate as deferred (poolSize:0) while a live eval shows it's now graded-and-FAILING (holdout=62, live AUROC 0.5). The india awareness hook reads this stale file, so every india session sees a false status.
2. The lifecycle never re-evals the live checkpoint, so it can't see that the 768d candidate (AUROC 0.6129) is strictly better than the silently-degraded live 8d model (0.5) — and `promoteDecision`'s absolute-gate-only logic keeps the better model blocked.

**Honest "already built" calls:** the `embeddingSource` wiring (U-NN-PREDICTOR-EMBED-WIRE) is complete and correct across all three call sites — I verified it works end-to-end by running eval against the 768d candidate. The retrain lifecycle's safety invariant, locking, atomic swap, and `.prev` reversibility are solid. The macro-F1 (~0.14) is the real binding gate constraint, not AUROC — the training objective (link-prediction BCE) is misaligned with the multi-class dispatcher-separation the gate measures.

All five improvements target main (the NN stack isn't in the india worktree), with dup-risk verified by grep — no challenger/shadow logic exists today, and the loss-term/lifecycle changes are additive to existing pure functions.
