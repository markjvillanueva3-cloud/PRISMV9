# Sinker EDM Reference Programs — CAMX-MS22 U05

Reference G-code for sinker (die-sink) EDM pipeline validation. Makino EDGE series, Sodick AG series.

---

## Test 1: O5001 — Cavity Sinking with Orbiting (Makino EDGE)
```gcode
%
O5001 (CAVITY SINK 20x20x10, ORBIT FINISH)
G90 G54
G92 X0. Y0. Z0.
M84 (DIELECTRIC ON, FLUSH)
E01 (ROUGH CONDITION)
(PRIMARY PLUNGE)
G01 Z-10. F0.2 (PLUNGE TO DEPTH)
(ORBIT FOR SIDE FINISH)
E05 (SEMI-FINISH CONDITION)
G05.1 R0.05 Q1 (ORBIT RADIUS 0.05MM, MODE CIRCULAR)
G01 Z-10. F0.1
G05.1 R0.02 Q1 (FINER ORBIT)
G01 Z-10. F0.05
G05.1 R0.0 Q0 (CANCEL ORBIT)
G00 Z5.
M85 M05
M02
%
```
Features: Z-plunge primary, `G05.1 R## Q1` orbit cycle for side-finishing, multi-level orbit radius reduction.

---

## Test 2: O5002 — Multi-Electrode Sequence (Sodick AG)
```gcode
%
O5002 (3-ELECTRODE PROGRESSIVE)
G90 G54
G92 X0. Y0. Z0.
(ELECTRODE 1: ROUGH GRAPHITE)
T101 M06 (POSITION E1)
M84
E01
G01 Z-9.5 F0.15
G00 Z5.
(ELECTRODE 2: SEMI-FINISH GRAPHITE)
T102 M06
G01 X0. Y0. (RE-POSITION, Z COMPENSATES FOR WEAR)
E03
G01 Z-9.85 F0.08
G00 Z5.
(ELECTRODE 3: FINISH COPPER)
T103 M06
E05
G05.1 R0.015 Q1 (FINE ORBIT)
G01 Z-10.00 F0.04
G05.1 R0.0 Q0
G00 Z10.
M85 M05
M02
%
```
Features: 3 electrode tool-change sequence, progressive depth compensation for wear, copper electrode for finish.

---

## Test 3: O5003 — C-Axis Indexed Cavity (Makino 5-axis sinker)
```gcode
%
O5003 (C-AXIS INDEX, 4 POSITIONS)
G90 G54
G92 X0. Y0. Z0. C0.
M84
(POSITION 1: C0)
E01
G01 Z-5. F0.2
G00 Z5.
C90. (INDEX C-AXIS)
G92 X0. Y0. (RESET FOR NEW ORIENTATION)
E01
G01 Z-5. F0.2
G00 Z5.
C180.
G92 X0. Y0.
E01
G01 Z-5. F0.2
G00 Z5.
C270.
G92 X0. Y0.
E01
G01 Z-5. F0.2
G00 Z10.
C0. (RETURN)
M85 M05
M02
%
```
Features: `C-axis` rotary index, 4-position radial cavity pattern, `G92` origin reset per index.

---

## Predicate Checklist

| Feature | Test 1 | Test 2 | Test 3 |
|--------|--------|--------|--------|
| Dielectric on (M84) | ✓ | ✓ | ✓ |
| Condition code (E##) | ✓ | ✓ | ✓ |
| Z-plunge primary | ✓ | ✓ | ✓ |
| Orbit cycle (G05.1) | ✓ | ✓ | — |
| Multi-electrode sequence | — | ✓ | — |
| Progressive wear comp | — | ✓ | — |
| C-axis index | — | — | ✓ |
| G92 origin reset | — | — | ✓ |

`EDMProgramAssemblerEngine.assembleSinkerEDM` output must match ≥70% of checklist.
