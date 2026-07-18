---
name: tribal-cat-171
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["catia", "fbm", "group-machining", "pattern", "optimization"]
confidence: 0
source: "web:catia-docs"
promoted_from: knowledge/tribal/catia-cam-tips-cat-171.md
promoted_at: 2026-06-09T22:31:16.071Z
---

# FBM Group Machining for Pattern Feature Optimization

When FBM recognizes multiple instances of the same feature (bolt hole patterns, repeated pockets), it creates a 'Feature Group' and generates a single optimized machining operation for the entire pattern. CATIA optimizes the tool path sequence to minimize rapid traverse distance between features using a nearest-neighbor or shortest-path algorithm. Override the automatic sequencing by specifying 'Custom Order' if the clamping arrangement requires machining features in a specific sequence (e.g., opposite corners first to distribute clamping forces evenly). FBM groups reduce programming time by 60-80% on parts with dozens of similar features.

**Category:** cam_strategy
**Confidence:** 0.85
**Source:** web:catia-docs
**Operations:** drilling, pocketing

## Related
- [[catia-cam-tips-cat-074|Sub-Program Generation for Repeated Geometry Patterns]]
- [[catia-cam-tips-cat-047|Stock-Aware Roughing Uses In-Process Stock Model]]
- [[catia-cam-tips-cat-066|PowerCopy Machining Patterns for Repeated Feature Arrays]]
- [[catia-cam-tips-cat-166|Machine Process Simulation Cycle Time Analysis]]
- [[catia-cam-tips-cat-169|Feature-Based Machining Automatic Process Assignment]]
