# OSCAR-SFC-9AXIS-MS0/U-OSC9-08 — [MAIN] [OSCAR-SFC-9AXIS-MS0]/U-OSC9-08 (slot:oscar /goal /loop iter1, 2026-05-26): ShopToolLibrary → MRR-ranked SFC bridge

**Commit:** `7c9643f7f0a4` · **By:** markjvillanueva3-cloud · **At:** 2026-05-26T10:36:26-05:00
**Tags:** oscar-sfc-9axis-ms0, u-osc9-08, auto-distilled

## Subject
[MAIN] [OSCAR-SFC-9AXIS-MS0]/U-OSC9-08 (slot:oscar /goal /loop iter1, 2026-05-26): ShopToolLibrary → MRR-ranked SFC bridge

## Body
```
[MAIN] [OSCAR-SFC-9AXIS-MS0]/U-OSC9-08 (slot:oscar /goal /loop iter1, 2026-05-26): ShopToolLibrary → MRR-ranked SFC bridge

Reorient from 5/25 session (7 U-OSC9 units shipped). Audit of 17 existing SpeedFeed
engines + grep of NineAxisOrchestrator reveals 3-output-modes (cost_batch/aggressive_rush/
prism_optimized), mrr_ranking, AND roi_investment are ALREADY built into the orchestrator
result. Real gap: orchestrator.tool_library was being fed SYNTHETIC hand-passed lists —
the operator's REAL Fusion 360 shop library (ShopToolLibraryEngine, hundreds of proven
tools with measured speeds/feeds) was never wired into the ranking surface.

NEW engine SpeedFeedShopLibraryBridgeEngine (pure composition, R8/R11):
  - ShopToolLibrary.loadAll() → filter (no-diameter, category, diameter-range, dedup-by-T#)
  - Map ShopTool[] → orchestrator's tool_library entry shape
    * material normalization (6 regex patterns: carbide/hss/cermet/ceramic/cbn/pcd)
    * unit conversion (in → mm via *25.4)
    * flutes default by category (end_mill=4, twist_drill=2, face_mill=5, ...)
    * cost overrides by T-number + fallback $30 with warning
  - Delegate ranking to speedFeedNineAxisOrchestratorEngine.run() — no re-implementation
  - Empty-library short-circuit (orchestrator NOT called when nothing survives filtering)
  - Orchestrator-throw downgrade to structured-error result (engines/CLAUDE.md compliance)
  - Convenience method topKForMaterialAndDiameter(iso, dmin, dmax, k)
  - Result includes source_tool_by_label index so operator can grab the actual shop T-number

DISPATCHER (calcDispatcher, +1 action):
  - prism_calc:sfc_shop_library_rank — runs the bridge end-to-end

Per-file 2-of-2 parallel scrutiny (code-analyzer + reviewer):
  Both PASS. 4 P1 findings, all addressed before commit:
  (A) Action-name convention drift → renamed sfc_shop_library_mrr_rank → sfc_shop_library_rank
      (matches verb-suffixed peers sfc_propagate_all / sfc_subscriber_register / sfc_psn_decision_prior)
  (B) passthrough clobber bug — top-level fields undefined-overrode passthrough values.
      Fixed: `input.X ?? passthrough.X` on part_volume_cm3 / batch_size / mode.
  (C) Unbounded warnings array on 2000-tool shops. Capped at MAX_WARNINGS_RETAINED=50
      + per-reason counters preserved in summary; surplus collapsed into one summary line.
  (D) Filter-ordering invariant not asserted + no real-orchestrator anchor test.
      Added 3 tests: no_diameter-wins-over-category, category-wins-over-diameter-range,
      and end-to-end with REAL NineAxisOrchestrator (no mock) on 3-tool fixture.

Tests: 35/35 PASS (was 32 pre-P1-fix, added 3 above). tsc --noEmit clean on the 3 files.

Closes operator directive item "MRR-ranked tooling library" with operator's REAL Fusion 360
inventory, not synthetic. Composes with existing PropagationBridge auto-emit + Downstream
Subscriber cache + PSN decision-prior — all 5 domain consumers see the same shop-library-
backed rankings without re-fetch.

Session cumulative (5/25 + 5/26): 8 iters / 16 files / ~7400 LOC / 221/221 tests / 12 new prism_calc actions on the OSCAR-SFC-9AXIS-MS0 milestone.

Files:
  + mcp-server/src/engines/SpeedFeedShopLibraryBridgeEngine.ts (NEW, ~340 LOC)
  + mcp-server/src/__tests__/SpeedFeedShopLibraryBridgeEngine.test.ts (NEW, ~480 LOC, 35 cases)
  M mcp-server/src/tools/dispatchers/calcDispatcher.ts (+15 lines: 1 z.enum + 1 case)
```

## Files touched (4)
- .../SpeedFeedShopLibraryBridgeEngine.test.ts       | 578 +++++++++++++++++++++
- .../engines/SpeedFeedShopLibraryBridgeEngine.ts    | 428 +++++++++++++++
- mcp-server/src/tools/dispatchers/calcDispatcher.ts |  22 +
- 3 files changed, 1028 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 7c9643f7f0a4`
- Milestone envelope: `mcp-server/data/milestones/OSCAR-SFC-9AXIS-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._