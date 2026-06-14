---
name: reference_post_ship_hurco-vm30i-full-psn-ms0-u-hurco-v11-full-psn
description: Auto-distilled learnings from shipping HURCO-VM30I-FULL-PSN-MS0/U-HURCO-V11-FULL-PSN (commit d0b2621be). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.505Z
aliases: reference_post_ship_hurco-vm30i-full-psn-ms0-u-hurco-v11-full-psn
---


# HURCO-VM30I-FULL-PSN-MS0/U-HURCO-V11-FULL-PSN

[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [HURCO-VM30I-FULL-PSN-MS0]/U-HURCO-V11-FULL-PSN (slot:echo iter7 2026-05-24): wire V11 master post to full PSN substrate. New generateProgramWithFullPSN() composes today's engines (GCodeRuntimePredictor + GCodeBidirectionalOptimizer + PRISMSelfAwareness AI feature recs) + first-order cost estimate on top of V11's canonical base output. NEW HurcoPSNEnrichment interface exposes runtime_estimate + cost_report + optimizer_recommendations + ai_feature_recommendations + substrate_errors + full_psn_engaged flag. Each substrate call is best-effort fail-soft (single failure never blocks rest). Local operationsToParsedBlocks() mapper for runtime/optimizer integration. BACKWARD-COMPAT: legacy generateProgram() leaves psn_enrichment undefined — byte-identical, 14 existing test files untouched. 16/16 new tests PASS: happy path × 7 substrate fields, 3 spanning materials (Al/4140/Ti), 3 adversarial (empty ops / bad machine_id / shop-rate variation), 3 backward-compat (legacy unset + length equality + first-3-lines char-identical). Closes the readiness gap for Phase-1 testing against H:/PRISM/JM DIE/HURCO CNC PROGRAMS.

**Shipped:** 2026-05-24T20:41:07-05:00 by markjvillanueva3-cloud
**Files:** 3 touched

Full distillation: [[hurco-vm30i-full-psn-ms0-u-hurco-v11-full-psn]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._