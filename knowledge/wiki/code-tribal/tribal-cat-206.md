---
name: tribal-cat-206
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["catia", "plm", "version-control", "lifecycle", "release"]
confidence: 0
source: "web:dassault-forum"
promoted_from: knowledge/tribal/catia-cam-tips-cat-206.md
promoted_at: 2026-06-09T22:31:16.079Z
---

# PLM-Based NC Program Version Control and Release Process

In 3DEXPERIENCE, NC programs are PLM objects with lifecycle states: In Work → Frozen → Released → Obsolete. While 'In Work', programmers can freely modify operations and recompute tool paths. 'Frozen' locks the program for validation (simulation, first article). 'Released' makes it available to the shop floor via the Manufacturing Execution System (MES) interface. Use 'Branching' to create variant programs (e.g., machine-specific versions of the same part program) without duplicating — the branch shares common operations and only diverges where machine differences require it. All lifecycle transitions are audited with timestamps and user IDs for regulatory compliance.

**Category:** cam_strategy
**Confidence:** 0.84
**Source:** web:dassault-forum
**Operations:** automation

## Related
- [[catia-cam-tips-cat-079|Data Management and Revision Control for NC Programs]]
- [[catia-cam-tips-cat-122|3DEXPERIENCE Collaborative Manufacturing vs V5 Standalone Workflow]]
- [[catia-cam-tips-cat-202|Digital Thread Traceability from Design to G-Code in CATIA]]
- [[nx-cam-tips-ext-nx-125|Teamcenter Integration for Manufacturing PLM]]
- [[nx-cam-tips-ext-nx-198|Digital Thread via Teamcenter]]
