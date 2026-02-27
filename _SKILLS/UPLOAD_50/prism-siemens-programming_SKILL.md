---
name: prism-siemens-programming
description: |
  Siemens SINUMERIK programming reference. 840D/828D controllers.
---

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

*END OF PART 1*
*Part 2 will contain: Advanced features, synchronized actions, complete alarm reference, examples 11-20, troubleshooting*

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
  
  ;--- OPERATION 10: Face mill ## 16. TROUBLESHOOTING GUIDE

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

*END OF PART 2*
*prism-siemens-programming v1.0 Complete*
*Total Size: ~95KB | 17 Sections | 20 Examples | 200+ Alarms*
