---
name: tribal-gc-195
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["gibbscam", "micro-machining", "electrode", "edm", "graphite"]
confidence: 81
source: "web:gibbscam-docs"
promoted_from: knowledge/tribal/gibbscam-cam-tips-gc-195.md
promoted_at: 2026-06-09T22:31:16.363Z
---

# GibbsCAM micro-electrode EDM preparation machines graphite electrodes to micron precision

GibbsCAM programs micro-electrode fabrication for sinker EDM using graphite or copper-tungsten blanks. Machine the electrode with micro endmills (0.1-0.5 mm) at high spindle speeds (50,000+ RPM). For graphite, use uncoated carbide or diamond-coated endmills with dust extraction (graphite dust is conductive and abrasive). Program the electrode with the EDM overburn gap added to all dimensions (typically 0.01-0.03 mm per side for micro-EDM). GibbsCAM's 3D finishing strategies (constant-Z, raster, pencil trace) produce the electrode surface finish that directly determines the EDM'd cavity finish. Machine the electrode in the same orientation it will be used in the EDM machine to eliminate setup errors.

**Category:** cam_strategy
**Confidence:** 81
**Source:** web:gibbscam-docs

## Related
- [[catia-cam-tips-cat-192|Electrode Design and Machining Integration in CATIA]]
- [[powermill-cam-tips-pm-069|Electrode Machining Workflow in PowerMill]]
- [[worknc-cam-tips-wnc-036|Electrode Machining with Graphite-Specific Strategies]]
- [[gibbscam-cam-tips-gc-193|GibbsCAM micro-machining tool deflection compensation adjusts toolpath for bendable tools]]
- [[gibbscam-cam-tips-gc-194|GibbsCAM micro-feature surface finish requires vibration-free spindle operation]]
