---
name: ppg-quick-start
description: 'Post Processor Generator quick start. Use when the user needs G-code for a specific CNC controller (Fanuc, Siemens, Haas, Mazak), post processor configuration, or controller-specific code generation.'
license: MIT
metadata:
  author: PRISM
  version: "1.0.0"
  product: PPG
---

# PPG Quick Start — Post Processor Generator

## When to Use
- User asks "generate G-code for [controller]"
- Configuring a post processor for a new machine
- Converting toolpath data to controller-specific NC code
- Comparing G-code output across controller families

## How It Works
1. Select controller family from PostProcessorRegistry (13 families)
2. Choose operation type (facing, profiling, pocketing, drilling, threading, etc.)
3. Generate parametric G-code via `prism_calc→gcode_generate`
4. Apply controller-specific formatting via `prism_export→render_gcode`
5. Validate via controller hooks (FANUC/SIEMENS/HAAS specific)

## Returns
- Complete NC program with header, tool calls, operations, footer
- Controller-specific M-codes, G-codes, and formatting
- Canned cycle syntax per controller dialect
- Safety blocks (tool length comp, work offset, coolant)

## Example
**Input:** "Haas VF-2, facing 6061-T6, 63mm face mill, WCS G54"
**Output:**
```gcode
O1001 (FACING - 6061-T6)
G20 G40 G80 G90
T01 M06 (63MM FACE MILL)
G54 G43 H01 Z50. M08
G00 X-40. Y0.
S4800 M03
G01 Z-1.5 F1200.
...
```
