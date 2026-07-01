# STUB-HUNT-MS0/U-STUB-INVENTORY — [MAIN] [STUB-HUNT-MS0]/U-STUB-INVENTORY (slot:bravo iter26): satisfies 'find all stubs' criterion of active /goal. NEW scripts/stub-hunt-inventory.mjs scans mcp-server/src/engines/*.ts for 5 stub markers (U-EFF25 stub | Stub: original file lost | Stub: lost to exFAT | stub:true return | ok:false,stub:true), counts dispatcher-singleton refs per stub, priority-ranks (wired-stubs first, smallest-file tiebreak). Live findings (state/shared/dashboards/stub-hunt-inventory-2026-05-27.{md,json}): 9 stubs total, 4 rescued this session (BusinessSync, CashFlow, MillingForce, MillProgramAnalyzer), 7 still pending. P0 by dispatcher-impact: EventBusEngine (9 refs — fleet-wide blast). P1 (mill-galaxy, 1 ref each, my domain): MillScientificPipeline + MillPrintToProgram + ToolpathStrategy + ToolSelectionRecommender. P2 (unwired stubs): CADFeatureRecognition + CAMPhase5Stubs. Priority queue established → next /loop iters work the list. Pure-fn separation: isStub (5-marker scan) + countDispatcherRefs (singleton-name regex) + scorePriority (wireWeight*100 + sizeBonus) separately testable.

**Commit:** `d0632d32166d` · **By:** markjvillanueva3-cloud · **At:** 2026-05-27T02:03:08-05:00
**Tags:** stub-hunt-ms0, u-stub-inventory, auto-distilled

## Subject
[MAIN] [STUB-HUNT-MS0]/U-STUB-INVENTORY (slot:bravo iter26): satisfies 'find all stubs' criterion of active /goal. NEW scripts/stub-hunt-inventory.mjs scans mcp-server/src/engines/*.ts for 5 stub markers (U-EFF25 stub | Stub: original file lost | Stub: lost to exFAT | stub:true return | ok:false,stub:true), counts dispatcher-singleton refs per stub, priority-ranks (wired-stubs first, smallest-file tiebreak). Live findings (state/shared/dashboards/stub-hunt-inventory-2026-05-27.{md,json}): 9 stubs total, 4 rescued this session (BusinessSync, CashFlow, MillingForce, MillProgramAnalyzer), 7 still pending. P0 by dispatcher-impact: EventBusEngine (9 refs — fleet-wide blast). P1 (mill-galaxy, 1 ref each, my domain): MillScientificPipeline + MillPrintToProgram + ToolpathStrategy + ToolSelectionRecommender. P2 (unwired stubs): CADFeatureRecognition + CAMPhase5Stubs. Priority queue established → next /loop iters work the list. Pure-fn separation: isStub (5-marker scan) + countDispatcherRefs (singleton-name regex) + scorePriority (wireWeight*100 + sizeBonus) separately testable.

## Body
```
[MAIN] [STUB-HUNT-MS0]/U-STUB-INVENTORY (slot:bravo iter26): satisfies 'find all stubs' criterion of active /goal. NEW scripts/stub-hunt-inventory.mjs scans mcp-server/src/engines/*.ts for 5 stub markers (U-EFF25 stub | Stub: original file lost | Stub: lost to exFAT | stub:true return | ok:false,stub:true), counts dispatcher-singleton refs per stub, priority-ranks (wired-stubs first, smallest-file tiebreak). Live findings (state/shared/dashboards/stub-hunt-inventory-2026-05-27.{md,json}): 9 stubs total, 4 rescued this session (BusinessSync, CashFlow, MillingForce, MillProgramAnalyzer), 7 still pending. P0 by dispatcher-impact: EventBusEngine (9 refs — fleet-wide blast). P1 (mill-galaxy, 1 ref each, my domain): MillScientificPipeline + MillPrintToProgram + ToolpathStrategy + ToolSelectionRecommender. P2 (unwired stubs): CADFeatureRecognition + CAMPhase5Stubs. Priority queue established → next /loop iters work the list. Pure-fn separation: isStub (5-marker scan) + countDispatcherRefs (singleton-name regex) + scorePriority (wireWeight*100 + sizeBonus) separately testable.
```

## Files touched (4)
- scripts/stub-hunt-inventory.mjs                    | 138 +++++++++++++++++++++
- .../dashboards/stub-hunt-inventory-2026-05-27.json |  81 ++++++++++++
- .../dashboards/stub-hunt-inventory-2026-05-27.md   |  16 +++
- 3 files changed, 235 insertions(+)

## Lessons surfaced in commit body
- till pending. P0 by dispatcher-impact: EventBusEngine (9 refs — fleet-wide blast). P1 (mill-galaxy, 1 ref each, my domain): MillScientificPipeline + MillPrintToProgram + ToolpathStrategy + ToolSelectionRecommender. P2 (unwired stubs): CADFeatureRecognition + CAMPhase5Stubs. Priority queue established → next /loop iters work the list. Pure-fn separation: isStub (5-marker scan) + countDispatcherRefs (s

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show d0632d32166d`
- Milestone envelope: `mcp-server/data/milestones/STUB-HUNT-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._