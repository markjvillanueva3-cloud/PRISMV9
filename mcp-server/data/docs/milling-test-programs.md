# Milling Reference Programs — CAMX-MS22 U01

Reference G-code for iterative pipeline refinement. Extracted from Haas Mill Workbook (2022) and Fanuc OM 30i milling examples. PRISM's `PrintToProgramPipelineEngine` is compared against these programs as acceptance targets.

---

## Test 1: O1001 — Simple Rectangular Pocket (Haas Mill Workbook)
```gcode
%
O1001 (POCKET 50x30x5)
G17 G20 G40 G49 G54 G80 G90
G91 G28 Z0.
T01 M06 (1/2 FLAT ENDMILL)
G00 G90 G54 X-1. Y-0.25 S2500 M03
G43 H01 Z1. M08
G01 Z-0.2 F10.
G41 D01 X0.
Y1.0
X2.0
Y0.
X-0.01
G40 G01 X-1.
G00 Z1. M09
G91 G28 Z0.
G28 Y0.
M30
%
```
Part: 50×30 mm pocket, 5 mm deep. Features: `G41 D01` cutter comp, linear profile, `G40` cancel at exit.

---

## Test 2: O1002 — 8-Hole Bolt Circle (Fanuc OM)
```gcode
%
O1002 (BOLT CIRCLE 8 HOLES)
G17 G20 G40 G49 G80 G90
T03 M06 (CENTER DRILL)
G00 G90 G54 X0. Y0. S3000 M03
G43 H03 Z1.0 M08
G81 X1.0 Y0. Z-0.125 R0.1 F8.
X0.707 Y0.707
X0. Y1.0
X-0.707 Y0.707
X-1.0 Y0.
X-0.707 Y-0.707
X0. Y-1.0
X0.707 Y-0.707
G80
G91 G28 Z0.
M30
%
```
Features: 8-position `G81` canned drill cycle on 2.0" PCD. 45° spacing.

---

## Test 3: O1003 — Face Mill + Drill Pattern (Haas)
```gcode
%
O1003 (FACE AND DRILL)
G17 G20 G40 G49 G54 G80 G90
T10 M06 (4-INCH FACE MILL)
G00 G90 G54 X-3.5 Y1.5 S1400 M03
G43 H10 Z1.0 M08
Z0.1
G01 Z0. F20.
X3.5 F60.
Y0.0
X-3.5
Y-1.5
X3.5
G00 Z1.0
T04 M06 (3/8 DRILL)
G00 G90 G54 X-1.5 Y1.0 S2200 M03
G43 H04 Z1.0 M08
G83 X-1.5 Y1.0 Z-0.75 Q0.15 R0.1 F6.
X0. Y1.0
X1.5 Y1.0
X-1.5 Y-1.0
X0. Y-1.0
X1.5 Y-1.0
G80
G28 G91 Z0.
M30
%
```
Features: Face mill raster pass, peck-drill `G83` on 6-hole grid.

---

## Test 4: O1004 — Contour with Cutter Comp + Arc (Fanuc)
```gcode
%
O1004 (CONTOUR G41 + ARCS)
G17 G20 G40 G49 G80 G90
T06 M06 (1/2 ENDMILL)
G00 G90 G54 X-1. Y-1. S3200 M03
G43 H06 Z0.5 M08
G01 Z-0.25 F12.
G41 D06 X0. Y0.
X3.0
G02 X4.0 Y1.0 R1.0
G01 Y3.0
G03 X3.0 Y4.0 R1.0
G01 X0.
Y-0.01
G40 G00 X-1. Y-1.
Z0.5 M09
G91 G28 Z0.
M30
%
```
Features: `G41` cutter comp with `G02/G03` arcs (R format), `G40` cancel on rapid retreat.

---

## Test 5: O1005 — Multi-Feature Plate (5 ops, tool change)
```gcode
%
O1005 (MULTI-FEATURE PLATE)
(T01 FACE MILL, T02 3/4 EM, T03 1/4 EM, T04 SPOT DRILL, T05 1/4 DRILL)
G17 G20 G40 G49 G80 G90
T01 M06
G00 G90 G54 X-2.5 Y0.75 S1200 M03
G43 H01 Z1.0 M08
Z0.05
G01 Z0. F25.
X2.5 F80.
G00 Z1.0
T02 M06
G00 G90 G54 X1.0 Y1.0 S2800 M03
G43 H02 Z1.0 M08
G01 Z-0.15 F8.
G41 D02 X0.25 Y0.25
X1.75
Y1.75
X0.25
Y0.24
G40 G00 X1.0 Y1.0
Z1.0
T04 M06
G00 G90 G54 X-1.25 Y-1.25 S3500 M03
G43 H04 Z1.0 M08
G81 X-1.25 Y-1.25 Z-0.04 R0.1 F6.
X1.25 Y-1.25
X1.25 Y1.25
X-1.25 Y1.25
G80
T05 M06
G00 G90 G54 X-1.25 Y-1.25 S2800 M03
G43 H05 Z1.0 M08
G83 X-1.25 Y-1.25 Z-0.5 Q0.1 R0.1 F5.
X1.25 Y-1.25
X1.25 Y1.25
X-1.25 Y1.25
G80
G91 G28 Z0. M09
M30
%
```
Features: Multi-tool setup (5 tools), face mill + pocket contour + spot + drill pattern.

---

## Predicate Checklist (minimum pipeline match)

| Feature | Test 1 | Test 2 | Test 3 | Test 4 | Test 5 |
|--------|--------|--------|--------|--------|--------|
| G17/G20/G40/G49 safe start | ✓ | ✓ | ✓ | ✓ | ✓ |
| T## M06 tool change | ✓ | ✓ | ✓ | ✓ | ✓ |
| G43 H## length comp | ✓ | ✓ | ✓ | ✓ | ✓ |
| G41/G42 cutter comp | ✓ | — | — | ✓ | ✓ |
| G40 cancel before exit | ✓ | — | — | ✓ | ✓ |
| G81 drilling canned | — | ✓ | — | — | ✓ |
| G83 peck-drill | — | — | ✓ | — | ✓ |
| G02/G03 arcs | — | — | — | ✓ | — |
| M30 program end | ✓ | ✓ | ✓ | ✓ | ✓ |
| Tool count ≥ 2 | — | — | ✓ | — | ✓ |

All 5 programs must produce matching feature-set output from `PrintToProgramPipelineEngine` ≥80% of checklist items.
