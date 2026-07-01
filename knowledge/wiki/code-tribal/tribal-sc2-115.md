---
name: tribal-sc2-115
category: code-tribal
subdomain: probing
domain: tribal-knowledge
tags: ["tool-measurement", "laser", "tool-setter", "length-offset", "wear"]
confidence: 86
source: "web:surfcam-tool-measurement"
promoted_from: knowledge/tribal/surfcam-cam-tips-sc2-115.md
promoted_at: 2026-06-09T22:31:16.685Z
---

# Tool Length Measurement with Laser or Touch Probe

SURFCAM can program automatic tool length measurement cycles using the machine's tool setter (laser or touch probe on the table). Insert a tool measurement cycle before the first cut with each tool. The measured length is stored in the tool length offset register. For critical tools (finishing cutters), program a secondary measurement after a set number of minutes of cutting to detect wear and adjust the offset automatically.

**Category:** probing
**Confidence:** 86
**Source:** web:surfcam-tool-measurement
**Operations:** probing, setup

## Related
- [[bobcad-cam-tips-bc-123|Tool Measurement with On-Machine Probe]]
- [[camworks-cam-tips-cw-200|Tool Length and Diameter Measurement — Laser and Touch Probes]]
- [[gibbscam-cam-tips-gc-116|Tool measurement probing sets length and diameter offsets automatically]]
- [[camworks-cam-tips-cw-116|Tool Measurement Probing — Verify Tool Length and Diameter On-Machine]]
- [[controller-knowledge-tips-ctrl-054|Fanuc G37 automatic tool length measurement]]
