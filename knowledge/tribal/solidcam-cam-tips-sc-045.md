---
id: "sc-045"
title: "iMachining 2D Material Profiles — Custom Database for Exotic Alloys"
source: "web:solidcam-docs"
confidence: 88
category: "cam_strategy"
tags: ["solidcam", "imachining", "material-database", "exotic-alloys", "technology-wizard"]
_source: "solidcam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:43.698Z
---

# iMachining 2D Material Profiles — Custom Database for Exotic Alloys

The iMachining Technology Wizard reads material properties from its internal database to calculate feeds, speeds, and cutting angles. For exotic alloys (Inconel 718, Waspaloy, Ti-6Al-4V Beta-annealed), create custom material profiles via the iMachining Database Editor. Key fields are specific cutting force (kc1.1), cutting speed range (Vc min/max), and max chip thickness. Incorrect kc1.1 values cause the Wizard to over- or under-calculate forces by up to 40%.

**Category:** cam_strategy
**Confidence:** 88
**Source:** web:solidcam-docs
**Operations:** roughing, 2d_pocket

## Related
- [[solidcam-cam-tips-sc-129|iMachining Material Database — Custom Material Entries for Exotic Alloys]]
- [[solidcam-cam-tips-sc-144-2|Weibull Tool Life for iMachining Replace-Before-Fail]]
- [[solidcam-cam-tips-sc-174-2|Pencil Tracing for Corner Cleanup]]
- [[solidcam-cam-tips-sc-040|iMachining 2D Moating — Break Large Pockets into Efficient Zones]]
- [[solidcam-cam-tips-sc-041|iMachining 2D Channel Width — Adapt Morphing Spiral for Narrow Slots]]
