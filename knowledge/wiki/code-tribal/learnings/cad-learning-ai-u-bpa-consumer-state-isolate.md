# CAD-LEARNING-AI/U-BPA-CONSUMER-STATE-ISOLATE — [MAIN-FORCE] [CAD-LEARNING-AI]/U-BPA-CONSUMER-STATE-ISOLATE (slot:india): give the offline blueprint-accuracy consumer its OWN state file so the xray drift-guard hook stops clobbering its lastProcessedOffset. The hook accepts only schemaVersion:1 and resets any v2 file it finds, which wiped the consumer offset on every blueprint PostToolUse and forced a full-ledger re-process (non-idempotent, inflated daily-ledger counts + duplicate xproc action lists). Consumer now writes blueprint-accuracy-consumer-state.json (new CONSUMER_STATE_FILENAME const); xray hook untouched. 43/43 tests (+3 R9: distinct-filenames invariant + root-cause migrate oracle + v2 round-trip). LIVE: 145 events processed offset 0->508483, immediate re-run processed 0 = idempotent.

**Commit:** `80b36e5358d1` · **By:** markjvillanueva3-cloud · **At:** 2026-06-24T23:57:19-05:00
**Tags:** cad-learning-ai, u-bpa-consumer-state-isolate, auto-distilled

## Subject
[MAIN-FORCE] [CAD-LEARNING-AI]/U-BPA-CONSUMER-STATE-ISOLATE (slot:india): give the offline blueprint-accuracy consumer its OWN state file so the xray drift-guard hook stops clobbering its lastProcessedOffset. The hook accepts only schemaVersion:1 and resets any v2 file it finds, which wiped the consumer offset on every blueprint PostToolUse and forced a full-ledger re-process (non-idempotent, inflated daily-ledger counts + duplicate xproc action lists). Consumer now writes blueprint-accuracy-consumer-state.json (new CONSUMER_STATE_FILENAME const); xray hook untouched. 43/43 tests (+3 R9: distinct-filenames invariant + root-cause migrate oracle + v2 round-trip). LIVE: 145 events processed offset 0->508483, immediate re-run processed 0 = idempotent.

## Body
```
[MAIN-FORCE] [CAD-LEARNING-AI]/U-BPA-CONSUMER-STATE-ISOLATE (slot:india): give the offline blueprint-accuracy consumer its OWN state file so the xray drift-guard hook stops clobbering its lastProcessedOffset. The hook accepts only schemaVersion:1 and resets any v2 file it finds, which wiped the consumer offset on every blueprint PostToolUse and forced a full-ledger re-process (non-idempotent, inflated daily-ledger counts + duplicate xproc action lists). Consumer now writes blueprint-accuracy-consumer-state.json (new CONSUMER_STATE_FILENAME const); xray hook untouched. 43/43 tests (+3 R9: distinct-filenames invariant + root-cause migrate oracle + v2 round-trip). LIVE: 145 events processed offset 0->508483, immediate re-run processed 0 = idempotent.
```

## Files touched (4)
- scripts/blueprint-accuracy-consumer.mjs              | 15 +++++++++++----
- scripts/lib/blueprint-accuracy-consumer-lib.mjs      | 22 ++++++++++++++++++++++
- scripts/lib/blueprint-accuracy-consumer-lib.test.mjs | 57 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 3 files changed, 90 insertions(+), 4 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 80b36e5358d1`
- Milestone envelope: `mcp-server/data/milestones/CAD-LEARNING-AI.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._