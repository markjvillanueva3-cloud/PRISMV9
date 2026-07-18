---
name: tribal-f360-114
category: code-tribal
subdomain: setup
domain: tribal-knowledge
tags: ["fusion360", "manufacturing-model", "fixtures", "setup", "collision-checking"]
confidence: 86
source: "web:fusion360-docs"
promoted_from: knowledge/tribal/fusion360-cam-tips-ext-f360-114.md
promoted_at: 2026-06-09T22:31:16.280Z
---

# Setup from Manufacturing Model with Fixture Bodies

When creating a Setup from a Manufacturing Model, include fixture bodies (vises, clamps, soft jaws) as Fixture components in the Setup dialog. This enables collision checking against fixtures during simulation and ensures the toolpath retracts clear of clamping hardware. Model your fixture bodies as simplified representations — you only need the outer envelope geometry for collision detection, not internal details. Store fixture models in the cloud team library for reuse across projects.

**Category:** setup
**Confidence:** 86
**Source:** web:fusion360-docs
**Operations:** general

## Related
- [[fusion360-cam-tips-ext-f360-102|Design-to-CAM Associativity Preserves Toolpaths]]
- [[fusion360-cam-tips-ext-f360-113|Manufacturing Models for Stable CAM References]]
- [[nx-cam-tips-nx-004|VBM Setup Context with Fixtures]]
- [[fusion360-cam-tips-ext-f360-040|Fine-Tune Optimal Load by Material Hardness]]
- [[fusion360-cam-tips-ext-f360-041|Multi-Depth Adaptive with Progressive Stepdown]]
