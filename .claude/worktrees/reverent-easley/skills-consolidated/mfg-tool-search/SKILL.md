---
name: mfg-tool-search
description: Search cutting tools by description, type, or specifications using full-text search across ToolRegistry
---

## When To Use
- User describes a tool need without knowing the specific designation (e.g., "face mill 50mm 5 insert")
- Searching for tools by operation type, size, or material application
- Finding alternatives to a known tool by searching similar specifications
- Browsing tool options for a new application
- NOT for looking up a known tool by ID (use mfg-tool-lookup)
- NOT for operation-based tool recommendations with reasoning (use mfg-tool-recommend)

## How To Use
### Search by description
```
prism_data action=tool_search params={
  query: "face mill 50mm 5 insert"
}
```

### Search with filters
```
prism_data action=tool_search params={
  query: "end mill carbide 4 flute",
  filters: {
    type: "solid_end_mill",
    diameter_mm: {"min": 8, "max": 12},
    material_application: "stainless_steel"
  },
  limit: 10
}
```

## What It Returns
```json
{
  "results": [
    {
      "id": "345-050Q22-13M",
      "manufacturer": "Sandvik",
      "type": "face_mill",
      "description": "CoroMill 345 Face Mill 50mm 5-insert",
      "relevance_score": 0.95,
      "specs": {
        "diameter_mm": 50,
        "inserts": 5,
        "connection": "Coromant Capto C4",
        "max_ap_mm": 6.0,
        "insert_type": "345R-13T5"
      }
    },
    {
      "id": "F4042.B22.050.Z05.13",
      "manufacturer": "Walter",
      "type": "face_mill",
      "description": "BLAXX F4042 Face Mill 50mm 5-insert",
      "relevance_score": 0.91,
      "specs": {
        "diameter_mm": 50,
        "inserts": 5,
        "connection": "Arbor 22mm",
        "max_ap_mm": 5.5,
        "insert_type": "SDHT1305"
      }
    }
  ],
  "total_matches": 34,
  "search_time_ms": 15
}
```

## Examples
### Search for a face mill
- Input: `prism_data action=tool_search params={query: "face mill 50mm 5 insert"}`
- Output: 34 matching tools, top results from Sandvik CoroMill 345 and Walter BLAXX at 0.95 and 0.91 relevance
- Edge case: "5 insert" vs "5 flute" are different; face mills use inserts, end mills use flutes

### Search for solid carbide end mills for stainless
- Input: `prism_data action=tool_search params={query: "end mill carbide 4 flute", filters: {material_application: "stainless_steel"}}`
- Output: Filtered results showing only tools rated for stainless steel, with AlTiN or TiAlN coatings
- Edge case: Some tools are rated for multiple material groups; filter matches any tool that includes the specified material
