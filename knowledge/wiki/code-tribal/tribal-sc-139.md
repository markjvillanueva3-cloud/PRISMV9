---
name: tribal-sc-139
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["solidcam", "gun-drilling", "deep-hole", "guide-bushing", "single-flute"]
confidence: 85
source: "web:solidcam-docs"
promoted_from: knowledge/tribal/solidcam-cam-tips-sc-139.md
promoted_at: 2026-06-09T22:31:16.601Z
---

# Gun Drilling — Single-Flute Deep Hole Strategy with Guide Bushing

Gun drilling in SolidCAM programs holes from 1mm to 40mm diameter at depths up to 100xD. The cycle includes: spot drill for centering, short pilot hole with twist drill (1.5xD), optional guide bushing engagement, then gun drill entry at reduced feed (50% for first 2xD), followed by full feed rate. Unlike twist drills, gun drills use continuous feed without pecking — the single flute and internal coolant channel (minimum 50 bar) flush chips forward. Program the gun drill feed rate at 0.01-0.04mm/rev for diameters under 6mm, and 0.03-0.08mm/rev for larger diameters. Spindle speed is typically 50-70% of the equivalent twist drill speed.

**Category:** cam_strategy
**Confidence:** 85
**Source:** web:solidcam-docs
**Operations:** drilling

## Related
- [[solidcam-cam-tips-sc-152-2|Uncertainty Budget for iMachining vs Conventional]]
- [[solidcam-cam-tips-sc-138|BTA Deep Hole Drilling — Programming Long Bore Cycles in SolidCAM]]
- [[solidcam-cam-tips-sc-140|Peck Drilling Optimization — Chip Break vs Full Retract Strategies]]
- [[solidcam-cam-tips-sc-143-2|Monte Carlo Cycle Time Estimation]]
- [[solidcam-cam-tips-sc-144-2|Weibull Tool Life for iMachining Replace-Before-Fail]]
