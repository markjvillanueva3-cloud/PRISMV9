---
id: "spr-101"
title: "Kienzle Force Model for Feed Verification"
source: "web:sprutcam-forum"
confidence: 0.82
category: "cam_strategy"
tags: ["kienzle", "cutting-force", "spindle", "verification"]
_source: "sprutcam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:43.956Z
---

# Kienzle Force Model for Feed Verification

Verify forces: Fc = kc1.1 × b × h^(1-mc). P20: kc1.1=1780, mc=0.26. Compare against spindle rating. If Fc > 50% rated torque at RPM, reduce DOC or feed. Validate every new SprutCAM program before first article. Kienzle is the most reliable force prediction for standard turning and milling operations.

**Category:** cam_strategy
**Confidence:** 0.82
**Source:** web:sprutcam-forum
**Operations:** optimization

## Related
- [[powermill-cam-tips-pm-091|Kienzle Force Model for Feed Verification]]
- [[cimatron-cam-tips-cim-113|Kienzle Force Model for Feed Verification]]
- [[tebis-cam-tips-teb-141|Kienzle Force Model for Feed Rate Verification]]
- [[hypermill-cam-tips-ext-hm-153|Kienzle Force Model for Verification]]
- [[topsolid-cam-tips-ts-193|TopSolid Digital Twin — Cutting Force Validation Against Simulation]]
