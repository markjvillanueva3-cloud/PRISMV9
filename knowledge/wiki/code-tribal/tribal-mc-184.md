---
name: tribal-mc-184
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["mastercam", "rest-pencil", "fillet", "intersection", "stock-model", "cleanup"]
confidence: 86
source: "web:community"
promoted_from: knowledge/tribal/mastercam-cam-tips-mc-184.md
promoted_at: 2026-06-09T22:31:16.441Z
---

# Rest pencil toolpath traces fillet intersections left by the larger previous tool

After roughing and semi-finishing, internal fillet intersections where two surfaces meet retain a wedge of material that only a smaller tool can reach. Mastercam's Pencil toolpath with Rest Material enabled automatically finds these fillet intersections by analyzing the stock model and generates a pencil trace only where material remains. Without rest material enabled, the pencil pass traces ALL fillets including those already clean — wasting 40–60% of the pencil cycle time on air cutting. Set the pencil tool diameter to match or be slightly smaller than the target fillet radius. Enable Wall Cleanup to blend the pencil cut into surrounding finished surfaces. For best results, use the stock model from the last semi-finish operation so the pencil pass only targets material the semi-finish tool genuinely left behind.

**Category:** cam_strategy
**Confidence:** 86
**Source:** web:community
**Operations:** finishing, semi_finishing

## Related
- [[mastercam-cam-tips-mc-055|Pencil toolpath targets fillet and concave blend regions for zero-scallop finish]]
- [[mastercam-cam-tips-mc-258|Accelerated Finishing pencil trace cleans fillet radii and inside corners with minimal additional cycle time]]
- [[mastercam-cam-tips-mc-262|Rest machining with stock model reference precisely targets only remaining material from larger tool passes]]
- [[mastercam-cam-tips-mc-059|Morph finishing interpolates between two boundary curves for blending regions]]
- [[mastercam-cam-tips-mc-096|Save Stock Model at operation boundaries to speed up re-simulation]]
