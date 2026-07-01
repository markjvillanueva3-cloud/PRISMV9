---
name: tribal-cim-008
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["fbm", "feature-recognition", "drilling", "automation"]
confidence: 0
source: "web:cimatron-docs"
promoted_from: knowledge/tribal/cimatron-cam-tips-cim-008.md
promoted_at: 2026-06-09T22:31:16.083Z
---

# Automatic Feature Recognition for Drilling

Cimatron's FBM (Feature-Based Machining) automatically recognizes holes, pockets, and slots from the CAD model. For drilling, it identifies through-holes, blind holes, countersinks, and counterbores, then assigns appropriate canned cycles (G81/G83/G73). Set 'Recognition Tolerance' to 0.01mm for precision molds. Review the feature tree before generating — FBM occasionally merges adjacent holes with shared axes.

**Category:** cam_strategy
**Confidence:** 0.88
**Source:** web:cimatron-docs
**Operations:** drilling

## Related
- [[catia-cam-tips-cat-169|Feature-Based Machining Automatic Process Assignment]]
- [[mastercam-cam-tips-mc-252|Mastercam 2025 Toolpath Hole Recognition automatically identifies and programs hole features from solids]]
- [[nx-cam-tips-nx-017|FBM Automatic Feature Recognition on Imported Files]]
- [[powermill-cam-tips-pm-058|Feature Recognition for Automated Hole Machining]]
- [[tebis-cam-tips-teb-123|Feature-Based Drilling with Automatic Cycle Selection]]
