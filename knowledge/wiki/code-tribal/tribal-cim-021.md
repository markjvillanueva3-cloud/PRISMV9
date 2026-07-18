---
name: tribal-cim-021
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["post-processor", "customization", "controller", "pp-files"]
confidence: 0
source: "web:cimatron-docs"
promoted_from: knowledge/tribal/cimatron-cam-tips-cim-021.md
promoted_at: 2026-06-09T22:31:16.086Z
---

# Post Processor Customization for Machine Controllers

Cimatron's post processor uses macro-based PP files. Common customizations: (1) add M-codes for through-spindle coolant, (2) configure canned cycle output format for specific controllers (Fanuc/Siemens/Heidenhain), (3) adjust safe plane heights per setup, (4) add tool measurement macros. Test PP changes with 'Dry Run' output before sending to machines. Keep PP backups before modifications.

**Category:** cam_strategy
**Confidence:** 0.85
**Source:** web:cimatron-docs
**Operations:** post_processing

## Related
- [[camworks-cam-tips-cw-085|Post Customization — Modify Output Format for Your Controller]]
- [[topsolid-cam-tips-ts-067|Post Processor Customization Matches Controller Requirements]]
- [[worknc-cam-tips-wnc-059|Post Customization Matches Controller Syntax]]
- [[worknc-cam-tips-wnc-200|WorkNC Post Processor Customization — Machine-Specific Output]]
- [[camworks-cam-tips-cw-088|Machine-Specific Post Output — Optimize for Controller Capabilities]]
