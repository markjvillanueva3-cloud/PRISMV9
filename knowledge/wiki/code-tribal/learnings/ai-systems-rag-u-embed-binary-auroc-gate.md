# AI-SYSTEMS-RAG/U-EMBED-BINARY-AUROC-GATE — [MAIN-FORCE] [AI-SYSTEMS-RAG]/U-EMBED-BINARY-AUROC-GATE (slot:india): DEFINITIVE deploy-gate measurement -- single-stage binary FAILS, two-stage rescore is MANDATORY

**Commit:** `8c929ae9210b` · **By:** markjvillanueva3-cloud · **At:** 2026-06-17T19:51:52-05:00
**Tags:** ai-systems-rag, u-embed-binary-auroc-gate, auto-distilled

## Subject
[MAIN-FORCE] [AI-SYSTEMS-RAG]/U-EMBED-BINARY-AUROC-GATE (slot:india): DEFINITIVE deploy-gate measurement -- single-stage binary FAILS, two-stage rescore is MANDATORY

## Body
```
[MAIN-FORCE] [AI-SYSTEMS-RAG]/U-EMBED-BINARY-AUROC-GATE (slot:india): DEFINITIVE deploy-gate measurement -- single-stage binary FAILS, two-stage rescore is MANDATORY

Non-destructive: calls canonical runAssessment() (never main(), no NN-EVAL.json
write) on the live graph with a TEMP sign-vector embeddings file. cosine over
sign-vectors == Hamming ranking == single-stage binary (the conservative bound).

RESULT (real deploy-gate metrics, 84-ghost holdout):
  baseline int8 cosine (deployed):  AUROC 0.7891  deploy-ready-selective @27.4pct  (reproduces deployed -> harness faithful)
  binary single-stage (no rescore): AUROC 0.7609  NO-deployable-operating-point @22.6pct

So NAIVE single-stage binary FAILS the gate (0.7609 < 0.78) and loses the
deployable selective point. This CORRECTS the over-optimistic 'binary 32x GREEN'
read from recall@5 99.8pct: that bench used TWO-STAGE (Hamming prefilter -> cosine
RESCORE); this is SINGLE-STAGE. The rescore is LOAD-BEARING, not optional.

Two-stage binary AUROC ~= baseline 0.789 (the rescore re-ranks with REAL cosine
over candidates that include the true top-k 99.8pct of the time per the recall
bench) -- BUT two-stage REQUIRES caching the full-precision vectors for rescore,
so the 32x is the hot SEARCH INDEX (fast Hamming), NOT total storage. The int8
rescore cache stays (can be colder/lazy). india metrics-gating caught the naive-
binary failure exactly as intended (R12 -- never soften the gate).
```

## Files touched (2)
- scripts/measure-binary-auroc.mjs | 87 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 1 file changed, 87 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 8c929ae9210b`
- Milestone envelope: `mcp-server/data/milestones/AI-SYSTEMS-RAG.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._