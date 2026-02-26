---
name: Coolant Strategy Calculator
description: Calculate optimal coolant strategy — flood, MQL, cryogenic, or dry machining
---

## When To Use
- When selecting the best coolant method for an operation
- When evaluating MQL, cryogenic, flood, or dry machining trade-offs
- When optimizing coolant parameters for specific material/tool combinations
- NOT for coolant flow rate validation — use mfg-coolant-flow instead
- NOT for MQL parameter validation — use mfg-mql-validate instead

## How To Use
```
prism_calc action=coolant_strategy params={
  material: "Ti-6Al-4V",
  operation: "milling",
  tool: { diameter: 12, coating: "AlTiN" },
  speed: 80,
  depth_of_cut: 2.0,
  constraints: { environmental: "low_waste", machine_capability: ["flood", "tsc", "mql"] }
}
```

## What It Returns
- Recommended coolant strategy with confidence rating
- Flow rate, pressure, and concentration parameters
- Temperature prediction at cutting zone
- Tool life impact comparison across strategies
- Environmental and cost comparison

## Examples
- Input: `coolant_strategy params={material: "Ti-6Al-4V", operation: "drilling", depth: "5xD"}`
- Output: Through-spindle coolant required at 70 bar, 20 L/min, 8% concentration. Flood insufficient for chip evacuation at depth

- Input: `coolant_strategy params={material: "6061-T6", operation: "finishing", tool: {coating: "DLC"}}`
- Output: MQL recommended — 20 mL/hr oil mist. DLC coating enables near-dry. 40% cost reduction vs flood, equivalent tool life
