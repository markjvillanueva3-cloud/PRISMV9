---
name: tribal-esp-013
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["pencil-tracing", "fillets", "cleanup", "ball-nose"]
confidence: 88
source: "web:esprit-3d-machining"
promoted_from: knowledge/tribal/esprit-cam-tips-esp-013.md
promoted_at: 2026-06-09T22:31:16.216Z
---

# Pencil Tracing Cleans Fillet Intersections

Use ESPRIT's pencil tracing cycle to clean material from internal fillet intersections that larger tools cannot reach. Pencil tracing automatically detects concave fillet regions and generates toolpaths that follow the fillet centerline. Use a ball-nose cutter with radius matching or slightly smaller than the fillet radius. Set stepover to 0.05-0.15mm for finishing and enable 'multi-pass' for fillets deeper than the tool radius.

**Category:** cam_strategy
**Confidence:** 88
**Source:** web:esprit-3d-machining
**Operations:** 3d_finishing, pencil

## Related
- [[worknc-cam-tips-wnc-154|WorkNC Pencil Tracing — Corner Cleanup on Fillets and Transitions]]
- [[catia-cam-tips-cat-138|Surface Machining Pencil Tracing for Fillet Cleanup]]
- [[solidcam-cam-tips-sc-066|HSM Pencil Tracing — Clean Internal Fillets in One Pass]]
- [[surfcam-cam-tips-sc2-180|SURFCAM Pencil Tracing for Hardened Steel Fillet Cleanup]]
- [[camworks-cam-tips-cw-037|Pencil Trace — Clean Internal Fillets and Blend Regions]]
