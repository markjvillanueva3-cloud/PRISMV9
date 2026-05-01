# Lathe Test Programs — Reference for Iterative Refinement

## Test 1: O0106 — OD G71/G70 Type I with TNC (Haas Productivity 2022, pg 83)
```gcode
%
O0106
G28
T0202 (Select Tool 2)
G50 S1750
G97 S320 M03
G54 G00 X3. Z0.1 M08
G96 S300
G71 P10 Q20 U.02 W.01 D.1 F.012
N10 G42 G00 X0.5                    (P Block — TNC ON approach)
G01 Z0. F.012
X.6
X0.8 Z-0.1 F.008
Z-0.5
G02 X1.0 Z-0.6 I0.1
G01 X1.5
X2.0 Z-0.85
Z-1.6
X2.3
G03 X2.8 Z-1.85 K-0.25
G01 Z-2.1
N20 G00 G40 X3.0                   (Q Block — TNC OFF departure)
G70 P10 Q20                        (Finishing cycle)
G28
M30
%
```
Part: OD profile Ø0.5→Ø0.6→Ø0.8(taper)→Ø1.0(R0.1)→Ø1.5→Ø2.0(taper)→Ø2.3→Ø2.8(R0.25)
Material: Steel (assumed), Stock: ~3.0" OD
Key features: G42 TNC in P-block, G40 cancel in Q-block, G02/G03 arcs, multi-segment profile

## Test 2: O0107 — Complex OD Profile (Haas Productivity 2022, pg 84)
```gcode
O0107 (O.D. Roughing and Finishing) (FANUC G71 – TYPE I example)
G28
T101 (CNMG 432)
G50 S2000
G97 S400 M03
G54 G00 X6.6 Z0.1 M08
G96 S630
G71 P10 Q20 U0.01 W0.005 D0.15 F0.012
N10 G00 X0.6634                     (P)
G01 X1. Z-0.1683 F0.004
Z-1.
X1.9376
G03 X2.5 Z-1.2812 R0.2812
G01 Z-4.0312
G02 X2.9376 Z-4.25 R0.2188
G01 X3.9634
X4.5 Z-4.5183
Z-10.75
N20 X6.5                            (Q)
G97 S400 M09
G28
T202 (Finish tool)
G50 S2500
G97 S400 M03
G54 G00 X6.6 Z0.1 M08
G96 S730
G70 P10 Q20
G97 S400 M09
G28
M30
%
```
Part: Complex profile with G02/G03 arcs, tapers, steps. Stock ~6.6" OD
Key: CSS S630 rough, S730 finish. Two tools. D0.15 DOC.

## Test 3: O00088 — ID Boring G71 (Haas Productivity 2022, pg 89)
```gcode
O00088 (ID G71 EXTRA)
N1 G53 G00 X0 Z0 T0
N2 T404
N3 G50 S3000
N4 G97 S{rpm} M03
N5 G54 G00 X{id_start} Z0.1 M08
N6 G96 S420
N7 G71 P8 Q18 U-{stock} W{stock} D0.08 F0.010  (MINUS U for ID)
N8 G41 G00 X{start_dia}              (P)
N9 G01 Z0 F0.008
...profile with G02/G03 arcs...
N18 G01 G40 X{end_dia}               (Q)
N19 G0 Z.1
N20 G70 P8 Q18
N21 G97 S1780 M09
N22 G53 G00 X0 Z0 T0
```
Key: U is NEGATIVE for ID boring (material removed inward). G41 for ID TNC.

## Test 4: O00075 — General TNC Example (Haas Lathe Workbook, pg 75-76)
(Already tested — see HANDOFF.md for results)

## What Each Test Validates
| Test | Profile | TNC | Arcs | G71/G70 | ID/OD | Threading | Grooving |
|------|---------|-----|------|---------|-------|-----------|----------|
| O0106 | Multi-step | G42/G40 | G02+G03 | Yes | OD | No | No |
| O0107 | Complex 10pt | No | G02+G03 | Yes | OD | No | No |
| O00088 | ID bore | G41/G40 | G02+G03 | Yes (neg U) | ID | No | No |
| O00075 | Simple | G42/G40 | G02+G03 | Yes | OD | No | Yes(G75) |

## Fixes Needed (from first test)
1. TurningProfileEngine must be wired to generate multi-point contour with G02/G03
2. G41/G42 TNC must be in P-block, G40 in Q-block
3. G71 U must be negative for ID operations
4. Profile feed rates should vary per segment (F.004 for finish, F.008 for taper, F.012 for straight)
5. Approach/departure moves needed for TNC (minimum tool-radius distance)
