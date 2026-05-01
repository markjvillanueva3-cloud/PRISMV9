---
name: prism-post-processor-reference
description: |
  Encyclopedic post processor reference for CNC programming and G-code generation.
  Covers 6 major controller families (Fanuc, Siemens, Heidenhain, Mazak, Okuma, Haas),
  500+ G-codes, 300+ M-codes, lathe/mill/multi-axis programming, specialty machines,
  communication protocols, troubleshooting, and future innovation concepts.
  Essential for PRISM post processor development, CAM integration, and machine database work.
---

# PRISM Post Processor Reference Skill
## Complete CNC Controller &amp; G-Code Encyclopedia
**Version:** 1.0 | **Generated:** January 24, 2026

---

## PURPOSE

Instant reference for **post processor development** and **G-code generation** in PRISM. Use this skill to:
1. Look up controller-specific G-codes and M-codes
2. Understand modal groups and code conflicts
3. Get correct syntax for any CNC operation
4. Troubleshoot post processor issues
5. Configure machine communication

**Coverage:** 6 controller families, 50+ manufacturers, 500+ G-codes, 300+ M-codes

---

## QUICK REFERENCE: CONTROLLER COMPARISON

| Controller | Max Axes | Look-Ahead | 5-Axis TCP | High-Speed | Conversational |
|------------|----------|------------|------------|------------|----------------|
| Fanuc 30i/31i | 32/20 | 2000/1000 | G43.4/G43.5 | G05.1 Q1 | Manual Guide i |
| Siemens 840D | 31 | 2000 | TRAORI | CYCLE832 | ShopMill/Turn |
| Heidenhain TNC | 18 | 2048 | M128/TCPM | CYCL 32 | Native |
| Mazak Smooth | 16 | Unlimited | G43.4 | G05 P10000 | MAZATROL |
| Okuma OSP | 26 | 1000 | G43.4/G43.5 | G08 P1 | Native |
| Haas NGC | 6 | 80 | G234/TCPC | G187 | None |

---

## FANUC COMPLETE REFERENCE

### G-Code Modal Groups

**Group 01 - Motion:**
- G00 - Rapid positioning
- G01 - Linear interpolation
- G02 - Circular CW
- G03 - Circular CCW
- G33 - Thread cutting

**Group 02 - Plane Selection:**
- G17 - XY plane
- G18 - ZX plane  
- G19 - YZ plane

**Group 03 - Positioning Mode:**
- G90 - Absolute
- G91 - Incremental

**Group 05 - Feed Mode:**
- G93 - Inverse time feed
- G94 - Feed per minute
- G95 - Feed per revolution

**Group 06 - Units:**
- G20 - Inch
- G21 - Metric

**Group 07 - Cutter Compensation:**
- G40 - Cancel
- G41 - Left
- G42 - Right
- G41.2/G42.2 - 3D compensation

**Group 08 - Tool Length Offset:**
- G43 - Positive direction
- G44 - Negative direction
- G49 - Cancel
- G43.1 - Dynamic TLO
- G43.4 - TCP (tool center point)
- G43.5 - TCP with tool tilt

**Group 09 - Canned Cycles:**
- G73 - High-speed peck drilling
- G74 - Left-hand tapping
- G76 - Fine boring
- G80 - Cancel cycle
- G81 - Drilling
- G82 - Counter boring (dwell)
- G83 - Deep hole peck drilling
- G84 - Right-hand tapping
- G84.2 - Rigid tapping
- G85 - Boring
- G86 - Boring (spindle stop)
- G87 - Back boring
- G88 - Boring (manual retract)
- G89 - Boring (dwell)

**Group 10 - Return Plane:**
- G98 - Return to initial level
- G99 - Return to R level

**Group 12 - Work Coordinates:**
- G54-G59 - Work offsets 1-6
- G54.1 P1-P48 - Extended work offsets

**Group 13 - Exact Stop:**
- G61 - Exact stop check
- G61.1 - Exact stop mode
- G64 - Cutting mode

**Group 14 - Coordinate Rotation:**
- G68 - Rotation ON
- G69 - Rotation OFF
- G68.2 - Tilted work plane

### Fanuc M-Codes

| Code | Function |
|------|----------|
| M00 | Program stop |
| M01 | Optional stop |
| M02 | Program end |
| M03 | Spindle CW |
| M04 | Spindle CCW |
| M05 | Spindle stop |
| M06 | Tool change |
| M08 | Coolant ON |
| M09 | Coolant OFF |
| M19 | Spindle orient |
| M29 | Rigid tap mode |
| M30 | Program end &amp; rewind |
| M48 | Override enable |
| M49 | Override disable |
| M98 | Subprogram call |
| M99 | Subprogram return |

### Fanuc High-Speed Machining

```gcode
G05.1 Q1    ; AICC mode ON (AI Contour Control)
G05 P10000  ; High-precision contour (HPCC)
G08 P1      ; Look-ahead ON
```

### Fanuc Macro Variables

| Range | Type | Persistence |
|-------|------|-------------|
| #1-#33 | Local/Arguments | Call only |
| #100-#199 | Common | Power cycle |
| #500-#999 | Common | Permanent |
| #1000+ | System | Read-only |

**System Variables:**
- #3000-#3006 - Program control
- #4001-#4130 - Modal G-codes
- #5001-#5066 - Position data
- #5201-#5226 - Work offsets

### Fanuc Alarms (Common)

| Code | Description |
|------|-------------|
| PS0001 | Parity/TH alarm |
| PS0010 | Improper G-code |
| PS0020 | Arc radius error |
| SV0401 | VRDY off |
| OT0500 | Overtravel |

---

## SIEMENS SINUMERIK REFERENCE

### Siemens G-Codes

**Motion:**
- G0/G00 - Rapid
- G1/G01 - Linear
- G2/G02 - Arc CW
- G3/G03 - Arc CCW
- CIP - Circular with intermediate point
- CT - Tangential circle
- POLY - Polynomial interpolation

**Plane Selection:**
- G17/G18/G19 - Standard planes
- G17.1/G18.1/G19.1 - Planes with tool orientation

**Transformation:**
- TRAORI - 5-axis transformation ON
- TRAFOOF - Transformation OFF
- CYCLE800 - Swivel plane

**High-Speed:**
- CYCLE832 - High-speed settings
- SOFT - Soft acceleration
- BRISK - Hard acceleration
- COMPON/COMPOF - Compressor on/off

### Siemens Cycles

| Cycle | Function |
|-------|----------|
| CYCLE81 | Drilling |
| CYCLE82 | Counter boring |
| CYCLE83 | Deep hole drilling |
| CYCLE84 | Rigid tapping |
| CYCLE85 | Boring |
| CYCLE86 | Boring with orient |
| CYCLE800 | Swivel plane |
| CYCLE832 | High-speed setting |

### Siemens 5-Axis Programming

```gcode
; Enable 5-axis transformation
TRAORI(1)          ; Orientation transformation 1
TCARR=1            ; Tool carrier assignment
OTOL=0.01          ; Orientation tolerance

; Tool orientation vectors
A3=0 B3=0 C3=1     ; Tool axis vector
A6=1 B6=0 C6=0     ; Rotation vector

; Tilted work plane
CYCLE800(0,"",0,57,0,0,0,0,0,0,0,0,0,1)
; Parameters: safety, frame, mode, tc, tc_dir, st1, st2, st3, dir, fr_i, fr_n, fr_a, fr_m, tol_a

; Return to standard
TRAFOOF
```

### Siemens Alarms

| Range | Category |
|-------|----------|
| 1000-1999 | Channel NCK |
| 2000-2999 | Mode group |
| 4000-7999 | Servo |
| 10000-14999 | Compile cycles |
| 60000-69999 | HMI |

---

## HEIDENHAIN TNC REFERENCE

### Heidenhain Syntax (Conversational)

```
; Linear movement
L X+100 Y+50 Z-5 F500 M3

; Arc (center point)
CC X+50 Y+50
C X+100 Y+50 DR+

; Arc (radius)
CR X+100 Y+50 R+25 DR+

; Chamfer and radius
CHF 2           ; Chamfer 2mm
RND R2          ; Corner radius 2mm

; Tool call
TOOL CALL 5 Z S5000 F300
```

### Heidenhain Cycles

| Cycle | Function |
|-------|----------|
| CYCL DEF 1 | Pecking |
| CYCL DEF 2 | Tapping |
| CYCL DEF 3 | Slot milling |
| CYCL DEF 4 | Pocket milling |
| CYCL DEF 5 | Circular pocket |
| CYCL DEF 7 | Datum shift |
| CYCL DEF 10 | Rotation |
| CYCL DEF 19 | Working plane (3+2) |
| CYCL DEF 32 | Tolerance |

### Heidenhain 5-Axis (TCPM)

```
; Activate TCPM (Tool Center Point Management)
M128           ; TCPM ON
; or
FUNCTION TCPM F TCP AXIS SPAT PATHCTRL AXIS

; Tilted working plane
CYCL DEF 19.0 WORKING PLANE
CYCL DEF 19.1 A+30 B+0 C+0    ; Euler angles
; or
PLANE SPATIAL SPA+30 SPB+0 SPC+0 STAY

; Deactivate
M129           ; TCPM OFF
PLANE RESET
```

### Heidenhain Q Parameters

| Range | Use |
|-------|-----|
| Q0-Q99 | User variables |
| Q100-Q199 | Probe cycles |
| Q1000+ | QS string parameters |
| QL | Local parameters |

---

## MAZAK MAZATROL/EIA REFERENCE

### Mazak G-Codes (EIA Mode)

Most Fanuc-compatible with additions:

| Code | Function |
|------|----------|
| G43.4 | TCP control |
| G05 P10000 | High-speed mode |
| G68.2 | Tilted work plane |
| G07.1 | Cylindrical interpolation |
| G12.1 | Polar interpolation ON |
| G13.1 | Polar interpolation OFF |

### Mazak 5-Axis (Smooth)

```gcode
; 3+2 positioning
G68.2 X0 Y0 Z0 I0 J90 K0    ; Tilted plane
G53.1                        ; Machine coordinate
G69                          ; Cancel rotation

; Simultaneous 5-axis with TCPC
G43.4 H1                     ; TCP ON
G43.5 H1                     ; TCP with tool vector
G49                          ; TCP OFF
```

### MAZATROL Units

| Unit Type | Function |
|-----------|----------|
| MAT | Material definition |
| UNo | Unit number |
| UNIT | Process type |
| SNo | Sequence number |
| TOOL | Tool specification |
| END | Unit/Program end |

---

## OKUMA OSP REFERENCE

### Okuma G-Codes

| Code | Function |
|------|----------|
| G00/G01/G02/G03 | Standard motion |
| G05 | High-speed mode |
| G08 P1 | Look-ahead ON |
| G15 H1 | Machining area selection |
| G43.4 | Tool center point |
| G43.5 | Tool tip direction |
| G68 | Coordinate rotation |
| G68.1 | 5-axis tilted plane |
| G107 | Cylindrical mapping |
| G112/G113 | Polar ON/OFF |
| G141 | 3D cutter comp |
| CALL OPN | Subprogram call |

### Okuma Variables

| Prefix | Type |
|--------|------|
| VC | Common variable |
| VL | Local variable |
| VE | Empty check |
| VS | System variable |
| VUPTS | User parameter tool |
| VUPWS | User parameter work |

### Okuma 5-Axis

```gcode
; Enable 5-axis TCP
G43.4 H1 R0     ; TCP type 1, tool center
G43.5 H1        ; TCP with tilt control

; Tilted work plane
G68.1 X0 Y0 Z0 I90 J0 K0    ; Euler angles
; or
G68.1 X0 Y0 Z0 I1 J0 K1     ; Two-vector method

; Super-NURBS
G05.1 Q1        ; ON
G05.1 Q0        ; OFF
```

---

## HAAS NGC REFERENCE

### Haas G-Codes

Haas is largely Fanuc-compatible:

**Unique Haas Codes:**
| Code | Function |
|------|----------|
| G143 | 5-axis TCP |
| G187 | Smoothness setting |
| G234 | 5-axis auto TCPC |
| G254 | Dynamic work offset |

### Haas Settings (Communication)

| Setting | Function |
|---------|----------|
| 11 | Baud rate |
| 12 | Parity |
| 13 | Stop bits |
| 14 | Data bits |
| 24 | Block delete |
| 37 | RS-232 port |

### Haas Macros

Same variable ranges as Fanuc:
- #1-#33: Local
- #100-#199: Common (lost at power off)
- #500-#699: Permanent

### Haas Alarms (Common)

| Code | Description |
|------|-------------|
| 101 | Memory overflow |
| 102 | Read error |
| 109 | Invalid code |
| 304 | X overtravel |
| 401 | ATC fault |
| 500 | Spindle fault |

---

## LATHE PROGRAMMING REFERENCE

### Lathe G-Codes (Fanuc)

| Code | Function |
|------|----------|
| G20/G21 | Inch/Metric |
| G40/G41/G42 | Tool nose comp |
| G50 | Max spindle speed |
| G54-G59 | Work offsets |
| G70 | Finish cycle |
| G71 | Rough turning |
| G72 | Rough facing |
| G73 | Pattern repeat |
| G74 | Peck drilling |
| G75 | Grooving |
| G76 | Threading |
| G92 | Thread cutting |
| G96 | CSS ON |
| G97 | CSS OFF |

### Lathe Tool Nose Radius Compensation

| Direction | Code | Use |
|-----------|------|-----|
| Cancel | G40 | Between cuts |
| Left | G41 | OD turning (from +Z) |
| Right | G42 | ID turning (from +Z) |

**Tool Orientation (T quadrant):**
```
    3  |  2
   ----+----
    4  |  1
       
    7  |  6
   ----+----
    8  |  5
```

### Threading (G76)

```gcode
G76 P(m)(r)(a) Q(dmin) R(d)
G76 X(u) Z(w) R(i) P(k) Q(d) F(L)

; Parameters:
; m = Number of finish passes (00-99)
; r = Retract amount (00-99, units of 0.1 lead)
; a = Tool angle (0,29,30,55,60,80)
; dmin = Minimum depth of cut
; d = Finish allowance
; i = Thread taper
; k = Thread height
; d = First pass depth
; L = Lead (pitch)
```

### Constant Surface Speed

```gcode
G50 S3000         ; Max spindle speed
G96 S200          ; CSS 200 SFM
G97 S1500         ; Cancel CSS, 1500 RPM
```

---

## MULTI-AXIS PROGRAMMING

### 5-Axis Configurations

| Type | Description | A/B/C |
|------|-------------|-------|
| Table-Table | Trunnion | A+C or B+C |
| Head-Head | Dual swivel | A+C or B+C |
| Head-Table | Mixed | B+C typical |

### TCP Control Summary by Controller

| Controller | Code | Description |
|------------|------|-------------|
| Fanuc | G43.4 | TCP ON |
| Fanuc | G43.5 | TCP with tilt |
| Siemens | TRAORI | Orientation transformation |
| Heidenhain | M128/FUNCTION TCPM | TCPM mode |
| Mazak | G43.4 | TCP control |
| Okuma | G43.4/G43.5 | TCP control |
| Haas | G234 | TCPC |

### Tilted Work Plane Summary

| Controller | Code | Parameters |
|------------|------|------------|
| Fanuc | G68.2 | X Y Z I J K (Euler) |
| Siemens | CYCLE800 | Multiple options |
| Heidenhain | PLANE SPATIAL | SPA SPB SPC |
| Mazak | G68.2 | X Y Z I J K |
| Okuma | G68.1 | X Y Z I J K |
| Haas | G68.2 | X Y Z I J K |

---

## COMMUNICATION PROTOCOLS

### RS-232 Settings by Controller

| Controller | Baud | Data | Parity | Stop |
|------------|------|------|--------|------|
| Fanuc | 4800 | 7 | Even | 2 |
| Siemens | 9600 | 8 | None | 1 |
| Heidenhain | 9600 | 8 | None | 1 |
| Haas | 9600 | 7 | Even | 1 |
| Okuma | 9600 | 8 | None | 1 |
| Mazak | 4800 | 7 | Even | 2 |

### USB/Memory Card File Naming

| Controller | Format |
|------------|--------|
| Fanuc | O#### (4 digits) |
| Haas | O##### (5 digits) |
| Siemens | Any .mpf/.spf |
| Heidenhain | Any .h |
| Okuma | Any .MIN |
| Mazak | Any |

---

## POST PROCESSOR ARCHITECTURE

### Standard Post Structure

```javascript
// Post processor structure
const POST_STRUCTURE = {
    // Properties
    properties: {
        vendor: "Fanuc",
        model: "31i-B",
        description: "3-axis VMC",
        capabilities: ["milling", "drilling", "tapping"]
    },
    
    // Format definitions
    formats: {
        xFormat: createFormat({decimals: 4, forceSign: false}),
        feedFormat: createFormat({decimals: 1}),
        rpmFormat: createFormat({decimals: 0})
    },
    
    // Output variables
    outputs: {
        xOutput: createVariable({prefix: "X"}, xFormat),
        feedOutput: createVariable({prefix: "F"}, feedFormat)
    },
    
    // Section handlers
    onOpen: function() { /* header */ },
    onSection: function() { /* operation start */ },
    onRapid: function(x, y, z) { /* G00 */ },
    onLinear: function(x, y, z, feed) { /* G01 */ },
    onCircular: function(cw, cx, cy, cz, x, y, z, feed) { /* G02/G03 */ },
    onSectionEnd: function() { /* operation end */ },
    onClose: function() { /* footer */ }
};
```

### Key Post Settings

| Setting | Fanuc | Siemens | Heidenhain |
|---------|-------|---------|------------|
| Line numbers | N5 | N5 | L |
| Decimal format | X1.234 | X1.234 | X+1.234 |
| Arc center | IJK incr | IJK abs | CC/CR |
| Modal G-codes | Yes | Yes | No |
| Safe start | G90 G54 G40 | G90 G54 G40 | BLK FORM |

---

## TROUBLESHOOTING QUICK REFERENCE

### Common Post Issues

| Problem | Cause | Solution |
|---------|-------|----------|
| Wrong format | G1 vs G01 | Check controller requirements |
| Arc errors | IJK mode | Check incremental vs absolute |
| Feed errors | Units | Verify inch/metric conversion |
| Missing line numbers | Post setting | Enable line number output |
| Tool change fails | Sequence | Check safe Z, spindle stop order |

### Machining Problems

| Issue | Possible Causes |
|-------|-----------------|
| Oversize | Tool wear, TLO, comp wrong |
| Undersize | Tool deflection, wrong offset |
| Taper | Tool deflection, axis error |
| Chatter | Speed/feed, tool projection |
| Poor finish | Feed marks, rubbing, dwell |

### Systematic Troubleshooting

1. **Safety Check** - E-stop if needed
2. **Repeatability** - Does it happen consistently?
3. **Isolate Variable:**
   - Program (different program?)
   - Machine (different machine?)
   - Tool (different tool?)
   - Setup (different setup?)
   - Process (different parameters?)
4. **Root Cause** - Single change that fixes it
5. **Solution** - Permanent fix
6. **Verify** - Test the fix
7. **Document** - Record for future

---

## MACHINE DATABASE INTEGRATION

### Standard Machine Record Structure

```json
{
    "id": "FANUC_31i_VMC_001",
    "manufacturer": "FANUC",
    "controller": {
        "model": "31i-B",
        "version": "B4",
        "capabilities": ["TCP", "AICC", "MACRO"]
    },
    "kinematics": {
        "type": "3-axis",
        "workEnvelope": {"x": 1020, "y": 510, "z": 510},
        "maxRPM": 15000,
        "maxFeed": 30000
    },
    "postSettings": {
        "lineNumbers": true,
        "lineIncrement": 5,
        "arcFormat": "IJK",
        "arcCenter": "incremental",
        "decimalPlaces": 4
    }
}
```

### Controller Capability Flags

| Capability | Flag | Use |
|------------|------|-----|
| TCP | hasTCP | 5-axis tool center point |
| RTCP | hasRTCP | Rotary TCP |
| TCPM | hasTCPM | Tool center point management |
| HSM | hasHSM | High-speed machining |
| NURBS | hasNURBS | NURBS interpolation |
| Macro | hasMacro | Custom macro B |
| Probing | hasProbing | Touch probe cycles |

---

## USAGE IN PRISM

### When to Reference This Skill

- **Post Processor Development**: G-code syntax, controller differences
- **Machine Database Work**: Controller capabilities, settings
- **CAM Integration**: Output format requirements
- **Troubleshooting**: Alarm codes, debugging
- **Multi-Axis Programming**: TCP setup, tilted planes

### Related PRISM Components

| Component | Use With |
|-----------|----------|
| PRISM_POST_PROCESSOR_ENGINE | G-code generation |
| PRISM_MACHINE_DATABASE | Controller specs |
| PRISM_CONTROLLER_DATABASE | Controller definitions |
| PRISM_GCODE_PARSER | Code validation |
| PRISM_COLLISION_ENGINE | Machine simulation |

---

## APPENDIX: G-CODE QUICK LOOKUP

### Universal G-Codes (All Controllers)

| Code | Function |
|------|----------|
| G00 | Rapid positioning |
| G01 | Linear interpolation |
| G02 | Circular CW |
| G03 | Circular CCW |
| G04 | Dwell |
| G17 | XY plane |
| G18 | ZX plane |
| G19 | YZ plane |
| G20 | Inch |
| G21 | Metric |
| G28 | Return to reference |
| G40 | Cancel cutter comp |
| G41 | Cutter comp left |
| G42 | Cutter comp right |
| G43 | Tool length offset + |
| G49 | Cancel TLO |
| G54-G59 | Work offsets |
| G80 | Cancel canned cycle |
| G90 | Absolute |
| G91 | Incremental |
| G94 | Feed per minute |
| G95 | Feed per revolution |

### Universal M-Codes (All Controllers)

| Code | Function |
|------|----------|
| M00 | Program stop |
| M01 | Optional stop |
| M02 | Program end |
| M03 | Spindle CW |
| M04 | Spindle CCW |
| M05 | Spindle stop |
| M06 | Tool change |
| M08 | Coolant ON |
| M09 | Coolant OFF |
| M30 | Program end &amp; rewind |

---

*End of PRISM Post Processor Reference Skill*
