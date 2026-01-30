---
name: prism-controller-quick-ref
version: 1.0.0
description: |
  Quick reference and navigation guide for CNC controller skills.
  Points to comprehensive controller-specific references rather than
  duplicating content.
  
  COMPREHENSIVE REFERENCES (kept separate):
  - prism-fanuc-programming (2,921 lines, 98KB)
  - prism-siemens-programming (2,789 lines, 85KB)
  - prism-heidenhain-programming (3,179 lines, 86KB)
  - prism-gcode-reference (2,566 lines, 87KB)
  
  This skill provides:
  - Controller selection guide
  - Cross-controller comparison tables
  - Quick G/M code lookup
  - Navigation to detailed references
triggers:
  - "controller"
  - "fanuc"
  - "siemens"
  - "heidenhain"
  - "g-code"
  - "post processor"
---

# PRISM CONTROLLER QUICK REFERENCE
## Navigation Guide for CNC Controller Skills
### Version 1.0 | SP.9

---

## TABLE OF CONTENTS

1. [Controller Selection Guide](#1-controller-selection-guide)
2. [Skill Navigation](#2-skill-navigation)
3. [Cross-Controller Comparison](#3-cross-controller-comparison)
4. [Essential G-Codes](#4-essential-g-codes)
5. [Essential M-Codes](#5-essential-m-codes)
6. [Canned Cycles Quick Reference](#6-canned-cycles-quick-reference)
7. [Safe Start Blocks](#7-safe-start-blocks)

---

# 1. CONTROLLER SELECTION GUIDE

## Which Controller Reference Do You Need?

```
Machine Brand → Controller → Skill
─────────────────────────────────────────────────
Haas            → Fanuc-compatible   → prism-fanuc-programming
Mazak           → Mazatrol/Smooth    → prism-fanuc-programming (G-code mode)
DMG MORI        → Multiple options   → Check machine specs
Okuma           → OSP                → prism-gcode-reference
Makino          → Fanuc/Pro 5/6      → prism-fanuc-programming
Doosan          → Fanuc              → prism-fanuc-programming
Hurco           → WinMax             → prism-gcode-reference
Brother         → CNC-C00            → prism-fanuc-programming
Matsuura        → Fanuc              → prism-fanuc-programming
Kitamura        → Fanuc/Arumatik     → prism-fanuc-programming
DMU/DMC (MORI)  → Siemens/Heidenhain → prism-siemens or heidenhain
Hermle          → Heidenhain         → prism-heidenhain-programming
Deckel Maho     → Siemens/Heidenhain → prism-siemens or heidenhain
Mikron          → Heidenhain         → prism-heidenhain-programming
```

## Controller Market Share

| Controller | Market Share | Primary Markets |
|------------|--------------|-----------------|
| **Fanuc** | ~65% | Americas, Asia, Global |
| **Siemens** | ~20% | Europe, Large machines |
| **Heidenhain** | ~10% | Europe, Precision |
| **Other** | ~5% | Specialized |

---

# 2. SKILL NAVIGATION

## Comprehensive Reference Skills

| Need | Skill | Size | Contents |
|------|-------|------|----------|
| **Fanuc/Haas programming** | `prism-fanuc-programming` | 98KB | Macro B, 500+ alarms, system vars |
| **Siemens programming** | `prism-siemens-programming` | 85KB | Cycles, R-parameters, ShopMill |
| **Heidenhain programming** | `prism-heidenhain-programming` | 86KB | Plain language, Q-params, cycles |
| **Cross-controller G-code** | `prism-gcode-reference` | 87KB | Universal codes, comparisons |

## Quick Decision

```
What do you need?
├── Macro programming? → prism-fanuc-programming Section 2-7
├── Alarm troubleshooting? → prism-fanuc-programming Section 12
├── Siemens cycles? → prism-siemens-programming Section 4
├── Heidenhain conversational? → prism-heidenhain-programming Section 3
├── Compare controllers? → This skill OR prism-gcode-reference
└── Post processor? → prism-expert-master Section 5
```

---

# 3. CROSS-CONTROLLER COMPARISON

## Program Structure

| Element | Fanuc | Siemens | Heidenhain |
|---------|-------|---------|------------|
| Program start | `%` | - | `BEGIN PGM name` |
| Program number | `O0001` | - | - |
| Comment | `(text)` | `; text` | `; text` |
| Block number | `N10` | `N10` | `10` |
| Program end | `M30` / `%` | `M30` | `END PGM name` |

## Modal G-Codes

| Function | Fanuc | Siemens | Heidenhain |
|----------|-------|---------|------------|
| Rapid | G00 | G0 | L ... FMAX |
| Linear | G01 | G1 | L ... F... |
| CW Arc | G02 | G2 | CR/DR ... |
| CCW Arc | G03 | G3 | CR/DR ... |
| XY Plane | G17 | G17 | PLANE XY |
| Absolute | G90 | G90 | - (default) |
| Incremental | G91 | G91 | IR/JR/KR |

## Cutter Compensation

| Function | Fanuc | Siemens | Heidenhain |
|----------|-------|---------|------------|
| Cancel | G40 | G40 | R0 |
| Left | G41 | G41 | RL |
| Right | G42 | G42 | RR |

## Tool Length Comp

| Function | Fanuc | Siemens | Heidenhain |
|----------|-------|---------|------------|
| Activate | G43 H# | G43 | TOOL CALL # |
| Cancel | G49 | G49 | (automatic) |

## Work Offsets

| Offset | Fanuc | Siemens | Heidenhain |
|--------|-------|---------|------------|
| 1st | G54 | G54/TRANS | Datum table |
| 2nd | G55 | G55 | Datum table |
| 3rd-6th | G56-G59 | G56-G59 | Datum table |
| Extended | G54.1 P# | G505+ | Preset table |

---

# 4. ESSENTIAL G-CODES

## Motion (Group 01)

| Code | Function | Notes |
|------|----------|-------|
| G00 | Rapid traverse | Non-cutting movement |
| G01 | Linear interpolation | Cutting feed |
| G02 | CW circular | Arc clockwise |
| G03 | CCW circular | Arc counter-clockwise |

## Plane Selection (Group 02)

| Code | Function | Typical Use |
|------|----------|-------------|
| G17 | XY plane | Milling (default) |
| G18 | XZ plane | Lathe, side milling |
| G19 | YZ plane | Special operations |

## Distance Mode (Group 03)

| Code | Function | Notes |
|------|----------|-------|
| G90 | Absolute | From work zero |
| G91 | Incremental | From current position |

## Canned Cycles (Group 09)

| Code | Function |
|------|----------|
| G80 | Cancel canned cycle |
| G81 | Drilling |
| G82 | Spot drilling (dwell) |
| G83 | Deep hole peck drilling |
| G84 | Tapping |
| G85 | Boring (feed out) |
| G86 | Boring (rapid out) |
| G73 | High-speed peck |
| G76 | Fine boring |

## Tool Compensation (Group 07/08)

| Code | Function |
|------|----------|
| G40 | Cancel cutter comp |
| G41 | Cutter comp left |
| G42 | Cutter comp right |
| G43 | Tool length comp + |
| G44 | Tool length comp - |
| G49 | Cancel tool length comp |

---

# 5. ESSENTIAL M-CODES

## Spindle (Fanuc Standard)

| Code | Function |
|------|----------|
| M03 | Spindle CW |
| M04 | Spindle CCW |
| M05 | Spindle stop |
| M19 | Spindle orient |

## Coolant

| Code | Function |
|------|----------|
| M08 | Coolant on (flood) |
| M09 | Coolant off |
| M07 | Mist coolant |

## Program Control

| Code | Function |
|------|----------|
| M00 | Program stop |
| M01 | Optional stop |
| M02 | Program end |
| M30 | Program end & rewind |
| M98 | Subprogram call |
| M99 | Subprogram return |

## Tool Change

| Code | Function |
|------|----------|
| M06 | Tool change |
| T## | Tool selection |

---

# 6. CANNED CYCLES QUICK REFERENCE

## Drilling Cycles

### G81 - Standard Drilling
```
Fanuc:     G81 X_ Y_ Z_ R_ F_
Siemens:   CYCLE81(RTP, RFP, SDIS, DP)
Heidenhain: CYCL DEF 1.0 PECKING
```

### G83 - Peck Drilling
```
Fanuc:     G83 X_ Y_ Z_ R_ Q_ F_
           Q = peck depth
Siemens:   CYCLE83(RTP, RFP, SDIS, DP, DPR, FDEP, DAM, DTB, DTS, FRF, VARI)
Heidenhain: CYCL DEF 1.0 PECKING Q200=_ Q201=_ Q206=_
```

### G84 - Tapping
```
Fanuc:     G84 X_ Y_ Z_ R_ F_
           F = pitch (rigid) or calculated (floating)
Siemens:   CYCLE84(RTP, RFP, SDIS, DP, DPR, DTB, SDAC, MPIT, PIT, POSS, SST, SST1)
Heidenhain: CYCL DEF 2.0 TAPPING Q200=_ Q201=_ Q206=_
```

## Boring Cycles

| Cycle | Fanuc | Action |
|-------|-------|--------|
| G85 | Boring | Feed in, feed out |
| G86 | Boring | Feed in, rapid out, spindle stop |
| G76 | Fine boring | Orient, shift, rapid out |

---

# 7. SAFE START BLOCKS

## Fanuc/Haas

```gcode
%
O0001 (PROGRAM NAME)
G90 G94 G17 G40 G49 G80
G53 G0 Z0
T1 M6
G54
G0 X0 Y0
S5000 M3
G43 H1 Z25.
M8
```

## Siemens

```gcode
; PROGRAM NAME
G90 G94 G17 G40 G49 G80
SUPA G0 Z0
T1 D1
M6
G54
G0 X0 Y0
S5000 M3
G43
```

## Heidenhain

```
BEGIN PGM PROGRAM MM
BLK FORM 0.1 Z X-50 Y-50 Z-50
BLK FORM 0.2 X+50 Y+50 Z+0
TOOL CALL 1 Z S5000
L Z+100 R0 FMAX M3
L X+0 Y+0 R0 FMAX
L Z+25 R0 FMAX M8
```

---

## COMPREHENSIVE SKILL LOCATIONS

For detailed programming, consult:

```
C:\_SKILLS\prism-fanuc-programming\SKILL.md      (2,921 lines)
C:\_SKILLS\prism-siemens-programming\SKILL.md   (2,789 lines)
C:\_SKILLS\prism-heidenhain-programming\SKILL.md (3,179 lines)
C:\_SKILLS\prism-gcode-reference\SKILL.md       (2,566 lines)
```

---

## SUMMARY

| Skill Type | Approach |
|------------|----------|
| **This skill** | Quick navigation, comparison tables |
| **prism-fanuc-programming** | Complete Fanuc/Macro B reference |
| **prism-siemens-programming** | Complete Siemens/Sinumerik reference |
| **prism-heidenhain-programming** | Complete Heidenhain/TNC reference |
| **prism-gcode-reference** | Universal G-code reference |

**Total Controller Documentation:** 11,455 lines, 356KB

---

**END OF PRISM CONTROLLER QUICK REFERENCE**
