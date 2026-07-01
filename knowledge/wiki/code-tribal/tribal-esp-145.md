---
name: tribal-esp-145
category: code-tribal
subdomain: post_processing
domain: tribal-knowledge
tags: ["robot-machining", "teach-pendant", "offline-programming", "krl", "rapid"]
confidence: 0
source: "web:esprit-docs"
promoted_from: knowledge/tribal/esprit-cam-tips-esp-145.md
promoted_at: 2026-06-09T22:31:16.246Z
---

# Robot Offline Programming with Virtual Teach Pendant

ESPRIT's virtual teach pendant mirrors the physical robot controller interface (KRC for KUKA, iPendant for Fanuc) within the CAM environment. Program complex sequences that combine machining moves (linear/circular interpolation) with robot-specific commands (gripper open/close, sensor checks, I/O signals) without needing the physical robot. The post processor outputs native robot language (KRL, RAPID, LS) rather than G-code. Validate the complete program in simulation before downloading to the cell controller via Ethernet or USB.

**Category:** post_processing
**Confidence:** 0.83
**Source:** web:esprit-docs

## Related
- [[worknc-cam-tips-wnc-075|Offline Programming Eliminates Manual Robot Teaching]]
- [[esprit-cam-tips-esp-139|Robot Machining Path Planning with ESPRIT]]
- [[esprit-cam-tips-esp-140|Robot Machining Stiffness Compensation for Accurate Cutting]]
- [[esprit-cam-tips-esp-142|Robot External Axis Coordination for Large Workpieces]]
- [[esprit-cam-tips-esp-143|Robot Deburring with Force-Controlled End Effector]]
