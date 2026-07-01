# QUOTING-SYNERGY/U-QP-SIMILAR-JOB-RETRIEVE — [MAIN-FORCE] [QUOTING-SYNERGY]/U-QP-SIMILAR-JOB-RETRIEVE (slot:india): kNN similar-job retrieval primitive (prism_quoting) -- india RAG mandate, additive

**Commit:** `10735ad46655` · **By:** markjvillanueva3-cloud · **At:** 2026-06-24T20:25:38-05:00
**Tags:** quoting-synergy, u-qp-similar-job-retrieve, auto-distilled

## Subject
[MAIN-FORCE] [QUOTING-SYNERGY]/U-QP-SIMILAR-JOB-RETRIEVE (slot:india): kNN similar-job retrieval primitive (prism_quoting) -- india RAG mandate, additive

## Body
```
[MAIN-FORCE] [QUOTING-SYNERGY]/U-QP-SIMILAR-JOB-RETRIEVE (slot:india): kNN similar-job retrieval primitive (prism_quoting) -- india RAG mandate, additive

WHAT: new QuotingSimilarJobRetrieverEngine + prism_quoting:quoting_similar_job_retrieve. The cold-start-prior retrieval the QUOTING-DEEP-WIRE algo spec (5d3b507833) calls for: top-k nearest historical jobs by feature-vector similarity (counters the measured under-quote bias). Closes india backlog #5 (reference_open_learning_loops_backlog_2026_06_22).

DESIGN (R8 clean lane separation): the engine is PURE (engines.md no-I/O) and a THIN WRAPPER over the canonical KNearestNeighbors algorithm (NOT reinvented). Corpus + query arrive as PRECOMPUTED feature vectors; loading the JM-Die quote history + ENCODING quote-jobs into vectors is a separate data-infra pre-req (charlie/juliett) that the spec itself discloses ("algorithm units need data-infrastructure pre-reqs"). R12: the scout's "47,905-record corpus" is UNVERIFIED and contradicts the cited spec (~2K JM-Die quotes) -- the engine is corpus-agnostic, so the real size is out of scope here.

WIRE: enum + Zod schema + dispatcher case in prism_quoting (action-count +1, no regression; enum/map/case parity tsc-forced via Record<QuotingAction,...>).
TEST: 19/19 -- reference-value cosine/euclidean distances+similarities (hand-verified to 10dp), tie-break determinism, record-echo, happy + 4 failure (empty/non-array/missing-jobId/dim-mismatch) + 5 adversarial/edge (NaN/Infinity/k-clamp/k<1/zero-norm) + dispatcher round-trip (production enum + Zod gate + engine parity + schema-reject).
VALIDATE: similarity = 1 - cosine_distance (cos in [-1,1]); euclidean/manhattan 1/(1+d) monotone proxy. 3-of-3 PASS (all P2 deferrables: intentional engine-side dim validation, pre-existing stale dispatcher description).

Files: engines/QuotingSimilarJobRetrieverEngine.ts + __tests__/QuotingSimilarJobRetrieverEngine.test.ts + schemas/quotingActionSchemas.ts + tools/dispatchers/quotingDispatcher.ts
```

## Files touched (5)
- mcp-server/src/__tests__/QuotingSimilarJobRetrieverEngine.test.ts | 179 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/engines/QuotingSimilarJobRetrieverEngine.ts        | 163 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/schemas/quotingActionSchemas.ts                    |  13 +++++++++
- mcp-server/src/tools/dispatchers/quotingDispatcher.ts             |  13 +++++++++
- 4 files changed, 368 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 10735ad46655`
- Milestone envelope: `mcp-server/data/milestones/QUOTING-SYNERGY.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._