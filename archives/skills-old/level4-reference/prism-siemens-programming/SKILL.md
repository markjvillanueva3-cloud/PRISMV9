# PRISM Siemens SINUMERIK Programming Skill
## Complete Reference for SINUMERIK 840D sl, 828D, and ONE
### Version 1.0 | PRISM Manufacturing Intelligence

---

# PART 1: FUNDAMENTALS AND CORE PROGRAMMING

---

## 1. SINUMERIK CONTROL FAMILIES

### 1.1 Control Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    SINUMERIK CONTROL FAMILY COMPARISON                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  SINUMERIK 840D sl (solution line)                                          │
│  ─────────────────────────────────                                          │
│  • High-end CNC for complex machining                                       │
│  • Up to 93 axes, 30 channels                                               │
│  • Full 5-axis simultaneous                                                 │
│  • Advanced transformations (TRAORI, TRANSMIT, TRACYL)                      │
│  • Synchronized actions, compile cycles                                     │
│  • Best for: Aerospace, automotive, mold/die, multi-axis                    │
│                                                                             │
│  SINUMERIK 828D                                                             │
│  ────────────────                                                           │
│  • Mid-range CNC, panel-based                                               │
│  • Up to 8 axes, 1 channel (828D Basic: 5 axes)                             │
│  • Integrated PLC (PPU)                                                     │
│  • ShopMill/ShopTurn conversational                                         │
│  • Best for: Job shops, standard milling/turning                            │
│                                                                             │
│  SINUMERIK ONE                                                              │
│  ──────────────                                                             │
│  • Latest generation, digital native                                        │
│  • Create MyVirtualMachine (digital twin)                                   │
│  • Edge computing ready                                                     │
│  • Full 840D sl compatibility                                               │
│  • AI-powered optimization                                                  │
│  • Best for: Industry 4.0, digital manufacturing                            │
│                                                                             │
│  FEATURE COMPARISON                                                         │
│  ┌──────────────────────┬──────────┬──────────┬──────────┐                  │
│  │ Feature             │ 840D sl  │   828D   │   ONE    │                  │
│  ├──────────────────────┼──────────┼──────────┼──────────┤                  │
│  │ Max Axes            │    93    │    8     │   93+    │                  │
│  │ Max Channels        │    30    │    1     │   30+    │                  │
│  │ 5-Axis Simultaneous │    ✓     │    ✓     │    ✓     │                  │
│  │ TRAORI              │    ✓     │    ✓     │    ✓     │                  │
│  │ TRANSMIT            │    ✓     │    -     │    ✓     │                  │
│  │ Synchronized Actions│    ✓     │ Limited  │    ✓     │                  │
│  │ Compile Cycles      │    ✓     │    -     │    ✓     │                  │
│  │ ShopMill/ShopTurn   │    ✓     │    ✓     │    ✓     │                  │
│  │ Digital Twin        │    -     │    -     │    ✓     │                  │
│  │ Edge Computing      │    -     │    -     │    ✓     │                  │
│  └──────────────────────┴──────────┴──────────┴──────────┘                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Programming Languages

| Language | Description | Use Case |
|----------|-------------|----------|
| **G-code (DIN 66025)** | Standard ISO programming | Basic machining, compatibility |
| **High-Level Language** | Siemens extended commands | Complex calculations, automation |
| **ShopMill/ShopTurn** | Conversational, graphical | Simple parts, quick setup |
| **Structured Text** | PLC-like programming | Complex logic, automation |

### 1.3 File Extensions

| Extension | Type | Description |
|-----------|------|-------------|
| `.MPF` | Main Program File | Main NC programs |
| `.SPF` | Subprogram File | Subprograms, cycles |
| `.INI` | Initialization | Machine/program init files |
| `.DEF` | Definition | Variable/macro definitions |
| `.GUD` | Global User Data | Global variable definitions |
| `.TEA` | Tool Data | Tool definitions |
| `.UFR` | User Frame | Frame definitions |

---

## 2. PROGRAM STRUCTURE

### 2.1 Basic Program Format

```gcode
; Program header (comments)
; Part: Example Part
; Material: Steel
; Programmer: [Name]
; Date: [Date]

%_N_EXAMPLE_MPF          ; Program name (optional header)
;$PATH=/_N_MPF_DIR       ; Path directive (optional)

N10 G90 G17 G54          ; Safety/setup block
N20 G71                  ; Metric (G70 = inch)

; Main program content
N30 T1 D1                ; Tool call
N40 M6                   ; Tool change
N50 S5000 M3             ; Spindle on
N60 G0 X0 Y0             ; Rapid positioning
N70 G0 Z5                ; Approach Z
N80 G1 Z-5 F500          ; Feed move

; ... machining operations ...

N900 G0 Z100             ; Retract
N910 M5                  ; Spindle off
N920 M30                 ; Program end

; Alternative endings:
; M30 - End, rewind
; M17 - Subprogram end (return)
; M2  - Program end (no rewind)
; RET - Return from subprogram
```

### 2.2 Block Structure

```gcode
; Block format: N[number] [addresses and values]
; Addresses can appear in any order

N10 G1 X100 Y50 F500     ; Standard block
G1 X100 Y50 F500         ; N-number optional
X100 Y50                 ; Modal G1, F retained

; Multiple G-codes per block (grouped)
N20 G90 G17 G54 G71      ; Multiple setup G-codes OK

; Address ranges:
; N = Block number (1-99999999)
; G = Preparatory function (0-999)
; M = Miscellaneous function (0-99)
; T = Tool number (1-32000)
; D = Tool offset (0-9)
; S = Spindle speed (0-99999.999)
; F = Feed rate (0-99999.999)
; X,Y,Z,A,B,C = Axis positions
; I,J,K = Arc center / interpolation params
; R = Radius / R-parameter
```

### 2.3 Comments and Messages

```gcode
; This is a comment (semicolon)
( This is also a comment - parentheses )

; Message to operator (displayed on screen)
MSG("Tool change required")
MSG("Part 1 of 5")
MSG()                    ; Clear message

; Alarm generation
SETAL(65000)            ; Set alarm 65000
SETAL(65001, "Custom alarm text")

; Program stop with message
M0                       ; Unconditional stop
M1                       ; Optional stop (if enabled)
STOPRE                   ; Stop preprocessing

; Screen output (for debugging)
$AC_PARAM[0] = 123.456
MSG("Value = " << $AC_PARAM[0])
```

---

## 3. VARIABLE SYSTEM

### 3.1 R-Parameters (Calculation Parameters)

```gcode
; R-parameters: R0 to R99 (standard) or R0 to R999 (extended)
; Used for calculations, cycle parameters, general storage

R1 = 100.5              ; Assignment
R2 = R1 * 2             ; Calculation
R3 = R1 + R2            ; Multiple variables

; R-parameters in motion blocks
G1 X=R1 Y=R2 F=R3       ; Use = for variables

; Array-like access
R10 = 5
R[R10] = 100            ; R5 = 100 (indirect)
R[R10 + 1] = 200        ; R6 = 200

; R-parameters as cycle inputs
CYCLE81(100, 0, 2, -25) ; Direct values
CYCLE81(R1, R2, R3, R4) ; R-parameter values
```

### 3.2 User-Defined Variables (DEF)

```gcode
; Local variables (within program/subprogram)
DEF INT COUNTER         ; Integer
DEF REAL LENGTH         ; Real number
DEF BOOL FLAG           ; Boolean (TRUE/FALSE)
DEF CHAR LETTER         ; Single character
DEF STRING[32] NAME     ; String (max 32 chars)
DEF AXIS AXISNAME       ; Axis identifier

; Initialize on declaration
DEF REAL DEPTH = -10.5
DEF INT PASSES = 5
DEF BOOL FINISHED = FALSE
DEF STRING[20] PARTNAME = "WIDGET"

; Arrays
DEF REAL POSITIONS[10]  ; Array of 10 reals
DEF INT COUNTS[5] = (1, 2, 3, 4, 5)  ; Initialized array
DEF REAL MATRIX[3, 3]   ; 2D array (3x3)

; Array access
POSITIONS[0] = 100.0    ; First element (0-indexed)
POSITIONS[1] = 200.0
R1 = POSITIONS[0]

; Calculated index
DEF INT IDX = 2
POSITIONS[IDX] = 300.0  ; POSITIONS[2] = 300.0
```

### 3.3 Global User Data (GUD)

```gcode
; GUD variables persist across programs
; Defined in GUD definition files (_N_SGUD_DEF, _N_MGUD_DEF, _N_UGUD_DEF)

; In GUD definition file (_N_UGUD_DEF):
; DEF NCK REAL GUD_PART_COUNT
; DEF NCK INT GUD_TOOL_LIFE[100]
; DEF CHAN REAL GUD_OFFSET

; In program:
GUD_PART_COUNT = GUD_PART_COUNT + 1
IF GUD_TOOL_LIFE[5] > 1000 THEN
  ; Tool life exceeded
ENDIF
```

### 3.4 System Variables

```gcode
; POSITION VARIABLES
; ──────────────────────────────────────────────────────────
$AA_IW[X]               ; Actual position, workpiece coord (WCS)
$AA_IM[X]               ; Actual position, machine coord (MCS)
$AA_MW[X]               ; Commanded position, WCS
$AA_MM[X]               ; Commanded position, MCS
$P_EP[X]                ; Programmed end point
$P_APR[X]               ; Programmed position (polar radius)
$P_APA[X]               ; Programmed position (polar angle)

; TOOL VARIABLES
; ──────────────────────────────────────────────────────────
$TC_DP1[t,d]            ; Tool type
$TC_DP2[t,d]            ; Cutting edge number
$TC_DP3[t,d]            ; Tool length 1 (Z)
$TC_DP4[t,d]            ; Tool length 2 (X)
$TC_DP5[t,d]            ; Tool length 3 (Y)
$TC_DP6[t,d]            ; Tool radius
$TC_DP7[t,d]            ; Corner radius 
$TC_DP11[t,d]           ; Length wear 1
$TC_DP12[t,d]           ; Length wear 2
$TC_DP13[t,d]           ; Length wear 3
$TC_DP15[t,d]           ; Radius wear
$P_TOOL                 ; Active tool number
$P_TOOLNO               ; Active tool number
$TC_MPP6[t,d]           ; Tool life (minutes or pieces)

; FRAME/OFFSET VARIABLES
; ──────────────────────────────────────────────────────────
$P_UIFR[n]              ; Settable work offset (G54-G599)
$P_IFRAME               ; Current frame
$P_ACTFRAME             ; Active total frame
$P_BFRAME               ; Basic frame
$P_PFRAME               ; Programmable frame

; SPINDLE VARIABLES
; ──────────────────────────────────────────────────────────
$S_SPEED                ; Commanded spindle speed
$AA_S[spindle]          ; Actual spindle speed
$P_S[spindle]           ; Programmed spindle speed

; FEED VARIABLES
; ──────────────────────────────────────────────────────────
$AC_FPATH               ; Current path feed
$P_F                    ; Programmed feed
$AC_OVR                 ; Feed override %

; TIME/COUNTER VARIABLES
; ──────────────────────────────────────────────────────────
$AN_SETUP_TIME          ; Machine setup time
$AN_POWERON_TIME        ; Power-on time
$AC_TIME                ; Current time (seconds since midnight)
$AC_DATE                ; Current date

; CHANNEL/MODE VARIABLES
; ──────────────────────────────────────────────────────────
$P_PROG                 ; Current program name
$P_SUBPROG              ; Current subprogram name
$P_CHANNO               ; Channel number
$MC_CHAN_NAME           ; Channel name
$AN_OPMODE              ; Operating mode (0=JOG, 1=MDA, 2=AUTO)
```

### 3.5 Machine Data Access

```gcode
; Read machine data
R1 = $MC_SPIND_ASSIGN_TAB[0]    ; Spindle assignment
R2 = $MN_SW_VERSION_DISPLAY     ; Software version

; Some machine data can be written (with authorization)
; $MC_EXTERN_GCODE_RESET_VALUES[0] = 90  ; G90 on reset

; Axis-specific machine data
R3 = $MA_MAX_AX_ACCEL[X]        ; Max acceleration X
R4 = $MA_MAX_AX_VELO[X]         ; Max velocity X
```

---

## 4. ARITHMETIC AND MATHEMATICAL OPERATIONS

### 4.1 Basic Arithmetic

```gcode
; Assignment and basic operations
R1 = 100                ; Assignment
R2 = R1 + 50            ; Addition
R3 = R1 - 25            ; Subtraction
R4 = R1 * 2             ; Multiplication
R5 = R1 / 4             ; Division
R6 = R1 DIV 3           ; Integer division (33)
R7 = R1 MOD 3           ; Modulo (1)

; Compound assignment (SINUMERIK ONE / newer 840D)
R1 += 10                ; R1 = R1 + 10
R1 -= 5                 ; R1 = R1 - 5
R1 *= 2                 ; R1 = R1 * 2
R1 /= 4                 ; R1 = R1 / 4

; Operator precedence (standard mathematical)
R10 = 2 + 3 * 4         ; R10 = 14 (not 20)
R11 = (2 + 3) * 4       ; R11 = 20 (parentheses)
R12 = 10 / 2 + 3        ; R12 = 8
R13 = 10 / (2 + 3)      ; R13 = 2
```

### 4.2 Mathematical Functions

```gcode
; TRIGONOMETRIC (angles in degrees)
R1 = SIN(45)            ; Sine: 0.7071...
R2 = COS(45)            ; Cosine: 0.7071...
R3 = TAN(45)            ; Tangent: 1.0
R4 = ASIN(0.5)          ; Arc sine: 30°
R5 = ACOS(0.5)          ; Arc cosine: 60°
R6 = ATAN(1)            ; Arc tangent: 45°
R7 = ATAN2(1, 1)        ; 2-arg arctan: 45° (Y, X)

; POWER AND ROOT
R10 = SQRT(100)         ; Square root: 10
R11 = POT(10)           ; Square (10²): 100
R12 = EXP(1)            ; Exponential: 2.718...
R13 = LN(10)            ; Natural log: 2.302...
R14 = 2**3              ; Power: 8 (2³)

; ROUNDING
R20 = ROUND(3.7)        ; Round to nearest: 4
R21 = TRUNC(3.7)        ; Truncate: 3
R22 = ABS(-5.5)         ; Absolute value: 5.5
R23 = MINVAL(R1, R2)    ; Minimum of two values
R24 = MAXVAL(R1, R2)    ; Maximum of two values
R25 = BOUND(0, R1, 100) ; Clamp R1 between 0 and 100

; SPECIAL
R30 = SIGN(R1)          ; Sign: -1, 0, or 1
R31 = ROUNDUP(3.1, 1)   ; Round up to 1 decimal: 3.2
R32 = CTRANS(X, 10)     ; Coordinate transformation

; Example: Bolt circle calculation
DEF REAL ANGLE, XPOS, YPOS
DEF REAL RADIUS = 50.0
DEF INT HOLES = 6
DEF INT I

FOR I = 0 TO HOLES - 1
  ANGLE = I * 360 / HOLES
  XPOS = RADIUS * COS(ANGLE)
  YPOS = RADIUS * SIN(ANGLE)
  G0 X=XPOS Y=YPOS
  ; Drill operation...
ENDFOR
```

---

## 5. STRING OPERATIONS

### 5.1 String Functions

```gcode
DEF STRING[50] STR1 = "HELLO"
DEF STRING[50] STR2 = "WORLD"
DEF STRING[100] RESULT
DEF INT LENGTH, POS

; CONCATENATION
RESULT = STR1 << " " << STR2   ; "HELLO WORLD"
RESULT = STR1 << 123           ; "HELLO123" (number to string)

; LENGTH
LENGTH = STRLEN(STR1)          ; 5

; SUBSTRING
RESULT = SUBSTR(STR1, 0, 3)    ; "HEL" (start, length)
RESULT = SUBSTR(STR1, 2)       ; "LLO" (from position 2)

; FIND
POS = INDEX(STR1, "L")         ; 2 (first occurrence)
POS = RINDEX(STR1, "L")        ; 3 (last occurrence)

; CASE CONVERSION
RESULT = TOUPPER("hello")      ; "HELLO"
RESULT = TOLOWER("HELLO")      ; "hello"

; COMPARISON
IF STR1 == "HELLO"             ; String comparison
IF STR1 <> STR2                ; Not equal

; NUMBER TO STRING
DEF REAL NUM = 123.456
RESULT = << NUM                ; "123.456"
RESULT = SPRINT("%8.3f", NUM)  ; "123.456" (formatted)

; STRING TO NUMBER
DEF STRING[10] NUMSTR = "123.456"
NUM = NUMBER(NUMSTR)           ; 123.456
```

### 5.2 String in Messages and File Names

```gcode
DEF STRING[30] PARTNUM = "ABC123"
DEF INT COUNT = 5

; Dynamic message
MSG("Part: " << PARTNUM << " Count: " << COUNT)

; Build file name
DEF STRING[50] FILENAME
FILENAME = "/MPF/" << PARTNUM << ".MPF"

; Call program dynamically
CALL FILENAME              ; Execute built program name
```

---

## 6. CONTROL STRUCTURES

### 6.1 IF-THEN-ELSE

```gcode
; Simple IF
IF R1 > 100
  G1 X100 F500
ENDIF

; IF-ELSE
IF R1 > 100
  G1 X100 F500
ELSE
  G1 X50 F500
ENDIF

; IF-ELSEIF-ELSE
IF R1 > 100
  MSG("Large value")
ELSEIF R1 > 50
  MSG("Medium value")
ELSEIF R1 > 0
  MSG("Small value")
ELSE
  MSG("Zero or negative")
ENDIF

; Compound conditions
IF R1 > 0 AND R1 < 100
  ; In range
ENDIF

IF R1 < 0 OR R1 > 100
  ; Out of range
ENDIF

IF NOT (R1 == 0)
  ; Not zero
ENDIF

; Comparison operators:
; ==    Equal
; <>    Not equal
; >     Greater than
; <     Less than
; >=    Greater or equal
; <=    Less or equal
; AND   Logical and
; OR    Logical or
; NOT   Logical not
; XOR   Exclusive or

; Inline conditional (ternary-like)
R10 = (R1 > 50) ? 100 : 50     ; SINUMERIK ONE
```

### 6.2 LOOP Structures

```gcode
; LOOP - Unconditional loop (requires EXITCOND or break)
LOOP
  R1 = R1 + 1
  IF R1 >= 10
    EXITCOND                   ; Exit condition met
  ENDIF
ENDLOOP

; Alternative exit
LOOP
  R1 = R1 + 1
  IF R1 >= 10
    GOTO LABEL_EXIT
  ENDIF
ENDLOOP
LABEL_EXIT:
```

### 6.3 WHILE Loop

```gcode
; WHILE - Condition checked at start
R1 = 0
WHILE R1 < 10
  G1 X=R1*10 F500
  R1 = R1 + 1
ENDWHILE

; Nested WHILE
R1 = 0
WHILE R1 < 5
  R2 = 0
  WHILE R2 < 5
    G0 X=R1*10 Y=R2*10
    ; Operation...
    R2 = R2 + 1
  ENDWHILE
  R1 = R1 + 1
ENDWHILE
```

### 6.4 FOR Loop

```gcode
; FOR - Counted loop
DEF INT I
FOR I = 1 TO 10
  G1 X=I*10 F500
ENDFOR

; FOR with step
FOR I = 0 TO 100 STEP 5
  G1 X=I F500
ENDFOR

; Negative step (count down)
FOR I = 10 TO 1 STEP -1
  MSG("Countdown: " << I)
ENDFOR

; Variable bounds
DEF INT START = 1
DEF INT FINISH = 20
DEF INT STEP = 2
FOR I = START TO FINISH STEP STEP
  ; Process
ENDFOR
```

### 6.5 REPEAT Loop

```gcode
; REPEAT - Condition checked at end (executes at least once)
R1 = 0
REPEAT
  R1 = R1 + 1
  G1 X=R1*10 F500
UNTIL R1 >= 10

; REPEAT with counter
DEF INT COUNTER = 0
REPEAT
  COUNTER = COUNTER + 1
  ; Process
UNTIL COUNTER >= 5
```

### 6.6 CASE/SWITCH (SINUMERIK ONE / newer 840D)

```gcode
; CASE - Multiple branch selection
DEF INT TOOLTYPE = 2

CASE TOOLTYPE OF
  1: MSG("End mill")
  2: MSG("Drill")
  3: MSG("Tap")
  4: MSG("Reamer")
  DEFAULT: MSG("Unknown tool")
ENDCASE

; CASE with ranges
CASE R1 OF
  1 TO 10: MSG("Range 1-10")
  11 TO 20: MSG("Range 11-20")
  DEFAULT: MSG("Out of range")
ENDCASE
```

### 6.7 GOTO and Labels

```gcode
; Forward jump
IF R1 > 100
  GOTO SKIP_SECTION
ENDIF

G1 X100 F500
G1 X200 F500

SKIP_SECTION:
G0 Z100

; Backward jump (use carefully - can create infinite loops)
RETRY:
G65 P9001 A1
IF R100 <> 0
  GOTO RETRY
ENDIF

; Label requirements:
; - Must end with colon
; - Must be unique within program
; - No spaces in label name
```

---

## 7. SUBPROGRAMS AND CYCLES

### 7.1 Subprogram Definition and Call

```gcode
; Main program (MAIN.MPF)
N10 G90 G17 G54
N20 G71

N30 T1 M6
N40 S3000 M3

; Call subprogram with L count
N50 SUB_DRILL L3        ; Call 3 times (or: CALL "SUB_DRILL" REP 3)

N60 M30

; Subprogram (SUB_DRILL.SPF)
G81 Z-20 R3 F200
X10 Y10
X20 Y10
X30 Y10
G80
M17                      ; Return from subprogram (or RET)
```

### 7.2 Parameter Passing

```gcode
; Main program
DEF REAL DEPTH = -25
DEF REAL FEED = 500
DEF REAL DIA = 10

POCKET(100, 50, DEPTH, DIA, FEED)  ; Call with parameters

M30

; Subprogram with parameters (POCKET.SPF)
PROC POCKET(REAL X_SIZE, REAL Y_SIZE, REAL Z_DEPTH, REAL TOOL_DIA, REAL CUT_FEED)
  ; X_SIZE, Y_SIZE, Z_DEPTH, TOOL_DIA, CUT_FEED available as local variables
  DEF REAL STEP = TOOL_DIA * 0.7
  
  G0 X0 Y0
  G0 Z5
  G1 Z=Z_DEPTH F=CUT_FEED/2
  ; ... pocket routine ...
  G0 Z5
  
RET
```

### 7.3 PROC Subprograms (Advanced)

```gcode
; PROC - Procedure definition (recommended for all subprograms)
PROC DRILL_PATTERN(REAL X_START, REAL Y_START, INT X_COUNT, INT Y_COUNT, REAL X_SPACE, REAL Y_SPACE, REAL DEPTH)
  DEF INT I, J
  DEF REAL X_POS, Y_POS
  
  FOR I = 0 TO X_COUNT - 1
    FOR J = 0 TO Y_COUNT - 1
      X_POS = X_START + I * X_SPACE
      Y_POS = Y_START + J * Y_SPACE
      G0 X=X_POS Y=Y_POS
      G1 Z=DEPTH F200
      G0 Z5
    ENDFOR
  ENDFOR
  
RET    ; or M17 or ENDPROC

; Call
DRILL_PATTERN(0, 0, 5, 4, 20, 25, -15)
```

### 7.4 Modal Subprogram Call (MCALL)

```gcode
; MCALL - Modal call (executes at every position)
MCALL PECK_DRILL(25, 3, 200)    ; Define modal call

G0 X10 Y10                       ; Calls PECK_DRILL here
X30 Y10                          ; Calls PECK_DRILL here
X50 Y10                          ; Calls PECK_DRILL here
X30 Y30                          ; Calls PECK_DRILL here

MCALL                            ; Cancel modal call

; Subprogram for modal use
PROC PECK_DRILL(REAL DEPTH, REAL PECK, REAL FEED)
  DEF REAL CURRENT = 0
  
  WHILE CURRENT > DEPTH
    CURRENT = CURRENT - PECK
    IF CURRENT < DEPTH
      CURRENT = DEPTH
    ENDIF
    G1 Z=CURRENT F=FEED
    G0 Z2
  ENDWHILE
  
  G0 Z5
RET
```

### 7.5 Standard Cycles Overview

| Cycle | Name | Description |
|-------|------|-------------|
| **CYCLE81** | Drilling | Simple drilling |
| **CYCLE82** | Counterboring | Drilling with dwell |
| **CYCLE83** | Deep hole drilling | Peck drilling with chip breaking |
| **CYCLE84** | Tapping | Rigid tapping |
| **CYCLE85** | Boring | Boring with oriented stop |
| **CYCLE86** | Boring | Boring with oriented retract |
| **CYCLE88** | Boring | Boring with dwell and manual retract |
| **CYCLE89** | Boring | Boring with dwell |
| **POCKET1** | Rectangular pocket | XY pocket milling |
| **POCKET2** | Circular pocket | Round pocket milling |
| **POCKET3** | Contour pocket | Arbitrary contour pocket |
| **POCKET4** | Thread milling | Internal thread milling |
| **CYCLE71** | Face milling | Surface facing |
| **CYCLE72** | Contour milling | 2D contour |
| **CYCLE76** | Rectangular groove | Rectangular groove milling |
| **CYCLE77** | Circular groove | Circular groove milling |
| **SLOT1** | Longitudinal slot | Slot milling |
| **SLOT2** | Circular slot | Circular slot pattern |
| **CYCLE800** | Swivel | 5-axis plane orientation |
| **CYCLE832** | High speed | High speed settings |
| **CYCLE995/996** | Measuring | Workpiece measurement |

### 7.6 Cycle Examples

```gcode
; CYCLE83 - Deep hole drilling
; CYCLE83(RTP, RFP, SDIS, DP, DPR, FDEP, FDPR, DAM, DTB, DTS, FRF, VARI, _AXN, _MDEP, _VRT, _DTD, _DIS1)
CYCLE83(100, 0, 2, -50, , 5, , 1, 0.5, , 0.5, 0)
; RTP = Retract plane (100)
; RFP = Reference plane (0)
; SDIS = Safety distance (2)
; DP = Final depth (-50)
; FDEP = First drilling depth (5)
; DAM = Degression amount (1)
; DTB = Dwell at bottom (0.5)

; POCKET1 - Rectangular pocket
; POCKET1(RTP, RFP, SDIS, DP, DPR, LENG, WID, CRAD, CPA, CPO, STA1, RONE, FFPL, FFP2, MID, CDIR, FAL, VARI, MITEFP, FFP1)
POCKET1(100, 0, 2, -15, , 100, 60, 5, 50, 30, 0, 1, 500, 300, 2, 2, 0.5, 1)
; RTP = Retract plane
; SDIS = Safety distance
; DP = Depth
; LENG = Length
; WID = Width
; CRAD = Corner radius
; CPA, CPO = Center position X, Y
; FFP1 = Plunge feed
; FFP2 = Milling feed
; MID = Max depth per pass
; CDIR = Climb (2) or conventional (3)
```

---

## 8. FRAMES AND COORDINATE SYSTEMS

### 8.1 Work Offsets (Settable Frames)

```gcode
; Standard work offsets
G54                      ; First work offset
G55                      ; Second work offset
G56                      ; Third work offset
G57                      ; Fourth work offset
G58                      ; Fifth work offset (if available)
G59                      ; Sixth work offset (if available)

; Extended work offsets (G54.1 equivalent)
G500                     ; G54
G505                     ; G54 + 5 (G54 P5 equivalent)
G510                     ; G54 + 10
; ... up to G599

; Select extended offset
$P_UIFR[5]              ; Access offset 5 (G505)
```

### 8.2 Programmable Frames (TRANS, ROT, SCALE, MIRROR)

```gcode
; TRANS - Translation (shift)
TRANS X100 Y50           ; Shift origin to X100 Y50
; All subsequent coordinates relative to new origin
G0 X0 Y0                 ; Goes to X100 Y50 in machine coords

; ROT - Rotation
ROT Z45                  ; Rotate 45° around Z axis
ROT RPL=30               ; Rotate in current plane

; SCALE - Scaling
SCALE X2 Y2              ; Scale X and Y by factor 2
SCALE ALL=0.5            ; Scale all axes by 0.5

; MIRROR - Mirroring
MIRROR X                 ; Mirror across YZ plane
MIRROR Y                 ; Mirror across XZ plane

; ATRANS, AROT, ASCALE, AMIRROR - Additive (compound)
TRANS X100
ATRANS X50               ; Total shift = 150

; Reset all frame components
TRANS                    ; Cancel translation
ROT                      ; Cancel rotation
SCALE                    ; Cancel scaling
MIRROR                   ; Cancel mirroring
```

### 8.3 Frame Chains

```gcode
; Complete frame chain:
; Machine Coord → Basic Frame → Work Offset → Programmable Frame → Workpiece Coord

; Example: Part with multiple features at angles
G54                      ; Work offset (part zero)

; Feature 1 at angle
TRANS X50 Y30           ; Move to feature
ROT Z45                 ; Rotate coordinate system
POCKET1(...)            ; Machine pocket at 45°
ROT                     ; Cancel rotation
TRANS                   ; Cancel translation

; Feature 2 at different position/angle
TRANS X100 Y60
ROT Z-30
POCKET1(...)
ROT
TRANS
```

### 8.4 CTRANS, CROT - Coordinate Transformation Functions

```gcode
; CTRANS - Get transformation component
DEF REAL X_SHIFT
X_SHIFT = CTRANS(X, $P_ACTFRAME)   ; Get X translation of active frame

; CROT - Get rotation component
DEF REAL Z_ROTATION
Z_ROTATION = CROT(Z, $P_ACTFRAME)  ; Get Z rotation of active frame

; Modify frame programmatically
$P_UIFR[1, X, TR] = 100.5          ; Set G54 X translation
$P_UIFR[1, Y, TR] = 50.25          ; Set G54 Y translation
$P_UIFR[1, Z, TR] = -10.0          ; Set G54 Z translation
$P_UIFR[1, C, RT] = 45.0           ; Set G54 C rotation
```

---

## 9. TOOL MANAGEMENT

### 9.1 Tool Selection and Activation

```gcode
; Basic tool call
T1                       ; Preselect tool 1
M6                       ; Execute tool change
D1                       ; Activate offset D1 (cutting edge 1)

; Combined (Siemens standard)
T1 D1                    ; Preselect tool 1 with D1
M6                       ; Change

; Tool length compensation
G43                      ; Tool length comp positive (rarely used)
G44                      ; Tool length comp negative (rarely used)
; Note: SINUMERIK uses D for both length and radius automatically

; Cancel compensation
D0                       ; Cancel tool offset

; Tool call by name (if supported)
T="DRILL_10MM"           ; Tool by name
M6
```

### 9.2 Tool Offset Structure

```gcode
; Tool offset data ($TC_DP variables)
; $TC_DP[tool_number, D_number]

; Tool 1, D1 offset data:
$TC_DP1[1,1]             ; Tool type (1=milling, 2=drilling, etc.)
$TC_DP2[1,1]             ; Cutting edge number
$TC_DP3[1,1]             ; Length 1 (typically Z)
$TC_DP4[1,1]             ; Length 2 (typically X for lathes)
$TC_DP5[1,1]             ; Length 3 (typically Y)
$TC_DP6[1,1]             ; Radius
$TC_DP7[1,1]             ; Corner radius

; Wear offsets (added to geometry)
$TC_DP11[1,1]            ; Wear length 1
$TC_DP12[1,1]            ; Wear length 2
$TC_DP13[1,1]            ; Wear length 3
$TC_DP15[1,1]            ; Wear radius

; Read current tool data
DEF REAL TOOL_RAD
TOOL_RAD = $TC_DP6[$P_TOOL, $P_TOOLNO_D]

; Modify tool offset (with authorization)
$TC_DP15[1,1] = $TC_DP15[1,1] + 0.01  ; Add 0.01 to radius wear
```

### 9.3 Tool Life Management

```gcode
; Tool life data ($TC_MOP variables)
$TC_MOP1[t]              ; Monitoring type
$TC_MOP2[t]              ; Target value (time or pieces)
$TC_MOP3[t]              ; Warning value
$TC_MOP5[t]              ; Current count

; Check tool life
IF $TC_MOP5[1] > $TC_MOP2[1]
  MSG("Tool 1 life expired")
  M0
ENDIF

; Tool life monitoring in cycles
; TOOLLIFE command (if available)
TOOLLIFE T1 ON           ; Enable monitoring
TOOLLIFE T1 OFF          ; Disable monitoring
```

### 9.4 Automatic Tool Change

```gcode
; Safe tool change procedure
PROC SAFE_TOOL_CHANGE(INT NEW_TOOL)
  G0 Z$MN_SW_LIMIT_POS[2, Z]  ; Go to Z limit (or safe Z)
  G0 X0 Y0                     ; Home X and Y (or change position)
  T=NEW_TOOL                   ; Preselect
  M6                           ; Change
  D1                           ; Activate D1
RET
```

---

## 10. PROGRAMMING EXAMPLES (1-10)

### Example 1: Simple Facing Operation

```gcode
; FACE.MPF - Simple face milling
; Material: Aluminum
; Tool: 50mm face mill

N10 G90 G17 G54 G71      ; Setup
N20 G64                  ; Continuous path mode

N30 T1 D1                ; 50mm face mill
N40 M6
N50 S2000 M3             ; Spindle on
N60 M8                   ; Coolant on

; Face mill path (serpentine)
N70 G0 X-30 Y-30
N80 G0 Z2
N90 G1 Z0 F1000          ; Plunge to surface
N100 G1 X130 F800        ; First pass
N110 G1 Y20              ; Step over
N120 G1 X-30             ; Return pass
N130 G1 Y70              ; Step over
N140 G1 X130             ; Third pass

N150 G0 Z50              ; Retract
N160 M9                  ; Coolant off
N170 M5                  ; Spindle off
N180 M30
```

### Example 2: Bolt Circle with Variables

```gcode
; BOLT_CIRCLE.MPF - Parametric bolt circle
; Uses R-parameters for flexibility

; Parameters
R1 = 0                   ; Center X
R2 = 0                   ; Center Y
R3 = 40                  ; Radius
R4 = 6                   ; Number of holes
R5 = 0                   ; Start angle
R6 = -15                 ; Hole depth

N10 G90 G17 G54 G71
N20 T2 D1                ; 8mm drill
N30 M6
N40 S1500 M3
N50 M8

; Calculate and drill each hole
R10 = 0                  ; Hole counter
WHILE R10 < R4
  R11 = R5 + R10 * 360 / R4      ; Angle for this hole
  R12 = R1 + R3 * COS(R11)       ; X position
  R13 = R2 + R3 * SIN(R11)       ; Y position
  
  G0 X=R12 Y=R13
  G0 Z2
  CYCLE83(50, 0, 1, R6, , 3, , 1, 0.5)  ; Peck drill
  
  R10 = R10 + 1
ENDWHILE

N100 G0 Z50
N110 M9
N120 M5
N130 M30
```

### Example 3: Rectangular Pocket with Subprogram

```gcode
; RECT_POCKET_MAIN.MPF - Main program

N10 G90 G17 G54 G71
N20 T3 D1                ; 10mm end mill
N30 M6
N40 S4000 M3
N50 M8

; Machine pocket at 50,50
N60 RECT_POCKET(50, 50, 80, 60, 5, 10, -20, 500)

; Machine another pocket at 150,50
N70 RECT_POCKET(150, 50, 60, 40, 3, 7, -15, 500)

N80 G0 Z100
N90 M9
N100 M5
N110 M30

;--------------------------------------------------------
; RECT_POCKET.SPF - Rectangular pocket subprogram
;--------------------------------------------------------
PROC RECT_POCKET(REAL CX, REAL CY, REAL LEN, REAL WID, REAL CRAD, REAL TOOL_DIA, REAL DEPTH, REAL FEED)
  
  DEF REAL STEPOVER = TOOL_DIA * 0.7
  DEF REAL STEPDWN = TOOL_DIA * 0.3
  DEF REAL X1, X2, Y1, Y2
  DEF REAL CURR_Z = 0
  DEF REAL CURR_W
  
  ; Calculate pocket boundaries
  X1 = CX - LEN/2 + TOOL_DIA/2
  X2 = CX + LEN/2 - TOOL_DIA/2
  Y1 = CY - WID/2 + TOOL_DIA/2
  Y2 = CY + WID/2 - TOOL_DIA/2
  
  ; Position above start
  G0 X=CX Y=CY
  G0 Z5
  
  ; Depth passes
  WHILE CURR_Z > DEPTH
    CURR_Z = CURR_Z - STEPDWN
    IF CURR_Z < DEPTH
      CURR_Z = DEPTH
    ENDIF
    
    G1 Z=CURR_Z F=FEED/3    ; Plunge
    
    ; Spiral out from center
    CURR_W = STEPOVER
    WHILE CURR_W < WID/2 - TOOL_DIA/2
      G1 X=CX + CURR_W Y=CY F=FEED
      G1 Y=CY + CURR_W
      G1 X=CX - CURR_W
      G1 Y=CY - CURR_W
      G1 X=CX + CURR_W + STEPOVER
      CURR_W = CURR_W + STEPOVER
    ENDWHILE
    
    ; Finish pass on perimeter
    G1 X=X1 Y=Y1 F=FEED
    G1 X=X2
    G3 X=X2 Y=Y1+CRAD*2 CR=CRAD
    G1 Y=Y2-CRAD
    G3 X=X2-CRAD*2 Y=Y2 CR=CRAD
    G1 X=X1+CRAD
    G3 X=X1 Y=Y2-CRAD*2 CR=CRAD
    G1 Y=Y1+CRAD
    G3 X=X1+CRAD*2 Y=Y1 CR=CRAD
    
    G0 Z2
  ENDWHILE
  
  G0 Z10

RET
```

### Example 4: Contour Milling with Cutter Compensation

```gcode
; CONTOUR.MPF - External contour with cutter comp
; Uses G41/G42 for automatic radius compensation

N10 G90 G17 G54 G71
N20 T4 D1                ; 12mm end mill
N30 M6
N40 S3500 M3
N50 M8

; Set depth
R1 = -5                  ; Depth

; Approach with compensation
N60 G0 X-20 Y-20
N70 G0 Z5
N80 G1 Z=R1 F300

; Start cutter compensation (left of path)
N90 G41 X0 Y0 F500       ; G41 = left, G42 = right

; Contour (100x80 rectangle with chamfers)
N100 G1 X100
N110 G1 X110 Y10         ; Chamfer
N120 G1 Y70
N130 G1 X100 Y80         ; Chamfer
N140 G1 X0
N150 G1 X-10 Y70         ; Chamfer
N160 G1 Y10
N170 G1 X0 Y0            ; Chamfer

; Cancel compensation and retract
N180 G40 X-20 Y-20       ; Cancel on departure move
N190 G0 Z50

N200 M9
N210 M5
N220 M30
```

### Example 5: Thread Milling (Internal)

```gcode
; THREAD_MILL.MPF - Internal thread milling M20x2.5

DEF REAL MAJOR_DIA = 20
DEF REAL PITCH = 2.5
DEF REAL DEPTH = 25
DEF REAL TOOL_DIA = 12    ; Thread mill cutter
DEF REAL THREAD_RAD, START_RAD, HELIX_Z

N10 G90 G17 G54 G71
N20 T5 D1                 ; Thread mill
N30 M6
N40 S1200 M3
N50 M8

; Calculate thread radius (tool center path)
THREAD_RAD = (MAJOR_DIA - TOOL_DIA) / 2

; Position at hole center
N60 G0 X0 Y0
N70 G0 Z5
N80 G1 Z=-DEPTH F500      ; Go to full depth

; Approach to thread (tangent entry)
N90 G1 X=THREAD_RAD F300  ; Linear approach to radius

; Mill thread (climb milling, helix up)
; One complete helix = one pitch of thread
HELIX_Z = -DEPTH + PITCH

N100 G3 X=THREAD_RAD Y0 Z=HELIX_Z I=-THREAD_RAD J0 F400

; Continue helical path to top
WHILE HELIX_Z < 0
  HELIX_Z = HELIX_Z + PITCH
  IF HELIX_Z > 0
    HELIX_Z = 0
  ENDIF
  G3 X=THREAD_RAD Y0 Z=HELIX_Z I=-THREAD_RAD J0
ENDWHILE

; Exit
N200 G1 X0 F300           ; Return to center
N210 G0 Z50

N220 M9
N230 M5
N240 M30
```

### Example 6: Engraving Text

```gcode
; ENGRAVE.MPF - Simple text engraving
; Uses single-line font approximation

DEF STRING[50] TEXT = "PRISM"
DEF REAL CHAR_H = 10       ; Character height
DEF REAL CHAR_W = 7        ; Character width
DEF REAL DEPTH = -0.3      ; Engraving depth
DEF REAL START_X = 10
DEF REAL START_Y = 50
DEF INT I, CHAR_CODE
DEF REAL CX, CY

N10 G90 G17 G54 G71
N20 T6 D1                  ; Engraving tool (60° V-cutter)
N30 M6
N40 S12000 M3

; Position
N50 G0 X=START_X Y=START_Y
N60 G0 Z5

; Process each character
FOR I = 0 TO STRLEN(TEXT) - 1
  CX = START_X + I * CHAR_W * 1.2
  CY = START_Y
  CHAR_CODE = FRAME(TEXT, I, 1)  ; Get character ASCII code
  
  ; Call character subprogram
  ENGRAVE_CHAR(CX, CY, CHAR_H, DEPTH, CHAR_CODE)
ENDFOR

N100 G0 Z50
N110 M5
N120 M30

;--------------------------------------------------------
; ENGRAVE_CHAR.SPF - Engrave single character
; Simplified stroke font for demonstration
;--------------------------------------------------------
PROC ENGRAVE_CHAR(REAL X0, REAL Y0, REAL H, REAL D, INT CODE)
  DEF REAL W = H * 0.7
  
  G0 X=X0 Y=Y0
  G0 Z2
  
  ; Select character by ASCII code
  CASE CODE OF
    80:  ; P
      G0 X=X0 Y=Y0
      G1 Z=D F1000
      G1 Y=Y0+H F2000
      G1 X=X0+W
      G1 Y=Y0+H*0.6
      G1 X=X0
      G0 Z2
      
    82:  ; R
      G0 X=X0 Y=Y0
      G1 Z=D F1000
      G1 Y=Y0+H F2000
      G1 X=X0+W
      G1 Y=Y0+H*0.6
      G1 X=X0
      G0 Z2
      G0 X=X0+W*0.3 Y=Y0+H*0.6
      G1 Z=D F1000
      G1 X=X0+W Y=Y0 F2000
      G0 Z2
      
    73:  ; I
      G0 X=X0+W*0.5 Y=Y0
      G1 Z=D F1000
      G1 Y=Y0+H F2000
      G0 Z2
      
    83:  ; S
      G0 X=X0+W Y=Y0+H
      G1 Z=D F1000
      G3 X=X0 Y=Y0+H*0.75 CR=W*0.4 F2000
      G2 X=X0+W Y=Y0+H*0.25 CR=W*0.4
      G3 X=X0 Y=Y0 CR=W*0.4
      G0 Z2
      
    77:  ; M
      G0 X=X0 Y=Y0
      G1 Z=D F1000
      G1 Y=Y0+H F2000
      G1 X=X0+W*0.5 Y=Y0+H*0.5
      G1 X=X0+W Y=Y0+H
      G1 Y=Y0
      G0 Z2
      
    DEFAULT:
      ; Unknown character - skip
  ENDCASE
  
RET
```

### Example 7: Probing Cycle - Find Part Edge

```gcode
; PROBE_EDGE.MPF - Find X edge with touch probe
; Uses CYCLE978 or manual G31 approach

DEF REAL SEARCH_DIST = 20
DEF REAL MEAS_FEED = 100
DEF REAL RESULT_X

N10 G90 G17 G54 G71
N20 T10 D1               ; Touch probe
N30 M6

; Position near expected edge
N40 G0 X-10 Y50
N50 G0 Z-10              ; At measurement height

; Using CYCLE978 (single point measurement)
; CYCLE978(_MESSION, _MA, _TESSION, _PRESSION, _FA, _TSA, _VMS, _NMSP, _EVESSION)

CYCLE978(1, 101, 1, 1, MEAS_FEED, 1)
; Measures in +X direction, stores in $AA_MW[X]

; Manual approach alternative (G31)
;N60 G31 X=SEARCH_DIST F=MEAS_FEED
;RESULT_X = $AA_MW[X]

; Store result
RESULT_X = $AA_MW[X]
MSG("Edge found at X = " << RESULT_X)

; Set work offset
$P_UIFR[1, X, TR] = RESULT_X

N100 G0 Z50
N110 M30
```

### Example 8: Helical Bore Milling

```gcode
; HELIX_BORE.MPF - Helical interpolation to mill a bore

DEF REAL CENTER_X = 50
DEF REAL CENTER_Y = 50
DEF REAL BORE_DIA = 40
DEF REAL TOOL_DIA = 12
DEF REAL DEPTH = -30
DEF REAL HELIX_PITCH = 2.0   ; Z per revolution
DEF REAL HELIX_RAD, CURR_Z, REVOLUTIONS
DEF INT I

N10 G90 G17 G54 G71
N20 T7 D1                ; 12mm end mill
N30 M6
N40 S3000 M3
N50 M8

; Calculate helix radius (tool center)
HELIX_RAD = (BORE_DIA - TOOL_DIA) / 2

; Calculate revolutions needed
REVOLUTIONS = ABS(DEPTH) / HELIX_PITCH

; Position at center, above part
G0 X=CENTER_X Y=CENTER_Y
G0 Z5

; Plunge to start (or ramp in)
G0 Z2
G1 Z0 F500

; Move to helix start position
G1 X=CENTER_X+HELIX_RAD F300

; Helical interpolation down
CURR_Z = 0
FOR I = 1 TO ROUNDUP(REVOLUTIONS, 0)
  CURR_Z = CURR_Z - HELIX_PITCH
  IF CURR_Z < DEPTH
    CURR_Z = DEPTH
  ENDIF
  ; Full 360° helix with Z movement
  G2 X=CENTER_X+HELIX_RAD Y=CENTER_Y Z=CURR_Z I=-HELIX_RAD J0 F800
ENDFOR

; Finish pass at final depth (full circle, no Z)
G2 X=CENTER_X+HELIX_RAD Y=CENTER_Y I=-HELIX_RAD J0

; Exit to center
G1 X=CENTER_X Y=CENTER_Y F300

N200 G0 Z50
N210 M9
N220 M5
N230 M30
```

### Example 9: Multiple Part Origins (Fixture Offsets)

```gcode
; MULTI_PART.MPF - Machine same feature at multiple G54/G55/G56 offsets

DEF INT OFFSET_NUM
DEF INT MAX_OFFSETS = 6

N10 G90 G17 G71
N20 T1 D1                ; End mill
N30 M6
N40 S4000 M3
N50 M8

; Loop through work offsets G54-G59
FOR OFFSET_NUM = 0 TO MAX_OFFSETS - 1
  
  ; Select work offset (G500 = G54, G505 = G55, etc.)
  G500 + OFFSET_NUM * 5
  
  ; Check if offset is defined (non-zero)
  IF $P_UIFR[OFFSET_NUM, X, TR] == 0 AND $P_UIFR[OFFSET_NUM, Y, TR] == 0
    ; Skip undefined offset
    MSG("Skipping offset " << OFFSET_NUM)
  ELSE
    ; Machine the part at this offset
    MSG("Machining part " << OFFSET_NUM + 1)
    
    G0 X0 Y0
    G0 Z5
    
    ; Simple pocket at each location
    POCKET1(50, 0, 2, -10, , 50, 30, 3, 25, 15, 0, 1, 300, 500, 2, 2)
    
    G0 Z50
  ENDIF
  
ENDFOR

N100 G54                 ; Return to G54
N110 G0 X0 Y0
N120 M9
N130 M5
N140 M30
```

### Example 10: Tool Life Check and Sister Tool

```gcode
; TOOL_LIFE.MPF - Check tool life and switch to sister tool

DEF INT PRIMARY_TOOL = 1
DEF INT SISTER_TOOL = 11    ; Sister tool in pocket 11
DEF REAL LIFE_LIMIT = 60    ; Minutes
DEF REAL CURRENT_LIFE

PROC CHECK_TOOL_LIFE(INT TOOL_NUM)
  ; Read current tool life
  CURRENT_LIFE = $TC_MOP5[TOOL_NUM]  ; Current use time/count
  
  IF CURRENT_LIFE > LIFE_LIMIT
    MSG("Tool " << TOOL_NUM << " life exceeded!")
    
    ; Check if sister tool available
    IF $TC_DP3[SISTER_TOOL, 1] <> 0  ; Has length data
      MSG("Switching to sister tool " << SISTER_TOOL)
      T=SISTER_TOOL
      M6
      D1
    ELSE
      ; No sister tool - stop
      M0                 ; Program stop
      SETAL(65100, "Replace tool and restart")
    ENDIF
  ENDIF
RET

; Main program
N10 G90 G17 G54 G71
N20 T=PRIMARY_TOOL D1
N30 M6

; Check tool life before operations
CHECK_TOOL_LIFE(PRIMARY_TOOL)

N40 S3000 M3
N50 M8

; Machining operations...
G0 X0 Y0
G0 Z5
CYCLE83(50, 0, 2, -30, , 5, , 1, 0.5)  ; Drilling

; Check tool life periodically during long programs
IF $AC_PROG > 1000  ; Every 1000 blocks
  CHECK_TOOL_LIFE($P_TOOL)
ENDIF

N100 G0 Z100
N110 M9
N120 M5
N130 M30
```

---

*END OF PART 1*
*Part 2 will contain: Advanced features, synchronized actions, complete alarm reference, examples 11-20, troubleshooting*


---

# PART 2: ADVANCED FEATURES AND REFERENCE

---

## 11. ADVANCED TRANSFORMATIONS

### 11.1 TRAORI - 5-Axis Orientation Transformation

```gcode
; TRAORI activates 5-axis tool orientation transformation
; Tool tip remains stationary while orientation changes

; Enable TRAORI
TRAORI(1)                ; Activate transformation 1
; or
TRAORI                   ; Default transformation

; 5-axis positioning
G0 X100 Y50 Z20 A30 B15  ; Move with orientation

; Tool orientation vectors (alternative to A/B)
A3 = 0 B3 = 0 C3 = 1     ; Tool vector along Z
A3 = SIN(30) B3 = 0 C3 = COS(30)  ; Tilted 30° in XZ plane

; TCP (Tool Center Point) - tip stays stationary
ORIMKS                   ; Orientation in machine coordinates
ORIWKS                   ; Orientation in workpiece coordinates

; TRAORI with polynomial interpolation
TRAORI(1)
ORISON                   ; Start orientation smoothing
G1 X100 Y50 Z20 A30 B15 F500
X150 Y80 Z25 A45 B20
ORISOF                   ; End smoothing

; Cancel transformation
TRAFOOF                  ; Deactivate transformation
```

### 11.2 TRANSMIT - Face/End Machining on Turning Centers

```gcode
; TRANSMIT transforms XY programming to C-axis + radial axis
; For milling operations on turning centers

; Activate TRANSMIT
TRANSMIT                 ; or TRANSMIT(1)

; Now X = radial, Y = tangential (C-axis), Z = spindle axis
G17                      ; XY plane (face machining)
G0 X30 Y0 Z5
G1 Z0 F500
G1 X50 Y20              ; Linear interpolation (C follows)
G2 X30 Y0 CR=15         ; Arc on face (C interpolates)

; Face milling pocket
POCKET1(...)            ; Works in TRANSMIT mode

; Cancel
TRAFOOF

; TRACYL - Cylinder surface machining
TRACYL(50)              ; 50mm cylinder diameter
; X = around cylinder, Y = along axis, Z = radial
G0 X0 Y0
G1 X50                  ; Groove around cylinder (C follows)

TRAFOOF
```

### 11.3 CYCLE800 - Swivel Plane (5-Axis Positioning)

```gcode
; CYCLE800 - Orients tool/table for angled machining
; Converts 5-axis machine to virtual 3-axis at angle

; Basic syntax
CYCLE800(0, "", 0, 57, 0, 0, 30, 0, 0, 0, 0, 0, -1)
; Parameters vary by machine kinematics

; Simplified call (machine-specific)
CYCLE800(, "TABLE", 0, 57, 0, 0, 45, 30, 0, 0, 1, 0, -1)
; Tilts A=45°, B=30° using table rotation

; After CYCLE800, program in tilted coordinate system
G54                      ; Work offset (now in tilted frame)
G0 X0 Y0
G0 Z5
G1 Z-10 F500            ; Drilling in tilted plane

; Return to normal
CYCLE800()              ; Cancel swivel
```

### 11.4 Coordinate Transformations Summary

| Command | Function | Use Case |
|---------|----------|----------|
| `TRAORI` | 5-axis orientation | Continuous 5-axis milling |
| `TRANSMIT` | Polar transformation | Face machining on lathes |
| `TRACYL` | Cylinder transformation | Cylinder surface machining |
| `TRAANG` | Inclined axis | Inclined Y-axis machines |
| `TRACON` | Transformation concatenation | Combined transformations |
| `CYCLE800` | Swivel plane | 3+2 axis positioning |
| `TRAFOOF` | Cancel all | Return to Cartesian |

---

## 12. SYNCHRONIZED ACTIONS

### 12.1 Synchronized Action Basics

```gcode
; Synchronized actions run parallel to main program
; Syntax: ID=n [condition] DO action

; Simple synchronized action
ID=1 DO $AA_OVR[X] = 50    ; Set X axis override to 50%

; With condition
ID=2 WHEN $AA_IW[Z] < -20 DO $AA_OVR[Z] = 80
; When Z goes below -20, reduce Z override

; Modal synchronized action
ID=3 EVERY $AC_TIME > 10 DO MSG("10 seconds elapsed")
; Every 10 seconds, show message

; Delete synchronized action
CANCEL(1)                ; Cancel ID=1
CANCEL(1, 2, 3)          ; Cancel multiple
CANCEL                   ; Cancel all
```

### 12.2 Condition Keywords

| Keyword | Behavior |
|---------|----------|
| `WHEN` | Execute once when condition becomes true |
| `WHENEVER` | Execute every IPO cycle while condition true |
| `EVERY` | Execute once per true evaluation |
| `FROM` | Execute from condition true until reset |

### 12.3 Synchronized Action Examples

```gcode
; Adaptive feed control based on spindle load
ID=1 WHENEVER $VA_LOAD[S1] > 80 DO $AC_OVR = $AC_OVR - 5
ID=2 WHENEVER $VA_LOAD[S1] < 40 DO $AC_OVR = $AC_OVR + 5

; Tool breakage detection
ID=10 WHEN $VA_LOAD[S1] > 120 DO SETAL(65000, "Spindle overload")

; Position-triggered coolant
ID=20 WHEN $AA_IW[Z] < 0 DO M8    ; Coolant on when Z below surface
ID=21 WHEN $AA_IW[Z] >= 0 DO M9   ; Coolant off above surface

; Path velocity limiting in critical zone
ID=30 WHEN $AA_IW[X] > 100 AND $AA_IW[X] < 150 DO $AC_FPATH_LIM = 200

; Cancel at end of operation
CANCEL(1, 2, 10, 20, 21, 30)
```

### 12.4 Synchronized Action Variables

```gcode
; Real-time access variables ($ prefix)
$AA_IW[axis]             ; Actual position, WCS
$AA_IM[axis]             ; Actual position, MCS
$AA_VACT[axis]           ; Actual velocity
$AC_FPATH                ; Path feedrate
$AC_OVR                  ; Feed override
$VA_LOAD[spindle]        ; Spindle load %
$VA_POWER[spindle]       ; Spindle power
$AC_TIME                 ; Time since program start

; Real-time write variables
$AA_OVR[axis]            ; Axis override
$AC_FPATH_LIM            ; Path feed limit
```

---

## 13. HIGH-SPEED MACHINING (CYCLE832)

### 13.1 CYCLE832 - High Speed Settings

```gcode
; CYCLE832 activates optimized high-speed machining
; CYCLE832(_TOL, _TOLM, _SM, _OTOL)

; Basic call - tolerance only
CYCLE832(0.01)           ; 0.01mm tolerance

; Full parameters
CYCLE832(0.01, , 1)
; _TOL = Tolerance (0.01mm)
; _TOLM = Tolerance mode (default)
; _SM = Smoothing mode (1 = G642 continuous path)

; Deactivate
CYCLE832()               ; Cancel high-speed mode

; Manual equivalent settings
G642                     ; Soft acceleration
SOFT                     ; Soft axis motion
COMPOF                   ; Disable compression (or COMPON)
FFWON                    ; Feed forward on
```

### 13.2 G64/G642 - Continuous Path Modes

```gcode
; G60 - Exact stop (default for some machines)
G60                      ; Stop at each corner

; G64 - Continuous path
G64                      ; Continuous path
G64 ADIS=0.1            ; With distance tolerance

; G641 - Continuous path with programmable deviation
G641 ADIS=0.1 ADISPOS=0.2

; G642 - Continuous path with soft acceleration
G642                     ; Smooth transitions
```

### 13.3 Look-Ahead and Compressor

```gcode
; LOOKAHEAD - Number of blocks to look ahead
; Set via machine data or:
FIFOCTRL(1, 50)          ; FIFO control, 50 blocks

; COMPRESSOR - G-code compression
COMPON                   ; Enable compression
COMPCURV                 ; Curve compression
COMPOF                   ; Disable compression

; COMPCAD - CAD optimized
COMPCAD                  ; For CAD-generated toolpaths
```

---

## 14. COMPLETE ALARM REFERENCE

### 14.1 NC Alarms (1000-4999)

| Alarm | Message | Cause | Solution |
|-------|---------|-------|----------|
| **1000** | Power supply problem | DC link voltage error | Check power supply |
| **1001** | Power fail detected | Mains power interrupted | Check power source |
| **2000** | Axis X: Measuring system | Encoder error X | Check encoder connection |
| **2001** | Axis Y: Measuring system | Encoder error Y | Check encoder connection |
| **2002** | Axis Z: Measuring system | Encoder error Z | Check encoder connection |
| **2010** | Position feedback error | Position loop error | Check feedback system |
| **2100** | Drive X: Ready | Drive not ready | Check drive status |
| **2110** | Drive X: Overcurrent | Drive overcurrent | Reduce load, check motor |
| **2120** | Drive X: Overvoltage | DC link overvoltage | Check braking resistor |
| **2130** | Drive X: Undervoltage | DC link low | Check power supply |
| **2140** | Drive X: Overtemperature | Drive overheating | Improve cooling |
| **2150** | Drive X: Motor overtemperature | Motor overheating | Reduce load, check cooling |
| **2200** | Following error X | Position error exceeded | Reduce feed, check mechanics |
| **2201** | Following error Y | Position error exceeded | Reduce feed, check mechanics |
| **2202** | Following error Z | Position error exceeded | Reduce feed, check mechanics |
| **3000** | Operating mode not possible | Mode switch error | Select valid mode |
| **4000** | Software limit X+ | Positive limit exceeded | Check position/offset |
| **4001** | Software limit X- | Negative limit exceeded | Check position/offset |
| **4002** | Software limit Y+ | Positive limit exceeded | Check position/offset |
| **4003** | Software limit Y- | Negative limit exceeded | Check position/offset |
| **4004** | Software limit Z+ | Positive limit exceeded | Check position/offset |
| **4005** | Software limit Z- | Negative limit exceeded | Check position/offset |
| **4010** | Hardware limit X+ | +X limit switch hit | Jog in -X |
| **4011** | Hardware limit X- | -X limit switch hit | Jog in +X |
| **4012** | Hardware limit Y+ | +Y limit switch hit | Jog in -Y |
| **4013** | Hardware limit Y- | -Y limit switch hit | Jog in +Y |
| **4014** | Hardware limit Z+ | +Z limit switch hit | Jog in -Z |
| **4015** | Hardware limit Z- | -Z limit switch hit | Jog in +Z |

### 14.2 Programming Alarms (10000-18999)

| Alarm | Message | Cause | Solution |
|-------|---------|-------|----------|
| **10000** | Invalid G code | Unknown G code | Check G code |
| **10001** | Invalid M code | Unknown M code | Check M code |
| **10002** | Invalid T code | Tool number invalid | Check tool number |
| **10010** | Block number missing | N required (setting) | Add N number |
| **10020** | Syntax error | Invalid block format | Check syntax |
| **10100** | Division by zero | Calculated /0 | Add zero check |
| **10110** | SQRT of negative | Negative under root | Check calculation |
| **10120** | LOG of zero/negative | Invalid log argument | Check value |
| **10130** | TAN of 90° | Undefined tangent | Avoid 90° |
| **10140** | ASIN/ACOS range | Value outside ±1 | Check argument |
| **12000** | Program not found | File missing | Check path/name |
| **12010** | Subprogram not found | SPF missing | Load subprogram |
| **12020** | Cycle not found | Cycle missing | Check cycle name |
| **12030** | Too many subprogram levels | Nesting exceeded | Reduce nesting |
| **12040** | M17/RET without call | Return without call | Check structure |
| **12050** | PROC error | Invalid procedure | Check PROC syntax |
| **12100** | Variable not defined | DEF missing | Define variable |
| **12110** | Variable type mismatch | Wrong type assignment | Check types |
| **12120** | Array index error | Out of bounds | Check index |
| **12130** | String too long | Exceeds definition | Use longer string |
| **12200** | IF without ENDIF | Missing ENDIF | Add ENDIF |
| **12210** | WHILE without ENDWHILE | Missing ENDWHILE | Add ENDWHILE |
| **12220** | FOR without ENDFOR | Missing ENDFOR | Add ENDFOR |
| **12230** | REPEAT without UNTIL | Missing UNTIL | Add UNTIL |
| **12240** | CASE without ENDCASE | Missing ENDCASE | Add ENDCASE |
| **12250** | LOOP without ENDLOOP | Missing ENDLOOP | Add ENDLOOP |
| **14000** | Arc center error | I/J/K incorrect | Check arc params |
| **14010** | Arc radius error | R creates invalid arc | Check R value |
| **14020** | Arc endpoint error | End doesn't match | Check endpoint |
| **14030** | Helix error | Invalid helix | Check helix params |
| **14100** | Tool offset missing | D not found | Define offset |
| **14110** | Tool length invalid | D length zero | Set length |
| **14120** | Tool radius invalid | D radius zero | Set radius |
| **14200** | Work offset error | Invalid G54-G599 | Check offset number |
| **14300** | Frame error | Invalid frame | Check TRANS/ROT |
| **15000** | Contour error | Contour violation | Check geometry |
| **15010** | Compensation error | G41/G42 invalid | Check approach |
| **15020** | Collision in comp | Comp causes overcut | Modify path |
| **16000** | Spindle error | Spindle not ready | Check spindle |
| **16010** | Spindle speed limit | S exceeds maximum | Reduce S |
| **16020** | Gear range error | Invalid gear | Check gear selection |
| **17000** | Tool change error | ATC fault | Check ATC |
| **17010** | No tool in magazine | Tool missing | Load tool |
| **17020** | Magazine full | No empty pocket | Remove tool |
| **18000** | Cycle parameter error | Invalid cycle param | Check parameters |
| **18010** | Cycle execution error | Cycle failed | Check cycle input |

### 14.3 PLC Alarms (400000-499999)

| Alarm | Message | Cause | Solution |
|-------|---------|-------|----------|
| **400000-449999** | Machine-specific | OEM defined | Check documentation |
| **500000-599999** | User-specific | Custom alarms | Check user manual |

### 14.4 Cycle Alarms (61000-62999)

| Alarm | Message | Cause | Solution |
|-------|---------|-------|----------|
| **61000** | Tool not defined | Cycle needs tool | Define tool |
| **61001** | Plane not defined | G17/18/19 missing | Set plane |
| **61010** | Reference point error | RTP/RFP invalid | Check retract plane |
| **61020** | Depth error | DP/DPR invalid | Check depth |
| **61030** | Diameter error | Invalid diameter | Check size |
| **61100** | Drilling cycle error | CYCLE81-89 param | Check drilling params |
| **61200** | Pocket cycle error | POCKET1-4 param | Check pocket params |
| **61300** | Thread cycle error | Thread params | Check thread params |
| **61400** | Measuring cycle error | Probe params | Check probe setup |
| **61500** | Swivel cycle error | CYCLE800 params | Check swivel params |

### 14.5 Quick Alarm Resolution

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    SINUMERIK ALARM RESOLUTION GUIDE                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ALARM WON'T CLEAR:                                                         │
│  1. Press RESET key                                                         │
│  2. If flashing, fix cause first                                            │
│  3. Channel reset: RESET + channel key                                      │
│  4. NCK reset: RESET held 5 seconds                                         │
│  5. Some alarms need power cycle                                            │
│                                                                             │
│  SOFTWARE LIMITS (4000-4005):                                               │
│  1. Check active work offset (G54-G599)                                     │
│  2. Verify TRANS/ROT frames                                                 │
│  3. Jog away in opposite direction                                          │
│  4. Check programmed positions                                              │
│                                                                             │
│  HARDWARE LIMITS (4010-4015):                                               │
│  1. Hold override key (if available)                                        │
│  2. Jog in opposite direction                                               │
│  3. Check switch actuation                                                  │
│  4. Reference axis if needed                                                │
│                                                                             │
│  DRIVE ALARMS (2xxx):                                                       │
│  1. Check alarm on drive display                                            │
│  2. Verify power connections                                                │
│  3. Check motor temp, cables                                                │
│  4. Reduce acceleration if overload                                         │
│                                                                             │
│  PROGRAMMING ALARMS (10xxx-18xxx):                                          │
│  1. Note line number in alarm                                               │
│  2. Check program at that line                                              │
│  3. Common: missing ENDIF, wrong type                                       │
│  4. Check subprogram availability                                           │
│                                                                             │
│  CYCLE ALARMS (61xxx):                                                      │
│  1. Check cycle parameters                                                  │
│  2. Verify tool/plane setup                                                 │
│  3. Check reference planes                                                  │
│  4. Review cycle documentation                                              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 15. ADVANCED PROGRAMMING EXAMPLES (11-20)

### Example 11: Multi-Spindle Synchronization

```gcode
; SYNC_SPINDLE.MPF - Synchronized spindle operation (turning)
; For machines with main spindle (S1) and sub-spindle (S2)

N10 G90 G18 G54 G71      ; XZ plane for turning

; Start both spindles synchronized
N20 S1=2000 M1=3         ; Main spindle 2000 RPM
N30 S2=2000 M2=3         ; Sub spindle 2000 RPM

; Synchronized C-axis for part handoff
N40 SPOS[1]=0            ; Main spindle to 0°
N50 SPOS[2]=0            ; Sub spindle to 0°

; Move sub-spindle to pickup position
N60 G0 Z2=0              ; Z2 (sub-spindle Z) to 0

; Close sub chuck
N70 M2=68                ; Close sub chuck (M68 = chuck close)

; Open main chuck  
N80 M1=69                ; Open main chuck (M69 = chuck open)

; Retract with part
N90 G0 Z2=-100           ; Sub-spindle retracts with part

; Continue machining on sub-spindle
N100 G96 S200 M1=3       ; CSS on main (or stop)
N110 G0 X50
N120 G1 X30 F0.2         ; Face cut

N200 M30
```

### Example 12: Contour with Tangential Transitions

```gcode
; TANGENT.MPF - Smooth contour with tangent arcs at corners

DEF REAL RAD = 5         ; Transition radius

N10 G90 G17 G54 G71
N20 T1 D1
N30 M6
N40 S3000 M3
N50 M8

; Enable tangential control
N60 G642                 ; Smooth continuous path
N70 G64 ADIS=0.05       ; Continuous with 0.05mm tolerance

; Contour with built-in tangent arcs using RNDM
N80 G0 X-10 Y0 Z5
N90 G1 Z-5 F300
N100 G41 X0 Y0 F500      ; Approach with comp

; Use RNDM for automatic corner rounding
N110 RNDM=RAD            ; Modal rounding radius
N120 G1 X100
N130 G1 Y50
N140 G1 X0
N150 G1 Y0
N160 RNDM=0              ; Cancel rounding

N170 G40 X-10            ; Departure
N180 G0 Z50

N190 M9
N200 M5
N210 M30
```

### Example 13: Adaptive Feedrate with Load Monitoring

```gcode
; ADAPTIVE.MPF - Adjust feed based on spindle load

DEF REAL BASE_FEED = 500
DEF REAL MIN_FEED = 100
DEF REAL MAX_FEED = 800
DEF REAL LOAD_TARGET = 60  ; Target spindle load %
DEF REAL CURRENT_FEED

N10 G90 G17 G54 G71
N20 T1 D1
N30 M6
N40 S4000 M3
N50 M8

; Set up synchronized action for adaptive feed
ID=1 WHENEVER $VA_LOAD[S1] > LOAD_TARGET + 10 DO $AC_OVR = $AC_OVR - 5
ID=2 WHENEVER $VA_LOAD[S1] < LOAD_TARGET - 10 DO $AC_OVR = $AC_OVR + 5
ID=3 WHENEVER $AC_OVR < 20 DO $AC_OVR = 20    ; Minimum override
ID=4 WHENEVER $AC_OVR > 120 DO $AC_OVR = 120  ; Maximum override

; Roughing operation
N60 G0 X0 Y0
N70 G0 Z5
N80 G1 Z-3 F=BASE_FEED/2

; Pocket milling - feed adjusts automatically
N90 G1 X100 F=BASE_FEED
N100 Y50
N110 X0
N120 Y0

; Cancel adaptive control
N130 CANCEL(1, 2, 3, 4)

N140 G0 Z50
N150 M9
N160 M5
N170 M30
```

### Example 14: 5-Axis Ruled Surface

```gcode
; RULED_SURF.MPF - 5-axis ruled surface machining
; Tool follows ruling lines between two curves

DEF INT I, STEPS = 20
DEF REAL U, X1, Y1, Z1, X2, Y2, Z2
DEF REAL A_ANG, B_ANG

N10 G90 G17 G54 G71
N20 T1 D1                ; Ball end mill
N30 M6
N40 S8000 M3
N50 M8

; Activate 5-axis transformation
N60 TRAORI(1)
N70 ORIAXES              ; Orientation via rotary axes

; Enable high-speed settings
N80 CYCLE832(0.02)       ; 0.02mm tolerance

G0 X0 Y0 Z50 A0 B0

FOR I = 0 TO STEPS
  U = I / STEPS          ; Parameter 0 to 1
  
  ; Bottom curve (straight line for this example)
  X1 = 100 * U
  Y1 = 0
  Z1 = 0
  
  ; Top curve (arc in this example)
  X2 = 50 + 50 * COS(180 * U)
  Y2 = 50 * SIN(180 * U)
  Z2 = 30
  
  ; Calculate tool orientation (points from bottom to top)
  A_ANG = ATAN2(Y2 - Y1, X2 - X1)
  B_ANG = ATAN2(Z2 - Z1, SQRT(POT(X2-X1) + POT(Y2-Y1)))
  
  ; Move along bottom curve with orientation toward top
  G1 X=X1 Y=Y1 Z=Z1 A=A_ANG B=B_ANG F1000
ENDFOR

N100 CYCLE832()          ; Cancel high-speed
N110 TRAFOOF             ; Cancel transformation

N120 G0 Z100
N130 M9
N140 M5
N150 M30
```

### Example 15: Complete Probing Sequence

```gcode
; PROBE_SEQ.MPF - Full part setup with probing

DEF REAL X_EDGE, Y_EDGE, Z_TOP
DEF REAL PART_X = 100, PART_Y = 80

N10 G90 G17 G54 G71
N20 T99 D1               ; Touch probe
N30 M6

; ===== FIND Z TOP SURFACE =====
G0 X=PART_X/2 Y=PART_Y/2  ; Center of part
G0 Z10

; Z surface measurement
CYCLE978(1, 103, 1, 1, 100, 1)  ; Probe -Z
Z_TOP = $AA_MW[Z]

MSG("Z surface = " << Z_TOP)

; ===== FIND X EDGE =====
G0 Z=Z_TOP+5
G0 X=-10 Y=PART_Y/2
G0 Z=Z_TOP-5

; X edge measurement
CYCLE978(1, 101, 1, 1, 100, 1)  ; Probe +X
X_EDGE = $AA_MW[X]

MSG("X edge = " << X_EDGE)

; ===== FIND Y EDGE =====
G0 Z=Z_TOP+5
G0 X=PART_X/2 Y=-10
G0 Z=Z_TOP-5

; Y edge measurement
CYCLE978(1, 102, 1, 1, 100, 1)  ; Probe +Y
Y_EDGE = $AA_MW[Y]

MSG("Y edge = " << Y_EDGE)

; ===== SET WORK OFFSET =====
$P_UIFR[1, X, TR] = X_EDGE
$P_UIFR[1, Y, TR] = Y_EDGE
$P_UIFR[1, Z, TR] = Z_TOP

MSG("G54 set: X=" << X_EDGE << " Y=" << Y_EDGE << " Z=" << Z_TOP)

; ===== VERIFY =====
G0 Z=Z_TOP+50
G54                      ; Activate updated G54
G0 X0 Y0                 ; Should be at part corner
G0 Z5                    ; 5mm above surface

M0                       ; Stop for verification
M30
```

### Example 16: Parametric Gear Profile

```gcode
; GEAR.MPF - Involute gear tooth profile
; Simplified single tooth - repeat with rotation

DEF INT TEETH = 20
DEF REAL MODULE = 2.0
DEF REAL PITCH_R, BASE_R, TIP_R, ROOT_R
DEF REAL TOOTH_ANG, PRESSURE_ANG = 20
DEF REAL I, THETA, R, X_POS, Y_POS, INV_ANG

; Calculate gear radii
PITCH_R = MODULE * TEETH / 2
BASE_R = PITCH_R * COS(PRESSURE_ANG)
TIP_R = PITCH_R + MODULE
ROOT_R = PITCH_R - 1.25 * MODULE
TOOTH_ANG = 360 / TEETH

N10 G90 G17 G54 G71
N20 T1 D1                ; Small end mill
N30 M6
N40 S8000 M3
N50 M8

; Process each tooth space
DEF INT TOOTH
FOR TOOTH = 0 TO TEETH - 1
  
  ; Rotate coordinate system for this tooth
  ROT Z=TOOTH * TOOTH_ANG
  
  ; Cut tooth profile (involute curve approximation)
  ; This is simplified - real gear cutting needs special tools/methods
  
  G0 Z5
  G0 X=ROOT_R Y0
  G1 Z-5 F500
  
  ; Approximate involute with small line segments
  FOR I = 0 TO 20
    THETA = I * 2  ; Parameter along involute
    R = BASE_R / COS(THETA)
    IF R > TIP_R
      R = TIP_R
    ENDIF
    INV_ANG = TAN(THETA) - THETA * 3.14159 / 180
    X_POS = R * COS(INV_ANG + TOOTH_ANG/4)
    Y_POS = R * SIN(INV_ANG + TOOTH_ANG/4)
    G1 X=X_POS Y=Y_POS F300
  ENDFOR
  
  ; Return
  G0 Z5
  ROT                    ; Cancel rotation
  
ENDFOR

N100 G0 Z50
N110 M9
N120 M5
N130 M30
```

### Example 17: Error Handling Framework

```gcode
; ERROR_HANDLE.MPF - Robust error handling

DEF INT ERROR_CODE = 0
DEF STRING[50] ERROR_MSG = ""

; Error checking procedure
PROC CHECK_TOOL(INT TOOL_NUM)
  ; Verify tool exists
  IF $TC_DP3[TOOL_NUM, 1] == 0
    ERROR_CODE = 1
    ERROR_MSG = "Tool " << TOOL_NUM << " not defined"
    GOTOF ERROR_HANDLER
  ENDIF
  
  ; Verify tool in magazine
  IF $TC_MPP2[TOOL_NUM, 1] == 0
    ERROR_CODE = 2
    ERROR_MSG = "Tool " << TOOL_NUM << " not in magazine"
    GOTOF ERROR_HANDLER
  ENDIF
RET

PROC CHECK_OFFSET(INT OFFSET_NUM)
  ; Verify work offset defined
  DEF REAL X_VAL = $P_UIFR[OFFSET_NUM, X, TR]
  DEF REAL Y_VAL = $P_UIFR[OFFSET_NUM, Y, TR]
  DEF REAL Z_VAL = $P_UIFR[OFFSET_NUM, Z, TR]
  
  IF X_VAL == 0 AND Y_VAL == 0 AND Z_VAL == 0
    ERROR_CODE = 3
    ERROR_MSG = "Work offset G" << (54 + OFFSET_NUM - 1) << " not set"
    GOTOF ERROR_HANDLER
  ENDIF
RET

; Main program
N10 G90 G17 G71

; Pre-flight checks
CHECK_TOOL(1)
CHECK_TOOL(2)
CHECK_TOOL(3)
CHECK_OFFSET(1)          ; G54

; If we get here, all checks passed
MSG("Pre-flight OK - starting program")

; Normal machining
G54
T1 D1 M6
S3000 M3
; ... operations ...

M30

; Error handler
ERROR_HANDLER:
MSG("ERROR " << ERROR_CODE << ": " << ERROR_MSG)
SETAL(65000 + ERROR_CODE, ERROR_MSG)
M0                       ; Stop for operator
```

### Example 18: Tool Magazine Management

```gcode
; MAGAZINE.MPF - Tool magazine operations

DEF INT TOOL_COUNT = 0
DEF INT I
DEF STRING[200] TOOL_LIST = ""

PROC LIST_TOOLS()
  ; List all tools in magazine
  TOOL_COUNT = 0
  TOOL_LIST = "Tools: "
  
  FOR I = 1 TO 60        ; Assume 60 pocket magazine
    IF $TC_MPP2[I, 1] > 0  ; Tool present
      TOOL_COUNT = TOOL_COUNT + 1
      TOOL_LIST = TOOL_LIST << $TC_MPP2[I, 1] << ","
    ENDIF
  ENDFOR
  
  MSG("Found " << TOOL_COUNT << " tools")
  MSG(TOOL_LIST)
RET

PROC FIND_EMPTY_POCKET() RETURN INT
  DEF INT POCKET
  
  FOR POCKET = 1 TO 60
    IF $TC_MPP2[POCKET, 1] == 0
      RETURN POCKET
    ENDIF
  ENDFOR
  
  RETURN 0               ; No empty pocket
RET

PROC CHECK_TOOL_LIFE(INT TOOL_NUM) RETURN BOOL
  DEF REAL LIFE_USED = $TC_MOP5[TOOL_NUM]
  DEF REAL LIFE_LIMIT = $TC_MOP2[TOOL_NUM]
  
  IF LIFE_LIMIT > 0 AND LIFE_USED > LIFE_LIMIT * 0.9
    RETURN TRUE          ; Life >90% - warn
  ENDIF
  RETURN FALSE
RET

; Main program - tool inventory
N10 LIST_TOOLS()

; Check life on critical tools
IF CHECK_TOOL_LIFE(1)
  MSG("Warning: Tool 1 life almost expired")
ENDIF

IF CHECK_TOOL_LIFE(5)
  MSG("Warning: Tool 5 life almost expired")
ENDIF

DEF INT EMPTY = FIND_EMPTY_POCKET()
IF EMPTY > 0
  MSG("First empty pocket: " << EMPTY)
ELSE
  MSG("Magazine full!")
ENDIF

M30
```

### Example 19: Data Logging to File

```gcode
; DATA_LOG.MPF - Log machining data to file

DEF STRING[100] FILENAME = "/LOG/PART_LOG.TXT"
DEF STRING[200] LOG_LINE
DEF REAL CYCLE_TIME

; Initialize log
PROC INIT_LOG()
  ; Open file for writing
  WRITE(FILENAME, "========================================")
  WRITE(FILENAME, "PRISM Manufacturing Log")
  WRITE(FILENAME, "Date: " << $AC_DATE)
  WRITE(FILENAME, "Time: " << $AC_TIME)
  WRITE(FILENAME, "Program: " << $P_PROG)
  WRITE(FILENAME, "========================================")
RET

; Log tool change
PROC LOG_TOOL(INT TOOL_NUM)
  LOG_LINE = "Tool change: T" << TOOL_NUM
  LOG_LINE = LOG_LINE << " at " << $AC_TIME
  WRITE(FILENAME, LOG_LINE)
RET

; Log position
PROC LOG_POSITION()
  LOG_LINE = "Position: X=" << $AA_IW[X]
  LOG_LINE = LOG_LINE << " Y=" << $AA_IW[Y]
  LOG_LINE = LOG_LINE << " Z=" << $AA_IW[Z]
  WRITE(FILENAME, LOG_LINE)
RET

; Log cycle completion
PROC LOG_CYCLE(STRING[50] CYCLE_NAME, REAL DURATION)
  LOG_LINE = "Cycle: " << CYCLE_NAME
  LOG_LINE = LOG_LINE << " Duration: " << DURATION << "s"
  WRITE(FILENAME, LOG_LINE)
RET

; Main program with logging
N10 INIT_LOG()

N20 G90 G17 G54 G71
WRITE(FILENAME, "Starting machining")

N30 T1 D1 M6
LOG_TOOL(1)

N40 S3000 M3
N50 M8

CYCLE_TIME = $AC_TIME    ; Start timer

; Machining
G0 X0 Y0
G0 Z5
CYCLE83(50, 0, 2, -30, , 5, , 1, 0.5)
LOG_POSITION()

CYCLE_TIME = $AC_TIME - CYCLE_TIME
LOG_CYCLE("CYCLE83 drilling", CYCLE_TIME)

N100 G0 Z100
N110 M9
N120 M5

WRITE(FILENAME, "Program complete")
WRITE(FILENAME, "========================================")

M30
```

### Example 20: Complete Production Program Template

```gcode
; PRODUCTION.MPF - Production-ready program template

;================================================================
; PROGRAM HEADER
;================================================================
; Part Number: PRISM-001
; Part Name: Sample Bracket
; Material: 6061-T6 Aluminum
; Machine: VMC with 4th axis
; Programmer: PRISM System
; Date: 2026-01-24
; Revision: 1.0
;================================================================

;================================================================
; VARIABLE DEFINITIONS
;================================================================
DEF INT PART_COUNT = 0
DEF INT TARGET_COUNT = 10
DEF BOOL TOOL_OK = TRUE
DEF REAL START_TIME, END_TIME, CYCLE_TIME

;================================================================
; SAFETY AND INITIALIZATION
;================================================================
PROC INIT_MACHINE()
  G90 G17 G40 G49 G71    ; Safety line
  G64 ADIS=0.02          ; Continuous path
  G54                     ; Work offset
  M9                      ; Coolant off
  M5                      ; Spindle off
  MSG("Machine initialized")
RET

PROC SAFE_END()
  G90 G0 Z100            ; Safe Z
  G0 X0 Y0               ; Home XY
  M9                      ; Coolant off
  M5                      ; Spindle off
  M30                     ; Program end
RET

;================================================================
; TOOL CHANGE PROCEDURE
;================================================================
PROC TOOL_CHANGE(INT TOOL_NUM, INT SPEED, INT DIRECTION)
  G0 Z100                ; Safe height
  T=TOOL_NUM D1
  M6
  
  IF DIRECTION == 3
    S=SPEED M3           ; CW
  ELSE
    S=SPEED M4           ; CCW
  ENDIF
  
  M8                      ; Coolant on
  MSG("Tool " << TOOL_NUM << " active, S=" << SPEED)
RET

;================================================================
; MAIN PROGRAM LOOP
;================================================================
INIT_MACHINE()

PRODUCTION_LOOP:
  START_TIME = $AC_TIME
  
  ;--- OPERATION 10: Face mill ---
  TOOL_CHANGE(1, 3000, 3)
  G0 X-30 Y-30
  G0 Z2
  G1 Z0 F1000
  G1 X130 F800
  G1 Y30
  G1 X-30
  G0 Z5
  
  ;--- OPERATION 20: Drill holes ---
  TOOL_CHANGE(2, 2500, 3)
  ; Bolt circle
  R1=50 R2=50 R3=30 R4=6
  R10=0
  WHILE R10 < R4
    R11 = R10 * 360 / R4
    G0 X=R1+R3*COS(R11) Y=R2+R3*SIN(R11)
    CYCLE83(50, 0, 2, -20, , 3, , 1, 0.3)
    R10 = R10 + 1
  ENDWHILE
  
  ;--- OPERATION 30: Pocket ---
  TOOL_CHANGE(3, 4000, 3)
  POCKET1(50, 0, 2, -10, , 60, 40, 5, 50, 50, 0, 1, 300, 600, 2, 2)
  
  ;--- OPERATION 40: Contour ---
  TOOL_CHANGE(4, 3500, 3)
  G0 X-10 Y0
  G0 Z2
  G1 Z-5 F500
  G41 X0
  G1 X100 F700
  G1 Y80
  G1 X0
  G1 Y0
  G40 X-10
  G0 Z5
  
  ; Calculate cycle time
  END_TIME = $AC_TIME
  CYCLE_TIME = END_TIME - START_TIME
  
  ; Increment part counter
  PART_COUNT = PART_COUNT + 1
  MSG("Part " << PART_COUNT << "/" << TARGET_COUNT << " - Time: " << CYCLE_TIME << "s")
  
  ; Check if more parts needed
  IF PART_COUNT < TARGET_COUNT
    M0                    ; Wait for next part
    GOTOB PRODUCTION_LOOP
  ENDIF

;================================================================
; PROGRAM END
;================================================================
MSG("Production complete: " << PART_COUNT << " parts")
SAFE_END()
```

---

## 16. TROUBLESHOOTING GUIDE

### 16.1 Common Programming Issues

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    SINUMERIK TROUBLESHOOTING GUIDE                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  PROBLEM: Program won't start                                               │
│  ─────────────────────────────                                              │
│  ✓ Check program selected in correct channel                                │
│  ✓ Verify NC START permission (key switch, mode)                            │
│  ✓ Check for active alarms (RESET first)                                    │
│  ✓ Ensure all safety conditions met (doors, guards)                         │
│  ✓ Check for M00/M01 waiting for start                                      │
│                                                                             │
│  PROBLEM: Syntax error on valid-looking code                                │
│  ───────────────────────────────────────────                                │
│  ✓ Check for invisible characters (copy/paste issues)                       │
│  ✓ Verify string quotes are correct type ("")                               │
│  ✓ Check variable names for reserved words                                  │
│  ✓ Ensure DEF statements are at program start                               │
│  ✓ Verify cycle parameter count matches definition                          │
│                                                                             │
│  PROBLEM: Variables not working                                             │
│  ────────────────────────────────                                           │
│  ✓ DEF must be before first executable line                                 │
│  ✓ Check variable scope (local vs global)                                   │
│  ✓ R-parameters: use = for assignment in motion (X=R1)                      │
│  ✓ Array indices start at 0                                                 │
│  ✓ Check type compatibility (INT vs REAL)                                   │
│                                                                             │
│  PROBLEM: Loop runs forever                                                 │
│  ──────────────────────────                                                 │
│  ✓ Verify counter/condition is being modified                               │
│  ✓ Check loop direction (incrementing vs decrementing)                      │
│  ✓ Ensure exit condition is reachable                                       │
│  ✓ Check for integer overflow                                               │
│                                                                             │
│  PROBLEM: Subprogram not found                                              │
│  ─────────────────────────────                                              │
│  ✓ Check file exists in correct directory                                   │
│  ✓ Verify .SPF extension for subprograms                                    │
│  ✓ Check search path settings                                               │
│  ✓ Ensure PROC name matches call                                            │
│  ✓ Check for case sensitivity                                               │
│                                                                             │
│  PROBLEM: Cycle gives wrong results                                         │
│  ──────────────────────────────────                                         │
│  ✓ Verify plane selection (G17/G18/G19)                                     │
│  ✓ Check retract plane (RTP) height                                         │
│  ✓ Verify tool length offset active                                         │
│  ✓ Check absolute vs incremental depth                                      │
│  ✓ Ensure correct feed and speed                                            │
│                                                                             │
│  PROBLEM: Position errors                                                   │
│  ────────────────────────                                                   │
│  ✓ Check active work offset                                                 │
│  ✓ Verify TRANS/ROT/SCALE frames                                            │
│  ✓ Check tool length/radius offset                                          │
│  ✓ Verify G90/G91 mode                                                      │
│  ✓ Check G17/G18/G19 plane                                                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 16.2 Debug Techniques

```gcode
; TECHNIQUE 1: Message output
MSG("Debug: R1=" << R1 << " R2=" << R2)

; TECHNIQUE 2: Single block through critical section
; Enable single block on HMI, step through

; TECHNIQUE 3: Write to file
WRITE("/LOG/DEBUG.TXT", "X=" << $AA_IW[X])

; TECHNIQUE 4: Alarm at specific point
IF R1 > 100
  SETAL(65000, "R1 exceeded 100")
ENDIF

; TECHNIQUE 5: Program stop at checkpoint
M0                       ; Wait for operator

; TECHNIQUE 6: Store values for later review
$R[100] = $AA_IW[X]      ; Store X position
$R[101] = $AA_IW[Y]      ; Store Y position
$R[102] = $AA_IW[Z]      ; Store Z position

; TECHNIQUE 7: Skip section (comment out)
;CALL PROBLEM_SUB        ; Commented out
```

---

## 17. QUICK REFERENCE CARD

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    SINUMERIK QUICK REFERENCE                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  VARIABLES                           MATH FUNCTIONS                         │
│  R0-R999 = R-parameters              SIN(deg) COS(deg) TAN(deg)             │
│  DEF REAL/INT/BOOL/STRING            ASIN() ACOS() ATAN2(y,x)               │
│  $AA_IW[X] = actual pos WCS          SQRT() POT() (x²) EXP() LN()           │
│  $AA_IM[X] = actual pos MCS          ABS() ROUND() TRUNC()                  │
│  $P_TOOL = active tool               MINVAL() MAXVAL() BOUND()              │
│  $TC_DP6[t,d] = tool radius                                                 │
│                                      CONTROL STRUCTURES                     │
│  MOTION                              IF cond ... ENDIF                      │
│  G0 = Rapid                          IF cond ... ELSE ... ENDIF             │
│  G1 = Linear feed                    WHILE cond ... ENDWHILE                │
│  G2 = CW arc                         FOR var=a TO b ... ENDFOR              │
│  G3 = CCW arc                        REPEAT ... UNTIL cond                  │
│  G33 = Threading                     LOOP ... ENDLOOP                       │
│                                      GOTO label  /  GOTOF  /  GOTOB         │
│  PLANES                                                                     │
│  G17 = XY                            SUBPROGRAMS                            │
│  G18 = XZ                            PROC name(params) ... RET              │
│  G19 = YZ                            name(params)  ; call                   │
│                                      MCALL name   ; modal call              │
│  COMPENSATION                        M17 or RET   ; return                  │
│  G41 = Left                                                                 │
│  G42 = Right                         FRAMES                                 │
│  G40 = Cancel                        TRANS X_ Y_ Z_                         │
│  D_ = Activate offset                ROT X_ Y_ Z_                           │
│                                      SCALE X_ Y_ Z_                         │
│  WORK OFFSETS                        MIRROR X Y                             │
│  G54-G59 = Standard                  ATRANS/AROT = additive                 │
│  G500-G599 = Extended                                                       │
│  $P_UIFR[n] = Access offset n        5-AXIS                                 │
│                                      TRAORI = Enable transformation         │
│  CYCLES                              TRAFOOF = Cancel transformation        │
│  CYCLE81-89 = Drilling               CYCLE800 = Swivel plane                │
│  POCKET1-4 = Milling                 ORIAXES/ORIVECT = Orientation          │
│  SLOT1-2 = Slotting                                                         │
│  CYCLE832 = High speed               SYNCHRONIZED ACTIONS                   │
│  CYCLE978+ = Probing                 ID=n WHEN cond DO action               │
│                                      ID=n WHENEVER cond DO action           │
│  ENDINGS                             CANCEL(n) = Remove action              │
│  M30 = End + rewind                                                         │
│  M17/RET = Subprogram return         ALARM/MESSAGE                          │
│  M0 = Program stop                   MSG("text")                            │
│  M1 = Optional stop                  SETAL(num, "text")                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

*END OF PART 2*
*prism-siemens-programming v1.0 Complete*
*Total Size: ~95KB | 17 Sections | 20 Examples | 200+ Alarms*
