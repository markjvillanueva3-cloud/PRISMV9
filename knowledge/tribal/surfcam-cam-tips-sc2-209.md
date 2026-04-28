---
id: "sc2-209"
title: "SURFCAM Post Processor Architecture and Customization Points"
source: "web:surfcam-docs"
confidence: 0.88
category: "post_processing"
tags: ["post-processor", "spost", "customization", "g-code", "architecture"]
_source: "surfcam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.212Z
---

# SURFCAM Post Processor Architecture and Customization Points

SURFCAM post processors consist of a definition file (.spost) and optional script files for advanced logic. The .spost file defines output format, G/M code mapping, axis names, and block structure. Key customization points: header/footer blocks, tool change sequence, canned cycle formatting, coordinate output format (absolute/incremental), and arc output mode (IJK/R). Start customization by copying the closest matching stock post and modifying it. Never edit stock posts directly — changes are overwritten on SURFCAM updates. Name custom posts with the machine name: 'DMG_DMU80_5ax.spost'.

**Category:** post_processing
**Confidence:** 0.88
**Source:** web:surfcam-docs
**Operations:** roughing, finishing, drilling

## Related
- [[camworks-cam-tips-cw-085|Post Customization — Modify Output Format for Your Controller]]
- [[edgecam-cam-tips-ec-074|Code Wizard for Custom Post Processor Creation]]
- [[esprit-cam-tips-esp-072|Post Processor Customization with ESPRIT's Post Engine]]
- [[fusion360-cam-tips-ext-f360-175|Custom Post Processor Development in JavaScript]]
- [[gibbscam-cam-tips-gc-076|Post processor customization through Compost enables machine-specific G-code]]
