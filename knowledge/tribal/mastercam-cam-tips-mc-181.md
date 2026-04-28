---
id: "mc-181"
title: "Minimum cutter diameter for rest machining determines the smallest accessible feature"
source: "web:community"
confidence: 85
category: "cam_strategy"
tags: ["mastercam", "rest-machining", "minimum-cutter", "tool-progression", "previous-tool", "feature-access"]
_source: "mastercam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:43.251Z
---

# Minimum cutter diameter for rest machining determines the smallest accessible feature

When setting up rest machining in Mastercam, the Previous Tool Diameter parameter (or the stock model from the prior operation) determines what material remains. If you enter the previous tool diameter manually instead of using a stock model, Mastercam assumes a theoretical offset equal to the previous tool radius from all surfaces. This is less accurate than a stock model but faster to set up. Set the Previous Tool Diameter to the actual tool diameter used (not nominal), and include the holder/shank diameter if the holder limited access in deep features. For rest roughing sequences, plan the tool diameter progression in 50–60% steps: if the first roughing tool is 20 mm, the second should be 10–12 mm, and the third 5–6 mm. This progression ensures each tool removes substantial material and avoids situations where the rest tool faces a full-width slot cut.

**Category:** cam_strategy
**Confidence:** 85
**Source:** web:community
**Operations:** roughing, semi_finishing

## Related
- [[mastercam-cam-tips-mc-052|Rest roughing depth calculation must account for previous tool corner radius]]
- [[mastercam-cam-tips-mc-178|Stock model generation from previous operations provides accurate rest material boundaries]]
- [[mastercam-cam-tips-mc-179|Rest machining from multiple operations combines stock models for comprehensive material removal]]
- [[mastercam-cam-tips-mc-182|Material boundary auto-detection in rest machining eliminates manual containment definition]]
- [[mastercam-cam-tips-mc-210|Air cut minimization uses stock-aware linking to skip regions with no material]]
