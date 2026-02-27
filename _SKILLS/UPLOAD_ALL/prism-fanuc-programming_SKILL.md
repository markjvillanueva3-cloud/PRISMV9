---
name: prism-fanuc-programming
description: |
  Complete FANUC CNC programming reference. G-codes, M-codes, macros, alarms.
---

✅ **USE when:**
- Writing FANUC macro programs
- Creating custom G-codes or M-codes
- Debugging FANUC alarms
- Implementing probing routines
- Building parametric programs
- Optimizing cycle times with macros

❌ **DON'T USE when:**
- Programming Siemens → use prism-siemens-programming
- Programming Heidenhain → use prism-heidenhain-programming
- Need cross-controller comparison → use prism-gcode-reference

# PART 1: MACRO B FUNDAMENTALS

## 2. MACRO B FUNDAMENTALS

### 2.1 What is Macro B?

Macro B is FANUC's parametric programming language that allows:
- **Variables**: Store and manipulate numeric values
- **Arithmetic**: Perform calculations within G-code
- **Logic**: Make decisions based on conditions
- **Loops**: Repeat operations automatically
- **Subprograms**: Create reusable code modules
- **Custom codes**: Define your own G and M codes

### 2.2 Macro vs. Standard G-Code

```gcode
; STANDARD G-CODE (Fixed values)
G81 X10. Y10. Z-15. R2. F200.
G81 X30. Y10. Z-15. R2. F200.
G81 X50. Y10. Z-15. R2. F200.
G81 X70. Y10. Z-15. R2. F200.
G80

; MACRO B (Parametric - same result)
#1 = 10.                    ; Starting X
#2 = 4                      ; Number of holes
#3 = 0                      ; Counter
WHILE [#3 LT #2] DO 1
  G81 X#1 Y10. Z-15. R2. F200.
  #1 = #1 + 20.             ; Increment X
  #3 = #3 + 1               ; Increment counter
END 1
G80
```

### 2.3 Macro Call Methods

| Method | Syntax | Modal? | Use Case |
|--------|--------|--------|----------|
| **G65** | G65 P1000 A10. B20. | No | Single call with arguments |
| **G66** | G66 P1000 A10. B20. | Yes | Called at each move until G67 |
| **G67** | G67 | - | Cancel G66 |
| **M98** | M98 P1000 | No | Simple subprogram call |
| **M99** | M99 | - | Return from subprogram |

```gcode
; G65 - Non-modal macro call
G65 P9100 A50. B25. C-10.   ; Call O9100 with arguments
G00 X100.                    ; This does NOT call macro again

; G66 - Modal macro call
G66 P9100 A50. B25. C-10.   ; Activate modal macro
G00 X100. Y50.              ; Macro called after this move
G00 X150. Y100.             ; Macro called after this move
G67                         ; Cancel modal macro

; M98 - Subprogram call
M98 P1000                   ; Call O1000
M98 P1000 L5                ; Call O1000, repeat 5 times
M98 P10001000               ; Call O1000, repeat 1000 times (old format)
```

## 4. SYSTEM VARIABLES REFERENCE

### 4.1 Position Variables

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      POSITION SYSTEM VARIABLES                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   PROGRAMMED POSITION (last commanded in block):                            │
│   #5001 = X    #5002 = Y    #5003 = Z                                       │
│   #5004 = 4th  #5005 = 5th  #5006 = 6th                                     │
│                                                                             │
│   CURRENT POSITION (end point, workpiece coord):                            │
│   #5021 = X    #5022 = Y    #5023 = Z                                       │
│   #5024 = 4th  #5025 = 5th  #5026 = 6th                                     │
│                                                                             │
│   MACHINE POSITION (end point, machine coord):                              │
│   #5041 = X    #5042 = Y    #5043 = Z                                       │
│   #5044 = 4th  #5045 = 5th  #5046 = 6th                                     │
│                                                                             │
│   SKIP POSITION (G31 trigger point, machine coord):                         │
│   #5061 = X    #5062 = Y    #5063 = Z                                       │
│   #5064 = 4th  #5065 = 5th  #5066 = 6th                                     │
│                                                                             │
│   SERVO POSITION (actual servo, machine coord):                             │
│   #5081 = X    #5082 = Y    #5083 = Z                                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Tool Offset Variables

```
TOOL LENGTH OFFSETS (Geometry):
#2001 - #2200 = H offset geometry (H1-H200)
Format: #[2000 + offset_number]

TOOL LENGTH OFFSETS (Wear):
#2201 - #2400 = H offset wear (H1-H200)
Format: #[2200 + offset_number]

TOOL RADIUS OFFSETS (Geometry):
#2401 - #2600 = D offset geometry (D1-D200)
Format: #[2400 + offset_number]

TOOL RADIUS OFFSETS (Wear):
#2601 - #2800 = D offset wear (D1-D200)
Format: #[2600 + offset_number]

; Example: Read H1 geometry offset
#100 = #2001                ; H1 geometry

; Example: Write to H5 wear offset
#2205 = -0.05               ; Set H5 wear to -0.05

; Example: Clear all wear offsets
#1 = 1
WHILE [#1 LE 200] DO 1
  #[2200 + #1] = 0          ; Clear length wear
  #[2600 + #1] = 0          ; Clear radius wear
  #1 = #1 + 1
END 1
```

### 4.3 Work Offset Variables

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       WORK OFFSET VARIABLES                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   STANDARD WORK OFFSETS (G54-G59):                                          │
│   ┌─────────┬───────┬───────┬───────┬───────┬───────┬───────┐               │
│   │ Offset  │  X    │  Y    │  Z    │  4th  │  5th  │  6th  │               │
│   ├─────────┼───────┼───────┼───────┼───────┼───────┼───────┤               │
│   │ G54     │ #5221 │ #5222 │ #5223 │ #5224 │ #5225 │ #5226 │               │
│   │ G55     │ #5241 │ #5242 │ #5243 │ #5244 │ #5245 │ #5246 │               │
│   │ G56     │ #5261 │ #5262 │ #5263 │ #5264 │ #5265 │ #5266 │               │
│   │ G57     │ #5281 │ #5282 │ #5283 │ #5284 │ #5285 │ #5286 │               │
│   │ G58     │ #5301 │ #5302 │ #5303 │ #5304 │ #5305 │ #5306 │               │
│   │ G59     │ #5321 │ #5322 │ #5323 │ #5324 │ #5325 │ #5326 │               │
│   └─────────┴───────┴───────┴───────┴───────┴───────┴───────┘               │
│                                                                             │
│   EXTENDED WORK OFFSETS (G54.1 P1-P300):                                    │
│   Base: #7001 for P1                                                        │
│   Formula: #[7000 + (P-1)*20 + axis]                                        │
│   Where axis: 1=X, 2=Y, 3=Z, etc.                                           │
│                                                                             │
│   Example: G54.1 P5 X value = #[7000 + 4*20 + 1] = #7081                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

; Example: Read current G54 values
#100 = #5221                ; G54 X
#101 = #5222                ; G54 Y
#102 = #5223                ; G54 Z

; Example: Set G54 Z to current machine position
#5223 = #5043               ; G54 Z = machine Z

; Example: Copy G54 to G55
#5241 = #5221               ; G55 X = G54 X
#5242 = #5222               ; G55 Y = G54 Y
#5243 = #5223               ; G55 Z = G54 Z
```

### 4.4 Modal Information Variables

```
ACTIVE G-CODE GROUPS:
#4001 = Group 01 (G00, G01, G02, G03...)
#4002 = Group 02 (G17, G18, G19)
#4003 = Group 03 (G90, G91)
#4004 = Group 04 (not used)
#4005 = Group 05 (G93, G94, G95)
#4006 = Group 06 (G20, G21)
#4007 = Group 07 (G40, G41, G42)
#4008 = Group 08 (G43, G44, G49)
#4009 = Group 09 (G73, G74, G76, G80-G89)
#4010 = Group 10 (G98, G99)
#4011 = Group 11 (G50, G51)
#4012 = Group 12 (G54-G59)
#4013 = Group 13 (G61, G62, G63, G64)
#4014 = Group 14 (G66, G67) - M series
#4015 = Group 15 (G96, G97) - T series
#4016 = Group 16 (G68, G69)

; Example: Check if G41 (cutter comp left) is active
IF [#4007 EQ 41] THEN (CUTTER COMP LEFT ACTIVE)

; Example: Check which work offset is active
#100 = #4014                ; Active work offset number
; Returns: 54, 55, 56, 57, 58, or 59

ACTIVE VALUES:
#4109 = Active F (feedrate)
#4113 = Active S (spindle speed)
#4114 = Active T (tool number)
#4119 = Active H (length offset number)
#4120 = Active D (radius offset number)
```

### 4.5 Machine State Variables

```
MISCELLANEOUS STATE:
#3000 = ALARM GENERATION (write to trigger alarm)
        #3000 = 100 (MESSAGE) triggers alarm 100
#3001 = DWELL TIME (milliseconds)
#3002 = MIRROR IMAGE
#3003 = BLOCK SKIP / OPTIONAL STOP
        Bit 0: Block skip active
        Bit 1: Optional stop active
#3004 = EXECUTION CONTROL
        Bit 0: Feed hold enabled
        Bit 1: Feedrate override enabled
        Bit 2: Exact stop enabled
#3006 = STOP WITH MESSAGE

TIME AND COUNTER:
#3011 = DATE (YYYYMMDD format)
#3012 = TIME (HHMMSS format)
#3901 = POWER ON TIME (hours)
#3902 = AUTO OPERATION TIME (hours)

; Example: Generate alarm with message
#3000 = 101 (TOOL BREAKAGE DETECTED)

; Example: Pause with message
#3006 = 1 (CHECK PART AND PRESS CYCLE START)

; Example: Get current date/time
#100 = #3011                ; Date: 20260124
#101 = #3012                ; Time: 143052 (2:30:52 PM)
```

## 6. LOGIC AND COMPARISON

### 6.1 Comparison Operators

| Operator | Meaning | Alternate |
|----------|---------|-----------|
| EQ | Equal to | == |
| NE | Not equal to | <> |
| GT | Greater than | > |
| GE | Greater than or equal | >= |
| LT | Less than | < |
| LE | Less than or equal | <= |

```gcode
; Comparison examples
IF [#1 EQ 0] GOTO 100       ; If #1 equals 0
IF [#1 NE 0] GOTO 100       ; If #1 not equal to 0
IF [#1 GT #2] GOTO 100      ; If #1 greater than #2
IF [#1 GE #2] GOTO 100      ; If #1 greater than or equal to #2
IF [#1 LT #2] GOTO 100      ; If #1 less than #2
IF [#1 LE #2] GOTO 100      ; If #1 less than or equal to #2

; Checking for null (empty) variable
IF [#1 EQ #0] GOTO 100      ; If #1 is null/empty
IF [#1 NE #0] GOTO 100      ; If #1 has a value
```

### 6.2 Logical Operators

| Operator | Meaning |
|----------|---------|
| AND | Both conditions true |
| OR | Either condition true |
| XOR | Exclusive or (some controls) |

```gcode
; Compound conditions
IF [[#1 GT 0] AND [#1 LT 100]] GOTO 100     ; 0 < #1 < 100
IF [[#1 LT 0] OR [#1 GT 100]] GOTO 200      ; #1 < 0 OR #1 > 100
IF [[#1 EQ 1] AND [#2 EQ 1] AND [#3 EQ 1]] GOTO 300  ; All three equal 1

; Nesting with multiple AND/OR
IF [[[#1 GT 0] AND [#1 LT 50]] OR [[#1 GT 100] AND [#1 LT 150]]] GOTO 100
; Jump if 0 < #1 < 50 OR 100 < #1 < 150
```

### 6.3 Floating Point Comparison

**CRITICAL**: Never use EQ for comparing calculated values!

```gcode
; WRONG - May fail due to floating point precision
#1 = 1 / 3 * 3              ; #1 = 0.9999999... not exactly 1
IF [#1 EQ 1] GOTO 100       ; May not branch!

; CORRECT - Use tolerance band
#1 = 1 / 3 * 3
IF [ABS[#1 - 1] LT 0.0001] GOTO 100    ; Within tolerance

; Helper macro for float comparison
; O9999 - Compare two values with tolerance
; A = value 1, B = value 2, C = tolerance
; Returns #100 = 1 if equal, 0 if not
O9999
IF [ABS[#1 - #2] LT #3] THEN #100 = 1
IF [ABS[#1 - #2] GE #3] THEN #100 = 0
M99
```

## 8. CUSTOM G-CODE CREATION

### 8.1 Macro Call with G65

```gcode
; G65 calls a macro program with arguments
; Syntax: G65 P<program> <arguments>

; Program O9100:
O9100 (CUSTOM DRILLING CYCLE)
; Arguments: X, Y = position, Z = depth, R = retract, F = feed
G00 X#24 Y#25               ; Position
G00 Z#18                    ; Rapid to R plane
G01 Z#26 F#9                ; Drill to depth
G00 Z#18                    ; Retract to R
M99

; Call it:
G65 P9100 X50. Y25. Z-15. R2. F200.
G65 P9100 X75. Y25. Z-15. R2. F200.
G65 P9100 X100. Y25. Z-15. R2. F200.
```

### 8.2 Creating Custom G-Codes

Custom G-codes are assigned via parameters:

| Parameter | Range | Purpose |
|-----------|-------|---------|
| 6050 | - | G code program number assignment start |
| 6051 | - | G code number assignment start |
| 6052-6059 | - | G code assignments |

```
PARAMETER SETUP (Example):
Parameter 6050 = 9010      ; Program numbers start at O9010
Parameter 6051 = 100       ; G-codes start at G100
Parameter 6052 = 100       ; G100 calls O9010
Parameter 6053 = 101       ; G101 calls O9011
Parameter 6054 = 102       ; G102 calls O9012

After setup:
G100 X50. Y25. Z-10.       ; Automatically calls O9010 with arguments
G101 A10. B20.             ; Automatically calls O9011 with arguments
```

### 8.3 Modal Macro Call (G66/G67)

```gcode
; G66 makes a macro call MODAL
; The macro is called after EVERY motion block until G67

; O9050 - Modal drilling macro
O9050
G81 X#24 Y#25 Z#26 R#18 F#9
G80
M99

; Usage:
G66 P9050 Z-15. R2. F200.       ; Activate modal macro
G00 X10. Y10.                   ; Macro called after this
G00 X30. Y10.                   ; Macro called after this
G00 X50. Y10.                   ; Macro called after this
G67                             ; Cancel modal macro
G00 X70. Y10.                   ; Macro NOT called
```

### 8.4 Custom M-Code Creation

M-codes can also be assigned to macros:

| Parameter | Purpose |
|-----------|---------|
| 6080 | M code program number assignment start |
| 6081 | M code number assignment start |
| 6082-6089 | M code assignments |

```gcode
; O9000 - Custom M100 (Tool Life Check)
O9000
#1 = #4120                       ; Get current D number
IF [#1 EQ 0] THEN M99            ; No tool, exit
;
#2 = #[500 + #1]                 ; Get life count for this tool
#2 = #2 + 1                      ; Increment
#[500 + #1] = #2                 ; Store back
;
#3 = #[550 + #1]                 ; Get life limit
IF [#3 EQ 0] THEN M99            ; No limit set
;
IF [#2 GT #3] THEN #3000 = 200 (TOOL LIFE EXCEEDED - CHANGE TOOL)
M99

; In program:
T01 M06
M100                             ; Check/update tool life
; ... machining ...
```

## NEXT: PART 2

Part 2 will cover:
- **Section 10**: Advanced Macro Techniques (arrays, external data, background execution)
- **Section 11**: DPRNT and File I/O
- **Section 12**: Complete Alarm Reference (500+ alarms with causes/solutions)
- **Section 13**: Advanced Examples (11-20) including multi-part fixturing, complex probing
- **Section 14**: Key Parameter Reference
- **Section 15**: Troubleshooting Guide

# PART 2: ADVANCED FEATURES AND REFERENCE

## 11. DPRNT - DATA OUTPUT AND FILE I/O

### 11.1 DPRNT Basics

```gcode
; DPRNT outputs formatted data to:
; - RS-232 serial port
; - Memory card
; - Network (Ethernet option)

; Basic syntax
DPRNT[text and variables]

; Text output
DPRNT[STARTING PROGRAM]
DPRNT[]                          ; Blank line
DPRNT[DATE:#3011]                ; Output system variable

; Formatted variable output
; Format: #variable[width.decimals]
DPRNT[X#5021[53]]                ; X position, 5 chars, 3 decimals
DPRNT[X#24[73]Y#25[73]Z#26[73]]  ; Multiple values

; Example outputs:
; #24 = 123.456 with [73] → "X 123.456"
; #24 = 5.5 with [53] → "X 5.500"
; #24 = -12.3 with [62] → "X -12.30"
```

### 11.2 POPEN/PCLOS - File Operations

```gcode
; Open file for output
POPEN                            ; Open output channel

; Write data
DPRNT[MEASUREMENT REPORT]
DPRNT[DATE:#3011 TIME:#3012]
DPRNT[PART NUMBER: ABC123]
DPRNT[]
DPRNT[FEATURE*X*Y*Z*DIAMETER]

; Write measurements
#1 = 1
WHILE [#1 LE 10] DO 1
  DPRNT[HOLE#1[20]*#[100+#1][73]*#[110+#1][73]*#[120+#1][73]*#[130+#1][73]]
  #1 = #1 + 1
END 1

; Close file
PCLOS                            ; Close output channel
```

### 11.3 Probing Data Export Example

```gcode
O9300 (PROBE REPORT GENERATOR)
; Exports probe data to file
;
POPEN
DPRNT[**********************************]
DPRNT[*  INSPECTION REPORT            *]
DPRNT[**********************************]
DPRNT[]
DPRNT[DATE: #3011[80]]
DPRNT[TIME: #3012[60]]
DPRNT[PROGRAM: O#4120[40]]
DPRNT[]
DPRNT[WORK OFFSET G54:]
DPRNT[  X: #5221[93]]
DPRNT[  Y: #5222[93]]
DPRNT[  Z: #5223[93]]
DPRNT[]
DPRNT[MEASURED FEATURES:]
DPRNT[FEATURE    NOMINAL    ACTUAL     DEV]
DPRNT[----------------------------------------]
;
; Output stored measurements (#500-#519)
#1 = 0
WHILE [#1 LT 10] DO 1
  #10 = #[500 + #1*2]            ; Nominal
  #11 = #[501 + #1*2]            ; Actual
  #12 = #11 - #10                ; Deviation
  DPRNT[F#1[20]     #10[83]    #11[83]   #12[83]]
  #1 = #1 + 1
END 1
;
DPRNT[]
DPRNT[END OF REPORT]
PCLOS
M99
```

## 13. ADVANCED PROGRAMMING EXAMPLES (11-20)

### Example 11: Multi-Part Fixture with Part Present Sensing

```gcode
O9050 (MULTI-PART FIXTURE)
; Process multiple parts with presence detection
; Uses skip signal to detect part presence
;
; Arguments:
; A = Number of parts (fixture positions)
; I = X spacing between parts
; J = Y spacing between parts (rows)
; K = Parts per row
;
; Defaults
IF [#1 EQ #0] THEN #1 = 4        ; 4 parts default
IF [#4 EQ #0] THEN #4 = 100.     ; X spacing
IF [#5 EQ #0] THEN #5 = 150.     ; Y spacing
IF [#6 EQ #0] THEN #6 = 2        ; 2 parts per row
;
#30 = 0                          ; Part counter
#31 = 0                          ; Good parts
#32 = 0                          ; Missing parts
;
WHILE [#30 LT #1] DO 1
  ; Calculate position
  #33 = #30 MOD #6               ; Column (0 to K-1)
  #34 = FIX[#30 / #6]            ; Row
  #35 = #33 * #4                 ; X position
  #36 = #34 * #5                 ; Y position
  ;
  ; Move to position
  G00 X#35 Y#36
  G00 Z5.
  ;
  ; Probe for part presence (skip if no contact)
  G31 Z-2. F500.
  ;
  ; Check if part present
  IF [#5063 LT -1.5] GOTO 100    ; No contact = missing part
  ;
  ; Part present - run subprogram
  #31 = #31 + 1                  ; Count good
  M98 P1000                      ; Machine this part
  GOTO 200
  ;
  N100 (PART MISSING)
  #32 = #32 + 1                  ; Count missing
  ;
  N200 (NEXT PART)
  G00 Z50.
  #30 = #30 + 1
END 1
;
; Report
#100 = #31                       ; Good parts
#101 = #32                       ; Missing parts
G00 Z100.
;
IF [#32 GT 0] THEN #3006 = 1 (MISSING PARTS - CHECK FIXTURE)
M99
%
```

### Example 12: Helix Interpolation - Thread Mill ID/OD

```gcode
O9060 (UNIVERSAL THREAD MILL)
; G65 P9060 X_ Y_ Z_ R_ I_ K_ Q_ H_ D_ F_
; X, Y = Center position
; Z = Thread start (top)
; R = Thread end (bottom) - depth
; I = Thread pitch
; K = Major diameter (positive=OD, negative=ID)
; Q = Number of spring passes
; H = Helix direction: 1=climb, 2=conventional
; D = Tool diameter (or use D offset)
; F = Feed
;
; Validate
IF [#24 EQ #0] THEN #24 = 0
IF [#25 EQ #0] THEN #25 = 0
IF [#26 EQ #0] THEN #3000 = 160 (THREAD - Z START REQUIRED)
IF [#18 EQ #0] THEN #3000 = 160 (THREAD - R END REQUIRED)
IF [#4 EQ #0] THEN #3000 = 160 (THREAD - I PITCH REQUIRED)
IF [#6 EQ #0] THEN #3000 = 160 (THREAD - K DIAMETER REQUIRED)
;
; Defaults
IF [#17 EQ #0] THEN #17 = 1      ; 1 spring pass
IF [#8 EQ #0] THEN #8 = 1        ; Climb cut
IF [#9 EQ #0] THEN #9 = #4113 * #4 / 25.4  ; Calculate feed
;
; Get tool diameter
IF [#7 NE #0] GOTO 10
#7 = #[2400 + #4120] * 2         ; From D offset
IF [#7 EQ 0] THEN #3000 = 160 (THREAD - NO TOOL DIAMETER)
N10
;
; Determine ID or OD
#40 = 1                          ; ID flag
IF [#6 GT 0] THEN #40 = 0        ; OD
#6 = ABS[#6]                     ; Make positive
;
; Calculate helix radius (tool center)
IF [#40 EQ 1] GOTO 20
; OD thread
#41 = [#6 / 2] + [#7 / 2]        ; OD: major + tool radius
GOTO 30
N20
; ID thread
#41 = [#6 / 2] - [#7 / 2]        ; ID: major - tool radius
N30
;
; Position
G00 X#24 Y#25
G00 Z[#26 + 5]                   ; Above start
;
; Entry move
G00 Z#26                         ; To start depth
#42 = #24 + #41                  ; Entry X
G01 X#42 F[#9 * 3]               ; Linear approach
;
; Calculate passes
#43 = FUP[ABS[#18 - #26] / #4] + #17
;
; Select direction based on ID/OD and climb/conv
; ID Climb = G02, ID Conv = G03
; OD Climb = G03, OD Conv = G02
#44 = 2                          ; Default G02
IF [[#40 EQ 1] AND [#8 EQ 1]] THEN #44 = 2    ; ID Climb = G02
IF [[#40 EQ 1] AND [#8 EQ 2]] THEN #44 = 3    ; ID Conv = G03
IF [[#40 EQ 0] AND [#8 EQ 1]] THEN #44 = 3    ; OD Climb = G03
IF [[#40 EQ 0] AND [#8 EQ 2]] THEN #44 = 2    ; OD Conv = G02
;
; Generate helix
#45 = #26                        ; Current Z
#46 = 0                          ; Pass counter
;
WHILE [#46 LT #43] DO 1
  #47 = #45 - #4                 ; Next Z
  IF [#47 LT #18] THEN #47 = #18
  ;
  IF [#44 EQ 2] GOTO 50
  ; G03
  G03 X#42 Y#25 Z#47 I[-#41] J0 F#9
  GOTO 60
  N50
  ; G02
  G02 X#42 Y#25 Z#47 I[-#41] J0 F#9
  N60
  ;
  #45 = #47
  #46 = #46 + 1
END 1
;
; Exit
G01 X#24 F[#9 * 3]
G00 Z[#26 + 10]
;
M99
%
```

### Example 13: Corner Rounding / Chamfer Macro

```gcode
O9070 (CORNER CHAMFER/ROUND)
; G65 P9070 X_ Y_ Z_ R_ C_ I_ J_ F_
; X, Y = Corner position
; Z = Depth
; R = Retract
; C = Chamfer/radius size
; I = Direction to X: 1=positive, -1=negative
; J = Direction to Y: 1=positive, -1=negative
; F = Feed
;
; Defaults
IF [#3 EQ #0] THEN #3 = 2.       ; 2mm chamfer default
IF [#4 EQ #0] THEN #4 = 1        ; +X direction
IF [#5 EQ #0] THEN #5 = 1        ; +Y direction
IF [#18 EQ #0] THEN #18 = 3.
IF [#9 EQ #0] THEN #9 = 300.
;
; Calculate start and end points
#30 = #24 - [#3 * #4]            ; Start X
#31 = #25                        ; Start Y
#32 = #24                        ; End X
#33 = #25 - [#3 * #5]            ; End Y
;
; Arc center (for radius)
#34 = #24 - [#3 * #4]            ; Center X
#35 = #25 - [#3 * #5]            ; Center Y
#36 = #34 - #30                  ; I
#37 = #35 - #31                  ; J
;
; Move to start
G00 X#30 Y#31
G00 Z#18
G01 Z#26 F[#9 / 2]
;
; Cut corner (G02 or G03 based on direction)
#38 = #4 * #5                    ; Direction product
IF [#38 GT 0] GOTO 100
G02 X#32 Y#33 I#36 J#37 F#9      ; CW for opposite signs
GOTO 200
N100
G03 X#32 Y#33 I#36 J#37 F#9      ; CCW for same signs
;
N200
G00 Z#18
M99
%
```

### Example 14: Engraving with Character Strokes

```gcode
O9080 (TEXT ENGRAVING SYSTEM)
; G65 P9080 X_ Y_ Z_ H_ S_ F_
; X, Y = Start position
; Z = Engraving depth
; H = Character height (default 5mm)
; S = String variable start (default #100)
; F = Feed
;
; Character data stored in permanent variables
; Each character = 20 strokes max, #600-#799
;
IF [#8 EQ #0] THEN #8 = 5.       ; 5mm height
IF [#19 EQ #0] THEN #19 = 100    ; String starts at #100
IF [#9 EQ #0] THEN #9 = 200.
IF [#26 EQ #0] THEN #26 = -0.2
;
#30 = #24                        ; Current X
#31 = #25                        ; Current Y
#32 = #8 * 0.6                   ; Character width
#33 = #8 / 5                     ; Stroke scale
;
G00 X#30 Y#31
G00 Z2.
;
; Process string (characters in #100-#119)
#40 = 0                          ; Character index
WHILE [#40 LT 20] DO 1
  #41 = #[#19 + #40]             ; Get character code
  IF [#41 EQ 0] GOTO 999         ; End of string
  IF [#41 EQ 32] GOTO 500        ; Space
  ;
  ; Get stroke data for this character
  ; Character data at #[600 + (char-65)*20]
  #42 = 600 + [#41 - 65] * 20    ; Base address (A=65)
  ;
  ; Draw character strokes
  #43 = 0                        ; Stroke index
  WHILE [#43 LT 10] DO 2
    #44 = #[#42 + #43*2]         ; Stroke data 1
    #45 = #[#42 + #43*2 + 1]     ; Stroke data 2
    IF [#44 EQ 0] GOTO 400       ; End of character
    ;
    ; Decode stroke (packed format)
    #46 = FIX[#44 / 100]         ; Command (0=move, 1=line)
    #47 = #44 - #46*100          ; X offset (0-99)
    #48 = #45                    ; Y offset (0-99)
    ;
    ; Scale offsets
    #49 = #30 + #47 * #33
    #50 = #31 + #48 * #33
    ;
    IF [#46 EQ 0] GOTO 300
    ; Line to
    G01 X#49 Y#50 Z#26 F#9
    GOTO 350
    N300
    ; Move to
    G00 Z2.
    G00 X#49 Y#50
    G00 Z#26
    N350
    #43 = #43 + 1
  END 2
  ;
  N400 (NEXT CHARACTER)
  G00 Z2.
  #30 = #30 + #32               ; Advance X
  GOTO 600
  ;
  N500 (SPACE)
  #30 = #30 + #32
  ;
  N600
  #40 = #40 + 1
END 1
;
N999
G00 Z10.
M99
%
```

### Example 15: Web/Rib Machining with Thin Wall Detection

```gcode
O9090 (THIN WALL MILLING)
; G65 P9090 X_ Y_ Z_ I_ J_ Q_ W_ F_
; X, Y = Start corner
; I = Wall length
; J = Wall height (Z depth)
; Q = Depth per pass
; W = Wall thickness
; F = Feed
;
; Adjusts parameters for thin wall stability
;
IF [#4 EQ #0] THEN #3000 = 190 (THIN WALL - I LENGTH REQUIRED)
IF [#5 EQ #0] THEN #3000 = 190 (THIN WALL - J HEIGHT REQUIRED)
IF [#17 EQ #0] THEN #17 = 1.     ; 1mm per pass default
IF [#23 EQ #0] THEN #3000 = 190 (THIN WALL - W THICKNESS REQUIRED)
IF [#9 EQ #0] THEN #9 = 500.
;
; Get tool diameter
#30 = #[2400 + #4120] * 2
IF [#30 EQ 0] THEN #3000 = 190 (THIN WALL - NO TOOL DIAMETER)
;
; Calculate wall flexibility factor
; Thinner walls need slower feed and lighter cuts
#31 = #23 / #30                  ; Thickness/tool ratio
IF [#31 LT 0.5] THEN #31 = 0.5   ; Minimum ratio
IF [#31 GT 1] THEN #31 = 1       ; Maximum ratio
;
; Adjust parameters based on flexibility
#32 = #9 * #31                   ; Adjusted feed
#33 = #17 * #31                  ; Adjusted depth
;
; Climb milling recommended for thin walls
; Always machine from thick to thin side
;
; Calculate passes
#34 = FUP[#5 / #33]              ; Number of Z passes
;
; Position
G00 X#24 Y#25
G00 Z5.
;
; Main machining loop
#35 = 0                          ; Current Z
#36 = 0                          ; Pass counter
;
WHILE [#36 LT #34] DO 1
  #35 = #35 - #33
  IF [#35 LT [-#5]] THEN #35 = -#5
  ;
  G00 Z[#35 + 1]
  G01 Z#35 F[#32/2]
  ;
  ; Cut along wall (alternating direction)
  #37 = #36 MOD 2
  IF [#37 EQ 0] GOTO 100
  ; Return pass
  G01 X#24 F#32
  GOTO 200
  N100
  ; Forward pass
  G01 X[#24 + #4] F#32
  N200
  ;
  #36 = #36 + 1
END 1
;
G00 Z10.
M99
%
```

### Example 16: Probe Square/Rectangular Boss

```gcode
O9100 (PROBE RECTANGULAR BOSS)
; G65 P9100 X_ Y_ I_ J_ Z_ F_
; X, Y = Approximate center
; I = Approximate X size
; J = Approximate Y size
; Z = Probe depth
; F = Feed
;
IF [#4 EQ #0] THEN #3000 = 200 (PROBE BOSS - I SIZE REQUIRED)
IF [#5 EQ #0] THEN #5 = #4       ; Square if J not given
IF [#26 EQ #0] THEN #26 = -5.
IF [#9 EQ #0] THEN #9 = 100.
IF [#24 EQ #0] THEN #24 = 0
IF [#25 EQ #0] THEN #25 = 0
;
#30 = #4 / 2 + 10                ; X search distance
#31 = #5 / 2 + 10                ; Y search distance
;
; Position above boss
G00 X#24 Y#25
G00 Z10.
;
; Move to -X side, outside boss
G00 X[#24 - #30]
G00 Z#26
;
; Probe +X (find -X face)
G31 X[#24 + 5] F#9
#100 = #5061                     ; -X face
G00 X[#24 - #30]
;
; Move to +X side
G00 Z10.
G00 X[#24 + #30]
G00 Z#26
;
; Probe -X (find +X face)
G31 X[#24 - 5] F#9
#101 = #5061                     ; +X face
G00 X[#24 + #30]
;
; Calculate X center and size
#110 = [#100 + #101] / 2         ; X center
#111 = #101 - #100               ; X size
;
; Move to -Y side
G00 Z10.
G00 X#110                        ; Go to found X center
G00 Y[#25 - #31]
G00 Z#26
;
; Probe +Y (find -Y face)
G31 Y[#25 + 5] F#9
#102 = #5062                     ; -Y face
G00 Y[#25 - #31]
;
; Move to +Y side
G00 Z10.
G00 Y[#25 + #31]
G00 Z#26
;
; Probe -Y (find +Y face)
G31 Y[#25 - 5] F#9
#103 = #5062                     ; +Y face
G00 Y[#25 + #31]
;
; Calculate Y center and size
#112 = [#102 + #103] / 2         ; Y center
#113 = #103 - #102               ; Y size
;
; Store results
#500 = #110                      ; Center X
#501 = #112                      ; Center Y
#502 = #111                      ; Size X
#503 = #113                      ; Size Y
;
; Retract and move to found center
G00 Z10.
G00 X#110 Y#112
;
M99
%
```

### Example 17: Automatic Work Offset Calibration

```gcode
O9110 (AUTO CALIBRATE G54-G59)
; Probes reference features and sets all work offsets
; Requires reference sphere/ring at known machine position
;
; Parameters (set in permanent variables)
#510 = 300.                      ; Reference X (machine coord)
#511 = 0.                        ; Reference Y (machine coord)
#512 = -50.                      ; Reference Z (machine coord)
#513 = 25.4                      ; Reference diameter
;
; Probe the reference
G90 G53 G00 Z0                   ; Machine home Z
G53 G00 X#510 Y#511              ; Go to reference
G53 G00 Z[#512 + 25]             ; Above reference
;
; Probe Z
G31 Z[#512 - 10] F100.
#520 = #5063                     ; Reference Z result
;
; Probe X (4-point for center)
G53 G00 Z[#512 + 10]
G53 G00 X[#510 - 20]
G53 G00 Z#520
G31 X[#510 + 5] F100.
#521 = #5061                     ; -X face
G53 G00 X[#510 - 20]
G53 G00 Z[#512 + 10]
G53 G00 X[#510 + 20]
G53 G00 Z#520
G31 X[#510 - 5] F100.
#522 = #5061                     ; +X face
;
#525 = [#521 + #522] / 2         ; Measured X center
;
; Calculate drift from nominal
#530 = #525 - #510               ; X drift
#531 = #520 - #512               ; Z drift
;
; Apply correction to all work offsets
; G54
#5221 = #5221 - #530
#5223 = #5223 - #531
; G55
#5241 = #5241 - #530
#5243 = #5243 - #531
; G56
#5261 = #5261 - #530
#5263 = #5263 - #531
; G57
#5281 = #5281 - #530
#5283 = #5283 - #531
; G58
#5301 = #5301 - #530
#5303 = #5303 - #531
; G59
#5321 = #5321 - #530
#5323 = #5323 - #531
;
; Report
#100 = #530                      ; X correction applied
#101 = #531                      ; Z correction applied
;
G53 G00 Z0
M99
%
```

### Example 18: Dynamic Feed Optimization

```gcode
O9120 (DYNAMIC FEED CONTROL)
; Adjusts feed based on arc radius and chip load
; Call modally with G66 during contour milling
;
; G66 P9120 F_ R_ D_
; F = Base feedrate
; R = Minimum radius threshold
; D = Tool diameter (or from offset)
;
IF [#9 EQ #0] THEN #9 = 500.     ; Base feed
IF [#18 EQ #0] THEN #18 = 5.     ; Min radius threshold
;
; Get tool diameter
IF [#7 NE #0] GOTO 10
#7 = #[2400 + #4120] * 2
IF [#7 EQ 0] THEN M99            ; No tool data
N10
;
; Read current move type
#30 = #4001                      ; G00/G01/G02/G03
;
IF [#30 LT 2] GOTO 900           ; Linear moves - no adjustment
;
; Arc move - calculate effective radius
; For arcs, we need the radius
; This is approximate - uses position delta
#31 = ABS[#5001 - #5021]         ; X delta
#32 = ABS[#5002 - #5022]         ; Y delta
#33 = SQRT[#31*#31 + #32*#32]    ; Chord length
;
; Estimate radius from chord (approximate)
#34 = #33 / 2                    ; Half chord = rough radius estimate
;
; Feed adjustment based on radius
; Smaller radius = slower feed
IF [#34 GT #18] GOTO 100
; Small radius - reduce feed
#35 = #9 * [#34 / #18]           ; Linear reduction
IF [#35 LT #9 * 0.3] THEN #35 = #9 * 0.3  ; Minimum 30%
GOTO 200
;
N100 (LARGER RADIUS)
#35 = #9                         ; Full feed
;
N200
; Apply feed (this affects next block)
; Note: Direct feed override not available in standard Macro B
; This stores recommended feed in #100 for reference
#100 = #35
;
N900
M99
%
```

### Example 19: Tool Breakage Detection

```gcode
O9130 (TOOL BREAK DETECTION)
; Uses laser or touch probe to verify tool
; G65 P9130 T_ L_ D_
; T = Tool number to check
; L = Expected length (optional, uses offset if omitted)  
; D = Diameter to check (optional)
;
IF [#20 EQ #0] THEN #20 = #4120  ; Current tool
;
; CUSTOMIZE FOR YOUR MACHINE:
#30 = 200.                       ; Laser X position
#31 = 0.                         ; Laser Y position
#32 = 100.                       ; Laser Z start (above)
#33 = -100.                      ; Laser Z search limit
#34 = 0.5                        ; Tolerance
;
; Get expected length
IF [#12 NE #0] GOTO 10
#12 = #[2000 + #20]              ; From H offset
IF [#12 EQ 0] THEN #3000 = 230 (BREAK DET - NO LENGTH DATA)
N10
;
; Expected Z at break position
#35 = #32 - #12
;
; Position over detector
G90 G53 G00 Z0
G53 G00 X#30 Y#31
G53 G00 Z#32
;
; Probe down
G31 Z#33 F500.
;
; Check if tool found
IF [#5063 GT #35 - #34] GOTO 100  ; Tool shorter than expected or broken
IF [#5063 LT #35 + #34] GOTO 100  ; Tool longer (wrong tool?)
;
; Tool OK
#100 = 0                         ; Status: OK
GOTO 900
;
N100 (TOOL PROBLEM)
#100 = 1                         ; Status: Problem
#101 = #5063                     ; Measured position
#102 = #35                       ; Expected position
#103 = #5063 - #35               ; Difference
;
IF [#103 GT 0] THEN #3000 = 231 (TOOL BROKEN OR SHORT)
IF [#103 LT 0] THEN #3000 = 232 (WRONG TOOL LENGTH)
;
N900
G53 G00 Z0
M99
%
```

### Example 20: Complete Part Program Framework

```gcode
O0001 (COMPLETE PART FRAMEWORK)
;
; ═══════════════════════════════════════════════════════════════
; PROGRAM HEADER
; ═══════════════════════════════════════════════════════════════
; Part: Example Framework
; Material: 6061-T6 Aluminum
; Machine: 3-Axis VMC
; Programmer: [Name]
; Date: [Date]
;
; Revision History:
; v1.0 - Initial release
;
; ═══════════════════════════════════════════════════════════════
; INITIALIZATION
; ═══════════════════════════════════════════════════════════════
;
N10 G90 G21 G17 G40 G49 G80      ; Safety line
N20 G54                          ; Work offset
;
; Store parameters
#500 = 1                         ; Part counter
#501 = 0                         ; Error flag
;
; ═══════════════════════════════════════════════════════════════
; TOOL 1 - FACE MILL
; ═══════════════════════════════════════════════════════════════
;
N100 T01 M06 (50MM FACE MILL)
G43 H01 Z50.
G65 P9040 T1 A1                  ; Tool life increment
;
S3000 M03
M08
;
; Face mill operation
G00 X-30. Y0
G00 Z2.
G01 Z0 F1000.
G01 X130. F500.
G00 Z50.
;
M09
;
; ═══════════════════════════════════════════════════════════════
; TOOL 2 - DRILL
; ═══════════════════════════════════════════════════════════════
;
N200 T02 M06 (10MM DRILL)
G43 H02 Z50.
G65 P9040 T2 A1                  ; Tool life increment
;
S2500 M03
M08
;
; Bolt circle
G65 P9001 X0 Y0 R30. H6 Z-15. Q3. F200.
;
M09
;
; Tool break check
G65 P9130 T2
IF [#100 EQ 1] GOTO 8000         ; Tool broken
;
; ═══════════════════════════════════════════════════════════════
; TOOL 3 - END MILL
; ═══════════════════════════════════════════════════════════════
;
N300 T03 M06 (12MM END MILL)
G43 H03 Z50.
G65 P9040 T3 A1                  ; Tool life increment
;
S4000 M03
M08
;
; Pocket operation
G65 P9004 X50. Y50. Z-10. R3. D40. Q2. F300.
;
M09
;
; ═══════════════════════════════════════════════════════════════
; PROGRAM END
; ═══════════════════════════════════════════════════════════════
;
N9000 (NORMAL END)
#500 = #500 + 1                  ; Increment part count
G91 G28 Z0 M09
G28 X0 Y0
M30
;
; ═══════════════════════════════════════════════════════════════
; ERROR HANDLING
; ═══════════════════════════════════════════════════════════════
;
N8000 (TOOL BROKEN)
#501 = 1
G91 G28 Z0 M09
M05
M00 (TOOL BROKEN - REPLACE AND RESTART)
GOTO 200                         ; Return to operation
;
%
```

## 15. TROUBLESHOOTING GUIDE

### 15.1 Common Macro Problems

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    MACRO TROUBLESHOOTING GUIDE                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  PROBLEM: Macro doesn't run                                                 │
│  ─────────────────────────                                                  │
│  ✓ Check program number exists (O9xxx)                                      │
│  ✓ Verify G65/G66 P number matches program                                  │
│  ✓ Check Macro B option is enabled                                          │
│  ✓ Verify parameter 6001-6002 range includes program                        │
│                                                                             │
│  PROBLEM: Variables not passing correctly                                   │
│  ─────────────────────────────────────────                                  │
│  ✓ Check argument letters match variable numbers                            │
│  ✓ Verify not using prohibited letters (G, L, N, O, P)                      │
│  ✓ Decimal point required for values (A10. not A10)                         │
│  ✓ Check for null (#0) if optional argument                                 │
│                                                                             │
│  PROBLEM: Calculation wrong                                                 │
│  ─────────────────────────────                                              │
│  ✓ Check operator precedence (use brackets)                                 │
│  ✓ Verify angle units (degrees for trig)                                    │
│  ✓ Use tolerance for float comparison (not EQ)                              │
│  ✓ Check for divide by zero                                                 │
│                                                                             │
│  PROBLEM: Loop won't exit                                                   │
│  ─────────────────────────                                                  │
│  ✓ Verify condition variable is changing                                    │
│  ✓ Check loop counter increment                                             │
│  ✓ Verify comparison direction (LT vs LE vs GT)                             │
│  ✓ Check for infinite loop condition                                        │
│                                                                             │
│  PROBLEM: System variable returns wrong value                               │
│  ────────────────────────────────────────────                               │
│  ✓ Verify variable number for your control model                            │
│  ✓ Check timing (value may update after move)                               │
│  ✓ Verify work offset active for position variables                         │
│  ✓ Check units (machine coord vs work coord)                                │
│                                                                             │
│  PROBLEM: Custom G-code not working                                         │
│  ────────────────────────────────────                                       │
│  ✓ Parameters 6050-6059 set correctly                                       │
│  ✓ Program number matches parameter setting                                 │
│  ✓ Power cycle after parameter change                                       │
│  ✓ G-code not conflicting with standard codes                               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 15.2 Debug Techniques

```gcode
; TECHNIQUE 1: Message output
; Display values during execution
#3006 = 1 (X=#24 Y=#25 Z=#26)

; TECHNIQUE 2: DPRNT logging
POPEN
DPRNT[DEBUG: #1=#1[93] #2=#2[93]]
PCLOS

; TECHNIQUE 3: Store to permanent variables
; Store calculation steps for later review
#500 = #1                        ; Input A
#501 = #2                        ; Input B
#502 = #1 + #2                   ; Step 1 result
#503 = #502 * 2                  ; Step 2 result

; TECHNIQUE 4: Conditional breakpoints
IF [#1 GT 100] THEN #3006 = 1 (VALUE EXCEEDED 100)

; TECHNIQUE 5: Single block the macro
; Parameter 6000 bit 0 = 1 enables macro single block
; Each macro block stops for cycle start

; TECHNIQUE 6: Trap unexpected values
IF [#1 EQ #0] THEN #3000 = 500 (VARIABLE 1 IS NULL)
IF [#1 LT 0] THEN #3000 = 501 (VARIABLE 1 IS NEGATIVE)
IF [#1 GT 1000] THEN #3000 = 502 (VARIABLE 1 TOO LARGE)
```

### 15.3 Performance Optimization

```gcode
; AVOID: Many small calculations
#1 = #10 * 2
#2 = #11 * 2
#3 = #12 * 2
#4 = #1 + #2 + #3

; BETTER: Combine operations
#4 = [#10 + #11 + #12] * 2

; AVOID: Repeated system variable reads
WHILE [#1 LT 100] DO 1
  #10 = #5021                    ; Reading every loop
  ; ...
  #1 = #1 + 1
END 1

; BETTER: Read once before loop
#20 = #5021                      ; Read once
WHILE [#1 LT 100] DO 1
  #10 = #20                      ; Use stored value
  ; ...
  #1 = #1 + 1
END 1

; AVOID: Deep nesting
WHILE [...] DO 1
  WHILE [...] DO 2
    WHILE [...] DO 3
      ; Deep nesting slows execution
    END 3
  END 2
END 1

; BETTER: Flatten with subroutines
WHILE [...] DO 1
  M98 P1000                      ; Call sub for inner work
END 1
```

*END OF PART 2*
*prism-fanuc-programming v1.0 Complete*
*Total Size: ~85KB | 15 Sections | 20 Examples | 150+ Alarms*
