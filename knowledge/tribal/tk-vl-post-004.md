---
schema_version: 1.0.0
kind: tribal_tip
id: TK-VL-post-004
title: CAMWorks UPG post customization: line numbering, safe start, coolant code locations
category: workflow
domain: video_learned
knowledge_type: anti_pattern
confidence: 85
source: video:vXe0s5IbpC4@300s
created_at: 2026-03-06
usage_count: 0
tags: ["CAMWorks", "UPG", "post-processor", "line-numbering", "safe-start", "coolant", "EC-Editor"]
material_groups: []
operation_types: []
content_hash: 283e9e7f1a1f9b9fee7ab6b406bcaee05f696732635d76961a0a27b89651ff44
mirror_ts: 2026-05-05T13:36:03.226Z
mirror_engine: TribalVaultPopulatorEngine
---

# CAMWorks UPG post customization: line numbering, safe start, coolant code locations

**Category:** `workflow` · **Domain:** `video_learned`

**Confidence:** `85` · **Source:** `video:vXe0s5IbpC4@300s`

## Tip

CAMWorks Universal Post Generator (UPG) post customization key points: (1) Line numbering: controlled by 'sequence_number' variable — set increment in post header, toggle with boolean flag. Use N-word format N10, N20... for production (operators can reference specific lines), N1, N2... only for debugging. (2) Safe start block: defined in 'start_of_program' section — ALWAYS include G90 (absolute), G80 (cancel canned cycle), G40 (cancel cutter comp), G49 (cancel TLC), G17/G18 (plane select). Order matters — G40 before G49 prevents comp-active crash. (3) Coolant codes: M08 (flood) and M07 (mist) are in 'start_of_tool' section after spindle start. Put M09 (off) in 'end_of_tool' BEFORE spindle stop. (4) The EC Editor compiles .pst → .dll — always recompile after changes. (5) Post variables use colon-delimited names (:tool_number, :spindle_speed) — don't confuse with G-code addresses.

## Related tips

- [[tk-vl-post-001|Post-processor debugging: VS Code double-click G-code → post section mapping]] _(category+tag:3)_
- [[bc-067|CAM Tree Manager for Operation Organization]] _(category)_
- [[bc-068|Wizard-Driven Programming Reduces Learning Curve]] _(category)_
- [[bc-069|Operation Templates for Standardized Programming]] _(category)_
- [[bc-071|Automated Machine Setup from Solid Model]] _(category)_

## Tags

#camworks #upg #post-processor #line-numbering #safe-start #coolant #ec-editor
