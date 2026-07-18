# Mill-Turn Reference Programs — CAMX-MS22 U08

Reference G-code for mill-turn pipeline validation. Mazak Integrex, DMG MORI CTX gamma, Index G200 examples.

---

## Test 1: O8001 — Live Tooling Cross-Drill (Mazak Integrex)
```gcode
%
$1 (CHANNEL 1 — MAIN SPINDLE)
O8001-1 (OD TURN, DRILL 4 HOLES CROSS)
G18 G20 G40 G97 G99
T0100 M06
G50 S3500
M03 S1200
G00 X2.05 Z0.05
G01 X2.0 F0.005
Z-2.0
G00 X2.1 Z0.1
T0404 M06 (LIVE DRILL)
G12.1 (POLAR INTERP ON — C-AXIS)
M13 (LIVE TOOL ON, SPINDLE LOCK)
G97 S2800
G00 X2.2 Z-1.0 C0.
G81 X1.9 Z-1.0 R2.2 F6.
C90.
C180.
C270.
G80
G13.1 (POLAR OFF)
M05
M30
%
```
Features: `G12.1` polar/C-axis mode, `M13` live tool on + spindle lock, 4-position `G81` drill on C.

---

## Test 2: O8002 — Sub-Spindle Transfer (DMG MORI CTX gamma)
```gcode
%
$1
O8002-1 (MAIN SPINDLE OPS + TRANSFER)
G18 G20 G40 G97
T0101 M06
M03 S1500
G00 X2.05 Z0.1
G01 Z-1.5 F0.006
X2.5
G00 Z0.1
(SYNC WITH SUB-SPINDLE — WAIT)
M200 P1 (SIGNAL CHANNEL 2 READY)
WAITM(1,1,2) (WAIT FOR SUB-SPINDLE CAPTURE)
M10 (CHUCK OPEN)
M24 (PART TRANSFER COMPLETE)
M30
$2 (CHANNEL 2 — SUB-SPINDLE)
O8002-2 (SUB-SPINDLE CAPTURE + BACK-OPS)
G18 G97
T1001 M06 (BACK FACE TOOL)
M203 S1500 (SUB-SPINDLE RPM)
G00 X2.5 Z0.1
(CAPTURE SEQUENCE)
WAITM(1,1,2)
M11 (SUB-CHUCK CLOSE)
M204 (SUB-SPINDLE SYNC TO MAIN)
(BACK-OPS AFTER TRANSFER)
G01 X2.0 F0.005
Z-0.5
G00 X2.5
M30
```
Features: Dual-channel program (`$1` / `$2`), sync marker `M200` + `WAITM`, sub-spindle transfer M-codes.

---

## Test 3: O8003 — Swiss-Type Simultaneous Cut (Index G200)
```gcode
%
$1 (MAIN SPINDLE — OD TURNING)
O8003-1
G18 G20 G40
T0101
M03 S3000
G00 X0.25 Z0.05
G01 X0.2 F0.004
Z-1.0
G00 X0.3
WAITM(2,1,2) (WAIT FOR BACK-WORKING COMPLETE)
M30
$2 (BACK-WORKING — CROSS DRILL WHILE OD CUTTING)
O8003-2
G18
T0404
M13 S4000
G12.1
G00 X0.3 Z-0.5 C0.
G81 X0.1 Z-0.5 R0.3 F4.
C180.
G80
G13.1
WAITM(2,1,2)
M30
```
Features: Swiss-type simultaneous OD-turn + cross-drill on live tool, `WAITM(2,...)` barrier sync.

---

## Test 4: O8004 — Mill-Turn B-Axis Milling (Mazak Integrex e-series)
```gcode
%
O8004 (B-AXIS 5-AXIS MILLING ON LATHE)
G18 G20 G40
T0505 M06 (BALL MILL ON MILL TURRET)
G00 B0. (B-AXIS HORIZONTAL)
M203 S6000 (MILL SPINDLE ON)
G00 X1.5 Z-0.5 Y0.
B45. (TILT B-AXIS 45 DEG)
G43.4 H05 (TCPC ON)
G93 (INVERSE TIME FEED)
G01 X1.2 Y0.1 Z-0.3 B45. F200.
X0.9 Y0.2 Z-0.2 B50.
X0.6 Y0.3 Z-0.1 B55.
G94 (CANCEL INVERSE TIME)
G49 (TCPC OFF)
G00 X2.0 B0.
M205 (MILL SPINDLE OFF)
M30
%
```
Features: B-axis tilt for 5-axis milling on mill-turn, TCPC `G43.4`, inverse-time feed `G93`.

---

## Predicate Checklist

| Feature | Test 1 | Test 2 | Test 3 | Test 4 |
|--------|--------|--------|--------|--------|
| Polar/C-axis (G12.1) | ✓ | — | ✓ | — |
| Live tool (M13) | ✓ | — | ✓ | ✓ |
| Multi-channel ($1/$2) | — | ✓ | ✓ | — |
| Sync codes (M200/WAITM) | — | ✓ | ✓ | — |
| Sub-spindle transfer | — | ✓ | — | — |
| B-axis 5-axis | — | — | — | ✓ |
| TCPC (G43.4) | — | — | — | ✓ |
| Inverse time feed (G93) | — | — | — | ✓ |

`MillTurnSwissPipelineEngine` output must match ≥70% of checklist. Multi-channel G-code assembly validated.
