---
id: "f360-084"
title: "Tool Change Optimization in Post Processor"
source: "web:autodesk-community"
confidence: 86
category: "post_processor"
tags: ["fusion360", "tool-change", "post-optimization", "atc", "cycle-time"]
_source: "fusion360-cam-tips-ext.ts"
indexed_at: 2026-04-28T01:00:42.693Z
---

# Tool Change Optimization in Post Processor

Customize the onToolChange() function in your post processor to match your machine's tool change sequence. Key optimizations: skip redundant T-code calls when the same tool is used in consecutive operations, output tool preload commands (e.g., T02 on the line before M6 T02), and consolidate coolant off/on codes when the coolant type does not change between operations. These changes can save 3-8 seconds per tool change on machines with carousel-type ATCs.

**Category:** post_processor
**Confidence:** 86
**Source:** web:autodesk-community
**Operations:** post_processing

## Related
- [[fusion360-cam-tips-ext-f360-047|Morphing Between Depths for Smooth Adaptive Transitions]]
- [[fusion360-cam-tips-ext-f360-087|Force-Based Feed Optimization to Reduce Cycle Time]]
- [[fusion360-cam-tips-ext-f360-109|Stock-Aware Linking Minimizes Air Cutting]]
- [[fusion360-cam-tips-ext-f360-110|Minimum Retract Height to Reduce Rapid Travel]]
- [[fusion360-cam-tips-ext-f360-140|Barrel Cutter Selection for Large Stepovers]]
