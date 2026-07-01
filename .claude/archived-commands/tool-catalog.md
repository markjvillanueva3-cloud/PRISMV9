# Tool Catalog — Unified Cutting Tool Database with Physical Dimensions

Search, recommend, and build collision envelopes for cutting tools. Covers end mills, drills, face mills, ball mills, inserts, and holders.

## Args
- Empty: show catalog stats
- `search [type] [diameter]`: find tools by type and size (e.g., `search end_mill 10`)
- `recommend [operation] [iso_group]`: get tool recommendations (e.g., `recommend pocket P`)
- `lookup [tool_id]`: get full details for a specific tool
- `assembly [tool_id]`: build tool+holder assembly with collision envelope
- `collision [tool_id]`: get collision envelope profile for gouge checking

## Workflow

1. **Stats**: call `prism_calc` → `tool_catalog_stats` — total tools, by type/manufacturer
2. **Search**: call `tool_catalog_search` with type, diameter_mm, iso_group, manufacturer, operation, coating, flute_count
3. **Recommend**: call `tool_catalog_recommend` with operation, iso_group, diameter_mm, depth_mm, finish_required
4. **Lookup**: call `tool_catalog_lookup` with tool_id
5. **Assembly**: call `tool_catalog_assembly` with tool_id, holder_taper (BT40/CAT40/HSK-A63), holder_type, stickout_mm
6. **Collision**: call `tool_catalog_collision_envelope` — returns diameter profile from tip to holder

## Physical Dimensions Available
- Cutting diameter, shank diameter, overall length, flute length (LOC)
- Neck length/diameter (reduced-neck tools)
- Corner radius, point angle (drills), nose radius (inserts)
- Holder gauge length, body diameter, bore range, max RPM, runout

## Output Format
```
TOOL CATALOG — [query]
══════════════════════
[N] results found

ID: [tool_id]
Type: [type] | Dia: [mm] | LOC: [mm] | OAL: [mm]
Flutes: [N] | Coating: [coat] | Material: [mat]
ISO Groups: P M K N S H
Speed/Feed (P): Vc [min-max] m/min, fz [min-max] mm/tooth
```
