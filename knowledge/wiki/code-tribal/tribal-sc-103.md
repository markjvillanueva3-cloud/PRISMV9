---
name: tribal-sc-103
category: code-tribal
subdomain: tooling
domain: tribal-knowledge
tags: ["solidcam", "tool-holder", "multi-section", "collision", "profile"]
confidence: 89
source: "web:solidcam-docs"
promoted_from: knowledge/tribal/solidcam-cam-tips-sc-103.md
promoted_at: 2026-06-09T22:31:16.594Z
---

# Holder Definitions — Multi-Section Profile for Accurate Collision Checking

Define tool holders with multiple diameter sections (taper, body, nut, collet protrusion) in SolidCAM's holder editor rather than using a single simplified cylinder. A BT40 holder with ER32 collet has at least 5 distinct diameter sections. The collision avoidance algorithm uses the holder profile at every toolpath point — a simplified cylinder that is too large triggers false collisions, while one that is too small allows actual collisions. Import holder profiles from manufacturer DXF/STEP files when available.

**Category:** tooling
**Confidence:** 89
**Source:** web:solidcam-docs
**Operations:** tool_management, simulation

## Related
- [[solidcam-cam-tips-sc-049|iMachining 2D Profile Pass — Add Finish Allowance Correctly]]
- [[solidcam-cam-tips-sc-055|iMachining 3D Undercut Detection — Avoid Gouging on Draft Angles]]
- [[solidcam-cam-tips-sc-092|Machine Simulation Setup — Import Exact Machine STL Models]]
- [[solidcam-cam-tips-sc-095|Tool Holder Verification — Simulate Complete Tool Assembly]]
- [[solidcam-cam-tips-sc-098|Assembly Machining — Reference Fixture Bodies for Collision Avoidance]]
