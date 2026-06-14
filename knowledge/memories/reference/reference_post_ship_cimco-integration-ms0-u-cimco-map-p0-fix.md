---
name: reference_post_ship_cimco-integration-ms0-u-cimco-map-p0-fix
description: Auto-distilled learnings from shipping CIMCO-INTEGRATION-MS0/U-CIMCO-MAP-P0-FIX (commit 430f735ff). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.783Z
aliases: reference_post_ship_cimco-integration-ms0-u-cimco-map-p0-fix
---


# CIMCO-INTEGRATION-MS0/U-CIMCO-MAP-P0-FIX

[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CIMCO-INTEGRATION-MS0]/U-CIMCO-MAP-P0-FIX (slot:echo): workflow-caught P0 fix — VMC-03 Haas VF-2 (3-axis) was mapped to Haas VF-2TR (5-axis trunnion) at native trust tier. Root: axisHints tr\d caught digit-AFTER-tr only; vf-2TR (digit-before) slipped → trunnion mis-scored 3-axis. Fix: \btr\d|\dtr\b both directions + 3↔5-axis regression-lock test; VMC-03 now → Haas VF-6/40 (3-axis). Also: +.hnc to post-proof walker (Hurco VMC-01 golden 1→25, recon-found gap). + post-proof-readiness.md (10-agent fleet workflow synthesis: per-controller recon + adversarial verify + roadmap). P1 Roku orientation HELD (unverified HC=horizontal inference; Roku HC is vertical — R12). Lesson: feedback_regex_token_direction_blindspot. nc-normalize verified PASS by workflow.

**Shipped:** 2026-06-02T20:33:15-05:00 by markjvillanueva3-cloud
**Files:** 8 touched

Full distillation: [[cimco-integration-ms0-u-cimco-map-p0-fix]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._