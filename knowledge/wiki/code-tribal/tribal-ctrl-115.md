---
name: tribal-ctrl-115
category: code-tribal
subdomain: programming
domain: tribal-knowledge
tags: ["controller", "index", "multi-spindle", "INDEXoperate", "virtual-machine", "dual-controller"]
confidence: 80
source: "controller:web_research"
promoted_from: knowledge/tribal/controller-knowledge-tips-ctrl-115.md
promoted_at: 2026-06-09T22:31:16.159Z
---

# Index C200 dual-controller option and INDEXoperate interface

The Index C200 production turning machine offers a choice between Siemens 840D sl (18.5" multi-touch) or Fanuc 31i-B (15" touchscreen). The Siemens variant features INDEXoperate, a custom user interface designed specifically for Index multi-spindle lathes. The C200 supports 2-3 turrets with 42 tool stations (VDI25), and can be configured with 2 Y-axes on the main spindle or 1 each on main/counter spindles. All setup data is stored with the part program for fast job changes. INDEX Virtual Machine (optional) provides an identical digital twin with genuine Siemens 840D control, all machine parameters, and full 3D collision checking — enabling production-parallel setup of the next job. When programming, use the built-in block-time measuring and part-production-time evaluation to optimize cycle times. Always create programs using INDEX's virtual machine first to avoid crashes on the physical machine.

**Category:** programming
**Confidence:** 80
**Source:** controller:web_research

## Related
- [[controller-knowledge-tips-ctrl-121|Index/Traub virtual machine for collision-free multi-spindle setup]]
- [[controller-knowledge-tips-ctrl-071|SINUMERIK Tool Management System]]
- [[controller-knowledge-tips-ctrl-076|Multi-Channel Programming and Channel Synchronization]]
- [[controller-knowledge-tips-ctrl-043|Index C200 multi-spindle programming with virtual axes]]
- [[camworks-cam-tips-cw-085|Post Customization — Modify Output Format for Your Controller]]
