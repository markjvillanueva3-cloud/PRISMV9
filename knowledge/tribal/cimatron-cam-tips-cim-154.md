---
id: "cim-154"
title: "Pocket Machining with Island Detection"
source: "web:cimatron-docs"
confidence: 0.87
category: "cam_strategy"
tags: ["pocket", "island-detection", "progressive-level", "efficiency"]
_source: "cimatron-cam-tips.ts"
indexed_at: 2026-04-28T01:00:42.103Z
---

# Pocket Machining with Island Detection

Cimatron detects islands (bosses) within pockets automatically. Set island offset = finish stock. For multiple nested pockets, progressive level cutting machines all pockets per Z-level before stepping down. Prevents excessive rapids between disconnected regions. Saves 15-25% cycle time. Review island detection results — occasionally thin ribs are missed or spurious islands detected.

**Category:** cam_strategy
**Confidence:** 0.87
**Source:** web:cimatron-docs
**Operations:** roughing

## Related
- [[tebis-cam-tips-teb-140|Pocket Machining with Automatic Island Detection]]
- [[cimatron-cam-tips-cim-170|Pocket with Progressive Level Cutting]]
- [[tebis-cam-tips-teb-185|Pocket Machining with Progressive Level Cutting]]
- [[sprutcam-cam-tips-spr-067|Pocket Machining with Island Detection]]
- [[bobcad-cam-tips-bc-020|Island Machining with Automatic Detection and Multi-Level]]
