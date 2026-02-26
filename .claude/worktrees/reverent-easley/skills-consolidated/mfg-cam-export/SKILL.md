---
name: CAM Exporter
description: Export toolpath and parameters to CAM system format
---

## When To Use
- When exporting calculated parameters to a specific CAM system
- When generating CAM-ready tool and operation data
- When bridging PRISM calculations to external CAM software
- NOT for G-code generation — use mfg-dnc-generate instead
- NOT for post-processor output — use mfg-post-translate instead

## How To Use
```
prism_intelligence action=cam_export params={
  operations: ["op1_rough", "op2_finish", "op3_drill"],
  cam_system: "Mastercam",
  format: "xml",
  include_tools: true,
  include_fixtures: true
}
```

## What It Returns
- Formatted export data for the target CAM system
- Tool definition blocks with geometry and cutting data
- Operation parameters in CAM-native format
- Fixture/workholding reference data
- Import instructions for the target system

## Examples
- Input: `cam_export params={operations: ["pocket_rough","pocket_finish"], cam_system: "Fusion360", format: "json"}`
- Output: Fusion 360 compatible JSON with tool definitions, adaptive clearing params, and finishing passes

- Input: `cam_export params={operations: ["turn_od","thread"], cam_system: "Mastercam", format: "xml"}`
- Output: Mastercam XML toolpath definition with lathe tool specs, roughing cycle, and G76 threading params
