# PRISM Heidenhain TNC Programming Skill
## Complete Reference for TNC 640, TNC 620, TNC 320, iTNC 530
### Version 1.0 | PRISM Manufacturing Intelligence

---

# PART 1: FUNDAMENTALS AND CONVERSATIONAL PROGRAMMING

---

## 1. TNC CONTROL FAMILIES

### 1.1 Control Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    HEIDENHAIN TNC CONTROL COMPARISON                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  TNC 640 (Current flagship)                                                 │
│  ─────────────────────────                                                  │
│  • Full 5-axis simultaneous                                                 │
│  • Up to 24 axes, 6 spindles                                                │
│  • Dynamic Collision Monitoring (DCM)                                       │
│  • 3D mesh compensation                                                     │
│  • Python scripting support                                                 │
│  • StateMonitor connectivity                                                │
│  • Best for: High-end 5-axis, complex parts                                 │
│                                                                             │
│  TNC 620 (Mid-range)                                                        │
│  ────────────────────                                                       │
│  • Up to 5 axes                                                             │
│  • Simplified operation                                                     │
│  • Touch screen interface                                                   │
│  • Cross talk compensation                                                  │
│  • Best for: 5-axis positioning, standard milling                           │
│                                                                             │
│  TNC 320 (Compact)                                                          │
│  ─────────────────                                                          │
│  • Up to 5 axes                                                             │
│  • Compact panel design                                                     │
│  • Full conversational programming                                          │
│  • Best for: 3-axis, 3+2 axis work                                          │
│                                                                             │
│  iTNC 530 (Legacy - widely installed)                                       │
│  ─────────────────────────────────────                                      │
│  • Up to 13 axes                                                            │
│  • Older architecture                                                       │
│  • Many machines still in service                                           │
│  • Best for: Legacy support                                                 │
│                                                                             │
│  FEATURE COMPARISON                                                         │
│  ┌──────────────────────┬──────────┬──────────┬──────────┬──────────┐       │
│  │ Feature             │  TNC640  │  TNC620  │  TNC320  │ iTNC530  │       │
│  ├──────────────────────┼──────────┼──────────┼──────────┼──────────┤       │
│  │ Max Axes            │    24    │    5     │    5     │    13    │       │
│  │ 5-Axis Simultaneous │    ✓     │    ✓     │    -     │    ✓     │       │
│  │ PLANE Function      │    ✓     │    ✓     │    ✓     │    ✓     │       │
│  │ DCM (Collision)     │    ✓     │   Opt    │    -     │    -     │       │
│  │ Touch Probe         │    ✓     │    ✓     │    ✓     │    ✓     │       │
│  │ Python/Klartext     │    ✓     │    -     │    -     │    -     │       │
│  │ Remote Desktop      │    ✓     │    ✓     │    -     │    -     │       │
│  │ AFC (Adaptive Feed) │    ✓     │    ✓     │   Opt    │   Opt    │       │
│  └──────────────────────┴──────────┴──────────┴──────────┴──────────┘       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Programming Modes

| Mode | Description | Use Case |
|------|-------------|----------|
| **Klartext (Conversational)** | Dialog-based, plain language | Primary Heidenhain mode |
| **ISO** | Standard G-code compatible | DNC, CAM compatibility |
| **DIN/ISO** | Hybrid ISO with extensions | Mixed shops |

### 1.3 File Extensions

| Extension | Type |
|-----------|------|
| `.H` | Heidenhain Klartext program |
| `.I` | ISO program |
| `.T` | Tool table |
| `.D` | Datum table |
| `.TCH` | Touch probe cycles |
| `.PLC` | PLC data |

---

## 2. PROGRAM STRUCTURE (KLARTEXT)

### 2.1 Basic Program Format

```heidenhain
0  BEGIN PGM EXAMPLE MM
1  ; Program header comment
2  ; Part: Example Part
3  ; Material: Steel
4  ; Programmer: [Name]
5  ; Date: [Date]
6  BLK FORM 0.1 Z  X+0  Y+0  Z-50
7  BLK FORM 0.2  X+100  Y+80  Z+0
8  TOOL CALL 1 Z S5000 F500
9  L  X+0  Y+0  Z+50 R0 FMAX M3
10 L  Z+2 FMAX
11 L  Z-5 F200
12 L  X+100 F500
13 L  Y+80
14 L  X+0
15 L  Y+0
16 L  Z+50 FMAX M5
17 END PGM EXAMPLE MM
```

### 2.2 Block Structure

```heidenhain
; Block number is automatic (0, 1, 2...)
; Format: [Number] [Function] [Parameters] [Misc functions]

; Movement blocks
L  X+100  Y+50  Z+0 R0 F500 M3   ; Linear move
CC X+50 Y+50                      ; Circle center
C  X+100 Y+50 DR+                 ; Circular move CW
C  X+100 Y+50 DR-                 ; Circular move CCW
CR X+100 Y+50 R+25 DR+            ; Arc with radius

; Position formats
X+100                             ; Absolute position
IX+10                             ; Incremental position
X+Q1                              ; Q-parameter position
```

### 2.3 Comments and Labels

```heidenhain
; Semicolon comment (entire line)
L X+100 ; inline comment

* - Part setup complete         ; Star comment (operator message)

; Labels for program jumps
LBL 1                            ; Define label 1
; ... code ...
LBL 0                            ; Label 0 = end of subprogram

; Call label as subprogram
CALL LBL 1                       ; Call once
CALL LBL 1 REP 5                 ; Call 5 times

; Conditional jump
FN 9: IF +Q1 EQU +Q2 GOTO LBL 5
```

---

## 3. COORDINATE SYSTEMS AND DATUM

### 3.1 Coordinate System Hierarchy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    HEIDENHAIN COORDINATE SYSTEM HIERARCHY                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  MACHINE COORDINATE SYSTEM (REF)                                            │
│  └── BASIC TRANSFORMATION                                                   │
│      └── WORKPIECE COORDINATE SYSTEM                                        │
│          └── PRESET (Datum table entry)                                     │
│              └── DATUM SHIFT (CYCL DEF 7)                                   │
│                  └── CURRENT WORKING POSITION                               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Datum Setting

```heidenhain
; Set datum in program
CYCL DEF 7.0 DATUM SHIFT
CYCL DEF 7.1  X+100
CYCL DEF 7.2  Y+50
CYCL DEF 7.3  Z+0

; Reset datum shift
CYCL DEF 7.0 DATUM SHIFT
CYCL DEF 7.1  X+0
CYCL DEF 7.2  Y+0
CYCL DEF 7.3  Z+0

; Activate preset from datum table
CYCL DEF 247 DATUM SETTING ~
    Q339=+1    ; Datum number in table

; Read current datum
FN 18: SYSREAD Q1 = ID210 NR1 IDX1  ; Read X of datum 1
```

### 3.3 Workpiece Definition (BLK FORM)

```heidenhain
; Define workpiece blank for simulation
; BLK FORM 0.1 = minimum point, BLK FORM 0.2 = maximum point
BLK FORM 0.1 Z  X+0    Y+0    Z-50   ; Min corner, Z = tool axis
BLK FORM 0.2    X+100  Y+80   Z+0    ; Max corner

; Cylinder blank
BLK FORM CYLINDER Z R50 L100 DIST+0  ; Z axis, R50mm, 100mm long
```

---

## 4. TOOL MANAGEMENT

### 4.1 Tool Call

```heidenhain
; Basic tool call
TOOL CALL 1 Z S5000                  ; Tool 1, Z axis, 5000 RPM

; With feed rate
TOOL CALL 1 Z S5000 F500             ; Add default feed

; Tool call by name
TOOL CALL "DRILL_10" Z S2500         ; By tool name

; Tool call with D (cutting edge)
TOOL CALL 1.2 Z S5000                ; Tool 1, cutting edge 2

; Tool axis selection
TOOL CALL 1 Z ...                    ; Vertical spindle
TOOL CALL 1 Y ...                    ; Horizontal spindle (if equipped)
```

### 4.2 Tool Data Parameters

```heidenhain
; Tool table columns:
; T     = Tool number
; NAME  = Tool name (optional)
; L     = Tool length
; R     = Tool radius
; R2    = Corner radius
; DL    = Delta length (wear)
; DR    = Delta radius (wear)
; DR2   = Delta corner radius (wear)
; LCUTS = Cutting length
; ANGLE = Tip angle (drills)
; TL    = Tool life (minutes)

; Read tool data with FN 18
FN 18: SYSREAD Q1 = ID50 NR5 IDX1    ; Read length of tool 5
FN 18: SYSREAD Q2 = ID50 NR5 IDX2    ; Read radius of tool 5
```

### 4.3 Tool Radius Compensation

```heidenhain
; Activate with R+ or R-
L  X+0 Y+0 R0 F500                   ; R0 = no compensation (center path)
L  X+100 R+ F500                     ; R+ = comp right of path
L  Y+80 RL F500                      ; RL = comp left of path

; Cancel compensation
L  X+0 R0 F500                       ; R0 cancels

; Important: Approach/depart perpendicular or tangent to contour
; Never activate/deactivate on the contour!
```

---

## 5. MOVEMENT COMMANDS

### 5.1 Linear Movement (L)

```heidenhain
; Linear movement syntax
L  X+100 Y+50 Z+0 R0 F500 M3

; Components:
; L = Linear interpolation
; X, Y, Z = Target position (+ or - for direction indication)
; R0, RL, RR = Radius compensation (0=none, L=left, R=right)
; F = Feed rate (FMAX = rapid)
; M = Miscellaneous function

; Incremental movement
L  IX+10 IY+20 IZ-5 F500             ; I prefix = incremental

; Rapid positioning
L  X+100 Y+50 Z+50 R0 FMAX           ; FMAX = maximum feed (rapid)

; Feed in specific axis
L  Z-10 F100                         ; Only Z axis, 100 mm/min
L  X+50 Y+30 FZ100                   ; X,Y rapid, Z at 100
```

### 5.2 Circular Movement (C, CC, CR, CT)

```heidenhain
; Method 1: Circle center (CC) + Circle (C)
CC X+50 Y+50                         ; Set circle center
C  X+100 Y+50 DR+                    ; Arc CW (DR+ = clockwise)
C  X+50 Y+0 DR-                      ; Arc CCW (DR- = counter-clockwise)

; Method 2: Radius (CR)
CR X+100 Y+50 R+25 DR+               ; Arc with radius 25mm CW
CR X+0 Y+50 R-25 DR-                 ; Negative R = large arc

; Method 3: Tangent (CT) - arc tangent to previous path
L  X+50 Y+0 RL F500
CT X+100 Y+50                        ; Tangent arc to endpoint

; Full circle
CC X+50 Y+50
C  X+50 Y+100 DR+                    ; 360° if same as current position
```

### 5.3 Helical Interpolation

```heidenhain
; Helix combines circular and linear motion
CC X+50 Y+50                         ; Circle center
L  X+100 Y+50 RL F500                ; Start position with comp
CP IPA+360 IZ-5                      ; Helix: 360° with 5mm Z descent

; CP = Circular path with polar coordinates
; IPA = Incremental polar angle
; IZ = Incremental Z movement

; Multiple revolutions
CP IPA+1080 IZ-15                    ; 3 full revolutions, 15mm descent
```

### 5.4 Polar Coordinates

```heidenhain
; Define pole (origin for polar)
CC X+50 Y+50                         ; Pole at X50 Y50

; Move using polar coordinates
LP PR+30 PA+45 R0 F500               ; Radius 30mm, angle 45°
LP IPR+5 IPA+30 F500                 ; Incremental polar

; Circular in polar
CP PA+90                             ; Arc to 90° from current position
CP IPA+90 DR+                        ; Arc 90° CW
```

---

## 6. Q-PARAMETERS (VARIABLES)

### 6.1 Q-Parameter Ranges

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    Q-PARAMETER RANGES                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│  Q0 - Q99      Local parameters (program-specific)                          │
│  Q100 - Q199   Parameters transferred between programs (global)             │
│  Q200 - Q499   Cycle parameters (preset by cycles)                          │
│  Q500 - Q599   Additional cycle parameters                                  │
│  Q600 - Q699   Advanced cycle parameters                                    │
│  Q700 - Q799   Reserved (various cycles)                                    │
│  Q800 - Q899   User parameters (permanent, NC memory)                       │
│  Q900 - Q999   Reserved/system                                              │
│  Q1000 - Q1999  QS string parameters                                        │
│  QL1 - QL999    Local parameters (modern TNC)                               │
│  QR1 - QR999    Permanently stored parameters                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 6.2 Q-Parameter Assignment

```heidenhain
; Direct assignment
Q1 = 100                              ; Q1 = 100
Q2 = -50.5                            ; Q2 = -50.5

; FN functions for assignment
FN 0: Q1 = +100                       ; Assignment
FN 1: Q3 = +Q1 + +Q2                  ; Addition
FN 2: Q4 = +Q1 - +Q2                  ; Subtraction
FN 3: Q5 = +Q1 * +Q2                  ; Multiplication
FN 4: Q6 = +Q1 DIV +Q2                ; Division
FN 5: Q7 = +Q1 SQRT                   ; Square root of Q1
FN 6: Q8 = +Q1 SIN +Q2                ; Q1 * SIN(Q2) - angle in degrees
FN 7: Q9 = +Q1 COS +Q2                ; Q1 * COS(Q2)

; Modern formula syntax (TNC 640)
Q10 = Q1 + Q2 * SIN(Q3)               ; Combined formula

; Use in movements
L  X+Q1 Y+Q2 Z+Q3 F500                ; Parameters as positions
```

### 6.3 Mathematical Operations

```heidenhain
; Basic arithmetic
FN 1: Q10 = +Q1 + +Q2                 ; Addition
FN 2: Q10 = +Q1 - +Q2                 ; Subtraction
FN 3: Q10 = +Q1 * +Q2                 ; Multiplication
FN 4: Q10 = +Q1 DIV +Q2               ; Division

; Trigonometry (angles in degrees)
FN 6: Q10 = +1 SIN +Q1                ; SIN(Q1)
FN 7: Q10 = +1 COS +Q1                ; COS(Q1)
FN 8: Q10 = +Q1 SQRT                  ; Square root

; Additional functions (varies by control)
FN 10: Q10 = +Q1 ABS                  ; Absolute value
FN 11: Q10 = +Q1 INT                  ; Integer part
FN 12: Q10 = +Q1 MOD +Q2              ; Modulo (TNC 640)
FN 13: Q10 = +Q1 SQ                   ; Square (Q1²)
FN 14: Q10 = +Q1 ATAN +Q2             ; ATAN2(Q1, Q2)

; Example: Bolt circle calculation
Q1 = 50                               ; Radius
Q2 = 6                                ; Number of holes
Q3 = 0                                ; Start angle

LBL 1
  FN 6: Q10 = +Q1 SIN +Q3             ; Y = R * SIN(angle)
  FN 7: Q11 = +Q1 COS +Q3             ; X = R * COS(angle)
  L  X+Q11 Y+Q10 R0 FMAX
  CYCL CALL                            ; Call active cycle
  FN 1: Q3 = +Q3 + ( +360 DIV +Q2 )   ; Next angle
  FN 12: Q3 = +Q3 MOD +360            ; Keep in 0-360
LBL 0

CALL LBL 1 REP Q2                     ; Repeat for each hole
```

### 6.4 String Parameters (QS)

```heidenhain
; String parameters QS0-QS99 (varies by control)
QS1 = "PART_ABC"                      ; Assign string
QS2 = "TOOL_"

; Concatenation
QS3 = QS2 || "DRILL"                  ; QS3 = "TOOL_DRILL"

; Use in tool call
TOOL CALL QS1 Z S3000                 ; Tool by string parameter

; Message output
FN 16: F-PRINT QS1                    ; Print to screen
```

---

## 7. PROGRAM FLOW CONTROL

### 7.1 Labels and Jumps

```heidenhain
; Define label
LBL 1                                 ; Label 1
  ; ... code ...
LBL 0                                 ; End of label block (required for subprogram)

; Unconditional jump
CALL LBL 1                            ; Call label 1 as subprogram (returns at LBL 0)
CALL LBL 1 REP 5                      ; Call 5 times

; Jump without return
FN 9: IF +Q1 GT +0 GOTO LBL 10        ; If Q1 > 0, jump to LBL 10
```

### 7.2 Conditional Statements (FN 9)

```heidenhain
; FN 9: IF [condition] GOTO LBL [n]

; Comparison operators:
; EQU = Equal
; NE  = Not equal
; GT  = Greater than
; LT  = Less than
; GE  = Greater or equal
; LE  = Less or equal

; Examples:
FN 9: IF +Q1 EQU +0 GOTO LBL 99       ; If Q1 = 0, jump to LBL 99
FN 9: IF +Q1 NE +Q2 GOTO LBL 10       ; If Q1 ≠ Q2, jump to LBL 10
FN 9: IF +Q1 GT +100 GOTO LBL 5       ; If Q1 > 100, jump to LBL 5
FN 9: IF +Q1 LT +0 GOTO LBL 20        ; If Q1 < 0, jump to LBL 20
FN 9: IF +Q1 GE +Q2 GOTO LBL 3        ; If Q1 >= Q2, jump to LBL 3
FN 9: IF +Q1 LE +50 GOTO LBL 7        ; If Q1 <= 50, jump to LBL 7

; Logical combinations (string concatenation)
FN 9: IF +Q1 GT +0 GOTO LBL 1
FN 9: IF +Q1 LE +0 GOTO LBL 2         ; Else condition
```

### 7.3 Program Repetition

```heidenhain
; Repeat with label
LBL 1
  ; ... code to repeat ...
LBL 0

CALL LBL 1 REP Q5                     ; Repeat Q5 times

; Counted loop pattern
Q1 = 0                                ; Counter
LBL 1
  FN 9: IF +Q1 GE +10 GOTO LBL 99     ; Exit when counter >= 10
  ; ... loop body ...
  FN 1: Q1 = +Q1 + +1                 ; Increment counter
  CALL LBL 1
LBL 99
```

### 7.4 Subprogram Calls

```heidenhain
; Call external program
CALL PGM SUBPROG.H                    ; Call SUBPROG.H

; Call with parameter transfer
CALL PGM POCKET.H                     ; Parameters passed via Q100-Q199
; In POCKET.H, use Q100-Q199 for inputs

; Call from different directory
CALL PGM TNC:\PROGRAMS\DRILL.H

; Call with repetitions
CALL PGM HOLE.H REP 6                 ; Repeat 6 times

; Stop execution
STOP                                  ; Programmed stop (M0 equivalent)
STOP M5                              ; Stop with spindle off
```

---

## 8. MACHINING CYCLES

### 8.1 Drilling Cycles (200-209)

```heidenhain
; CYCLE 200 - Drilling
CYCL DEF 200 DRILLING ~
    Q200=+2      ;SETUP CLEARANCE ~
    Q201=-25     ;DEPTH ~
    Q206=+250    ;FEED RATE FOR PLNGNG ~
    Q202=+5      ;PLUNGING DEPTH ~
    Q210=+0      ;DWELL TIME AT TOP ~
    Q203=-10     ;SURFACE COORDINATE ~
    Q204=+50     ;2ND SETUP CLEARANCE

; CYCLE 201 - Reaming
CYCL DEF 201 REAMING ~
    Q200=+2      ;SETUP CLEARANCE ~
    Q201=-30     ;DEPTH ~
    Q206=+150    ;FEED RATE FOR PLNGNG ~
    Q211=+0.5    ;DWELL TIME AT DEPTH ~
    Q203=+0      ;SURFACE COORDINATE ~
    Q204=+50     ;2ND SETUP CLEARANCE

; CYCLE 203 - Universal Drilling (peck)
CYCL DEF 203 UNIVERSAL DRILLING ~
    Q200=+2      ;SETUP CLEARANCE ~
    Q201=-40     ;DEPTH ~
    Q206=+200    ;FEED RATE FOR PLNGNG ~
    Q202=+5      ;PLUNGING DEPTH ~
    Q210=+0      ;DWELL TIME AT TOP ~
    Q203=+0      ;SURFACE COORDINATE ~
    Q204=+50     ;2ND SETUP CLEARANCE ~
    Q212=+0      ;DECREMENT ~
    Q213=+3      ;BROKEN CHIP STROKES ~
    Q205=+1      ;MIN PLUNGING DEPTH

; CYCLE 205 - Deep Drilling (chip breaking)
CYCL DEF 205 UNIVERSAL PECKING ~
    Q200=+2      ;SETUP CLEARANCE ~
    Q201=-50     ;DEPTH ~
    Q206=+180    ;FEED RATE FOR PLNGNG ~
    Q202=+5      ;PLUNGING DEPTH ~
    Q203=+0      ;SURFACE COORDINATE ~
    Q204=+50     ;2ND SETUP CLEARANCE ~
    Q212=+1      ;DECREMENT ~
    Q205=+2      ;MIN PLUNGING DEPTH ~
    Q258=+0.2    ;UPPER ADV STOP DIST ~
    Q259=+0.2    ;LOWER ADV STOP DIST ~
    Q257=+0      ;DEPTH FOR CHIP BRKNG

; Execute cycle at positions
L  X+30 Y+30 R0 FMAX M99             ; M99 = execute cycle
L  X+70 Y+30 R0 FMAX M99
L  X+70 Y+60 R0 FMAX M99
L  X+30 Y+60 R0 FMAX M99
```

### 8.2 Tapping Cycles (206-209)

```heidenhain
; CYCLE 206 - Tapping (new style)
CYCL DEF 206 TAPPING NEW ~
    Q200=+2      ;SETUP CLEARANCE ~
    Q201=-20     ;THREAD DEPTH ~
    Q239=+1.5    ;PITCH ~
    Q203=+0      ;SURFACE COORDINATE ~
    Q204=+50     ;2ND SETUP CLEARANCE

; CYCLE 207 - Rigid Tapping
CYCL DEF 207 TAPPING RIGID ~
    Q200=+2      ;SETUP CLEARANCE ~
    Q201=-25     ;THREAD DEPTH ~
    Q239=+1.25   ;PITCH ~
    Q203=+0      ;SURFACE COORDINATE ~
    Q204=+30     ;2ND SETUP CLEARANCE ~
    Q257=+100    ;ENTRY SPINDLE SPEED
```

### 8.3 Pocket Cycles (251-254)

```heidenhain
; CYCLE 251 - Rectangular Pocket
CYCL DEF 251 RECTANGULAR POCKET ~
    Q215=+0      ;MACHINING OPERATION ~
    Q218=+100    ;FIRST SIDE LENGTH ~
    Q219=+60     ;SECOND SIDE LENGTH ~
    Q220=+5      ;CORNER RADIUS ~
    Q368=+0      ;ALLOWANCE FOR SIDE ~
    Q224=+0      ;ROTATION ANGLE ~
    Q367=+0      ;POCKET POSITION ~
    Q207=+400    ;FEED RATE FOR MILLING ~
    Q351=+1      ;CLIMB OR UP-CUT ~
    Q201=-15     ;DEPTH ~
    Q202=+3      ;PLUNGING DEPTH ~
    Q369=+0      ;ALLOWANCE FOR FLOOR ~
    Q206=+150    ;FEED RATE FOR PLNGNG ~
    Q338=+0      ;INFEED FOR FINISHING ~
    Q200=+2      ;SETUP CLEARANCE ~
    Q203=+0      ;SURFACE COORDINATE ~
    Q204=+30     ;2ND SETUP CLEARANCE ~
    Q370=+1      ;TOOL PATH OVERLAP ~
    Q366=+1      ;PLUNGING

; CYCLE 252 - Circular Pocket
CYCL DEF 252 CIRCULAR POCKET ~
    Q215=+0      ;MACHINING OPERATION ~
    Q223=+50     ;CIRCLE DIAMETER ~
    Q368=+0      ;ALLOWANCE FOR SIDE ~
    Q207=+400    ;FEED RATE FOR MILLING ~
    Q351=+1      ;CLIMB OR UP-CUT ~
    Q201=-20     ;DEPTH ~
    Q202=+4      ;PLUNGING DEPTH ~
    Q369=+0      ;ALLOWANCE FOR FLOOR ~
    Q206=+150    ;FEED RATE FOR PLNGNG ~
    Q338=+0      ;INFEED FOR FINISHING ~
    Q200=+2      ;SETUP CLEARANCE ~
    Q203=+0      ;SURFACE COORDINATE ~
    Q204=+30     ;2ND SETUP CLEARANCE ~
    Q370=+1      ;TOOL PATH OVERLAP ~
    Q366=+1      ;PLUNGING

; Execute
L  X+50 Y+40 FMAX M99                ; Machine at position
```

### 8.4 Contour Pocket (CYCLE 270-274)

```heidenhain
; CYCLE 270 - Contour Train Definition
; First define the contour with SL cycles

; Define pocket depth data
CYCL DEF 270 CONTOUR TRAIN DATA ~
    Q1=-20       ;DEPTH
    Q2=+2        ;PATH OVERLAP
    Q3=+0        ;SETUP CLEARANCE

; CYCLE 271 - Data Definition
CYCL DEF 271 CONTOUR POCKET DATA ~
    Q215=+0      ;MACHINING OPERATION ~
    Q206=+150    ;FEED RATE FOR PLNGNG ~
    Q338=+0      ;INFEED FOR FINISHING ~
    Q338=+0      ;FINISHING FEED ~
    Q200=+2      ;SETUP CLEARANCE ~
    Q203=+0      ;SURFACE COORDINATE ~
    Q204=+30     ;2ND SETUP CLEARANCE ~
    Q207=+500    ;FEED RATE FOR MILLING ~
    Q351=+1      ;CLIMB OR UP-CUT

; CYCLE 272 - Execute
CYCL DEF 272 CONTOUR POCKET ~
    Q1=+1        ;SUBPROGRAM NUMBER
```

---

## 9. PATTERN CYCLES

### 9.1 Point Patterns

```heidenhain
; CYCLE 220 - Point Pattern (Linear)
CYCL DEF 220 POINT PATTERN ~
    Q225=+10     ;START POINT 1ST AXIS ~
    Q226=+10     ;START POINT 2ND AXIS ~
    Q237=+20     ;PITCH 1ST AXIS ~
    Q238=+25     ;PITCH 2ND AXIS ~
    Q242=+5      ;NUMBER IN 1ST AXIS ~
    Q243=+4      ;NUMBER IN 2ND AXIS ~
    Q224=+0      ;ROTATION ANGLE ~
    Q200=+2      ;SETUP CLEARANCE ~
    Q203=+0      ;SURFACE COORDINATE ~
    Q204=+50     ;2ND SETUP CLEARANCE ~
    Q301=+1      ;MOVE TO CLEARANCE

; Then define drilling cycle and call pattern
CYCL DEF 200 DRILLING ...
CYCL CALL

; CYCLE 221 - Circle Pattern (Bolt Circle)
CYCL DEF 221 HOLE CIRCLE ~
    Q216=+50     ;1ST CIRCLE CENTER ~
    Q217=+50     ;2ND CIRCLE CENTER ~
    Q244=+30     ;BOLT CIRCLE DIA ~
    Q245=+0      ;START ANGLE ~
    Q246=+6      ;NUMBER OF HOLES ~
    Q247=+360    ;ANGULAR RANGE ~
    Q241=+1      ;START AT ~
    Q200=+2      ;SETUP CLEARANCE ~
    Q203=+0      ;SURFACE COORDINATE ~
    Q204=+50     ;2ND SETUP CLEARANCE ~
    Q301=+1      ;MOVE TO CLEARANCE

CYCL DEF 200 DRILLING ...             ; Define hole cycle
CYCL CALL                             ; Execute pattern
```

---

## 10. PROGRAMMING EXAMPLES (1-10)

### Example 1: Simple Face Milling

```heidenhain
0  BEGIN PGM FACE MM
1  BLK FORM 0.1 Z  X+0  Y+0  Z-30
2  BLK FORM 0.2  X+120  Y+80  Z+0
3  TOOL CALL 1 Z S2000 F800
4  L  Z+50 R0 FMAX M3
5  L  X-30 Y-20 R0 FMAX
6  L  Z+2 FMAX
7  L  Z+0 F1000
8  L  X+150 F800
9  L  Y+30
10 L  X-30
11 L  Y+80
12 L  X+150
13 L  Z+50 FMAX M5
14 END PGM FACE MM
```

### Example 2: Bolt Circle with Q-Parameters

```heidenhain
0  BEGIN PGM BOLT_CIRCLE MM
1  ; Bolt circle parameters
2  Q1 = 50          ; Center X
3  Q2 = 50          ; Center Y
4  Q3 = 30          ; Radius
5  Q4 = 6           ; Number of holes
6  Q5 = 0           ; Start angle
7  Q6 = -20         ; Hole depth
8  
9  BLK FORM 0.1 Z  X+0  Y+0  Z-30
10 BLK FORM 0.2  X+100  Y+100  Z+0
11 
12 TOOL CALL 2 Z S2500 F200
13 L  Z+50 FMAX M3
14 
15 ; Drilling cycle definition
16 CYCL DEF 203 UNIVERSAL DRILLING ~
       Q200=+2 ~
       Q201=Q6 ~
       Q206=+180 ~
       Q202=+5 ~
       Q210=+0 ~
       Q203=+0 ~
       Q204=+50 ~
       Q212=+0 ~
       Q213=+0 ~
       Q205=+2
17
18 ; Calculate and drill holes
19 Q10 = 0
20 LBL 1
21   FN 9: IF +Q10 GE +Q4 GOTO LBL 99
22   FN 1: Q11 = +Q5 + +Q10 * ( +360 DIV +Q4 )
23   FN 6: Q12 = +Q3 SIN +Q11
24   FN 7: Q13 = +Q3 COS +Q11
25   FN 1: Q14 = +Q1 + +Q13
26   FN 1: Q15 = +Q2 + +Q12
27   L  X+Q14 Y+Q15 FMAX M99
28   FN 1: Q10 = +Q10 + +1
29   CALL LBL 1
30 LBL 99
31
32 L  Z+50 FMAX M5
33 END PGM BOLT_CIRCLE MM
```

### Example 3: Rectangular Pocket

```heidenhain
0  BEGIN PGM RECT_POCKET MM
1  BLK FORM 0.1 Z  X+0  Y+0  Z-30
2  BLK FORM 0.2  X+120  Y+80  Z+0
3  
4  TOOL CALL 3 Z S4000 F500
5  L  Z+50 FMAX M3
6  M8
7  
8  ; Position at pocket center
9  L  X+60 Y+40 FMAX
10 L  Z+2 FMAX
11
12 CYCL DEF 251 RECTANGULAR POCKET ~
       Q215=+0 ~
       Q218=+80 ~
       Q219=+50 ~
       Q220=+5 ~
       Q368=+0 ~
       Q224=+0 ~
       Q367=+0 ~
       Q207=+400 ~
       Q351=+1 ~
       Q201=-12 ~
       Q202=+3 ~
       Q369=+0 ~
       Q206=+200 ~
       Q338=+0 ~
       Q200=+2 ~
       Q203=+0 ~
       Q204=+30 ~
       Q370=+1 ~
       Q366=+1
13
14 CYCL CALL
15
16 L  Z+50 FMAX M9
17 M5
18 END PGM RECT_POCKET MM
```

### Example 4: Contour with Radius Compensation

```heidenhain
0  BEGIN PGM CONTOUR MM
1  BLK FORM 0.1 Z  X+0  Y+0  Z-20
2  BLK FORM 0.2  X+100  Y+80  Z+0
3  
4  TOOL CALL 5 Z S3500 F600
5  L  Z+50 FMAX M3
6  M8
7  
8  ; Approach move - perpendicular to first contour element
9  L  X-10 Y0 FMAX
10 L  Z+2 FMAX
11 L  Z-8 F300
12
13 ; Start contour with radius compensation left
14 L  X+0 Y+0 RL F500
15 L  X+90
16 RND R5                ; Corner radius
17 L  Y+70
18 RND R5
19 L  X+10
20 RND R5
21 L  Y+10
22 RND R5
23 L  X+0 Y+0            ; Close contour
24
25 ; Depart perpendicular
26 L  X-10 R0 F500
27
28 L  Z+50 FMAX M9
29 M5
30 END PGM CONTOUR MM
```

### Example 5: Thread Milling

```heidenhain
0  BEGIN PGM THREAD_MILL MM
1  ; M20 x 2.5 internal thread
2  Q1 = 50           ; Center X
3  Q2 = 50           ; Center Y  
4  Q3 = 20           ; Major diameter
5  Q4 = 2.5          ; Pitch
6  Q5 = -25          ; Thread depth
7  Q6 = 12           ; Tool diameter
8  
9  BLK FORM 0.1 Z  X+0  Y+0  Z-30
10 BLK FORM 0.2  X+100  Y+100  Z+0
11
12 TOOL CALL 8 Z S1200 F400
13 L  Z+50 FMAX M3
14 M8
15
16 ; Calculate helix radius (tool center)
17 FN 2: Q10 = +Q3 - +Q6
18 FN 4: Q10 = +Q10 DIV +2
19
20 ; Position at thread center
21 L  X+Q1 Y+Q2 FMAX
22 L  Z+5 FMAX
23 L  Z+Q5 F500        ; Plunge to full depth
24
25 ; Linear approach to radius
26 FN 1: Q11 = +Q1 + +Q10
27 L  X+Q11 F300
28
29 ; Helical thread mill (climb, upward)
30 ; Calculate number of passes
31 FN 10: Q12 = +Q5 ABS
32 FN 4: Q13 = +Q12 DIV +Q4
33 FN 11: Q13 = +Q13 INT
34 FN 1: Q13 = +Q13 + +2  ; Extra passes for complete thread
35
36 ; Mill thread helix
37 CC X+Q1 Y+Q2
38 Q14 = Q5
39 LBL 1
40   FN 9: IF +Q14 GE +0 GOTO LBL 99
41   FN 1: Q14 = +Q14 + +Q4
42   FN 9: IF +Q14 GT +0 GOTO LBL 2
43   GOTO LBL 3
44 LBL 2
45   Q14 = 0
46 LBL 3
47   CP IPA+360 IZ+Q4 F400 DR-
48   CALL LBL 1
49 LBL 99
50
51 ; Exit to center
52 L  X+Q1 Y+Q2 F300
53 L  Z+50 FMAX M9
54 M5
55 END PGM THREAD_MILL MM
```

### Example 6: Multi-Part Fixture (Datum Shifting)

```heidenhain
0  BEGIN PGM MULTI_PART MM
1  ; Machine same feature at 4 positions
2  Q1 = 0             ; X offset
3  Q2 = 0             ; Y offset
4  Q3 = 4             ; Number of parts
5  Q4 = 100           ; X spacing
6  Q5 = 80            ; Y spacing
7  
8  BLK FORM 0.1 Z  X+0  Y+0  Z-15
9  BLK FORM 0.2  X+200  Y+160  Z+0
10
11 TOOL CALL 3 Z S4000 F500
12 L  Z+50 FMAX M3
13 M8
14
15 Q10 = 0            ; Part counter
16
17 LBL 1
18   FN 9: IF +Q10 GE +Q3 GOTO LBL 99
19   
20   ; Calculate position (2x2 grid)
21   FN 11: Q11 = +Q10 INT
22   FN 12: Q12 = +Q11 MOD +2        ; Column (0 or 1)
23   FN 4: Q13 = +Q11 DIV +2         ; Row (0 or 1)
24   FN 11: Q13 = +Q13 INT
25   FN 3: Q14 = +Q12 * +Q4          ; X offset
26   FN 3: Q15 = +Q13 * +Q5          ; Y offset
27   
28   ; Set datum shift
29   CYCL DEF 7.0 DATUM SHIFT
30   CYCL DEF 7.1  X+Q14
31   CYCL DEF 7.2  Y+Q15
32   CYCL DEF 7.3  Z+0
33   
34   ; Machine pocket at local 25,20
35   L  X+25 Y+20 FMAX
36   L  Z+2 FMAX
37   
38   CYCL DEF 252 CIRCULAR POCKET ~
          Q215=+0 ~
          Q223=+30 ~
          Q368=+0 ~
          Q207=+400 ~
          Q351=+1 ~
          Q201=-10 ~
          Q202=+3 ~
          Q369=+0 ~
          Q206=+150 ~
          Q338=+0 ~
          Q200=+2 ~
          Q203=+0 ~
          Q204=+30 ~
          Q370=+1 ~
          Q366=+1
39   
40   CYCL CALL
41   
42   FN 1: Q10 = +Q10 + +1
43   CALL LBL 1
44 LBL 99
45
46 ; Reset datum
47 CYCL DEF 7.0 DATUM SHIFT
48 CYCL DEF 7.1  X+0
49 CYCL DEF 7.2  Y+0
50 CYCL DEF 7.3  Z+0
51
52 L  Z+50 FMAX M9
53 M5
54 END PGM MULTI_PART MM
```

### Example 7: Engraving with Rotation

```heidenhain
0  BEGIN PGM ENGRAVE MM
1  ; Parameters
2  Q1 = 50            ; Center X
3  Q2 = 50            ; Center Y
4  Q3 = -0.3          ; Depth
5  Q4 = 45            ; Rotation angle
6  
7  BLK FORM 0.1 Z  X+0  Y+0  Z-5
8  BLK FORM 0.2  X+100  Y+100  Z+0
9  
10 TOOL CALL 15 Z S12000 F2000
11 L  Z+10 FMAX M3
12
13 ; Set rotation around part center
14 CYCL DEF 10.0 ROTATION
15 CYCL DEF 10.1  ROT+Q4
16
17 ; Engrave "PRISM" - simplified strokes
18 ; Letter P
19 L  X+10 Y+5 FMAX
20 L  Z+1 FMAX
21 L  Z+Q3 F500
22 L  Y+25 F1000
23 L  X+18
24 L  Y+18
25 L  X+10
26 L  Z+1 FMAX
27
28 ; Letter R
29 L  X+22 Y+5 FMAX
30 L  Z+Q3 F500
31 L  Y+25 F1000
32 L  X+30
33 L  Y+18
34 L  X+22
35 L  Z+1 FMAX
36 L  Z+Q3
37 L  X+30 Y+5 F1000
38 L  Z+1 FMAX
39
40 ; ... continue for I, S, M ...
41
42 ; Cancel rotation
43 CYCL DEF 10.0 ROTATION
44 CYCL DEF 10.1  ROT+0
45
46 L  Z+30 FMAX M5
47 END PGM ENGRAVE MM
```

### Example 8: Helix Bore Interpolation

```heidenhain
0  BEGIN PGM HELIX_BORE MM
1  Q1 = 50           ; Center X
2  Q2 = 50           ; Center Y
3  Q3 = 40           ; Bore diameter
4  Q4 = 12           ; Tool diameter
5  Q5 = -30          ; Depth
6  Q6 = 2            ; Helix pitch (Z per revolution)
7  
8  BLK FORM 0.1 Z  X+0  Y+0  Z-40
9  BLK FORM 0.2  X+100  Y+100  Z+0
10
11 TOOL CALL 5 Z S3000 F500
12 L  Z+50 FMAX M3
13 M8
14
15 ; Calculate helix radius
16 FN 2: Q10 = +Q3 - +Q4
17 FN 4: Q10 = +Q10 DIV +2
18
19 ; Position at center
20 L  X+Q1 Y+Q2 FMAX
21 L  Z+2 FMAX
22 L  Z+0 F500
23
24 ; Move to helix start
25 FN 1: Q11 = +Q1 + +Q10
26 L  X+Q11 RL F300
27
28 ; Set circle center
29 CC X+Q1 Y+Q2
30
31 ; Calculate number of revolutions
32 FN 10: Q12 = +Q5 ABS
33 FN 4: Q13 = +Q12 DIV +Q6
34 FN 5: Q14 = +Q13 SQRT        ; Get integer (approximate)
35 FN 3: Q14 = +Q14 * +Q14      ; Square to check
36 FN 1: Q13 = +Q13 + +1        ; Add one for safety
37 FN 11: Q13 = +Q13 INT
38
39 ; Helical interpolation
40 Q15 = 0
41 LBL 1
42   FN 9: IF +Q15 GE +Q13 GOTO LBL 99
43   Q16 = Q5 + Q15 * Q6
44   FN 9: IF +Q16 GT +0 GOTO LBL 2
45   GOTO LBL 3
46 LBL 2
47   Q16 = Q5
48 LBL 3
49   CP IPA+360 IZ-Q6 F500 DR+
50   FN 1: Q15 = +Q15 + +1
51   CALL LBL 1
52 LBL 99
53
54 ; Final pass at depth (no Z motion)
55 CP IPA+360 F500 DR+
56
57 ; Exit
58 L  X+Q1 Y+Q2 F300
59 L  Z+50 FMAX M9
60 M5
61 END PGM HELIX_BORE MM
```

### Example 9: Touch Probe - Find Corner

```heidenhain
0  BEGIN PGM PROBE_CORNER MM
1  ; Find corner and set datum
2  Q1 = 20           ; Search distance
3  Q2 = 500          ; Feed
4  
5  TOOL CALL 99 Z    ; Touch probe
6  L  Z+50 FMAX
7  
8  ; Position near expected corner
9  L  X-10 Y-10 FMAX
10 L  Z-10 FMAX
11
12 ; Probe X edge
13 CYCL DEF 1.0 PECKING
14 CYCL DEF 1.1 SET UP +2
15 CYCL DEF 1.2 DEPTH +Q1
16 CYCL DEF 1.3 PECKG +5
17 CYCL DEF 1.4 DWELL +0
18
19 ; Touch probe cycle for X surface
20 TCH PROBE 421 PROBE SLOT ~
      Q328=+10 ~
      Q321=-10 ~
      Q322=+5 ~
      Q320=+0 ~
      Q260=+50 ~
      Q301=+0 ~
      Q284=+1
21
22 ; Store X result
23 FN 18: SYSREAD Q10 = ID350 NR1
24
25 ; Move to probe Y
26 L  Y-10 X+10 FMAX
27
28 ; Touch probe for Y surface
29 TCH PROBE 421 PROBE SLOT ~
      Q328=+10 ~
      Q321=-10 ~
      Q322=+5 ~
      Q320=+0 ~
      Q260=+50 ~
      Q301=+0 ~
      Q284=+1
30
31 ; Store Y result
32 FN 18: SYSREAD Q11 = ID350 NR1
33
34 ; Set datum using results
35 CYCL DEF 7.0 DATUM SHIFT
36 CYCL DEF 7.1  X+Q10
37 CYCL DEF 7.2  Y+Q11
38
39 L  Z+50 FMAX
40 END PGM PROBE_CORNER MM
```

### Example 10: Complete Part with Tool Life Check

```heidenhain
0  BEGIN PGM COMPLETE_PART MM
1  ;========================================
2  ; Program header
3  ; Part: Bracket
4  ; Material: 6061-T6 Aluminum
5  ;========================================
6  
7  Q100 = 1           ; Part counter
8  Q101 = 10          ; Target quantity
9  
10 BLK FORM 0.1 Z  X+0  Y+0  Z-25
11 BLK FORM 0.2  X+120  Y+80  Z+0
12
13 ;========= OPERATION 10: FACE ==========
14 LBL 10
15   TOOL CALL 1 Z S2500 F1000
16   L  Z+50 FMAX M3
17   M8
18   L  X-30 Y-20 FMAX
19   L  Z+2 FMAX
20   L  Z+0 F1000
21   L  X+150 F800
22   L  Y+40
23   L  X-30
24   L  Y+100
25   L  X+150
26   L  Z+50 FMAX
27 LBL 0
28
29 ;========= OPERATION 20: DRILL =========
30 LBL 20
31   TOOL CALL 2 Z S2000 F180
32   L  Z+50 FMAX M3
33   
34   CYCL DEF 203 UNIVERSAL DRILLING ~
35        Q200=+2 ~
36        Q201=-20 ~
37        Q206=+150 ~
38        Q202=+5 ~
39        Q210=+0 ~
40        Q203=+0 ~
41        Q204=+50 ~
42        Q212=+0.5 ~
43        Q213=+0 ~
44        Q205=+2
45   
46   CYCL DEF 221 HOLE CIRCLE ~
47        Q216=+60 ~
48        Q217=+40 ~
49        Q244=+50 ~
50        Q245=+45 ~
51        Q246=+4 ~
52        Q247=+360 ~
53        Q241=+1 ~
54        Q200=+2 ~
55        Q203=+0 ~
56        Q204=+50 ~
57        Q301=+1
58   
59   CYCL CALL
60   L  Z+50 FMAX
61 LBL 0
62
63 ;======= OPERATION 30: POCKET ==========
64 LBL 30
65   TOOL CALL 3 Z S4000 F500
66   L  Z+50 FMAX M3
67   L  X+60 Y+40 FMAX
68   L  Z+2 FMAX
69   
70   CYCL DEF 251 RECTANGULAR POCKET ~
71        Q215=+0 ~
72        Q218=+60 ~
73        Q219=+40 ~
74        Q220=+5 ~
75        Q368=+0.2 ~
76        Q224=+0 ~
77        Q367=+0 ~
78        Q207=+400 ~
79        Q351=+1 ~
80        Q201=-15 ~
81        Q202=+3 ~
82        Q369=+0 ~
83        Q206=+200 ~
84        Q338=+0.1 ~
85        Q200=+2 ~
86        Q203=+0 ~
87        Q204=+30 ~
88        Q370=+1 ~
89        Q366=+1
90   
91   CYCL CALL
92   L  Z+50 FMAX
93 LBL 0
94
95 ;======== PROGRAM END ===================
96 L  Z+100 FMAX M9
97 M5
98 
99 ; Increment part counter
100 FN 1: Q100 = +Q100 + +1
101 
102 ; Display message
103 * PART Q100 COMPLETE
104
105 ; Check if more parts needed
106 FN 9: IF +Q100 GT +Q101 GOTO LBL 99
107 M0                 ; Wait for next part
108 GOTO LBL 10        ; Restart from face
109
110 LBL 99
111 * ALL Q101 PARTS COMPLETE
112 M30
113 END PGM COMPLETE_PART MM
```

---

*END OF PART 1*
*Part 2 will contain: 5-axis PLANE function, touch probe cycles, advanced FK programming, alarm reference, examples 11-20*


---

## PART 2: ADVANCED HEIDENHAIN PROGRAMMING

---

## Section 11: 5-Axis Programming - PLANE Function

### PLANE Function Overview

The PLANE function is Heidenhain's powerful 5-axis tilted working plane feature. It allows programming in a tilted coordinate system while the control calculates the required rotary axis positions.

### PLANE Definition Methods

```
; Method 1: PLANE SPATIAL - Euler angles (most common)
PLANE SPATIAL SPA+30 SPB+0 SPC+45 STAY

; Method 2: PLANE PROJECTED - Projection angles
PLANE PROJECTED PROPR+30 PROMIN+0 STAY

; Method 3: PLANE EULER - Classic Euler angles
PLANE EULER EUL+30 EUL+0 EUL+45 STAY

; Method 4: PLANE VECTOR - Tool and normal vectors
PLANE VECTOR BX+0 BY+0.5 BZ+0.866 NX+0 NY-0.866 NZ+0.5 STAY

; Method 5: PLANE POINTS - Three points define plane
PLANE POINTS P1X+0 P1Y+0 P1Z+0 P2X+100 P2Y+0 P2Z+0 P3X+0 P3Y+100 P3Z+10 STAY

; Method 6: PLANE RELATIVE - Relative to current plane
PLANE RELATIVE SPA+15 STAY

; Method 7: PLANE AXIAL - Direct rotary axis values
PLANE AXIAL A+30 C+45 STAY
```

### PLANE Parameters

```
; Positioning behavior (required - choose one)
STAY           ; Rotary axes move, tool tip stays in position
MOVE           ; Rotary axes move, tool moves with table
TABLE ROT      ; Table rotates only (if applicable)
COORD ROT      ; Coordinate rotation only (no axis movement)

; Automatic positioning (with MOVE)
DIST+10        ; Approach distance from part
SYM+0          ; Symmetry option (SEQ+/SEQ-/SYM+/SYM-)

; Feed rate for tilting
F1000          ; Feed rate for rotary axes

; Coordinate transformation options
SEQ+           ; Positive solution for rotary axes
SEQ-           ; Negative solution for rotary axes
SYM+           ; Symmetric positive solution
SYM-           ; Symmetric negative solution
```

### PLANE SPATIAL Angles Explained

```
;          Z (tool axis)
;          │
;          │   SPA = Rotation about X (tilt forward/back)
;          │   SPB = Rotation about Y (tilt left/right)  
;          │   SPC = Rotation about Z (rotation in XY plane)
;     ─────┼─────Y
;         /
;        /
;       X
;
; Order of rotations: SPC → SPB → SPA (reversed from entry order)
```

### PLANE Reset and Status

```
; Reset to normal (horizontal) plane
PLANE RESET STAY

; Read current plane angles
FN 18: SYSREAD Q10 = ID270 NR1 IDX1   ; SPA angle
FN 18: SYSREAD Q11 = ID270 NR1 IDX2   ; SPB angle
FN 18: SYSREAD Q12 = ID270 NR1 IDX3   ; SPC angle

; Check if plane is active
FN 18: SYSREAD Q20 = ID270 NR2        ; 0=reset, 1=active
```

### Tool Center Point (TCP) Control

```
; With TCPM (Tool Center Point Management)
FUNCTION TCPM F TCP AXIS POS PATHCTRL AXIS
;   F TCP = Tool tip stays at programmed position
;   AXIS POS = Rotary axes move to position
;   PATHCTRL AXIS = Path compensation on rotary axes

; Without TCPM (older method)
M128         ; Activate TCPM
M129         ; Deactivate TCPM

; Tool orientation vector (simultaneous 5-axis)
L  X+50 Y+30 Z+10 A+25 C+60 F1000 M128
```

### 5-Axis Positioning Strategies

```
; Strategy 1: Tilt then machine (3+2 axis)
PLANE SPATIAL SPA+30 SPB+0 SPC+0 STAY
L  Z+50 FMAX                    ; Retract
L  X+0 Y+0 FMAX                 ; Position XY
L  Z+2 F1000                    ; Approach
; ... machine in tilted plane ...
L  Z+50 FMAX
PLANE RESET STAY

; Strategy 2: Simultaneous 5-axis with TCPM
FUNCTION TCPM F TCP AXIS POS PATHCTRL AXIS
L  X+0 Y+0 Z+5 A+0 C+0 F500
L  X+50 Y+0 Z+3 A+15 C+0 F500   ; Tool tilts while moving
L  X+100 Y+0 Z+5 A+0 C+0 F500
FUNCTION RESET TCPM
```

---

## Section 12: Touch Probe Cycles (TCH PROBE)

### Probing Fundamentals

```
; Tool call for probe (typically T99 or similar)
TOOL CALL 99 Z S0

; Standard safety clearance
L  Z+100 FMAX M3                ; Actually M3 not needed for probing

; Probe feed rate set in machine parameters or:
; Q Speed parameter in cycles
```

### Basic Probing Cycles

```
; TCH PROBE 400 - Basic datum in axis
TCH PROBE 400 BASIC DATUM IN AXIS ~
    Q263=+1 ~           ; Measuring axis (1=X, 2=Y, 3=Z)
    Q264=-5 ~           ; 1st point (approach coordinate)
    Q261=+100 ~         ; Measuring height
    Q320=+2 ~           ; Set-up clearance
    Q260=+10 ~          ; Clearance height
    Q272=+1 ~           ; Measuring axis (1=linear, 2=rotary)
    Q267=+0 ~           ; Traverse direction (0=negative, 1=positive)
    Q305=+0 ~           ; Result in datum table (0=no, n=row number)
    Q333=+0 ~           ; Datum number to set

; TCH PROBE 403 - Datum in Y axis
TCH PROBE 403 BASIC DATUM IN Y AXIS ~
    Q263=+1 ~           ; Measuring point coordinate
    Q264=-50 ~          ; 1st point (approach)
    Q261=+100 ~         ; Measuring height
    Q320=+2 ~           ; Set-up clearance
    Q260=+10 ~          ; Clearance height
    Q305=+0             ; Datum table row

; TCH PROBE 404 - Datum in Z axis (surface)
TCH PROBE 404 BASIC DATUM IN Z AXIS ~
    Q263=+0 ~           ; 1st point X
    Q264=+0 ~           ; 1st point Y
    Q261=+5 ~           ; Measuring height (pre-position)
    Q320=+2 ~           ; Set-up clearance
    Q260=+50 ~          ; Clearance height
    Q305=+0             ; Datum table row
```

### Edge and Corner Finding

```
; TCH PROBE 410 - Datum edge
TCH PROBE 410 DATUM OUTSIDE CORNER ~
    Q263=+5 ~           ; 1st point, 1st axis
    Q264=+5 ~           ; 1st point, 2nd axis  
    Q294=+95 ~          ; 2nd point, 1st axis
    Q295=+95 ~          ; 2nd point, 2nd axis
    Q261=-5 ~           ; Measuring height
    Q320=+2 ~           ; Set-up clearance
    Q260=+50 ~          ; Clearance height
    Q301=+0 ~           ; Move to clearance (0=no, 1=yes)
    Q305=+0 ~           ; Datum table row
    Q405=+0             ; Datum number

; TCH PROBE 411 - Datum outside corner (L-shape)
TCH PROBE 411 DATUM OUTSIDE CORNER ~
    Q263=+5 ~           ; 1st point, 1st axis
    Q264=+50 ~          ; 1st point, 2nd axis
    Q294=+50 ~          ; 2nd point, 1st axis
    Q295=+5 ~           ; 2nd point, 2nd axis
    Q261=-5 ~           ; Measuring height
    Q320=+2 ~           ; Set-up clearance
    Q260=+50 ~          ; Clearance height
    Q301=+1 ~           ; Move to clearance
    Q305=+0 ~           ; Datum table row
    Q405=+0             ; Datum number

; TCH PROBE 412 - Datum inside corner (pocket corner)
TCH PROBE 412 DATUM INSIDE CORNER ~
    Q263=+5 ~           ; 1st point, 1st axis
    Q264=+50 ~          ; 1st point, 2nd axis
    Q294=+50 ~          ; 2nd point, 1st axis
    Q295=+5 ~           ; 2nd point, 2nd axis
    Q261=-5 ~           ; Measuring height
    Q320=+2 ~           ; Set-up clearance
    Q260=+50 ~          ; Clearance height
    Q301=+1 ~           ; Move to clearance
    Q305=+0             ; Datum table row
```

### Center Finding

```
; TCH PROBE 421 - Measure hole/boss center
TCH PROBE 421 MEASURING CIRCULAR STUD ~
    Q273=+0 ~           ; Center 1st axis
    Q274=+0 ~           ; Center 2nd axis
    Q262=+50 ~          ; Nominal diameter
    Q325=+0 ~           ; Starting angle
    Q247=+90 ~          ; Angular step (90=4 points)
    Q261=-5 ~           ; Measuring height
    Q320=+2 ~           ; Set-up clearance
    Q260=+50 ~          ; Clearance height
    Q301=+1 ~           ; Move to clearance
    Q275=+0 ~           ; Stud/Hole (0=stud, 1=hole)
    Q305=+0 ~           ; Datum table row
    Q331=+0             ; Reference angle

; Result Q-parameters after TCH PROBE 421:
; Q151 = Measured center 1st axis
; Q152 = Measured center 2nd axis
; Q153 = Measured diameter

; TCH PROBE 422 - Measure slot/web center
TCH PROBE 422 MEASURING SLOT/WEB ~
    Q273=+0 ~           ; Center 1st axis
    Q274=+0 ~           ; Center 2nd axis
    Q282=+50 ~          ; Nominal width
    Q261=-5 ~           ; Measuring height
    Q320=+2 ~           ; Set-up clearance
    Q260=+50 ~          ; Clearance height
    Q301=+1 ~           ; Move to clearance
    Q275=+0 ~           ; Slot/Web (0=slot, 1=web)
    Q263=+1 ~           ; Measuring axis (1=1st, 2=2nd)
    Q305=+0             ; Datum table row
```

### Probe Result Variables

```
; Standard result parameters:
Q150 = Measured value 1st axis
Q151 = Measured center 1st axis
Q152 = Measured center 2nd axis
Q153 = Measured diameter
Q154 = Measured length (slot)
Q155 = Measured angle (rotation)
Q156 = Measured spacing
Q157 = Deviation (actual - nominal)
Q158 = Measured depth/height
Q159 = 3D probing deviation
Q160-Q166 = Extended results
Q180-Q182 = Actual position XYZ at probe contact
Q183-Q185 = Deviation from nominal XYZ
Q186 = Maximum deviation
Q187 = Measured angle

; Read probed position directly:
FN 18: SYSREAD Q10 = ID970 NR1   ; Last probe X
FN 18: SYSREAD Q11 = ID970 NR2   ; Last probe Y
FN 18: SYSREAD Q12 = ID970 NR3   ; Last probe Z
```

### Automatic Measurement Cycles

```
; TCH PROBE 425 - Measure rectangle outside
TCH PROBE 425 MEASURING PROTRUSION ~
    Q273=+50 ~          ; Center 1st axis
    Q274=+25 ~          ; Center 2nd axis
    Q282=+100 ~         ; Nominal length 1st axis
    Q283=+50 ~          ; Nominal length 2nd axis
    Q261=-5 ~           ; Measuring height
    Q320=+2 ~           ; Set-up clearance
    Q260=+50 ~          ; Clearance height
    Q301=+1 ~           ; Move to clearance
    Q284=+1 ~           ; 1st axis probe count (1-4)
    Q285=+1 ~           ; 2nd axis probe count
    Q331=+0 ~           ; Reference angle
    Q305=+0             ; Datum table row

; TCH PROBE 426 - Measure rectangle inside (pocket)
TCH PROBE 426 MEASURING POCKET ~
    Q273=+50 ~          ; Center 1st axis
    Q274=+25 ~          ; Center 2nd axis
    Q282=+100 ~         ; Nominal length 1st axis
    Q283=+50 ~          ; Nominal length 2nd axis
    Q261=-5 ~           ; Measuring height
    Q320=+2 ~           ; Set-up clearance
    Q260=+50 ~          ; Clearance height
    Q301=+1 ~           ; Move to clearance
    Q284=+1 ~           ; 1st axis probe count
    Q285=+1 ~           ; 2nd axis probe count
    Q331=+0 ~           ; Reference angle
    Q305=+0             ; Datum table row
```

---

## Section 13: FK Free Contour Programming

### FK Fundamentals

FK (Free Contour) programming allows defining geometry from incomplete dimension data, similar to how drawings are dimensioned. The control calculates the missing elements.

### FK Block Types

```
; FPOL - Define pole point (origin for FK calculations)
FPOL X+50 Y+50

; FL - FK Linear element
FL X+100                ; Only X known, Y calculated
FL Y+80                 ; Only Y known, X calculated  
FL AN+45                ; Line at 45° angle
FL IX+20                ; Incremental X
FL LEN 50 AN+30         ; Length 50, angle 30°

; FC - FK Circular element  
FC DR+ R20              ; Arc clockwise radius 20
FC DR- R20              ; Arc counter-clockwise radius 20

; FCT - FK Tangent arc
FCT DR+ R15             ; Tangent arc clockwise

; FLT - FK Tangent line
FLT                     ; Line tangent to previous element

; FSELECT - Select solution when multiple exist
FSELECT 1               ; Select solution 1
FSELECT 2               ; Select solution 2
```

### FK Auxiliary Data

```
; Reference elements (connect FK to known geometry)
; PAR = Parallel to
; PARAX = Parallel to axis
; ANG = Angle from known point
; TANGENT = Tangent to element

; Example: Line parallel to another
FL AN+0 PAR Q50         ; Parallel at distance Q50

; Distance specifications
; DP = Distance to point
; DPR = Distance to point (relative)
; DL = Distance to line  
; DA = Distance along arc

FL DP 100 X+0 Y+0       ; 100mm from origin

; Angle references
; AN = Absolute angle
; IAN = Incremental angle from last element

FL AN+45                ; Line at 45°
FL IAN+30               ; 30° from previous direction
```

### FK Programming Example

```
BEGIN PGM FK_EXAMPLE MM
BLK FORM 0.1 Z X-10 Y-10 Z-20
BLK FORM 0.2 X+110 Y+60 Z+0
TOOL CALL 1 Z S3000 F500

L  Z+5 FMAX
L  X-10 Y+25 FMAX
L  Z-5 F300

; Start contour with cutter compensation
APPR LCT X+0 Y+25 R5 RL F500

; FK Section - only partial dimensions known
FPOL X+0 Y+0                    ; Set pole at origin

FL X+0                          ; Vertical line on left
FL Y+50                         ; Top left known
FL AN+0                         ; Horizontal to right, endpoint calculated
FC DR- R10                      ; Fillet radius 10
FL X+100                        ; Right edge known
FL Y+0                          ; Back to bottom
FL AN+180                       ; Horizontal to left
FC DR- R10                      ; Another fillet
FL X+0 Y+25                     ; Close to start

; End contour
DEP LCT X-10 Y+25 R5

L  Z+50 FMAX
END PGM FK_EXAMPLE MM
```

### FK with Circles

```
; FK circular reference
FPOL X+50 Y+30                  ; Pole at center

FC DR+ R25                      ; Clockwise arc R25
FC DR- R25 CCX+50 CCY+30        ; Specify center
FC DR+ R30 CC X+50 Y+30         ; Alternative center syntax

; Tangent connections
FCT DR+ R10                     ; Tangent arc continuing direction
FLT AN+0                        ; Tangent line continuing

; Arc to point
FC DR+ R20 X+80 Y+40            ; Arc to specific point
```

---

## Section 14: Advanced Cycles

### CYCLE 32 - Tolerance

```
; Define tolerance for high-speed machining
CYCL DEF 32 TOLERANCE ~
    Q1=+0.05                    ; Tolerance in mm
```

### CYCLE 19 - Working Plane (Legacy 5-Axis)

```
; Older 5-axis plane definition (superseded by PLANE)
CYCL DEF 19 WORKING PLANE ~
    Q244=+30 ~                  ; Angle A
    Q245=+0 ~                   ; Angle B
    Q246=+45                    ; Angle C
```

### CYCLE 225 - Engraving

```
CYCL DEF 225 ENGRAVING ~
    Q1= ;"TEXT TO ENGRAVE" ~    ; Text string
    Q2=+0 ~                     ; Position X
    Q3=+0 ~                     ; Position Y
    Q4=+8 ~                     ; Character height
    Q5=+0 ~                     ; Spacing factor
    Q6=+0 ~                     ; Rotation angle
    Q7=-0.3 ~                   ; Engraving depth
    Q8=+1                       ; Font (1=standard, 2=bold)
```

### CYCLE 233 - Face Milling

```
CYCL DEF 233 FACE MILLING ~
    Q215=+0 ~                   ; Machining type (0=roughing, 1=finish)
    Q218=+100 ~                 ; Length 1st axis
    Q219=+80 ~                  ; Length 2nd axis
    Q227=+0 ~                   ; Start point 3rd axis
    Q386=+0 ~                   ; End point 3rd axis
    Q369=+0.2 ~                 ; Finishing allowance
    Q202=+3 ~                   ; Plunging depth
    Q370=+1 ~                   ; Path overlap factor
    Q207=+500 ~                 ; Feed rate milling
    Q385=+500 ~                 ; Feed rate finishing
    Q253=+750 ~                 ; Pre-positioning feed
    Q200=+2 ~                   ; Set-up clearance
    Q357=+0 ~                   ; Safe clearance for intermediate
    Q204=+50                    ; 2nd set-up clearance
```

### CYCLE 256 - Rectangular Boss

```
CYCL DEF 256 RECTANGULAR BOSS ~
    Q218=+80 ~                  ; Length 1st side
    Q424=+60 ~                  ; Length 2nd side  
    Q219=+0 ~                   ; Corner radius
    Q368=+0.5 ~                 ; Finishing allowance side
    Q224=+0 ~                   ; Rotation angle
    Q367=+0 ~                   ; Boss position (0=center)
    Q207=+400 ~                 ; Feed rate milling
    Q351=+1 ~                   ; Milling direction
    Q201=-20 ~                  ; Depth
    Q202=+4 ~                   ; Plunging depth
    Q369=+0.2 ~                 ; Finishing allowance floor
    Q206=+200 ~                 ; Feed rate plunging
    Q338=+0.5 ~                 ; Infeed finishing
    Q385=+600 ~                 ; Feed rate finishing
    Q200=+2 ~                   ; Set-up clearance
    Q203=+0 ~                   ; Surface coordinate
    Q204=+50 ~                  ; 2nd set-up clearance
    Q370=+1                     ; Path overlap
```

---

## Section 15: SL Contour Programming (Subcontour Pockets)

### SL Contour Overview

SL cycles define complex pockets using contour sublabels. This separates geometry definition from machining parameters.

### Contour Definition

```
; Define island or pocket contour in labeled sections
LBL 1                           ; Contour label
L  X+10 Y+10 RL                 ; Start point
L  X+90                         ; Right side
L  Y+50                         ; Top
L  X+10                         ; Left side
L  Y+10                         ; Close
LBL 0                           ; End contour

; Second contour (island)
LBL 2
CC X+50 Y+30                    ; Island center
C  DR- R15 X+50 Y+45            ; Circle as island
LBL 0
```

### CYCLE 14 - Contour Definition

```
; Define which contours to use
CYCL DEF 14 CONTOUR ~
    Q1= ;"POCKET.H" ~           ; External file with contours
                                ; or use internal labels

; For internal labels:
CYCL DEF 14 CONTOUR ~
    Q1= ;"" ~                   ; Empty = internal
    Q2=+1 ~                     ; Label number for pocket
    Q3=+2 ~                     ; Label number for island 1
    Q4=+0                       ; No more islands (0 terminates)
```

### CYCLE 270 - Contour Data

```
CYCL DEF 270 CONTOUR DATA ~
    Q1=+0 ~                     ; Approach mode
    Q2=+0 ~                     ; Machining direction
    Q3=+0                       ; Contour direction
```

### CYCLE 271 - Contour Pocket Roughing

```
CYCL DEF 271 CONTOUR POCKET DATA ~
    Q215=+0 ~                   ; Machining type (0=roughing)
    Q369=+0.5 ~                 ; Finishing allowance side
    Q202=+4 ~                   ; Plunging depth per pass
    Q370=+1 ~                   ; Path overlap (1=100%)
    Q207=+400 ~                 ; Feed rate milling
    Q206=+200 ~                 ; Feed rate plunging
    Q200=+2 ~                   ; Set-up clearance
    Q203=+0 ~                   ; Surface coordinate
    Q204=+50 ~                  ; 2nd set-up clearance
    Q201=-20 ~                  ; Depth
    Q368=+0.2 ~                 ; Finishing allowance floor
    Q338=+0                     ; Infeed finishing
```

### CYCLE 272 - Contour Pocket Finishing

```
CYCL DEF 272 CONTOUR FINISHING ~
    Q215=+1 ~                   ; Machining type (1=finishing)
    Q369=+0 ~                   ; Allowance (0 for finishing)
    Q338=+0.1 ~                 ; Finishing infeed
    Q385=+600 ~                 ; Feed rate finishing
    Q200=+2 ~                   ; Set-up clearance
    Q203=+0 ~                   ; Surface coordinate
    Q204=+50 ~                  ; 2nd set-up clearance
    Q201=-20                    ; Depth
```

### Complete SL Pocket Example

```
BEGIN PGM SL_POCKET MM
BLK FORM 0.1 Z X+0 Y+0 Z-30
BLK FORM 0.2 X+100 Y+80 Z+0
TOOL CALL 1 Z S4000 F600

;======== CONTOUR DEFINITIONS ============
; Outer pocket boundary
LBL 10
L  X+5 Y+5 RL F600
L  X+95 Y+5
RND R5
L  X+95 Y+75
RND R5
L  X+5 Y+75
RND R5
L  X+5 Y+5
RND R5
LBL 0

; Circular island
LBL 20
CC X+50 Y+40
C  DR- R12 X+50 Y+52
LBL 0

; Square island
LBL 30
L  X+15 Y+55 RL
L  X+35 Y+55
L  X+35 Y+65
L  X+15 Y+65
L  X+15 Y+55
LBL 0

;======== MACHINING =====================
L  Z+50 FMAX
L  X+50 Y+40 FMAX              ; Position over pocket

; Define contour reference
CYCL DEF 14 CONTOUR
Q1=""
Q2=+10                          ; Pocket outline
Q3=+20                          ; Island 1 (circle)
Q4=+30                          ; Island 2 (square)
Q5=+0                           ; End of contours

; Roughing
CYCL DEF 271 CONTOUR POCKET DATA ~
    Q215=+0 ~
    Q369=+0.3 ~
    Q202=+4 ~
    Q370=+1 ~
    Q207=+500 ~
    Q206=+250 ~
    Q200=+2 ~
    Q203=+0 ~
    Q204=+50 ~
    Q201=-20 ~
    Q368=+0.2 ~
    Q338=+0

CYCL CALL

; Change to finishing tool
TOOL CALL 2 Z S5000 F800

; Finishing walls
CYCL DEF 272 CONTOUR FINISHING ~
    Q215=+1 ~
    Q369=+0 ~
    Q338=+0.1 ~
    Q385=+800 ~
    Q200=+2 ~
    Q203=+0 ~
    Q204=+50 ~
    Q201=-20

CYCL CALL

L  Z+100 FMAX M5
END PGM SL_POCKET MM
```

---

## Section 16: Alarm Reference

### Program Errors (Category: Programming)

| Alarm | Message | Cause | Solution |
|-------|---------|-------|----------|
| **FE 0** | Function not allowed | Command not available in current mode | Check programming mode |
| **FE 1** | Unknown operation | Unrecognized command | Check spelling |
| **FE 2** | Syntax error | Invalid block format | Review block structure |
| **FE 3** | Value missing | Required parameter not specified | Add missing value |
| **FE 4** | Value not valid | Parameter out of range | Check min/max limits |
| **FE 5** | Divide by zero | Division result undefined | Check Q-parameter math |
| **FE 6** | SQRT of negative | Square root of negative number | Validate input value |
| **FE 7** | LOG of ≤0 | Logarithm domain error | Check Q-parameter |
| **FE 8** | TAN 90° | Tangent undefined at 90° | Adjust angle value |
| **FE 9** | ASIN/ACOS range | Arc function input >1 or <-1 | Validate input |
| **FE 10** | String too long | QS string exceeds limit | Shorten string |

### File Errors

| Alarm | Message | Cause | Solution |
|-------|---------|-------|----------|
| **FE 100** | File not found | Program file doesn't exist | Check path and name |
| **FE 101** | Path not found | Directory doesn't exist | Verify directory |
| **FE 102** | File locked | File in use by another process | Close other access |
| **FE 103** | Disk full | Storage capacity exceeded | Delete files or archive |
| **FE 104** | Write protected | File or disk is read-only | Change permissions |
| **FE 105** | Invalid file name | Illegal characters in name | Rename file |
| **FE 106** | Label not found | Called LBL doesn't exist | Check label numbers |
| **FE 107** | Too many open files | File handle limit reached | Close unused files |

### Motion Errors

| Alarm | Message | Cause | Solution |
|-------|---------|-------|----------|
| **FE 200** | Software limit axis + | Positive travel limit | Check position/program |
| **FE 201** | Software limit axis - | Negative travel limit | Check position/program |
| **FE 202** | Circle radius too small | Arc geometry impossible | Increase radius |
| **FE 203** | Start = End point | Circle endpoint error | Check circle definition |
| **FE 204** | Compensation impossible | Radius comp geometry error | Check approach/contour |
| **FE 205** | Rapid too fast | Override required reduced | Adjust feed override |
| **FE 206** | Feed too high | Feed rate exceeds limit | Reduce F value |
| **FE 207** | Spindle speed exceeded | RPM over maximum | Reduce S value |
| **FE 208** | Contour violation | Cutter comp into contour | Redesign approach |
| **FE 209** | Axis not referenced | Home position required | Reference machine |

### Tool Errors

| Alarm | Message | Cause | Solution |
|-------|---------|-------|----------|
| **FE 300** | Tool not defined | T-number not in table | Add tool to table |
| **FE 301** | Tool not in magazine | Tool T not available | Load tool |
| **FE 302** | Tool length undefined | L value = 0 or missing | Measure tool |
| **FE 303** | Tool radius undefined | R value missing | Enter radius |
| **FE 304** | Tool life exceeded | Monitoring limit reached | Replace tool |
| **FE 305** | Tool breakage | Breakage detected | Check/replace tool |
| **FE 306** | Spindle not empty | Tool already in spindle | Execute M6 |
| **FE 307** | Magazine full | No empty pocket | Unload tools |
| **FE 308** | Wrong tool in spindle | T number mismatch | Manual intervention |

### Cycle Errors

| Alarm | Message | Cause | Solution |
|-------|---------|-------|----------|
| **FE 400** | Cycle parameter missing | Required Q missing | Check cycle parameters |
| **FE 401** | Cycle parameter range | Q value out of limits | Adjust value |
| **FE 402** | Tool radius too large | Tool won't fit in feature | Use smaller tool |
| **FE 403** | Depth value invalid | Q201/similar wrong sign | Check depth entry |
| **FE 404** | Plane undefined | G17/G18/G19 required | Set working plane |
| **FE 405** | Tool axis undefined | TOOL CALL Z/Y required | Specify tool axis |
| **FE 406** | Invalid pocket geometry | Pocket dimensions error | Check Q parameters |
| **FE 407** | Invalid thread pitch | Pitch not compatible | Verify thread spec |

### Probe Errors

| Alarm | Message | Cause | Solution |
|-------|---------|-------|----------|
| **FE 500** | Probe not deflected | Surface not contacted | Check probe position |
| **FE 501** | Probe already deflected | Probe stuck or broken | Check stylus |
| **FE 502** | Probe signal lost | Connection error | Check probe cable |
| **FE 503** | Measured value exceeded | Result outside tolerance | Check part/program |
| **FE 504** | Datum table full | No empty rows | Clear old data |
| **FE 505** | Calibration required | Probe needs calibration | Run calibration cycle |

### PLANE/5-Axis Errors

| Alarm | Message | Cause | Solution |
|-------|---------|-------|----------|
| **FE 600** | PLANE not possible | Requested angle unreachable | Check machine limits |
| **FE 601** | TCPM not active | M128/FUNCTION TCPM needed | Activate TCPM |
| **FE 602** | Singularity | 5-axis singularity point | Avoid 0° tilt position |
| **FE 603** | Rotary axis limit | A or C axis limit hit | Reposition part |
| **FE 604** | Multiple solutions | PLANE requires SEQ/SYM | Specify solution |
| **FE 605** | Kinematics undefined | Machine model not set | Check machine parameters |

### Communication/PLC Errors

| Alarm | Message | Cause | Solution |
|-------|---------|-------|----------|
| **FE 700** | Emergency stop | E-Stop pressed | Release E-Stop |
| **FE 701** | Feed hold | External feed hold signal | Check PLC |
| **FE 702** | Axis drive fault | Drive error | Check drive status |
| **FE 703** | Encoder error | Position feedback lost | Check encoder |
| **FE 704** | Following error | Position deviation exceeded | Reduce feed/check drive |
| **FE 705** | Overtravel | Hardware limit switch | Jog opposite direction |
| **FE 706** | PLC timeout | PLC communication lost | Restart control |
| **FE 707** | Lubrication fault | Lube pressure/level error | Check lube system |
| **FE 708** | Coolant fault | Coolant system error | Check coolant system |

### Quick Troubleshooting

```
; Most common alarms and quick fixes:

; "Tool not defined" - FE 300
;   → Check tool number in TOOL CALL matches tool table
;   → Verify tool table file is loaded

; "Software limit" - FE 200/201  
;   → Part setup too close to limit
;   → Work offset incorrect
;   → Program coordinates wrong

; "Compensation impossible" - FE 204
;   → Approach too short for tool radius
;   → Contour smaller than tool diameter
;   → Inside corner sharper than tool radius

; "Label not found" - FE 106
;   → LBL number doesn't exist
;   → External file path incorrect
;   → Missing LBL 0 end marker

; "PLANE not possible" - FE 600
;   → Machine can't reach requested angle
;   → Part position requires impossible tilt
;   → Try different PLANE solution (SEQ+/SEQ-/SYM)
```

---

## Section 17: Programming Examples 11-20

### Example 11: 5-Axis Tilted Face

```
BEGIN PGM TILT_FACE MM
BLK FORM 0.1 Z X+0 Y+0 Z-50
BLK FORM 0.2 X+100 Y+80 Z+0
TOOL CALL 3 Z S3500 F800

; Approach safely
L  Z+100 FMAX M3
L  X+50 Y+40 FMAX

; Tilt plane 30 degrees about X axis
PLANE SPATIAL SPA+30 SPB+0 SPC+0 STAY

; Now Z is perpendicular to tilted surface
L  Z+10 FMAX
L  Z+2 F200

; Face milling in tilted plane
Q10 = +0                        ; Start Y
Q11 = +60                       ; End Y
Q12 = +25                       ; Step over (80% of 32mm tool)

LBL 1
L  X-5 Y+Q10 F800
L  X+105
FN 1: Q10 = +Q10 + +Q12
FN 9: IF +Q10 GT +Q11 GOTO LBL 2
L  X+105 Y+Q10
L  X-5
FN 1: Q10 = +Q10 + +Q12
FN 9: IF +Q10 LE +Q11 GOTO LBL 1

LBL 2
L  Z+20 FMAX

; Reset plane
PLANE RESET STAY

L  Z+100 FMAX
M5
END PGM TILT_FACE MM
```

### Example 12: Simultaneous 5-Axis Contour

```
BEGIN PGM SIM_5AXIS MM
BLK FORM 0.1 Z X-50 Y-50 Z-30
BLK FORM 0.2 X+50 Y+50 Z+0
TOOL CALL 5 Z S6000 F400

; Ball end mill for 5-axis
; Tool R5 ball nose

L  Z+50 FMAX M3

; Activate TCPM for simultaneous 5-axis
FUNCTION TCPM F TCP AXIS POS PATHCTRL AXIS

; Start position - tool vertical
L  X+0 Y-40 Z+0 A+0 C+0 FMAX

; 5-axis contour around part
; Tool tilts to maintain contact angle

L  Z-5 F200                     ; Plunge
L  X+0 Y-40 Z-5 A+15 C+0 F500   ; Tilt forward
L  X+40 Y+0 Z-5 A+15 C+90 F500  ; Move and rotate C
L  X+0 Y+40 Z-5 A+15 C+180 F500
L  X-40 Y+0 Z-5 A+15 C+270 F500
L  X+0 Y-40 Z-5 A+15 C+360 F500 ; Complete loop

; Return vertical and retract
L  A+0 C+0 F500
L  Z+50 FMAX

; Deactivate TCPM
FUNCTION RESET TCPM

M5
END PGM SIM_5AXIS MM
```

### Example 13: Automatic Part Measurement

```
BEGIN PGM AUTO_MEASURE MM
; Measure part dimensions and compare to nominal

BLK FORM 0.1 Z X+0 Y+0 Z-30
BLK FORM 0.2 X+100 Y+60 Z+0

; Nominal values
Q100 = +100                     ; Nominal length X
Q101 = +60                      ; Nominal length Y  
Q102 = +25                      ; Nominal depth
Q103 = +0.1                     ; Tolerance

TOOL CALL 99 Z                  ; Touch probe

L  Z+50 FMAX

; Measure part length (X direction)
TCH PROBE 422 MEASURING SLOT/WEB ~
    Q273=+50 ~                  ; Center X
    Q274=+30 ~                  ; Center Y
    Q282=+100 ~                 ; Nominal width
    Q261=-5 ~                   ; Measure height
    Q320=+2 ~
    Q260=+50 ~
    Q301=+1 ~
    Q275=+1 ~                   ; Web (outside)
    Q263=+1 ~                   ; X axis
    Q305=+0

; Q154 = Measured length
FN 2: Q110 = +Q154 - +Q100      ; Deviation X

; Measure part width (Y direction)
TCH PROBE 422 MEASURING SLOT/WEB ~
    Q273=+50 ~
    Q274=+30 ~
    Q282=+60 ~
    Q261=-5 ~
    Q320=+2 ~
    Q260=+50 ~
    Q301=+1 ~
    Q275=+1 ~
    Q263=+2 ~                   ; Y axis
    Q305=+0

FN 2: Q111 = +Q154 - +Q101      ; Deviation Y

; Measure depth (Z)
L  X+50 Y+30 FMAX
TCH PROBE 404 BASIC DATUM IN Z AXIS ~
    Q263=+50 ~
    Q264=+30 ~
    Q261=+5 ~
    Q320=+2 ~
    Q260=+50 ~
    Q305=+0

FN 18: SYSREAD Q112 = ID970 NR3 ; Measured Z
FN 2: Q112 = +Q112 - +0         ; Deviation from Z0

; Check tolerances
Q120 = +0                       ; Result: 0=OK, 1=FAIL

FN 11: Q113 = +ABS +Q110        ; Absolute deviation X
FN 9: IF +Q113 GT +Q103 GOTO LBL 90

FN 11: Q114 = +ABS +Q111        ; Absolute deviation Y
FN 9: IF +Q114 GT +Q103 GOTO LBL 90

; Part OK
* PART OK - X DEV: Q110 Y DEV: Q111
GOTO LBL 99

LBL 90
; Part out of tolerance
Q120 = +1
* PART REJECT - OUT OF TOLERANCE
* X DEV: Q110  Y DEV: Q111  Z DEV: Q112

LBL 99
L  Z+100 FMAX
M30
END PGM AUTO_MEASURE MM
```

### Example 14: Polar Coordinate Machining

```
BEGIN PGM POLAR_PATTERN MM
; Machine radial slots using polar coordinates

BLK FORM 0.1 Z X-60 Y-60 Z-20
BLK FORM 0.2 X+60 Y+60 Z+0
TOOL CALL 1 Z S4000 F500

; Pattern parameters
Q1 = +40                        ; Slot start radius
Q2 = +55                        ; Slot end radius
Q3 = +12                        ; Number of slots
Q4 = -8                         ; Slot depth
Q5 = +3                         ; Plunge per pass

; Calculate angle step
FN 4: Q10 = +360 / +Q3          ; Angle between slots

L  Z+50 FMAX M3

; Set pole at center
CC X+0 Y+0

Q20 = +0                        ; Current angle

LBL 1
; Position to slot start
LP PR+Q1 PA+Q20 FMAX            ; Polar position
L  Z+2 F500

; Mill slot outward
Q21 = +0                        ; Current depth

LBL 2
FN 2: Q21 = +Q21 - +Q5          ; Next depth
FN 9: IF +Q21 LT +Q4 GOTO LBL 3 ; Check final depth
GOTO LBL 4
LBL 3
Q21 = +Q4                       ; Limit to final depth
LBL 4

L  Z+Q21 F200                   ; Plunge
LP PR+Q2 PA+Q20 F500            ; Mill outward radially
LP PR+Q1 PA+Q20 FMAX            ; Return to start

FN 9: IF +Q21 GT +Q4 GOTO LBL 2 ; More passes needed?

L  Z+5 FMAX

; Next slot
FN 1: Q20 = +Q20 + +Q10
FN 9: IF +Q20 LT +360 GOTO LBL 1

L  Z+100 FMAX M5
END PGM POLAR_PATTERN MM
```

### Example 15: Deep Cavity with Multiple Tools

```
BEGIN PGM DEEP_CAVITY MM
BLK FORM 0.1 Z X+0 Y+0 Z-80
BLK FORM 0.2 X+120 Y+100 Z+0

; Tool sequence:
; T1 = 20mm rougher
; T2 = 10mm rougher  
; T3 = 6mm finisher
; T4 = 3mm ball for floor

Q1 = +120                       ; Pocket X
Q2 = +100                       ; Pocket Y
Q3 = -75                        ; Final depth
Q4 = +5                         ; Wall finish stock
Q5 = +0.3                       ; Floor finish stock

;========== ROUGH WITH T1 ==========
TOOL CALL 1 Z S3000 F600

L  Z+50 FMAX M3
L  X+60 Y+50 FMAX

; Rough leaving 5mm for smaller tool
CYCL DEF 251 RECTANGULAR POCKET ~
    Q215=+0 ~                   ; Roughing
    Q218=+Q1 ~                  ; Length X
    Q219=+Q2 ~                  ; Length Y
    Q220=+12 ~                  ; Corner radius
    Q368=+5 ~                   ; Side stock (for next tool)
    Q224=+0 ~
    Q367=+0 ~
    Q207=+600 ~
    Q351=+1 ~
    Q201=-45 ~                  ; Only go 45 deep with big tool
    Q202=+5 ~
    Q369=+0 ~
    Q206=+300 ~
    Q338=+0 ~
    Q200=+2 ~
    Q203=+0 ~
    Q204=+50 ~
    Q370=+1 ~
    Q366=+1

CYCL CALL
L  Z+50 FMAX

;========== ROUGH WITH T2 ==========
TOOL CALL 2 Z S4000 F500

L  X+60 Y+50 FMAX

; Continue deeper, leave wall stock
CYCL DEF 251 RECTANGULAR POCKET ~
    Q215=+0 ~
    Q218=+Q1 ~
    Q219=+Q2 ~
    Q220=+8 ~
    Q368=+Q4 ~                  ; Leave finish stock on walls
    Q224=+0 ~
    Q367=+0 ~
    Q207=+500 ~
    Q351=+1 ~
    Q201=+Q3 ~                  ; Full depth
    Q202=+4 ~
    Q369=+Q5 ~                  ; Leave floor stock
    Q206=+200 ~
    Q338=+0 ~
    Q200=+2 ~
    Q203=-40 ~                  ; Start below T1 cut
    Q204=+50 ~
    Q370=+1 ~
    Q366=+1

CYCL CALL
L  Z+50 FMAX

;========== FINISH WALLS T3 ==========
TOOL CALL 3 Z S6000 F400

L  X+60 Y+50 FMAX

; Finish walls only
CYCL DEF 251 RECTANGULAR POCKET ~
    Q215=+1 ~                   ; Finishing
    Q218=+Q1 ~
    Q219=+Q2 ~
    Q220=+5 ~                   ; Final corner radius
    Q368=+0 ~                   ; No stock = finish
    Q224=+0 ~
    Q367=+0 ~
    Q207=+400 ~
    Q351=+1 ~
    Q201=+Q3 ~
    Q202=+20 ~                  ; Finish in large steps
    Q369=+Q5 ~                  ; Leave floor for ball mill
    Q206=+200 ~
    Q338=+0.5 ~
    Q385=+600 ~
    Q200=+2 ~
    Q203=+0 ~
    Q204=+50 ~
    Q370=+1 ~
    Q366=+1

CYCL CALL
L  Z+50 FMAX

;========== FINISH FLOOR T4 ==========
TOOL CALL 4 Z S8000 F300

L  X+60 Y+50 FMAX

; Face mill floor pattern
Q10 = +6                        ; Start X
Q11 = +6                        ; Start Y
Q12 = +2                        ; Step over (2/3 of ball R3)

L  Z+Q3 F200                    ; Go to depth

LBL 10
L  X+Q10 Y+Q11 F300
L  Y+94                         ; Y traverse
FN 1: Q10 = +Q10 + +Q12
FN 9: IF +Q10 GT +114 GOTO LBL 11
L  X+Q10
L  Y+6
FN 1: Q10 = +Q10 + +Q12
FN 9: IF +Q10 LE +114 GOTO LBL 10

LBL 11
L  Z+100 FMAX M5
M30
END PGM DEEP_CAVITY MM
```

### Example 16: Spline/Curve with FK

```
BEGIN PGM FK_CURVE MM
BLK FORM 0.1 Z X+0 Y+0 Z-15
BLK FORM 0.2 X+150 Y+80 Z+0
TOOL CALL 1 Z S5000 F600

L  Z+10 FMAX M3
L  X-10 Y+40 FMAX
L  Z-5 F300

; Approach with tangent
APPR CT X+0 Y+40 CCA90 R+5 RL

; FK curve definition - partial data
FPOL X+0 Y+0

FL X+0 Y+40                     ; Start point
FCT DR+ R30                     ; Tangent arc
FL AN+0 LEN 40                  ; Horizontal 40mm
FCT DR- R20                     ; Reverse arc
FL AN-30                        ; Angled line down
FC DR+ R15 X+100 Y+20           ; Arc to specific point
FL X+140                        ; Horizontal to X140
FCT DR- R25                     ; Transition arc
FL Y+60                         ; Vertical up
FC DR- R35 X+100 Y+70           ; Large arc
FL X+50                         ; Horizontal back
FCT DR+ R15                     ; Smooth transition
FL AN+180 Y+40                  ; Back to Y40
FC DR+ R10 X+0 Y+40             ; Close the loop

; Depart tangent
DEP CT CCA90 R+5

L  Z+50 FMAX M5
END PGM FK_CURVE MM
```

### Example 17: Macro with Error Handling

```
BEGIN PGM SAFE_POCKET MM
; Robust pocket routine with error checking

BLK FORM 0.1 Z X+0 Y+0 Z-50
BLK FORM 0.2 X+100 Y+80 Z+0

; Input parameters (would come from caller)
Q1 = +80                        ; Pocket length
Q2 = +60                        ; Pocket width
Q3 = -25                        ; Pocket depth
Q4 = +5                         ; Corner radius
Q5 = +10                        ; Tool diameter

;======== ERROR CHECKING ==============
; Check pocket size vs tool
FN 2: Q10 = +Q4 - +Q5           ; Corner rad - tool diameter
FN 2: Q10 = +Q10 / +2           ; Half (clearance check)
FN 9: IF +Q10 LT +1 GOTO LBL 90 ; Need at least 1mm clearance

; Check minimum pocket size
FN 2: Q11 = +Q5 * +2            ; Min pocket = 2x tool diameter
FN 9: IF +Q1 LT +Q11 GOTO LBL 91
FN 9: IF +Q2 LT +Q11 GOTO LBL 91

; Check depth is negative
FN 9: IF +Q3 GE +0 GOTO LBL 92

; All checks passed - proceed
GOTO LBL 1

;======== ERROR HANDLERS ==============
LBL 90
* ERROR: TOOL TOO LARGE FOR CORNER RADIUS
* TOOL DIA: Q5  CORNER R: Q4
M0
M30

LBL 91
* ERROR: POCKET TOO SMALL FOR TOOL
* MIN SIZE: Q11 X Q11
M0
M30

LBL 92
* ERROR: DEPTH MUST BE NEGATIVE
* CURRENT VALUE: Q3
M0
M30

;======== MACHINING ==================
LBL 1
TOOL CALL 1 Z S4000 F500

L  Z+50 FMAX M3
L  X+Q1/2 Y+Q2/2 FMAX           ; Center of pocket

; Standard pocket cycle
CYCL DEF 251 RECTANGULAR POCKET ~
    Q215=+0 ~
    Q218=+Q1 ~
    Q219=+Q2 ~
    Q220=+Q4 ~
    Q368=+0.2 ~
    Q224=+0 ~
    Q367=+0 ~
    Q207=+500 ~
    Q351=+1 ~
    Q201=+Q3 ~
    Q202=+3 ~
    Q369=+0.1 ~
    Q206=+200 ~
    Q338=+0.5 ~
    Q385=+600 ~
    Q200=+2 ~
    Q203=+0 ~
    Q204=+50 ~
    Q370=+1 ~
    Q366=+1

CYCL CALL

L  Z+100 FMAX
* POCKET COMPLETE - NO ERRORS
M5
M30
END PGM SAFE_POCKET MM
```

### Example 18: Automated Setup with Probe

```
BEGIN PGM AUTO_SETUP MM
; Complete automated part setup with probing

BLK FORM 0.1 Z X+0 Y+0 Z-30
BLK FORM 0.2 X+100 Y+80 Z+0

TOOL CALL 99 Z                  ; Touch probe

L  Z+100 FMAX

; Approximate part location (from fixture)
Q100 = +50                      ; Approx center X
Q101 = +40                      ; Approx center Y

;======== FIND PART CORNER ===========
* PROBING PART CORNER...

; Find X edge (approach from left)
L  Y+Q101 FMAX
TCH PROBE 400 BASIC DATUM IN AXIS ~
    Q263=+1 ~                   ; X axis
    Q264=+5 ~                   ; Approach from X5
    Q261=+5 ~                   ; At Z5
    Q320=+2 ~
    Q260=+50 ~
    Q272=+1 ~
    Q267=+1 ~                   ; Positive direction
    Q305=+0 ~
    Q333=+0

; Store X edge
FN 18: SYSREAD Q110 = ID970 NR1
* X EDGE FOUND AT: Q110

; Find Y edge (approach from front)
L  X+Q100 FMAX
TCH PROBE 400 BASIC DATUM IN AXIS ~
    Q263=+2 ~                   ; Y axis
    Q264=+5 ~
    Q261=+5 ~
    Q320=+2 ~
    Q260=+50 ~
    Q272=+1 ~
    Q267=+1 ~
    Q305=+0 ~
    Q333=+0

FN 18: SYSREAD Q111 = ID970 NR2
* Y EDGE FOUND AT: Q111

;======== FIND TOP SURFACE ===========
* PROBING TOP SURFACE...

; Move over part center
FN 1: Q120 = +Q110 + +50        ; Approx center X from edge
FN 1: Q121 = +Q111 + +40        ; Approx center Y from edge

L  X+Q120 Y+Q121 FMAX

TCH PROBE 404 BASIC DATUM IN Z AXIS ~
    Q263=+Q120 ~
    Q264=+Q121 ~
    Q261=+10 ~
    Q320=+2 ~
    Q260=+50 ~
    Q305=+0

FN 18: SYSREAD Q112 = ID970 NR3
* TOP SURFACE AT: Q112

;======== SET WORK OFFSET ============
* SETTING DATUM...

; Set datum to part corner
CYCL DEF 7.0 DATUM SHIFT
CYCL DEF 7.1 X+Q110
CYCL DEF 7.2 Y+Q111
CYCL DEF 7.3 Z+Q112

;======== VERIFY SETUP ===============
* VERIFYING SETUP...

; Probe corner to verify
L  X-10 Y-10 Z+50 FMAX
L  Z+5 F500

; Check X=0
TCH PROBE 400 BASIC DATUM IN AXIS ~
    Q263=+1 ~
    Q264=-5 ~
    Q261=+5 ~
    Q320=+2 ~
    Q260=+50 ~
    Q272=+1 ~
    Q267=+1 ~
    Q305=+0 ~
    Q333=+0

FN 18: SYSREAD Q130 = ID970 NR1
FN 11: Q131 = +ABS +Q130        ; Absolute deviation

FN 9: IF +Q131 GT +0.02 GOTO LBL 99

* SETUP COMPLETE - VERIFIED OK
* X DEVIATION: Q130
L  Z+100 FMAX
M30

LBL 99
* SETUP ERROR - VERIFICATION FAILED
* X SHOULD BE 0, MEASURED: Q130
M0
M30
END PGM AUTO_SETUP MM
```

### Example 19: String Parameter Operations

```
BEGIN PGM STRING_OPS MM
; Demonstrate string Q-parameters (QS)

BLK FORM 0.1 Z X+0 Y+0 Z-10
BLK FORM 0.2 X+100 Y+50 Z+0

; String variable assignment
QS1 = "PART-"
QS2 = "A001"

; Concatenate strings
QS10 = QS1 || QS2               ; QS10 = "PART-A001"

; Display combined part number
* PROCESSING: QS10

; Build file path
QS20 = "TNC:\NC_PROG\PRODUCTION\"
QS21 = QS20 || QS10 || ".H"     ; Full path with extension

; Tool call by name (string)
QS30 = "ENDMILL_10"
TOOL CALL QS30 Z S4000

L  Z+50 FMAX M3
L  X+50 Y+25 FMAX
L  Z-5 F500

; Build operation message
Q1 = +1                         ; Operation counter
QS40 = "OP "                    

; Note: Converting number to string requires:
; Using FN 26: TABOPEN / FN 27: TABWRITE
; Or using direct display:
* OPERATION: Q1 OF 5

; More string operations for logging
QS50 = "START: "
QS51 = "END: "
QS52 = "RESULT: OK"

* QS50 QS10
; ... machining operations ...
* QS51 QS10

L  Z+50 FMAX
* QS52

; Conditional based on string (use QS comparison)
QS60 = "STEEL"
QS61 = "STEEL"

; Note: Direct QS comparison uses FN 26 TABOPEN features
; For simple cases, use operator messages

* MATERIAL TYPE: QS60

M5
M30
END PGM STRING_OPS MM
```

### Example 20: Production Template

```
BEGIN PGM PROD_TEMPLATE MM
;================================================
; PRODUCTION PROGRAM TEMPLATE
; Part: BRACKET-2024-A
; Material: 6061-T6 Aluminum
; Programmer: [Name]
; Date: 2024-01-20
;================================================

BLK FORM 0.1 Z X+0 Y+0 Z-25
BLK FORM 0.2 X+150 Y+100 Z+0

;============ PRODUCTION PARAMETERS ==============
Q900 = +100                     ; Target quantity
Q901 = +0                       ; Part counter (starts at 0)
Q902 = +0                       ; Good parts
Q903 = +0                       ; Reject parts
Q904 = +0                       ; Cycle time accumulator
Q905 = +0                       ; Start time

;============ PROCESS PARAMETERS =================
Q200 = +2                       ; Set-up clearance
Q201 = -20                      ; Final depth
Q202 = +3                       ; Depth per cut
Q203 = +0                       ; Surface coordinate
Q204 = +50                      ; Safe clearance

;============ TOOL DEFINITIONS ===================
; T1 = 50mm Face Mill
; T2 = 16mm End Mill
; T3 = 10mm End Mill
; T4 = 8.5mm Drill
; T5 = M10 Tap
; T99 = Touch Probe

;============ MAIN PROGRAM LOOP ==================
LBL 100
; Check if production complete
FN 9: IF +Q901 GE +Q900 GOTO LBL 199

; Increment part counter
FN 1: Q901 = +Q901 + +1
* STARTING PART Q901 OF Q900

; Record start time
FN 18: SYSREAD Q905 = ID210 NR1 ; System time

;------------- OPERATION 10: FACE ----------------
TOOL CALL 1 Z S2500 F1000

L  Z+Q204 FMAX M3
L  X-30 Y+50 FMAX

CYCL DEF 233 FACE MILLING ~
    Q215=+0 ~
    Q218=+150 ~
    Q219=+100 ~
    Q227=+0 ~
    Q386=+0 ~
    Q369=+0 ~
    Q202=+1 ~
    Q370=+0.7 ~
    Q207=+1000 ~
    Q385=+1000 ~
    Q253=+5000 ~
    Q200=+2 ~
    Q357=+0 ~
    Q204=+50

CYCL CALL
L  Z+Q204 FMAX

;------------- OPERATION 20: POCKET --------------
TOOL CALL 2 Z S4000 F600

L  X+75 Y+50 FMAX

CYCL DEF 251 RECTANGULAR POCKET ~
    Q215=+0 ~
    Q218=+80 ~
    Q219=+60 ~
    Q220=+8 ~
    Q368=+0.2 ~
    Q224=+0 ~
    Q367=+0 ~
    Q207=+600 ~
    Q351=+1 ~
    Q201=-15 ~
    Q202=+3 ~
    Q369=+0.1 ~
    Q206=+300 ~
    Q338=+0.5 ~
    Q385=+800 ~
    Q200=+2 ~
    Q203=+0 ~
    Q204=+50 ~
    Q370=+1 ~
    Q366=+1

CYCL CALL
L  Z+Q204 FMAX

;------------- OPERATION 30: DRILL ---------------
TOOL CALL 4 Z S3000 F200

L  X+25 Y+25 FMAX

CYCL DEF 203 UNIVERSAL DRILLING ~
    Q200=+2 ~
    Q201=-25 ~
    Q206=+200 ~
    Q202=+5 ~
    Q210=+0 ~
    Q203=+0 ~
    Q204=+50 ~
    Q212=+0 ~
    Q213=+0 ~
    Q205=+3

; Drill pattern
L  X+25 Y+25 FMAX M99
L  X+125 Y+25 FMAX M99
L  X+125 Y+75 FMAX M99
L  X+25 Y+75 FMAX M99

L  Z+Q204 FMAX

;------------- OPERATION 40: TAP -----------------
TOOL CALL 5 Z S500

L  X+25 Y+25 FMAX

CYCL DEF 207 RIGID TAPPING NEW ~
    Q200=+2 ~
    Q201=-20 ~
    Q239=+1.5 ~                 ; M10 x 1.5 pitch
    Q203=+0 ~
    Q204=+50

L  X+25 Y+25 FMAX M99
L  X+125 Y+25 FMAX M99
L  X+125 Y+75 FMAX M99
L  X+25 Y+75 FMAX M99

L  Z+Q204 FMAX

;------------- PART COMPLETE ---------------------
M5
M9

; Calculate cycle time
FN 18: SYSREAD Q906 = ID210 NR1
FN 2: Q907 = +Q906 - +Q905      ; This part time
FN 1: Q904 = +Q904 + +Q907      ; Total time

; Assume good part (could add probe check)
FN 1: Q902 = +Q902 + +1

* PART Q901 COMPLETE - TIME: Q907 SEC

; Wait for operator
M0

; Loop to next part
GOTO LBL 100

;============ PRODUCTION COMPLETE ================
LBL 199
L  Z+100 FMAX
M5

* ============================================
* PRODUCTION COMPLETE
* ============================================
* TOTAL PARTS: Q901
* GOOD PARTS: Q902
* REJECT PARTS: Q903
* TOTAL TIME: Q904 SEC

; Calculate average
FN 4: Q908 = +Q904 / +Q901
* AVERAGE CYCLE: Q908 SEC/PART

M30
END PGM PROD_TEMPLATE MM
```

---

## Section 18: Quick Reference Card

### Movement Commands
```
L     Linear move           CC    Circle center
C     Circular arc (CC)     CR    Arc with radius
CT    Tangent arc           CP    Polar circle
LP    Polar linear          CHF   Chamfer
RND   Corner rounding
```

### Q-Parameter Ranges
```
Q0-Q99      Local to program
Q100-Q199   Global transfer
Q200-Q699   Cycle parameters (reserved)
Q800-Q899   User persistent
QL1-QL999   Local (modern)
QR1-QR999   Persistent user
QS1-QS999   Strings
```

### FN Functions
```
FN 0:  Q=value      Assign
FN 1:  Q=Q+Q        Add
FN 2:  Q=Q-Q        Subtract
FN 3:  Q=Q*Q        Multiply
FN 4:  Q=Q/Q        Divide
FN 5:  Q=SQRT Q     Square root
FN 6:  Q=SIN Q      Sine
FN 7:  Q=COS Q      Cosine
FN 8:  Q=SQRT(Q²+Q²) Hypotenuse
FN 9:  IF Q OP Q GOTO LBL  Conditional
FN 10: Q=ABS Q      Absolute
FN 11: Q=INT Q      Integer
FN 12: Q=Q MOD Q    Modulo
FN 13: Q=Q² Q       Square
FN 14: Q=ATAN(Q/Q)  Arctangent
FN 18: SYSREAD      Read system var
```

### Comparison Operators (FN 9)
```
EQU   Equal
NE    Not equal
GT    Greater than
LT    Less than
GE    Greater or equal
LE    Less or equal
```

### Common Cycles
```
CYCL 200   Drilling
CYCL 201   Reaming
CYCL 203   Universal drilling
CYCL 205   Deep hole drilling
CYCL 206   Tapping new
CYCL 207   Rigid tapping
CYCL 220   Point pattern
CYCL 221   Hole circle
CYCL 225   Engraving
CYCL 233   Face milling
CYCL 251   Rectangular pocket
CYCL 252   Circular pocket
CYCL 256   Rectangular boss
CYCL 257   Circular boss
CYCL 270-274  SL contour pockets
```

### Probe Cycles
```
TCH PROBE 400   Datum in axis
TCH PROBE 403   Datum Y axis
TCH PROBE 404   Datum Z axis
TCH PROBE 410   Datum edge
TCH PROBE 411   Outside corner
TCH PROBE 412   Inside corner
TCH PROBE 421   Circle center
TCH PROBE 422   Slot/web center
TCH PROBE 425   Protrusion
TCH PROBE 426   Pocket
```

### PLANE Commands (5-Axis)
```
PLANE SPATIAL SPA SPB SPC   Euler angles
PLANE VECTOR BX BY BZ NX NY NZ  Vectors
PLANE POINTS P1 P2 P3       Three points
PLANE AXIAL A C             Direct axes
PLANE RELATIVE SPA          Relative
PLANE RESET                 Return horizontal
```

### PLANE Positioning
```
STAY      Tool tip stationary
MOVE      Tool moves with table
TABLE ROT Table only
COORD ROT Coordinate only
SEQ+/SEQ- Solution selection
SYM+/SYM- Symmetric solution
```

### Radius Compensation
```
R0    No compensation
RL    Left of contour
RR    Right of contour
R+    Right (alias)
```

### Approach/Depart
```
APPR LT   Linear tangent
APPR LN   Linear normal
APPR CT   Circular tangent
APPR LCT  Linear + circular tangent
DEP LT    Depart linear tangent
DEP CT    Depart circular tangent
```

### Program Structure
```
BEGIN PGM name MM/INCH
BLK FORM 0.1 Z X Y Z    Min point
BLK FORM 0.2 X Y Z      Max point
TOOL CALL n Z Sn Fn
...
END PGM name MM/INCH
```

---

*End of PRISM Heidenhain Programming Skill v1.0*
