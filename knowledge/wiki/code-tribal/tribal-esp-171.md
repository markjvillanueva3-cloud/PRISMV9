---
name: tribal-esp-171
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["additive", "multi-material", "powder-feed", "cladding", "functionally-graded"]
confidence: 0
source: "web:esprit-forum"
promoted_from: knowledge/tribal/esprit-cam-tips-esp-171.md
promoted_at: 2026-06-09T22:31:16.252Z
---

# Additive Multi-Material Deposition Control

Advanced DED systems support multiple powder feeders for multi-material deposition. ESPRIT assigns material to each additive layer or region: hard-facing alloy (stellite) on wear surfaces, corrosion-resistant alloy (Inconel 625) on chemical-exposed areas, and low-cost structural steel for the bulk. Configure under Additive → Material → Multi-Feed with powder feeder assignments per operation. ESPRIT manages the powder feed switchover, including purge cycles between materials (typically 5-10 seconds of inert gas flush). The simulation color-codes each material for visual verification of the deposition sequence.

**Category:** cam_strategy
**Confidence:** 0.78
**Source:** web:esprit-forum
**Operations:** additive

## Related
- [[esprit-cam-tips-esp-170|Additive Feature Repair and Cladding Workflows]]
- [[topsolid-cam-tips-ts-177|TopSolid Multi-Material Additive — Gradient Structures]]
- [[camworks-cam-tips-cw-193|Hybrid Additive + Subtractive Workflow — Near-Net Shape to Finish]]
- [[camworks-cam-tips-cw-194|Additive Stock Definition — Scan Data to CAMWorks Stock Model]]
- [[camworks-cam-tips-cw-195|Support Structure Removal — Programming for Additive Post-Processing]]
