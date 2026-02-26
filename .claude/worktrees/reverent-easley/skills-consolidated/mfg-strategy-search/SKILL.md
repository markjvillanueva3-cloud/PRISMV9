---
name: mfg-strategy-search
description: Search and look up toolpath strategies by name, keyword, or machining challenge
---

## When To Use
- Looking up a specific toolpath strategy by name or keyword
- Searching for strategies that address a particular machining challenge
- Getting detailed information about a strategy's mechanics and applicability
- NOT for selecting the best strategy for a feature (use mfg-strategy-select)
- NOT for calculating strategy parameters (use mfg-toolpath-params)

## How To Use
### Search Strategies by Keyword
```
prism_toolpath action=strategy_search params={
  query: "thin wall machining"
}
```

### Get Strategy Details
```
prism_toolpath action=strategy_info params={
  strategy: "morph_spiral"
}
```

### Search for Roughing Strategies
```
prism_toolpath action=strategy_search params={
  query: "high efficiency roughing constant engagement"
}
```

### List All Available Strategies
```
prism_toolpath action=strategy_list params={}
```

## What It Returns
```json
{
  "query": "thin wall machining",
  "results": [
    {
      "strategy": "morph_spiral",
      "category": "finishing",
      "description": "Spiral toolpath morphed to pocket boundary, maintains constant stepover on thin walls",
      "best_for": ["thin_wall", "floor_finishing", "pocket_finishing"],
      "engagement_control": "constant_stepover",
      "supported_features": ["pocket", "face", "open_pocket"]
    },
    {
      "strategy": "rest_machining",
      "category": "semi_finishing",
      "description": "Removes material left by larger tools, reduces wall loading",
      "best_for": ["thin_wall", "corners", "small_features"],
      "engagement_control": "material_aware",
      "supported_features": ["pocket", "contour", "3d_surface"]
    }
  ],
  "total_matches": 2
}
```

## Examples
### Search for Thin Wall Strategies
- Input: `prism_toolpath action=strategy_search params={query: "thin wall machining"}`
- Output: Morph spiral and rest machining strategies with thin wall applicability
- Edge case: Combine with alternating climb/conventional passes for walls under 1.5mm

### Get Morph Spiral Details
- Input: `prism_toolpath action=strategy_info params={strategy: "morph_spiral"}`
- Output: Full description, parameter ranges, supported features, limitations
- Edge case: Morph spiral breaks down on non-convex boundaries — use contour parallel instead

### Search Roughing Approaches
- Input: `prism_toolpath action=strategy_search params={query: "high efficiency roughing constant engagement"}`
- Output: Adaptive clearing, VoluMill, iMachining, profit milling — all constant-engagement roughing
- Edge case: Patent-specific strategies (VoluMill, iMachining) need matching CAM software licenses
