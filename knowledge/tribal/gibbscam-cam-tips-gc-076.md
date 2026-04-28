---
id: "gc-076"
title: "Post processor customization through Compost enables machine-specific G-code"
source: "web:gibbscam-docs"
confidence: 87
category: "cam_strategy"
tags: ["gibbscam", "post-processor", "compost", "customization", "g-code"]
_source: "gibbscam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:42.891Z
---

# Post processor customization through Compost enables machine-specific G-code

GibbsCAM's Compost post processor engine allows customizing G-code output for any CNC control. Access post variables through the Compost API to control block format, addressing modes, axis naming, and code output order. Common customizations include: changing from absolute (G90) to incremental (G91) for specific axes, adding tool length compensation (G43/G44) at specific points, and inserting custom header/footer blocks. Always use the latest Compost version matching your GibbsCAM release to ensure new operation types are supported. Back up the original post before making changes.

**Category:** cam_strategy
**Confidence:** 87
**Source:** web:gibbscam-docs

## Related
- [[gibbscam-cam-tips-gc-166|GibbsCAM post processor variables enable machine-specific G-code dialect output]]
- [[camworks-cam-tips-cw-085|Post Customization — Modify Output Format for Your Controller]]
- [[edgecam-cam-tips-ec-074|Code Wizard for Custom Post Processor Creation]]
- [[esprit-cam-tips-esp-072|Post Processor Customization with ESPRIT's Post Engine]]
- [[fusion360-cam-tips-ext-f360-175|Custom Post Processor Development in JavaScript]]
