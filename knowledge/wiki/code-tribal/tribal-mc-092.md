---
name: tribal-mc-092
category: code-tribal
subdomain: quality
domain: tribal-knowledge
tags: ["mastercam", "machine-simulation", "over-travel", "axis-limits", "verify", "collision"]
confidence: 88
source: "web:mastercam-docs"
promoted_from: knowledge/tribal/mastercam-cam-tips-mc-092.md
promoted_at: 2026-06-09T22:31:16.418Z
---

# Machine Simulation detects axis over-travel that Verify completely misses

Mastercam Verify only checks tool-to-part and tool-to-fixture collisions using the tool/holder envelope. Machine Simulation additionally checks all machine components (spindle head, column, table, rotary units, enclosure) and validates axis travel limits. A toolpath can pass Verify with zero collisions but fail Machine Simulation due to Y-axis over-travel or A-axis exceeding +/-110 degrees. Always run Machine Simulation for 4+ axis jobs — Verify alone gives a false sense of safety.

**Category:** quality
**Confidence:** 88
**Source:** web:mastercam-docs
**Operations:** verification, multiaxis

## Related
- [[mastercam-cam-tips-mc-266|Mastercam Simulator steady-rest and tailstock collision zones prevent crashes during mill-turn verification]]
- [[mastercam-cam-tips-mc-274|Custom tool holders in Tool Manager prevent false collision reports with non-standard holder geometries]]
- [[mastercam-cam-tips-mc-297|Mastercam verify comparison mode overlays nominal model to quantify actual material remaining after machining]]
- [[mastercam-cam-tips-mc-299|Mastercam machine definition accuracy settings must match actual machine capability for reliable simulation]]
- [[wedm-knowledge-tips-wedm-mcam-001-2|Wire overburn decreases progressively per pass — 0.035→0.02→0.01→0]]
