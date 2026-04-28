---
id: "cat-070"
title: "Post-Processor Table Customization for Controller Compatibility"
source: "web:catia-docs"
confidence: 90
category: "cam_strategy"
tags: ["catia", "post-processor", "pp-table", "g-code", "controller"]
_source: "catia-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.855Z
---

# Post-Processor Table Customization for Controller Compatibility

CATIA uses PP (Post-Processor) tables to translate internal tool path data (APT/CLDATA) into controller-specific G-code. Customize the PP table for your specific controller (Fanuc, Siemens, Heidenhain) by modifying the word addresses, block format, and cycle definitions. Critical customizations include: decimal point format (Fanuc uses no decimal for integers), arc output mode (IJ incremental vs absolute), and coordinate system rotation syntax (G68 vs CYCLE800 vs PLANE SPATIAL). Test with a simple part before production use.

**Category:** cam_strategy
**Confidence:** 90
**Source:** web:catia-docs
**Operations:** post_processing

## Related
- [[catia-cam-tips-cat-186|PP Table Word Address Customization for Controller-Specific Output]]
- [[catia-cam-tips-cat-072|Canned Cycle Output for Drilling Operations]]
- [[camworks-cam-tips-cw-085|Post Customization — Modify Output Format for Your Controller]]
- [[controller-knowledge-tips-ctrl-075|SINUMERIK Unique G-Codes Beyond ISO Standard]]
- [[topsolid-cam-tips-ts-067|Post Processor Customization Matches Controller Requirements]]
