---
name: tribal-mc-296
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["mastercam", "dynamic-motion", "micro-retract", "deep-pocket", "cycle-time", "linking"]
confidence: 85
source: "web:mastercam-forum"
promoted_from: knowledge/tribal/mastercam-cam-tips-mc-296.md
promoted_at: 2026-06-09T22:31:16.470Z
---

# Mastercam Dynamic Motion micro-retract height tuning minimizes air-cut time in deep pocket roughing

In deep pocket roughing with Dynamic Motion, the micro-retract height between passes significantly affects cycle time. The default micro-retract (1.0 mm above the previous cut) is conservative and adds 3-5 seconds per retract on deep pockets with many passes. For stable setups with good chip evacuation (through-spindle coolant, adequate flute length), reduce the micro-retract to 0.25-0.5 mm. For interrupted cuts (keyway slots, pockets with islands), keep micro-retract at 1.0-2.0 mm to ensure the tool clears any chips trapped on the workpiece surface. In Mastercam, adjust via Toolpath Parameters > Linking Parameters > Micro Lift Distance. On a 100 mm deep pocket with 2 mm stepdown (50 passes), reducing micro-retract from 1.0 mm to 0.3 mm saves approximately 2-4 minutes of cycle time by reducing the total retract distance from 50 mm to 15 mm.

**Category:** cam_strategy
**Confidence:** 85
**Source:** web:mastercam-forum
**Operations:** roughing, 2d_pocket

## Related
- [[mastercam-cam-tips-mc-139|Micro-retract minimization in hard milling prevents re-engagement shock on brittle tools]]
- [[mastercam-cam-tips-mc-207|Retract height optimization uses incremental mode to minimize vertical travel on variable-height parts]]
- [[mastercam-cam-tips-mc-040|Dynamic Mill micro lifts eliminate full retracts between slices]]
- [[mastercam-cam-tips-mc-046|Dynamic Motion entry helix diameter should be 80-125% of tool diameter]]
- [[mastercam-cam-tips-mc-049|Core Rough targets island walls specifically for reduced cycle time]]
