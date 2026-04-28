---
id: "cat-170"
title: "FBM Manufacturing Rules for Hole Tolerance-Based Process Selection"
source: "web:catia-docs"
confidence: 0.86
category: "cam_strategy"
tags: ["catia", "fbm", "tolerance", "process-selection", "gdt"]
_source: "catia-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.949Z
---

# FBM Manufacturing Rules for Hole Tolerance-Based Process Selection

CATIA FBM uses tolerance annotations (from GD&T or dimension tolerances on the design model) to select appropriate machining processes. A hole with IT7 tolerance (H7) triggers: drill undersized → ream to final size. A hole with IT9 tolerance triggers: drill to final size (no ream). A hole with IT6 or tighter triggers: drill → bore → hone. Configure these rules in the Manufacturing Rules database with tolerance-range thresholds. This eliminates manual interpretation of drawing tolerances — the FBM system reads the 3D annotations directly from the CATIA Functional Tolerancing and Annotation (FTA) specification.

**Category:** cam_strategy
**Confidence:** 0.86
**Source:** web:catia-docs
**Operations:** drilling

## Related
- [[catia-cam-tips-cat-011|Wall Finishing With Spring Pass for Tolerance Control]]
- [[catia-cam-tips-cat-056|Gouge Detection Sensitivity Settings for Different Operations]]
- [[catia-cam-tips-cat-102|Machining Tolerance vs Surface Tolerance Distinction]]
- [[catia-cam-tips-cat-169|Feature-Based Machining Automatic Process Assignment]]
- [[catia-cam-tips-cat-171|FBM Group Machining for Pattern Feature Optimization]]
