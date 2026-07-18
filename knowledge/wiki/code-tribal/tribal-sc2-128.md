---
name: tribal-sc2-128
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["air-cut-skip", "re-engagement", "rapid-to-feed", "deceleration"]
confidence: 87
source: "web:surfcam-aircut-skip"
promoted_from: knowledge/tribal/surfcam-cam-tips-sc2-128.md
promoted_at: 2026-06-09T22:31:16.687Z
---

# Air Cut Skip with Intelligent Re-Engagement

SURFCAM air cut skip detects portions of the toolpath where the tool traverses through already-cleared material and replaces them with rapid moves. The intelligent re-engagement feature transitions from rapid to feed rate 2mm before the tool contacts stock, allowing the machine to decelerate smoothly. Without this lead-in distance, the machine would hit material at rapid traverse speed, risking tool breakage. Set the re-engagement distance based on the machine's deceleration characteristics.

**Category:** cam_strategy
**Confidence:** 87
**Source:** web:surfcam-aircut-skip
**Operations:** roughing

## Related
- [[mastercam-cam-tips-mc-206|Feed plane position controls where the tool transitions from rapid to feed rate on approach]]
- [[bobcad-cam-tips-bc-107|Acceleration-Aware Toolpath Smoothing for HSM]]
- [[cimatron-cam-tips-cim-073|Surface Extension for Clean Tool Exit]]
- [[mastercam-cam-tips-mc-075|Corner rounding avoids deceleration spikes in high-speed finishing]]
- [[powermill-cam-tips-pm-200|Surface Extension Best Practices]]
