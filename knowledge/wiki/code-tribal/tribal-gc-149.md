---
name: tribal-gc-149
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["gibbscam", "swiss", "deep-hole", "pecking", "chip-evacuation"]
confidence: 83
source: "web:gibbscam-forum"
promoted_from: knowledge/tribal/gibbscam-cam-tips-gc-149.md
promoted_at: 2026-06-09T22:31:16.351Z
---

# Swiss-type low-pressure coolant nozzle positioning affects chip evacuation in deep bores

For Swiss-type deep-hole drilling (L/D > 5) in GibbsCAM, program peck cycles with chip-break retraction rather than full retraction. The guide bushing provides excellent support, allowing deeper pecks than conventional lathes. Set peck depth to 1-2× drill diameter for steel, 2-3× D for aluminum. Between pecks, retract only 0.5-1.0 mm (chip break) rather than full retract to the guide bushing face. This maintains the drill's piloting in the hole. For through-coolant drills, the coolant flushes chips forward — program 10-20% spindle speed increase during the retract to improve chip evacuation. Post-process verification should confirm the pecking parameters match the control's canned cycle format (G83 vs. G73).

**Category:** cam_strategy
**Confidence:** 83
**Source:** web:gibbscam-forum

## Related
- [[gibbscam-cam-tips-gc-052|Gang tooling layout minimizes tool change time on Swiss machines]]
- [[gibbscam-cam-tips-gc-055|Grooving with peck cycle prevents chip packing in narrow grooves]]
- [[gibbscam-cam-tips-gc-058|Boring operations benefit from fine boring bar with damping for deep holes]]
- [[gibbscam-cam-tips-gc-145|Guide bushing clearance in GibbsCAM Swiss mode affects surface finish and roundness]]
- [[gibbscam-cam-tips-gc-146|Swiss-type sub-spindle backworking in GibbsCAM handles second-operation features]]
