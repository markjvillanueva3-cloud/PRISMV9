---
name: reference_post_ship_bridge-deep-u-bridge-sfc-hypermill
description: Auto-distilled learnings from shipping BRIDGE-DEEP/U-BRIDGE-SFC-HYPERMILL (commit b16ad7098). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.325Z
aliases: reference_post_ship_bridge-deep-u-bridge-sfc-hypermill
---


# BRIDGE-DEEP/U-BRIDGE-SFC-HYPERMILL

[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [BRIDGE-DEEP]/U-BRIDGE-SFC-HYPERMILL (slot:echo iter4 2026-05-24): SFC -> hyperMILL macro override DTO bridge. Mirror of SfcFusionApply pattern. Operator-gated by construction (live push owned downstream by HyperMILLMacroAPIEngine). hyperMILL-canonical param names (nSpindle/feedRate/vc/zStepover/coolingMode) distinct from Fusion's (spindleSpeed/cuttingFeedrate/stepover/coolant). Caller extras flow through even when bridge errors. 33/33 tests PASS: 3 spanning materials (Al6061/4140/Ti6Al4V), 3 failure modes, 4 adversarial, schema strict-mode + hyperMILL-vs-Fusion vocabulary cross-rejection, real-bridge operator-gate invariant. Wired cam_hypermill_apply_sf into camDispatcher enum + case handler.

**Shipped:** 2026-05-24T19:38:16-05:00 by markjvillanueva3-cloud
**Files:** 4 touched

Full distillation: [[bridge-deep-u-bridge-sfc-hypermill]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._