---
name: tribal-mc-194
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["mastercam", "solid-chaining", "associative", "model-edge", "dynamic-start", "parametric"]
confidence: 85
source: "web:mastercam-docs"
promoted_from: knowledge/tribal/mastercam-cam-tips-mc-194.md
promoted_at: 2026-06-09T22:31:16.443Z
---

# Solid chaining leverages model edges directly without creating wireframe construction geometry

When working with solid models in Mastercam, use Solid Chaining to select edges directly from the solid body instead of creating wireframe geometry. Solid chains are associative — if the solid model changes (fillet radius update, dimension change), the toolpath updates automatically because the chain references the solid edge, not a separate curve. In the Chaining Manager, set the selection filter to Solids to enable solid edge picking. Solid chains can include face loops (complete edge loops around a face), partial edges (drag the Dynamic Chain Start Point to shorten the chain), and multi-edge chains across different faces. The limitation is that solid edges must be topologically connected — you cannot chain across a gap between disconnected solid bodies. For solids imported from STEP or IGES, verify edge quality first — poor translation can create micro-gaps that break solid chains.

**Category:** cam_strategy
**Confidence:** 85
**Source:** web:mastercam-docs
**Operations:** contouring, pocketing, setup

## Related
- [[mastercam-cam-tips-mc-091|Post processor macro variables enable parametric subprograms for repeated features]]
- [[mastercam-cam-tips-mc-197|Chain vs solid containment methods offer different trade-offs for toolpath region control]]
- [[mastercam-cam-tips-mc-270|Mastercam for SolidWorks associativity automatically updates toolpaths when the SolidWorks model changes]]
- [[wedm-knowledge-tips-wedm-mcam-001-2|Wire overburn decreases progressively per pass — 0.035→0.02→0.01→0]]
- [[wedm-knowledge-tips-wedm-mcam-003-2|Lead-in/lead-out with arcs reduces burrs — Line+Arc in, Arc+Line out]]
