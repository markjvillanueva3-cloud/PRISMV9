---
id: "mc-218"
title: "Custom feature templates extend FBM recognition to shop-specific non-standard features"
source: "web:community"
confidence: 83
category: "cam_strategy"
tags: ["mastercam", "fbm", "custom-template", "feature-library", "shop-standard", "automation"]
_source: "mastercam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:43.293Z
---

# Custom feature templates extend FBM recognition to shop-specific non-standard features

Standard FBM recognizes common prismatic features, but many shops have custom features: proprietary fastener recesses, non-standard O-ring grooves, custom keyway profiles, or specialized mounting patterns. In Mastercam, create custom feature templates by defining the feature geometry (profile, depth, tolerances) and assigning a machining sequence (specific tools, toolpaths, and parameters). When FBM encounters geometry matching a custom template, it automatically applies the predefined machining sequence. Building a library of 10–20 custom templates for your most common non-standard features transforms FBM from a basic auto-programmer into a shop-specific automation system. Document custom templates in a shared location so all programmers use the same definitions. Update templates when you optimize the machining strategy for a feature type — all future FBM operations inherit the improvement.

**Category:** cam_strategy
**Confidence:** 83
**Source:** web:community
**Operations:** automation, setup

## Related
- [[mastercam-cam-tips-mc-252|Mastercam 2025 Toolpath Hole Recognition automatically identifies and programs hole features from solids]]
- [[nx-cam-tips-nx-019|Custom Feature Definitions for FBM]]
- [[mastercam-cam-tips-mc-102|VBScript automation can regenerate toolpaths and post-process entire part families]]
- [[mastercam-cam-tips-mc-216|Operation mapping in FBM assigns machining strategies based on feature type and dimensions]]
- [[mastercam-cam-tips-mc-217|TechDB-style defaults in FBM store optimal parameters per material-tool-feature combination]]
