# HERMES-MEMORY-VAULT-MS0/U-HMEMV09-WIKI-CONSUMER — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [HERMES-MEMORY-VAULT-MS0]/U-HMEMV09-WIKI-CONSUMER (slot:zulu): wire wiki-precheck semantic fallback to the prism_wiki Qdrant ANN (fail-soft to the 137MB linear scan). Completes HMEMV09 wiki sub-task.

**Commit:** `7f01daa8ec07` · **By:** markjvillanueva3-cloud · **At:** 2026-06-10T22:07:47-05:00
**Tags:** hermes-memory-vault-ms0, u-hmemv09-wiki-consumer, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [HERMES-MEMORY-VAULT-MS0]/U-HMEMV09-WIKI-CONSUMER (slot:zulu): wire wiki-precheck semantic fallback to the prism_wiki Qdrant ANN (fail-soft to the 137MB linear scan). Completes HMEMV09 wiki sub-task.

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [HERMES-MEMORY-VAULT-MS0]/U-HMEMV09-WIKI-CONSUMER (slot:zulu): wire wiki-precheck semantic fallback to the prism_wiki Qdrant ANN (fail-soft to the 137MB linear scan). Completes HMEMV09 wiki sub-task.

WHY: the wiki-precheck-inject semantic fallback (fires on every BM25-miss, across 26 slots) loaded the 137MB _embeddings.jsonl + linear-scanned 53,930x768 int8 vectors in-process. Now it queries the live prism_wiki Qdrant collection (ANN) and only touches the big file when Qdrant is down.

WHAT (semanticFallback refactor):
- qdrantRankWiki(qvec, topK): ANN POST to prism_wiki/points/search; returns {hits:[{n,t,cos}]} when Qdrant ANSWERS (even empty -> a genuine miss, NO slow-scan fallthrough), null only when down/error -> caller falls through.
- readEmbMeta(): reads ONLY the __meta first line (~1KB) for the staleness footer -- never the 137MB body.
- linearSemanticFallback(): the ORIGINAL load+scan path, now the fail-soft fallback; REUSES the already-embedded qvec (no double embed).
- Cosine is direction-only, so Qdrant score == linear cosine; SEM_MIN_COSINE (0.62) applied via score_threshold (same floor, not re-inlined). Default ON; PRISM_WIKI_QDRANT_DISABLE=1 = exact revert.

TESTS: +6 (mapping, dedup, empty-vs-null, threshold, fail-soft-to-null, source-wiring oracle); 40/40 green. FAIL-SAFE verified: every new path try/catch/finally + AbortController cleared in finally + main().catch backstop -> cannot throw/hang/break the hook for any slot.

VALIDATION (honest): unit 40/40; the embed->ANN->hit path proven live via curl (kienzle cutting force coefficient -> kienzle-force-model @ 0.849 against prism_wiki). In-process E2E currently returns ollama_down (correct fail-soft) because nomic-embed-text is GPU-starved by a resident gpt-oss:120b -- environmental, not code. 2-of-2 per-file scrutiny PASS.
```

## Files touched (3)
- .claude/hooks/wiki-precheck-inject.mjs      | 103 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++------
- .claude/hooks/wiki-precheck-inject.test.mjs |  66 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++-
- 2 files changed, 162 insertions(+), 7 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 7f01daa8ec07`
- Milestone envelope: `mcp-server/data/milestones/HERMES-MEMORY-VAULT-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._