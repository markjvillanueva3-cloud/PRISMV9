# INDIA-AI-ORPHAN-WIRE/U-LOCAL-EMBEDDING-WIRE — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [INDIA-AI-ORPHAN-WIRE]/U-LOCAL-EMBEDDING-WIRE: wire LocalEmbeddingEngine -> prism_ai local_embedding_{status,similarity}

**Commit:** `894be27d1f4d` · **By:** markjvillanueva3-cloud · **At:** 2026-06-11T19:13:28-05:00
**Tags:** india-ai-orphan-wire, u-local-embedding-wire, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [INDIA-AI-ORPHAN-WIRE]/U-LOCAL-EMBEDDING-WIRE: wire LocalEmbeddingEngine -> prism_ai local_embedding_{status,similarity}

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [INDIA-AI-ORPHAN-WIRE]/U-LOCAL-EMBEDDING-WIRE: wire LocalEmbeddingEngine -> prism_ai local_embedding_{status,similarity}

Unit 2 of the india-AI orphan-wire sweep (after KnowledgeLineage f7ae1ac016). LocalEmbeddingEngine is
india's zero-service ONNX MiniLM (Xenova/all-MiniLM-L6-v2) embedding backbone -- the RAG vectorizer.
It was fully dispatcher-DARK: its 3 in-process consumers (EmbeddingFilter/EmbeddingGuard/
SemanticAssetIndex) are themselves dispatcher-dark, so the embedding primitive had ZERO MCP surface.
(Distinct from the prior EMBEDDING-FILTER-WIRE which wired a CONSUMER, not the backbone.)

2 actions added to the prism_ai INDIA_AI_ORPHAN group:
- local_embedding_status     -> isLoaded() + getModel()  (readiness + active model name)
- local_embedding_similarity -> cosineSimilarity(a, b)   (pure deterministic cosine over caller vectors)

SECURITY/R12: embed() is INTENTIONALLY NOT surfaced -- it lazy-loads a ~90MB ONNX model (heavyweight
for an MCP call; in-process pipelines call it directly), and exposing it would put model inference on
the wire. Only readiness + pure cosine math are exposed. The similarity case GUARDS all three of
cosineSimilarity's throw conditions (non-array / empty / length-mismatch) BEFORE calling it, and the
finiteNumArray guard rejects NaN/Infinity/non-number elements so a silent-NaN result is impossible.

Tests: 7/7 round-trip through registerAIReasoningDispatcher (status engine-parity; identical=1,
orthogonal=0, opposite=-1, 45deg=1/sqrt(2) exact known cosines; direct-vs-dispatcher parity; 3
adversarial = length-mismatch + non-number-element + empty, each asserting a specific error substring).
No ONNX model load (embed never called). tsc-clean. 2-agent scrutiny PASS/PASS, no P0/P1.

Remaining india-AI orphans: IntentClassifier, PolicyExperienceLedger, TransferLearning,
TemporalReasoning, RealTimeAnomalyDetection, KnowledgeIngestion. Coordinate: india owns AI-systems.
```

## Files touched (3)
- mcp-server/src/__tests__/ai-dispatcher-local-embedding-wire.test.ts | 105 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/tools/dispatchers/aiReasoningDispatcher.ts           |  40 ++++++++++++++++++++++++++++++++++++++--
- 2 files changed, 143 insertions(+), 2 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 894be27d1f4d`
- Milestone envelope: `mcp-server/data/milestones/INDIA-AI-ORPHAN-WIRE.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._