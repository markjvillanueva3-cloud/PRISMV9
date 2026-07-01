---
name: tribal-gc-172
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["gibbscam", "gear-milling", "spur-gear", "disk-cutter", "c-axis"]
confidence: 81
source: "web:gibbscam-docs"
promoted_from: knowledge/tribal/gibbscam-cam-tips-gc-172.md
promoted_at: 2026-06-09T22:31:16.357Z
---

# GibbsCAM spur gear milling with disk cutter uses indexed C-axis positioning

For low-volume spur gear production on CNC mills or multi-task machines, GibbsCAM programs gear milling with a disk-shaped involute cutter. The C-axis indexes the workpiece to each tooth position, and the cutter traverses across the face width at the calculated depth. Program the tooth spacing as 360°/N (where N is the number of teeth) and set the depth to 2.25× module. Use climb milling for each tooth slot. For gears with more than 20 teeth, the disk cutter profile must match the specific tooth count — using the wrong cutter number produces involute errors. GibbsCAM's tool library should store each disk cutter (1-8 per module) with its specific profile.

**Category:** cam_strategy
**Confidence:** 81
**Source:** web:gibbscam-docs

## Related
- [[gibbscam-cam-tips-gc-047|C-axis milling converts the lathe spindle into a rotary positioning axis]]
- [[gibbscam-cam-tips-gc-141|MTM C-axis milling on the sub-spindle requires transformed coordinate origin]]
- [[gibbscam-cam-tips-gc-001|Use Solid Face Selection for profiling to avoid manual geometry creation]]
- [[gibbscam-cam-tips-gc-002|Set pocket corner radius larger than cutter radius for smoother engagement]]
- [[gibbscam-cam-tips-gc-003|Facing operations benefit from climb milling with 65-75% stepover]]
