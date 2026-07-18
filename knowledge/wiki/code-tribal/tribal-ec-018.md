---
name: tribal-ec-018
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["3d-roughing", "z-level", "step-down", "bull-nose"]
confidence: 88
source: "web:edgecam-milling"
promoted_from: knowledge/tribal/edgecam-cam-tips-ec-018.md
promoted_at: 2026-06-09T22:31:16.164Z
---

# 3D Rough Machining with Z-Level Strategy

Edgecam's 3D roughing uses Z-level (waterline) slicing to progressively remove material in horizontal layers. Set the step-down based on the target stock allowance and tool capability: 0.5-2mm for finishing stock, 2-5mm for semi-finish stock. Enable adaptive step-down to use finer increments in steep regions. Use a bull-nose cutter instead of ball-nose for roughing — the flat bottom removes more material per pass with better floor finish.

**Category:** cam_strategy
**Confidence:** 88
**Source:** web:edgecam-milling
**Operations:** 3d_roughing

## Related
- [[esprit-cam-tips-esp-011|Z-Level Roughing Step-Down Strategy for Complex Surfaces]]
- [[bobcad-cam-tips-bc-010|Advanced Rough with HSM Pattern and Flatland Detection]]
- [[bobcad-cam-tips-bc-021|Z-Level Finishing for Steep Walls Over 30 Degrees]]
- [[bobcad-cam-tips-bc-029|Waterline Roughing for Cavity and Core Work]]
- [[camworks-cam-tips-cw-033|Z-Level Roughing — Waterline Strategy for 3D Cavity Stock Removal]]
