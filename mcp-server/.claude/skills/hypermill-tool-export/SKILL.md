---
description: Export tool definitions to hyperMILL .hmt tool library format
model: sonnet
effort: HIGH
---

# /hypermill-tool-export

## Args: $ARGUMENTS

Export one or more tool definitions to hyperMILL .hmt XML tool library format.

Expected args: `[tool_id=<id>] [diameter=<mm>] [type=<endmill|ballnose|drill|tap>] [material=<carbide|hss>] [coating=<TiAlN|TiN|uncoated>]`

## Steps

1. Call `prism_calc` → `tool_lookup` with the tool parameters from args
   - Resolve tool geometry: diameter, flute count, helix angle, overall length
2. Call `prism_cam` → `cam_hypermill_tool_export` with the resolved tool data:
   - Output format: hmt_xml
   - Include cutting data recommendations
3. Optionally call `cam_hypermill_material_to_physics` to embed recommended Vc in tool entry

## Present to User

Show:
- Generated .hmt XML snippet for direct import into hyperMILL Tool Database
- Tool parameters: FRTYP (tool type code), diameter, flute count, corner radius
- Recommended cutting data section with Vc [m/min] per material group
- Import instructions: hyperMILL Tool Manager → Import → .hmt file
- Tool ID mapping for use in job configurations
