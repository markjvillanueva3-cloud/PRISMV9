---
name: prism-gcode-coordinate-systems
description: Cross-controller coordinate system G-codes — work offsets (G54-G59), extended WCS, absolute/incremental, local/machine coordinates, plane selection across 7 controller families
---
# Coordinate System G-Codes: Cross-Controller Reference

## When To Use
- "How do I set work offset on Siemens?" / "G54 equivalent on Heidenhain"
- "Extended work offsets beyond G59" — each controller handles this differently
- "G52 local coordinate on Mazak" / "G53 machine coordinate differences"
- "Switch between absolute and incremental mid-program"
- "What plane codes does Heidenhain use?"
- NOT for motion codes → use prism-gcode-motion-codes
- NOT for tool length/cutter compensation → use prism-gcode-tool-compensation

## How To Use
Work offsets G54-G59 are universal across all ISO-compatible controllers. Beyond G59, every controller diverges. Heidenhain uses Datum Tables instead of G54-G59 numbering.

**Work Offsets:**
| Function | FANUC | Siemens | Haas | Mazak | Heidenhain | Mitsubishi | Okuma |
|----------|-------|---------|------|-------|------------|------------|-------|
| WCS 1-6 | G54-G59 | G54-G59 | G54-G59 | G54-G59 | Datum Table | G54-G59 | G54-G59 |
| Extended | G54.1 P1-48 | G505-G599 | G154 P1-99 | G54.1 | Datum Table | G54.1 | G15 H1-50 |
| Local Coord | G52 | TRANS | G52 | G52 | CYCL DEF 7.0 | G52 | G52 |
| Machine Coord | G53 | G53/SUPA | G53 | G53 | — | G53 | G53 |

**Modes & Planes:**
| Function | FANUC | Siemens | Haas | Mazak | Heidenhain | Mitsubishi | Okuma |
|----------|-------|---------|------|-------|------------|------------|-------|
| Absolute | G90 | G90 | G90 | G90 | default | G90 | G90 |
| Incremental | G91 | G91 | G91 | G91 | use Δ prefix | G91 | G91 |
| XY Plane | G17 | G17 | G17 | G17 | default | G17 | G17 |
| ZX Plane | G18 | G18 | G18 | G18 | CYCL DEF 19 | G18 | G18 |
| YZ Plane | G19 | G19 | G19 | G19 | CYCL DEF 19 | G19 | G19 |

Critical: Haas extended offsets use G154 P1-99 (99 additional). Siemens uses G505-G599 (95 additional). Fanuc uses G54.1 P1-48 (48 additional). Okuma uses G15 H1-50 (50 additional).

## What It Returns
- Exact work offset syntax per controller, including extended offset addressing
- Mode switching codes (absolute/incremental, plane selection)
- Capacity limits: how many additional offsets each controller supports
- Heidenhain differences: Datum Table approach, no G54 numbering

## Examples
- Input: "I have 24 fixtures on a Haas tombstone, how do I address them?"
  Output: G54-G59 for first 6, then G154 P1 through G154 P18 for remaining 18. Total 99 available via G154.
- Input: "Convert Fanuc G54.1 P12 to Siemens"
  Output: G516 (G505 + 11 = G516). Siemens maps extended offsets to G505-G599 sequentially.
- Edge case: "Heidenhain work offset setup" — No G54. Use Datum Table in TNC control. Set datum via touch probe cycle CYCL DEF 247 or manual preset table. Reference by datum number in program header.
SOURCE: Split from prism-gcode-reference, Sections 2.2, 2.3
RELATED: prism-gcode-motion-codes, prism-gcode-tool-compensation, prism-gcode-scaling-rotation
