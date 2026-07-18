---
name: tribal-esp-170
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["additive", "repair", "cladding", "turbine-blade", "scan-to-cad"]
confidence: 0
source: "web:esprit-docs"
promoted_from: knowledge/tribal/esprit-cam-tips-esp-170.md
promoted_at: 2026-06-09T22:31:16.252Z
---

# Additive Feature Repair and Cladding Workflows

ESPRIT's additive module excels at part repair workflows: (1) 3D scan the damaged part (import STL), (2) compare scan to CAD model to identify material deficit, (3) program subtractive machining to clean the damaged zone to a known geometry, (4) program DED/LMD to rebuild the missing volume, (5) finish machine the repaired zone to final dimensions. For turbine blade tip repair, ESPRIT generates the buildup toolpath that follows the blade profile with 5-axis nozzle orientation, depositing Inconel or stellite at optimized layer heights. Typical material savings: 90% vs. scrapping and replacing the entire blade.

**Category:** cam_strategy
**Confidence:** 0.81
**Source:** web:esprit-docs
**Operations:** additive, 3d_finishing

## Related
- [[esprit-cam-tips-esp-171|Additive Multi-Material Deposition Control]]
- [[powermill-cam-tips-pm-070|Additive/Hybrid Manufacturing with PowerMill]]
- [[sprutcam-cam-tips-spr-191|Additive DED for Repair and Build-Up]]
- [[tebis-cam-tips-teb-125|Additive/Hybrid Manufacturing Integration]]
- [[tebis-cam-tips-teb-177|Additive DED Path Planning for Repair]]
