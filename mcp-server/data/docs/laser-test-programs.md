# Laser Cutting Reference Programs — CAMX-MS22 U06

Reference G-code for laser cutting pipeline validation. TRUMPF TruLaser, Bystronic ByStar, Mazak Optiplex examples.

---

## Test 1: O6001 — Simple Profile Cut (TRUMPF TruLaser)
```gcode
%
O6001 (SIMPLE RECT PROFILE 100x60)
G90 G21
E01 (LASER POWER PRESET — 2KW FIBER)
M07 (ASSIST GAS N2)
G00 X0. Y0.
M100 (PIERCE START)
G04 P0.3 (PIERCE DWELL 0.3 SEC)
M101 (PIERCE END, CUT ON)
G01 X100. F6000.
Y60.
X0.
Y0.
M102 (CUT OFF)
G00 Z50. (LIFT)
M09
M30
%
```
Features: Pierce dwell (`G04`), pierce start/end/cut M-codes, N2 assist gas.

---

## Test 2: O6002 — Nested Multi-Part Sheet (Bystronic)
```gcode
%
O6002 (NESTED SHEET — 4 PARTS)
G90 G21
E02 (4KW FIBER, 10MM MS)
M07 (O2 ASSIST)
(PART 1 @ 0,0)
G00 X0. Y0.
M100
G04 P0.5
M101
G01 X50. F3200.
Y50.
X0.
Y0.
M102
(PART 2 @ 60,0)
G00 X60. Y0.
M100
G04 P0.5
M101
G01 X110. F3200.
Y50.
X60.
Y0.
M102
(PART 3 @ 0,60)
G00 X0. Y60.
M100
G04 P0.5
M101
G01 X50. F3200.
Y110.
X0.
Y60.
M102
(PART 4 @ 60,60)
G00 X60. Y60.
M100
G04 P0.5
M101
G01 X110. F3200.
Y110.
X60.
Y60.
M102
G00 Z50.
M09 M30
%
```
Features: 4 parts nested 50mm apart, O2 flame-cut assist gas, pierce+cut sequence per part.

---

## Test 3: O6003 — Pierce + Cut with Lead-in/Lead-out (Mazak Optiplex)
```gcode
%
O6003 (LEAD-IN/OUT + KERF COMP)
G90 G21
E03
M07
G00 X-5. Y-5. (LEAD-IN START POSITION)
M100
G04 P0.4
M101
G41 H01 (KERF COMP LEFT)
G01 X0. Y0. F4000. (LEAD-IN LINE)
X80.
Y50.
X0.
Y0.
X-5. Y-5. (LEAD-OUT)
G40
M102
G00 Z50.
M09 M30
%
```
Features: Lead-in/lead-out geometry, `G41 H01` kerf compensation.

---

## Test 4: O6004 — Marking + Cutting (Dual Mode)
```gcode
%
O6004 (MARK + CUT DUAL MODE)
G90 G21
(MARKING: LOW POWER)
E10 (MARK PRESET, 200W, HIGH SPEED)
M07
G00 X10. Y10.
M110 (MARK ON)
G01 X40. Y10. F15000.
G03 X40. Y20. I0. J5.
G01 X10. Y20.
M111 (MARK OFF)
(CUTTING: FULL POWER)
E01 (CUT PRESET)
G00 X0. Y0.
M100
G04 P0.3
M101
G01 X50. F6000.
Y30.
X0.
Y0.
M102
G00 Z50.
M09 M30
%
```
Features: Dual mode (mark + cut), `M110/M111` marking on/off, arc in marking, different power presets.

---

## Predicate Checklist

| Feature | Test 1 | Test 2 | Test 3 | Test 4 |
|--------|--------|--------|--------|--------|
| Laser preset (E##) | ✓ | ✓ | ✓ | ✓ |
| Assist gas (M07) | ✓ | ✓ | ✓ | ✓ |
| Pierce (M100/G04/M101) | ✓ | ✓ | ✓ | ✓ |
| Cut off (M102) | ✓ | ✓ | ✓ | ✓ |
| Nesting (≥2 parts) | — | ✓ | — | — |
| Lead-in/lead-out | — | — | ✓ | — |
| Kerf comp (G41/G40) | — | — | ✓ | — |
| Marking mode | — | — | — | ✓ |

`LaserProgramAssemblerEngine` output must match ≥75% of checklist. Nesting integration validated via `SheetNestingEngine`.
