---
id: "teb-141"
title: "Kienzle Force Model for Feed Rate Verification"
source: "web:tebis-forum"
confidence: 82
category: "optimization"
tags: ["kienzle", "cutting-force", "verification", "spindle-torque"]
_source: "tebis-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.328Z
---

# Kienzle Force Model for Feed Rate Verification

Verify Tebis cutting forces using Kienzle model: Fc = kc1.1 × b × h^(1-mc), where kc1.1 is specific cutting force (N/mm²), b = depth of cut, h = chip thickness. For P20 steel: kc1.1 = 1780 N/mm², mc = 0.26. Compare predicted force against machine spindle rating. If Fc exceeds 50% of rated spindle torque at the operating RPM, reduce DOC or feed.

**Category:** optimization
**Confidence:** 82
**Source:** web:tebis-forum
**Operations:** optimization

## Related
- [[cimatron-cam-tips-cim-113|Kienzle Force Model for Feed Verification]]
- [[powermill-cam-tips-pm-091|Kienzle Force Model for Feed Verification]]
- [[sprutcam-cam-tips-spr-101|Kienzle Force Model for Feed Verification]]
- [[hypermill-cam-tips-ext-hm-153|Kienzle Force Model for Verification]]
- [[topsolid-cam-tips-ts-193|TopSolid Digital Twin — Cutting Force Validation Against Simulation]]
