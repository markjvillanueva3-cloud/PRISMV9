---
type: "chat-session"
source: "claude-code-cli"
session_id: "72879035-e0ca-4192-9498-ed9720495151"
title: "Review this NEW file end-to-end (whole file, every path): `H:/prism/scripts/lib/"
date: "2026-06-11"
first_ts: "2026-06-11T03:24:14.934Z"
last_ts: "2026-06-11T03:27:29.604Z"
cwd: "H:\\prism-slot-india"
messages: 31
user_msgs: 11
assistant_msgs: 20
raw_file: "H:/.claude/projects/H--prism-slot-india/72879035-e0ca-4192-9498-ed9720495151/subagents/agent-a6bc0cc30a6eea197.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:57"
---

# Review this NEW file end-to-end (whole file, every path): `H:/prism/scripts/lib/

> **claude-code-cli** | 2026-06-11 | 31 msgs (11 user / 20 assistant) | cwd: H:\prism-slot-india
> Raw: `H:/.claude/projects/H--prism-slot-india/72879035-e0ca-4192-9498-ed9720495151/subagents/agent-a6bc0cc30a6eea197.jsonl`

## Transcript

### User | 2026-06-11T03:24:14.934Z

Review this NEW file end-to-end (whole file, every path): `H:/prism/scripts/lib/gnn-active-pool-select.mjs`

CONTEXT (verify the code against this spec):
- It is a GNN active-learning ghost selector for PRISM slot:india. The tier-5 ghost-wiring classifier (`scripts/seed-ghost-gnn-classify.mjs`) passes AUROC (0.808) but fails macro-F1 (0.439<0.55) because minority dispatcher classes are label-starved. This module ranks WHICH unlabeled ghosts an operator should label first.
- Substrate (verified): `classifyUnknownGhosts(graph,{minConf:0})` returns `{classifications:[{engine,dispatcher,confidence,voteShare,reason}], stats:{targets,classified,mode}, skipped, reason}`. With minConf:0 ALL voted targets are returned with their real confidence. Graph nodes with `kind==='ghost.unwired-engine'` and `confidence>=refMinConf` carry `.proposed_wiring` (assigned dispatcher class) = the labelled reference pool. The classifier runs EDGELESS (no per-node graph adjacency), so there is intentionally NO per-node heterophily skip.
- Acquisition = wU*uncertainty(=1-confidence) + wB*classRarity(=1-refCount/maxRef); then a greedy class-diversity re-rank (gamma decay per same-class pick). The pure core (computeAcquisition/diversityRerank/referenceClassDistribution/extractReferences) must be fs-free + deterministic.

Focus your review on:
1. CORRECTNESS of the math: does acquisition correctly target macro-F1? Is classRarity well-defined when maxRef=0 (cold start, no references)? Any divide-by-zero, NaN propagation, or off-by-one?
2. DETERMINISM: are sorts + tie-breaks stable and reproducible? The repo bans Date.now()/Math.random() in hot paths — note writeWorklist uses `new Date().toISOString()` for a report timestamp (acceptable for a report, but flag if it leaks into ranking).
3. The diversityRerank greedy: O(n^2) bounded by rerankPoolCap — is the tie-break logic correct (the `best` object comparison when bestEff ties)? Does it ever pick a wrong index or infinite-loop? Does it mutate its in
... [+716 chars truncated]

### Assistant | 2026-06-11T03:24:17.663Z

I'll review this file end-to-end. Let me start by reading the complete file.

### Assistant | 2026-06-11T03:24:18.029Z

[tool_use: Read]

### User | 2026-06-11T03:24:20.567Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * gnn-active-pool-select.mjs -- GNN active-learning ghost selector
4	 *   (AI-SYSTEMS-IMPROVEMENTS #4, slot:india, OBSIDIAN-AI-SYNERGY 2026-06-10)
5	 *
6	 * WHY THIS EXISTS
7	 *   The tier-5 ghost-wiring classifier (`seed-ghost-gnn-classify.mjs`) PASSES the
8	 *   AUROC gate (0.808 >= 0.78) but FAILS macro-F1 (0.439 < 0.55). Root cause, measured
9	 *   over NN-GRAPH 
... [+21556 chars truncated]

### Assistant | 2026-06-11T03:24:23.645Z

I have the complete file. Now let me verify the key claim about the substrate contract before analyzing the math. Let me check the classifier's actual return shape and how `proposed_wiring` / `confidence` are set on graph nodes.

### Assistant | 2026-06-11T03:24:25.522Z

[tool_use: Bash]

### Assistant | 2026-06-11T03:24:26.489Z

[tool_use: Bash]

### User | 2026-06-11T03:24:38.197Z

[tool_result] 16: *      engines whose proposed_wiring is a real prism_* dispatcher AND whose
55:export const DEFAULT_CHECKPOINT = path.join(ROOT, "state", "shared", "nn-graph", "graphsage-checkpoint.json");
58:export const GHOST_KIND = "ghost.unwired-engine";
61:export const DISPATCHER_RE = /^prism_[a-z0-9_]+$/;
63:export const GNN_DEFAULTS = Object.freeze({
64:  minConf: 0.7,         // GNN gate fires only at
... [+120 chars truncated]

### User | 2026-06-11T03:24:38.793Z

[tool_result] 9: * UNKNOWN it resolves with confidence >= PRISM_NNG_MIN_CONF is pre-empted out
10: * of the (slow, ~0.55-confidence) Ollama batch.
15: *   2. The reference set is the cascade's own high-confidence output: ghost
17: *      confidence >= PRISM_NNG_REF_MIN_CONF (the keyword tier, ~0.85).
23: *      model's link head, take the top-K, and take a confidence-weighted vote
25: *      confidence (capped 
... [+3921 chars truncated]

### Assistant | 2026-06-11T03:24:42.355Z

The classifier contract is confirmed: `{ skipped, reason, classifications: [{engine, dispatcher, confidence, reason, voteShare}], stats }`, with `empty()` returning `stats` possibly without `targets`/`classified`. Let me verify the exact `stats` keys on the success path and the `minConf` handling, since the spec's claim about `unvoted = targets - classified` depends on what the classifier actually puts in `stats`.

### Assistant | 2026-06-11T03:24:43.689Z

[tool_use: Bash]

### User | 2026-06-11T03:24:49.856Z

[tool_result] 3:  const empty = (skipped, reason, stats = {}) => ({ skipped, reason, classifications: [], stats });
7:  // Direct-embed (GNN-F0/2d) votes raw nomic cosine — no checkpoint/model needed.
15:    if (!predictor || !predictor.model) return empty(true, "invalid-predictor");
24:  // targets here keeps compute, --apply scope, and reported stats all honest.
25:  let targets = partition.targets;
26:  if (
... [+1597 chars truncated]

### Assistant | 2026-06-11T03:24:52.957Z

The success-path `stats` has `targets`, `classified`, and `mode` — confirming the spec. Now let me check the critical `minConf:0` filter line and one more thing: whether `classified` on the success path equals `classifications.length` (so `unvoted` would be correct), and the `voteShare` presence on each classification.

### Assistant | 2026-06-11T03:24:53.842Z

[tool_use: Bash]

### User | 2026-06-11T03:25:22.659Z

[tool_result]     if (reportedConf < cfg.minConf) continue;
    classifications.push({
      engine: target.label,
      dispatcher: v.dispatcher,
      confidence: Math.round(reportedConf * 1e4) / 1e4,
      voteShare: Math.round(v.voteShare * 1e4) / 1e4,
      reason: `GNN tier-5 k-NN label-prop (voteShare ${v.voteShare.toFixed(2)}, k=${v.k}${confCal ? ", calibrated" : ""})`,
    });
  }
  return {
    skippe
... [+496 chars truncated]

### Assistant | 2026-06-11T03:25:29.559Z

Now I have the full contract verified. A critical finding emerges: the classifier loop computes votes only over `targets` (nodes that are NOT references), and `classified = classifications.length`. With `minConf:0`, all voted targets pass the filter. But there's an important subtlety: `targets` excludes references, so `unvoted = targets - classified` represents targets that produced no vote (`v` was null). Let me verify the `v` null path inside the loop to confirm the `unvoted` semantics.

### Assistant | 2026-06-11T03:25:29.807Z

[tool_use: Bash]

### User | 2026-06-11T03:25:38.174Z

[tool_result]   const classifications = [];
  for (const target of targets) {
    const v = voteDispatcher(target, embeddings, references, {
      topK: cfg.topK,
      calibrator,
      confidenceCap: cfg.confidenceCap,
      baseRateAlpha: cfg.baseRateAlpha,
      minClassRefs: cfg.minClassRefs,
      baseRateDisabled: cfg.baseRateDisabled,
    });
    if (!v) continue;
    // Report (and gate on) the calibra
... [+407 chars truncated]

### Assistant | 2026-06-11T03:25:48.325Z

The contract is fully verified. With `minConf:0`, the only way a target is in `targets` but not in `classifications` is `v === null` (no reference neighbour to vote). So `unvoted = targets - classified` correctly captures "label-starved, no voting neighbour" ghosts. The spec claim holds.

Now I have everything needed to assess the math, determinism, and edge cases against the verified substrate. Let me trace the remaining concern points precisely.

**Determinism / tie-break in `diversityRerank` (lines 200-218)** — let me reason through the `best` comparison carefully. On the first iteration of the inner loop (`i=0`), `best` is `null`. The condition is `eff > bestEff || (eff === bestEff && best && strLt(...) < 0)`. With `bestEff = -Infinity`, `eff > bestEff` is true for any finite `eff`, so `best` gets set. Good — no null-deref because the `best &&` guard short-circuits. But there's an edge: if `eff === -Infinity` (e.g. `acquisition=0` and `gamma=0` and `seen>0` gives `0 * 0 = 0`, not -Inf; but `acquisition` could be 0 and `Math.pow(0,0)=1` so `eff=0`). Can `eff` be `-Infinity`? Only if `acquisition` is `-Infinity`, which `round4`/`finiteOr` prevent. So `bestIdx` is always set to a valid index ≥0 when `remaining.length>0`. No infinite loop (splice always removes one). 

Let me double-check one numeric subtlety in the tie-break and the `Math.pow(gamma, seen)` when `gamma=0, seen=0`.

### Assistant | 2026-06-11T03:25:50.022Z

[tool_use: Bash]

### User | 2026-06-11T03:25:54.294Z

[tool_result] pow(0,0)= 1
pow(0,2)= 0
0*pow= 0
round4(-0)= -0

### Assistant | 2026-06-11T03:25:59.767Z

Math is sound: `pow(0,0)=1`, no `-Infinity`/NaN. Now let me verify the one genuine concern I see — whether `diversityRerank` mutates its input. It does `base.slice(0,cap).map(x => ({...x}))` (shallow clones) so input array isn't reordered, and elements are cloned before mutation (`chosen.effectiveScore`, `m.rank`). Input is NOT mutated. Good.

Let me now check the determinism of the tie-break one final time with a concrete adversarial case: two items with equal `eff` where the lexically-smaller one appears *later* in the array.

### Assistant | 2026-06-11T03:26:05.459Z

[tool_use: Bash]

### User | 2026-06-11T03:26:11.106Z

[tool_result] order: alpha,zeta
input untouched: zeta,alpha
rerun order: alpha,zeta
same-class tie: a,b

### Assistant | 2026-06-11T03:26:13.894Z

Tie-break is correct and deterministic: lexically-smaller engine wins even when it appears later; input array is untouched; reruns are identical. 

Now let me verify the cold-start (`maxRef=0`) and empty/malformed edge cases empirically to confirm no NaN/crash.

### Assistant | 2026-06-11T03:26:22.766Z

[tool_use: Bash]

### User | 2026-06-11T03:26:27.347Z

[tool_result] coldstart rarity= 1 acq= 0.82
malformed scored len= 1 skipMal= 3
all-confident unc= 0 rarity= 0.8 acq= 0.32
empty= 0
null graph refs= 0
skipped pool worklist= 0 classifierSkipped= true unvoted= 0
fallback targets= 1 voted= 1 unvoted= 0

### Assistant | 2026-06-11T03:26:34.837Z

All edge cases pass cleanly: cold-start `classRarity=1` (no NaN), malformed entries skipped (3 of 4), all-confident relies on rarity, empty/null safe, skipped classifier yields empty worklist with correct flags, and the stats-fallback (when classifier omits `targets`/`classified`) defaults to `classifications.length` so `unvoted=0` rather than going negative.

Let me check one final correctness concern: the spec note about `unvoted` semantics when the classifier's `stats.classified` differs from `classifications.length`. On the verified success path they're equal, but `selectActivePool` reads `res.stats.classified` for `voted` and `classifications.length` for `scored`. Let me confirm there's no inconsistency if a classifier returned a `stats.classified` that disagrees — and also verify the `cap=0` rerank edge (everything goes to tail).

### Assistant | 2026-06-11T03:26:47.405Z

[tool_use: Bash]

### User | 2026-06-11T03:26:53.029Z

[tool_result] cap0 order: b@0.48,a@0.06 ranks: 1,2
diversity order: p,q,r,p,p,p

### Assistant | 2026-06-11T03:27:29.604Z

All paths verified. `cap=0` correctly routes everything to tail with `effectiveScore=acquisition` and sequential ranks; diversity re-rank spreads across classes (`p,q,r` first before returning to `p`). 

I have completed an exhaustive, substrate-verified review. Let me record findings and finalize.

## Code Quality Analysis Report — `gnn-active-pool-select.mjs`

### Summary
- Files Analyzed: 1 (target) + verified against `scripts/seed-ghost-gnn-classify.mjs` substrate
- Verification method: read full file end-to-end, confirmed the classifier contract (`classifications`/`stats.{targets,classified,mode}`/`skipped`/`reason`, each classification carrying `{engine,dispatcher,confidence,voteShare}`) against the actual source at `seed-ghost-gnn-classify.mjs:558-598`, then ran 6 live executions covering math, determinism, mutation, and every named edge case.
- P0 issues: 0
- P1 issues: 0
- Result: every focus area checks out.

### Focus-area verdicts (all verified, not asserted)

1. **Math / macro-F1 targeting (lines 159-164):** Correct. `classRarity = maxRef>0 ? 1 - refCount/maxRef : 1` — the `maxRef>0` guard makes cold-start return `1` (verified live: `classRarity=1, acq=0.82`), no divide-by-zero, no NaN. `uncertainty = 1-conf` with `conf` clamped to `[0,1]` by `finiteOr`, so `uncertainty ∈ [0,1]`. Zero-reference classes correctly score the max rarity term — that is exactly the lever that grows minority-class references and lifts the macro (mean-of-per-class) F1. Acquisition is a convex combination of two `[0,1]` terms; bounded, monotone, sound.

2. **Determinism (lines 90, 176, 208, 257):** Correct. Primary sort is `acquisition desc` with `strLt(engine)` lexical tie-break — total order, stable, reproducible (verified: identical output across reruns). `classDistribution` is sorted `count desc` before `Object.fromEntries`. The only `new Date().toISOString()` is at `writeWorklist:307` for the report `generatedAt` meta — it is **not** read by any ranking path (`computeAcquis
... [+4314 chars truncated]
