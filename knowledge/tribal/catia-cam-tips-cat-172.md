---
id: "cat-172"
title: "FBM User-Defined Feature Recognition for Custom Geometries"
source: "web:catia-docs"
confidence: 0.82
category: "cam_strategy"
tags: ["catia", "fbm", "user-defined-feature", "custom", "recognition"]
_source: "catia-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.950Z
---

# FBM User-Defined Feature Recognition for Custom Geometries

When standard FBM recognition misses company-specific features (custom keyway profiles, proprietary connector cavities), create 'User-Defined Features' (UDFs) for recognition. In the Feature Recognition Editor, define: (1) geometric signature (topology pattern: number of faces, adjacency relationships, angular ranges), (2) parameter extraction rules (width, depth, angle from the recognized geometry), (3) machining process template (operations, tools, speeds/feeds as functions of extracted parameters). Once defined, FBM recognizes these custom features automatically on all future parts, bringing automation to non-standard geometries unique to your product line.

**Category:** cam_strategy
**Confidence:** 0.82
**Source:** web:catia-docs
**Operations:** pocketing, profile_contouring

## Related
- [[catia-cam-tips-cat-068|User Defined Features Package Complex Machining Sequences]]
- [[catia-cam-tips-cat-169|Feature-Based Machining Automatic Process Assignment]]
- [[catia-cam-tips-cat-170|FBM Manufacturing Rules for Hole Tolerance-Based Process Selection]]
- [[catia-cam-tips-cat-171|FBM Group Machining for Pattern Feature Optimization]]
- [[catia-cam-tips-cat-173|FBM Interaction Detection for Feature Machining Order]]
