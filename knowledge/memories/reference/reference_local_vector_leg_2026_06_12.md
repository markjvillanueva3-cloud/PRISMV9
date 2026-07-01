---
name: reference_local_vector_leg_2026_06_12
description: 2026-06-12 slot:alpha shipped the GRAPH-UTILIZATION rec #1 CORE — offline cosine engine defaultLocalVectorSearch + a 5th localvector leg in hybrid-retrieval.mjs (kills the Qdrant SPOF for hybrid search). Engine validated standalone on 54,489 real vectors; but INERT in production until a consumer injects a cached reader (follow-up U-LOCAL-VECTOR-LEG-WIRE). Two scrutiny lessons: apply-then-untestable trap + built-but-unwired honesty.
type: reference
galaxy: token-optimization
source: prism-memory
synced: 2026-06-27T20:30:46.646Z
aliases: reference_local_vector_leg_2026_06_12
---


# Local-vector leg — verifiable core shipped (2026-06-12, slot:alpha)

**What.** GRAPH-UTILIZATION-ASSESSMENT rec #1: an offline dense substrate for `scripts/lib/hybrid-retrieval.mjs` so hybrid_search fuses cosine over the 54,489 on-disk nomic-768d int8 vectors (`knowledge/wiki/architecture/_embeddings.jsonl`) instead of depending on Qdrant. Shipped: pure `defaultLocalVectorSearch({vector, records, limit})` (cosine `dot/(|q||d|)`, dequant `q*rec.s` fallback 1/127) + 5th `source:"localvector"` leg + RRF weight + `includeLocalVector` flag. slot/alpha `9a02dde733` (patcher+test+fixture) + [MAIN-FORCE] `b6d5e16aa2` (lib splice). Applied via `scripts/apply-local-vector-leg.mjs` (idempotent raw-FS patcher, lib is main-tree-only).

**Validated standalone (R15, numbers):** real 54,489 vectors + real Ollama nomic embed, streaming constant-memory, Qdrant untouched -> "wire EDM spark gap" -> `wedm-troubleshoot`@0.7504; "speed feed titanium" -> `tribal-f360-149`@0.7488. Semantically correct. ~700ms/search. 12/12 tests.

**NOW LIVE (U-LOCAL-VECTOR-LEG-WIRE SHIPPED 2026-06-12, slot:alpha):** slot/alpha `0c3610c843` + [MAIN-FORCE] `f671991853`. The leg FIRES on BOTH consumers (`prism-hybrid.mjs` CLI + `sessionHybridSearchAction.ts` MCP dispatcher). SPOF KILLED -- validated: `prism-hybrid --query "wire EDM spark gap" --no-vector` returns **20 ranked dense hits** with Qdrant OFF. New `scripts/lib/local-vector-store.mjs` is the memory-safe reader: streams `_embeddings.jsonl` ONCE into a flat `Int8Array(54489*768)` = 41,847,552 bytes / 551ms at default heap (the naive boxed load OOMs; THIS is constant-memory). Precomputed int8 norms (cosine scale-invariant -> `s` cancels). mtime+size cache. 14/14 tests incl. a cross-check vs `defaultLocalVectorSearch` (no cosine drift). **EMBED-ONCE done:** memoized dense embedding -> 1 Ollama call with both legs on (was 2). `--no-local`/`no_local` escape hatch added. 2-reviewer scrutiny PASS/PASS; 5 findings fixed. Wire spec: U-LOCAL-VECTOR-LEG-BUILD-SPEC-2026-06-12.md (FOLLOW-UP=SHIPPED).

**Two scrutiny lessons (both reviewers, FAIL->fixed):**
1. **Apply-then-untestable trap (P0):** the test copied the LIVE main-tree lib + asserted `patched+verified`; after the [MAIN-FORCE] apply the live lib is already-patched -> patcher returns `already-patched` -> all 12 tests CANCEL. "12/12 pass" was true only pre-apply. Fix: checked-in PRISTINE fixture (`scripts/__tests__/fixtures/hybrid-retrieval-pristine.mjs`) -> order-independent. **LESSON: a patcher test that copies the live target is red the moment the patch is applied; always test against a pristine checked-in fixture, never the mutated target.**
2. **Built-but-unwired honesty (P1):** an engine+leg with no consumer is an orphan that no-ops live; the "kills SPOF" claim was true of what it SET UP, not what SHIPPED. Ship the verifiable CORE with HONEST scope + file the wiring follow-up; never frame an unwired core as a live win. [[feedback_wire_test_validate_all_galaxies]] · [[reference_graph_utilization_assessment_2026_06_12]].
