---
name: tribal-mc-247
category: code-tribal
subdomain: quality
domain: tribal-knowledge
tags: ["mastercam", "verify-comparison", "stock-compare", "gouge-check", "deviation", "quality-gate"]
confidence: 87
source: "web:mastercam-docs"
promoted_from: knowledge/tribal/mastercam-cam-tips-mc-247.md
promoted_at: 2026-06-09T22:31:16.456Z
---

# Mastercam Verify comparison overlays machined stock against the CAD model to find gouges and excess material

After simulating all operations, use Mastercam's Verify Comparison (Stock Compare) to overlay the simulated machined stock against the original CAD model. The comparison color-maps the deviation: green indicates material at the correct dimension (within tolerance), blue indicates excess material remaining (positive deviation), and red indicates gouges (material removed below the target surface). Set the tolerance band to match the part drawing tolerance (typically ±0.05 mm for general milling, ±0.01 mm for precision surfaces). Any red zone requires investigation — it may indicate a gouge from incorrect tool path, holder collision, or incorrect stock-to-leave. Any blue zone indicates insufficient material removal — a missed rest region, wrong tool offset, or tool too large to reach the area. Run this comparison before releasing any program to production. Export the comparison report with deviation values for quality documentation.

**Category:** quality
**Confidence:** 87
**Source:** web:mastercam-docs
**Operations:** verification, quality

## Related
- [[mastercam-cam-tips-mc-135|Blend radius selection for barrel cutters must account for both shank and profile geometry]]
- [[mastercam-cam-tips-mc-223|Batch verification runs Machine Simulation on all operations unattended for overnight checking]]
- [[mastercam-cam-tips-mc-272|Custom tool form definition enables toolpath generation with non-standard cutter profiles]]
- [[mastercam-cam-tips-mc-284|Medical implant surface finish validation uses Mastercam gouge-check with tightened tolerance for biocompatibility]]
- [[mastercam-cam-tips-mc-297|Mastercam verify comparison mode overlays nominal model to quantify actual material remaining after machining]]
