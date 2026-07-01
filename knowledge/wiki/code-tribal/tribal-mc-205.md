---
name: tribal-mc-205
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["mastercam", "work-offset", "g54", "coordinate-system", "fixture", "datum"]
confidence: 87
source: "web:mastercam-docs"
promoted_from: knowledge/tribal/mastercam-cam-tips-mc-205.md
promoted_at: 2026-06-09T22:31:16.446Z
---

# Workpiece coordinate systems (G54-G59) separate part location from program geometry

In Mastercam, the Work Offset setting (G54, G55, G56, etc.) in each operation determines which work coordinate system the CNC control uses to locate the program origin on the machine. G54 is typically the primary setup, with G55-G59 for additional setups or parts on the same fixture. For more than 6 setups, use extended work offsets (G54.1 P1 through P48 on FANUC-compatible controls). In Machine Group Properties, set the default Work Offset for the group. Individual operations can override this — useful when one setup machines features referenced to different datums. Always verify that the work offset in Mastercam matches the physical offset stored in the CNC control. A work offset mismatch causes the tool to cut in the wrong location — potentially crashing into the fixture. For multi-part fixtures (vise with 2 parts), use G54 for part 1 and G55 for part 2, with the same operations posted twice with different work offsets.

**Category:** cam_strategy
**Confidence:** 87
**Source:** web:mastercam-docs
**Operations:** setup

## Related
- [[wedm-knowledge-tips-wedm-mcam-001-2|Wire overburn decreases progressively per pass — 0.035→0.02→0.01→0]]
- [[mastercam-cam-tips-mc-108|Part probing with Renishaw Productivity+ sets WCS from measured features]]
- [[mastercam-cam-tips-mc-220|Setup sheet creation in Mastercam documents fixture, tool, and origin information for operators]]
- [[wedm-knowledge-tips-wedm-mcam-003-2|Lead-in/lead-out with arcs reduces burrs — Line+Arc in, Arc+Line out]]
- [[gibbscam-cam-tips-gc-115|Part setup probing establishes datum positions automatically on the machine]]
