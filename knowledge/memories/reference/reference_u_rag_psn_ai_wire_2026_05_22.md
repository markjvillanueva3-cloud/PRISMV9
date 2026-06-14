---
name: u-rag-psn-ai-wire-2026-05-22
description: "U-RAG-PSN-AI-WIRE (RAG-UPGRADE-MS0 follow-on) — synergized RAG with the 11th PSN leg (prism_ai canonical AI dispatcher). Cross-wires ReRankerEngine as prism_ai:rag_rerank mirroring OUTCOME_CROSSWIRE pattern. 13/13 tests. Code shipped in peer-absorbed commit 3de1e7a82e; HTML companion in own commit b3ce303247."
aliases: reference_u_rag_psn_ai_wire_2026_05_22
type: reference
source: prism-memory
synced: 2026-06-09T14:54:11.021Z
---


# U-RAG-PSN-AI-WIRE — RAG synergized with PSN leg #11 (2026-05-22, golf, post-/compact)

## What shipped

Operator post-/compact directive: `synergize rag with PSN`. Audit identified `prism_ai` (the canonical AI dispatcher, 257+ actions) as the 11th PSN leg with **zero RAG surface** — despite [[reference_rag_upgrade_ms0_2026_05_22|RAG-UPGRADE-MS0]] shipping U-RAG-1..5 with system-viz/obsidian/wiki/GNN wires. Operators routing through `prism_ai` for AI tasks had to switch to `prism_ml` just to call the RAG reranker.

**Cross-wires `ReRankerEngine` as `prism_ai:rag_rerank`** (canonical home stays `prism_ml:rag_rerank`). Per dispatcher convention "cross-dispatcher calls forbidden — use shared engines instead", BOTH surfaces call the same static `ReRankerEngine.rerank` / `diverseRerank` — no delegation chain.

### Pattern source

Mirrors `OUTCOME_CROSSWIRE_ACTIONS` (peer-shipped same day, 2026-05-22, by slot oscar — commit `0fd90359de`, see [[reference_psn_outcome_wire_2026_05_22]]). New `RAG_CROSSWIRE_ACTIONS` constant sits next to it for future RAG cross-wires.

### Surface

```
prism_ai → rag_rerank({query, candidates[], top_k?, diversity_weight?}) → ReRankerEngine.{rerank|diverseRerank}
```

Diversity-weight present → `diverseRerank` (MMR). Absent → `rerank`. Both static methods validate input internally via `ReRankInputSchema` — malformed input returns degraded `{results:[], candidates_evaluated:0}` shape, never throws.

## Files

| File | Δ lines | Where shipped |
|---|---|---|
| `mcp-server/src/tools/dispatchers/aiReasoningDispatcher.ts` | +51 | peer-absorbed `3de1e7a82e` |
| `mcp-server/src/__tests__/aiReasoningDispatcher.uRagPsnAiWire.test.ts` | +283 (new) | peer-absorbed `3de1e7a82e` |
| `state/shared/specs/RAG-UPGRADE-MS0.md` | +1 row | peer-absorbed `3de1e7a82e` |
| `state/shared/specs/RAG-UPGRADE-MS0.html` | +167 (regen) | own commit `b3ce303247` |

## Peer-absorption (3rd time this session pattern repeats)

Sequence: I `git reset HEAD` after a peer staged a ZULU spec; `git add` my 3 paths; sleep+retry for index.lock; `git commit` with pathspec — but in the lock-clear window foxtrot's `git commit` for `U-PB-SUGGEST-RESOLUTION-P1FIX` swept up my 3 staged files into THEIR commit `3de1e7a82e` (subject: "39 tests still passing" — those 39 include my 13). My subsequent `git commit -- pathspec1 pathspec2 ...` then found no remaining diff for the absorbed paths, so only the HTML stayed and shipped as `b3ce303247`.

Same class as:
- [[reference_u_rag_3_wiki_absorption_2026_05_22]] (golf wiki, absorbed by whiskey `8c96ebb8b4`)
- [[reference_h8_misattribution_2026_05_20]] (echo H8, absorbed by hotel `30b7d45f1d`)
- [[reference_git_index_saturation_camx11_2026_05_18]] (kilo CAMx, root-cause analysis)

Content correct; attribution misroute. The HEAD reflects the work — I verified `RAG_CROSSWIRE_ACTIONS` const + `case "rag_rerank":` block are live in `git show HEAD:mcp-server/src/tools/dispatchers/aiReasoningDispatcher.ts`.

## Test posture

**13/13 new tests** in `aiReasoningDispatcher.uRagPsnAiWire.test.ts`:
1. Tool registered as `prism_ai` (single tool)
2. `rag_rerank` accepted by z.enum (round-trip via MockMCPServer)
3. Empty candidates → `candidates_evaluated:0` (slimResponse strips empty `results[]` — documented in test)
4. Single candidate degenerate rerank
5. Multi-candidate sorted by rerank score (title-match dominates over excerpt)
6. `top_k=2` bound honored
7. Default `top_k=3` applied
8. `diversity_weight` present triggers `diverseRerank` branch + MMR keeps diverse candidate in top-3
9. `score_distribution {min,max,mean}` present
10. `rerank_time_ms` non-negative
11. `query` field echoed
12. Two consecutive calls — engine stateless
13. Malformed candidate (missing `source_type`) → engine validation rejects, returns degraded shape — does NOT throw

**Cross-checked with U-WIRE03 reference test: 38/38 pass.** Pre-existing peer failures in `tier10-wire` + `uwire11` are unrelated to this change.

## Key lessons (R8 / R12 reinforcement)

- **R8 (read before write):** discovered `slimResponse` strips empty arrays only AFTER first test run failed — and the graph context hook had named this exact behavior in 8 chars ("[[reference_slimresponse_strips_empty_arrays|slimResponse strips empty arrays]] at MCP transport"). The graph would have answered first.
- **R12 (fail-loud):** the dispatcher case correctly hands degraded engine output through unchanged. The R12 signal lives in `candidates_evaluated:0` (numeric zero survives slim) — not `results` (empty array stripped). Tests assert on the surviving signal.
- **Per-result field is `score`, not `rerank_score`:** engine overwrites input score with reranked score before returning. Confirmed via line 205-212 of ReRankerEngine.ts.

## PSN status after this unit

| PSN leg | RAG wiring |
|---|---|
| 1. Obsidian brain | ✓ `memory-relevance-inject` |
| 2. PRISM OS | (no rag_*, defer — low leverage) |
| 3. Wiki | ✓ U-RAG-1 wiki→tribal embeddings |
| 4. Memories | ✓ via memory-relevance-inject |
| 5. Tribal | ✓ `tribal-by-domain-inject` |
| 6. System Viz | ✓ U-RAG-4 ghost.rag_upgrade roost |
| 7. Engines | ✓ RetrievalEvalEngine + ReRankerEngine |
| 8. Algorithms | ✓ lexical-rerank lib (used by U-RAG-2 hooks) |
| 9. Formulas | ✓ BM25-lite scoring (in lexical-rerank lib) |
| 10. NN/GNN | ✓ bridge wired (empirical AUROC pending mapping layer) |
| 11. PRISM AI | ✅ **THIS UNIT** — `prism_ai:rag_rerank` |

10 of 11 legs solidly wired. Leg #2 (`prism_operating_system`) is a lower-leverage gap — that dispatcher is shell/desk/program-release scoped, not retrieval-oriented. Defer.

## See also

- [[reference_psn_outcome_wire_2026_05_22]] — sister pattern (oscar's outcome cross-wire, same day)
- [[reference_rag_upgrade_ms0_2026_05_22]] — parent milestone tracker
- [[reference_u_rag_3_batch_context_plumbing_2026_05_22]] — earlier same-session unit
- [[feedback_psn_definition]] — PSN ≡ 11-leg union
- [[reference_git_index_saturation_camx11_2026_05_18]] — peer-absorption / pathspec-only commit pattern
