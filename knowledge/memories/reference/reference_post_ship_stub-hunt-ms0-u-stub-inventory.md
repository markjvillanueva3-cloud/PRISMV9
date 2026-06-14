---
name: reference_post_ship_stub-hunt-ms0-u-stub-inventory
description: Auto-distilled learnings from shipping STUB-HUNT-MS0/U-STUB-INVENTORY (commit d0632d321). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.767Z
aliases: reference_post_ship_stub-hunt-ms0-u-stub-inventory
---


# STUB-HUNT-MS0/U-STUB-INVENTORY

[MAIN] [STUB-HUNT-MS0]/U-STUB-INVENTORY (slot:bravo iter26): satisfies 'find all stubs' criterion of active /goal. NEW scripts/stub-hunt-inventory.mjs scans mcp-server/src/engines/*.ts for 5 stub markers (U-EFF25 stub | Stub: original file lost | Stub: lost to exFAT | stub:true return | ok:false,stub:true), counts dispatcher-singleton refs per stub, priority-ranks (wired-stubs first, smallest-file tiebreak). Live findings (state/shared/dashboards/stub-hunt-inventory-2026-05-27.{md,json}): 9 stubs total, 4 rescued this session (BusinessSync, CashFlow, MillingForce, MillProgramAnalyzer), 7 still pending. P0 by dispatcher-impact: EventBusEngine (9 refs — fleet-wide blast). P1 (mill-galaxy, 1 ref each, my domain): MillScientificPipeline + MillPrintToProgram + ToolpathStrategy + ToolSelectionRecommender. P2 (unwired stubs): CADFeatureRecognition + CAMPhase5Stubs. Priority queue established → next /loop iters work the list. Pure-fn separation: isStub (5-marker scan) + countDispatcherRefs (singleton-name regex) + scorePriority (wireWeight*100 + sizeBonus) separately testable.

**Shipped:** 2026-05-27T02:03:08-05:00 by markjvillanueva3-cloud
**Files:** 4 touched

Full distillation: [[stub-hunt-ms0-u-stub-inventory]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._