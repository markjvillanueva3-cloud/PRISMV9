---
name: tribal-cat-124
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["catia", "licensing", "3dexperience", "roles", "configuration"]
confidence: 0
source: "web:dassault-forum"
promoted_from: knowledge/tribal/catia-cam-tips-cat-124.md
promoted_at: 2026-06-09T22:31:16.059Z
---

# Licensing Differences Between V5 Machining and 3DEXPERIENCE Roles

V5 machining uses product-based licenses (MD2 for 3-axis, HD2 for 5-axis, LD2 for lathe). 3DEXPERIENCE uses role-based licensing: NC Milling Programmer (3-axis prismatic+surface), NC Multi-Axis Milling Programmer (adds 5-axis), NC Turning Programmer (lathe), NC Machine Builder (machine setup). A common pitfall is purchasing only 'NC Milling Programmer' expecting 5-axis capability — multi-axis surface machining requires the separate NC Multi-Axis role. Check role entitlements via the Compass menu > My Roles before starting programming.

**Category:** cam_strategy
**Confidence:** 0.8
**Source:** web:dassault-forum
**Operations:** setup

## Related
- [[catia-cam-tips-cat-075|Cloud CAM on 3DEXPERIENCE Enables Browser-Based NC Programming]]
- [[catia-cam-tips-cat-076|DELMIA Machining Integration for Shop Floor Connectivity]]
- [[catia-cam-tips-cat-077|Digital Twin Machining Simulation on 3DEXPERIENCE]]
- [[catia-cam-tips-cat-078|Collaborative Machining Enables Multi-User NC Programming]]
- [[catia-cam-tips-cat-079|Data Management and Revision Control for NC Programs]]
