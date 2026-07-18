---
name: tribal-cat-070
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["catia", "post-processor", "pp-table", "g-code", "controller"]
confidence: 90
source: "web:catia-docs"
promoted_from: knowledge/tribal/catia-cam-tips-cat-070.md
promoted_at: 2026-05-26T16:07:20.058Z
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
