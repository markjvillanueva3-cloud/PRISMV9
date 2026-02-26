---
name: mfg-machine-search
description: Search machines by capability, type, or specifications using full-text search across MachineRegistry
---

## When To Use
- User describes machine requirements without knowing a specific model (e.g., "5-axis with 500mm travel")
- Need to find machines matching specific criteria (spindle speed, axis count, travel range)
- Comparing available machines for a particular job or part geometry
- NOT for looking up a known machine by ID (use mfg-machine-lookup)
- NOT for detailed capability analysis of a single machine (use mfg-machine-capabilities)

## How To Use
### Search by natural language query
```
prism_data action=machine_search params={
  query: "5-axis simultaneous 500mm travel"
}
```

### Search with filters
```
prism_data action=machine_search params={
  query: "high speed milling",
  filters: {
    type: "vertical_machining_center",
    min_rpm: 15000,
    axes: 5
  },
  limit: 10
}
```

## What It Returns
```json
{
  "results": [
    {
      "id": "dmg_dmu50",
      "manufacturer": "DMG Mori",
      "model": "DMU 50",
      "type": "5_axis_universal",
      "relevance_score": 0.94,
      "highlights": {
        "axes": "5-axis simultaneous",
        "travels": "500x450x400mm",
        "spindle": "20,000 RPM HSK-A63"
      }
    },
    {
      "id": "hermle_c400",
      "manufacturer": "Hermle",
      "model": "C 400",
      "type": "5_axis_universal",
      "relevance_score": 0.89,
      "highlights": {
        "axes": "5-axis simultaneous",
        "travels": "850x700x500mm",
        "spindle": "18,000 RPM HSK-A63"
      }
    }
  ],
  "total_matches": 47,
  "search_time_ms": 12
}
```

## Examples
### Find 5-axis machines for aerospace work
- Input: `prism_data action=machine_search params={query: "5-axis simultaneous 500mm travel"}`
- Output: Ranked list of 47 matching machines, top result DMG DMU 50 with 0.94 relevance
- Edge case: Overly broad queries like "CNC machine" return too many results; add specifics to narrow down

### Find high-speed machining centers
- Input: `prism_data action=machine_search params={query: "high speed milling 30000 rpm aluminum"}`
- Output: HSM-capable machines ranked by spindle speed and suitability for aluminum
- Edge case: RPM values in query are interpreted as minimum thresholds, not exact matches
