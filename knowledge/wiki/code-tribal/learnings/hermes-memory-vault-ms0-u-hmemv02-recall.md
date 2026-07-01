# HERMES-MEMORY-VAULT-MS0/U-HMEMV02-RECALL — [MAIN] [HERMES-MEMORY-VAULT-MS0]/U-HMEMV02-RECALL (slot:zulu): explainable retrieval -- per-hit 'why retrieved' trace on the memory-vault recall path

**Commit:** `8d2521afff90` · **By:** markjvillanueva3-cloud · **At:** 2026-06-10T15:09:52-05:00
**Tags:** hermes-memory-vault-ms0, u-hmemv02-recall, auto-distilled

## Subject
[MAIN] [HERMES-MEMORY-VAULT-MS0]/U-HMEMV02-RECALL (slot:zulu): explainable retrieval -- per-hit 'why retrieved' trace on the memory-vault recall path

## Body
```
[MAIN] [HERMES-MEMORY-VAULT-MS0]/U-HMEMV02-RECALL (slot:zulu): explainable retrieval -- per-hit 'why retrieved' trace on the memory-vault recall path

runMemoryIndexSearch now returns a per-hit `explanation` {matchedTokens, corpus,
denseArm (qdrant|scan|null), denseSim, bm25Score, rrf} on EVERY path (hybrid +
sidecar + live), threaded through tryHybridFuse (new denseArm tracking + per-key
_explain via bm25ByKey/denseByKey maps). New pure matchedTokens() mirrors
scoreMemoryRecord's blobs. The live-scan path was routed through the same toHit so
it carries the explanation too. ADDITIVE ONLY -- ranking, RRF fusion, sort, topK,
and the source field are byte-unchanged (reviewer-verified via mutation test).

memory-index-precheck-inject.mjs renders a compact [via <arm> <cos> bm25:<n>
matched:<toks>] tag when PRISM_MEMORY_INDEX_EXPLAIN=1 -- DEFAULT OFF, so the
26-slot per-prompt output is byte-identical until an operator audits (R6). Surfaces
whether the Qdrant dense arm fired per query (compounds the HMEMV09 keepwarm work).

73 lib tests (4 new, R9 mutation-proven). LIVE: 'arm=qdrant denseSim=0.70 bm25=14
matched=[obsidian,hermes,acceleration]'; knob-on renders the tag, knob-off
byte-identical. R7: spec named master-index (system-graph BM25-only); built on the
memory-VAULT recall surface (milestone-faithful + the only surface with dense/BM25
fusion to explain) -- master-index clone noted as remaining; envelope in_progress.
Reviewer-A PASS (9.5/10, mutation-tested); reviewer-B rate-limited (transient);
3-of-3 Stop gate covers consensus.
```

## Files touched (5)
- .claude/hooks/memory-index-precheck-inject.mjs          | 27 +++++++++++++++++++++++-
- mcp-server/data/milestones/HERMES-MEMORY-VAULT-MS0.json |  3 ++-
- scripts/lib/memory-index-search-lib.mjs                 | 84 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++----------------
- scripts/lib/memory-index-search-lib.test.mjs            | 66 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++-
- 4 files changed, 159 insertions(+), 21 deletions(-)

## Lessons surfaced in commit body
- til an operator audits (R6). Surfaces

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 8d2521afff90`
- Milestone envelope: `mcp-server/data/milestones/HERMES-MEMORY-VAULT-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._