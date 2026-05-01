---
name: prism-gcode-tool-compensation
description: Cross-controller tool compensation G-codes — cutter radius comp (G40-G42), tool length offset (G43/G44/G49), 3D and dynamic compensation (G43.4/TCPM/TRAORI) across 7 controller families
---
# Tool Compensation G-Codes: Cross-Controller Reference

## When To Use
- "Cutter comp codes for Siemens" / "G41 on Heidenhain"
- "Tool length offset differences between controllers"
- "G43.4 dynamic compensation — which controllers support it?"
- "3D cutter comp for 5-axis" / "TCPM vs TRAORI vs G43.4"
- Converting programs that use cutter comp between controller brands
- NOT for tool change M-codes → use prism-gcode-m-codes
- NOT for tool data/offset table setup → use prism-gcode-tool-management

## How To Use
Cutter comp (G41/G42) and TLO (G43) are nearly universal. The major divergence is in 5-axis dynamic compensation where Fanuc uses G43.4, Siemens uses TRAORI, and Heidenhain uses TCPM.

| Function | FANUC | Siemens | Haas | Mazak | Heidenhain | Mitsubishi | Okuma |
|----------|-------|---------|------|-------|------------|------------|-------|
| Comp Cancel | G40 | G40 | G40 | G40 | R0 | G40 | G40 |
| Comp Left | G41 | G41 | G41 | G41 | RL | G41 | G41 |
| Comp Right | G42 | G42 | G42 | G42 | RR | G42 | G42 |
| Comp Left 3D | G41.2 | G41 | — | — | RL | — | — |
| Comp Right 3D | G42.2 | G42 | — | — | RR | — | — |
| TLO Positive | G43 | G43 | G43 | G43 | TOOL CALL | G43 | G43 |
| TLO Negative | G44 | G44 | G44 | G44 | — | G44 | G44 |
| TLO Cancel | G49 | G49 | G49 | G49 | — | G49 | G49 |
| Dynamic Comp | G43.4 | TRAORI | G43.4 | G43.4 | TCPM | G43.4 | G43.4 |

Key points: Heidenhain uses RL/RR (radius left/right) instead of G41/G42, and R0 to cancel instead of G40. TOOL CALL handles TLO automatically — no separate G43 needed. 3D cutter comp only available on Fanuc (G41.2/G42.2), Siemens (same G41/G42 with 3D mode active), and Heidenhain (RL/RR in 3D mode).

## What It Returns
- Exact compensation syntax per controller for 9 compensation types
- 5-axis dynamic compensation equivalents: G43.4 vs TRAORI vs TCPM
- 3D comp availability: only 3 of 7 controllers support it
- Heidenhain quirks: TOOL CALL bundles TLO, RL/RR replaces G41/G42

## Examples
- Input: "Set up cutter comp left on Heidenhain for a 10mm endmill"
  Output: TOOL CALL 5 Z S8000 F500 then move with RL F500 — RL activates left compensation. Tool radius read from tool table automatically. Cancel with R0.
- Input: "Enable 5-axis TCPM on Fanuc"
  Output: G43.4 H1 — activates tool center point management. Tool tip stays on programmed point during rotary axis moves. Cancel with G49.
- Edge case: "Haas 3D cutter comp" — Not supported. Haas supports 2D comp (G41/G42) and basic G43.4 for TCPM on 5-axis models (UMC series), but no G41.2/G42.2 3D comp. Use CAM-generated toolpaths with comp off instead.
SOURCE: Split from prism-gcode-reference, Sections 2.5, 2.6
RELATED: prism-gcode-motion-codes, prism-gcode-coordinate-systems, prism-gcode-5axis-programming
