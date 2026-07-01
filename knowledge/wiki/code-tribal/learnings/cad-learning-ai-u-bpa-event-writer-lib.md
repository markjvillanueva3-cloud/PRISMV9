# CAD-LEARNING-AI/U-BPA-EVENT-WRITER-LIB — [MAIN-FORCE] [CAD-LEARNING-AI]/U-BPA-EVENT-WRITER-LIB (slot:india): canonical blueprint-accuracy ledger WRITER (builder+appender) + wire harvest

**Commit:** `6606d0c8bfed` · **By:** markjvillanueva3-cloud · **At:** 2026-06-24T12:07:33-05:00
**Tags:** cad-learning-ai, u-bpa-event-writer-lib, auto-distilled

## Subject
[MAIN-FORCE] [CAD-LEARNING-AI]/U-BPA-EVENT-WRITER-LIB (slot:india): canonical blueprint-accuracy ledger WRITER (builder+appender) + wire harvest

## Body
```
[MAIN-FORCE] [CAD-LEARNING-AI]/U-BPA-EVENT-WRITER-LIB (slot:india): canonical blueprint-accuracy ledger WRITER (builder+appender) + wire harvest

Closes the MCP-path gap in the predictions->outcomes->retrain loop. There was
no canonical builder/appender for state/shared/blueprint-accuracy-events.jsonl:
the outcome-event shape was built inline in training-driver-lib runPipeline
Stage D, and the ledger append was duplicated byte-identically in
harvest-prints-to-training.mjs (2 adapters).

- scripts/lib/blueprint-accuracy-event-writer.mjs (NEW): write-side counterpart
  to blueprint-accuracy-consumer-lib.mjs. buildExtractionOutcomeEvent() turns a
  RAG BlueprintExtraction (regions[]/sources[]/confidenceFloor) into a correctly
  TYPED outcome_record (kind:rag_extraction, accurate:null = unconfirmed
  prediction) the consumer routes to xproc_outcome_record (never the unknown
  bucket). appendAccuracyEvent() = canonical atomic appender, fail-LOUD on a
  typeless event, fail-SOFT on I/O (drop-in for the inline recordEvent adapters).
- WIRE: harvest-prints-to-training.mjs now consumes appendAccuracyEvent (R8
  consolidation, byte-identical-safe per 2-arm review).
- TEST: 13/13 (happy + 3 failure + 3 adversarial + full round-trip THROUGH the
  real consumer-lib + 25-event consolidate-threshold). training-driver-lib 0 fail.
- VALIDATE (live): 5 real JM ledger rows + 1 new rag_extraction row -> real
  consumer -> outcome_record 6, unknown 0, aliasedCount 1, conf 0.9. Stub harvest
  --max 1 on the JM DIE corpus wrote a real row via the canonical appender.

De-risked next-unit: cadDispatcher blueprint_rag_extract recordOutcome wiring is
now a one-liner: recordOutcome: async (ext) => recordExtractionOutcome(ext).
```

## Files touched (4)
- scripts/harvest-prints-to-training.mjs               |  35 +++++++++++++------------------
- scripts/lib/blueprint-accuracy-event-writer.mjs      | 158 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/lib/blueprint-accuracy-event-writer.test.mjs | 248 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 3 files changed, 420 insertions(+), 21 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 6606d0c8bfed`
- Milestone envelope: `mcp-server/data/milestones/CAD-LEARNING-AI.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._