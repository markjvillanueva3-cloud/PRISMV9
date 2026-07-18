---
name: reference_post_ship_cimco-integration-ms0-u-cimco-fsm-live-drive
description: Auto-distilled learnings from shipping CIMCO-INTEGRATION-MS0/U-CIMCO-FSM-LIVE-DRIVE (commit dba50eb3d). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.806Z
aliases: reference_post_ship_cimco-integration-ms0-u-cimco-fsm-live-drive
---


# CIMCO-INTEGRATION-MS0/U-CIMCO-FSM-LIVE-DRIVE

[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CIMCO-INTEGRATION-MS0]/U-CIMCO-FSM-LIVE-DRIVE (core): driveLiveFsm orchestrator + drive-live mode. Chains the shipped pieces into the closed loop: navigateLive (ui-map FSM, per-step verified) -> run Machine Simulation -> poll read-report to content-quiescence -> assessReadReport verdict. FAIL-CLOSED at EVERY hop (unrealized/ambiguous/drift/blocked-modal nav, never-settling poll -> sim-not-quiescent-timeout, opaque/blocked read) -> cleared:false. Deps injected (navigate/readReport/sleep) -> hermetic recorded-harness E2E; live binds navigateLive + the read-report op. Mock-by-default; additive drive-live mode (existing drive mode + 52 tests untouched). main() async. +12 tests (64/64). NEXT: completion-detection richness (terminalComplete/coverage from a CIMCO progress read; caller currently supplies runObs) + dispatcher assessLiveRunClearance 5-gate composition; then operator-opened CIMCO live run.

**Shipped:** 2026-06-09T14:33:18-05:00 by markjvillanueva3-cloud
**Files:** 3 touched

Full distillation: [[cimco-integration-ms0-u-cimco-fsm-live-drive]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._