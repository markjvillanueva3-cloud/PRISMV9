---
name: tribal-ts-066
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["nc-verification", "g-code", "post-processor", "validation"]
confidence: 93
source: "web:topsolid-ncverify"
promoted_from: knowledge/tribal/topsolid-cam-tips-ts-066.md
promoted_at: 2026-05-26T16:07:20.771Z
---

# NC Verification Runs Posted Code Against Machine Model

TopSolid's NC verification reads the actual posted G-code and simulates it against the machine kinematic model, catching post-processor translation errors that toolpath-level simulation would miss. This includes verification of canned cycle expansion, coordinate system rotations (G68/G68.2), tool length compensation modes (G43/G43.4/G43.5), and fixture offset calls. Always compare NC verification results against toolpath simulation to confirm the post-processor is translating correctly.

**Category:** cam_strategy
**Confidence:** 93
**Source:** web:topsolid-ncverify
**Operations:** general

## Related
- [[worknc-cam-tips-wnc-058|NC Verification Validates Posted G-Code Accuracy]]
- [[camworks-cam-tips-cw-085|Post Customization — Modify Output Format for Your Controller]]
- [[camworks-cam-tips-cw-087|Canned Cycle Output — Map Operations to Controller Drill Cycles]]
- [[catia-cam-tips-cat-070|Post-Processor Table Customization for Controller Compatibility]]
- [[catia-cam-tips-cat-072|Canned Cycle Output for Drilling Operations]]
