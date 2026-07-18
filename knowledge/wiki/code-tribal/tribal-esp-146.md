---
name: tribal-esp-146
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["mill-turn", "balanced-turning", "dual-turret", "synchronization", "roughing"]
confidence: 0
source: "web:esprit-docs"
promoted_from: knowledge/tribal/esprit-cam-tips-esp-146.md
promoted_at: 2026-06-09T22:31:16.246Z
---

# Mill-Turn Balanced Roughing with Dual Turrets

On dual-turret mill-turn machines (DMG Mori NTX, Mazak Integrex, Okuma Multus), ESPRIT's balanced turning splits roughing between upper and lower turrets working simultaneously on the same workpiece. The SyncChart divides axial depth equally between turrets, with a 180° phase offset to balance cutting forces. This halves roughing cycle time and reduces workpiece deflection from radial forces. Configure under Turning → Balanced Cut with turret assignment and phase angle. Ensure both tools are identical to maintain symmetric force balance.

**Category:** cam_strategy
**Confidence:** 0.88
**Source:** web:esprit-docs
**Operations:** turning_roughing

## Related
- [[bobcad-cam-tips-bc-145|BobCAD Mill-Turn Dual-Spindle Part Transfer Programming]]
- [[bobcad-cam-tips-bc-148|BobCAD Mill-Turn Synchronization Timeline for Overlapping Operations]]
- [[bobcad-cam-tips-bc-152|BobCAD Mill-Turn Turret Management and Tool Station Assignment]]
- [[controller-knowledge-tips-ctrl-076|Multi-Channel Programming and Channel Synchronization]]
- [[edgecam-cam-tips-ec-145|Code Wizard Multi-Channel Output for Mill-Turn]]
