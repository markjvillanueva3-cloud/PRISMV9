---
name: tribal-sc-138
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["solidcam", "bta-drilling", "deep-hole", "high-pressure-coolant", "boring"]
confidence: 85
source: "web:solidcam-docs"
promoted_from: knowledge/tribal/solidcam-cam-tips-sc-138.md
promoted_at: 2026-06-09T22:31:16.601Z
---

# BTA Deep Hole Drilling — Programming Long Bore Cycles in SolidCAM

BTA (Boring and Trepanning Association) drilling for holes deeper than 10xD requires special cycle programming in SolidCAM. Define the BTA operation using the custom drill cycle page: set pilot hole depth (typically 2xD with a twist drill), then the BTA phase with through-tool high-pressure coolant (40-80 bar). Set feed rate at 0.05-0.15mm/rev depending on diameter and material. BTA drills do not peck — continuous feed with coolant-flushed chip evacuation through the drill's internal channel. Program a dwell at full depth for 2-3 seconds to clean the hole bottom. Output as a machine-specific canned cycle or as G01 moves with M-code coolant control.

**Category:** cam_strategy
**Confidence:** 85
**Source:** web:solidcam-docs
**Operations:** drilling

## Related
- [[solidcam-cam-tips-sc-139|Gun Drilling — Single-Flute Deep Hole Strategy with Guide Bushing]]
- [[solidcam-cam-tips-sc-140|Peck Drilling Optimization — Chip Break vs Full Retract Strategies]]
- [[solidcam-cam-tips-sc-142|Helical Interpolation Boring — Milling Precise Holes Without Boring Bars]]
- [[solidcam-cam-tips-sc-143-2|Monte Carlo Cycle Time Estimation]]
- [[solidcam-cam-tips-sc-144-2|Weibull Tool Life for iMachining Replace-Before-Fail]]
