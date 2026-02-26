---
name: mfg-tool-lookup
description: Retrieve cutting tool specifications by ID from ToolRegistry (13,967 tools) — geometry, grade, applications
---

## When To Use
- Know the specific tool designation (e.g., CNMG120408) and need full specs
- Need geometry details (nose radius, rake angle, insert shape) for a specific tool
- Checking grade composition, coating, and application range for a known tool
- Verifying manufacturer recommendations for a tool already selected
- NOT for searching tools by description (use mfg-tool-search)
- NOT for tool recommendations based on operation (use mfg-tool-recommend)

## How To Use
### Look up tool by ISO designation
```
prism_data action=tool_get params={
  id: "CNMG120408"
}
```

### Look up with manufacturer variant
```
prism_data action=tool_get params={
  id: "CNMG120408-PM",
  manufacturer: "sandvik"
}
```

## What It Returns
```json
{
  "id": "CNMG120408",
  "type": "turning_insert",
  "iso_designation": {
    "shape": "C (80-degree rhombic)",
    "clearance": "N (0 degrees)",
    "tolerance": "M (±0.08mm)",
    "type": "G (chipbreaker both sides)",
    "size_IC_mm": 12.7,
    "thickness_mm": 4.76,
    "nose_radius_mm": 0.8
  },
  "grades": [
    {
      "designation": "GC4325",
      "manufacturer": "Sandvik",
      "substrate": "Cemented carbide",
      "coating": "CVD Ti(C,N)+Al2O3+TiN",
      "hardness_HV": 1600,
      "application": "P15-P35 (steel medium roughing to finishing)"
    }
  ],
  "recommended_parameters": {
    "Vc_m_min": {"min": 180, "typical": 280, "max": 400},
    "f_mm_rev": {"min": 0.15, "typical": 0.30, "max": 0.50},
    "ap_mm": {"min": 0.5, "typical": 2.5, "max": 4.0}
  },
  "applications": ["General steel turning", "Medium roughing", "Semi-finishing"],
  "chipbreaker": "PM (Medium machining, good chip control)"
}
```

## Examples
### Look up a standard turning insert
- Input: `prism_data action=tool_get params={id: "CNMG120408"}`
- Output: 80-degree rhombic insert, 12.7mm IC, 0.8mm nose radius, P15-P35 application range, 180-400 m/min Vc
- Edge case: Generic ID returns all available grades; add manufacturer or grade suffix to narrow results

### Look up a specific manufacturer variant
- Input: `prism_data action=tool_get params={id: "CNMG120408-PM", manufacturer: "sandvik"}`
- Output: Sandvik GC4325 grade with PM chipbreaker, CVD-coated, optimized for steel medium machining
- Edge case: Manufacturer-specific designations (e.g., Sandvik "-PM" vs. Kennametal "-KP") differ even for same ISO base
