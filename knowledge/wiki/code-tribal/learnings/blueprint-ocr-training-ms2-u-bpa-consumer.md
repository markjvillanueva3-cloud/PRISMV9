# BLUEPRINT-OCR-TRAINING-MS2/U-BPA-CONSUMER — [MAIN] [BLUEPRINT-OCR-TRAINING-MS2]/U-BPA-CONSUMER: offline events consumer activates the dead-loop

**Commit:** `6cbe5b156179` · **By:** markjvillanueva3-cloud · **At:** 2026-05-18T10:47:48-05:00
**Tags:** blueprint-ocr-training-ms2, u-bpa-consumer, auto-distilled

## Subject
[MAIN] [BLUEPRINT-OCR-TRAINING-MS2]/U-BPA-CONSUMER: offline events consumer activates the dead-loop

## Body
```
[MAIN] [BLUEPRINT-OCR-TRAINING-MS2]/U-BPA-CONSUMER: offline events consumer activates the dead-loop

The MS1 hook (blueprint-accuracy-guard.mjs, U-MS1-U5) writes drift/replay/
outcome/consolidate events to state/shared/blueprint-accuracy-events.jsonl
intending an offline consumer to apply them to blueprint-accuracy-state.json
and dispatch the corresponding xproc_* actions through prism_ai. That consumer
never shipped (closed-loop training signal dead since 2026-05-16).

Ships:
- scripts/lib/blueprint-accuracy-consumer-lib.mjs (303 LOC, 14 exports, PURE)
  parseEventLine/parseEventsBlob/clampWindowCap/migrateState/applyEvents/
  buildConsolidationSummary/advanceOffset + 7 constants. Schema v1→v2 additive
  migration. FIFO-bounded window, threshold-triggered implicit ewc_consolidate
  with R12-honest summary, unknown events bucketed.
- scripts/lib/blueprint-accuracy-consumer-lib.test.mjs (358 LOC, 35 tests)
  Covers malformed input, idempotency, NaN-poison defense, window FIFO, schema
  migration, threshold-triggered consolidation, payload corruption resistance.
  35/35 PASS via node:test.
- scripts/blueprint-accuracy-consumer.mjs (208 LOC, CLI)
  Atomic state writes (.tmp + rename), idempotent via lastProcessedOffset,
  rotation-aware (offset reset on file shrink), --dry-run/--json/--reset
  flags, daily ledger emission. Knobs:
  PRISM_BPA_{EVENTS_FILE,STATE_FILE,LEDGER_DIR,WINDOW_CAP,CONSOLIDATE_THRESHOLD}.

Smoke-tested live: 4 synthetic events → 4 xproc_* actions emitted, offset 0→329,
re-run is no-op (idempotency verified). State.json populates correctly from v1
(empty) → v2 (rolling window populated). Caller (operator/cron) routes the
emitted actions through prism_ai to complete the round-trip.

Closes the activation gap. The OCR/RAG/LoRA infrastructure built in MS1 is
now an actual closed-loop training surface, not infrastructure-with-no-pulse.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (4)
- scripts/blueprint-accuracy-consumer.mjs            | 208 ++++++++++++
- scripts/lib/blueprint-accuracy-consumer-lib.mjs    | 303 +++++++++++++++++
- .../lib/blueprint-accuracy-consumer-lib.test.mjs   | 358 +++++++++++++++++++++
- 3 files changed, 869 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 6cbe5b156179`
- Milestone envelope: `mcp-server/data/milestones/BLUEPRINT-OCR-TRAINING-MS2.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._