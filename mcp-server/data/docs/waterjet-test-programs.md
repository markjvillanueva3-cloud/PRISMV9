# Waterjet Reference Programs — CAMX-MS22 U07

Reference G-code for waterjet pipeline validation. OMAX MAXIEM, Flow Mach 500 examples.

---

## Test 1: O7001 — AWJ Profile Cut (OMAX MAXIEM)
```gcode
%
O7001 (ABRASIVE WATERJET — RECT PROFILE)
G90 G21
M80 (PUMP ON, 60KSI)
M82 (ABRASIVE FEED ON, GARNET 80 MESH)
G00 X0. Y0.
G04 P1.0 (PIERCE DWELL 1 SEC)
G01 X100. F800. (Q3 EDGE QUALITY FEED)
Y60.
X0.
Y0.
M83 (ABRASIVE OFF)
M81 (PUMP OFF)
G00 Z50.
M30
%
```
Features: AWJ pump on/off, abrasive feed on/off, pierce dwell, Q3-speed feed.

---

## Test 2: O7002 — Nested Parts with Quality Levels (Flow Mach 500)
```gcode
%
O7002 (NESTED Q1-Q5 QUALITY)
G90 G21
M80
M82
(PART 1: Q1 SEPARATION CUT — FAST)
G00 X0. Y0.
G04 P1.0
G01 X40. F2400.
Y40.
X0.
Y0.
(PART 2: Q3 STANDARD)
G00 X50. Y0.
G04 P1.0
G01 X90. F1200.
Y40.
X50.
Y0.
(PART 3: Q5 BEST/MIRROR — SLOW)
G00 X100. Y0.
G04 P1.5
G01 X140. F400.
Y40.
X100.
Y0.
M83 M81
G00 Z50.
M30
%
```
Features: Q1 (separation) / Q3 (standard) / Q5 (best) quality levels reflected in feed rate, 3 nested parts.

---

## Test 3: O7003 — 5-Axis Taper Compensation (Flow Dynamic XD)
```gcode
%
O7003 (TAPER COMP WITH A AXIS)
G90 G21
M80
M82
G00 X0. Y0. A0. B0.
G04 P1.0
G43.4 H01 (TCPC ON — TAPER COMP)
G01 X0. Y0. A-2.5 B0. F800. (TILT WRIST 2.5 DEG FOR TAPER COMP)
X80. B-0.8
Y40. A0. B-2.5
X0. A2.5 B0.
Y0. A0. B0.
G49 (CANCEL TCPC)
M83 M81
M30
%
```
Features: A/B wrist axes, `G43.4` taper-compensation TCPC, corner-conscious axis moves.

---

## Test 4: O7004 — Pure Waterjet (Soft Materials)
```gcode
%
O7004 (PURE WJ — FOAM GASKET)
G90 G21
M80 (PUMP ON)
(NO ABRASIVE — PURE WJ)
G00 X0. Y0.
G04 P0.3
G01 X120. F4800.
Y80.
X0.
Y0.
M81 (PUMP OFF)
G00 Z50.
M30
%
```
Features: No abrasive (`M82` omitted), higher feed for soft materials, short pierce dwell.

---

## Predicate Checklist

| Feature | Test 1 | Test 2 | Test 3 | Test 4 |
|--------|--------|--------|--------|--------|
| Pump on (M80) | ✓ | ✓ | ✓ | ✓ |
| Abrasive on (M82) | ✓ | ✓ | ✓ | — |
| Pierce dwell (G04) | ✓ | ✓ | ✓ | ✓ |
| Quality-level feed | ✓ (Q3) | ✓ (Q1/Q3/Q5) | ✓ | — |
| Nesting (≥2 parts) | — | ✓ | — | — |
| 5-axis taper comp (G43.4) | — | — | ✓ | — |
| Pure WJ (no abrasive) | — | — | — | ✓ |

`WaterjetProgramAssemblerEngine` output must match ≥75% of checklist. Nesting via `SheetNestingEngine`.
