---
name: tribal-cat-073
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["catia", "apt", "cldata", "third-party", "post-processor"]
confidence: 87
source: "web:catia-docs"
promoted_from: knowledge/tribal/catia-cam-tips-cat-073.md
promoted_at: 2026-06-09T22:31:16.046Z
---

# APT and CLDATA Output for Third-Party Post Processing

CATIA can output tool paths in APT (Automatically Programmed Tool) or CLDATA (Cutter Location Data) format for processing by third-party post-processors like ICAM or CENIT. APT is a human-readable text format; CLDATA is binary and more compact. When using third-party posts, output CLDATA for maximum fidelity as it preserves all machining events (tool changes, spindle commands, coolant). Verify the CLDATA version compatibility — CATIA V5 uses a slightly different format than 3DEXPERIENCE.

**Category:** cam_strategy
**Confidence:** 87
**Source:** web:catia-docs
**Operations:** post_processing

## Related
- [[catia-cam-tips-cat-070|Post-Processor Table Customization for Controller Compatibility]]
- [[catia-cam-tips-cat-071|Multi-Axis Post-Processor RTCP and TCP Mode Configuration]]
- [[catia-cam-tips-cat-072|Canned Cycle Output for Drilling Operations]]
- [[catia-cam-tips-cat-074|Sub-Program Generation for Repeated Geometry Patterns]]
- [[catia-cam-tips-cat-128|V5 PP Table vs 3DEXPERIENCE Post Processor Workbench]]
