---
name: tribal-cat-172
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["catia", "fbm", "user-defined-feature", "custom", "recognition"]
confidence: 0
source: "web:catia-docs"
promoted_from: knowledge/tribal/catia-cam-tips-cat-172.md
promoted_at: 2026-06-09T22:31:16.071Z
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
