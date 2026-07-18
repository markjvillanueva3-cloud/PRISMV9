---
name: tribal-nx-132
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["rest-milling", "progressive", "reference-tool", "efficiency"]
confidence: 0
source: "web:siemens-nx-docs"
promoted_from: knowledge/tribal/nx-cam-tips-ext-nx-132.md
promoted_at: 2026-06-09T22:31:16.496Z
---

# Rest Milling with Progressive Tool Sizing

For complex cavities, use progressive rest milling: 25mm rough → 12mm rest-rough → 6mm semi-finish → 3mm finish → 1mm pencil. Each operation references ALL previous tools for accurate rest detection. NX's 'Reference Tool' list accepts multiple entries. Set 'Minimum Material Thickness' to 0.1mm to skip insignificant stock remnants. This eliminates wasted cuts on thin slivers of material.

**Category:** cam_strategy
**Confidence:** 0.88
**Source:** web:siemens-nx-docs
**Operations:** finishing

## Related
- [[cimatron-cam-tips-cim-074|Progressive Rest Machining Strategy]]
- [[hypermill-cam-tips-ext-hm-144|Progressive Rest Machining]]
- [[solidcam-cam-tips-sc-176-2|Progressive Rest Machining]]
- [[tebis-cam-tips-teb-073|Progressive Rest Machining with Multiple Reference Tools]]
- [[worknc-cam-tips-wnc-032|Rest Finishing Targets Only Unmachined Areas]]
