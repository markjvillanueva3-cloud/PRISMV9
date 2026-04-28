---
id: "cat-169"
title: "Feature-Based Machining Automatic Process Assignment"
source: "web:catia-docs"
confidence: 0.88
category: "cam_strategy"
tags: ["catia", "fbm", "feature-recognition", "process-assignment", "automation"]
_source: "catia-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.948Z
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
