---
id: "ec-144"
title: "Code Wizard Variable System for Machine-Specific Output"
source: "web:edgecam-docs"
confidence: 0.85
category: "post_processing"
tags: ["code-wizard", "variables", "conditional", "customization"]
_source: "edgecam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:42.379Z
---

# Code Wizard Variable System for Machine-Specific Output

Code Wizard exposes 200+ system variables for post customization. Key variables: CUR_TOOL (current tool number), NEXT_TOOL (next tool for pre-staging), SPINDLE_SPEED, FEED_RATE, X/Y/Z_POS (current position), WORK_OFFSET, COOLANT_TYPE. Use conditional blocks: IF COOLANT_TYPE = 'THROUGH' THEN output M88 ELSE output M8. Create user-defined variables for shop-specific needs like pallet ID or operator message codes.

**Category:** post_processing
**Confidence:** 0.85
**Source:** web:edgecam-docs
**Operations:** all

## Related
- [[edgecam-cam-tips-ec-074|Code Wizard for Custom Post Processor Creation]]
- [[esprit-cam-tips-esp-075|Variable Output and Conditional Logic in Posts]]
- [[gibbscam-cam-tips-gc-166|GibbsCAM post processor variables enable machine-specific G-code dialect output]]
- [[edgecam-cam-tips-ec-143|Code Wizard Event-Driven Post Processor Architecture]]
- [[edgecam-cam-tips-ec-145|Code Wizard Multi-Channel Output for Mill-Turn]]
