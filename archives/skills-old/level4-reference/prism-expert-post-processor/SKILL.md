---
name: prism-expert-post-processor
description: |
  Post Processor AI Expert specializing in G-code generation, CNC controller syntax, code verification, and format conversion across major controller brands (Fanuc, Siemens, Heidenhain, Mazak, Haas, Okuma, Mitsubishi).
---

# PRISM Expert: Post Processor Specialist
## G-code & Machine Controller Expertise

---

## Expert Profile

```javascript
{
  id: 'post_processor',
  name: 'Post Processor Specialist',
  domain: 'G-code & Machine Controllers',
  confidence: 1.0
}
```

---

## Knowledge Base

### Supported Controllers
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

---

## Decision Rules

### Safe Start Block
**Conditions:** program_start
**Actions:**
1. Add safe start block
2. Cancel all compensation (G40 G49)
3. Set absolute mode (G90)
4. Set feed mode (G94)
5. Select default plane (G17)

---

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

---

## G-Code Verification

### Safety Checks Performed

#### 1. Unsafe Rapid Detection
```javascript
IF line.includes('G0') && line.includes('Z') && !line.includes('G53'):
    IF Z_value < 0:
        → WARNING: "Rapid to negative Z"
```

#### 2. Missing Tool Call
```javascript
IF cutting_move_found && no_tool_call_before:
    → ERROR: "Cutting before tool call"
```

#### 3. Missing Spindle Start
```javascript
IF cutting_move_found && no_M3_or_M4_before:
    → ERROR: "Cutting before spindle start"
```

### Verification Result Structure
```javascript
{
  valid: true/false,  // false if any errors
  issues: [
    { line: 5, issue: 'description', severity: 'error'|'warning' }
  ],
  lineCount: 150
}
```

---

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

---

## Controller-Specific Notes

### Fanuc
- Most common industrial controller
- Standard G-code syntax
- Macro B programming available
- Program numbers: O0001-O9999

### Haas
- Fanuc-compatible
- Additional conversational features
- Visual Quick Code (VQC)
- NGC (Next Generation Control)

### Siemens Sinumerik
- Different comment syntax (;)
- Tool and D number on same line
- Powerful cycle programming
- ShopMill/ShopTurn conversational

### Heidenhain TNC
- Conversational and ISO programming
- Q parameters for variables
- Powerful probing cycles
- Plain language programming option

### Mazak
- Mazatrol conversational
- Smooth G for ISO
- Intelligent Machining functions
- Active Vibration Control

### Okuma OSP
- IGF (Intelligent G-code Functions)
- Collision Avoidance System
- THINC API for customization
- OSP-P series controllers

### Mitsubishi Meldas
- High-speed processing
- OMR-FF (Optimum Machine Response)
- SSS (Super Smooth Surface) control
- Direct G-code and conversational

---

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

---

## Usage Examples

### Generate G-Code
```javascript
postProcessorExpert.analyze({
  controller: 'Fanuc',
  operation: {
    tool: 1,
    startX: 0,
    startY: 0,
    rpm: 5000,
    safeZ: 25
  }
})
// Returns: G-code string
```

### Verify G-Code
```javascript
postProcessorExpert.analyze({
  gcode: programText,
  controller: 'Fanuc'
})
// Returns: { valid: true/false, issues: [], lineCount: n }
```

### Convert Code
```javascript
postProcessorExpert.analyze({
  sourceCode: fanucProgram,
  targetController: 'Siemens'
})
// Returns: converted G-code
```

---

## Source Reference
- **Module:** PRISM_PHASE8_EXPERTS.PostProcessorExpert
- **Monolith Lines:** 590134-590246
- **Extracted:** January 2026

---

*Post Processor Expert - Multi-controller G-code generation and verification*
