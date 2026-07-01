---
name: tribal-cat-192
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["catia", "mold", "electrode", "edm", "graphite"]
confidence: 0
source: "web:catia-docs"
promoted_from: knowledge/tribal/catia-cam-tips-cat-192.md
promoted_at: 2026-06-09T22:31:16.076Z
---

# Electrode Design and Machining Integration in CATIA

CATIA's Electrode Design workbench (within Mold Tooling Design) generates EDM electrodes directly from mold geometry. The extracted electrode shape includes spark gap offset (typically 0.1-0.3mm per side for roughing electrodes, 0.05mm for finishing). Machine the electrode in a separate Manufacturing Program with reversed geometry (the electrode is the male form of the female mold cavity). Use graphite-specific cutting parameters: high spindle speed (10,000-20,000 RPM), moderate feed (2000-4000 mm/min), full-depth cuts (graphite doesn't work-harden). CATIA maintains associativity — when the mold cavity changes, the electrode model and its machining program update accordingly.

**Category:** cam_strategy
**Confidence:** 0.85
**Source:** web:catia-docs
**Operations:** finishing

## Related
- [[cimatron-cam-tips-cim-002|Electrode Extraction from Mold Cavity]]
- [[mastercam-cam-tips-mc-142|Electrode creation from solid bodies automates EDM electrode design and machining]]
- [[mastercam-cam-tips-mc-280|Mold core/cavity workflow uses solid model split and electrode extraction for integrated EDM planning]]
- [[nx-cam-tips-ext-nx-121|Electrode Machining Workflow with NX]]
- [[tebis-cam-tips-teb-067|Electrode Design and Machining Workflow]]
