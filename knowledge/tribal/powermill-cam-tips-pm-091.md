---
id: "pm-091"
title: "Kienzle Force Model for Feed Verification"
source: "web:powermill-forum"
confidence: 0.82
category: "cam_strategy"
tags: ["kienzle", "cutting-force", "verification", "spindle"]
_source: "powermill-cam-tips.ts"
indexed_at: 2026-04-28T01:00:43.597Z
---

# Kienzle Force Model for Feed Verification

Verify cutting forces: Fc = kc1.1 × b × h^(1-mc). P20 steel: kc1.1=1780, mc=0.26. Compare predicted force against machine spindle rating. If Fc > 50% of rated torque at RPM, reduce DOC or feed. Use Kienzle to validate every new PowerMill program before first article. This prevents spindle overload on aggressive roughing programs.

**Category:** cam_strategy
**Confidence:** 0.82
**Source:** web:powermill-forum
**Operations:** optimization

## Related
- [[sprutcam-cam-tips-spr-101|Kienzle Force Model for Feed Verification]]
- [[cimatron-cam-tips-cim-113|Kienzle Force Model for Feed Verification]]
- [[tebis-cam-tips-teb-141|Kienzle Force Model for Feed Rate Verification]]
- [[hypermill-cam-tips-ext-hm-153|Kienzle Force Model for Verification]]
- [[topsolid-cam-tips-ts-193|TopSolid Digital Twin — Cutting Force Validation Against Simulation]]
