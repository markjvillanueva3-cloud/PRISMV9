---
id: "teb-073"
title: "Progressive Rest Machining with Multiple Reference Tools"
source: "web:tebis-docs"
confidence: 88
category: "roughing"
tags: ["rest-machining", "progressive", "multi-reference", "efficiency"]
_source: "tebis-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.276Z
---

# Progressive Rest Machining with Multiple Reference Tools

For complex mold cavities: 25mm rough → 12mm rest-rough → 6mm semi-finish → 3mm finish → 1mm pencil. Each Tebis operation references ALL previous tools for accurate rest detection. Set 'Minimum Material Thickness' to 0.1mm to skip insignificant stock remnants. This eliminates wasted cuts on thin slivers and can save 15-25% total cycle time compared to single-reference rest.

**Category:** roughing
**Confidence:** 88
**Source:** web:tebis-docs
**Operations:** roughing

## Related
- [[cimatron-cam-tips-cim-074|Progressive Rest Machining Strategy]]
- [[solidcam-cam-tips-sc-176-2|Progressive Rest Machining]]
- [[hypermill-cam-tips-ext-hm-144|Progressive Rest Machining]]
- [[sprutcam-cam-tips-spr-124|Progressive Rest Machining]]
- [[esprit-cam-tips-esp-106|Air Cut Reduction with In-Process Stock Tracking]]
