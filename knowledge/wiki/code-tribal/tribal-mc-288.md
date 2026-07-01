---
name: tribal-mc-288
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["mastercam", "composite", "stack-drilling", "cfrp-titanium", "peck", "delamination"]
confidence: 80
source: "web:mastercam-docs"
promoted_from: knowledge/tribal/mastercam-cam-tips-mc-288.md
promoted_at: 2026-06-09T22:31:16.467Z
---

# Composite stack drilling in Mastercam uses peck cycles with controlled thrust force to prevent delamination

Drilling through composite stacks (CFRP/Ti, CFRP/Al) in Mastercam requires a specialized peck cycle to manage the dissimilar material transition. Program a G83 peck drill with parameters tailored to each layer: (1) CFRP layer: high speed (100-150 m/min), low feed (0.02-0.05 mm/rev), no peck (continuous feed prevents fiber push-out); (2) Ti layer: low speed (15-30 m/min), moderate feed (0.05-0.1 mm/rev), 1D peck to clear Ti chips that would scratch the CFRP bore. In Mastercam, define the stack as a custom drill cycle with two 'Depth Segments' in the Drill toolpath parameters, each with its own speed/feed and peck settings. Use diamond-coated carbide drills (PCD for CFRP entry, carbide core for Ti) with point angles of 130-140° to reduce thrust force. Monitor the thrust force limit: >300N in CFRP causes entry delamination, >800N causes exit delamination.

**Category:** cam_strategy
**Confidence:** 80
**Source:** web:mastercam-docs
**Operations:** drilling

## Related
- [[mastercam-cam-tips-mc-165|Compression cutters prevent delamination on both top and bottom surfaces of composite laminates]]
- [[mastercam-cam-tips-mc-166|Ramp entry into composites prevents plunge delamination and fiber pull-out]]
- [[mastercam-cam-tips-mc-230|Composite CFRP machining in Mastercam uses diamond-coated tools and dust management]]
- [[mastercam-cam-tips-mc-285|Composite machining in Mastercam requires compression routers and low helix angles to prevent delamination]]
- [[surfcam-cam-tips-sc2-173|SURFCAM Composite Stack Drilling for CFRP/Titanium Laminates]]
