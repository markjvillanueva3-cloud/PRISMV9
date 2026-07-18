---
name: reference_post_ship_cimco-integration-ms0-u-cimco-post-proof-ledger
description: Auto-distilled learnings from shipping CIMCO-INTEGRATION-MS0/U-CIMCO-POST-PROOF-LEDGER (commit 0d803825b). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.807Z
aliases: reference_post_ship_cimco-integration-ms0-u-cimco-post-proof-ledger
---


# CIMCO-INTEGRATION-MS0/U-CIMCO-POST-PROOF-LEDGER

[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CIMCO-INTEGRATION-MS0]/U-CIMCO-POST-PROOF-LEDGER (slot:echo): JM-fleet post-proof readiness + golden-integrity ledger (scripts/cimco-post-proof.mjs). Honest — does NOT fake passes: real proof needs CIMCO-sim (live app) or byte-equiv re-emission (CAM source). Offline NOW: (1) per-machine readiness ledger (golden corpus + sim machine + proof method + blockers), (2) real compareNC drift audit across same-base-name variants w/ volatileCommentMask (header-only churn vs genuine content drift), (3) DATE/TIME/path volatile-header detection. Real-data: 15 machines, 246 content-drift groups, found coverage gaps (VMC-02 Okuma-5ax=0 + Hurco=1 golden → non-.nc formats; lathe pool shared/capped). 7/7 tests incl synthetic-fixture drift audit + real-corpus. Foundation verify + fleet recon running via background Workflow.

**Shipped:** 2026-06-02T20:19:41-05:00 by markjvillanueva3-cloud
**Files:** 2 touched

Full distillation: [[cimco-integration-ms0-u-cimco-post-proof-ledger]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._