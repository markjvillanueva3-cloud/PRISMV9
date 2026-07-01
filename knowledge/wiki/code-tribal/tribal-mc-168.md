---
name: tribal-mc-168
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["mastercam", "remnant", "nesting", "material-reuse", "waste-reduction", "router"]
confidence: 83
source: "web:community"
promoted_from: knowledge/tribal/mastercam-cam-tips-mc-168.md
promoted_at: 2026-06-09T22:31:16.436Z
---

# Remnant tracking in Mastercam nesting reuses partial sheets from previous jobs

After nesting and cutting parts from a sheet, the remaining skeleton (remnant) can be reused for smaller parts in future jobs. In Mastercam, enable remnant tracking in the Nesting parameters: after cutting, save the remnant geometry as a DXF or Mastercam file with the actual remaining material boundary. On the next job, import the remnant as the sheet geometry instead of a full rectangular sheet. Mastercam's Advanced Nesting can nest new parts into the irregular remnant shape, achieving additional material utilization from stock that would otherwise be scrapped. For this workflow to succeed, mark the remnant sheet with a physical reference point (drilled hole or corner mark) that matches the origin in the Mastercam file. Maintain a remnant inventory log with sheet size, material, thickness, and file reference.

**Category:** cam_strategy
**Confidence:** 83
**Source:** web:community
**Operations:** routing, nesting

## Related
- [[mastercam-cam-tips-mc-164|Nesting layout optimization in Mastercam Router maximizes sheet utilization above 85%]]
- [[mastercam-cam-tips-mc-169|Common line cutting shares edges between adjacent parts to eliminate double cuts and save material]]
- [[mastercam-cam-tips-mc-152|Bar feeder programming in Mastercam automates stock advance and remnant handling]]
- [[mastercam-cam-tips-mc-165|Compression cutters prevent delamination on both top and bottom surfaces of composite laminates]]
- [[mastercam-cam-tips-mc-167|Tab management in router profiling holds parts in place during cutout without vacuum failure]]
