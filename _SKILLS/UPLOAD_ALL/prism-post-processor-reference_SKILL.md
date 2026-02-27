---
name: prism-post-processor-reference
description: |
  Post processor development reference.
---

**Version:** 1.0 | **Generated:** January 24, 2026

## QUICK REFERENCE: CONTROLLER COMPARISON

| Controller | Max Axes | Look-Ahead | 5-Axis TCP | High-Speed | Conversational |
|------------|----------|------------|------------|------------|----------------|
| Fanuc 30i/31i | 32/20 | 2000/1000 | G43.4/G43.5 | G05.1 Q1 | Manual Guide i |
| Siemens 840D | 31 | 2000 | TRAORI | CYCLE832 | ShopMill/Turn |
| Heidenhain TNC | 18 | 2048 | M128/TCPM | CYCL 32 | Native |
| Mazak Smooth | 16 | Unlimited | G43.4 | G05 P10000 | MAZATROL |
| Okuma OSP | 26 | 1000 | G43.4/G43.5 | G08 P1 | Native |
| Haas NGC | 6 | 80 | G234/TCPC | G187 | None |

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
