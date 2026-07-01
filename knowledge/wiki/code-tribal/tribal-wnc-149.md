---
name: tribal-wnc-149
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["electrode", "set-management", "rougher", "finisher", "orbiter"]
confidence: 90
source: "web:worknc-docs"
promoted_from: knowledge/tribal/worknc-cam-tips-wnc-149.md
promoted_at: 2026-05-26T16:07:21.635Z
---

# Electrode Set Management — Rougher, Finisher, and Orbiter

WorkNC manages electrode sets for complex cavities: roughing electrode (0.2-0.3mm oversize per side, aggressive burn parameters), finishing electrode (0.01-0.05mm oversize, fine parameters), and orbiting electrode (undersize, used with XY orbital motion for undercuts and corners). Program all electrodes in a single WorkNC project with shared reference points. The EDM machine runs the sequence: rough all areas → inspect → finish all areas → inspect → orbit specific features. Maintain electrode traceability by engraving the electrode ID on the mounting face.

**Category:** cam_strategy
**Confidence:** 90
**Source:** web:worknc-docs
**Operations:** edm, milling

## Related
- [[topsolid-cam-tips-ts-154|TopSolid Multi-Electrode Management — Rougher/Finisher/Orbiter Sets]]
- [[topsolid-cam-tips-ts-056|Electrode Families for Roughing and Finishing Burns]]
- [[catia-cam-tips-cat-192|Electrode Design and Machining Integration in CATIA]]
- [[cimatron-cam-tips-cim-002|Electrode Extraction from Mold Cavity]]
- [[cimatron-cam-tips-cim-015|Graphite Electrode Machining Parameters]]
