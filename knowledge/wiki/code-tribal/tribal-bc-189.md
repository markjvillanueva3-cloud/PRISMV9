---
name: tribal-bc-189
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["composite", "stack-drilling", "cfrp-metal", "multi-zone", "mql"]
confidence: 0
source: "web:bobcad-docs"
promoted_from: knowledge/tribal/bobcad-cam-tips-bc-189.md
promoted_at: 2026-06-09T22:31:15.978Z
---

# BobCAD CFRP/Metal Stack Drilling Parameters

CFRP/aluminum and CFRP/titanium stacks require different parameters for each material layer. In BobCAD, use a multi-zone drill cycle with material-specific settings. For CFRP/aluminum: 6000 RPM in CFRP, 3000 RPM in aluminum, 0.05 mm/rev in CFRP, 0.08 mm/rev in aluminum. For CFRP/titanium: 4000 RPM in CFRP, 800 RPM in titanium, 0.05 mm/rev in CFRP, 0.03 mm/rev in titanium. Use through-tool MQL to flush metal chips from the CFRP layer — trapped metal chips damage bearing surfaces. The multi-zone cycle outputs RPM/feed changes at the material interface Z-height.

**Category:** cam_strategy
**Confidence:** 0.85
**Source:** web:bobcad-docs
**Operations:** drilling

## Related
- [[catia-cam-tips-cat-120|Stack Drilling Composites with Metallic Backing Plates]]
- [[edgecam-cam-tips-ec-165|Composite Stack Drilling with Stepped Parameters]]
- [[gibbscam-cam-tips-gc-185|GibbsCAM composite stack drilling with step-tool geometry manages multi-material exits]]
- [[mastercam-cam-tips-mc-288|Composite stack drilling in Mastercam uses peck cycles with controlled thrust force to prevent delamination]]
- [[surfcam-cam-tips-sc2-173|SURFCAM Composite Stack Drilling for CFRP/Titanium Laminates]]
