---
name: prism-expert-post-processor
description: |
  G-code and controller expert. Post processor development.
---

- Fanuc (industry standard)
- Siemens (Sinumerik)
- Heidenhain (TNC)
- Mazak (Mazatrol/Smooth)
- Haas (Fanuc-compatible)
- Okuma (OSP)
- Mitsubishi (Meldas)

### Fanuc G-Code Reference

#### Motion Codes
| Code | Function | Description |
|------|----------|-------------|
| G00 | Rapid | Non-cutting rapid movement |
| G01 | Linear | Linear interpolation |
| G02 | CW Arc | Clockwise circular interpolation |
| G03 | CCW Arc | Counter-clockwise circular |

#### Plane Selection
| Code | Function | Description |
|------|----------|-------------|
| G17 | XY Plane | Default plane selection |
| G18 | XZ Plane | Lathe / side milling |
| G19 | YZ Plane | Special applications |

#### Compensation
| Code | Function | Description |
|------|----------|-------------|
| G40 | Comp Cancel | Cancel cutter compensation |
| G41 | Comp Left | Cutter left of path |
| G42 | Comp Right | Cutter right of path |
| G43 | Tool Length + | Tool length compensation + |
| G49 | TL Cancel | Cancel tool length comp |

#### Coordinate Systems
| Code | Function | Description |
|------|----------|-------------|
| G54 | Work Offset 1 | First work coordinate |
| G90 | Absolute | Absolute positioning |
| G91 | Incremental | Incremental positioning |

## G-Code Generation

### Fanuc/Haas Safe Start Template
```gcode
%
O0001 (PRISM GENERATED)
G90 G94 G17
G53 G0 Z0
T1 M6
G54 G0 X0 Y0
S3000 M3
G43 H1 Z25
M8
```

### Siemens Safe Start Template
```gcode
; PRISM GENERATED
G90 G94 G17
T1 D1
M6
G54 G0 X0 Y0
S3000 M3
```

### Generation Logic
```javascript
IF controller === 'Fanuc' || controller === 'Haas':
    → Add '%' program start
    → Add 'O0001' program number
    → G90 G94 G17 on one line
    → G53 G0 Z0 for safe Z
    → T# M6 for tool change
    → G54 G0 X Y for position
    → S#### M3 for spindle
    → G43 H# Z## for tool length
    → M8 for coolant

IF controller === 'Siemens':
    → Add '; PRISM GENERATED' comment
    → G90 G94 G17
    → T# D1 for tool and offset
    → M6 separate line
    → G54 G0 X Y
    → S#### M3
```

## Code Conversion

### Fanuc → Siemens
| Fanuc | Siemens | Notes |
|-------|---------|-------|
| (comment) | ; comment | Comment syntax |
| M06 | M6 | No leading zero |
| O0001 | ; Program name | Program ID |

### Basic Conversion Rules
```javascript
// Fanuc to Siemens
converted = sourceCode
  .replace(/\(([^)]+)\)/g, '; $1')  // Comments
  .replace(/M06/g, 'M6')             // M-codes
```

## Integration Points

### PRISM Modules Used
- `PRISM_POST_PROCESSOR_DATABASE_V2` - Controller configurations
- `PRISM_CONTROLLER_DATABASE` - Controller specifications
- `PRISM_GCODE_VALIDATOR` - Code verification
- `PRISM_GCODE_PARSER` - Code parsing

### Gateway Routes
- `POST /api/expert/post/generate`
- `POST /api/expert/post/verify`
- `POST /api/expert/post/convert`
- `GET /api/expert/post/controllers`

## Source Reference
- **Module:** PRISM_PHASE8_EXPERTS.PostProcessorExpert
- **Monolith Lines:** 590134-590246
- **Extracted:** January 2026

---

*Post Processor Expert - Multi-controller G-code generation and verification*
