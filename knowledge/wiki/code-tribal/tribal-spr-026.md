---
name: tribal-spr-026
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["tolerance", "step-over", "optimization", "scallop"]
confidence: 0
source: "web:sprutcam-docs"
promoted_from: knowledge/tribal/sprutcam-cam-tips-spr-026.md
promoted_at: 2026-06-09T22:31:16.625Z
---

# Tolerance and Step-Over Optimization

Balance tolerance, step-over, and cycle time: for roughing, set tolerance to 0.05mm (visual quality doesn't matter, speed does). For finishing, set tolerance to 0.005-0.01mm. Step-over affects scallop height: h = R - √(R² - (s/2)²) where R=tool radius, s=step-over. For Ra 1.6μm target with 6mm ball: step-over ≈ 0.35mm. SprutCAM's 'Quality' slider adjusts both tolerance and step-over simultaneously.

**Category:** cam_strategy
**Confidence:** 0.88
**Source:** web:sprutcam-docs
**Operations:** finishing

## Related
- [[powermill-cam-tips-pm-065|Tolerance Optimization for Roughing vs Finishing]]
- [[wedm-knowledge-tips-jm-die-020|JM Die program optimization target — maximize productivity while maintaining Ra and tolerance]]
- [[bobcad-cam-tips-bc-161|BobCAD Barrel Cutter Support for Large-Step-Over Finishing]]
- [[camworks-cam-tips-cw-111|Scallop Height Control — Calculate Step-Over for Target Ra]]
- [[cimatron-cam-tips-cim-055|Barrel Cutter Strategies for Large Step-Over Finishing]]
