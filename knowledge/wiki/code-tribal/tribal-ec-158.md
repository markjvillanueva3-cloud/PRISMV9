---
name: tribal-ec-158
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["gun-drilling", "deep-hole", "pilot-hole", "coolant-pressure"]
confidence: 0
source: "web:edgecam-docs"
promoted_from: knowledge/tribal/edgecam-cam-tips-ec-158.md
promoted_at: 2026-06-09T22:31:16.198Z
---

# Gun Drilling Strategy with Pilot Hole Requirement

For gun drilling in Edgecam (L/D > 10:1), always program a pilot hole first using a short rigid drill to 1.5-2x diameter depth. The pilot establishes concentricity for the gun drill entry. Set gun drill feed to 0.01-0.03 mm/rev for steel and 0.05-0.08 mm/rev for aluminum. Enable through-tool coolant (70+ bar pressure) and set the dwell at bottom to 0 to prevent chip packing. Program retract with feed (not rapid) to avoid scoring the bore surface.

**Category:** cam_strategy
**Confidence:** 0.87
**Source:** web:edgecam-docs
**Operations:** drilling

## Related
- [[cimatron-cam-tips-cim-012|Deep Gun Drilling with Peck Cycles]]
- [[mastercam-cam-tips-mc-160|Gun drilling parameters focus on straight-line accuracy and coolant flow for extreme depth ratios]]
- [[solidcam-cam-tips-sc-139|Gun Drilling — Single-Flute Deep Hole Strategy with Guide Bushing]]
- [[worknc-cam-tips-wnc-086|Deep Hole Drilling with Gun Drill Strategies]]
- [[cimatron-cam-tips-cim-032|Cooling Channel Drilling Sequences]]
