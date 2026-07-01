---
name: prism-gcode-motion-codes
description: Cross-controller motion G-code syntax for rapid, linear, arc, helix, and spline moves across Fanuc, Siemens, Haas, Mazak, Heidenhain, Mitsubishi, and Okuma
---
# Motion G-Codes: Cross-Controller Reference

## When To Use
- "What's the G-code for circular interpolation on Siemens?"
- "G02 equivalent on Heidenhain" / "Arc move on Heidenhain TNC"
- "How do I program a helix on Fanuc vs Haas?"
- "Spline interpolation code" / "NURBS programming"
- Converting a program between controller families and need motion code translation
- NOT for canned cycles (drilling, tapping) → use prism-gcode-canned-cycles
- NOT for coordinate systems or work offsets → use prism-gcode-coordinate-systems

## How To Use
Identify the source controller and target controller, then look up the equivalent motion code.
Heidenhain uses conversational syntax — L for linear, DR+/DR- for arc direction — not G-codes.

| Function | FANUC | Siemens | Haas | Mazak | Heidenhain | Mitsubishi | Okuma |
|----------|-------|---------|------|-------|------------|------------|-------|
| Rapid | G00 | G0 | G00 | G00 | L...FMAX | G00 | G00 |
| Linear | G01 | G1 | G01 | G01 | L | G01 | G01 |
| CW Arc | G02 | G2 | G02 | G02 | DR- | G02 | G02 |
| CCW Arc | G03 | G3 | G03 | G03 | DR+ | G03 | G03 |
| Dwell | G04 | G4 | G04 | G04 | CYCL DEF 9.0 | G04 | G04 |
| Helical CW | G02 Z | G2 Z | G02 Z | G02 Z | — | G02 Z | G02 Z |
| Helical CCW | G03 Z | G3 Z | G03 Z | G03 Z | — | G03 Z | G03 Z |
| Spline | G06.1 | ASPLINE | — | — | — | — | — |
| NURBS | G06.2 | BSPLINE | — | G06.2 | — | G06.2 | G06.2 |

Key differences: Siemens drops leading zeros (G0 not G00). Heidenhain has no G-codes — uses L for linear, DR+/DR- for arc direction. Spline/NURBS only on Fanuc and Siemens; NURBS also on Mazak, Mitsubishi, Okuma.

## What It Returns
- Exact G-code syntax per controller family for 9 motion types
- Controller-specific quirks: Heidenhain conversational vs ISO, Siemens shorthand
- Feature availability gaps: which controllers lack spline/NURBS support

## Examples
- Input: "Convert Fanuc helical arc G02 X50. Y30. Z-5. I25. J0 F200 to Siemens"
  Output: G2 X50 Y30 Z-5 I25 J0 F200 — Siemens drops leading zeros, no decimal on integers
- Input: "How do I do a circular move on Heidenhain?"
  Output: CC X+50 Y+30 (set center) then C DR- R25 F200 (CW arc, radius 25). No G02/G03.
- Edge case: "Helical interpolation on Heidenhain" — not directly supported in conversational mode. Use ISO mode (G02/G03 with Z) or CYCL DEF with helix parameters.
SOURCE: Split from prism-gcode-reference, Section 2.1
RELATED: prism-gcode-coordinate-systems, prism-gcode-tool-compensation, prism-gcode-canned-cycles
