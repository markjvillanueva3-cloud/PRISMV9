---
name: tribal-bc-135
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["v36", "hsm-output", "arc-fitting", "nurbs", "chord-tolerance"]
confidence: 0
source: "web:bobcad-docs"
promoted_from: knowledge/tribal/bobcad-cam-tips-bc-135.md
promoted_at: 2026-06-09T22:31:15.965Z
---

# BobCAD V36 High-Speed Machining Output Optimization

V36's HSM output mode smooths toolpath point spacing and inserts arc segments to enable CNC controllers to maintain high feed rates. Enable HSM under Machine Settings > Output Mode. Set the chord tolerance to 0.005-0.01mm — tighter tolerance produces more points but may cause controller buffer underrun on older CNCs. Arc fitting reduces program size by 40-60% while maintaining accuracy. For Fanuc 31i and newer controls, enable NURBS output (G06.2) for the smoothest possible motion. Test HSM output on a curved test part to verify surface finish quality.

**Category:** cam_strategy
**Confidence:** 0.88
**Source:** web:bobcad-docs
**Operations:** finishing, hsm

## Related
- [[bobcad-cam-tips-bc-129|BobCAD V36 Dynamic Machining Maintains Constant Chip Load]]
- [[bobcad-cam-tips-bc-130|BobCAD V36 Advanced Toolpath Simulation with G-Code Verification]]
- [[bobcad-cam-tips-bc-132|BobCAD V36 Rest Machining with Stock Model Tracking]]
- [[bobcad-cam-tips-bc-133|BobCAD V36 Multiaxis Deburring Toolpath Strategy]]
- [[bobcad-cam-tips-bc-137|BobCAD V36 Operation Cloning for Multi-Feature Parts]]
