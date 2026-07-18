---
name: tribal-cat-169
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["catia", "fbm", "feature-recognition", "process-assignment", "automation"]
confidence: 0
source: "web:catia-docs"
promoted_from: knowledge/tribal/catia-cam-tips-cat-169.md
promoted_at: 2026-06-09T22:31:16.070Z
---

# Feature-Based Machining Automatic Process Assignment

CATIA's Feature-Based Machining (FBM) in 3DEXPERIENCE automatically recognizes design features (holes, pockets, slots, chamfers, fillets) and assigns machining processes from a predefined rules database. Enable FBM by activating the 'Machining Feature Recognition' command — CATIA scans the part and lists all recognized features with their parameters (diameter, depth, tolerance). Each feature type maps to a machining process template: simple holes → center drill + drill + ream, threaded holes → center drill + drill + tap, pockets → rough + semi-finish + finish. Customize the rules in the Manufacturing Rules Editor to match your shop's tooling and practices.

**Category:** cam_strategy
**Confidence:** 0.88
**Source:** web:catia-docs
**Operations:** drilling, pocketing

## Related
- [[catia-cam-tips-cat-065|Feature Recognition Auto-Detects Machinable Geometry]]
- [[catia-cam-tips-cat-129|Prismatic Machining Multi-Pocket Recognition and Grouping]]
- [[cimatron-cam-tips-cim-008|Automatic Feature Recognition for Drilling]]
- [[nx-cam-tips-nx-017|FBM Automatic Feature Recognition on Imported Files]]
- [[catia-cam-tips-cat-062|Process Templates Capture Best-Practice Operation Sequences]]
