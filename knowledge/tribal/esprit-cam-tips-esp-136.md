---
id: "esp-136"
title: "Swiss-Type Superimposed Axes for Complex Profiles"
source: "web:esprit-forum"
confidence: 0.84
category: "cam_strategy"
tags: ["swiss-type", "superimposed-axes", "citizen", "star", "compound-motion"]
_source: "esprit-cam-tips.ts"
indexed_at: 2026-04-28T01:00:42.566Z
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
