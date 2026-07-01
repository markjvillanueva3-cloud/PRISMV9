---
name: tribal-mc-140
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["mastercam", "pencil", "wall-cleanup", "fillet", "corner", "mold-cavity"]
confidence: 87
source: "web:mastercam-docs"
promoted_from: knowledge/tribal/mastercam-cam-tips-mc-140.md
promoted_at: 2026-06-09T22:31:16.430Z
---

# Pencil toolpath with wall cleanup targets fillet corners that larger tools cannot reach

After roughing and semi-finishing a mold cavity, internal fillets and corners retain material that the larger finishing tool cannot reach. In Mastercam, use Pencil toolpath to trace along these fillet intersections with a smaller ball end mill. Enable the Wall Cleanup option to extend the pencil cut slightly up the adjacent walls, blending the pencil pass seamlessly into the surrounding finish. Set the pencil tool diameter to match or be slightly smaller than the target fillet radius (e.g., 1.0 mm ball for R1.0 fillets). Without wall cleanup, a visible step appears where the pencil pass meets the main finish surface. The cleanup width should be 2–3× the scallop height of the main finishing pass to ensure complete blending.

**Category:** cam_strategy
**Confidence:** 87
**Source:** web:mastercam-docs
**Operations:** finishing, mold_die

## Related
- [[mastercam-cam-tips-mc-055|Pencil toolpath targets fillet and concave blend regions for zero-scallop finish]]
- [[tebis-cam-tips-teb-035|Pencil Trace Finishing Cleans Fillet and Corner Regions]]
- [[mastercam-cam-tips-mc-059|Morph finishing interpolates between two boundary curves for blending regions]]
- [[mastercam-cam-tips-mc-062|Blend finish smooths transitions between adjacent toolpath regions]]
- [[mastercam-cam-tips-mc-129|Lens cutters excel on shallow concave surfaces where ball end mills lose effectiveness]]
