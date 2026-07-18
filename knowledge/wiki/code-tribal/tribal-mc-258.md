---
name: tribal-mc-258
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["mastercam", "pencil-trace", "fillet", "cleanup", "surface-finish", "accelerated"]
confidence: 87
source: "web:mastercam-docs"
promoted_from: knowledge/tribal/mastercam-cam-tips-mc-258.md
promoted_at: 2026-06-09T22:31:16.458Z
---

# Accelerated Finishing pencil trace cleans fillet radii and inside corners with minimal additional cycle time

After an Equal Scallop or parallel finish pass, use Mastercam's Pencil Trace toolpath to clean remaining cusps in fillet radii and concave transitions. Pencil Trace automatically detects inside corners where the primary finishing tool leaves excess material (due to tool radius vs. fillet radius mismatch) and generates a single-pass cleanup along those fillets. Use a ball mill with radius equal to or slightly smaller than the smallest fillet radius on the part. Set the 'Pencil Width' to 1.5x the scallop height from the primary finish pass. Pencil Trace typically adds only 2-5% to total cycle time but eliminates the need for hand polishing in fillet areas. On mold parts with 50+ fillets, this saves 1-4 hours of bench work.

**Category:** cam_strategy
**Confidence:** 87
**Source:** web:mastercam-docs
**Operations:** finishing

## Related
- [[mastercam-cam-tips-mc-055|Pencil toolpath targets fillet and concave blend regions for zero-scallop finish]]
- [[mastercam-cam-tips-mc-184|Rest pencil toolpath traces fillet intersections left by the larger previous tool]]
- [[gibbscam-cam-tips-gc-013|Pencil tracing automatically targets concave fillet intersections]]
- [[mastercam-cam-tips-mc-056|Parallel finishing with 45-degree cut angle hides machining marks on flat surfaces]]
- [[mastercam-cam-tips-mc-059|Morph finishing interpolates between two boundary curves for blending regions]]
