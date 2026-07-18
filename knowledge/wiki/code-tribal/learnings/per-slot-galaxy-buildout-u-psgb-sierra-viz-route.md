# PER-SLOT-GALAXY-BUILDOUT/U-PSGB-SIERRA-VIZ-ROUTE — [MAIN] [PER-SLOT-GALAXY-BUILDOUT]/U-PSGB-SIERRA-VIZ-ROUTE: close PSN leg 11 — system-viz taskClass in AISystemRouterEngine

**Commit:** `caaa70a9af25` · **By:** markjvillanueva3-cloud · **At:** 2026-05-29T09:50:09-05:00
**Tags:** per-slot-galaxy-buildout, u-psgb-sierra-viz-route, auto-distilled

## Subject
[MAIN] [PER-SLOT-GALAXY-BUILDOUT]/U-PSGB-SIERRA-VIZ-ROUTE: close PSN leg 11 — system-viz taskClass in AISystemRouterEngine

## Body
```
[MAIN] [PER-SLOT-GALAXY-BUILDOUT]/U-PSGB-SIERRA-VIZ-ROUTE: close PSN leg 11 — system-viz taskClass in AISystemRouterEngine

Audit (we6k2wu61) found the only outright PSN FAIL: AISystemRouterEngine was
domain-blind to system-viz (no taskClass for graph/viz/regen/master-index).
- New 'system_viz' TaskClass (classify rule placed before 'search' so viz-specific
  keywords win; AFTER code_review so 'review the viz code' stays code_review).
- route(): system_viz -> local-mcp primary + claude-haiku fallback, free, reason
  names prism_session:master_index_query / prism_knowledge:obsidian_viz_* + the
  system-viz-query.mjs CLI fallback when :3100 down.
- getStats task_classes 11->12.
- +6 tests (4 route + 2 ordering-preservation); 29/29 PASS. PRISM AI now domain-aware of sierra.
```

## Files touched (41)
- mcp-server/src/engines/AtomicMultiFileWriteEngine.ts          |  11 ++-
- mcp-server/src/engines/BidWinCalibratorEngine.ts              | 359 --------------------------------------------------------------------
- mcp-server/src/engines/HistoricalMaterialPriceEngine.ts       |  14 ++-
- mcp-server/src/engines/IntegratedVerificationEngine.ts        |  11 +--
- mcp-server/src/engines/InternalAuditCalendarEngine.ts         | 235 --------------------------------------------
- mcp-server/src/engines/ManagementReviewEngine.ts              | 345 -----------------------------------------------------------------
- mcp-server/src/engines/MillingPrintToProgramEngine.ts         |  24 +++--
- mcp-server/src/engines/PostProcessorGeneratorEngine.ts        |  69 +++++++++++++
- mcp-server/src/engines/RealTimeMachineIntelligenceEngine.ts   |  14 +--
- mcp-server/src/engines/SmartToolSelectorEngine.ts             |  14 +--
_(+31 more)_


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show caaa70a9af25`
- Milestone envelope: `mcp-server/data/milestones/PER-SLOT-GALAXY-BUILDOUT.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._