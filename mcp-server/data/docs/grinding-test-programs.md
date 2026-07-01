# Grinding Reference Programs — CAMX-MS22 U03

Reference G-code for grinding pipeline validation. Studer S20/S40 cylindrical, Kellenberger surface, Fanuc grinding controller examples.

---

## Test 1: O3001 — OD Cylindrical Traverse (Studer S20)
```gcode
%
O3001 (OD CYLINDRICAL TRAVERSE GRIND)
G21 G90 G54
M03 S35 (WHEEL RPM)
M08 (COOLANT ON)
G00 X50.5 Z0.0
G01 X50.05 F2.0 (INFEED TO FINISH SIZE + STOCK)
G00 Z-150.0 F100 (RAPID TO CLEAR)
(TRAVERSE LOOP 3 PASSES)
G01 Z0. F50.
X50.02
G01 Z-100. F80.
X50.00
G01 Z0. F80.
(SPARK-OUT 2 PASSES)
G01 Z-100. F40.
Z0. F40.
G00 X60.
M09 M05
M30
%
```
Features: Infeed grind, traverse passes, spark-out cycles, wheel RPM control.

---

## Test 2: O3002 — Plunge Grind with In-Process Gauging (Fanuc)
```gcode
%
O3002 (PLUNGE GRIND + G31 GAUGING)
G21 G90 G54
S40 M03
M08
G00 X50.4 Z-30.
G01 X50.1 F0.5 (ROUGH INFEED)
G04 P1000 (DWELL 1 SEC)
G01 X50.02 F0.1 (FINISH INFEED)
G04 P2000 (DWELL 2 SEC FOR SPARK-OUT)
G31 P99 X50.0 F0.5 (IN-PROCESS GAUGE — STOP ON PROBE SIGNAL)
IF [#5061 LT 50.005] GOTO 100
GOTO 200
N100 G01 X[#5061-0.002] F0.05 (ADAPTIVE SPARK-OUT)
N200 G00 X60.
M09 M05
M30
%
```
Features: `G31` skip on probe signal, adaptive spark-out via macro variable `#5061`, conditional branch.

---

## Test 3: O3003 — Surface Grind with Wheel Dress (Kellenberger)
```gcode
%
O3003 (SURFACE GRIND + DRESS CYCLE)
G21 G90 G54
M03 S2800
M08
(DRESS CYCLE)
T02 M06 (DRESSING DIAMOND)
G00 Z5. X0. Y0.
G01 Z0. F100.
X-50. F200.
Z-0.02
X0. F200.
G00 Z5.
T01 M06 (WHEEL BACK)
(GRIND CYCLE)
G00 X-100. Y0. Z2.
G01 Z0. F1000.
Z-0.005 F50.
Y50. F500.
X-90. F500.
Y0. F500.
X-80. F500.
Y50. F500.
(...raster pattern continues)
G00 Z5.
M09 M05
M30
%
```
Features: Dress cycle before grind, diamond dresser tool change, raster surface grind.

---

## Test 4: O3004 — Creep-Feed Grind (Continuous Dress)
```gcode
%
O3004 (CREEP-FEED WITH CD)
G21 G90 G54
M03 S3000
M08
M50 (CONTINUOUS DRESS ON — CUSTOM M-CODE)
G00 X0. Y0. Z2.
G01 Z0. F500.
Z-2.0 F5. (CREEP-FEED: VERY SLOW, FULL DEPTH)
X200. F15.
G00 Z5.
Y10.
Z-2.0 F5.
X0. F15.
M51 (CD OFF)
G00 Z50.
M09 M05
M30
%
```
Features: Creep-feed (low feed rate, high MRR), continuous dress `M50/M51` custom M-codes.

---

## Predicate Checklist

| Feature | Test 1 | Test 2 | Test 3 | Test 4 |
|--------|--------|--------|--------|--------|
| Wheel RPM (S/M03) | ✓ | ✓ | ✓ | ✓ |
| Infeed | ✓ | ✓ | — | ✓ |
| Spark-out passes | ✓ | ✓ | — | — |
| G31 probe/gauging | — | ✓ | — | — |
| Adaptive spark-out | — | ✓ | — | — |
| Dress cycle | — | — | ✓ | ✓ (CD) |
| Creep-feed | — | — | — | ✓ |
| Cooling M08 | ✓ | ✓ | ✓ | ✓ |

`GrindingProgramAssemblerEngine` output must match ≥80% of checklist items.
