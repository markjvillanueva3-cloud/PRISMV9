---
name: mfg-material-search
description: Search materials by properties, application, or natural language query across 3,533 entries
---

## When To Use
- User describes a material need without knowing the exact grade
- Searching by property range (e.g., "steel with HRC > 50")
- Finding materials for a specific application (e.g., "corrosion resistant for marine")
- NOT for looking up a known material by ID (use mfg-material-lookup)
- NOT for finding substitutes (use mfg-material-substitute)

## How To Use
### Natural Language Search
```
prism_data action=material_search params={
  query: "stainless steel high corrosion resistance"
}
```

### Property-Based Search
```
prism_data action=material_search params={
  query: "aluminum alloy tensile > 400MPa good machinability"
}
```

## What It Returns
```json
{
  "results": [
    {
      "id": "316L_stainless",
      "name": "AISI 316L Stainless Steel",
      "relevance_score": 0.94,
      "highlights": ["excellent corrosion resistance", "marine grade"],
      "machinability_rating": 36,
      "hardness_HB": 217
    },
    {
      "id": "duplex_2205",
      "name": "Duplex 2205 Stainless Steel",
      "relevance_score": 0.89,
      "highlights": ["superior corrosion resistance", "high strength"],
      "machinability_rating": 28,
      "hardness_HB": 293
    }
  ],
  "total_matches": 47,
  "showing": 10,
  "search_type": "full_text"
}
```

## Examples
### Find Corrosion-Resistant Stainless
- Input: `prism_data action=material_search params={query: "stainless steel high corrosion resistance"}`
- Output: 316L (score 0.94), Duplex 2205 (0.89), 17-4PH (0.82) ranked by relevance
- Edge case: "Corrosion resistant" alone returns hundreds of results; add application context for better ranking

### High-Strength Aluminum
- Input: `prism_data action=material_search params={query: "aluminum alloy tensile > 400MPa good machinability"}`
- Output: 7075-T6 (tensile 572MPa), 2024-T3 (tensile 483MPa), 6082-T6 (tensile 310MPa — below threshold but good machinability)
- Edge case: Property thresholds in natural language are approximated; verify exact values after selection
