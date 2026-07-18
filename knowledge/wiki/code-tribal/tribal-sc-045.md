---
name: tribal-sc-045
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["solidcam", "imachining", "material-database", "exotic-alloys", "technology-wizard"]
confidence: 88
source: "web:solidcam-docs"
promoted_from: knowledge/tribal/solidcam-cam-tips-sc-045.md
promoted_at: 2026-06-09T22:31:16.582Z
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
