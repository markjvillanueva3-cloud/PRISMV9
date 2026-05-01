# PRISM SKILL: FANUC PROGRAMMING
## Complete Macro B Reference with All Alarms and Examples
### Version 1.0 | Part 1 of 2

---

## SKILL METADATA

```yaml
name: prism-fanuc-programming
version: 1.0
category: controller-programming
priority: CRITICAL
tokens: ~45000
dependencies:
  - prism-gcode-reference
consumers:
  - PRISM_POST_PROCESSOR_GENERATOR
  - PRISM_GCODE_PARSER
  - PRISM_MACRO_PROCESSOR
  - PRISM_FANUC_POST_DATABASE
  - PRISM_CONTROLLER_DATABASE
```

---

## WHEN TO USE THIS SKILL

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

---

## TABLE OF CONTENTS

### PART 1 (This Document)
1. [FANUC Control Overview](#1-fanuc-control-overview)
2. [Macro B Fundamentals](#2-macro-b-fundamentals)
3. [Variable System](#3-variable-system)
4. [System Variables Reference](#4-system-variables-reference)
5. [Arithmetic Operations](#5-arithmetic-operations)
6. [Logic and Comparison](#6-logic-and-comparison)
7. [Control Structures](#7-control-structures)
8. [Custom G-Code Creation](#8-custom-g-code-creation)
9. [Programming Examples 1-10](#9-programming-examples)

### PART 2 (Separate Section)
10. Advanced Macro Techniques
11. External Data Interface (DPRNT)
12. Complete Alarm Reference (500+ alarms)
13. Advanced Examples 11-20
14. Parameter Reference
15. Troubleshooting Guide

---

# PART 1: MACRO B FUNDAMENTALS

---

## 1. FANUC CONTROL OVERVIEW

### 1.1 FANUC Control Families

| Series | Application | Key Features |
|--------|-------------|--------------|
| **0i-F** | Entry-level mills/lathes | Basic Macro B, 8 axes |
| **0i-F Plus** | Standard mills/lathes | Enhanced Macro B, 11 axes |
| **30i-B** | High-end machining centers | Full Macro B, 32 axes, nano CNC |
| **31i-B** | Production machines | AICC II, 20 axes |
| **32i-B** | Simple machines | Cost-effective, 6 axes |
| **35i-B** | Transfer machines | Multi-path, 32 axes |
| **Series PM** | Punch press | Specialized |
| **Series LR** | Loaders/robots | Robot integration |

### 1.2 Macro B Availability

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    MACRO B OPTION REQUIREMENTS                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   STANDARD (No option required):                                            │
│   ├── Variables #1-#33 (local)                                              │
│   ├── Variables #100-#199 (common, volatile)                                │
│   ├── Basic arithmetic (+, -, *, /)                                         │
│   ├── G65 macro call                                                        │
│   └── IF/GOTO branching                                                     │
│                                                                             │
│   MACRO B OPTION (Required for full functionality):                         │
│   ├── Variables #500-#999 (permanent)                                       │
│   ├── System variables #1000+ (read machine state)                          │
│   ├── WHILE/DO loops                                                        │
│   ├── IF/THEN statements                                                    │
│   ├── Advanced math (SIN, COS, SQRT, etc.)                                  │
│   ├── G66 modal macro call                                                  │
│   └── Custom G/M code assignment                                            │
│                                                                             │
│   MACRO EXECUTOR (Optional add-on):                                         │
│   ├── Background execution                                                  │
│   ├── Conversational programming                                            │
│   └── Custom screens                                                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.3 Program Structure

```gcode
%                           ; Program start (tape mode)
O0001 (PROGRAM NAME)        ; Program number and comment
;                           ; Comment line
( COMMENT IN PARENTHESES )  ; Inline comment
;
N10 G90 G21 G17 G40 G49 G80 ; Safety line
N20 T01 M06                 ; Tool change
N30 G54                     ; Work offset
N40 S5000 M03               ; Spindle on
N50 G00 X0 Y0               ; Rapid position
N60 G43 H01 Z50.            ; Tool length comp
;
; Main program body
;
N900 G91 G28 Z0             ; Return Z home
N910 G28 X0 Y0              ; Return XY home
N920 M30                    ; Program end
%                           ; Program end (tape mode)
```

---

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

---

## 3. VARIABLE SYSTEM

### 3.1 Variable Types Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         FANUC VARIABLE MAP                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   #0              NULL VARIABLE (always empty, read-only)                   │
│   ─────────────────────────────────────────────────────────────────────     │
│   #1 - #33        LOCAL VARIABLES (G65 arguments, cleared each call)       │
│   ─────────────────────────────────────────────────────────────────────     │
│   #100 - #199     COMMON VARIABLES (shared, cleared at power-off)          │
│   #200 - #299     COMMON VARIABLES (some controls, check manual)           │
│   ─────────────────────────────────────────────────────────────────────     │
│   #500 - #599     PERMANENT VARIABLES (saved through power cycle)          │
│   #500 - #999     PERMANENT VARIABLES (extended, some controls)            │
│   ─────────────────────────────────────────────────────────────────────     │
│   #1000 - #9999+  SYSTEM VARIABLES (read/write machine state)              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Local Variables (#1 - #33)

Local variables receive arguments from G65 macro calls:

| Variable | Letter | Variable | Letter | Variable | Letter |
|----------|--------|----------|--------|----------|--------|
| #1 | A | #12 | L | #23 | W |
| #2 | B | #13 | M | #24 | X |
| #3 | C | #14 | N (prohibited) | #25 | Y |
| #4 | D | #15 | O (prohibited) | #26 | Z |
| #5 | E | #16 | P (prohibited) | #27 | - |
| #6 | F | #17 | Q | #28 | - |
| #7 | G (prohibited) | #18 | R | #29 | - |
| #8 | H | #19 | S | #30 | - |
| #9 | I | #20 | T | #31 | - |
| #10 | J | #21 | U | #32 | - |
| #11 | K | #22 | V | #33 | - |

**Prohibited letters:** G, L, N, O, P (used for other purposes)

```gcode
; Calling macro with arguments:
G65 P9100 A10. B20. C-5. X50. Y25. Z-15. F500.
;
; Inside O9100, variables contain:
; #1 = 10.0  (A)
; #2 = 20.0  (B)
; #3 = -5.0  (C)
; #24 = 50.0 (X)
; #25 = 25.0 (Y)
; #26 = -15.0 (Z)
; #6 = 500.0 (F)
```

### 3.3 Common Variables (#100 - #199)

```gcode
; Shared between main program and subprograms
; CLEARED when power is turned off

; Example: Pass data between programs
; Main program:
#100 = 5                    ; Number of parts
#101 = 25.4                 ; Part spacing
M98 P1000                   ; Call subprogram

; Subprogram O1000:
#102 = 0                    ; Counter
WHILE [#102 LT #100] DO 1
  G81 X[#102 * #101] Y0 Z-10. R2. F200.
  #102 = #102 + 1
END 1
G80
M99
```

### 3.4 Permanent Variables (#500 - #999)

```gcode
; SAVED through power cycle
; Use for: Tool life counts, calibration data, setup values

; Example: Tool life counter
; At program start:
#500 = #500 + 1             ; Increment tool 1 count
IF [#500 GT 100] THEN #3000 = 1 (TOOL 1 LIFE EXCEEDED)

; Store calibration offset:
#510 = -0.0127              ; Z offset from last probe

; Store setup values:
#520 = 5000                 ; Default spindle speed
#521 = 500                  ; Default feed rate
```

### 3.5 Null Variable (#0)

```gcode
; #0 is always empty (null/vacant)
; Used to check if an argument was passed

; Example: Default value if not specified
G65 P9100 X50. Y25.         ; Z not specified

; In O9100:
IF [#26 EQ #0] THEN #26 = -10.  ; If Z not passed, use -10
G01 Z#26 F500.
```

---

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

---

## 5. ARITHMETIC OPERATIONS

### 5.1 Basic Operations

| Operation | Syntax | Example | Result |
|-----------|--------|---------|--------|
| Addition | #i = #j + #k | #1 = #2 + #3 | Sum |
| Subtraction | #i = #j - #k | #1 = #2 - #3 | Difference |
| Multiplication | #i = #j * #k | #1 = #2 * #3 | Product |
| Division | #i = #j / #k | #1 = #2 / #3 | Quotient |
| Assignment | #i = value | #1 = 100 | Direct set |

```gcode
; Basic arithmetic examples
#1 = 100                    ; Direct assignment
#2 = 50
#3 = #1 + #2                ; #3 = 150
#4 = #1 - #2                ; #4 = 50
#5 = #1 * #2                ; #5 = 5000
#6 = #1 / #2                ; #6 = 2

; Combined operations (evaluated left to right)
#7 = #1 + #2 * 2            ; #7 = 100 + 100 = 200 (NOT 100 + 50*2)
#8 = [#1 + #2] * 2          ; #8 = 300 (brackets force order)

; Nested brackets
#9 = [[#1 + #2] * 2] / 3    ; #9 = 100
```

### 5.2 Trigonometric Functions

| Function | Syntax | Angle Unit | Notes |
|----------|--------|------------|-------|
| Sine | SIN[angle] | Degrees | Returns -1 to 1 |
| Cosine | COS[angle] | Degrees | Returns -1 to 1 |
| Tangent | TAN[angle] | Degrees | Undefined at 90°, 270° |
| Arc Sine | ASIN[value] | - | Returns degrees |
| Arc Cosine | ACOS[value] | - | Returns degrees |
| Arc Tangent | ATAN[y]/[x] | - | Returns degrees (4 quadrant) |

```gcode
; Trigonometric calculations
#1 = SIN[30]                ; #1 = 0.5
#2 = COS[60]                ; #2 = 0.5
#3 = TAN[45]                ; #3 = 1.0
#4 = ASIN[0.5]              ; #4 = 30.0 (degrees)
#5 = ACOS[0.5]              ; #5 = 60.0 (degrees)
#6 = ATAN[1]/[1]            ; #6 = 45.0 (degrees)
#7 = ATAN[-1]/[1]           ; #7 = -45.0 (degrees)

; Bolt circle calculation
#10 = 50                    ; Bolt circle radius
#11 = 8                     ; Number of holes
#12 = 0                     ; Starting angle
#13 = 0                     ; Hole counter

WHILE [#13 LT #11] DO 1
  #14 = #12 + [360 / #11] * #13     ; Angle for this hole
  #15 = #10 * COS[#14]              ; X position
  #16 = #10 * SIN[#14]              ; Y position
  G81 X#15 Y#16 Z-10. R2. F200.
  #13 = #13 + 1
END 1
G80
```

### 5.3 Mathematical Functions

| Function | Syntax | Description |
|----------|--------|-------------|
| Square Root | SQRT[value] | √value |
| Absolute | ABS[value] | |value| |
| Round | ROUND[value] | Round to nearest integer |
| Fix (Truncate Down) | FIX[value] | Truncate toward negative |
| Fup (Truncate Up) | FUP[value] | Truncate toward positive |
| Natural Log | LN[value] | logₑ(value) |
| Exponential | EXP[value] | eᵛᵃˡᵘᵉ |
| Power | POW[base,exp] | baseᵉˣᵖ (some controls) |

```gcode
; Mathematical functions
#1 = SQRT[100]              ; #1 = 10
#2 = ABS[-50.5]             ; #2 = 50.5
#3 = ROUND[3.7]             ; #3 = 4
#4 = ROUND[3.4]             ; #4 = 3
#5 = FIX[3.9]               ; #5 = 3 (toward zero)
#6 = FIX[-3.9]              ; #6 = -4 (toward negative infinity)
#7 = FUP[3.1]               ; #7 = 4 (away from zero)
#8 = FUP[-3.1]              ; #8 = -3 (toward positive infinity)
#9 = LN[2.718281828]        ; #9 ≈ 1.0
#10 = EXP[1]                ; #10 ≈ 2.718

; Calculate distance between two points
#20 = 10                    ; X1
#21 = 20                    ; Y1
#22 = 40                    ; X2
#23 = 50                    ; Y2
#24 = SQRT[[[#22-#20]*[#22-#20]] + [[#23-#21]*[#23-#21]]]  ; Distance

; Calculate number of passes for given depth
#30 = 25                    ; Total depth
#31 = 3                     ; Max depth per pass
#32 = FUP[#30 / #31]        ; Number of passes = 9
```

### 5.4 Modulo Operation

```gcode
; MOD function (some controls)
#1 = 17 MOD 5               ; #1 = 2 (remainder of 17/5)

; Alternative without MOD:
#1 = 17 - [FIX[17/5] * 5]   ; #1 = 2

; Useful for serpentine patterns
#10 = 7                     ; Row number
#11 = #10 MOD 2             ; #11 = 1 (odd row)
IF [#11 EQ 0] GOTO 100      ; Even row
; Odd row processing
GOTO 200
N100 ; Even row processing
N200 ; Continue
```

---

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

---

## 7. CONTROL STRUCTURES

### 7.1 IF/GOTO (Unconditional and Conditional Jump)

```gcode
; Basic GOTO (unconditional)
GOTO 100                    ; Jump to N100

; Conditional GOTO
IF [#1 EQ 0] GOTO 100       ; Jump to N100 if #1 = 0
IF [#1 NE 0] GOTO 200       ; Jump to N200 if #1 ≠ 0

; GOTO with calculation
#2 = 100 + #1 * 10
GOTO #2                     ; Jump to calculated N number

; Example: Select subroutine based on tool type
; #1 = tool type (1=drill, 2=tap, 3=mill)
IF [#1 EQ 1] GOTO 1000      ; Drilling routine
IF [#1 EQ 2] GOTO 2000      ; Tapping routine
IF [#1 EQ 3] GOTO 3000      ; Milling routine
GOTO 9000                   ; Error - unknown tool type

N1000 (DRILLING ROUTINE)
; ... drilling code ...
GOTO 9999

N2000 (TAPPING ROUTINE)
; ... tapping code ...
GOTO 9999

N3000 (MILLING ROUTINE)
; ... milling code ...
GOTO 9999

N9000 (ERROR)
#3000 = 101 (UNKNOWN TOOL TYPE)

N9999 (END)
M99
```

### 7.2 IF/THEN (Single Line Conditional)

```gcode
; Single statement IF/THEN
IF [#1 EQ 0] THEN #2 = 100                    ; Set #2 if #1 = 0
IF [#1 GT 0] THEN #2 = #1 * 2                 ; Double #1 if positive
IF [#1 LT 0] THEN #2 = ABS[#1]                ; Absolute value if negative

; Multiple IF/THEN for switch-like behavior
IF [#1 EQ 1] THEN #2 = 100
IF [#1 EQ 2] THEN #2 = 200
IF [#1 EQ 3] THEN #2 = 300
IF [[#1 LT 1] OR [#1 GT 3]] THEN #2 = 0       ; Default

; Default value pattern
IF [#1 EQ #0] THEN #1 = 50.0                  ; Set default if null
```

### 7.3 WHILE/DO Loop

```gcode
; Basic WHILE loop structure
WHILE [condition] DO label
  ; Loop body
END label

; Example: Simple counter loop
#1 = 0
WHILE [#1 LT 10] DO 1
  G81 X[#1 * 20] Y0 Z-15. R2. F200.
  #1 = #1 + 1
END 1
G80

; Example: Nested loops (grid pattern)
#1 = 0                      ; Row counter
WHILE [#1 LT 5] DO 1        ; 5 rows
  #2 = 0                    ; Column counter
  WHILE [#2 LT 4] DO 2      ; 4 columns
    G81 X[#2 * 25] Y[#1 * 25] Z-10. R2. F200.
    #2 = #2 + 1
  END 2
  #1 = #1 + 1
END 1
G80

; Example: Loop with early exit
#1 = 0
#3 = 0                      ; Error flag
WHILE [#1 LT 100] DO 1
  ; ... process ...
  IF [#3 EQ 1] GOTO 999     ; Exit on error
  #1 = #1 + 1
END 1
N999 (LOOP EXIT POINT)

; Loop label rules:
; - Labels 1-3 are valid on most controls
; - Some controls support 1-127
; - Cannot GOTO into middle of loop
; - Cannot nest same label number
```

### 7.4 Loop Examples

```gcode
; EXAMPLE: Decremental loop (countdown)
#1 = 10
WHILE [#1 GT 0] DO 1
  ; Process item #1
  #1 = #1 - 1
END 1

; EXAMPLE: Loop with multiple conditions
#1 = 0                      ; Counter
#2 = 0                      ; Sum
WHILE [[#1 LT 100] AND [#2 LT 1000]] DO 1
  #2 = #2 + #1
  #1 = #1 + 1
END 1

; EXAMPLE: Spiral pattern
#10 = 0                     ; Angle
#11 = 5                     ; Start radius
#12 = 50                    ; End radius
#13 = 0.5                   ; Radial increment per degree
WHILE [#11 LE #12] DO 1
  #14 = #11 * COS[#10]
  #15 = #11 * SIN[#10]
  G01 X#14 Y#15 F500
  #10 = #10 + 5             ; 5 degree step
  #11 = #11 + [#13 * 5]     ; Increase radius
END 1
```

---

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

---

## 9. PROGRAMMING EXAMPLES

### Example 1: Simple Bolt Circle

```gcode
O0001 (BOLT CIRCLE - BASIC)
; Input: Hardcoded values
; Description: 6 holes on 2" diameter circle
;
N10 G90 G54 G17 G21 G40 G49 G80
N20 T01 M06 (6MM DRILL)
N30 G43 H01 Z50. S2500 M03
N40 M08
;
; Bolt circle parameters
#1 = 0                           ; Center X
#2 = 0                           ; Center Y
#3 = 25.4                        ; Radius (1")
#4 = 6                           ; Number of holes
#5 = 0                           ; Starting angle
;
; Drill cycle
N50 G99 G81 R3. Z-20. F250.
;
#10 = 0                          ; Hole counter
WHILE [#10 LT #4] DO 1
  #11 = #5 + [360 / #4] * #10    ; Angle
  #12 = #1 + #3 * COS[#11]       ; X position
  #13 = #2 + #3 * SIN[#11]       ; Y position
  X#12 Y#13
  #10 = #10 + 1
END 1
;
N100 G80
N110 G91 G28 Z0 M09
N120 G28 X0 Y0
N130 M30
%
```

### Example 2: Parametric Bolt Circle Macro

```gcode
O9001 (BOLT CIRCLE MACRO)
; G65 P9001 X_ Y_ R_ H_ A_ Z_ Q_ F_
; X = Center X
; Y = Center Y
; R = Radius
; H = Number of holes
; A = Starting angle (default 0)
; Z = Depth
; Q = Peck depth (0 = no peck)
; F = Feed
;
; Validate required arguments
IF [#24 EQ #0] THEN #3000 = 101 (BOLT CIRCLE - X REQUIRED)
IF [#25 EQ #0] THEN #3000 = 101 (BOLT CIRCLE - Y REQUIRED)
IF [#18 EQ #0] THEN #3000 = 101 (BOLT CIRCLE - R REQUIRED)
IF [#8 EQ #0] THEN #3000 = 101 (BOLT CIRCLE - H REQUIRED)
IF [#26 EQ #0] THEN #3000 = 101 (BOLT CIRCLE - Z REQUIRED)
IF [#9 EQ #0] THEN #3000 = 101 (BOLT CIRCLE - F REQUIRED)
;
; Set defaults
IF [#1 EQ #0] THEN #1 = 0        ; Default start angle
IF [#17 EQ #0] THEN #17 = 0      ; Default no peck
;
; Select drill cycle
IF [#17 EQ 0] GOTO 100
G99 G83 R3. Z#26 Q#17 F#9        ; Peck drill
GOTO 200
N100 G99 G81 R3. Z#26 F#9        ; Standard drill
;
; Generate hole positions
N200
#10 = 0
WHILE [#10 LT #8] DO 1
  #11 = #1 + [360 / #8] * #10
  #12 = #24 + #18 * COS[#11]
  #13 = #25 + #18 * SIN[#11]
  X#12 Y#13
  #10 = #10 + 1
END 1
;
G80
M99
%

; USAGE:
; G65 P9001 X0 Y0 R25.4 H8 Z-15. F250.           ; 8 holes, standard drill
; G65 P9001 X50. Y50. R30. H6 A30. Z-20. Q3. F200. ; 6 holes, 30° start, peck
```

### Example 3: Rectangular Grid Pattern

```gcode
O9002 (RECTANGULAR GRID MACRO)
; G65 P9002 X_ Y_ I_ J_ K_ L_ Z_ Q_ F_
; X, Y = Start corner
; I = X spacing
; J = Y spacing
; K = Number of columns
; L = Number of rows
; Z = Depth
; Q = Peck (0 = none)
; F = Feed
;
; Validate
IF [#24 EQ #0] THEN #24 = 0
IF [#25 EQ #0] THEN #25 = 0
IF [#4 EQ #0] THEN #3000 = 102 (GRID - I SPACING REQUIRED)
IF [#5 EQ #0] THEN #3000 = 102 (GRID - J SPACING REQUIRED)
IF [#6 EQ #0] THEN #3000 = 102 (GRID - K COLUMNS REQUIRED)
IF [#12 EQ #0] THEN #3000 = 102 (GRID - L ROWS REQUIRED)
IF [#26 EQ #0] THEN #3000 = 102 (GRID - Z REQUIRED)
IF [#9 EQ #0] THEN #3000 = 102 (GRID - F REQUIRED)
;
; Select cycle
IF [#17 EQ 0] GOTO 50
G99 G83 R3. Z#26 Q#17 F#9
GOTO 100
N50 G99 G81 R3. Z#26 F#9
;
; Generate grid with serpentine pattern
N100
#1 = 0                           ; Row counter
WHILE [#1 LT #12] DO 1
  #2 = 0                         ; Column counter
  #3 = #1 MOD 2                  ; Even or odd row?
  WHILE [#2 LT #6] DO 2
    IF [#3 EQ 0] GOTO 150        ; Even row: left to right
    ; Odd row: right to left
    #10 = #24 + [#6 - 1 - #2] * #4
    GOTO 160
    N150
    #10 = #24 + #2 * #4          ; X position
    N160
    #11 = #25 + #1 * #5          ; Y position
    X#10 Y#11
    #2 = #2 + 1
  END 2
  #1 = #1 + 1
END 1
;
G80
M99
%
```

### Example 4: Thread Milling Macro

```gcode
O9003 (THREAD MILL - INTERNAL)
; G65 P9003 X_ Y_ Z_ R_ K_ I_ Q_ H_ F_
; X, Y = Hole center
; Z = Thread depth (negative)
; R = Retract height
; K = Major diameter
; I = Thread pitch
; Q = Number of spring passes (default 1)
; H = Climb=1, Conventional=0 (default climb)
; F = Feed (calculated if omitted)
;
; Validate
IF [#24 EQ #0] THEN #3000 = 103 (THREAD MILL - X REQUIRED)
IF [#25 EQ #0] THEN #3000 = 103 (THREAD MILL - Y REQUIRED)
IF [#26 EQ #0] THEN #3000 = 103 (THREAD MILL - Z REQUIRED)
IF [#18 EQ #0] THEN #3000 = 103 (THREAD MILL - R REQUIRED)
IF [#6 EQ #0] THEN #3000 = 103 (THREAD MILL - K DIAMETER REQUIRED)
IF [#4 EQ #0] THEN #3000 = 103 (THREAD MILL - I PITCH REQUIRED)
;
; Defaults
IF [#17 EQ #0] THEN #17 = 1      ; 1 spring pass default
IF [#8 EQ #0] THEN #8 = 1        ; Climb cut default
;
; Get tool diameter from offset
#30 = #[2400 + #4120]            ; D offset geometry value
IF [#30 EQ 0] THEN #3000 = 103 (THREAD MILL - NO TOOL DIAMETER)
;
; Calculate helix radius (tool center path)
#31 = [#6 / 2] - #30             ; Major radius - tool radius
;
; Calculate feed if not specified
IF [#9 EQ #0] THEN #9 = #4113 * #4 / 25.4  ; IPM from current RPM
;
; Position
G00 X#24 Y#25
G00 Z#18
;
; Entry move to start of helix
#32 = #24 + #31                  ; Start X (tool center)
G01 X#32 F[#9 * 2]               ; Linear entry
;
; Calculate total passes
#33 = FUP[ABS[#26] / #4] + #17   ; Threads + spring passes
;
; Thread direction
IF [#8 EQ 1] GOTO 200
; Conventional (G02)
#34 = 2
GOTO 300
N200 ; Climb (G03)
#34 = 3
;
; Generate helix
N300
#35 = 0                          ; Pass counter
#36 = 0                          ; Current Z
;
WHILE [#35 LT #33] DO 1
  #37 = #36 - #4                 ; Z at end of this pass
  IF [#37 LT #26] THEN #37 = #26 ; Limit to final depth
  ;
  IF [#34 EQ 2] GOTO 400
  ; Climb cut G03
  G03 X#32 Y#25 Z#37 I[-#31] J0 F#9
  GOTO 500
  N400
  ; Conventional G02
  G02 X#32 Y#25 Z#37 I[-#31] J0 F#9
  ;
  N500
  #36 = #37                      ; Update current Z
  #35 = #35 + 1
END 1
;
; Exit
G01 X#24 F[#9 * 2]               ; Linear exit to center
G00 Z#18                         ; Retract
;
M99
%
```

### Example 5: Circular Pocket with Roughing

```gcode
O9004 (CIRCULAR POCKET)
; G65 P9004 X_ Y_ Z_ R_ D_ Q_ I_ F_ E_
; X, Y = Center
; Z = Final depth
; R = Retract height
; D = Pocket diameter
; Q = Depth per pass
; I = Stepover (default 70% of tool)
; F = Feed
; E = Plunge feed (default F/2)
;
; Validate
IF [#24 EQ #0] THEN #3000 = 104 (CIRC POCKET - X REQUIRED)
IF [#25 EQ #0] THEN #3000 = 104 (CIRC POCKET - Y REQUIRED)
IF [#26 EQ #0] THEN #3000 = 104 (CIRC POCKET - Z REQUIRED)
IF [#18 EQ #0] THEN #3000 = 104 (CIRC POCKET - R REQUIRED)
IF [#7 EQ #0] THEN #3000 = 104 (CIRC POCKET - D DIAMETER REQUIRED)
IF [#17 EQ #0] THEN #3000 = 104 (CIRC POCKET - Q DEPTH/PASS REQUIRED)
IF [#9 EQ #0] THEN #3000 = 104 (CIRC POCKET - F REQUIRED)
;
; Get tool diameter
#30 = #[2400 + #4120] * 2        ; Tool diameter from D offset
IF [#30 EQ 0] THEN #3000 = 104 (CIRC POCKET - NO TOOL DIAMETER)
;
; Defaults
IF [#4 EQ #0] THEN #4 = #30 * 0.7     ; 70% stepover default
IF [#8 EQ #0] THEN #8 = #9 / 2        ; Plunge feed default
;
; Calculate max radius for tool path
#31 = [#7 / 2] - [#30 / 2]       ; Pocket radius - tool radius
;
; Position at center
G00 X#24 Y#25
G00 Z#18
G00 Z3.                          ; Approach
;
; Calculate number of Z passes
#32 = FUP[ABS[#26] / #17]        ; Depth passes
;
; Main loop - depth passes
#33 = 0                          ; Current Z
#34 = 0                          ; Pass counter
;
WHILE [#34 LT #32] DO 1
  #33 = #33 - #17                ; Next Z level
  IF [#33 LT #26] THEN #33 = #26 ; Limit to final depth
  ;
  ; Plunge at center
  G01 Z#33 F#8
  ;
  ; Spiral out
  #35 = #4                       ; Starting radius (one stepover)
  WHILE [#35 LE #31] DO 2
    ; Arc to new radius
    G02 X#24 Y[#25 + #35] I0 J[#35 / 2] F#9
    #35 = #35 + #4               ; Increase radius
    IF [#35 GT #31] THEN #35 = #31  ; Limit to max
  END 2
  ;
  ; Final cleanup circle at max radius
  G02 X#24 Y[#25 + #31] I0 J[-#31] F#9
  ;
  ; Return to center for next depth
  G01 X#24 Y#25 F#9
  ;
  #34 = #34 + 1
END 1
;
G00 Z#18                         ; Retract
M99
%
```

### Example 6: Probing - Find Part Zero (Z Surface)

```gcode
O9010 (PROBE Z SURFACE - SET G54)
; G65 P9010 Z_ F_
; Z = Expected surface (search limit)
; F = Probe feed (default 100)
;
; Defaults
IF [#26 EQ #0] THEN #26 = -50.    ; Default search 50mm
IF [#9 EQ #0] THEN #9 = 100.      ; Default feed
;
; Probe down
G31 Z#26 F#9
;
; Check if probe triggered
IF [#5061 EQ #5041] THEN #3000 = 110 (PROBE - NO CONTACT)
;
; Store result and set G54 Z
#100 = #5063                      ; Machine Z at trigger
#5223 = #100                      ; Set G54 Z to surface
;
; Retract
G91 G00 Z5.
G90
;
; Report
#3006 = 1 (G54 Z SET - PRESS CYCLE START)
M99
%
```

### Example 7: Probing - Find Hole Center (4 Point)

```gcode
O9011 (PROBE HOLE CENTER - 4 POINT)
; G65 P9011 X_ Y_ D_ Z_ F_
; X, Y = Approximate center
; D = Approximate diameter
; Z = Probe depth
; F = Feed
;
; Validate
IF [#7 EQ #0] THEN #3000 = 111 (PROBE HOLE - D REQUIRED)
IF [#26 EQ #0] THEN #26 = -5.     ; Default probe depth
IF [#9 EQ #0] THEN #9 = 100.
IF [#24 EQ #0] THEN #24 = 0
IF [#25 EQ #0] THEN #25 = 0
;
#30 = #7 / 2 + 5                  ; Search distance
;
; Position above approximate center
G00 X#24 Y#25
G00 Z5.
G00 Z#26                          ; Go to probe depth
;
; Probe -X
G31 X[#24 - #30] F#9
#101 = #5061                      ; Store X-
G00 X#24                          ; Return to center
;
; Probe +X
G31 X[#24 + #30] F#9
#102 = #5061                      ; Store X+
G00 X#24
;
; Probe -Y
G31 Y[#25 - #30] F#9
#103 = #5062                      ; Store Y-
G00 Y#25
;
; Probe +Y
G31 Y[#25 + #30] F#9
#104 = #5062                      ; Store Y+
G00 Y#25
;
; Calculate center
#110 = [#101 + #102] / 2          ; X center
#111 = [#103 + #104] / 2          ; Y center
#112 = #102 - #101                ; Measured X diameter
#113 = #104 - #103                ; Measured Y diameter
#114 = [#112 + #113] / 2          ; Average diameter
;
; Store results
#500 = #110                       ; Center X
#501 = #111                       ; Center Y
#502 = #114                       ; Diameter
;
; Retract
G00 Z5.
;
; Move to true center
G00 X#110 Y#111
;
M99
%
```

### Example 8: Tool Setter Macro

```gcode
O9012 (TOOL LENGTH MEASURE)
; G65 P9012 H_
; H = Tool offset number to update (default current tool)
;
; CUSTOMIZE THESE FOR YOUR MACHINE:
#20 = 300.                        ; Tool setter X position
#21 = 0.                          ; Tool setter Y position
#22 = 50.                         ; Safe Z above setter
#23 = -50.                        ; Search limit (below expected)
#24 = 100.                        ; Probe feed
#25 = 50.                         ; Reference tool height
;
; Get offset number
IF [#8 EQ #0] THEN #8 = #4120     ; Use current D if not specified
IF [#8 EQ 0] THEN #3000 = 112 (TOOL MEASURE - NO OFFSET NUMBER)
;
; Position over tool setter
G90 G53 G00 Z0                    ; Machine Z home first
G00 X#20 Y#21                     ; Position over setter
G00 Z#22                          ; Rapid to safe Z
;
; Probe down at high speed
G31 Z#23 F500.                    ; Fast probe
;
; Check contact
IF [#5063 EQ [#22 - [ABS[#23 - #22]]]] THEN #3000 = 112 (NO CONTACT)
;
; Back off and slow probe
G91 G00 Z2.                       ; Back off 2mm
G90
G31 Z#23 F#24                     ; Slow probe for accuracy
;
; Calculate and set offset
#30 = #5063                       ; Triggered position
#31 = #25 - #30                   ; Tool length = reference - triggered
#[2000 + #8] = #31                ; Set H offset geometry
;
; Report
#100 = #31                        ; Store result
;
; Retract safely
G90 G53 G00 Z0
;
M99
%
```

### Example 9: Adaptive Peck Drilling

```gcode
O9030 (ADAPTIVE PECK DRILL)
; G65 P9030 X_ Y_ Z_ R_ Q_ I_ F_ E_
; X, Y = Position
; Z = Final depth
; R = Retract plane
; Q = Initial peck depth
; I = Peck reduction factor (default 0.75)
; F = Drill feed
; E = Minimum peck depth (default 0.5)
;
; Validates
IF [#26 EQ #0] THEN #3000 = 120 (ADAPT PECK - Z REQUIRED)
IF [#18 EQ #0] THEN #18 = 3.      ; Default R plane
IF [#17 EQ #0] THEN #17 = 5.      ; Default first peck
IF [#9 EQ #0] THEN #9 = 200.      ; Default feed
IF [#4 EQ #0] THEN #4 = 0.75      ; Default reduction
IF [#8 EQ #0] THEN #8 = 0.5       ; Default min peck
;
; Position
IF [#24 NE #0] THEN G00 X#24
IF [#25 NE #0] THEN G00 Y#25
G00 Z#18                          ; Rapid to R plane
;
; Initialize
#30 = 0                           ; Current depth
#31 = #17                         ; Current peck depth
;
; Peck loop
WHILE [#30 GT #26] DO 1
  ; Calculate next depth
  #32 = #30 - #31                 ; Target Z
  IF [#32 LT #26] THEN #32 = #26  ; Limit to final
  ;
  ; Drill this peck
  G01 Z#32 F#9
  ;
  ; Full retract for chip clearing
  G00 Z#18
  ;
  ; Rapid back near previous depth (leave 1mm)
  IF [#30 LT -1] THEN G00 Z[#30 + 1]
  ;
  ; Update for next peck
  #30 = #32                       ; Update current depth
  #31 = #31 * #4                  ; Reduce peck depth
  IF [#31 LT #8] THEN #31 = #8    ; Enforce minimum
;
END 1
;
; Final retract
G00 Z#18
M99
%
```

### Example 10: Tool Life Management System

```gcode
O9040 (TOOL LIFE MANAGER)
; G65 P9040 T_ L_ A_
; T = Tool number (required)
; L = Life limit in minutes (optional, set if provided)
; A = Action: 0=check only, 1=increment, 2=reset (default 1)
;
; Storage map (permanent variables):
; #500-#549 = Tool usage time (minutes) for tools 1-50
; #550-#599 = Tool life limit for tools 1-50
; #600-#649 = Tool change count for tools 1-50
;
; Validate
IF [#20 EQ #0] THEN #3000 = 130 (TOOL LIFE - T REQUIRED)
IF [#20 LT 1] THEN #3000 = 130 (TOOL LIFE - INVALID TOOL)
IF [#20 GT 50] THEN #3000 = 130 (TOOL LIFE - TOOL > 50)
;
; Defaults
IF [#1 EQ #0] THEN #1 = 1         ; Default: increment
;
; Calculate variable addresses
#30 = 499 + #20                   ; Usage time address
#31 = 549 + #20                   ; Limit address
#32 = 599 + #20                   ; Change count address
;
; Set new limit if provided
IF [#12 NE #0] THEN #[#31] = #12
;
; Process based on action
IF [#1 EQ 0] GOTO 100             ; Check only
IF [#1 EQ 1] GOTO 200             ; Increment
IF [#1 EQ 2] GOTO 300             ; Reset
GOTO 900
;
N100 (CHECK ONLY)
#100 = #[#30]                     ; Current usage
#101 = #[#31]                     ; Limit
#102 = #[#32]                     ; Change count
IF [#101 GT 0] THEN #103 = #100 / #101 * 100  ; Percent used
IF [#101 EQ 0] THEN #103 = 0
; Check if over limit
IF [[#101 GT 0] AND [#100 GE #101]] THEN #3000 = 131 (TOOL LIFE EXCEEDED)
GOTO 900
;
N200 (INCREMENT)
; Get cycle time from system (approximation)
#33 = #3002 / 60000               ; Cycle time in minutes (rough)
IF [#33 LT 0.1] THEN #33 = 0.1    ; Minimum increment
#[#30] = #[#30] + #33             ; Add to usage
; Check limit
IF [#[#31] GT 0] THEN GOTO 210
GOTO 900
N210
IF [#[#30] GE #[#31]] THEN #3000 = 131 (TOOL LIFE EXCEEDED - T#20)
GOTO 900
;
N300 (RESET)
#[#30] = 0                        ; Clear usage
#[#32] = #[#32] + 1               ; Increment change count
;
N900 (END)
M99
%

; USAGE EXAMPLES:
; G65 P9040 T5 L120.              ; Set tool 5 life limit to 120 minutes
; G65 P9040 T5                    ; Increment tool 5 usage
; G65 P9040 T5 A0                 ; Check tool 5 status only
; G65 P9040 T5 A2                 ; Reset tool 5 (after tool change)
```

---

## NEXT: PART 2

Part 2 will cover:
- **Section 10**: Advanced Macro Techniques (arrays, external data, background execution)
- **Section 11**: DPRNT and File I/O
- **Section 12**: Complete Alarm Reference (500+ alarms with causes/solutions)
- **Section 13**: Advanced Examples (11-20) including multi-part fixturing, complex probing
- **Section 14**: Key Parameter Reference
- **Section 15**: Troubleshooting Guide

---

*END OF PART 1*
*prism-fanuc-programming v1.0 Part 1*
*Size: ~45KB | Examples: 10*


---

# PART 2: ADVANCED FEATURES AND REFERENCE

---

## 10. ADVANCED MACRO TECHNIQUES

### 10.1 Indirect Variable Addressing (Arrays)

```gcode
; Using variables as array indices
; Store data in #100-#109 (10 element array)
#100 = 10.5
#101 = 20.3
#102 = 15.8
; ...

; Read element by index
#1 = 2                           ; Index
#10 = #[100 + #1]                ; #10 = #102 = 15.8

; Write element by index
#1 = 5                           ; Index
#[100 + #1] = 25.4               ; #105 = 25.4

; Loop through array
#1 = 0
WHILE [#1 LT 10] DO 1
  #10 = #[100 + #1]              ; Read element
  ; Process #10...
  #1 = #1 + 1
END 1

; 2D Array simulation (5 rows x 4 columns in #100-#119)
; Element [row][col] = #[100 + row*4 + col]
#20 = 2                          ; Row
#21 = 3                          ; Column
#22 = #[100 + #20*4 + #21]       ; Read [2][3] = #111
```

### 10.2 Macro Nesting and Recursion

```gcode
; Nested macro calls (up to 4 levels typically)
; O9100 calls O9101 calls O9102...

; CAUTION: Local variables are shared in nesting!
; Use different variable ranges for each level

O9100 (LEVEL 1)
#1 = 100                         ; Level 1 uses #1-#10
G65 P9101 A#1
M99

O9101 (LEVEL 2)
#11 = #1 * 2                     ; Level 2 uses #11-#20
G65 P9102 A#11
M99

O9102 (LEVEL 3)
#21 = #1 / 2                     ; Level 3 uses #21-#30
; Process...
M99

; RECURSION (use carefully - limited stack)
O9200 (FACTORIAL - RECURSIVE)
; A = input number, result in #100
IF [#1 LE 1] GOTO 100
#100 = #100 * #1
#1 = #1 - 1
G65 P9200 A#1
M99
N100
#100 = 1
M99

; Better: Iterative version
O9201 (FACTORIAL - ITERATIVE)
#100 = 1
WHILE [#1 GT 1] DO 1
  #100 = #100 * #1
  #1 = #1 - 1
END 1
M99
```

### 10.3 Execution Control

```gcode
; Single block behavior control
#3003 = 1                        ; Enable single block for macro
; ... code executes in single block mode ...
#3003 = 0                        ; Return to normal

; Feed hold / Override control
#3004 = 0                        ; Disable feed hold, override, exact stop
#3004 = 1                        ; Enable feed hold only
#3004 = 2                        ; Enable feedrate override only
#3004 = 3                        ; Enable feed hold and override
#3004 = 7                        ; Enable all (feed hold, override, exact stop)

; Block skip control (read-only for most)
#3007                            ; Block skip signal status

; Exact stop check
G09 G01 X100. F500.              ; Exact stop on this block only
G61                              ; Exact stop mode (modal)
G64                              ; Cutting mode (cancel G61)
```

### 10.4 Background Execution (Macro Executor Option)

```gcode
; Background macros run parallel to main program
; Requires Macro Executor option

; PMC interface variables for background execution
#1000-#1015 = PMC → CNC signals (read)
#1100-#1115 = CNC → PMC signals (write)

; Example: Background tool monitoring
; Runs continuously while main program executes
O9900 (BACKGROUND MONITOR)
N10
#100 = #3901                     ; Power-on time
#101 = #4113                     ; Current spindle speed
IF [#101 GT 12000] THEN #1100 = 1  ; Set warning flag
IF [#101 LE 12000] THEN #1100 = 0
GOTO 10
M99
```

---

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

---

## 12. COMPLETE ALARM REFERENCE

### 12.1 Program Errors (P/S Alarms 0-99)

| Alarm | Message | Cause | Solution |
|-------|---------|-------|----------|
| **000** | PLEASE TURN OFF POWER | Parameter change requires restart | Turn power off and on |
| **001** | TH PARITY ALARM | Parity error in tape/RS232 | Check cable, resend program |
| **002** | TV PARITY ALARM | Character count error | Check program format |
| **003** | TOO MANY DIGITS | Number exceeds max digits | Reduce decimal places |
| **004** | ADDRESS NOT FOUND | Missing address letter | Add required address (X, Y, Z, etc.) |
| **005** | NO DATA AFTER ADDRESS | Letter without value | Add numeric value after address |
| **006** | ILLEGAL USE OF NEGATIVE | Negative not allowed | Use positive value |
| **007** | ILLEGAL USE OF DECIMAL | Decimal not allowed | Remove decimal point |
| **010** | IMPROPER G-CODE | Invalid G-code | Check G-code validity |
| **011** | FEEDRATE NOT FOUND | Missing F in cutting move | Add F feedrate |
| **012** | IMPROPER FEEDRATE | F=0 or negative | Set positive feedrate |
| **014** | IMPROPER SPINDLE SPEED | S=0 or invalid | Set valid spindle speed |
| **015** | TOO MANY AXES COMMANDED | More axes than allowed | Reduce simultaneous axes |
| **020** | OVER TOLERANCE (X) | Interpolation error X | Check program, reduce speed |
| **021** | OVER TOLERANCE (Y) | Interpolation error Y | Check program, reduce speed |
| **022** | OVER TOLERANCE (Z) | Interpolation error Z | Check program, reduce speed |
| **029** | IMPROPER DWELL TIME | Invalid dwell value | Check G04 parameter |
| **030** | IMPROPER WORK OFFSET | Invalid G54-G59 | Use valid work offset |

### 12.2 Program Errors (P/S Alarms 100-299)

| Alarm | Message | Cause | Solution |
|-------|---------|-------|----------|
| **100** | IMPROPER PARAMETER | Parameter setting error | Check parameters |
| **101** | IMPROPER MACRO CALL | G65/G66 format error | Check macro call syntax |
| **102** | ILLEGAL VARIABLE NUMBER | Invalid #variable | Use valid variable range |
| **103** | DIVIDE BY ZERO | Division by zero | Add zero check before divide |
| **104** | IMPROPER ADDRESS | Invalid address in macro | Check macro arguments |
| **109** | IMPROPER BLOCK NUMBER | Invalid N number format | Check N number |
| **110** | DATA OVERFLOW | Calculation overflow | Reduce numeric values |
| **111** | MISSING DO NUMBER | WHILE without matching END | Add END statement |
| **112** | IMPROPER END NUMBER | END without WHILE | Add WHILE statement |
| **113** | IMPROPER NESTING | Loop nesting error | Check loop structure |
| **114** | MISSING SEQUENCE NUMBER | GOTO target not found | Add N block |
| **115** | MISSING M99 | Subprogram without M99 | Add M99 |
| **116** | UNDEFINED PROGRAM | M98/G65 program not found | Load/create program |
| **117** | IMPROPER P COMMAND | Invalid P number | Check P format |
| **118** | IMPROPER L COMMAND | Invalid L number | Check L format |
| **119** | EXCESSIVE NESTING | Too many subprogram levels | Reduce nesting depth |
| **124** | IMPROPER M CODE | Invalid M-code | Check M-code |
| **126** | IMPROPER T CODE | Invalid T-code | Check T-code |

### 12.3 Servo Alarms (400-499)

| Alarm | Message | Cause | Solution |
|-------|---------|-------|----------|
| **401** | SERVO ALARM: VRDY OFF (X) | X servo ready signal off | Check X servo amplifier |
| **402** | SERVO ALARM: VRDY OFF (Y) | Y servo ready signal off | Check Y servo amplifier |
| **403** | SERVO ALARM: VRDY OFF (Z) | Z servo ready signal off | Check Z servo amplifier |
| **410** | SERVO ALARM: EXCESS ERROR (X) | X position error exceeded | Reduce feedrate, check mechanics |
| **411** | SERVO ALARM: EXCESS ERROR (Y) | Y position error exceeded | Reduce feedrate, check mechanics |
| **412** | SERVO ALARM: EXCESS ERROR (Z) | Z position error exceeded | Reduce feedrate, check mechanics |
| **417** | DIGITAL SERVO PARAM ERROR | Servo parameter wrong | Check axis parameters |
| **420** | SYNC ERROR: EXCESS ERR | Synchronous axis error | Check sync settings |
| **430** | AXIS SV MOTOR OVERHEAT (X) | X motor overheating | Allow cooling, reduce load |
| **431** | AXIS SV MOTOR OVERHEAT (Y) | Y motor overheating | Allow cooling, reduce load |
| **432** | AXIS SV MOTOR OVERHEAT (Z) | Z motor overheating | Allow cooling, reduce load |
| **433** | AXIS SV MOTOR OVERHEAT (4) | 4th axis motor overheat | Allow cooling, reduce load |
| **460** | SOFT LIMIT OVER (X) | X software limit exceeded | Move inside limits |
| **461** | SOFT LIMIT OVER (Y) | Y software limit exceeded | Move inside limits |
| **462** | SOFT LIMIT OVER (Z) | Z software limit exceeded | Move inside limits |

### 12.4 Overtravel Alarms (500-599)

| Alarm | Message | Cause | Solution |
|-------|---------|-------|----------|
| **500** | OVER TRAVEL: +X | +X hardware limit hit | Jog in -X direction |
| **501** | OVER TRAVEL: -X | -X hardware limit hit | Jog in +X direction |
| **502** | OVER TRAVEL: +Y | +Y hardware limit hit | Jog in -Y direction |
| **503** | OVER TRAVEL: -Y | -Y hardware limit hit | Jog in +Y direction |
| **504** | OVER TRAVEL: +Z | +Z hardware limit hit | Jog in -Z direction |
| **505** | OVER TRAVEL: -Z | -Z hardware limit hit | Jog in +Z direction |
| **506** | OVER TRAVEL: +4 | +4th axis limit hit | Jog in negative direction |
| **507** | OVER TRAVEL: -4 | -4th axis limit hit | Jog in positive direction |
| **510** | STORED STROKE LIMIT +X | X+ soft limit in auto | Modify program |
| **511** | STORED STROKE LIMIT -X | X- soft limit in auto | Modify program |
| **512** | STORED STROKE LIMIT +Y | Y+ soft limit in auto | Modify program |
| **513** | STORED STROKE LIMIT -Y | Y- soft limit in auto | Modify program |
| **514** | STORED STROKE LIMIT +Z | Z+ soft limit in auto | Modify program |
| **515** | STORED STROKE LIMIT -Z | Z- soft limit in auto | Modify program |

### 12.5 Spindle Alarms (700-799)

| Alarm | Message | Cause | Solution |
|-------|---------|-------|----------|
| **701** | SPINDLE OVERHEAT | Spindle motor overheating | Allow cooling, reduce speed/load |
| **702** | SPINDLE OVERLOAD | Spindle exceeded torque limit | Reduce cutting load |
| **703** | SPINDLE MOTOR FAULT | Spindle drive fault | Check spindle drive |
| **704** | SPINDLE NOT AT SPEED | Speed not reached in time | Check spindle, reduce accel |
| **705** | SPINDLE ORIENTATION FAULT | Orientation failed | Check orient mechanism |
| **709** | SPINDLE INTERFACE FAULT | Communication error | Check cables/connections |
| **710** | GEAR CHANGE FAULT | Gear selection failed | Check gear mechanism |
| **749** | CS CONTOUR CTRL ALARM | C-axis contour error | Check C-axis |
| **750** | SPINDLE SERIAL COMM ERR | Serial comm failure | Check serial connections |

### 12.6 Tool Change Alarms (2000-2099)

| Alarm | Message | Cause | Solution |
|-------|---------|-------|----------|
| **2000** | ATC NOT READY | ATC not in ready state | Check ATC ready signal |
| **2001** | ARM NOT AT HOME | Tool change arm not home | Move arm to home |
| **2002** | MAGAZINE NOT READY | Magazine not positioned | Check magazine |
| **2003** | TOOL CHANGE TIMEOUT | Tool change exceeded time | Check mechanism |
| **2004** | TOOL NOT CLAMPED | Tool clamp not confirmed | Check clamp sensor |
| **2005** | TOOL NOT UNCLAMPED | Unclamp not confirmed | Check unclamp sensor |
| **2006** | Z NOT AT CHANGE POS | Z not at tool change height | Move Z to change position |
| **2007** | SPINDLE NOT ORIENTED | Spindle not oriented | Run M19 |
| **2008** | ARM ROTATION FAULT | ATC arm rotation failed | Check arm motor |
| **2009** | POT/CUP INTERFERENCE | Pocket interference | Check tool clearance |
| **2010** | MAGAZINE MOTOR FAULT | Magazine motor fault | Check magazine drive |
| **2020** | TOOL NOT IN MAGAZINE | Requested tool missing | Load tool in magazine |
| **2030** | DUPLICATE TOOL NUMBER | Same tool in 2 pockets | Correct tool setup |

### 12.7 Macro Alarms (3000-3999)

| Alarm | Message | Cause | Solution |
|-------|---------|-------|----------|
| **3000** | User-defined | #3000 = n sets this | Defined by user macro |
| **3001** | (varies) | Macro custom alarm | Check macro code |
| **3006** | Message display | #3006=1 pauses with msg | Press cycle start |
| **3100-3999** | (user defined) | Custom macro alarms | Check macro documentation |

### 12.8 Quick Alarm Resolution Guide

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    RAPID ALARM TROUBLESHOOTING                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ALARM WON'T CLEAR:                                                         │
│  1. Press RESET                                                             │
│  2. If still showing, fix root cause                                        │
│  3. Some alarms require power cycle (000, some 4xx)                         │
│  4. Emergency stop alarms: release E-stop, press RESET                      │
│                                                                             │
│  POSITION ERROR (4xx ALARMS):                                               │
│  1. Reduce feedrate/accel in parameters                                     │
│  2. Check for mechanical binding                                            │
│  3. Check lubrication                                                       │
│  4. Verify servo parameters match motor                                     │
│  5. Check encoder cables for damage                                         │
│                                                                             │
│  OVERTRAVEL (5xx ALARMS):                                                   │
│  1. In JOG mode, move opposite direction                                    │
│  2. May need to hold OT RELEASE button                                      │
│  3. Check soft limits in parameters                                         │
│  4. Check hardware limit switches                                           │
│                                                                             │
│  PROGRAM ERRORS (0xx, 1xx):                                                 │
│  1. Check line displayed with alarm                                         │
│  2. Verify all required addresses present                                   │
│  3. Check for missing decimal points                                        │
│  4. Verify subprogram/macro exists                                          │
│                                                                             │
│  SPINDLE ALARMS (7xx):                                                      │
│  1. Check spindle drive display for codes                                   │
│  2. Allow cooling time (overheat)                                           │
│  3. Reduce cutting load (overload)                                          │
│  4. Check orient mechanism (orient fault)                                   │
│                                                                             │
│  TOOL CHANGE (2xxx):                                                        │
│  1. Check all tool change positions (Z height, spindle orient)              │
│  2. Inspect tool clamp/unclamp                                              │
│  3. Check magazine for proper tool registration                             │
│  4. May need manual tool change to recover                                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

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

---

## 14. PARAMETER REFERENCE

### 14.1 Critical Program Parameters

| Parameter | Name | Description | Typical Value |
|-----------|------|-------------|---------------|
| **0000** | I/O channel | Program I/O selection | 0=RS232, 4=Memory card |
| **0001** | TV check | Tape verify | 0=Off |
| **0011** | Dimension input | Input unit selection | 0=mm, 1=inch |
| **0012** | Dimension output | Output unit selection | 0=mm, 1=inch |
| **0020** | I/O channel 2 | Secondary I/O | Varies |
| **0100** | RS232 baud | Communication speed | 7=9600, 8=19200 |
| **0111** | Sequence number | Auto increment | 0=Off, 1-9999=increment |

### 14.2 Macro Parameters

| Parameter | Name | Description |
|-----------|------|-------------|
| **6000** | Macro single block | 0=Each block, 1=Each macro |
| **6001** | Macro program number | Start of macro program range |
| **6002** | P code limit | Max P code for macros |
| **6050** | G-code macro program | Program number base |
| **6051** | G-code macro number | G-code number base |
| **6052-6059** | G-code assignments | G-code to program mapping |
| **6080** | M-code macro program | Program number base |
| **6081** | M-code macro number | M-code number base |
| **6082-6089** | M-code assignments | M-code to program mapping |

### 14.3 Variable Ranges by Parameter

| Parameter | Description |
|-----------|-------------|
| **6000 bit 0** | Enable #100-#199 common variables |
| **6000 bit 1** | Enable #500-#599 permanent variables |
| **6001** | Max permanent variable (default #999) |
| **6002** | Extended permanent variables enable |

---

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

---

## QUICK REFERENCE CARD

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    FANUC MACRO B QUICK REFERENCE                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  VARIABLES                           MATH FUNCTIONS                         │
│  #0 = null                           SIN[deg] COS[deg] TAN[deg]             │
│  #1-33 = local (G65 args)            ASIN[val] ACOS[val] ATAN[y]/[x]        │
│  #100-199 = common                   SQRT[val] ABS[val] ROUND[val]          │
│  #500-999 = permanent                FIX[val] FUP[val] LN[val] EXP[val]     │
│  #1000+ = system                                                            │
│                                      COMPARISON                             │
│  ARGUMENT LETTERS                    EQ (==)  NE (<>)                       │
│  A=#1  B=#2  C=#3  D=#4             GT (>)   GE (>=)                        │
│  E=#5  F=#6  H=#8  I=#9             LT (<)   LE (<=)                        │
│  J=#10 K=#11 M=#13 Q=#17            AND  OR  NOT                            │
│  R=#18 S=#19 T=#20 U=#21                                                    │
│  V=#22 W=#23 X=#24 Y=#25            CONTROL                                 │
│  Z=#26                               IF [cond] GOTO n                       │
│  (G,L,N,O,P prohibited)              IF [cond] THEN statement               │
│                                      WHILE [cond] DO n ... END n            │
│  SYSTEM VARIABLES                                                           │
│  #5021-26 = current pos (work)       MACRO CALL                             │
│  #5041-46 = current pos (machine)    G65 P#### args (non-modal)             │
│  #5061-66 = skip position            G66 P#### args (modal)                 │
│  #2001-200 = H offsets               G67 (cancel G66)                       │
│  #2401-600 = D offsets               M98 P#### (subprogram)                 │
│  #5221-326 = work offsets            M99 (return)                           │
│  #3000 = alarm output                                                       │
│  #3006 = message + stop              INDIRECT ADDRESSING                    │
│  #4109 = active F                    #[100 + #1] = array access             │
│  #4113 = active S                    #[2000 + n] = H offset n               │
│  #4114 = active T                    #[5220 + n*20 + axis] = work offset    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

*END OF PART 2*
*prism-fanuc-programming v1.0 Complete*
*Total Size: ~85KB | 15 Sections | 20 Examples | 150+ Alarms*
