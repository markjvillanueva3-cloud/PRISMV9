---
name: reference_post_ship_oscar-sfc-9axis-ms0-u-osc9-wire-fix
description: Auto-distilled learnings from shipping OSCAR-SFC-9AXIS-MS0/U-OSC9-WIRE-FIX (commit be173cf2b). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.616Z
aliases: reference_post_ship_oscar-sfc-9axis-ms0-u-osc9-wire-fix
---


# OSCAR-SFC-9AXIS-MS0/U-OSC9-WIRE-FIX

[MAIN] [OSCAR-SFC-9AXIS-MS0]/U-OSC9-WIRE-FIX iter9 2026-05-26: close silent wire-break — GWizardAdapterEngine + WedmTrainingPairBridgeEngine were slot/oscar-only but dispatcher actions wired on main. Caller would 404. 50/50 tests. Restores main-tree wiring correctness for prism_calc:gwizard_read_toolcrib + wedm_training_pair_lookup.

**Shipped:** 2026-05-26T13:17:54-05:00 by markjvillanueva3-cloud
**Files:** 6 touched

Full distillation: [[oscar-sfc-9axis-ms0-u-osc9-wire-fix]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._