---
name: tribal-wnc-200
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["post-processor", "customization", "controller", "gcode", "format"]
confidence: 91
source: "web:worknc-docs"
promoted_from: knowledge/tribal/worknc-cam-tips-wnc-200.md
promoted_at: 2026-05-26T16:07:21.737Z
---

# WorkNC Post Processor Customization — Machine-Specific Output

WorkNC's post processor engine is fully customizable for each machine/controller combination. Key customizations: (1) canned cycle format (G81-G89 parameters vary by controller), (2) tool change sequence (some machines need M01 after each change), (3) work offset format (G54-G59 vs G54.1 P1-P48), (4) rotary axis output (TCPM/RTCP activation codes), (5) program structure (main program + subprograms vs single program). Test each post processor modification with a simple test part before production use. Maintain a test protocol document listing the verification steps for each controller type.

**Category:** cam_strategy
**Confidence:** 91
**Source:** web:worknc-docs
**Operations:** general

## Related
- [[camworks-cam-tips-cw-085|Post Customization — Modify Output Format for Your Controller]]
- [[cimatron-cam-tips-cim-021|Post Processor Customization for Machine Controllers]]
- [[topsolid-cam-tips-ts-067|Post Processor Customization Matches Controller Requirements]]
- [[worknc-cam-tips-wnc-059|Post Customization Matches Controller Syntax]]
- [[camworks-cam-tips-cw-088|Machine-Specific Post Output — Optimize for Controller Capabilities]]
