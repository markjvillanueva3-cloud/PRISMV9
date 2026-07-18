---
name: tribal-esp-136
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["swiss-type", "superimposed-axes", "citizen", "star", "compound-motion"]
confidence: 0
source: "web:esprit-forum"
promoted_from: knowledge/tribal/esprit-cam-tips-esp-136.md
promoted_at: 2026-06-09T22:31:16.244Z
---

# Swiss-Type Superimposed Axes for Complex Profiles

Advanced Swiss-type lathes (Citizen L32/M32, Star SR-38) support superimposed axes where the gang slide X1/Z1 and turret X2/Z2 move simultaneously on the same workpiece. In ESPRIT, enable superimposed mode in Machine Configuration → Axis Coupling. This allows complex profiles: the turret holds a stationary form tool while the gang slide moves the part past it, or both axes interpolate together for compound angles. The post processor handles the axis summation and ensures no axis-limit violations during superimposed motion.

**Category:** cam_strategy
**Confidence:** 0.84
**Source:** web:esprit-forum
**Operations:** turning_finishing, turning_roughing

## Related
- [[esprit-cam-tips-esp-047|Channel Programming for Citizen/Star/Tornos Swiss Machines]]
- [[esprit-cam-tips-esp-129|Swiss-Type Multi-Channel Synchronization with SyncChart]]
- [[esprit-cam-tips-esp-137|Swiss-Type Low-Frequency Vibration Cutting for Chip Breaking]]
- [[solidcam-cam-tips-sc-153-2|Kienzle Force Verification for iMachining]]
- [[controller-knowledge-tips-ctrl-038|Swiss lathe synchronization between spindles]]
