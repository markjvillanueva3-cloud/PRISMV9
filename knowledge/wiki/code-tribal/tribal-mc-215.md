---
name: tribal-mc-215
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["mastercam", "fbm-mill", "feature-recognition", "prismatic", "auto-programming", "pocket"]
confidence: 85
source: "web:mastercam-docs"
promoted_from: knowledge/tribal/mastercam-cam-tips-mc-215.md
promoted_at: 2026-06-09T22:31:16.448Z
---

# FBM Mill detects 2.5D pocket and boss features and auto-generates milling toolpaths

FBM Mill analyzes a solid model for prismatic features — pockets, bosses, steps, slots, and open areas — that can be machined with 2.5D toolpaths. For each detected feature, FBM creates roughing and finishing operations with appropriate tools, speeds, feeds, and step-overs based on the feature geometry and the active Machine Definition's tool library. The accuracy of FBM Mill depends on clean solid geometry: features must have consistent wall draft (0° for vertical walls), clearly defined floor surfaces, and well-connected boundary edges. Complex freeform features are ignored by FBM Mill (they require manual 3D surface toolpath programming). FBM Mill is most effective for prismatic parts with many pockets and bosses — fixture plates, manifold blocks, and housings — where it can reduce programming time from hours to minutes by auto-generating 50–200 operations in one pass.

**Category:** cam_strategy
**Confidence:** 85
**Source:** web:mastercam-docs
**Operations:** roughing, finishing, automation

## Related
- [[mastercam-cam-tips-mc-214|FBM Drill automatically recognizes and programs all hole features from a solid model]]
- [[mastercam-cam-tips-mc-053|3+2 Automatic Roughing outperforms OptiRough on steep-walled prismatic parts]]
- [[mastercam-cam-tips-mc-107|FBM Drill automatically identifies and programs all hole features from solid model]]
- [[wedm-knowledge-tips-wedm-mcam-001-2|Wire overburn decreases progressively per pass — 0.035→0.02→0.01→0]]
- [[wedm-knowledge-tips-wedm-mcam-003-2|Lead-in/lead-out with arcs reduces burrs — Line+Arc in, Arc+Line out]]
