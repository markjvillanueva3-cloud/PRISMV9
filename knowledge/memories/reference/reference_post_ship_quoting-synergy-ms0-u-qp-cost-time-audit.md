---
name: reference_post_ship_quoting-synergy-ms0-u-qp-cost-time-audit
description: Auto-distilled learnings from shipping QUOTING-SYNERGY-MS0/U-QP-COST-TIME-AUDIT (commit fc9f362bf). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.006Z
aliases: reference_post_ship_quoting-synergy-ms0-u-qp-cost-time-audit
---


# QUOTING-SYNERGY-MS0/U-QP-COST-TIME-AUDIT

[MAIN] [QUOTING-SYNERGY-MS0]/U-QP-COST-TIME-AUDIT (slot:charlie): 4-arm ultracode audit of quoting cost/time/rate engines + resources. FINDING: engines are largely REAL+sophisticated (CycleTimeEstimatorEngine IS a complete S-curve G-code time engine; JobCosting Kienzle/Taylor; ShopConfig 21 JM machines; AdaptiveShopRate Bayesian) but DISCONNECTED -- quote path uses inline stub rates + MRR-estimated time, real engines unwired. Work = HARDEN+WIRE not build-new (dedup). 9-unit P0-P2 plan + integration roadmap (tri-wizards/CAD-CAM/blueprint/redaction/hotel-ERP). Data: 134K CNC programs = abundant deterministic time source (breaks pair ceiling); kinematics known-not-modeled; DocuStrata real material prices unwired; shop rates unverified (hotel dep). Spec: state/shared/specs/QUOTING-COST-TIME-AUDIT-2026-06-12.md

**Shipped:** 2026-06-12T12:04:31-05:00 by markjvillanueva3-cloud
**Files:** 2 touched

Full distillation: [[quoting-synergy-ms0-u-qp-cost-time-audit]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._