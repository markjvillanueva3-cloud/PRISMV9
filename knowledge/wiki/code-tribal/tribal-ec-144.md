---
name: tribal-ec-144
category: code-tribal
subdomain: post_processing
domain: tribal-knowledge
tags: ["code-wizard", "variables", "conditional", "customization"]
confidence: 0
source: "web:edgecam-docs"
promoted_from: knowledge/tribal/edgecam-cam-tips-ec-144.md
promoted_at: 2026-06-09T22:31:16.195Z
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
