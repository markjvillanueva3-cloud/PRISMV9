---
name: tribal-f360-186
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["fusion360", "mql", "minimum-quantity-lubrication", "post-processor", "coolant"]
confidence: 0
source: "web:fusion360-docs"
promoted_from: knowledge/tribal/fusion360-cam-tips-ext-f360-186.md
promoted_at: 2026-06-09T22:31:16.297Z
---

# MQL Configuration in Fusion Post Processor

Configure Minimum Quantity Lubrication (MQL) output in the Fusion post processor by mapping the 'Mist' coolant mode to your machine's MQL activation code (typically M7 or a custom M-code). Set the MQL flow rate in the machine parameters: 5-50 ml/hour for steel milling, 20-100 ml/hour for aluminum (aluminum needs more lubrication to prevent built-up edge). In the operation's Coolant tab, select 'Mist' for MQL operations. For through-tool MQL, verify your spindle is equipped with an MQL-compatible rotary union and the tool has internal coolant channels. External MQL nozzles should be positioned 30-45 degrees from the cutting direction, aimed at the chip formation zone.

**Category:** cam_strategy
**Confidence:** 0.85
**Source:** web:fusion360-docs
**Operations:** general

## Related
- [[fusion360-cam-tips-ext-f360-081|Machine Configuration Ties Post to Kinematic Model]]
- [[fusion360-cam-tips-ext-f360-166|NC Program Documentation with Tool Table]]
- [[fusion360-cam-tips-ext-f360-175|Custom Post Processor Development in JavaScript]]
- [[fusion360-cam-tips-ext-f360-187|Coolant Strategy Selection by Operation Type]]
- [[fusion360-cam-tips-ext-f360-190|Coolant Transition Management Between Operations]]
