---
id: "cat-180"
title: "Generative Machining Script for Batch NC Program Creation"
source: "web:dassault-forum"
confidence: 0.81
category: "cam_strategy"
tags: ["catia", "generative", "script", "batch", "automation"]
_source: "catia-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.957Z
---

# Generative Machining Script for Batch NC Program Creation

CATIA supports generative (script-driven) creation of entire Manufacturing Programs via CATScript (V5) or EKL (3DEXPERIENCE). The script iterates over recognized features, applies machining rules, creates operations with appropriate tools and parameters, and computes tool paths — all without user interaction. Key API classes: MfgProgramFactory (create operations), MfgActivity (set parameters), MfgToolAssembly (assign tools), MfgComputation (compute paths). Use this for high-volume production where hundreds of similar parts need NC programs — a single script can generate complete Manufacturing Programs for an entire part family overnight in batch mode.

**Category:** cam_strategy
**Confidence:** 0.81
**Source:** web:dassault-forum
**Operations:** automation

## Related
- [[catia-cam-tips-cat-064|EKL Scripts Automate Repetitive CAM Parameter Adjustments]]
- [[catia-cam-tips-cat-069|Macro-Based Batch Processing for High-Volume Programming]]
- [[catia-cam-tips-cat-062|Process Templates Capture Best-Practice Operation Sequences]]
- [[catia-cam-tips-cat-063|Knowledge-Based Machining Automates Feature-to-Operation Mapping]]
- [[catia-cam-tips-cat-065|Feature Recognition Auto-Detects Machinable Geometry]]
