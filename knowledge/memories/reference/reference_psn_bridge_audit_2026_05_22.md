---
name: reference-psn-bridge-audit-2026-05-22
description: PSN bridge dormancy audit — 10/16 deep-integration bridges already shipped (stale "pending" tracking); 5 genuinely-dormant units identified
aliases: reference_psn_bridge_audit_2026_05_22
type: reference
slot: whiskey
source: prism-memory
synced: 2026-06-27T20:30:47.125Z
---


# PSN bridge dormancy audit (2026-05-22, whiskey)

Operator: *"assess PSN look for high roi capabilities sitting dormant"* → *"do them all in compounding priority order"*. Compounding-order build ran 5 iterations; the dominant finding: **10 of 16 deep-integration bridges already exist** but are tracked as pending because they were built ad-hoc without envelope coverage. Refreshing `scripts/consolidate-roadmaps.mjs` dropped pending units 4639 → 2897 (delta −1742).

## Already-shipped (do NOT redo)

- **6× SFC→CAM bridges** — `CAMSpeedFeedBridgeEngine` covers Fusion 360 / hyperMILL / Mastercam / Esprit / Inventor HSM / SolidCAM (SolidWorks) via target enum; wired `cam_speedfeed_compute` + `cam_speedfeed_translate`.
- **MasterPost-CAM** — 5 `MasterPost*` engines, 60 `master_post_*` actions in camDispatcher.
- **CAD-CAM-handoff** — 3 `cad_cam_handoff` action refs.
- **Operator-gates** — `OperatorApprovalGateEngine` + `ApprovalWorkflowEngine` + 4 `approval_workflow` refs in businessDispatcher.
- **Outcome wiring** — oscar's `0fd90359de` shipped 40 actions, 100% domain coverage.

## Genuinely dormant (real remaining)

1. `FullSystemAICoordinator` does NOT exist → AI Tier-1↔Tier-2↔Tier-3 routing unbuilt.
2. `U-BRIDGE-LEARN-SFC` — outcome-bus → SFC param override.
3. `U-BRIDGE-LEARN-CAM` — outcome-bus → CAM strategy override.
4. `U-BRIDGE-SHOPFLOOR-LEARN` — MTConnect engine doesn't exist.
5. NN-GRAPH retrain promotion — gate working (AUROC 0.5 < 0.78); awaits reference-pool growth.
6. 616 unwired engines (Other 123 / Lathe 64 / Machine 12 / Multi 9 / Hyper 8 / Shop 8).
7. Wiki coverage — 1097/3334 engines (33%); pointer set grows 1:1.

## Iters this turn

1. **U-NCI-STOPHOOK-EXTEND** shipped — Stop hook now rebuilds the NCI index alongside the pointer set.
2. **U-OUTCOME-WIRE verification** — confirmed shipped; awareness scan stale.
3. **NN-GRAPH retrain** — force-retrain with stratified=true ran; gate correctly refused to promote.
4. **6× SFC→CAM audit** — already shipped.
5. **Inventory reconcile** — −1742 pending units.

## Lesson

Before picking any U-BRIDGE-* unit, audit `mcp-server/src/engines/` + dispatcher action grep + re-run `scripts/consolidate-roadmaps.mjs`. ROADMAP-CONSOLIDATED reads MILESTONE_PROGRESS; ad-hoc-built bridges never landed envelopes, so they appear "pending" indefinitely.
