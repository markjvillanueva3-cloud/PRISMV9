---
name: tribal-ec-146
category: code-tribal
subdomain: post_processing
domain: tribal-knowledge
tags: ["code-wizard", "canned-cycles", "macros", "controller-specific"]
confidence: 0
source: "web:edgecam-docs"
promoted_from: knowledge/tribal/edgecam-cam-tips-ec-146.md
promoted_at: 2026-06-09T22:31:16.195Z
---

# Code Wizard Macro Sub-Program Calls for Canned Cycles

Customize Code Wizard to output machine-specific canned cycle formats. Fanuc uses G73/G83 with Q/R parameters; Siemens uses CYCLE83 with RTP/RFP/SDIS/DP/DPR. Map Edgecam's drilling cycle parameters to the target controller format. For custom cycles (probing, thread milling, bore finishing), create macro call events that output G65 P-number with argument variables (A-Z) mapped from Edgecam operation parameters.

**Category:** post_processing
**Confidence:** 0.86
**Source:** web:edgecam-docs
**Operations:** drilling, boring

## Related
- [[surfcam-cam-tips-sc2-072|Canned Cycle Output for Drilling and Tapping]]
- [[surfcam-cam-tips-sc2-212|SURFCAM Post Processor Canned Cycle Customization]]
- [[edgecam-cam-tips-ec-074|Code Wizard for Custom Post Processor Creation]]
- [[edgecam-cam-tips-ec-143|Code Wizard Event-Driven Post Processor Architecture]]
- [[edgecam-cam-tips-ec-144|Code Wizard Variable System for Machine-Specific Output]]
