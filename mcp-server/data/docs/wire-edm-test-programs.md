# Wire EDM Reference Programs — CAMX-MS22 U04

Reference G-code for wire EDM pipeline validation. Extracted from Fanuc Robocut, Mitsubishi MV series, and Sodick AQ series manuals.

---

## Test 1: O4001 — Simple Profile Cut (Fanuc Robocut)
```gcode
%
O4001 (SIMPLE PROFILE ROUGH CUT)
G90 G54 (ABSOLUTE, WCS)
G92 X0. Y0. (SET ORIGIN AT START HOLE)
M50 (WIRE THREADING)
M84 (WATER ON)
E01 (CONDITION: ROUGH CUT 0.25MM BRASS WIRE)
G41 H01 (WIRE OFFSET LEFT, KERF COMP)
G01 X10. Y0. F2.0
Y10.
X0.
Y0.
G40 (CANCEL OFFSET)
M85 (WATER OFF)
M51 (WIRE CUT + RETRACT)
M02
%
```
Features: `M50` wire threading, `G41 H##` wire offset/kerf comp, `E01` condition call, `M51` wire cut.

---

## Test 2: O4002 — Taper Cut 4-Axis (Mitsubishi MV)
```gcode
%
O4002 (4-AXIS TAPER CUT 3 DEG)
G90 G54 G55
G92 X0. Y0. U0. V0. (SET BOTH WIRE GUIDES)
M50
M84
E02 (TAPER CONDITION)
G51 (TAPER MODE ON)
G41 H02
G01 X20. Y0. U20.0349 V0. F1.5 (3 DEG TAPER: U=X+TAN(3)*H)
Y20. V20.0349
X0. U0.
Y0. V0.
G40
G50 (CANCEL TAPER)
M85
M51
M02
%
```
Features: `G51/G50` taper mode, UV axis (upper-guide independent), UV coordinates offset by taper geometry.

---

## Test 3: O4003 — Multi-Pass Skim Cut (Sodick AQ)
```gcode
%
O4003 (4-PASS: 1 ROUGH + 3 SKIM)
G90 G54
G92 X0. Y0.
M50
M84
(PASS 1: ROUGH)
E11 (ROUGH 0.30MM KERF)
G41 H11
G01 X30. Y0. F1.8
Y30.
X0.
Y0.
G40
(PASS 2: SKIM 1)
E21 (SKIM COARSE 0.020MM)
G41 H21
G01 X30. Y0. F3.5
Y30.
X0.
Y0.
G40
(PASS 3: SKIM 2)
E22 (SKIM MEDIUM 0.008MM)
G41 H22
G01 X30. Y0. F5.0
Y30.
X0.
Y0.
G40
(PASS 4: SKIM 3 — FINISH)
E23 (SKIM FINE 0.003MM)
G41 H23
G01 X30. Y0. F7.5
Y30.
X0.
Y0.
G40
M85
M51
M02
%
```
Features: 4-pass skim strategy (rough + 3 finishing), different condition codes per pass, decreasing kerf offsets.

---

## Test 4: O4004 — Closed Contour with Slug Tab (Fanuc)
```gcode
%
O4004 (CLOSED POCKET + SLUG RETENTION)
G90 G54
G92 X0. Y0.
M50
M84
E01
G41 H01
G01 X2. Y0. F2.0
X18. (CUT TO POINT JUST BEFORE TAB)
M00 (STOP FOR OPERATOR — TAB AT 18-20MM)
G01 X20. F0.5
Y20.
X0.
Y2.
X2. (RETURN TO START — CLOSE CONTOUR)
G40
M85
M51
M02
%
```
Features: `M00` optional stop for operator tab placement, slug retention strategy (skip a segment and stop so slug stays).

---

## Predicate Checklist

| Feature | Test 1 | Test 2 | Test 3 | Test 4 |
|--------|--------|--------|--------|--------|
| Wire threading (M50) | ✓ | ✓ | ✓ | ✓ |
| Water/flush on (M84) | ✓ | ✓ | ✓ | ✓ |
| Condition code (E##) | ✓ | ✓ | ✓ × 4 | ✓ |
| Kerf offset (G41/G40) | ✓ | ✓ | ✓ | ✓ |
| Taper (G51) + UV | — | ✓ | — | — |
| Multi-pass skim | — | — | ✓ | — |
| Slug tab (M00 placement) | — | — | — | ✓ |
| Wire cut + retract (M51) | ✓ | ✓ | ✓ | ✓ |

`EDMProgramAssemblerEngine.assembleWireEDM` output must match ≥80% of checklist.
