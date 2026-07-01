---
name: reference_post_ship_sfc-vendor-parity-u-osc-vc-cap-not-a-bug
description: Auto-distilled learnings from shipping SFC-VENDOR-PARITY/U-OSC-VC-CAP-NOT-A-BUG (commit e877a6956). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.038Z
aliases: reference_post_ship_sfc-vendor-parity-u-osc-vc-cap-not-a-bug
---


# SFC-VENDOR-PARITY/U-OSC-VC-CAP-NOT-A-BUG

[MAIN-FORCE] [SFC-VENDOR-PARITY]/U-OSC-VC-CAP-NOT-A-BUG (slot:oscar): R12 correction -- the aluminum ISO-N '3.5x Vc under-prediction' is NOT a physics bug. Live formula-trace proves the orchestrator resolves the material-aware N-table base 460 m/min correctly; 226 is the SAFETY-CORRECT G6.3 holder-balance RPM-capped achievable Vc (12k RPM caps a 6mm tool 460->226). Vendor 775 is uncapped -> apples-to-oranges. Wiki lesson + re-scopes Task #13 to U-OSC-VC-UNCAPPED-PARITY (additive uncapped-Vc exposure). Supersedes the prior memory's material-blind root cause.

**Shipped:** 2026-06-25T01:19:44-05:00 by markjvillanueva3-cloud
**Files:** 2 touched

Full distillation: [[sfc-vendor-parity-u-osc-vc-cap-not-a-bug]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._