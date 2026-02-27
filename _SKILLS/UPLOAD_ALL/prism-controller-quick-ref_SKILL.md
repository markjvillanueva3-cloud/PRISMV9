---
name: prism-controller-quick-ref
description: |
  Quick reference for CNC controllers. Navigation guide to detailed references.
---

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
