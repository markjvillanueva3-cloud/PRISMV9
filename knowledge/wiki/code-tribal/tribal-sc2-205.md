---
name: tribal-sc2-205
category: code-tribal
subdomain: setup
domain: tribal-knowledge
tags: ["tool-measurement", "laser-probe", "tool-length", "breakage-detection", "h-offset"]
confidence: 0
source: "web:surfcam-docs"
promoted_from: knowledge/tribal/surfcam-cam-tips-sc2-205.md
promoted_at: 2026-06-09T22:31:16.704Z
---

# SURFCAM Tool Length Measurement with Laser Probe

SURFCAM's post processor supports automatic tool length measurement using laser or touch probes mounted on the machine table. Program a tool measurement cycle after each tool change: rapid to the probe location, measure tool length, and update the H offset. For laser probes, set the measurement RPM to match the cutting RPM to account for tool growth at speed. The post outputs the appropriate G-codes (G37 for Fanuc, TOOL CALL with probe cycle for Heidenhain). Include tool breakage detection — if measured length differs from expected by >0.5mm, halt the program with an alarm.

**Category:** setup
**Confidence:** 0.86
**Source:** web:surfcam-docs
**Operations:** probing

## Related
- [[mastercam-cam-tips-mc-109|Tool measurement probing verifies tool length and radius before cutting]]
- [[bobcad-cam-tips-bc-123|Tool Measurement with On-Machine Probe]]
- [[camworks-cam-tips-cw-116|Tool Measurement Probing — Verify Tool Length and Diameter On-Machine]]
- [[camworks-cam-tips-cw-200|Tool Length and Diameter Measurement — Laser and Touch Probes]]
- [[controller-knowledge-tips-ctrl-054|Fanuc G37 automatic tool length measurement]]
