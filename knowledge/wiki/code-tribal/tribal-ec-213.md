---
name: tribal-ec-213
category: code-tribal
subdomain: speeds_feeds
domain: tribal-knowledge
tags: ["feed-profiling", "curvature", "finishing", "chip-load"]
confidence: 0
source: "web:edgecam-docs"
promoted_from: knowledge/tribal/edgecam-cam-tips-ec-213.md
promoted_at: 2026-06-09T22:31:16.211Z
---

# Feed Rate Profiling Along Toolpath Curvature

Edgecam can vary feed rate along the toolpath based on local curvature. Enable 'curvature-based feed' in finishing operations to slow down in tight curves and speed up on straight sections. Set the minimum feed percentage (typically 40-60% of nominal) for the tightest radius. The algorithm uses: F_local = F_nominal × min(1.0, R_local / R_threshold) where R_threshold is the radius below which feed reduction begins (typically 2-5× tool radius). This maintains consistent chip load and surface finish quality across varying geometry.

**Category:** speeds_feeds
**Confidence:** 0.84
**Source:** web:edgecam-docs
**Operations:** finishing

## Related
- [[catia-cam-tips-cat-103|Point Distribution Density on High-Curvature Regions]]
- [[catia-cam-tips-cat-141|Surface Machining Scallop Height Control with Variable Stepover]]
- [[cimatron-cam-tips-cim-063|Geodesic Finishing for Uniform Coverage]]
- [[cimatron-cam-tips-cim-072|Constant Scallop Height Finishing]]
- [[cimatron-cam-tips-cim-101|Scallop Height Formula h = R - √(R² - (s/2)²)]]
