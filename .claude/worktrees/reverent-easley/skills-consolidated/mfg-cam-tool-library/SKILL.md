---
name: CAM Tool Library Manager
description: Manage CAM tool library with tool data and cutting parameters
---

## When To Use
- When querying the CAM-integrated tool library for available tools
- When retrieving tool geometry and cutting data for CAM operations
- When checking tool availability before assigning to operations
- NOT for general tool search — use mfg-tool-search instead
- NOT for tool recommendation — use mfg-tool-recommend instead

## How To Use
```
prism_intelligence action=cam_tool_library params={
  query: "endmill",
  diameter_range: [6, 20],
  material_compatibility: "stainless",
  cam_system: "Mastercam"
}
```
```
prism_intelligence action=cam_tool_get params={
  tool_id: "EM-12-4F-ALTIN",
  cam_system: "Fusion360",
  include_cutting_data: true
}
```

## What It Returns
- Tool list with geometry, material, and coating specs
- CAM-formatted tool definitions ready for import
- Cutting data per material from tool manufacturer
- Tool availability and stock status
- Compatible toolholder recommendations

## Examples
- Input: `cam_tool_library params={query: "ball_endmill", diameter_range: [3,10], material_compatibility: "titanium"}`
- Output: 8 tools found — 4 carbide solid, 2 indexable, 2 ceramic. Includes CAM geometry profiles and Ti-6Al-4V cutting data
- Input: `cam_tool_get params={tool_id: "DR-8.5-3XD", cam_system: "Mastercam"}`
- Output: 8.5mm carbide drill, 3xD, TiAlN coated, Mastercam drill definition with peck cycle params for steel/aluminum/stainless
