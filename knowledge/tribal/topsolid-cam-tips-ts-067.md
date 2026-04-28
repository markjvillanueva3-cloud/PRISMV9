---
id: "ts-067"
title: "Post Processor Customization Matches Controller Requirements"
source: "web:topsolid-post"
confidence: 92
category: "cam_strategy"
tags: ["post-processor", "customization", "controller", "g-code"]
_source: "topsolid-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.437Z
---

# Post Processor Customization Matches Controller Requirements

TopSolid's post-processor framework generates machine-specific NC code from universal toolpath data. Customize the post for your specific controller by configuring: code format (ISO/Heidenhain/Mazak), block numbering, decimal precision (3-4 decimals for mm, 4-5 for inches), modal vs. non-modal G/M codes, and line termination characters. Test every customization against the controller's syntax requirements using a simple test program before deploying on production jobs.

**Category:** cam_strategy
**Confidence:** 92
**Source:** web:topsolid-post
**Operations:** general

## Related
- [[camworks-cam-tips-cw-085|Post Customization — Modify Output Format for Your Controller]]
- [[catia-cam-tips-cat-070|Post-Processor Table Customization for Controller Compatibility]]
- [[cimatron-cam-tips-cim-021|Post Processor Customization for Machine Controllers]]
- [[controller-knowledge-tips-ctrl-075|SINUMERIK Unique G-Codes Beyond ISO Standard]]
- [[edgecam-cam-tips-ec-074|Code Wizard for Custom Post Processor Creation]]
