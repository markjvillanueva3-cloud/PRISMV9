---
name: tribal-spr-056
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["z-level", "variable-step", "cusp-height", "finishing"]
confidence: 0
source: "web:sprutcam-docs"
promoted_from: knowledge/tribal/sprutcam-cam-tips-spr-056.md
promoted_at: 2026-06-09T22:31:16.631Z
---

# Z-Level Finishing with Variable Step-Down

SprutCAM's Z-level finishing with variable step-down maintains constant cusp height on surfaces of varying slope. Steep walls get finer step-down, shallow regions get coarser. Set target cusp height (0.005mm for polishing-ready) rather than fixed step-down. Enable 'Overlap' at steep-to-shallow transitions (1-2mm band) to eliminate witness lines. Best for mold cavities with mixed steep and shallow regions.

**Category:** cam_strategy
**Confidence:** 0.87
**Source:** web:sprutcam-docs
**Operations:** finishing

## Related
- [[cimatron-cam-tips-cim-003|Z-Level Finishing with Constant Cusp Height]]
- [[camworks-cam-tips-cw-034|Z-Level Finish — Constant-Z Contouring for Steep Walls]]
- [[gibbscam-cam-tips-gc-011|Z-level finishing excels on steep walls with constant scallop height]]
- [[nx-cam-tips-ext-nx-051|Z-Level Profile Finishing with Merge Distance Control]]
- [[nx-cam-tips-nx-008|Z-Level Finishing with Automatic Steep/Shallow Detection]]
