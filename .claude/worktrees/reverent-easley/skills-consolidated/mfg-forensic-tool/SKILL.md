---
name: Tool Failure Autopsy
description: Analyze failed tool to determine failure mode and root cause
---

## When To Use
- A cutting tool has failed unexpectedly and you need to understand why
- Examining a worn or broken tool to classify the failure mode
- Building a case for changing parameters, tooling, or setup based on tool failure evidence
- Documenting tool failures for continuous improvement or supplier feedback

## How To Use
```
prism_intelligence action=forensic_tool_autopsy params={
  tool_type: "endmill",
  tool_material: "carbide",
  coating: "AlTiN",
  diameter: 12,
  failure_description: "corner chipping on two flutes, flank wear 0.35mm, crater visible on rake face",
  material_cut: "Ti-6Al-4V",
  cutting_params: { speed: 65, feed: 0.08, depth: 15, coolant: "flood" }
}
```

## What It Returns
- Classified failure mode (flank wear, crater wear, chipping, fracture, BUE, etc.)
- Root cause analysis with probability ranking
- Contributing factors and their relative importance
- Recommended corrective actions to prevent recurrence
- Expected vs actual tool life comparison

## Examples
- Input: `forensic_tool_autopsy params={ failure_description: "catastrophic fracture at 3mm from tip", tool_type: "drill", diameter: 8, material_cut: "316L" }`
- Output: Torsional fracture from chip packing; cause: insufficient peck depth or blocked coolant hole

- Input: `forensic_tool_autopsy params={ failure_description: "blue discoloration, crater on rake, edge rounding", tool_type: "insert", coating: "TiN" }`
- Output: Thermal failure mode; speed too high for coating grade, recommend AlTiN or reduce speed 20%
