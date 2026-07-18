---
name: tribal-ts-009
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["pmi", "tolerances", "gdt", "surface-finish"]
confidence: 90
source: "web:topsolid-pmi"
promoted_from: knowledge/tribal/topsolid-cam-tips-ts-009.md
promoted_at: 2026-05-26T16:07:20.677Z
---

# PMI Import Carries Tolerances into CAM Operations

TopSolid imports PMI (Product Manufacturing Information) from STEP AP242 and native CAD formats, carrying GD&T callouts, surface finish requirements, and dimensional tolerances directly into the CAM environment. Use these annotations to automatically set finishing allowances—surfaces with Ra 0.8 or better should use scallop-controlled finishing with cusp height under 0.005 mm, while Ra 3.2 surfaces can tolerate standard parallel finishing.

**Category:** cam_strategy
**Confidence:** 90
**Source:** web:topsolid-pmi
**Operations:** finishing

## Related
- [[camworks-cam-tips-cw-061|Tolerance-Based Machining — Read PMI for Automatic Strategy Selection]]
- [[camworks-cam-tips-cw-138|TBM Reads PMI to Auto-Assign Machining Parameters]]
- [[camworks-cam-tips-cw-145|TBM with Imported Models — STEP AP242 PMI Support]]
- [[nx-cam-tips-ext-nx-078|Thread Cutting with Automatic Pitch Extraction from PMI]]
- [[nx-cam-tips-ext-nx-083|FBM Automatic Feature Recognition with PMI-Driven Tolerances]]
