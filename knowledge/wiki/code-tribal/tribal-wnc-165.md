---
name: tribal-wnc-165
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["hardened-steel", "finishing", "hrc", "mold-die", "hsm"]
confidence: 92
source: "web:worknc-docs"
promoted_from: knowledge/tribal/worknc-cam-tips-wnc-165.md
promoted_at: 2026-05-26T16:07:21.696Z
---

# Hardened Steel Finishing — Direct Milling at 55-65 HRC

WorkNC excels at programming hardened steel finishing (55-65 HRC) for mold and die work. Key parameters: Vc 150-250 m/min (AlTiN or AlCrN coated carbide), fz 0.03-0.08mm/tooth, ap 0.1-0.3mm (finishing), stepover 5-10% of ball-nose diameter. Use constant-curvature toolpaths (WorkNC's HSM mode) to maintain high feed rates — deceleration at sharp toolpath corners generates heat that damages the hardened surface. Coolant strategy: air blast or MQL only — thermal shock from flood coolant causes surface micro-cracks in hardened steel that propagate during use.

**Category:** cam_strategy
**Confidence:** 92
**Source:** web:worknc-docs
**Operations:** finishing

## Related
- [[bobcad-cam-tips-bc-193|BobCAD Dynamic Machining for Hardened Steel 48-62 HRC]]
- [[cimatron-cam-tips-cim-076|Hardened Steel Finishing Parameters for Mold and Die]]
- [[edgecam-cam-tips-ec-106|Hardened Steel HSM Approach (>45 HRC)]]
- [[esprit-cam-tips-esp-112|Hardened Steel Strategies (>45 HRC)]]
- [[gibbscam-cam-tips-gc-186|GibbsCAM hardened steel HSM uses light DOC with high speed to stay below thermal threshold]]
