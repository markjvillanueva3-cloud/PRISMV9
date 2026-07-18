---
name: tribal-nx-064
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["siemens-nx", "multi-blade", "channel-width", "blisk", "5-axis-roughing"]
confidence: 86
source: "web:siemens-nx-docs"
promoted_from: knowledge/tribal/nx-cam-tips-ext-nx-064.md
promoted_at: 2026-06-09T22:31:16.478Z
---

# Multi-Blade Roughing with Channel Width Analysis

Before programming NX Multi-Blade roughing on blisks, use the Channel Width Analysis tool to determine the minimum channel width at each radial section. Set the roughing tool diameter to no more than 80% of the narrowest channel width to ensure collision-free access. NX displays a color-mapped channel width plot that highlights constriction points where tool access is limited. Ignoring this analysis leads to tool shanks colliding with adjacent blade tips.

**Category:** cam_strategy
**Confidence:** 86
**Source:** web:siemens-nx-docs
**Operations:** roughing, 5-axis

## Related
- [[nx-cam-tips-ext-nx-075|Multi-Blade Operations with Rotational Pattern]]
- [[topsolid-cam-tips-ts-037|Impeller Machining with Dedicated Multi-Blade Operations]]
- [[nx-cam-tips-nx-040|Turbomachinery Multi-Blade Roughing Between Blades]]
- [[nx-cam-tips-ext-nx-043|VBM Level-Based Roughing with Variable Cut Depths]]
- [[nx-cam-tips-ext-nx-044|VBM IPW Visualization with Section Analysis]]
