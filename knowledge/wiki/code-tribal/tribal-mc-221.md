---
name: tribal-mc-221
category: code-tribal
subdomain: quality
domain: tribal-knowledge
tags: ["mastercam", "tool-list", "export", "tool-crib", "preparation", "bom"]
confidence: 84
source: "web:community"
promoted_from: knowledge/tribal/mastercam-cam-tips-mc-221.md
promoted_at: 2026-06-09T22:31:16.449Z
---

# Tool list export provides BOM for tool crib preparation before job reaches the machine

Before a job reaches the machine, the tool crib needs to prepare all required tools and holders. Mastercam's Tool List report exports a complete bill of materials: tool number, tool type, diameter, length, holder type, projection length, number of flutes, and which operations use each tool. Export the tool list as a PDF, Excel, or HTML file and send it to the tool crib 1–2 hours before the job is scheduled. This enables the tool crib to pre-stage the complete tool package, including pre-setting tool lengths on a tool presetter. For shops with tool vending machines, the tool list can be cross-referenced against vending inventory to identify tools that need to be ordered. Include the minimum tool life (estimated number of parts per tool) so the crib prepares backup tools for long production runs.

**Category:** quality
**Confidence:** 84
**Source:** web:community
**Operations:** setup, documentation

## Related
- [[mastercam-cam-tips-mc-220|Setup sheet creation in Mastercam documents fixture, tool, and origin information for operators]]
- [[mastercam-cam-tips-mc-300|Mastercam toolpath verification export to VERICUT enables physics-based force simulation and optimization]]
- [[wedm-knowledge-tips-wedm-mcam-001-2|Wire overburn decreases progressively per pass — 0.035→0.02→0.01→0]]
- [[wedm-knowledge-tips-wedm-mcam-003-2|Lead-in/lead-out with arcs reduces burrs — Line+Arc in, Arc+Line out]]
- [[mastercam-cam-tips-mc-040|Dynamic Mill micro lifts eliminate full retracts between slices]]
