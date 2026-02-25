---
name: mfg-tool-recommend
description: Get tool recommendations with reasoning based on operation, material, and cutting conditions from ToolRegistry
---

## When To Use
- Need the best tool for a specific operation and material combination
- Want ranked recommendations with reasoning for tool selection
- Setting up a new job and need insert grade, geometry, and chipbreaker advice
- Combine with tool_facets to understand available options in a category
- NOT for looking up a known tool (use mfg-tool-lookup)
- NOT for simple search by description (use mfg-tool-search)

## How To Use
### Get tool recommendations for an operation
```
prism_data action=tool_recommend params={
  operation: "face_milling",
  material: "4140_steel",
  width: 80,
  depth: 3
}
```

### Get facets to understand options
```
prism_data action=tool_facets params={
  operation: "milling"
}
```

### Combined recommendation with constraints
```
prism_data action=tool_recommend params={
  operation: "turning_roughing",
  material: "inconel_718",
  depth_of_cut: 3,
  constraints: {
    toolholder: "DCLNL2525M12",
    max_insert_cost: 15
  }
}
```

## What It Returns
```json
{
  "recommendations": [
    {
      "rank": 1,
      "tool_id": "345R-1305E-PL",
      "grade": "GC4340",
      "manufacturer": "Sandvik",
      "reasoning": "Wiper insert geometry provides superior surface finish at higher feeds. GC4340 grade optimized for P20-P40 steel range. 5 effective cutting edges reduce cost per edge.",
      "parameters": {
        "Vc_m_min": 280,
        "fz_mm": 0.22,
        "ap_mm": 3.0,
        "ae_mm": 60
      },
      "expected_life_min": 45,
      "cost_per_edge": 4.80
    },
    {
      "rank": 2,
      "tool_id": "R245-12T3E-AL",
      "grade": "GC1040",
      "manufacturer": "Sandvik",
      "reasoning": "Round insert provides strong edge for interrupted cuts. Higher toughness grade for unstable setups. 4 edges per insert.",
      "parameters": {
        "Vc_m_min": 250,
        "fz_mm": 0.18,
        "ap_mm": 3.0,
        "ae_mm": 60
      },
      "expected_life_min": 55,
      "cost_per_edge": 5.20
    }
  ],
  "facets": {
    "available_types": ["face_mill", "shell_mill", "indexable_end_mill"],
    "diameter_range_mm": [25, 200],
    "insert_shapes": ["square", "round", "octagonal", "triangular"]
  }
}
```

## Examples
### Recommend face milling tool for 4140 steel
- Input: `prism_data action=tool_recommend params={operation: "face_milling", material: "4140_steel", width: 80, depth: 3}`
- Output: Ranked list with Sandvik 345R wiper insert at rank 1 (280 m/min, 45 min life, $4.80/edge), reasoning explains why
- Edge case: Width > cutter diameter triggers recommendation for offset or multiple-pass strategy

### Get facets for milling operations
- Input: `prism_data action=tool_facets params={operation: "milling"}`
- Output: Available tool types, diameter ranges, insert shapes, and material groups for milling category
- Edge case: Facets are hierarchical; "milling" returns all sub-types (face, slot, pocket, shoulder)
