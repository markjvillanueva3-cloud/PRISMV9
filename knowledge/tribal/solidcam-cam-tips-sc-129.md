---
id: "sc-129"
title: "iMachining Material Database — Custom Material Entries for Exotic Alloys"
source: "web:solidcam-docs"
confidence: 88
category: "cam_strategy"
tags: ["solidcam", "imachining", "material-database", "exotic-alloys", "customization"]
_source: "solidcam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:43.763Z
---

# iMachining Material Database — Custom Material Entries for Exotic Alloys

The iMachining Technology Wizard uses a built-in material database with predefined cutting data for common materials. For exotic alloys not in the database (Stellite, Kovar, Invar, Monel, Mu-metal, beryllium copper), create custom material entries by specifying: material group (closest match), tensile strength (MPa), hardness (HRC/HB), and thermal conductivity. Start with the closest built-in material, reduce the iMachining level by one step, and run test cuts to calibrate. Save validated parameters as a custom material profile with your shop-specific tool and machine data so the Technology Wizard produces accurate results for recurring exotic material jobs.

**Category:** cam_strategy
**Confidence:** 88
**Source:** web:solidcam-docs
**Operations:** roughing, setup

## Related
- [[solidcam-cam-tips-sc-045|iMachining 2D Material Profiles — Custom Database for Exotic Alloys]]
- [[solidcam-cam-tips-sc-144-2|Weibull Tool Life for iMachining Replace-Before-Fail]]
- [[solidcam-cam-tips-sc-174-2|Pencil Tracing for Corner Cleanup]]
- [[solidcam-cam-tips-sc-040|iMachining 2D Moating — Break Large Pockets into Efficient Zones]]
- [[solidcam-cam-tips-sc-041|iMachining 2D Channel Width — Adapt Morphing Spiral for Narrow Slots]]
