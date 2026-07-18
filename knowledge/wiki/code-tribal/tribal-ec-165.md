---
name: tribal-ec-165
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["composite", "stack-drilling", "multi-material", "parameter-switching"]
confidence: 0
source: "web:edgecam-docs"
promoted_from: knowledge/tribal/edgecam-cam-tips-ec-165.md
promoted_at: 2026-06-09T22:31:16.200Z
---

# Composite Stack Drilling with Stepped Parameters

When drilling composite-metal stacks (CFRP/titanium, CFRP/aluminum), program stepped parameters that change at each material interface. In Edgecam, use the multi-material drilling cycle with Z-depth triggers: CFRP layer at 6000 RPM / 0.05 mm/rev, titanium layer at 800 RPM / 0.04 mm/rev. Enable automatic parameter switching by defining material boundaries as Z-depth values. Use PCD or diamond-coated drills rated for both materials.

**Category:** cam_strategy
**Confidence:** 0.82
**Source:** web:edgecam-docs
**Operations:** drilling

## Related
- [[gibbscam-cam-tips-gc-185|GibbsCAM composite stack drilling with step-tool geometry manages multi-material exits]]
- [[surfcam-cam-tips-sc2-173|SURFCAM Composite Stack Drilling for CFRP/Titanium Laminates]]
- [[bobcad-cam-tips-bc-189|BobCAD CFRP/Metal Stack Drilling Parameters]]
- [[catia-cam-tips-cat-120|Stack Drilling Composites with Metallic Backing Plates]]
- [[mastercam-cam-tips-mc-288|Composite stack drilling in Mastercam uses peck cycles with controlled thrust force to prevent delamination]]
