---
id: "sc2-131"
title: "SURFCAM Traditional NCX Post Format vs 2023 Integrated Posts"
source: "web:surfcam-docs"
confidence: 0.86
category: "post_processing"
tags: ["ncx-post", "gpd", "hexagon-post", "migration", "canned-cycles"]
_source: "surfcam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.151Z
---

# SURFCAM Traditional NCX Post Format vs 2023 Integrated Posts

SURFCAM Traditional uses NCX-format post processors that are customized via a text editor and GPD (General Post Definition) files. SURFCAM 2023 integrates Hexagon's universal post engine, supporting more modern constructs like canned cycle grouping and multi-channel output. When upgrading, test the new post against your Traditional NCX output line-by-line for 10 critical programs before committing to the switch. Pay special attention to canned cycle formatting, tool change sequences, and coolant codes.

**Category:** post_processing
**Confidence:** 0.86
**Source:** web:surfcam-docs
**Operations:** drilling, roughing, finishing

## Related
- [[catia-cam-tips-cat-121|V5 Manufacturing Hub vs 3DEXPERIENCE NC Machine Builder Migration]]
- [[catia-cam-tips-cat-123|V5 CATTool vs 3DEXPERIENCE Tool Resource Management]]
- [[catia-cam-tips-cat-125|V5 Macro Migration to 3DEXPERIENCE EKL Automation]]
- [[catia-cam-tips-cat-126|CATProcess to 3DEXPERIENCE Manufacturing Item Conversion]]
- [[controller-knowledge-tips-ctrl-085|iTNC 530 limitations vs TNC 640 — migration awareness]]
