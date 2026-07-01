---
name: tribal-ctrl-043
category: code-tribal
subdomain: programming
domain: tribal-knowledge
tags: ["index", "c200", "multi-spindle", "virtual-axes", "automatic"]
confidence: 82
source: "controller:index_c200_guide"
promoted_from: knowledge/tribal/controller-knowledge-tips-ctrl-043.md
promoted_at: 2026-06-09T22:31:16.142Z
---

# Index C200 multi-spindle programming with virtual axes

Index multi-spindle automatics use the C200 controller (Siemens SINUMERIK based) with virtual axis programming. Each spindle position has its own coordinate system. Parts are programmed as single-spindle operations, then the controller handles the multi-spindle synchronization through 'virtual machine' technology. Tool allocation across turrets is automatic. Cycle time = slowest station only. Programming is in Siemens G-code with Index-specific cycles for spindle indexing.

**Category:** programming
**Confidence:** 82
**Source:** controller:index_c200_guide

## Related
- [[controller-knowledge-tips-ctrl-115|Index C200 dual-controller option and INDEXoperate interface]]
- [[controller-knowledge-tips-ctrl-121|Index/Traub virtual machine for collision-free multi-spindle setup]]
- [[controller-knowledge-tips-ctrl-038|Swiss lathe synchronization between spindles]]
- [[controller-knowledge-tips-ctrl-071|SINUMERIK Tool Management System]]
- [[controller-knowledge-tips-ctrl-076|Multi-Channel Programming and Channel Synchronization]]
