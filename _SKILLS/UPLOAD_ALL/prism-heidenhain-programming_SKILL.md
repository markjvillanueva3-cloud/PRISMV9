---
name: prism-heidenhain-programming
description: |
  Heidenhain TNC programming reference. Conversational and ISO modes.
---

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

*END OF PART 1*
*Part 2 will contain: 5-axis PLANE function, touch probe cycles, advanced FK programming, alarm reference, examples 11-20*

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

;------------- OPERATION 10: FACE -------------## Section 18: Quick Reference Card

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
