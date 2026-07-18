---
name: reference_post_ship_oscar-sfc-9axis-ms0-u-osc-full-sweep-scrutiny-fix
description: Auto-distilled learnings from shipping OSCAR-SFC-9AXIS-MS0/U-OSC-FULL-SWEEP-SCRUTINY-FIX (commit af0ac16c5). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.964Z
aliases: reference_post_ship_oscar-sfc-9axis-ms0-u-osc-full-sweep-scrutiny-fix
---


# OSCAR-SFC-9AXIS-MS0/U-OSC-FULL-SWEEP-SCRUTINY-FIX

[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OSCAR-SFC-9AXIS-MS0]/U-OSC-FULL-SWEEP-SCRUTINY-FIX (slot:oscar): close 2-reviewer FAIL — (1) fix cells.length ReferenceError in driver non-json path (streaming refactor left dead var, masked by --json); (2) R12 honesty: 15 material names resolve at ISO-GROUP level not per-alloy (6061≡7075, 304≡316, D2≡A2≡WC-Co — empirically verified) → 15 selectable names = 6 physics profiles, a real SFC finding (per-alloy dropdown finer than physics). Locked by test (4 N-names→1 Vc). Corrected spec+memory claims. 18/18 tests

**Shipped:** 2026-06-08T21:56:16-05:00 by markjvillanueva3-cloud
**Files:** 5 touched

Full distillation: [[oscar-sfc-9axis-ms0-u-osc-full-sweep-scrutiny-fix]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._