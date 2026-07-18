# AI-SYNERGY-AUDIT-MS0/U-AISYN-DENSE — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [AI-SYNERGY-AUDIT-MS0]/U-AISYN-DENSE (slot:charlie): add the dense embedding rerank arm -> completes the sparse+dense RAG HYBRID, build-once for all 34 galaxies

**Commit:** `caa0c29cb87e` · **By:** markjvillanueva3-cloud · **At:** 2026-06-10T19:57:18-05:00
**Tags:** ai-synergy-audit-ms0, u-aisyn-dense, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [AI-SYNERGY-AUDIT-MS0]/U-AISYN-DENSE (slot:charlie): add the dense embedding rerank arm -> completes the sparse+dense RAG HYBRID, build-once for all 34 galaxies

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [AI-SYNERGY-AUDIT-MS0]/U-AISYN-DENSE (slot:charlie): add the dense embedding rerank arm -> completes the sparse+dense RAG HYBRID, build-once for all 34 galaxies

Closes the last code-completable piece of the rag+cag+hybrids triad (was blocked by an
ENOSPC disk-full halt; disk recovered via the reaper sweep). The bridge's RAG was sparse-
only; this adds an optional DENSE arm: sparse retrieval selects candidates -> the top-M are
embedded (local Ollama nomic-embed-text, 768d) + reranked by cosine -> sparse and dense
rankings are FUSED via Reciprocal Rank Fusion.

R8/dedup: the fusion REUSES the fleet's verified scripts/lib/hybrid-retrieval.mjs rrfMerge
(not a new fusion impl); this module owns only cosine + dense-rank + the chunk<->hit id
mapping. Strictly OPTIONAL + fail-soft: OFF by default (PRISM_GALAXY_RAG_DENSE=1), and with
NO embedding service hybridRetrieve returns null -> the bridge keeps the sparse result
(zero regression -- proven: 39/39 tests pass with dense off). Cached under a dense-aware
CAG key (model+dense) so sparse and hybrid answers never collide.

- scripts/lib/galaxy-dense-rerank.mjs (cosineSim/denseRankChunks/fuseSparseDense PURE +
  embedText/hybridRetrieve fail-soft I/O; 11 tests incl RRF blend-both-arms + dense-only-
  union + fail-soft-on-null-embed, all with an INJECTED embedFn -- no live Ollama needed).
- scripts/lib/galaxy-reasoning-bridge.mjs: dense rerank in reasonForGalaxy (bounded to the
  sparse top-M candidates, best-effort, dense-aware cache key).

VALIDATED LIVE (real nomic-embed-text embeddings): hybrid top-3 carry [sparse+dense]
provenance (both arms contribute) and the dense rerank reorders the ranking (pushes the
canonical-constants section up for a cutting-force/rpm query). The rag+cag+hybrids triad is
now complete fleet-wide.
```

## Files touched (4)
- scripts/lib/galaxy-dense-rerank.mjs      | 151 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/lib/galaxy-dense-rerank.test.mjs | 124 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/lib/galaxy-reasoning-bridge.mjs  |  34 ++++++++++++++--
- 3 files changed, 305 insertions(+), 4 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show caa0c29cb87e`
- Milestone envelope: `mcp-server/data/milestones/AI-SYNERGY-AUDIT-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._