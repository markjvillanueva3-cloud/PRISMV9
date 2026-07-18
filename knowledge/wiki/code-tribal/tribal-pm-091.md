---
name: tribal-pm-091
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["kienzle", "cutting-force", "verification", "spindle"]
confidence: 0
source: "web:powermill-forum"
promoted_from: knowledge/tribal/powermill-cam-tips-pm-091.md
promoted_at: 2026-06-09T22:31:16.555Z
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
