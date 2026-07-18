---
name: feedback-whiskey-nose-radius-surface-finish
description: Turned surface finish Ra ≈ f²/(32·R_nose). Halving feed quarters Ra; the dominant levers are feed and nose radius.
type: feedback
slot: whiskey
source: prism-memory
synced: 2026-06-27T20:30:46.453Z
aliases: feedback_whiskey_nose_radius_surface_finish
---


Theoretical turned surface finish: Ra ≈ f² / (32 · Rₙₒₛₑ), where f = feed (mm/rev) and Rₙₒₛₑ = insert nose radius. Feed enters squared — halving feed quarters Ra; doubling nose radius halves Ra.

**Why:** when a finish-Ra target is missed, the fix is feed↓ or nose-radius↑ — NOT speed. Speed affects BUE/thermal, not the geometric cusp.

**How to apply:** size the finish pass from the Ra target backward (solve for f given Rₙₒₛₑ). A larger nose radius needs more radial DOC to avoid rubbing and raises radial force (deflection on slender parts) — trade against [[feedback_whiskey_boring_bar_ld_ratio]]. Insert nose-radius defaults: `registries/tools.ts`.
