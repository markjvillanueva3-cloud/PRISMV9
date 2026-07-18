---
name: reference-ai-systems-survey-dedup-2026-06-10
description: "iter-7 ran an ultracode Workflow (wf_d6fc4216-b84, 8 agents) to rank AI-systems improvements; its TOP-PICK (BM25+dense RRF hybrid) was LARGELY ALREADY BUILT (hybrid-retrieval.mjs + reciprocalRankFusion.ts) -- deleted a triple-dup before commit. Lesson: a workflow's 'what we have' survey can be incomplete, so its 'not done' rankings need per-item live-code verification before building. Spec: state/shared/specs/AI-SYSTEMS-IMPROVEMENTS-2026-06-10.md."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.465Z
aliases: reference_ai_systems_survey_dedup_2026_06_10
---


2026-06-10 (slot:india, expanded /goal "find additional resources + ultracode/parallel-agents/Ollama,
Blackwell-aware"). Ran the requested ultracode Workflow `wf_d6fc4216-b84` (8 agents: 2 survey + 5
parallel web-research + 1 synthesis, 1.28M subagent tok, 400s) -> ranked 8 AI-systems improvements
(spec `state/shared/specs/AI-SYSTEMS-IMPROVEMENTS-2026-06-10.md`, committed a90f0979b1). The research
was solid + honest (flagged a non-existent file, corrected `nn-graph-eval.mjs` path, named the GNN #9
as label-starved-not-architecture-starved, calibration a measured dead-end).

**THE DEDUP CATCH (R8 -- the discipline earned its keep):** the survey agents MISSED existing infra,
so the TOP-PICK (hybrid BM25+dense -> RRF rerank) was **largely already built**:
- `scripts/lib/hybrid-retrieval.mjs` (PSN-ENHANCE-MS0/U-PSN-HYBRID-RETRIEVAL-WIRE) already composes 4
  substrates (memory-index BM25 + master-index graph BM25 + episode predicate + **Qdrant dense vector**)
  and fuses by **RRF (Cormack 2009, k=60)** with an Ollama-embeddings dense arm, pure-core DI, per-leg
  fail-tolerant.
- `utils/reciprocalRankFusion.ts` + `prism_ml:rag_search_rerank` (RAG-HYBRID v1, 2026-05-30, also india)
  = the pure RRF utility + single-call BM25-retrieve->rerank->RRF.
- I started a standalone `scripts/lib/rrf-fuse.mjs` and **DELETED it as a triple-dup** before commit
  (the memory-recall + dedup grep caught it).

**The ONE genuine remaining slice:** the live per-prompt reranker `.claude/scripts/tribal-rerank.mjs`
(PSN leg #5, fires every UserPromptSubmit across all 26 slots) does NOT consume `hybrid-retrieval.mjs`
(grep: zero hybrid/rrf/bm25/qdrant refs). Wiring it would put the already-built hybrid fusion on the
live recall path. **HIGH-BLAST-RADIUS** (every prompt, fleet-wide, recently clobber-prone) + adds a
Qdrant(:6333)+Ollama-embedding network dep + latency to a currently-fast local hook -> a careful
fresh-context unit (verify Qdrant has the tribal collection populated, measure per-prompt latency delta,
fail-soft to the current local path). NOT a context-constrained quick build.

**3rd DEDUP CATCH (deeper verify of the same TOP-PICK):** I read `.claude/scripts/tribal-rerank.mjs`
end-to-end -- it IS dense-only (cosine + 2x domain boost) -- and was about to add a lexical-fusion
stage inside it. STOPPED by a tribal-recall hit: U-RAG-2 (RAG-UPGRADE-MS0) already ships
`scripts/lib/lexical-rerank.mjs` (pure, sub-ms) and the inject hooks (`tribal-by-domain-inject.mjs`,
`memory-relevance-inject.mjs`) ALREADY do TWO-STAGE retrieval: tribal-rerank cosine = stage-1 recall,
`lexicalRerank` = stage-2 precision rerank, fail-OPEN. So the dense->lexical hybrid is LIVE fleet-wide
at the CORRECT (hook) layer; adding it inside tribal-rerank would DOUBLE-APPLY lexical scoring. Reverted
the import before commit (tribal-rerank byte-identical). **The RAG TOP-PICK is FULLY BUILT** -- nothing
to do. (commits a90f0979b1 + 0928c7f537 + 95d86f5a6d document the verification arc.)

**NET (R12, honest):** every high-value workflow item verified -> ALREADY BUILT (RAG hybrid via U-RAG-2
two-stage + hybrid-retrieval 4-substrate RRF; CAG via cag-router; cross-run lessons via
handoff-memory-seed). THREE would-be dups prevented this session (rrf-fuse.mjs, the tribal-rerank lexical
wiring). The genuine remaining AI-systems levers are OPERATOR/GPU/DATA-gated (rsLoRA train on
fleet-lora-combined, GNN reference-pool labels for #9), NOT more india code. PRISM's AI-systems infra is
mature + wired; "no dormant nodes" is certified by verification, not by manufacturing redundant builds.

**LESSON (reusable):** an orchestration Workflow is only as good as its survey leg. When the survey is
read-limited it will rank already-built things as "not done." ALWAYS run the dedup grep + memory-recall
on the specific files BEFORE building any workflow-recommended item -- treat "not done" as "unverified".
See [[reference_rag_hybrid_ms0_2026_05_30]] (the v1 RRF) + the PSN-ENHANCE hybrid-retrieval substrate.
Prior AI-systems roadmaps from earlier workflows: [[reference_india_ai_systems_deepdive_2026_05_29]],
[[reference_fleet_ai_systems_roadmap_2026_06_01]].

**FOLLOW-UP (same day, fresh post-compact lap) -- R15 WIRE question settled by DIRECT CODE-READ,
upgrading the prior "claimed wired" to "code-verified wired at file:line":**
- GNN tier-5 selective-deploy IS wired into the live ghost-classification cascade.
  `scripts/seed-ghost-gnn-classify.mjs:575` applies the abstain gate `if (reportedConf < cfg.minConf) continue;`
  (default `GNN_DEFAULTS.minConf:0.7`, line 64). The cascade (header lines 6-14 + entry `classifyUnknownsViaGnn`
  lines 628-632) runs keyword -> expanded-keyword -> sibling-prefix -> GNN(this) -> LLM tier; abstained/skipped
  ghosts defer to `seed-ghost-llm-classify.mjs`. Textbook risk@coverage selective deploy, LIVE.
- The reference pool grows in a CLOSED LOOP (NOT operator hand-feeding): `refMinConf:0.8` (line 65) means an
  LLM-tier classification at >=0.8 conf becomes a GNN vote-reference; `vault-to-gnn-refpool.mjs` +
  `nn-graph-retrain-lifecycle.mjs` (S4U scheduled task) consume them. So ref-pool accrual compounds with fleet
  activity automatically. The ONLY operator/GPU-gated piece left for FULL-coverage lift is the H2GCN feature
  retrain (high-variance single-seed -- see [[feedback_multiseed_before_auroc_claim]]; needs multi-seed GPU
  validation, NOT calibration which is a measured dead end).
- `audit-unwired-engines.mjs` is correctly deterministic (dispatcher->routes->registries->WIRED-VIA-ENGINE) and
  does NOT call the GNN -- they are separate concerns (deterministic engine-audit vs GNN ghost-NODE inference).
- The loop's fleet-fallback unit `XPROC-NEURAL-OPTIMIZE-MS0 / U-NN-TIER05` is a GHOST milestone (status:ghost,
  placeholder units U-NN-FIX/FEAT/LOOP, no concrete spec; U-NN-TIER05 was synthesized by the roll). Building
  blind against it = slop. NET unchanged: india AI-systems axis = wired+tested+self-improving; remainder GPU-gated.

**VALIDATION-ARTIFACT CHECK (same lap) -- the DEPLOYED config IS validated; only the ASPIRATIONAL one is not:**
- Read `state/shared/nn-graph/NN-EVAL.json` (106.3h stale). `deployGrade.pass: true`, verdict
  `deploy-ready-selective`. Production gate tau=0.7: coverage 0.3226, Brier 0.0406, macroF1 1.0, classesEmitted
  2/6, `robustAboveGate:true`. That `pass:true` IS the validation of the deployed selective tier-5. The
  full-holdout `grade.pass:false` ("shipped-research-only": macroF1 0.4389<0.55, Brier 0.179>0.15) is the
  ASPIRATIONAL full-coverage config -- that is what is "not validated", and its lift is H2GCN+GPU, not code.
- **NOISE-TRAP CAUTION (do NOT act on without multi-seed):** the selective curve is NON-MONOTONIC in macroF1 --
  tau=0.45 fails (0.4645), tau=0.50 PASSES (0.5867, coverage 0.4677, 3 classes, both gates clear), tau=0.55
  fails (0.4833). So tau=0.50 looking like a strictly-better operating point (+45% coverage, 3/6 classes vs
  2/6, clears both gates) is almost certainly a 62-ghost small-sample artifact, NOT signal. The production
  gate 0.7 (macroF1=1.0 robust across 0.65-0.80) is correctly the robust pin; the artifact note confirms it is
  "anchored on the production gate, NOT the most-favorable tau". Lowering GNN_DEFAULTS.minConf to 0.5 on this
  one noisy curve = the exact single-seed-AUROC mistake [[feedback_multiseed_before_auroc_claim]] warns against.
  A FRESH re-eval (grown closed-loop ref-pool) is the real next validation step, but it streams the 548MB graph
  -> host-gated (memory pressure); do on a less-degraded host, NOT in a YELLOW-budget lap.
