---
title: Lathe Safety Gates (slot:whiskey)
type: architecture
status: active
tags: [lathe, safety, whiskey, g50, css, chuck-jaw, spindle-torque, parting]
created: 2026-05-28
by: claude-57dfea65 (slot:whiskey)
---

# Lathe Safety Gates — pre-emit triad + per-op envelope

slot:whiskey runs these gates before ANY turning program is emitted. They are HARD — softening a threshold is a refuse per the whiskey soul.

## Pre-emit triad (every program)
1. `prism_turning:lathe_safety_predicate_evaluate` — composite predicate verify (proof-carrying).
2. `prism_turning:lathe_partoff_safety_gate` — part-off / part-catcher timing + clearance.
3. `prism_turning:lathe_workholding_select_jaw` — chuck-jaw force, pull-out resistance, lift-off moment.

## Per-operation envelope (every op)
- `prism_safety:check_spindle_torque` + `check_spindle_power` — never let a CSS rewrite outrun the spindle envelope. (The `lathe_`-prefixed spindle action IDs do NOT exist — verified 2026-05-29; the canonical spindle checks live in `prism_safety`.)

## The G50 / G96 rule (the canonical fail-loud check)
Every G96 (constant-surface-speed) move MUST carry a `G50 S<max-rpm>` cap. Without it, RPM runs up as diameter shrinks and a small-diameter finish pass over-spins the chuck → part ejection. **Missing G50 on a G96 program = −20 quality penalty + crash risk.** Shipped as `jm-die-lathe-upgrade-ms0-u-okuma-lathe-g50-check`.

## Other program-killers (quality rubric subtractive)
- Negative DOC in G71 P/Q block: −15 · IPR/IPM feed-mode confusion: −25 (10× feed error) · G92-when-G76-available: −10 · tool-change at center-line crash position: −25.

## Related
- [[lathe-galaxy]] · [[lathe-okuma-dialect]]
- [[feedback_whiskey_g50_css_cap_mandatory]] · [[feedback_whiskey_parting_peck_evacuation]] · [[feedback_whiskey_subspindle_phase_tolerance]]
- soul: `state/shared/slot-souls/whiskey.md`
