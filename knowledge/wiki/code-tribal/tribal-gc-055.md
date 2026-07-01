---
name: tribal-gc-055
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["gibbscam", "turning", "grooving", "peck-cycle", "chip-evacuation"]
confidence: 86
source: "web:gibbscam-docs"
promoted_from: knowledge/tribal/gibbscam-cam-tips-gc-055.md
promoted_at: 2026-06-09T22:31:16.326Z
---

# Grooving with peck cycle prevents chip packing in narrow grooves

For grooves narrower than 3mm in GibbsCAM, enable the pecking cycle to retract the tool periodically for chip evacuation. Set the peck depth to 0.5-1.0mm per plunge for steel and 1.0-2.0mm for aluminum. The retract height should be 0.5mm above the previous peck depth to break the chip without losing the reference position. For face grooves (radial), reduce the peck depth by 30% because the effective chip area increases with diameter. Enable coolant-through if available—chip packing in narrow grooves is the #1 cause of tool breakage in grooving operations.

**Category:** cam_strategy
**Confidence:** 86
**Source:** web:gibbscam-docs

## Related
- [[fusion360-cam-tips-ext-f360-076|Grooving with Peck Cycle for Deep Narrow Slots]]
- [[fusion360-cam-tips-ext-f360-129|Turning Grooving with Peck Cycle]]
- [[gibbscam-cam-tips-gc-053|Rough turning with constant chip load adapts feed to varying diameter]]
- [[gibbscam-cam-tips-gc-054|Finish turning spring pass removes deflection error from the first pass]]
- [[gibbscam-cam-tips-gc-056|Threading with multiple passes uses decreasing infeed for surface quality]]
