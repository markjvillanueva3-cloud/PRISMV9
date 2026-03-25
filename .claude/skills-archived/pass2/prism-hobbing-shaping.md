---
name: prism-hobbing-shaping
description: 'Gear hobbing and shaping guide. Use when the user needs gear cutting parameters, hob selection, gear shaping setup, or gear quality verification (AGMA/DIN).'
license: MIT
metadata:
  author: PRISM
  version: "1.0.0"
  tier: PASS2
  scrutiny_id: M110
  process: gear-cutting
---

# Gear Hobbing & Shaping

## When to Use
- Calculating hobbing parameters (feed, speed, shift increments)
- Selecting hob specifications (module, pressure angle, protuberance)
- Gear shaping setup (stroke rate, circular feed, depth of cut)
- Gear quality verification per AGMA 2015 or DIN 3962

## How It Works
1. Define gear geometry (module, teeth, helix angle, face width)
2. Select hob/shaper cutter via `prism_data→tool_search`
3. Calculate parameters via `prism_calc→gear_hobbing` or `gear_shaping`
4. Verify gear quality grade achievable with process
5. Plan finishing if needed (shaving, grinding, honing)

## Returns
- Hob/cutter selection with specification
- Cutting parameters (speed, feed, DOC, shift increment)
- Expected gear quality grade (AGMA or DIN)
- Finishing process recommendation if tighter quality needed

## Example
**Input:** "Hob module 3 spur gear, 40 teeth, 20mm face width, 20° PA, 4140 steel"
**Output:** Hob: M3 × 20° PA, Class AA, 3-start for productivity. Parameters: Vc=80 m/min (carbide), axial feed 2.0mm/rev, 1 cut (full depth 6.75mm). Shift: 0.5mm/part (hob life ~400 parts). Cycle: 1.8 min/gear. Expected quality: AGMA 10 (DIN 7). For AGMA 12+: add gear shaving or profile grinding post-hob.
