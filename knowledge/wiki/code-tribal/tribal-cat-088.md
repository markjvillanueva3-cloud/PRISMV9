---
name: tribal-cat-088
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["catia", "hardened-steel", "cbn", "light-passes", "material-specific"]
confidence: 89
source: "web:catia-docs"
promoted_from: knowledge/tribal/catia-cam-tips-cat-088.md
promoted_at: 2026-06-09T22:31:16.050Z
---

# Hardened Steel Machining CBN Tooling and Light Passes

For hardened steels (50-65 HRC) in CATIA, use CBN (cubic boron nitride) inserts at 100-250 m/min cutting speed. Depth of cut must be less than the CBN insert nose radius (typically 0.1-0.3mm) to maintain the cutting edge in compression. In CATIA finishing operations, set the stock allowance to exactly the finishing pass depth — no spring passes with CBN, as the second pass cuts hardened surface plus any work-hardened layer and rapidly wears the insert. Use constant-surface-speed mode for turning and constant-scallop for milling.

**Category:** cam_strategy
**Confidence:** 89
**Source:** web:catia-docs
**Operations:** finishing

## Related
- [[catia-cam-tips-cat-199|Hardened Steel Die Machining with CBN and High-Speed Strategy]]
- [[catia-cam-tips-cat-084|Aluminum Aerospace High-Speed Machining Parameters]]
- [[catia-cam-tips-cat-085|Titanium Machining Requires Rigid Setup and Moderate Speed]]
- [[catia-cam-tips-cat-086|Inconel and Superalloy Low-Speed High-Feed Strategy]]
- [[catia-cam-tips-cat-087|Composite CFRP Machining Requires Diamond Tooling and Dust Extraction]]
