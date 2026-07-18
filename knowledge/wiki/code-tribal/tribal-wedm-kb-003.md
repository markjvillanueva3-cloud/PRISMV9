---
name: tribal-wedm-kb-003
category: code-tribal
subdomain: troubleshooting
domain: tribal-knowledge
tags: ["wire-edm", "wire-break", "recovery", "re-thread", "awt"]
confidence: 88
source: "handbook:sodick_operation_manual"
promoted_from: knowledge/tribal/wedm-knowledge-tips-wedm-kb-003.md
promoted_at: 2026-06-09T22:31:16.787Z
---

# Wire break recovery: re-thread 2mm behind break point

After a wire break, re-thread the wire 2-3mm behind the break point and restart. Do NOT restart from the exact break location — debris and recast layer at the break point cause immediate re-break. Most Mitsubishi and Sodick machines have automatic wire re-threading (AWT) but set the backup distance in the controller parameters. For production: set auto-retry count to 3 with 2mm backup. If it breaks 3 times at the same location, the machine should alarm and notify the operator.

**Category:** troubleshooting
**Confidence:** 88
**Source:** handbook:sodick_operation_manual
**Operations:** wire_edm

## Related
- [[surfcam-cam-tips-sc2-168|SURFCAM Wire EDM Wire Threading and Re-Threading Sequences]]
- [[wedm-knowledge-tips-wedm-mcam-002-2|Reverse cutting method eliminates re-threading between passes]]
- [[bobcad-cam-tips-bc-066|Wire Threading and Glue Stop Programming]]
- [[bobcad-cam-tips-bc-160|BobCAD Wire EDM Automatic Wire Threading Point Optimization]]
- [[camworks-cam-tips-cw-162|Wire EDM Auto-Threading and Recovery — Unattended Operation]]
