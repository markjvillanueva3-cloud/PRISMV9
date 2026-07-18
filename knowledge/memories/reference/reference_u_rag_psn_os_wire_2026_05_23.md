---
name: u-rag-psn-os-wire-2026-05-23
description: "U-RAG-PSN-OS-WIRE (RAG-UPGRADE-MS0 follow-on, sister to U-RAG-PSN-AI-WIRE) — synergized RAG with the 2nd PSN leg (prism_operating_system, 47-action shell/desk/program-release dispatcher). Cross-wires ReRankerEngine.rerank/diverseRerank as prism_operating_system:rag_rerank — third surface for the engine after prism_ml (canonical) + prism_ai. 13/13 tests. Closes PSN-leg RAG coverage 10/11 → 11/11."
aliases: reference_u_rag_psn_os_wire_2026_05_23
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.244Z
---


# U-RAG-PSN-OS-WIRE — RAG synergized with PSN leg #2 (2026-05-23, golf)

## What shipped

Operator post-/compact directive: `do everything you suggested` — green-light to ship BOTH high-leverage follow-ups. This unit is the second of the pair (sister to [[reference_u_rag_psn_ai_wire_2026_05_22|U-RAG-PSN-AI-WIRE]] for the AI-dispatcher leg, see [[reference_u_rag_psn_ai_wire_2026_05_22]]).

**Cross-wires `ReRankerEngine` as `prism_operating_system:rag_rerank`** (canonical home stays `prism_ml:rag_rerank`; second surface is `prism_ai:rag_rerank` shipped 2026-05-22). Per dispatchers/CLAUDE.md "cross-dispatcher calls forbidden — use shared engines instead", ALL THREE surfaces call the same singleton `reRankerEngine.rerank` / `diverseRerank` — no delegation chain.

### Why leg #2 (not deferred)

The prior unit ([[reference_u_rag_psn_ai_wire_2026_05_22|U-RAG-PSN-AI-WIRE]]) flagged leg #2 as "lower leverage — shell/desk/program-release scoped, not retrieval-oriented". That was accurate in *absolute* terms but ignored two things: (a) the cross-wire is cheap (~60 LOC across 3 files), (b) every PSN-leg surface that lacks the reranker forces operators to swap dispatchers mid-workflow. Shop-floor desk surfaces that want reranked help-content / setup-sheet retrieval / similar-job lookup now hit `rag_rerank` directly without context-switching to `prism_ml` or `prism_ai`.

### Surface

```
prism_operating_system → rag_rerank({query, candidates[], top_k?, diversity_weight?}) → reRankerEngine.{rerank|diverseRerank}
```

`diversity_weight` present → `diverseRerank` (MMR). Absent → `rerank`. Both static methods validate input internally via `ReRankInputSchema` — malformed input returns the degraded `{results:[], candidates_evaluated:0}` shape, never throws.

## Files

| File | Δ lines | Where shipped |
|---|---|---|
| `mcp-server/src/tools/dispatchers/operatingSystemDispatcher.ts` | +42 | (pending commit at write time) |
| `mcp-server/src/schemas/operatingSystemActionSchemas.ts` | +18 | (same commit) |
| `mcp-server/src/__tests__/operatingSystemDispatcher.uRagPsnOsWire.test.ts` | +278 (new) | (same commit) |
| `state/shared/specs/RAG-UPGRADE-MS0.md` | +1 row + goal-status edit | (same commit) |

## Pattern source + drift discipline

Mirrors `aiReasoningDispatcher.uRagPsnAiWire.test.ts` 1:1. **If either suite drifts, both must update together** — they verify the same engine contract via different dispatcher surfaces. The test files cross-reference each other in their JSDoc headers.

## Drift caught + corrected during the build

### R8 finding — operatingSystemDispatcher returns raw slimResponse, NOT MCP envelope

The aiReasoningDispatcher's case-blocks accumulate into a `result` variable then a central `return dispatcherResult(result)` wraps in `{content:[{type:"text",text:JSON.stringify(...)}]}`. **operatingSystemDispatcher's pattern is different** — every case returns `slimResponse(...)` directly, with no envelope. The MockMCPServer call helper I copied from uRagPsnAiWire.test.ts assumed envelope shape and crashed with `Cannot read properties of undefined (reading '0')` on `raw.content[0]`.

**Fix:** Mirrored the canonical dual-shape `invokeHandler` from `dispatcher.operatingSystemCoordination.test.ts:37-48` — checks `Array.isArray(res.content)` first (envelope path) and falls back to the raw-slim path (this dispatcher's convention). Both shapes handled.

Lesson reinforced ([[feedback_r5_thru_r12_doctrine]] R8): two dispatchers in the same project can use different return-shape conventions. Mirror the SISTER TEST FILE for the same dispatcher (operatingSystemCoordination), not the sister unit for a different dispatcher (aiReasoning). The graph-context hook would have answered first if I had run a master-index query for "operatingSystemDispatcher test pattern" before copying — that's the next discipline upgrade.

## Test posture

**13/13 new tests** in `operatingSystemDispatcher.uRagPsnOsWire.test.ts`:
1. Tool registered as `prism_operating_system` (single tool)
2. `rag_rerank` accepted by z.enum (round-trip via MockMCPServer)
3. Empty candidates → `candidates_evaluated:0` (slimResponse strips empty `results[]`)
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

## Key lessons (R8 / R11 reinforcement)

- **R8 (read before write):** the sister TEST FILE (`dispatcher.operatingSystemCoordination.test.ts`) for the SAME dispatcher was the right model, not the sister UNIT TEST for a DIFFERENT dispatcher. Same dispatcher = same return-shape convention.
- **R11 (match conventions):** operatingSystemDispatcher uses `any` cache types throughout — I matched (despite hook anti-pattern warnings) per the read-the-surrounding-code rule. The whole file is `any`-typed for engine caches; introducing strict typing in one cache slot would be the noisy outlier.
- **Per-result field is `score`, not `rerank_score`:** confirmed at ReRankerEngine.ts:205-212 (already documented in [[reference_u_rag_psn_ai_wire_2026_05_22]] — applied directly here without re-derivation).
- **Hook warnings are not all blocking:** the `any-spread`, `floating-promise` (vitest), `missing-import` (`.ts`/`.js` MCP convention), and `double-assertion` (mock-server fight) warnings on this build were all spurious — convention-matching with the existing file. Hooks emit advisories; the gate is real tests + scrutiny.

## PSN status after this unit

| PSN leg | RAG wiring |
|---|---|
| 1. Obsidian brain | ✓ `memory-relevance-inject` |
| 2. PRISM OS | ✅ **THIS UNIT** — `prism_operating_system:rag_rerank` |
| 3. Wiki | ✓ U-RAG-1 wiki→tribal embeddings |
| 4. Memories | ✓ via memory-relevance-inject |
| 5. Tribal | ✓ `tribal-by-domain-inject` |
| 6. System Viz | ✓ U-RAG-4 ghost.rag_upgrade roost |
| 7. Engines | ✓ RetrievalEvalEngine + ReRankerEngine |
| 8. Algorithms | ✓ lexical-rerank lib (used by U-RAG-2 hooks) |
| 9. Formulas | ✓ BM25-lite scoring (in lexical-rerank lib) |
| 10. NN/GNN | ✓ bridge wired (empirical AUROC pending mapping layer) |
| 11. PRISM AI | ✓ [[reference_u_rag_psn_ai_wire_2026_05_22|U-RAG-PSN-AI-WIRE]] (2026-05-22) — `prism_ai:rag_rerank` |

**11/11 PSN legs wired for RAG.** Every leg with a meaningful retrieval surface now exposes the reranker. The graph-node-id ↔ wiki-path mapping layer (the empirical GNN retrain found 0% embedding-hit because graph node-IDs don't match wiki-file-path-keyed embeddings) remains open as a separate follow-up milestone — that's an *upstream* problem to RAG-PSN wiring, not a wiring gap.

## See also

- [[reference_u_rag_psn_ai_wire_2026_05_22]] — sister cross-wire (leg #11, same engine, same day)
- [[reference_psn_outcome_wire_2026_05_22]] — pattern origin (oscar's outcome cross-wire)
- [[reference_rag_upgrade_ms0_2026_05_22]] — parent milestone tracker
- [[feedback_psn_definition]] — PSN ≡ 11-leg union
