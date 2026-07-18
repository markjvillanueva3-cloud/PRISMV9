---
name: tribal-ts-113
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["cmm", "gdt", "probing", "flatness", "concentricity"]
confidence: 89
source: "web:topsolid-cmm"
promoted_from: knowledge/tribal/topsolid-cam-tips-ts-113.md
promoted_at: 2026-06-09T22:31:16.766Z
---

# CMM-Style Probing with GD&T Evaluation

TopSolid supports CMM-style probing on the CNC machine, measuring features and evaluating GD&T callouts: flatness, parallelism, perpendicularity, concentricity, runout, and position. The probing routine collects sufficient points for each GD&T feature (minimum 9 for flatness, 6 per cylinder for concentricity). Results are compared against the tolerance values imported from the PMI data. While less accurate than a dedicated CMM (typically ±0.005 mm vs ±0.001 mm), this provides immediate feedback for process control.

**Category:** cam_strategy
**Confidence:** 89
**Source:** web:topsolid-cmm
**Operations:** probing

## Related
- [[nx-cam-tips-ext-nx-135|Inspection Programming with CMM Integration]]
- [[sprutcam-cam-tips-spr-198|Probing for Turned Part Verification]]
- [[catia-cam-tips-cat-083|CMM Program Generation from CATIA Manufacturing Data]]
- [[cimatron-cam-tips-cim-047|SPC Integration for Mold Shop Quality]]
- [[esprit-cam-tips-esp-119|CMM Output for Quality Documentation]]
