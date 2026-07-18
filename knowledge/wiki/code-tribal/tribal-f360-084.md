---
name: tribal-f360-084
category: code-tribal
subdomain: post_processor
domain: tribal-knowledge
tags: ["fusion360", "tool-change", "post-optimization", "atc", "cycle-time"]
confidence: 86
source: "web:autodesk-community"
promoted_from: knowledge/tribal/fusion360-cam-tips-ext-f360-084.md
promoted_at: 2026-06-09T22:31:16.272Z
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
