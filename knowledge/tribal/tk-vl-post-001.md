---
schema_version: 1.0.0
kind: tribal_tip
id: TK-VL-post-001
title: Post-processor debugging: VS Code double-click G-code → post section mapping
category: workflow
domain: video_learned
knowledge_type: tip
confidence: 85
source: video:4OWT-O4oN8E@30s
created_at: 2026-03-06
usage_count: 0
tags: ["post-processor", "VS-Code", "debugging", "Fusion-360", "CAMWorks", "UPG"]
material_groups: []
operation_types: []
content_hash: a61b19eb54f5b25f71ae4482fa4eefb62bd326bbd29d4f6310d335c26be27a39
mirror_ts: 2026-05-05T13:36:03.224Z
mirror_engine: TribalVaultPopulatorEngine
---

# Post-processor debugging: VS Code double-click G-code → post section mapping

**Category:** `workflow` · **Domain:** `video_learned`

**Confidence:** `85` · **Source:** `video:4OWT-O4oN8E@30s`

## Tip

When editing a CNC post processor, use VS Code with the Autodesk post-processor extension. Double-clicking a line of posted G-code highlights which section of the post processor generated it. This eliminates manual searching through 1000+ line post files. Key workflow: (1) Post your program from CAM, (2) Open both .cps post file and .nc output in VS Code, (3) Double-click any G-code line — VS Code jumps to the generating function. Works with Fusion 360 .cps (JavaScript-based) posts. For CAMWorks, use the EC Editor with the Universal Post Generator (UPG) — similar bidirectional linking between post source and output.

## Related tips

- [[tk-vl-post-004|CAMWorks UPG post customization: line numbering, safe start, coolant code locations]] _(category+tag:3)_
- [[bc-067|CAM Tree Manager for Operation Organization]] _(category)_
- [[bc-068|Wizard-Driven Programming Reduces Learning Curve]] _(category)_
- [[bc-069|Operation Templates for Standardized Programming]] _(category)_
- [[bc-071|Automated Machine Setup from Solid Model]] _(category)_

## Tags

#post-processor #vs-code #debugging #fusion-360 #camworks #upg
