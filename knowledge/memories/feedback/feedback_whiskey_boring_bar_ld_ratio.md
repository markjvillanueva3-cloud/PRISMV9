---
name: feedback-whiskey-boring-bar-ld-ratio
description: Boring-bar deflection scales L³/D⁴ (cantilever δ=FL³/3EI, I∝D⁴). Enforce L/D ≤ 4 steel, ≤ 6 carbide.
type: feedback
slot: whiskey
source: prism-memory
synced: 2026-06-27T20:30:46.452Z
aliases: feedback_whiskey_boring_bar_ld_ratio
---


Boring-bar deflection scales with L³/D⁴ (cantilever δ=FL³/3EI, I∝D⁴ — same exponent as a mill end-mill cantilever; the lathe risk is that boring bars routinely run at high L/D inside deep bores). A 5:1 L/D steel bar deflects ~16× (=(5/2)³) a 2:1 bar.

**Why:** ID bore chatter + taper + scrapped bores come from over-long bars, not feed/speed. The dominant lever is the bar, not the cut.

**How to apply:** enforce L/D ≤ 4 for steel bars, ≤ 6 for carbide-shanked bars; above that switch to carbide/heavy-metal shank or anti-vibration bar. `LatheAdvancedOperationsEngine` carries the gate. Surface-finish floor: Ra ≈ f²/(32·Rₙₒₛₑ) — see [[feedback_whiskey_nose_radius_surface_finish]].
