---
name: reference_post_ship_jm-die-lathe-upgrade-ms0-u-audit-pipeline
description: Auto-distilled learnings from shipping JM-DIE-LATHE-UPGRADE-MS0/U-AUDIT-PIPELINE (commit 6bf21c062). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.518Z
aliases: reference_post_ship_jm-die-lathe-upgrade-ms0-u-audit-pipeline
---


# JM-DIE-LATHE-UPGRADE-MS0/U-AUDIT-PIPELINE

[MAIN] [JM-DIE-LATHE-UPGRADE-MS0]/U-AUDIT-PIPELINE (slot:whiskey iter12): 3-stage lathe-variant audit pipeline + batch runner + dispatcher wiring. [BOOTSTRAP-SLOT-ENFORCE]. Engine: LatheProgramAuditPipelineEngine.ts — Stage A (gcSafetyAnalyzer 24 rules, Okuma controller), Stage B (lathe G-code parser with G20/G21 modal unit detection + auto-mm-scaling), Stage C (envelope screen with facing/chuck/rapid-retract tolerances). 31/31 tests. Dispatcher: aiReasoningDispatcher.ts case 'jm_die_lathe_audit' + schema. Batch runner: scripts/audit-jm-die-lathe-corpus.mjs — walks PRISM_UPGRADED corpus, emits dashboard.{json,md}. FIRST FINDING (200-var sample): 96% FAIL — exposes V1/V2 upgrader does NOT body-rescale toolpaths per machine envelope (cross-machine envelope mismatch). Surfaces operator-actionable safety gap for shop-floor pull.

**Shipped:** 2026-05-24T15:51:05-05:00 by markjvillanueva3-cloud
**Files:** 6 touched

Full distillation: [[jm-die-lathe-upgrade-ms0-u-audit-pipeline]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._