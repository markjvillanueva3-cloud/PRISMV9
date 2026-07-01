---
name: tribal-bc-107
category: code-tribal
subdomain: optimization
domain: tribal-knowledge
tags: ["acceleration", "smoothing", "hsm", "corner-arcs", "deceleration"]
confidence: 88
source: "web:bobcad-acceleration"
promoted_from: knowledge/tribal/bobcad-cam-tips-bc-107.md
promoted_at: 2026-06-09T22:31:15.959Z
---

# Acceleration-Aware Toolpath Smoothing for HSM

BobCAD toolpath smoothing accounts for machine acceleration limits. Sharp corners force axes to decelerate, execute, and re-accelerate — actual feed drops well below programmed rate. BobCAD smooths corners with small arcs that maintain higher machine speeds. Set smoothing tolerance to 50% of surface tolerance. For HSM (15,000+ RPM), enable maximum smoothing — any hesitation causes heat buildup at the cut zone. V37's corner smoothing specifically targets this issue.

**Category:** optimization
**Confidence:** 88
**Source:** web:bobcad-acceleration
**Operations:** finishing, 3d_milling

## Related
- [[surfcam-cam-tips-sc2-090|Acceleration Control for High-Speed Machining]]
- [[edgecam-cam-tips-ec-095|Acceleration Control for High-Speed Machining]]
- [[esprit-cam-tips-esp-107|Acceleration Control for High-Speed Machining]]
- [[gibbscam-cam-tips-gc-103|Acceleration-aware toolpath generation matches machine dynamics for actual speed]]
- [[topsolid-cam-tips-ts-107|Machine Acceleration Limits Prevent Jerky Motion]]
