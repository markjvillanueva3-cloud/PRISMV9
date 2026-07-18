---
name: tribal-sc2-090
category: code-tribal
subdomain: optimization
domain: tribal-knowledge
tags: ["acceleration", "hsm", "corner-smoothing", "deceleration", "arcs"]
confidence: 89
source: "web:surfcam-acceleration"
promoted_from: knowledge/tribal/surfcam-cam-tips-sc2-090.md
promoted_at: 2026-06-09T22:31:16.679Z
---

# Acceleration Control for High-Speed Machining

SURFCAM toolpath smoothing accounts for the machine's acceleration limits. Sharp corners in the toolpath force the machine axes to decelerate, execute the corner, and re-accelerate — the actual feed rate drops well below the programmed rate. SURFCAM smooths corners with small arcs that allow the machine to maintain higher speeds. Set the smoothing tolerance to 50% of the surface tolerance to stay within specification while maximizing machine speed through corners.

**Category:** optimization
**Confidence:** 89
**Source:** web:surfcam-acceleration
**Operations:** finishing, 3d_milling

## Related
- [[bobcad-cam-tips-bc-107|Acceleration-Aware Toolpath Smoothing for HSM]]
- [[edgecam-cam-tips-ec-095|Acceleration Control for High-Speed Machining]]
- [[esprit-cam-tips-esp-107|Acceleration Control for High-Speed Machining]]
- [[gibbscam-cam-tips-gc-103|Acceleration-aware toolpath generation matches machine dynamics for actual speed]]
- [[topsolid-cam-tips-ts-107|Machine Acceleration Limits Prevent Jerky Motion]]
