---
name: G-code Snippet Generator
description: Generate quick G-code snippets for common operations without full program structure.
---

## When To Use
- When you need a quick G-code block for a single operation, not a full program
- When inserting a canned cycle, tool change, or subroutine into an existing program
- When looking up correct syntax for a specific G/M code on a given controller
- When prototyping or testing a machining move before integrating into production code

## How To Use
```
prism_calc action=gcode_snippet params={
  controller: "haas",
  snippet_type: "drill_cycle",
  params: { x: 25, y: 50, z_final: -20, retract: 2, peck: 5 }
}
```

Required: `controller`, `snippet_type`, `params`. Optional: `comment` (boolean), `units` (metric, imperial).

## What It Returns
- Compact G-code block for the requested operation
- Controller-specific syntax with correct modal codes
- Inline comments explaining each line when `comment: true`
- Proper feed/speed placeholders or calculated values
- Safe entry and exit moves surrounding the operation

## Examples
- Input: `gcode_snippet params={ controller: "haas", snippet_type: "drill_cycle", params: { x: 25, y: 50, z_final: -20, retract: 2, peck: 5 } }`
- Output: G83 peck drill cycle block with Z-20. Q5. R2. F200, positioned at X25. Y50., with G80 cancel

- Input: `gcode_snippet params={ controller: "fanuc", snippet_type: "tool_change", params: { tool_number: 3, rpm: 8000, coolant: "flood" } }`
- Output: T3 M6 / G43 H3 Z100. / S8000 M3 / M8 snippet with safe Z retract before change
