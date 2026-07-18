---
name: tribal-cat-167
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["catia", "simulation", "gcode", "playback", "post-verification"]
confidence: 0
source: "web:dassault-forum"
promoted_from: knowledge/tribal/catia-cam-tips-cat-167.md
promoted_at: 2026-06-09T22:31:16.070Z
---

# G-Code Playback Simulation Directly in CATIA

CATIA can simulate actual G-code (post-processed output) rather than just the CL data (cutter location) tool path. In NC Manufacturing Review, import the G-code file and associate it with the machine definition. CATIA's G-code interpreter parses the code, resolves macro variables, canned cycles, and sub-programs, then animates the machine model. This catches post-processor errors that CL-level simulation misses: incorrect arc interpolation (G02/G03), wrong plane selection (G17/G18/G19), missing tool length compensation (G43), and improperly formatted multi-axis output. Always simulate the posted G-code, not just the CL data.

**Category:** cam_strategy
**Confidence:** 0.85
**Source:** web:dassault-forum
**Operations:** simulation

## Related
- [[catia-cam-tips-cat-051|NC Machine Simulation Requires Complete Machine Model]]
- [[catia-cam-tips-cat-052|Material Removal Simulation Video Mode vs Photo Mode]]
- [[catia-cam-tips-cat-055|Stock Model Accuracy Affects Simulation Fidelity]]
- [[catia-cam-tips-cat-056|Gouge Detection Sensitivity Settings for Different Operations]]
- [[catia-cam-tips-cat-077|Digital Twin Machining Simulation on 3DEXPERIENCE]]
