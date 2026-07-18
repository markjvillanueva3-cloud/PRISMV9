---
name: tribal-bc-071
category: code-tribal
subdomain: workflow
domain: tribal-knowledge
tags: ["auto-setup", "stock-from-solid", "model-driven", "near-net"]
confidence: 88
source: "web:bobcad-auto-setup"
promoted_from: knowledge/tribal/bobcad-cam-tips-bc-071.md
promoted_at: 2026-06-09T22:31:15.950Z
---

# Automated Machine Setup from Solid Model

BobCAD creates machine setups directly from solid models: the stock is derived from the model bounding box (with optional offsets), the part zero is set from the model coordinate system, and the fixture definition can be imported from assembly files. V36+ 'Stock from Solid' creates near-net stock shapes for castings and forgings by offsetting all part surfaces by a uniform stock allowance. This dramatically improves rest machining accuracy compared to rectangular stock.

**Category:** workflow
**Confidence:** 88
**Source:** web:bobcad-auto-setup
**Operations:** setup

## Related
- [[fusion360-cam-tips-ext-f360-178|Generative Design with Combined Additive and Subtractive]]
- [[gibbscam-cam-tips-gc-100|Air-cut detection eliminates toolpath segments that cut no material]]
