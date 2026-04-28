---
id: "mc-174"
title: "Feature size limits in micro machining are constrained by tool deflection, not geometry"
source: "web:community"
confidence: 85
category: "cam_strategy"
tags: ["mastercam", "micro-machining", "deflection", "feature-size", "spring-pass", "stick-out"]
_source: "mastercam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:43.246Z
---

# Feature size limits in micro machining are constrained by tool deflection, not geometry

The minimum feature size achievable by micro milling is limited by tool deflection, not the tool diameter. A 0.2 mm end mill with 3× D stick-out deflects approximately 0.01 mm under normal cutting loads — this deflection equals 5% of the tool diameter and directly reduces feature dimensional accuracy. In Mastercam, program micro features with: (1) maximum 2× D axial depth per pass (never full-slot at full depth); (2) radial depth of cut limited to 10–20% of diameter; (3) multiple spring passes (2–3 passes at final depth with zero additional stock) to clean up deflection-induced oversize. Calculate expected deflection using cantilever beam formula: δ = (F × L³)/(3 × E × I), where F = cutting force, L = stick-out, E = carbide modulus (600 GPa), I = moment of inertia. If calculated deflection exceeds 2% of tolerance, reduce cutting forces or stick-out.

**Category:** cam_strategy
**Confidence:** 85
**Source:** web:community
**Operations:** finishing, micro

## Related
- [[mastercam-cam-tips-mc-175|Spring passes in micro finishing remove deflection-induced oversize material]]
- [[gibbscam-cam-tips-gc-193|GibbsCAM micro-machining tool deflection compensation adjusts toolpath for bendable tools]]
- [[mastercam-cam-tips-mc-145|Fine engraving toolpaths in mold work require spring-pass compensation and sharp V-tools]]
- [[mastercam-cam-tips-mc-148|Guide bushing proximity in Swiss machining limits unsupported material length for rigidity]]
- [[mastercam-cam-tips-mc-172|Small tool compensation in Mastercam must account for tool runout exceeding 10% of feature size]]
