---
name: reference_post_ship_oscar-sfc-9axis-ms0-u-osc-axis-gap-spec
description: Auto-distilled learnings from shipping OSCAR-SFC-9AXIS-MS0/U-OSC-AXIS-GAP-SPEC (commit b847c0f1f). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.963Z
aliases: reference_post_ship_oscar-sfc-9axis-ms0-u-osc-axis-gap-spec
---


# OSCAR-SFC-9AXIS-MS0/U-OSC-AXIS-GAP-SPEC

[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OSCAR-SFC-9AXIS-MS0]/U-OSC-AXIS-GAP-SPEC (slot:oscar): scoping spec for SFC axis-awareness gap — operator-challenged sweep exposed that tool material (carbide≡HSS≡ceramic), coolant, holder, machine, spindle, controller, workholding, insert are ALL INERT in the speed/feed physics (probe-verified, same Vc regardless). NineAxisInput accepts them but ignores them. Prioritized fix order (tool-material first) with per-axis physics + S(x) gating; no physics changed — awaiting operator go-ahead

**Shipped:** 2026-06-08T22:23:05-05:00 by markjvillanueva3-cloud
**Files:** 2 touched

Full distillation: [[oscar-sfc-9axis-ms0-u-osc-axis-gap-spec]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._