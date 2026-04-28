---
id: "esp-145"
title: "Robot Offline Programming with Virtual Teach Pendant"
source: "web:esprit-docs"
confidence: 0.83
category: "post_processing"
tags: ["robot-machining", "teach-pendant", "offline-programming", "krl", "rapid"]
_source: "esprit-cam-tips.ts"
indexed_at: 2026-04-28T01:00:42.573Z
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
