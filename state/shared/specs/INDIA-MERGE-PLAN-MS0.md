# INDIA-MERGE-PLAN-MS0 — land india's 6 features onto main

> **For a fresh-budget india session.** Operator unblocked self-merge 2026-05-31 ("golf no longer the sole merge slot — each slot can merge"). Drafted by slot india `claude-05ceb444` at 70% budget; execution deferred to a clean session (operator-chosen).

## The blocker that is NOT permission

`slot/india` has **UNRELATED git history** with `main` (no merge-base; **1695 ahead / 874 behind**, history-strip). So `git merge slot/india` into main does NOT work (would need `--allow-unrelated-histories` → a 2569-commit conflict storm). **Landing = cherry-pick the 25 session commits** (range `cd4195d40a..<india HEAD>`), or `git format-patch` + `git am`, onto a **main-based worktree**.

## What lands (6 features, all 3-of-3 PASS on slot/india)

GOAL-FORMALIZER · EMBEDDING-SSOT · RAG-HYBRID v1 (RRF + rag_search_rerank) · RAG-HYBRID v2 (dense arm) · U-PATH-5 (rag_eval) · U-PATH-6 (EmbeddingPipeline honesty). + galaxy-doctrine docs (AI-T9..T12) + pathway plan.

## Conflict map

### A. 11 NEW files — cherry-pick CLEAN (no conflict possible; they don't exist on main)
```
mcp-server/src/engines/DimensionalVerifier.ts            (+ __tests__/DimensionalVerifier.test.ts)
mcp-server/src/engines/ProblemTemplateCatalog.ts         (+ test)
mcp-server/src/engines/GoalFormalizerEngine.ts           (+ test)
mcp-server/src/engines/SolverRouter.ts                   (+ test)
mcp-server/src/engines/TribalDenseRecallEngine.ts        (+ test)
mcp-server/src/config/embeddingContract.ts               (+ embeddingContract.test.ts)
mcp-server/src/utils/reciprocalRankFusion.ts             (+ reciprocalRankFusion.test.ts)
mcp-server/src/utils/retrievalMetrics.ts                 (+ retrievalMetrics.test.ts)
mcp-server/src/__tests__/aiReasoningDispatcher.formalizeGoal.integration.test.ts
mcp-server/src/__tests__/embedding-backend-contracts.test.ts
mcp-server/src/__tests__/mlDispatcher.ragSearchRerank.integration.test.ts
mcp-server/src/__tests__/mlDispatcher.ragEval.integration.test.ts
mcp-server/src/__tests__/TribalDenseRecallEngine.test.ts
mcp-server/src/__tests__/EmbeddingPipelineEngine.stats.test.ts
mcp-server/scripts/build-tribal-dense-index.mjs
+ wiki: knowledge/wiki/architecture/{goal-formalizer,embedding-ssot,rag-hybrid}-ms0.md
+ galaxy docs: mcp-server/src/engines/ai-training/{CLAUDE,MEMORY,RULES,KNOWLEDGE}.md edits
```

### B. 7 commits edit 4 SHARED dispatcher/schema files — ALL ADDITIVE → conflict = re-apply the addition to main's current file
| Commit | Shared files | The additive edit (re-apply if it conflicts) |
|--------|-------------|----------------------------------------------|
| `5139a95ffb` GOAL-FORMALIZER/U4b | aiReasoningActionSchemas.ts · aiReasoningDispatcher.ts | +`"formalize_goal"` in `AI_REASONING_ACTIONS` tuple; +`formalize_goal` zod schema in `ACTION_AI_REASONING_SCHEMAS` (exhaustive Record — REQUIRED); +`case "formalize_goal"` in the switch (lazy-imports GoalFormalizerEngine + SolverRouter) |
| `8952676f00` EMBEDDING-SSOT/U2 | EmbeddingPipelineEngine.ts · OllamaEmbedderEngine.ts · LocalEmbeddingEngine.ts | each: `import {…} from config/embeddingContract`; source model/dim from the SSOT (value-preserving); add a `contract()` method. Local→minilm-384, Ollama→nomic-768 (dynamic), Pipeline→mpnet-768 target |
| `175ce3cf90` RAG-HYBRID/U1 | mlActionSchemas.ts · mlDispatcher.ts | +`"rag_search_rerank"` enum + schema + `case` (BM25→rerank→RRF) |
| `eabfd6f404` RAG-HYBRID/U3 | mlActionSchemas.ts · mlDispatcher.ts | +`use_dense`/`dense_index_path` to rag_search_rerank schema; dense-arm block in the case (try/catch best-effort) |
| `b1e0012093` RAG-HYBRID/U-PATH-5 | mlActionSchemas.ts · mlDispatcher.ts | +`"rag_eval"` enum + schema + `case` |
| `a8e3958b7a` RAG-HYBRID/U-PATH-5d | mlActionSchemas.ts | +`.refine()` on rag_eval (mode=provided requires runs) |
| `3399e18a84` RAG-HYBRID/U-PATH-6 | EmbeddingPipelineEngine.ts | +required `retrieval: "lexical"\|"vector"` field on `EmbeddingStats` + `getStats` sets `"lexical"` |

> All B-edits APPEND to enum tuples / schema maps / switch bodies → conflicts (if any) are mechanical re-applications, not logic merges. The action enums + Record maps are exhaustive-typed, so tsc will catch a missed schema/case after merge.

## Execution recipe (fresh session)
1. `git worktree add ../prism-merge-india main` (or use an existing main-based tree). NEVER `git merge slot/india`.
2. Cherry-pick the range in order: `git cherry-pick cd4195d40a..<india HEAD>` (or `format-patch` + `am`). New-file commits apply clean; resolve the 7 B-commits by re-applying the additive edit (table above) to main's current file.
3. **Verify on MAIN (not the worktree):** `cd mcp-server && npm run build` (must stay clean — main has 0 tsc errors; slot/india's 1278 are pre-existing staleness, NOT real). Then `npx vitest run --watch=false` on the 14 new test files (must be green). Confirm the action enums/schemas/cases all match (tsc exhaustiveness gate).
4. Activate the dense arm: `node scripts/build-tribal-dense-index.mjs` (now have the corpus on main) → writes `data/state/TRIBAL_DENSE_INDEX.json` → `rag_search_rerank` dense arm goes live.
5. Push; update MILESTONE_PROGRESS / BUILD_STATE / roadmap-index per [[feedback_roadmap_close_out]].

## Gotchas (this session, carry forward)
- rtk strips the `run` subcommand from `vitest run` → watch-mode hang. Always `npx vitest run --watch=false`.
- `rtk npx tsc` OOM-aborts (exit 134) → reports false "No errors found". Use `NODE_OPTIONS=--max-old-space-size=12288 npx tsc --noEmit` and verify it printed the "Found N errors" summary line before trusting it.
- repo-wide ripgrep degraded this session (orphan procs) → single-file Grep only.

Related: [[reference_each_slot_can_merge_2026_05_31]] (doctrine) · the 6 feature memories (reference_{goal_formalizer,embedding_ssot,rag_hybrid_ms0,rag_hybrid_v2_dense_arm,rag_eval_harness_u_path_5,embedding_pipeline_lexical_honesty_u_path_6}).
