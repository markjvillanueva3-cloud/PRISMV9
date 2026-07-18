---
name: tribal-cim-074
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["rest-machining", "progressive", "multi-reference", "efficiency"]
confidence: 0
source: "web:cimatron-docs"
promoted_from: knowledge/tribal/cimatron-cam-tips-cim-074.md
promoted_at: 2026-06-09T22:31:16.100Z
---

# Progressive Rest Machining Strategy

Complex mold cavities: 25mm rough → 12mm rest-rough → 6mm semi-finish → 3mm finish → 1mm pencil. Each operation references ALL previous tools for accurate rest detection. Set 'Minimum Material' to 0.1mm to skip insignificant remnants. This eliminates wasted cuts on thin slivers and saves 15-25% total cycle time vs single-reference rest machining.

**Category:** cam_strategy
**Confidence:** 0.88
**Source:** web:cimatron-docs
**Operations:** roughing

## Related
- [[solidcam-cam-tips-sc-176-2|Progressive Rest Machining]]
- [[tebis-cam-tips-teb-073|Progressive Rest Machining with Multiple Reference Tools]]
- [[hypermill-cam-tips-ext-hm-144|Progressive Rest Machining]]
- [[sprutcam-cam-tips-spr-124|Progressive Rest Machining]]
- [[esprit-cam-tips-esp-106|Air Cut Reduction with In-Process Stock Tracking]]
