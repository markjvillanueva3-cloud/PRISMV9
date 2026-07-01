---
name: tribal-cat-180
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["catia", "generative", "script", "batch", "automation"]
confidence: 0
source: "web:dassault-forum"
promoted_from: knowledge/tribal/catia-cam-tips-cat-180.md
promoted_at: 2026-06-09T22:31:16.073Z
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
