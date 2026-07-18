---
name: tribal-sc2-173
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["composite", "stack-drilling", "cfrp-titanium", "multi-material", "interface"]
confidence: 0
source: "web:surfcam-docs"
promoted_from: knowledge/tribal/surfcam-cam-tips-sc2-173.md
promoted_at: 2026-06-09T22:31:16.697Z
---

# SURFCAM Composite Stack Drilling for CFRP/Titanium Laminates

CFRP/titanium stacks require different cutting parameters for each material layer. In SURFCAM, program the drill cycle with material-specific feeds: 0.05 mm/rev in CFRP, 0.03 mm/rev in titanium, with an intermediate feed ramp at the material interface. Use through-tool coolant (MQL or cryogenic) to flush titanium chips from the CFRP layer — titanium chips embedded in CFRP cause bearing surface damage. Reduce RPM to 800-1500 for the titanium layer to prevent work hardening. SURFCAM's multi-material drill cycle handles these transitions automatically.

**Category:** cam_strategy
**Confidence:** 0.85
**Source:** web:surfcam-docs
**Operations:** drilling

## Related
- [[edgecam-cam-tips-ec-165|Composite Stack Drilling with Stepped Parameters]]
- [[gibbscam-cam-tips-gc-185|GibbsCAM composite stack drilling with step-tool geometry manages multi-material exits]]
- [[mastercam-cam-tips-mc-288|Composite stack drilling in Mastercam uses peck cycles with controlled thrust force to prevent delamination]]
- [[bobcad-cam-tips-bc-189|BobCAD CFRP/Metal Stack Drilling Parameters]]
- [[catia-cam-tips-cat-120|Stack Drilling Composites with Metallic Backing Plates]]
