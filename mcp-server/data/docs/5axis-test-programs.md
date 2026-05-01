# 5-Axis Reference Programs — CAMX-MS22 U02

Reference G-code for 5-axis pipeline validation. Extracted from Fanuc 30i Series B and Siemens 840D sl manuals. PRISM's `MultiAxisPrintToProgramEngine` is compared against these programs.

---

## Test 1: O2001 — Indexed Drilling (3+2) — Fanuc G68.2 Tilted Work Plane
```gcode
%
O2001 (3+2 INDEXED DRILL G68.2)
G17 G20 G40 G49 G54 G80 G90
T01 M06 (1/4 DRILL)
G00 G90 G54 X0. Y0. S3500 M03
G43 H01 Z1.0 M08
G68.2 X0. Y0. Z0. I45. J0. K30. (TILT WP: A45 around X, B30 around Y)
G53.1 (ALIGN TOOL TO WP +Z)
G00 X0.5 Y0.5
G81 X0.5 Y0.5 Z-0.25 R0.1 F8.
X1.0 Y0.5
X1.0 Y1.0
X0.5 Y1.0
G80
G69 (CANCEL TILTED WP)
G91 G28 Z0.
M30
%
```
Features: `G68.2` tilted work plane with IJK Euler angles, `G53.1` tool alignment, `G69` cancel.

---

## Test 2: O2002 — Simultaneous 5-Axis Contour (Fanuc G43.4 TCPC)
```gcode
%
O2002 (5-AXIS SIM CONTOUR TCPC)
G17 G20 G40 G49 G54 G80 G90
T02 M06 (BALL 6MM)
G00 G90 G54 X0. Y0. A0. C0. S4500 M03
G43.4 H02 Z1.0 (TCPC ON)
G01 Z0. F10.
G93 (INVERSE TIME FEED)
G01 X0.5 Y0. A5. C0. F250.
X1.0 Y0.1 A8. C3.
X1.5 Y0.25 A12. C7.
X2.0 Y0.45 A15. C10.
X2.5 Y0.70 A17. C12.
X3.0 Y1.0 A18. C15.
G94 (CANCEL INVERSE TIME, BACK TO F/MIN)
G49 (CANCEL TCPC)
G91 G28 Z0.
M30
%
```
Features: `G43.4` TCPC (tool center point control), `G93` inverse-time feed, A/C rotary axis, `G49` cancel.

---

## Test 3: O2003 — Impeller Blade Roughing (Siemens 840D CYCLE832)
```gcode
; O2003.MPF — IMPELLER BLADE ROUGHING
N10 G17 G40 G710
N20 T="BALL_4MM" M06
N30 S8500 M03
N40 G00 G54 X0 Y0 A0 C0
N50 TRAORI (SIEMENS 5-AXIS TRANSFORMATION)
N60 CYCLE832(0.01, 112, 1) (HSM TOLERANCE 0.01MM, ROUGHING)
N70 G01 Z0 F3000
N80 X10 Y2 A3 C12 FGROUP(X,Y,Z,A,C) F=FGREF(5000)
N90 X20 Y5 A7 C25
N100 X30 Y9 A12 C38
N110 X40 Y14 A17 C52
N120 X50 Y20 A21 C67
N130 TRAFOOF (CANCEL TRANSFORMATION)
N140 G00 Z50
N150 M30
```
Features: Siemens `TRAORI` 5-axis transformation, `CYCLE832` HSM mode, `FGROUP`/`FGREF` velocity grouping on rotary axes.

---

## Test 4: O2004 — NURBS Interpolation (Fanuc G6.2)
```gcode
%
O2004 (NURBS INTERP G6.2)
G17 G20 G40 G49 G54 G90
T03 M06 (BALL 3MM)
G00 G90 G54 X0. Y0. S6000 M03
G43 H03 Z0.5
G05.1 Q1 (LOOK-AHEAD ON)
G01 Z0. F15.
G6.2 P3 K0. K0. K0. K0. K1. K2. K3. K4. K4. K4. K4. (NURBS DEGREE=3, KNOTS)
X0. Y0. R1.
X1. Y0.5 R1.
X2. Y1.2 R1.
X3. Y1.6 R1.
X4. Y1.2 R1.
X5. Y0.5 R1.
X6. Y0. R1.
G01 X7. Y0. F15.
G05.1 Q0 (LOOK-AHEAD OFF)
G91 G28 Z0.
M30
%
```
Features: `G6.2` NURBS curve interpolation with degree and knot vector, `G05.1 Q1/Q0` look-ahead toggle.

---

## Predicate Checklist

| Feature | Test 1 | Test 2 | Test 3 | Test 4 |
|--------|--------|--------|--------|--------|
| Safe start block | ✓ | ✓ | ✓ | ✓ |
| Tilted WP (G68.2 / TRAORI) | ✓ | — | ✓ | — |
| TCPC (G43.4) | — | ✓ | — | — |
| Inverse-time feed (G93) | — | ✓ | — | — |
| NURBS (G6.2) | — | — | — | ✓ |
| Look-ahead (G05.1) | — | — | ✓ | ✓ |
| A/C rotary axis moves | ✓ | ✓ | ✓ | — |
| Cancel block | ✓ | ✓ | ✓ | ✓ |

`MultiAxisPrintToProgramEngine` output must match ≥70% of these feature flags.
