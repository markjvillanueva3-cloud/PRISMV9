---
name: CAM Systems Reference
description: List supported CAM systems and integration capabilities
---

## When To Use
- When checking which CAM systems PRISM can integrate with
- When determining export format compatibility for a specific CAM system
- When planning a CAM workflow and need to know available integrations
- NOT for exporting data to CAM — use mfg-cam-export instead
- NOT for CAM operation analysis — use mfg-cam-analyze instead

## How To Use
```
prism_intelligence action=cam_systems params={
  filter: "milling",
  capabilities: ["tool_import", "parameter_export"]
}
```

## What It Returns
- List of supported CAM systems with version compatibility
- Integration capabilities per system (import/export/sync)
- Supported file formats per system
- Feature coverage matrix (which operations each system supports)
- Known limitations and workarounds

## Examples
- Input: `cam_systems params={}`
- Output: 8 systems supported — Mastercam (2024+), Fusion 360, SolidCAM, GibbsCAM, Esprit, PowerMill, hyperMILL, NX CAM. Full capability matrix returned

- Input: `cam_systems params={filter: "5-axis", capabilities: ["toolpath_export"]}`
- Output: 4 systems with 5-axis toolpath export — PowerMill, hyperMILL, NX CAM, Mastercam. Format details and limitations per system
