---
id: "cim-113"
title: "Kienzle Force Model for Feed Verification"
source: "web:cimatron-forum"
confidence: 0.82
category: "cam_strategy"
tags: ["kienzle", "cutting-force", "verification", "spindle-torque"]
_source: "cimatron-cam-tips.ts"
indexed_at: 2026-04-28T01:00:42.070Z
---

# Kienzle Force Model for Feed Verification

Verify cutting forces: Fc = kc1.1 × b × h^(1-mc) where kc1.1 = specific cutting force, b = DOC, h = chip thickness. P20 steel: kc1.1 = 1780 N/mm², mc = 0.26. Compare predicted force against machine spindle rating. If Fc > 50% of rated torque at operating RPM, reduce DOC or feed. Use Kienzle to validate every new Cimatron program before first article.

**Category:** cam_strategy
**Confidence:** 0.82
**Source:** web:cimatron-forum
**Operations:** optimization

## Related
- [[tebis-cam-tips-teb-141|Kienzle Force Model for Feed Rate Verification]]
- [[powermill-cam-tips-pm-091|Kienzle Force Model for Feed Verification]]
- [[sprutcam-cam-tips-spr-101|Kienzle Force Model for Feed Verification]]
- [[hypermill-cam-tips-ext-hm-153|Kienzle Force Model for Verification]]
- [[topsolid-cam-tips-ts-193|TopSolid Digital Twin — Cutting Force Validation Against Simulation]]
