---
name: Parametric G-code Generator
description: Generate parametric G-code from templates for 6 controllers and 13 operations.
---

## When To Use
- When generating complete G-code programs from parametric templates
- When programming common operations (pocket, contour, drill, bore, thread, face) from dimensions
- When targeting a specific controller (Fanuc, Siemens, Haas, Mazak, Okuma, Heidenhain)
- When needing production-ready G-code with proper headers, tool calls, and safety blocks

## How To Use
```
prism_calc action=gcode_generate params={
  controller: "fanuc",
  operation: "pocket_mill",
  params: { width: 50, length: 80, depth: 15, tool_dia: 12 }
}
```

Required: `controller`, `operation`, `params` (dimensions). Optional: `coolant` (flood, mist, tsc), `work_offset` (G54-G59), `units` (metric, imperial).

## What It Returns
- Complete G-code program with program number and header comments
- Tool call with proper T/M codes for the target controller
- Work offset and safety line initialization
- Machining cycle with calculated feeds, speeds, and stepover
- Retract, coolant off, and program end blocks

## Examples
- Input: `gcode_generate params={ controller: "fanuc", operation: "pocket_mill", params: { width: 50, length: 80, depth: 15, tool_dia: 12 } }`
- Output: O0001 program with G43 tool length comp, G81-style pocket routine, 3 depth passes at 5mm each, G91 G28 Z0 retract, M30

- Input: `gcode_generate params={ controller: "siemens", operation: "circular_pocket", params: { diameter: 40, depth: 20, tool_dia: 10 }, coolant: "tsc" }`
- Output: Siemens 840D program with CYCLE pocket call, through-spindle coolant M88, and SUPA G0 retract
