---
id: "wedm-mcam-005"
title: "No Core toolpath removes material without slugs — zigzag or spiral cutting"
source: "mastercam_wire_tutorial:page33"
confidence: 87
category: "machining"
tags: ["wire-edm", "no-core", "slug-free", "zigzag", "spiral", "slot", "mastercam", "cavity"]
_source: "wedm-knowledge-tips.ts"
indexed_at: 2026-04-28T01:00:44.609Z
---

# No Core toolpath removes material without slugs — zigzag or spiral cutting

No Core toolpaths in Mastercam Wire remove all material within a boundary without producing slugs or slivers. The wire starts at a pre-drilled hole and zigzags or spirals outward until all material is removed. Six cutting methods available: (1) Parallel Spiral — follows part shape, good for slots. (2) One Way — linear passes in one direction. (3) Zigzag — alternating linear passes. (4) Zig One Way — zigzag with lifts between passes. (5) Spiral — continuous inward/outward spiral. (6) Morph Spiral — blend between shapes. Use No Core for: slotted features where slug dropout is impossible, thin ribs where slugs can't be removed, or when full cavity clearance is needed without manual slug extraction.

**Category:** machining
**Confidence:** 87
**Source:** mastercam_wire_tutorial:page33
**Operations:** wire_edm

## Related
- [[mastercam-cam-tips-mc-126|No-core wire EDM cutting eliminates slug handling for large openings]]
- [[wedm-knowledge-tips-wedm-mcam-001-2|Wire overburn decreases progressively per pass — 0.035→0.02→0.01→0]]
- [[wedm-knowledge-tips-wedm-mcam-003-2|Lead-in/lead-out with arcs reduces burrs — Line+Arc in, Arc+Line out]]
- [[wedm-knowledge-tips-wedm-mcam-002-2|Reverse cutting method eliminates re-threading between passes]]
- [[bobcad-cam-tips-bc-064|No-Core Wire EDM for Non-Droppable Slugs]]
