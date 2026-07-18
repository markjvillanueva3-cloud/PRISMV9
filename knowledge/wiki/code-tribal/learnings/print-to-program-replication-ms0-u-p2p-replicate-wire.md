# PRINT-TO-PROGRAM-REPLICATION-MS0/U-P2P-REPLICATE-WIRE — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [PRINT-TO-PROGRAM-REPLICATION-MS0]/U-P2P-REPLICATE-WIRE (slot:foxtrot): wire orphaned hyperMILL print-to-program replication chain — retrieve-similar-program + adapt by reading a print

**Commit:** `5d5c0c442f31` · **By:** markjvillanueva3-cloud · **At:** 2026-06-02T21:01:55-05:00
**Tags:** print-to-program-replication-ms0, u-p2p-replicate-wire, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [PRINT-TO-PROGRAM-REPLICATION-MS0]/U-P2P-REPLICATE-WIRE (slot:foxtrot): wire orphaned hyperMILL print-to-program replication chain — retrieve-similar-program + adapt by reading a print

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [PRINT-TO-PROGRAM-REPLICATION-MS0]/U-P2P-REPLICATE-WIRE (slot:foxtrot): wire orphaned hyperMILL print-to-program replication chain — retrieve-similar-program + adapt by reading a print

New MillProgramReplicationEngine composes 3 previously 0-dispatcher-orphaned engines (HMCProjectParser corpus + PartSimilaritySearch retrieval + FeatureSequenceReplicator adaptation) into a print->program pipeline; 3 actions in multiAxisProgramDispatcher (replicate_from_print/_similarity_search/_corpus_index). Axis-escalation gate (3->4->5) REJECTS corpus programs needing more axes than the target machine; warns when source axis-class inferred (non-hmc_project). Scrutiny (2 reviewers PASS) caught+fixed complexityScore 0-100-vs-0-10 floor + materialGroup hard-filter trap. 22 tests, tsc-clean.
```

## Files touched (6)
- mcp-server/src/__tests__/MillProgramReplicationEngine.test.ts  | 396 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/engines/MillProgramReplicationEngine.ts         | 456 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/index.ts                                        |   2 +-
- mcp-server/src/schemas/multiAxisProgramActionSchemas.ts        |  40 +++++++++++
- mcp-server/src/tools/dispatchers/multiAxisProgramDispatcher.ts |  32 +++++++--
- 5 files changed, 921 insertions(+), 5 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 5d5c0c442f31`
- Milestone envelope: `mcp-server/data/milestones/PRINT-TO-PROGRAM-REPLICATION-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._