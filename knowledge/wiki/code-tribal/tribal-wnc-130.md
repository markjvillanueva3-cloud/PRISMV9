---
name: tribal-wnc-130
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["auto-5", "post-processor", "rtcp", "tcpm", "controller"]
confidence: 92
source: "web:worknc-docs"
promoted_from: knowledge/tribal/worknc-cam-tips-wnc-130.md
promoted_at: 2026-05-26T16:07:21.591Z
---

# Auto5 Post Processor Requirements — RTCP and TCPM Support

Auto5 toolpaths require a post processor that outputs RTCP (Rotated Tool Center Point) or TCPM (Tool Center Point Management) commands. Without RTCP/TCPM, the controller cannot maintain the tool tip position when rotating axes. For Heidenhain: FUNCTION TCPM or M128. For Fanuc: G43.4 or G43.5. For Siemens: TRAORI. Verify the post processor outputs the correct RTCP activation before the first 5-axis move and deactivation after the last. Test with a simple dome shape before running complex Auto5 toolpaths on production parts.

**Category:** cam_strategy
**Confidence:** 92
**Source:** web:worknc-docs
**Operations:** 5_axis

## Related
- [[cimatron-cam-tips-cim-058|RTCP/TCPM Configuration in Post Processor]]
- [[hypermill-cam-tips-ext-hm-130|RTCP/TCPM Configuration for Post Processing]]
- [[sprutcam-cam-tips-spr-085|RTCP/TCPM Output Configuration]]
- [[tebis-cam-tips-teb-064|RTCP/TCPM Configuration for 5-Axis Machines]]
- [[camworks-cam-tips-cw-085|Post Customization — Modify Output Format for Your Controller]]
