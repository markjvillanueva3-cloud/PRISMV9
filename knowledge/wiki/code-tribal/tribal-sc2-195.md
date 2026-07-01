---
name: tribal-sc2-195
category: code-tribal
subdomain: verification
domain: tribal-knowledge
tags: ["digital-twin", "stock-model", "stl-export", "initialization", "api"]
confidence: 0
source: "web:surfcam-docs"
promoted_from: knowledge/tribal/surfcam-cam-tips-sc2-195.md
promoted_at: 2026-06-09T22:31:16.702Z
---

# SURFCAM Stock Model Export for Digital Twin Initialization

Export SURFCAM's in-process stock model as STL or STEP files at each operation boundary to initialize the digital twin's material state. The digital twin needs the accurate stock shape to compute cutting forces and chip formation. Export resolution should match the digital twin's mesh requirements — typically 0.05-0.1mm triangle edge length for finishing operations. SURFCAM's stock model export is available through the API: StockModel.Export(format, tolerance, operation_index). Schedule exports at each tool change point and at critical mid-operation checkpoints.

**Category:** verification
**Confidence:** 0.81
**Source:** web:surfcam-docs
**Operations:** roughing, finishing

## Related
- [[bobcad-cam-tips-bc-216|BobCAD Stock Model Export for Digital Twin Initialization]]
- [[esprit-cam-tips-esp-069|Material Removal Simulation Shows In-Process Stock]]
- [[bobcad-cam-tips-bc-213|BobCAD Digital Twin Integration via NC Code Feedback Loop]]
- [[bobcad-cam-tips-bc-214|BobCAD Process Digital Twin for Predictive Tool Management]]
- [[bobcad-cam-tips-bc-215|Thermal Compensation Feedback from Digital Twin to BobCAD]]
