---
name: fusion-export-tools
description: Export PRISM tool catalog to Fusion 360 .tools format for direct import
---

# Fusion Export Tools

Export cutting tools from PRISM's 94K+ tool catalog to Fusion 360 Tool Library format (.tools JSON).

## Usage
- `/fusion-export-tools` — export your personal tool crib
- `/fusion-export-tools --manufacturer=Kennametal` — export all Kennametal tools
- `/fusion-export-tools --type=end_mill --limit=500` — export up to 500 end mills
- `/fusion-export-tools --all` — export entire catalog (warning: large file)
- `/fusion-export-tools --live` — push directly to Fusion 360 via live bridge (port 18360)

## Process
1. Parse args for filters (manufacturer, type, series, limit)
2. Query ToolCatalogEngine with filters
3. Convert each tool via FusionToolExportEngine (catalog cutting data + 17 holder types)
4. Save .tools JSON to ~/.prism/fusion360/libraries/
5. If --live: POST to Fusion 360 add-in /tool-import endpoint
6. Report results

## Steps

### Step 1: Query tools
```typescript
const { toolCatalogEngine } = await import("../engines/ToolCatalogEngine.js");
const allTools = toolCatalogEngine.search({
  manufacturer: args.manufacturer,
  type: args.type,
  series: args.series,
});
const tools = args.limit ? allTools.slice(0, args.limit) : allTools;
```

### Step 2: Convert to F360 format
```typescript
const { fusionToolExportEngine } = await import("../engines/FusionToolExportEngine.js");
const library = fusionToolExportEngine.exportLibrary(tools);
```

### Step 3: Save file
Save to `~/.prism/fusion360/libraries/<name>.tools` where name is derived from filters.

### Step 4: Report
```
F360 EXPORT COMPLETE
Tools: [N] exported
File:  ~/.prism/fusion360/libraries/<name>.tools
Size:  [N] KB

Import into Fusion 360:
  1. Open Fusion 360 → Manufacture workspace
  2. Manage → Tool Libraries → Import
  3. Select the .tools file above
  4. Tools appear with physics-backed S/F + holder geometry
```
