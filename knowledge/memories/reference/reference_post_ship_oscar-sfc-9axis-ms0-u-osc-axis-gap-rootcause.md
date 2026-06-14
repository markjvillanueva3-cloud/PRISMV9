---
name: reference_post_ship_oscar-sfc-9axis-ms0-u-osc-axis-gap-rootcause
description: Auto-distilled learnings from shipping OSCAR-SFC-9AXIS-MS0/U-OSC-AXIS-GAP-ROOTCAUSE (commit 79a229eec). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.604Z
aliases: reference_post_ship_oscar-sfc-9axis-ms0-u-osc-axis-gap-rootcause
---


# OSCAR-SFC-9AXIS-MS0/U-OSC-AXIS-GAP-ROOTCAUSE

[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OSCAR-SFC-9AXIS-MS0]/U-OSC-AXIS-GAP-ROOTCAUSE (slot:oscar): pin the tool-material-inert root cause — UltimateSpeedFeedEngine.ts:2080 Vc formula (baseVc×hFactor×stratMod) has NO tool-material term; toolMat resolved L2038 but dropped; dead machinabilityScale L2079; base params carbide-anchored. Fix = add canonical toolMaterialSpeedFactor multiplier (constants.ts). Surgical, ~30-60min, but changes Vc → S(x)+signoff gated. Read-only diagnosis, no physics changed

**Shipped:** 2026-06-08T22:26:30-05:00 by markjvillanueva3-cloud
**Files:** 2 touched

Full distillation: [[oscar-sfc-9axis-ms0-u-osc-axis-gap-rootcause]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._