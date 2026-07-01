---
name: tribal-f360-183
category: code-tribal
subdomain: speeds_feeds
domain: tribal-knowledge
tags: ["fusion360", "composite-metal-stack", "drilling", "dual-parameters", "cfrp-aluminum"]
confidence: 0
source: "web:autodesk-forum"
promoted_from: knowledge/tribal/fusion360-cam-tips-ext-f360-183.md
promoted_at: 2026-06-09T22:31:16.296Z
---

# CFRP-Metal Stack Drilling Parameters

For composite-metal stacks (CFRP over aluminum or titanium), program two feed-rate zones in the drilling operation. In the CFRP zone: high speed (8000-10000 RPM), low feed (0.02-0.04mm/rev). At the CFRP-metal interface, reduce speed to suit the metal (2000-4000 RPM for aluminum, 400-800 RPM for titanium) and increase feed. In Fusion, use the 'Custom' drill cycle and define Z-depth segments with different parameters. The alternative is to drill the stack at compromise parameters — but this typically produces oversized holes in the softer layer. Use a one-shot drill (variable helix/geometry designed for stacks) if available, which handles both materials at a single set of parameters.

**Category:** speeds_feeds
**Confidence:** 0.84
**Source:** web:autodesk-forum
**Operations:** drilling

## Related
- [[fusion360-cam-tips-ext-f360-182|Diamond-Coated Tools for Composite Drilling]]
- [[fusion360-cam-tips-ext-f360-040|Fine-Tune Optimal Load by Material Hardness]]
- [[fusion360-cam-tips-ext-f360-041|Multi-Depth Adaptive with Progressive Stepdown]]
- [[fusion360-cam-tips-ext-f360-042|Rest Machining Adaptive with Tight Tolerance Overlap]]
- [[fusion360-cam-tips-ext-f360-043|Separate Radial and Axial Stock-to-Leave for Adaptive]]
