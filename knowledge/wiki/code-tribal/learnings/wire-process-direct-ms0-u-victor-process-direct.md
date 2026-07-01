# WIRE-PROCESS-DIRECT-MS0/U-VICTOR-PROCESS-DIRECT — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [WIRE-PROCESS-DIRECT-MS0]/U-VICTOR-PROCESS-DIRECT (slot:victor /goal-yolo): wire 2 unwired statistical engines.

**Commit:** `bca05e1342b2` · **By:** markjvillanueva3-cloud · **At:** 2026-05-26T22:29:00-05:00
**Tags:** wire-process-direct-ms0, u-victor-process-direct, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [WIRE-PROCESS-DIRECT-MS0]/U-VICTOR-PROCESS-DIRECT (slot:victor /goal-yolo): wire 2 unwired statistical engines.

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [WIRE-PROCESS-DIRECT-MS0]/U-VICTOR-PROCESS-DIRECT (slot:victor /goal-yolo): wire 2 unwired statistical engines.

2 actions in prism_process_control:
  doe_taguchi_compute     → DOETaguchEngine.compute  (distinct from doe_analyze=DOEAnalysisEngine: Taguchi orthogonal arrays + S/N ratio vs factorial)
  cusum_stream_analyze    → CUSUMEngine (one-shot stream wrapper: per-call instance, full trace + alarm count + final state — stateless from MCP)

Bridge value: Taguchi (DOE) + CUSUM (SPC) are the two industry-standard
quality-engineering methods that sat dead-on-disk despite being shipped
alongside the existing DOE/SPC engines. Operator can now A/B compare
DOETaguchEngine vs DOEAnalysisEngine for the same factor matrix, and run
streaming CUSUM as a one-shot replay.

Tests: 4/4 PASS in 68ms. Cumulative session: 29 engines wired across 6
commits. Files: 3 changed.
```

## Files touched (4)
- .../src/schemas/processControlActionSchemas.ts     | 19 +++++++++++++++
- .../tools/dispatchers/processControlDispatcher.ts  | 27 +++++++++++++++++++++
- scripts/wire-process-direct-verify.test.mjs        | 28 ++++++++++++++++++++++
- 3 files changed, 74 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show bca05e1342b2`
- Milestone envelope: `mcp-server/data/milestones/WIRE-PROCESS-DIRECT-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._