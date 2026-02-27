---
name: prism-gcode-reference
description: |
  Universal G-code reference. Cross-controller compatibility tables.
---

| Function | FANUC | Siemens | Haas | Mazak | Heidenhain | Mitsubishi | Okuma |
|----------|-------|---------|------|-------|------------|------------|-------|
| **Rapid** | G00 | G0 | G00 | G00 | L...FMAX | G00 | G00 |
| **Linear** | G01 | G1 | G01 | G01 | L | G01 | G01 |
| **CW Arc** | G02 | G2 | G02 | G02 | DR- | G02 | G02 |
| **CCW Arc** | G03 | G3 | G03 | G03 | DR+ | G03 | G03 |
| **Dwell** | G04 | G4 | G04 | G04 | CYCL DEF 9.0 | G04 | G04 |
| **Helical CW** | G02 Z | G2 Z | G02 Z | G02 Z | -- | G02 Z | G02 Z |
| **Helical CCW** | G03 Z | G3 Z | G03 Z | G03 Z | -- | G03 Z | G03 Z |
| **Spline** | G06.1 | ASPLINE | -- | -- | -- | -- | -- |
| **NURBS** | G06.2 | BSPLINE | -- | G06.2 | -- | G06.2 | G06.2 |

### 2.2 Coordinate System G-Codes

| Function | FANUC | Siemens | Haas | Mazak | Heidenhain | Mitsubishi | Okuma |
|----------|-------|---------|------|-------|------------|------------|-------|
| **Absolute** | G90 | G90 | G90 | G90 | -- (default) | G90 | G90 |
| **Incremental** | G91 | G91 | G91 | G91 | -- (use Δ) | G91 | G91 |
| **Work Offset 1** | G54 | G54 | G54 | G54 | -- | G54 | G54 |
| **Work Offset 2** | G55 | G55 | G55 | G55 | -- | G55 | G55 |
| **Work Offset 3** | G56 | G56 | G56 | G56 | -- | G56 | G56 |
| **Work Offset 4** | G57 | G57 | G57 | G57 | -- | G57 | G57 |
| **Work Offset 5** | G58 | G58 | G58 | G58 | -- | G58 | G58 |
| **Work Offset 6** | G59 | G59 | G59 | G59 | -- | G59 | G59 |
| **Extended WCS** | G54.1 P1-48 | G505-G599 | G154 P1-99 | G54.1 | Datum Table | G54.1 | G15 H1-50 |
| **Local Coord** | G52 | TRANS | G52 | G52 | CYCL DEF 7.0 | G52 | G52 |
| **Machine Coord** | G53 | G53/SUPA | G53 | G53 | -- | G53 | G53 |
| **Polar ON** | G15 | TRANSMIT | G16 | G16 | -- | G16 | G16 |
| **Polar OFF** | G16 | -- | G15 | G15 | -- | G15 | G15 |

### 2.3 Plane Selection

| Function | FANUC | Siemens | Haas | Mazak | Heidenhain | Mitsubishi | Okuma |
|----------|-------|---------|------|-------|------------|------------|-------|
| **XY Plane** | G17 | G17 | G17 | G17 | -- (default) | G17 | G17 |
| **ZX Plane** | G18 | G18 | G18 | G18 | CYCL DEF 19 | G18 | G18 |
| **YZ Plane** | G19 | G19 | G19 | G19 | CYCL DEF 19 | G19 | G19 |

### 2.4 Units and Modes

| Function | FANUC | Siemens | Haas | Mazak | Heidenhain | Mitsubishi | Okuma |
|----------|-------|---------|------|-------|------------|------------|-------|
| **Inch Mode** | G20 | G70 | G20 | G20 | -- | G20 | G20 |
| **Metric Mode** | G21 | G71 | G21 | G21 | -- | G21 | G21 |
| **Feed/Rev** | G95 | G95 | G95 | G95 | -- | G95 | G95 |
| **Feed/Min** | G94 | G94 | G94 | G94 | -- (default) | G94 | G94 |
| **Const Surface Speed** | G96 | G96 | G96 | G96 | -- | G96 | G96 |
| **RPM Mode** | G97 | G97 | G97 | G97 | -- | G97 | G97 |
| **Inverse Time** | G93 | G93 | G93 | G93 | -- | G93 | G93 |

### 2.5 Tool Compensation

| Function | FANUC | Siemens | Haas | Mazak | Heidenhain | Mitsubishi | Okuma |
|----------|-------|---------|------|-------|------------|------------|-------|
| **Comp Cancel** | G40 | G40 | G40 | G40 | R0 | G40 | G40 |
| **Comp Left** | G41 | G41 | G41 | G41 | RL | G41 | G41 |
| **Comp Right** | G42 | G42 | G42 | G42 | RR | G42 | G42 |
| **Comp Left 3D** | G41.2 | G41 | -- | -- | RL | -- | -- |
| **Comp Right 3D** | G42.2 | G42 | -- | -- | RR | -- | -- |
| **TLO Positive** | G43 | G43 | G43 | G43 | TOOL CALL | G43 | G43 |
| **TLO Negative** | G44 | G44 | G44 | G44 | -- | G44 | G44 |
| **TLO Cancel** | G49 | G49 | G49 | G49 | -- | G49 | G49 |
| **Dynamic Comp** | G43.4 | TRAORI | G43.4 | G43.4 | TCPM | G43.4 | G43.4 |

### 2.6 Return/Reference

| Function | FANUC | Siemens | Haas | Mazak | Heidenhain | Mitsubishi | Okuma |
|----------|-------|---------|------|-------|------------|------------|-------|
| **Return to Home** | G28 | G74 | G28 | G28 | -- | G28 | G28 |
| **Return from Home** | G29 | -- | G29 | G29 | -- | G29 | G29 |
| **2nd Reference** | G30 | -- | G30 | G30 | -- | G30 | G30 |
| **Auto Home** | G28.1 | G75 | -- | -- | -- | -- | -- |

### 2.7 Scaling and Rotation

| Function | FANUC | Siemens | Haas | Mazak | Heidenhain | Mitsubishi | Okuma |
|----------|-------|---------|------|-------|------------|------------|-------|
| **Scaling ON** | G51 | SCALE | G51 | G51 | CYCL DEF 26 | G51 | G51 |
| **Scaling OFF** | G50 | SCALE | G50 | G50 | -- | G50 | G50 |
| **Rotation ON** | G68 | ROT | G68 | G68 | CYCL DEF 10 | G68 | G68 |
| **Rotation OFF** | G69 | ROT | G69 | G69 | -- | G69 | G69 |
| **Mirror X** | G51.1 X | MIRROR X | G101 | G51.1 | CYCL DEF 8 | G51.1 | G51 |
| **Mirror Y** | G51.1 Y | MIRROR Y | G101 | G51.1 | CYCL DEF 8 | G51.1 | G51 |

## 4. CANNED CYCLES COMPARISON

### 4.1 Drilling Cycles

| Function | FANUC | Siemens | Haas | Mazak | Heidenhain | Mitsubishi | Okuma |
|----------|-------|---------|------|-------|------------|------------|-------|
| **Spot Drill** | G81 | CYCLE81 | G81 | G81 | CYCL DEF 200 | G81 | G81 |
| **Drill** | G81 | CYCLE82 | G81 | G81 | CYCL DEF 200 | G81 | G81 |
| **Peck Drill** | G83 | CYCLE83 | G83 | G83 | CYCL DEF 203 | G83 | G83 |
| **Deep Peck** | G83 | CYCLE83 | G83 | G83 | CYCL DEF 205 | G83 | G83 |
| **High-Speed Peck** | G73 | CYCLE83 | G73 | G73 | CYCL DEF 203 | G73 | G73 |
| **Dwell Drill** | G82 | CYCLE82 | G82 | G82 | CYCL DEF 201 | G82 | G82 |
| **Counter Bore** | G82 | CYCLE82 | G82 | G82 | CYCL DEF 201 | G82 | G82 |
| **Chip Break** | G73 | CYCLE83 | G73 | G73 | CYCL DEF 203 | G73 | G73 |

### 4.2 Tapping Cycles

| Function | FANUC | Siemens | Haas | Mazak | Heidenhain | Mitsubishi | Okuma |
|----------|-------|---------|------|-------|------------|------------|-------|
| **Tap (RH)** | G84 | CYCLE84 | G84 | G84 | CYCL DEF 206 | G84 | G84 |
| **Tap (LH)** | G74 | CYCLE84 | G74 | G74 | CYCL DEF 207 | G74 | G74 |
| **Rigid Tap** | G84.2 | CYCLE840 | G84 | G84.2 | CYCL DEF 206 | G84 | G84 |
| **Rigid Tap (LH)** | G74.1 | CYCLE840 | G74 | G74.1 | CYCL DEF 207 | G74 | G74 |
| **Float Tap** | G84 | CYCLE84 | G84 | G84 | CYCL DEF 206 | G84 | G84 |

### 4.3 Boring Cycles

| Function | FANUC | Siemens | Haas | Mazak | Heidenhain | Mitsubishi | Okuma |
|----------|-------|---------|------|-------|------------|------------|-------|
| **Boring** | G85 | CYCLE85 | G85 | G85 | CYCL DEF 201 | G85 | G85 |
| **Boring + Dwell** | G86 | CYCLE86 | G86 | G86 | CYCL DEF 201 | G86 | G86 |
| **Back Bore** | G87 | CYCLE87 | G87 | G87 | CYCL DEF 202 | G87 | G87 |
| **Fine Bore** | G76 | CYCLE86 | G76 | G76 | CYCL DEF 201 | G76 | G76 |
| **Bore + Shift** | G76 | CYCLE86 | G76 | G76 | CYCL DEF 201 | G76 | G76 |
| **Bore + Stop** | G88 | CYCLE88 | G88 | G88 | CYCL DEF 201 | G88 | G88 |
| **Bore + Retract** | G89 | CYCLE89 | G89 | G89 | CYCL DEF 201 | G89 | G89 |

### 4.4 Canned Cycle Parameters

#### FANUC Format
```gcode
G83 X__ Y__ Z__ R__ Q__ F__

Parameters:
  X, Y = Hole position
  Z = Final depth (absolute or incremental based on G90/G91)
  R = Reference plane (retract height)
  Q = Peck depth increment
  P = Dwell time (ms) - optional
  F = Feed rate

Example:
  G90 G83 X50.0 Y30.0 Z-25.0 R3.0 Q5.0 F100
```

#### Siemens Format
```gcode
CYCLE83(RTP, RFP, SDIS, DP, DPR, FDEP, FDPR, DAM, DTB, DTS, FRF, VARI, AXN, MDEP, VRT, DTD, DIS1)

Parameters:
  RTP = Retract plane (absolute)
  RFP = Reference plane (absolute)
  SDIS = Safety distance
  DP = Final drilling depth (absolute)
  DPR = Final drilling depth relative to reference
  FDEP = First drilling depth (absolute)
  DAM = Degression
  DTB = Dwell time at bottom
  DTS = Dwell time at start for chip break
  FRF = Feedrate factor for retraction
  VARI = Machining type (0=chip break, 1=deep hole)

Example:
  CYCLE83(50, 0, 1, -30, , -5, , 0.8, 0, 0, 1, 1)
```

#### Heidenhain Format
```gcode
CYCL DEF 203 UNIVERSAL DRILLING
  Q200=2    ;SAFETY DISTANCE
  Q201=-25  ;DRILLING DEPTH
  Q206=150  ;FEED RATE PLUNGING
  Q202=5    ;PLUNGING DEPTH
  Q210=0    ;DWELL AT TOP
  Q203=0    ;SURFACE COORDINATE
  Q204=10   ;2ND SAFETY DISTANCE
  Q212=0    ;DECREMENT
  Q213=3    ;CHIP BREAKING PECK
  Q205=0    ;MIN PLUNGING DEPTH
  Q211=0    ;DWELL AT BOTTOM
  Q395=0    ;DEPTH REFERENCE
  Q239=0    ;PITCH

CYCL CALL
```

### 4.5 Cycle Cancel

| Controller | Cancel Code |
|------------|-------------|
| FANUC | G80 |
| Siemens | MCALL (clears cycle) |
| Haas | G80 |
| Mazak | G80 |
| Heidenhain | -- (no explicit cancel needed) |
| Mitsubishi | G80 |
| Okuma | G80 |

### 4.6 Pattern Cycles (Bolt Circles, Grids)

#### Bolt Circle

| Controller | Method |
|------------|--------|
| FANUC | Manual calculation or macro |
| Siemens | HOLES1 (line), HOLES2 (circle) |
| Haas | G70 (bolt circle), G71 (bolt arc), G72 (grid) |
| Mazak | G34/G35 patterns |
| Heidenhain | CYCL DEF 220-221 (CIRCLE PATTERN) |
| Mitsubishi | G34/G35 or manual |
| Okuma | NAVI pattern |

#### Haas Pattern Example
```gcode
G70 I10.0 J5.0 L8    ; Bolt circle: radius 10, start 5°, 8 holes
G81 Z-0.5 R0.1 F10   ; Drilling cycle
G80                   ; Cancel
```

#### Siemens Pattern Example
```gcode
HOLES2(50, 0, 45, 30, 8)  ; X50 Y0, start 45°, radius 30, 8 holes
CYCLE81(10, 0, 1, -15)    ; Drilling cycle
MCALL                      ; Cancel
```

## 6. SYNTAX CONVERSION EXAMPLES

### 6.1 Simple Linear Move

**Operation:** Move to X100 Y50 at feed 500

| Controller | Code |
|------------|------|
| FANUC | `G01 X100. Y50. F500` |
| Siemens | `G1 X100 Y50 F500` |
| Haas | `G01 X100. Y50. F500` |
| Mazak | `G01 X100. Y50. F500` |
| Heidenhain | `L X+100 Y+50 F500` |
| Mitsubishi | `G01 X100. Y50. F500` |
| Okuma | `G01 X100. Y50. F500` |

### 6.2 Arc Move (CW, Center at X50 Y50, End at X100 Y50)

**Operation:** Clockwise arc

| Controller | Code |
|------------|------|
| FANUC | `G02 X100. Y50. I0. J-50. F300` |
| Siemens | `G2 X100 Y50 I0 J-50 F300` |
| Haas | `G02 X100. Y50. I0. J-50. F300` |
| Mazak | `G02 X100. Y50. I0. J-50. F300` |
| Heidenhain | `CC X+50 Y+50` then `C X+100 Y+50 DR- F300` |
| Mitsubishi | `G02 X100. Y50. I0. J-50. F300` |
| Okuma | `G02 X100. Y50. I0. J-50. F300` |

### 6.3 Tool Change

**Operation:** Change to Tool 5, Length Offset 5

| Controller | Code |
|------------|------|
| FANUC | `T5 M06` then `G43 H5` |
| Siemens | `T5 M6` then `G43` or `D1` |
| Haas | `T5 M06` then `G43 H05` |
| Mazak | `T5 M06` then `G43 H5` |
| Heidenhain | `TOOL CALL 5 Z S3000` |
| Mitsubishi | `T5 M06` then `G43 H5` |
| Okuma | `T05` then `G43 H05` |

## END OF PART 1

**Part 2 (Session S.1.2) will cover:**
- Macro programming by controller
- Probe routines
- High-speed machining codes
- 5-axis codes (RTCP/TCP)
- Universal G-Code Abstraction Layer (Novel)

# PART 2: ADVANCED PROGRAMMING CONCEPTS

## 8. PROBE ROUTINES COMPARISON

### Tool Setting Probe Cycles

| Operation | FANUC | Siemens | Heidenhain | Haas |
|-----------|-------|---------|------------|------|
| **Tool length** | G37 | CYCLE982 | TCH PROBE 481 | G37 |
| **Tool radius** | Custom macro | CYCLE982 | TCH PROBE 482 | Custom macro |
| **Tool breakage** | G37.1 | CYCLE982 | TCH PROBE 483 | G37.1 |
| **Spindle probe** | Custom | CYCLE982 | TCH PROBE 484 | Custom |

### Work Probe Cycles

| Operation | FANUC | Siemens | Heidenhain | Haas |
|-----------|-------|---------|------------|------|
| **Single surface** | G31 | CYCLE978 | TCH PROBE 400 | G31 |
| **Corner (inside)** | Custom | CYCLE977 | TCH PROBE 401 | Custom |
| **Corner (outside)** | Custom | CYCLE977 | TCH PROBE 402 | Custom |
| **Pocket center** | Custom | CYCLE977 | TCH PROBE 421 | Custom |
| **Boss center** | Custom | CYCLE977 | TCH PROBE 422 | Custom |
| **Bore center** | Custom | CYCLE977 | TCH PROBE 412 | Custom |
| **Web center** | Custom | CYCLE977 | TCH PROBE 413 | Custom |
| **Plane (3 point)** | Custom | CYCLE998 | TCH PROBE 403 | Custom |
| **Angle measurement** | Custom | CYCLE998 | TCH PROBE 404 | Custom |

### Probe Cycle Examples

**FANUC G31 (Skip Function):**
```gcode
G31 F100. Z-50.        (Probe down until contact)
#101 = #5063           (Store Z position at contact)
G00 Z[#101 + 5.]       (Retract)
G10 L2 P1 Z[#101]      (Set G54 Z offset)
```

**Siemens CYCLE977 (Rectangular Pocket):**
```gcode
CYCLE977(100, 1, 1, 50, 50, 200, 0, 0, 0, 1, 1, 100, 1, 0)
; Parameters: _RTP, _MESSION, _MA, _SETV1, _SETV2, _FA, ...
```

**Heidenhain TCH PROBE 421 (Measure Pocket):**
```gcode
TCH PROBE 421 MEASURE POCKET Q1=+100 (1ST SETPOINT LENGTH)
Q2=+50 (2ND SETPOINT LENGTH) Q3=+0 (TARGET SETPOINT ANGLE)
Q261=+10 (MEASURING HEIGHT) Q260=+50 (CLEARANCE HEIGHT)
Q272=+1 (MEASURING AXIS 1=X) Q267=+0 (TRAVERSE DIRECTION)
Q325=+0 (ANGLE GEOMETRY) Q159=+0 (REFERENCE POINT)
Q301=+0 (MOVE TO CLEARANCE) Q284=+50 (MAX. DEVIATION 1)
Q285=+50 (MAX. DEVIATION 2) Q303=+1 (MEASURING VALUE TRANSFER)
```

**Haas G31 (Same as FANUC):**
```gcode
G31 F50. Z-2.          (Probe down)
#101 = #5063           (Capture Z)
G00 Z#101 + 0.1        (Retract)
G10 L2 P1 Z#101        (Set WCS)
```

## 10. 5-AXIS PROGRAMMING CODES

### TCP/RTCP Control Comparison

| Feature | FANUC | Siemens | Heidenhain | Mazak | Okuma |
|---------|-------|---------|------------|-------|-------|
| **TCP ON** | G43.4 H1 | TRAORI | M128 / FUNCTION TCPM | G43.4 | G43.4 |
| **TCP OFF** | G49 | TRAFOOF | M129 / FUNCTION RESET | G49 | G49 |
| **Tool Vector** | G43.5 | ORIWKS | FUNCTION TCPM | G43.5 | G43.5 |
| **Smoothing** | G43.4 F | ORIAXES | M124 | G43.4 F | G43.4 F |
| **Tilted Plane** | G68.2 | CYCLE800 | PLANE function | G68.2 | G68.2 |

### FANUC 5-Axis Control

```gcode
; Tool center point control with tool vector
G43.4 H1           ; TCP ON
G68.2 X0 Y0 Z0 I0 J90 K0  ; Tilted plane (90° B rotation)

G01 X100. Y50. Z10. A0. B45. F1000.  ; 5-axis simultaneous
X150.
Y100.
X100.
Y50.

G69                ; Cancel tilted plane
G49                ; TCP OFF
```

### Siemens TRAORI (5-Axis Transformation)

```gcode
; Enable 5-axis transformation
TRAORI(1)          ; Transformation 1 ON
TCARR=1            ; Tool carrier 1 active

G01 X100 Y50 Z10 A0 B45 F1000
X150
Y100
X100
Y50

TRAFOOF            ; Transformation OFF
```

### Heidenhain PLANE Function

```gcode
; Define tilted working plane
PLANE SPATIAL SPA+0 SPB+45 SPC+0 STAY
; SPA=A rotation, SPB=B rotation, SPC=C rotation
; STAY=don't move during plane setup

; Alternative: Vector definition
PLANE VECTOR BX+0 BY+0.707 BZ+0.707 STAY

; Machine with M128 (TCPM)
M128              ; Tool center point management ON
L X+100 Y+50 Z+10 B+45 F1000
L X+150
L Y+100
L X+100
L Y+50
M129              ; TCPM OFF

PLANE RESET       ; Return to standard plane
```

### Mazak 5-Axis Control

```gcode
; Mazak uses FANUC-compatible syntax
G43.4 H1          ; TCP ON

G68.2 X0 Y0 Z0 I0 J90 K0  ; Tilted plane

G01 X100. Y50. Z10. B45. F1000.
X150.
Y100.
X100.
Y50.

G69               ; Cancel tilted plane  
G49               ; TCP OFF
```

### Tilted Plane Definition Comparison

| Method | FANUC | Siemens | Heidenhain |
|--------|-------|---------|------------|
| **Euler Angles** | G68.2 I J K | CYCLE800 | PLANE EULER |
| **2 Points** | N/A | CYCLE800 | PLANE POINTS |
| **3 Points** | N/A | CYCLE800 | PLANE POINTS |
| **Vector** | G68.2 I J K | CYCLE800 | PLANE VECTOR |
| **Projected** | N/A | N/A | PLANE PROJECTED |
| **Spatial** | G68.2 I J K R | CYCLE800 | PLANE SPATIAL |
| **Axis Angles** | G68.2 Q0/1/2 | CYCLE800 | PLANE AXIAL |

## 12. QUICK REFERENCE CARDS (EXTENDED)

### FANUC Quick Card (Extended)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        FANUC QUICK REFERENCE (Extended)                      │
├─────────────────────────────────────────────────────────────────────────────┤
│ MOTION           │ COMPENSATION     │ CYCLES              │ 5-AXIS         │
│ G00 Rapid        │ G40 Cancel       │ G73 High-speed peck │ G43.4 TCP ON   │
│ G01 Linear       │ G41 Left         │ G74 LH Tap          │ G43.5 Vector   │
│ G02 CW arc       │ G42 Right        │ G76 Fine bore       │ G49 TCP OFF    │
│ G03 CCW arc      │ G43 TLO+         │ G80 Cancel          │ G68.2 Tilt     │
│ G05.1 AICC       │ G44 TLO-         │ G81 Drill           │ G69 Cancel     │
│                  │ G49 Cancel TLO   │ G82 Spot/Dwell      │                │
├─────────────────────────────────────────────────────────────────────────────┤
│ COORDINATES      │ SPINDLE          │ G83 Deep peck       │ MACRO          │
│ G54-G59 WCS      │ M03 CW           │ G84 RH Tap          │ #1-#33 Local   │
│ G10 Set offset   │ M04 CCW          │ G85 Bore            │ #100-199 Common│
│ G52 Local offset │ M05 Stop         │ G86 Bore/Stop       │ #500-999 Perm  │
│ G53 Machine      │ M19 Orient       │ G87 Back bore       │ G65 Call       │
│ G92 Set position │ G96 CSS          │ G88 Bore/Dwell      │ G66 Modal      │
│                  │ G97 RPM          │ G89 Bore/Dwell/Feed │ G67 Cancel     │
├─────────────────────────────────────────────────────────────────────────────┤
│ COOLANT          │ PLANE            │ MODE                │ PROGRAM        │
│ M07 Mist         │ G17 XY           │ G90 Absolute        │ M00 Stop       │
│ M08 Flood        │ G18 XZ           │ G91 Incremental     │ M01 Optional   │
│ M09 Off          │ G19 YZ           │ G94 Per minute      │ M30 End/Reset  │
│ M88 Thru-spindle │                  │ G95 Per revolution  │ M98 Subprogram │
│                  │                  │ G98 Initial return  │ M99 Return     │
│                  │                  │ G99 R-plane return  │                │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Siemens Quick Card

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      SIEMENS SINUMERIK QUICK REFERENCE                       │
├─────────────────────────────────────────────────────────────────────────────┤
│ CYCLES (Drilling) │ CYCLES (Milling) │ CYCLES (Turning)   │ FRAMES         │
│ CYCLE81 Drill     │ POCKET1 Rect     │ CYCLE93 Undercut   │ TRANS X Y Z    │
│ CYCLE82 Dwell     │ POCKET2 Circ     │ CYCLE94 Undercut   │ ROT X Y Z      │
│ CYCLE83 Deep      │ POCKET3 Rect     │ CYCLE95 Stock rem  │ SCALE X Y Z    │
│ CYCLE84 Tap       │ POCKET4 Circ     │ CYCLE96 Thread     │ MIRROR X Y Z   │
│ CYCLE85 Bore      │ SLOT1 Long       │ CYCLE97 Thread     │ ATRANS (add)   │
│ CYCLE86 Bore/dwell│ SLOT2 Circ       │ CYCLE98 Thread     │ AROT (add)     │
│ CYCLE87 Bore/stop │ LONGHOLE         │                    │                │
│ CYCLE88 Bore/dwel │ CYCLE72 Contour  │                    │                │
│ CYCLE89 Bore/feed │                  │                    │                │
├─────────────────────────────────────────────────────────────────────────────┤
│ PATTERN           │ MEASUREMENT      │ 5-AXIS             │ HSM            │
│ HOLES1 Line       │ CYCLE977 Rect    │ TRAORI Transform   │ CYCLE832       │
│ HOLES2 Grid       │ CYCLE978 Groove  │ TRAFOOF Cancel     │ FIFOCTRL       │
│ MCALL Modal       │ CYCLE979 Inside  │ ORIWKS Work orient │ COMPON/COMPOF  │
│ MCALL Cancel      │ CYCLE998 Plane   │ ORIAXES Axis       │                │
├─────────────────────────────────────────────────────────────────────────────┤
│ VARIABLES         │ MATH             │ CONTROL            │ CALL           │
│ R0-R299 R-params  │ SIN COS TAN      │ IF...ELSE...ENDIF  │ CALL subprog   │
│ $P_ Program       │ ASIN ACOS ATAN   │ CASE...OF...DEFAULT│ CALL block     │
│ $S_ Setting       │ SQRT ABS         │ FOR...TO...ENDFOR  │ EXTCALL        │
│ $A_ Active        │ TRUNC ROUND      │ WHILE...ENDWHILE   │ PCALL          │
│ DEF define var    │ POT EXP LN       │ REPEAT...UNTIL     │                │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Heidenhain Quick Card

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       HEIDENHAIN TNC QUICK REFERENCE                         │
├─────────────────────────────────────────────────────────────────────────────┤
│ PATH FUNCTIONS    │ APPROACH/DEPART  │ CYCLES 200-series  │ CYCLES 400+    │
│ L Linear          │ APPR LN Line     │ 200 Drilling       │ 400 Probe edge │
│ C Arc w/center    │ APPR LT Tangent  │ 201 Reaming        │ 401 Probe 2x   │
│ CR Arc w/radius   │ APPR LCT Tang    │ 202 Boring         │ 402 Probe ext  │
│ CT Tangent arc    │ APPR CT Circle   │ 203 Universal drill│ 403 Probe int  │
│ CC Circle center  │ DEP LN Line      │ 204 Back spot face │ 404 Probe slot │
│ LP Linear polar   │ DEP LT Tangent   │ 205 Universal peck │ 405 Probe circ │
│ CP Arc polar      │ DEP LCT Tang     │ 206 Tap            │ 410 Datum      │
│ CTP Tang polar    │ DEP CT Circle    │ 207 Rigid tap      │ 411 Circle     │
│                   │                  │ 208 Bore milling   │ 412 Boss       │
│                   │                  │ 209 Thread tapping │ 420 Plane      │
├─────────────────────────────────────────────────────────────────────────────┤
│ Q-PARAMETERS      │ MATH FUNCTIONS   │ CYCLES 230-260     │ 5-AXIS         │
│ Q0-Q99 Local      │ FN 0: = assign   │ 230 Finish pocket  │ PLANE SPATIAL  │
│ Q100-Q199 Special │ FN 1: + add      │ 232 Face milling   │ PLANE EULER    │
│ QL Local          │ FN 2: - subtract │ 240 Centered groove│ PLANE VECTOR   │
│ QS String         │ FN 3: * multiply │ 241 Single groove  │ PLANE POINTS   │
│ QR Parameter      │ FN 4: / divide   │ 251 Rect pocket    │ PLANE AXIAL    │
│                   │ FN 5: SIN        │ 252 Circ pocket    │ M128 TCPM ON   │
│                   │ FN 6: COS        │ 253 Groove milling │ M129 TCPM OFF  │
│                   │ FN 7: TAN        │ 254 Round groove   │ FUNCTION TCPM  │
│                   │ FN 8: SQRT       │ 256 Rect stud      │                │
│                   │ FN 9: IF...GOTO  │ 257 Circ stud      │                │
├─────────────────────────────────────────────────────────────────────────────┤
│ CONTOUR CYCLES    │ SPECIAL          │ CONTROL            │ OPTIONS        │
│ SL I Contour      │ CYCL DEF 7 Datum │ FN 9: IF GOTO      │ M124 Smoothing │
│ SL II Pocket      │ CYCL DEF 10 Rot  │ FN 10: IF NE GOTO  │ CYCL DEF 32 Tol│
│ CONTOUR DEF       │ CYCL DEF 11 Scale│ CALL LBL           │ AFC Feed ctrl  │
│ SL CONTOUR        │ CYCL DEF 26 Scale│ CALL LBL REP       │ DCM Collision  │
│ OCM              │ CYCL DEF 32 Toler│ LBL 0              │ KinematicsOpt  │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 14. CONTROLLER CAPABILITY MATRIX

### Feature Support by Controller

| Feature | FANUC | Siemens | Heidenhain | Haas | Mazak | Okuma | Mitsubishi |
|---------|:-----:|:-------:|:----------:|:----:|:-----:|:-----:|:----------:|
| **Basic G-code** | ✓ | ✓ | ✗ | ✓ | ✓ | ✓ | ✓ |
| **Dialog/Convers** | ✗ | Shop | ✓ | VPS | Mazatrol | OSP | ✗ |
| **Macro/Variables** | ✓ | ✓ | Q-param | ✓ | ✓ | ✓ | ✓ |
| **Subprograms** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Canned cycles** | ✓ | CYCLE | CYCL | ✓ | ✓ | ✓ | ✓ |
| **Probing cycles** | ✗/Opt | ✓ | ✓ | ✗/Opt | ✓ | ✓ | ✗/Opt |
| **5-axis TCP** | ✓ | ✓ | ✓ | ✗/Opt | ✓ | ✓ | ✓ |
| **NURBS** | ✓ | ✓ | ✗ | ✗ | ✓ | ✓ | ✓ |
| **Look-ahead** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **AI contour** | ✓ | ✓ | ✓ | ✗ | ✓ | ✓ | ✓ |
| **Collision detect** | ✗/Opt | ✓ | ✓ | ✗ | ✓ | ✓ | ✗/Opt |
| **Adaptive feed** | ✗ | ✓ | ✓ | ✗ | ✓ | ✓ | ✗ |

Legend: ✓ = Standard, ✗ = Not available, ✗/Opt = Optional, Shop/VPS/etc = Conversational mode name

## RELATED SKILLS

- **prism-fanuc-programming** - Complete FANUC Macro B, all alarms, examples
- **prism-siemens-programming** - Complete Siemens cycles, all alarms, examples
- **prism-heidenhain-programming** - Complete TNC dialog, all alarms, examples
- **prism-haas-programming** - Haas-specific features, all alarms
- **prism-mazak-programming** - Mazatrol + EIA, all alarms
- **prism-okuma-programming** - OSP programming, all alarms
- **prism-mitsubishi-programming** - MELDAS features, all alarms

## 7. MACRO PROGRAMMING OVERVIEW

### 7.1 Macro Capabilities by Controller

| Controller | Macro System | Variables | Custom G-Codes | Branching | Loops |
|------------|--------------|-----------|----------------|-----------|-------|
| **FANUC** | Macro B | #1-#33 local, #100-199 common, #500-999 permanent | G65, G66 call | IF/GOTO, IF/THEN | WHILE/DO |
| **Siemens** | NC Programming | R0-R299, DEF variables | CYCLE/PROC | IF/ELSE/ENDIF | WHILE, FOR, LOOP |
| **Heidenhain** | Q-Parameters | Q0-Q1999, QL local, QS string | CALL LBL | FN 9-12 | CALL LBL REP |
| **Haas** | Macro B (subset) | #1-#33, #100-199, #500-699 | G65 | IF/GOTO | WHILE/DO |
| **Mazak** | Custom Macro II | #1-#33, #100-199, #500-999 | G65 | IF/GOTO | WHILE/DO |
| **Okuma** | User Task 2 | VC1-VC999 | CALL | IF-THEN-ELSE | WHILE-DO |
| **Mitsubishi** | User Macro | #1-#33, #100-199, #500-999 | G65 | IF/GOTO | WHILE/END |

### 7.2 Variable Types Comparison

```
FANUC MACRO B VARIABLES:
├── #0          → Null (always empty, read-only)
├── #1-#33      → Local (G65 arguments A-Z)
├── #100-#199   → Common (shared, volatile)
├── #500-#999   → Permanent (saved through power cycle)
├── #1000+      → System variables (read machine state)
│   ├── #1000-#1015  → Tool offsets
│   ├── #2001-#2400  → Tool compensation
│   ├── #3000        → Alarm generation
│   ├── #4001-#4021  → Modal G-codes
│   ├── #5001-#5006  → Current position
│   └── #5021-#5026  → Machine position

SIEMENS VARIABLES:
├── R0-R299     → R-parameters (persistent)
├── DEF INT     → User integer variables
├── DEF REAL    → User real variables  
├── DEF STRING  → User string variables
├── DEF AXIS    → Axis variables
├── $P_...      → Program variables (read-only)
├── $S_...      → Setting data
├── $M_...      → Machine data
└── $A_...      → Active data

HEIDENHAIN Q-PARAMETERS:
├── Q0-Q99      → Free parameters (global)
├── Q100-Q199   → Used by cycles (caution!)
├── Q1800-Q1999 → Preset tables
├── QL0-QL99    → Local parameters
├── QR0-QR99    → Preselected parameters
└── QS0-QS99    → String parameters
```

### 7.3 Arithmetic Operations

| Operation | FANUC | Siemens | Heidenhain |
|-----------|-------|---------|------------|
| Add | #1=#2+#3 | R1=R2+R3 | Q1 = Q2 + Q3 |
| Subtract | #1=#2-#3 | R1=R2-R3 | Q1 = Q2 - Q3 |
| Multiply | #1=#2*#3 | R1=R2*R3 | Q1 = Q2 * Q3 |
| Divide | #1=#2/#3 | R1=R2/R3 | Q1 = Q2 / Q3 |
| Sine | #1=SIN[#2] | R1=SIN(R2) | Q1 = SIN Q2 |
| Cosine | #1=COS[#2] | R1=COS(R2) | Q1 = COS Q2 |
| Tangent | #1=TAN[#2] | R1=TAN(R2) | Q1 = TAN Q2 |
| Arc Tan | #1=ATAN[#2]/[#3] | R1=ATAN2(R2,R3) | Q1 = ATAN Q2 |
| Square Root | #1=SQRT[#2] | R1=SQRT(R2) | Q1 = SQRT Q2 |
| Absolute | #1=ABS[#2] | R1=ABS(R2) | Q1 = ABS Q2 |
| Round | #1=ROUND[#2] | R1=ROUND(R2) | Q1 = INT Q2 + 0.5 |
| Truncate | #1=FIX[#2] | R1=TRUNC(R2) | Q1 = INT Q2 |
| Modulo | #1=#2-#3*FIX[#2/#3] | R1=R2 MOD R3 | Q1 = Q2 MOD Q3 |
| Power | #1=#2**#3 (^) | R1=R2**R3 | N/A (use LN/EXP) |
| Natural Log | #1=LN[#2] | R1=LN(R2) | Q1 = LN Q2 |
| Exponential | #1=EXP[#2] | R1=EXP(R2) | Q1 = EXP Q2 |

### 7.4 Conditional Logic

```
FANUC IF/GOTO:
IF [#1 EQ 0] GOTO 100         ; Jump to N100 if #1 equals 0
IF [#1 NE 0] GOTO 200         ; Jump to N200 if #1 not equal 0
IF [#1 GT #2] GOTO 300        ; Jump to N300 if #1 > #2
IF [#1 LT #2] GOTO 400        ; Jump to N400 if #1 < #2
IF [#1 GE #2] GOTO 500        ; Jump to N500 if #1 >= #2
IF [#1 LE #2] GOTO 600        ; Jump to N600 if #1 <= #2
;
; Compound conditions:
IF [[#1 EQ 0] AND [#2 GT 5]] GOTO 100
IF [[#1 EQ 0] OR [#2 EQ 0]] GOTO 200

FANUC IF/THEN:
IF [#1 EQ 0] THEN #2=100      ; Single statement
IF [#1 GT 0] THEN #2=1 ELSE #2=0  ; (NOT on all controls)

SIEMENS IF/ELSE/ENDIF:
IF R1 == 0
  R2 = 100
  MSG("Value is zero")
ELSE
  R2 = R1 * 2
  MSG("Value doubled")
ENDIF

HEIDENHAIN FN FUNCTIONS:
FN 9: IF Q1 EQ Q2 GOTO LBL 10    ; Equal
FN 10: IF Q1 NE Q2 GOTO LBL 20   ; Not equal
FN 11: IF Q1 GT Q2 GOTO LBL 30   ; Greater than
FN 12: IF Q1 LT Q2 GOTO LBL 40   ; Less than
```

### 7.5 Loop Structures

```
FANUC WHILE/DO:
#1 = 0                        ; Initialize counter
WHILE [#1 LT 10] DO 1         ; While #1 < 10
  G81 X[#1*25] Y0 Z-10 R2 F200
  #1 = #1 + 1                 ; Increment
END 1                         ; End of loop

; Nested loops:
#1 = 0
WHILE [#1 LT 5] DO 1          ; Outer loop (rows)
  #2 = 0
  WHILE [#2 LT 5] DO 2        ; Inner loop (columns)
    G81 X[#2*25] Y[#1*25] Z-10 R2 F200
    #2 = #2 + 1
  END 2
  #1 = #1 + 1
END 1

SIEMENS LOOPS:
; FOR loop:
FOR R1 = 0 TO 9
  HOLES2(R1*25, 0, -10, 2, 200)
ENDFOR

; WHILE loop:
R1 = 0
WHILE R1 < 10
  X=R1*25 Y0
  CYCLE81(100, 0, 1, -10)
  R1 = R1 + 1
ENDWHILE

; LOOP/ENDLOOP (infinite, use EXITLOOP):
LOOP
  ; Process
  IF condition EXITLOOP
ENDLOOP

HEIDENHAIN LOOPS:
; Repeat with counter:
LBL 1
  ; Drilling operation
LBL 0
CALL LBL 1 REP 10             ; Repeat 10 times

; Manual counter loop:
Q1 = 0
LBL 1
  CYCL CALL
  Q1 = Q1 + 1
  FN 11: IF Q1 LT 10 GOTO LBL 1
```

## 9. HIGH-SPEED MACHINING CODES

### 9.1 HSM Feature Comparison

| Feature | FANUC | Siemens | Heidenhain | Haas | Mazak |
|---------|-------|---------|------------|------|-------|
| **Look-Ahead** | G08 P1 | FFWON/FFWOF | M120 Lxx | G187 | G08 P1 |
| **Contour Smoothing** | G05.1 Q1 | COMPON/COMPOF | M124 | G187 Px | G05 P10000 |
| **NURBS** | G06.2 | BSPLINE | N/A | N/A | N/A |
| **Tolerance Control** | G05.1 Q1 Rx | CTOL | CYCLE32 | G187 Ex | G05.1 Q1 |
| **Jerk Control** | G05.1 Q1 | SOFT/BRISK | M120 | G187 | G05.1 |
| **AI Contour** | G05.1 Q1 | CYCLE832 | M124 | G187 P3 | G05.1 Q1 |

### 9.2 FANUC High-Speed/High-Precision

```gcode
; FANUC AICC (AI Contour Control) / AIAPC (AI Advanced Preview Control)

; Basic nano-smoothing:
G05.1 Q1 R10.           ; Enable with 10 micron tolerance
; ...machining code...
G05.1 Q0                ; Disable

; AI Contour Control I:
G05 P10000              ; Enable AICC (older syntax)
; ...machining code...
G05 P0                  ; Disable

; High-precision contour (G08):
G08 P1                  ; Enable look-ahead
G01 X... Y... F5000
G08 P0                  ; Disable

; Combined for best results:
G08 P1                  ; Look-ahead ON
G05.1 Q1 R5.            ; Nano smoothing, 5 micron tolerance
G64                     ; Continuous mode
; High-speed machining operations
G05.1 Q0
G08 P0

; TOLERANCE SETTINGS:
; G05.1 Q1 Rx where x = tolerance in work units
; R0.001 = 0.001mm (tight, slower)
; R0.01  = 0.01mm (medium)
; R0.1   = 0.1mm (loose, faster)
```

### 9.3 Siemens High-Speed Settings

```gcode
; SIEMENS SINUMERIK HIGH-SPEED MACHINING

; Compressor function:
COMPON                   ; Enable compressor
COMPCURV                 ; Spline compressor
COMPCAD                  ; CAD-optimized compressor
COMPOF                   ; Disable compressor

; Tolerance programming:
CTOL=0.01               ; Contour tolerance 0.01mm
OTOL=0.01               ; Orientation tolerance
ATOL=0.1                ; Angle tolerance

; Feed forward:
FFWON                   ; Feed forward ON (faster)
FFWOF                   ; Feed forward OFF

; Jerk limiting:
SOFT                    ; Soft acceleration (smooth)
BRISK                   ; Brisk acceleration (fast)
DRIVE                   ; Max drive dynamics

; CYCLE832 - High-speed settings macro:
CYCLE832(0.01, , 1)     ; Tolerance, , mode
; Mode: 0=finishing, 1=semi-finish, 2=roughing

; Complete HSM setup:
CYCLE832(0.01, , 0)     ; Set finishing mode
FFWON                   ; Feed forward
SOFT                    ; Smooth jerk
G64                     ; Continuous path
G01 X... Y... F10000
; Machining...
CYCLE832()              ; Reset to defaults
```

### 9.4 Heidenhain High-Speed Settings

```
; HEIDENHAIN TNC HIGH-SPEED MACHINING

; CYCLE32 - Tolerance definition
CYCL DEF 32.0 TOLERANCE
CYCL DEF 32.1 T0.05      ; Path tolerance 0.05mm
CYCL DEF 32.2 T0.02      ; Rotary axis tolerance 0.02°
CYCL DEF 32.3 HSC-MODE:1 ; 0=off, 1=finish, 2=rough

; M-codes for HSM:
M120 L20                ; Look-ahead 20 blocks
M124                    ; Smoothing ON (filter)

; Filter settings (iTNC):
FUNCTION TCPM F100 PATHCTRL AXIS POS VECTOR
; F100 = Maximum path deviation 100µm

; Complete HSM setup:
CYCL DEF 32.0 TOLERANCE
CYCL DEF 32.1 T0.05
CYCL DEF 32.2 HSC-MODE:1
M120 L50                ; 50 block look-ahead
;
BLK FORM 0.1 Z...       ; Workpiece definition
;
TOOL CALL 1 Z S15000    ; High spindle speed
;
L X+0 Y+0 Z+5 R0 FMAX M3
; High-speed machining moves...
;
CYCL DEF 32.0 TOLERANCE
CYCL DEF 32.1           ; Reset tolerance
```

### 9.5 Haas High-Speed Settings

```gcode
; HAAS NGC HIGH-SPEED MACHINING

; G187 - Smoothness setting
G187 P1 E0.001          ; P=mode, E=tolerance
; P1 = Rough (fastest, least accurate)
; P2 = Medium
; P3 = Finish (slowest, most accurate)
; E = accuracy (in inches or mm)

; Examples:
G187 P3 E0.0002         ; Finish mode, 0.0002" tolerance
G187 P1 E0.005          ; Rough mode, 0.005" tolerance

; Look-ahead (automatic with G187)
; Haas uses 80-block look-ahead automatically

; Minimum arc radius:
; Setting 85 controls minimum radius for high-speed

; Complete HSM setup:
G90 G54
G187 P3 E0.0004         ; Finish smoothing
G00 X0 Y0
G43 H1 Z1. M08
G01 Z-0.5 F50.
; High-speed toolpath...
G187 P2                 ; Reset to medium
```

## 11. UNIVERSAL G-CODE ABSTRACTION LAYER (NOVEL ALGORITHM)

### 11.1 Concept Overview

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                    UNIVERSAL G-CODE ABSTRACTION LAYER (UGAL)                            │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│   PURPOSE: Write once in controller-agnostic syntax → output to ANY controller          │
│                                                                                         │
│   APPROACH: Based on compiler theory (MIT 6.035) + Manufacturing domain knowledge       │
│                                                                                         │
│   ┌──────────────┐     ┌──────────────┐     ┌──────────────┐                            │
│   │ UGAL Source  │ ──► │   PARSER     │ ──► │    AST       │                            │
│   │ (Abstract)   │     │ (Tokenizer)  │     │ (Tree)       │                            │
│   └──────────────┘     └──────────────┘     └──────────────┘                            │
│                                                   │                                     │
│                                                   ▼                                     │
│   ┌──────────────┐     ┌──────────────┐     ┌──────────────┐                            │
│   │ Target Code  │ ◄── │ CODE GEN     │ ◄── │ OPTIMIZER    │                            │
│   │ (Controller) │     │ (Templates)  │     │ (Optional)   │                            │
│   └──────────────┘     └──────────────┘     └──────────────┘                            │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

### 11.2 UGAL Syntax Definition

```javascript
// UGAL ABSTRACT SYNTAX (JSON-based internal representation)

// Motion Commands:
{
  "type": "MOTION",
  "mode": "LINEAR",           // LINEAR, ARC_CW, ARC_CCW, RAPID
  "endpoint": { "x": 100, "y": 50, "z": -10 },
  "feed": 500,
  "feedUnit": "MM_MIN"        // MM_MIN, MM_REV, INCH_MIN, INCH_REV
}

{
  "type": "MOTION",
  "mode": "ARC_CW",
  "endpoint": { "x": 100, "y": 100, "z": -10 },
  "center": { "i": 0, "j": 50 },    // Incremental center
  "feed": 300
}

// Tool Commands:
{
  "type": "TOOL_CHANGE",
  "toolNumber": 5,
  "toolName": "10MM_ENDMILL"
}

{
  "type": "TOOL_OFFSET",
  "offsetNumber": 5,
  "offsetType": "LENGTH"      // LENGTH, RADIUS_LEFT, RADIUS_RIGHT
}

// Spindle Commands:
{
  "type": "SPINDLE",
  "speed": 8000,
  "direction": "CW",          // CW, CCW, STOP
  "mode": "RPM"               // RPM, CSS
}

// Canned Cycles (abstracted):
{
  "type": "CANNED_CYCLE",
  "cycleType": "DRILL_PECK",
  "params": {
    "x": 50, "y": 50,
    "z_final": -25,
    "z_retract": 2,
    "peck_depth": 5,
    "feed": 200
  }
}

// Probe Cycles:
{
  "type": "PROBE",
  "probeType": "SINGLE_SURFACE",
  "axis": "Z",
  "direction": -1,
  "feed": 100,
  "resultVariable": "PROBE_Z"
}

// Work Offset:
{
  "type": "WORK_OFFSET",
  "system": 1,                // 1-6 for G54-G59, 7+ for extended
  "set": { "z": 0 }           // Optional: set value
}

// Program Control:
{
  "type": "SUBPROGRAM_CALL",
  "program": "O1001",
  "arguments": { "A": 10, "B": 20 }
}
```

### 11.3 Code Generation Templates

```javascript
// UGAL → Controller Code Generation

const UGAL_TEMPLATES = {
  
  // LINEAR MOTION
  "MOTION.LINEAR": {
    "FANUC":      (m) => `G01 X${m.endpoint.x} Y${m.endpoint.y} Z${m.endpoint.z} F${m.feed}`,
    "SIEMENS":    (m) => `G1 X${m.endpoint.x} Y${m.endpoint.y} Z${m.endpoint.z} F${m.feed}`,
    "HEIDENHAIN": (m) => `L X${fmt(m.endpoint.x)} Y${fmt(m.endpoint.y)} Z${fmt(m.endpoint.z)} F${m.feed}`,
    "HAAS":       (m) => `G01 X${m.endpoint.x} Y${m.endpoint.y} Z${m.endpoint.z} F${m.feed}`,
    "MAZAK":      (m) => `G01 X${m.endpoint.x} Y${m.endpoint.y} Z${m.endpoint.z} F${m.feed}`,
    "OKUMA":      (m) => `G01 X${m.endpoint.x} Y${m.endpoint.y} Z${m.endpoint.z} F${m.feed}`,
    "MITSUBISHI": (m) => `G01 X${m.endpoint.x} Y${m.endpoint.y} Z${m.endpoint.z} F${m.feed}`
  },
  
  // ARC MOTION (CW)
  "MOTION.ARC_CW": {
    "FANUC":      (m) => `G02 X${m.endpoint.x} Y${m.endpoint.y} I${m.center.i} J${m.center.j} F${m.feed}`,
    "SIEMENS":    (m) => `G2 X${m.endpoint.x} Y${m.endpoint.y} I${m.center.i} J${m.center.j} F${m.feed}`,
    "HEIDENHAIN": (m) => `CC X${fmt(m.center.i)} Y${fmt(m.center.j)}\nC X${fmt(m.endpoint.x)} Y${fmt(m.endpoint.y)} DR- F${m.feed}`,
    "HAAS":       (m) => `G02 X${m.endpoint.x} Y${m.endpoint.y} I${m.center.i} J${m.center.j} F${m.feed}`,
    "MAZAK":      (m) => `G02 X${m.endpoint.x} Y${m.endpoint.y} I${m.center.i} J${m.center.j} F${m.feed}`,
    "OKUMA":      (m) => `G02 X${m.endpoint.x} Y${m.endpoint.y} I${m.center.i} J${m.center.j} F${m.feed}`,
    "MITSUBISHI": (m) => `G02 X${m.endpoint.x} Y${m.endpoint.y} I${m.center.i} J${m.center.j} F${m.feed}`
  },
  
  // TOOL CHANGE
  "TOOL_CHANGE": {
    "FANUC":      (t) => `T${pad(t.toolNumber,2)} M06`,
    "SIEMENS":    (t) => `T="${t.toolName || t.toolNumber}"\nM6`,
    "HEIDENHAIN": (t) => `TOOL CALL ${t.toolNumber} Z S1`,
    "HAAS":       (t) => `T${t.toolNumber} M06`,
    "MAZAK":      (t) => `T${pad(t.toolNumber,4)}\nM06`,
    "OKUMA":      (t) => `T${pad(t.toolNumber,4)}`,
    "MITSUBISHI": (t) => `T${t.toolNumber}\nM06`
  },
  
  // PECK DRILLING CYCLE
  "CANNED_CYCLE.DRILL_PECK": {
    "FANUC": (c) => [
      `G83 X${c.params.x} Y${c.params.y} Z${c.params.z_final}`,
      `R${c.params.z_retract} Q${c.params.peck_depth} F${c.params.feed}`
    ].join(' '),
    "SIEMENS": (c) => [
      `CYCLE83(${c.params.z_retract}, 0, 1, ${c.params.z_final},`,
      `${c.params.peck_depth}, 0, 0, ${c.params.feed}, 0, 0, 0, 0, 0)`
    ].join(' '),
    "HEIDENHAIN": (c) => [
      `CYCL DEF 203 UNIVERSAL DRILLING`,
      `Q200=${c.params.z_retract}    ;SET-UP CLEARANCE`,
      `Q201=${Math.abs(c.params.z_final)} ;DEPTH`,
      `Q206=${c.params.feed}         ;FEED RATE PLUNGING`,
      `Q202=${c.params.peck_depth}   ;PLUNGING DEPTH`,
      `Q210=0                        ;DWELL AT TOP`,
      `Q203=0                        ;SURFACE COORDINATE`,
      `Q204=50                       ;2ND SET-UP CLEARANCE`,
      `Q212=0                        ;DECREMENT`,
      `Q213=${c.params.peck_depth}   ;BREAKS`
    ].join('\n'),
    "HAAS": (c) => [
      `G83 X${c.params.x} Y${c.params.y} Z${c.params.z_final}`,
      `R${c.params.z_retract} Q${c.params.peck_depth} F${c.params.feed}`
    ].join(' ')
  },
  
  // 5-AXIS TCP ENABLE
  "TCP_ENABLE": {
    "FANUC":      (t) => `G43.4 H${t.offsetNumber}`,
    "SIEMENS":    () => `TRAORI`,
    "HEIDENHAIN": () => `FUNCTION TCPM F TCP AXIS POS PATHCTRL AXIS`,
    "HAAS":       (t) => `G43.4 H${t.offsetNumber}`,
    "MAZAK":      (t) => `G43.4 H${t.offsetNumber}`,
    "DMG":        (t) => `G43.4 H${t.offsetNumber}`
  },
  
  // 5-AXIS TCP DISABLE
  "TCP_DISABLE": {
    "FANUC":      () => `G49`,
    "SIEMENS":    () => `TRAFOOF`,
    "HEIDENHAIN": () => `FUNCTION RESET TCPM`,
    "HAAS":       () => `G49`,
    "MAZAK":      () => `G49`,
    "DMG":        () => `G49`
  }
};

// Helper functions
function pad(num, len) {
  return String(num).padStart(len, '0');
}

function fmt(val) {
  return (val >= 0 ? '+' : '') + val.toFixed(3);
}
```

### 11.4 UGAL Converter Implementation

```javascript
// PRISM UGAL CONVERTER ENGINE

class UGALConverter {
  constructor(targetController) {
    this.target = targetController.toUpperCase();
    this.templates = UGAL_TEMPLATES;
    this.output = [];
  }
  
  convert(ugalProgram) {
    this.output = [];
    
    // Add program header
    this.output.push(this.generateHeader(ugalProgram.metadata));
    
    // Process each command
    for (const command of ugalProgram.commands) {
      const code = this.generateCode(command);
      if (code) this.output.push(code);
    }
    
    // Add program footer
    this.output.push(this.generateFooter());
    
    return this.output.join('\n');
  }
  
  generateCode(command) {
    const templateKey = command.mode 
      ? `${command.type}.${command.mode}` 
      : command.type;
      
    const template = this.templates[templateKey];
    
    if (!template) {
      console.warn(`No template for: ${templateKey}`);
      return `; WARNING: Unsupported command ${templateKey}`;
    }
    
    const generator = template[this.target];
    if (!generator) {
      console.warn(`No ${this.target} generator for: ${templateKey}`);
      return `; WARNING: ${templateKey} not supported on ${this.target}`;
    }
    
    return generator(command);
  }
  
  generateHeader(metadata) {
    const headers = {
      "FANUC": `%\nO${metadata.programNumber || '0001'} (${metadata.name || 'UGAL PROGRAM'})\nG17 G21 G40 G49 G80 G90`,
      "SIEMENS": `; ${metadata.name || 'UGAL PROGRAM'}\nG17 G21 G40 G49 G80 G90`,
      "HEIDENHAIN": `BEGIN PGM ${metadata.name || 'UGAL'} MM\nBLK FORM 0.1 Z X-100 Y-100 Z-50\nBLK FORM 0.2 X+100 Y+100 Z+0`,
      "HAAS": `%\nO${metadata.programNumber || '00001'} (${metadata.name || 'UGAL PROGRAM'})\nG17 G20 G40 G49 G80 G90`,
      "MAZAK": `%\nO${metadata.programNumber || '0001'} (${metadata.name || 'UGAL PROGRAM'})\nG17 G21 G40 G49 G80 G90`
    };
    return headers[this.target] || `; ${metadata.name || 'UGAL PROGRAM'}`;
  }
  
  generateFooter() {
    const footers = {
      "FANUC": `M30\n%`,
      "SIEMENS": `M30`,
      "HEIDENHAIN": `M30\nEND PGM`,
      "HAAS": `M30\n%`,
      "MAZAK": `M30\n%`
    };
    return footers[this.target] || `M30`;
  }
}

// Usage Example:
const ugalProgram = {
  metadata: {
    programNumber: "1001",
    name: "POCKET_ROUGH"
  },
  commands: [
    { type: "TOOL_CHANGE", toolNumber: 5 },
    { type: "SPINDLE", speed: 8000, direction: "CW", mode: "RPM" },
    { type: "MOTION", mode: "RAPID", endpoint: { x: 0, y: 0, z: 50 } },
    { type: "MOTION", mode: "LINEAR", endpoint: { x: 50, y: 0, z: -10 }, feed: 500 },
    { type: "MOTION", mode: "ARC_CW", endpoint: { x: 100, y: 50 }, center: { i: 0, j: 50 }, feed: 300 }
  ]
};

// Convert to different controllers:
const fanucConverter = new UGALConverter("FANUC");
const siemensConverter = new UGALConverter("SIEMENS");
const heidenhainConverter = new UGALConverter("HEIDENHAIN");

console.log("=== FANUC ===");
console.log(fanucConverter.convert(ugalProgram));

console.log("\n=== SIEMENS ===");
console.log(siemensConverter.convert(ugalProgram));

console.log("\n=== HEIDENHAIN ===");
console.log(heidenhainConverter.convert(ugalProgram));
```

### 11.5 UGAL Quick Reference

| UGAL Abstract | FANUC | Siemens | Heidenhain |
|---------------|-------|---------|------------|
| `LINEAR(X,Y,Z,F)` | G01 X Y Z F | G1 X Y Z F | L X Y Z F |
| `RAPID(X,Y,Z)` | G00 X Y Z | G0 X Y Z | L X Y Z FMAX |
| `ARC_CW(X,Y,I,J,F)` | G02 X Y I J F | G2 X Y I J F | CC I J; C X Y DR- F |
| `ARC_CCW(X,Y,I,J,F)` | G03 X Y I J F | G3 X Y I J F | CC I J; C X Y DR+ F |
| `TOOL(n)` | Tn M06 | T="name" M6 | TOOL CALL n |
| `SPINDLE_CW(S)` | S_ M03 | S_ M3 | S_ M3 |
| `SPINDLE_CCW(S)` | S_ M04 | S_ M4 | S_ M4 |
| `SPINDLE_STOP` | M05 | M5 | M5 |
| `COOLANT_ON` | M08 | M8 | M8 |
| `COOLANT_OFF` | M09 | M9 | M9 |
| `DRILL_PECK(...)` | G83 ... | CYCLE83(...) | CYCL DEF 203 |
| `TAP(...)` | G84 ... | CYCLE84(...) | CYCL DEF 206 |
| `BORE(...)` | G85 ... | CYCLE85(...) | CYCL DEF 208 |
| `TCP_ON(H)` | G43.4 H_ | TRAORI | M128 |
| `TCP_OFF` | G49 | TRAFOOF | M129 |
| `PLANE_TILT(A,B,C)` | G68.2 I J K | CYCLE800(...) | PLANE SPATIAL |

## 13. RELATED SKILLS

- **prism-fanuc-programming** - Complete FANUC Macro B, all alarms, examples
- **prism-siemens-programming** - Complete Siemens cycles, all alarms, examples
- **prism-heidenhain-programming** - Complete TNC dialog, all alarms, examples

---

*END OF SKILL: prism-gcode-reference*
*Version: 2.0 | Created: January 24, 2026*
*Size: ~90KB | Sections: 13 | Parts: 2*
