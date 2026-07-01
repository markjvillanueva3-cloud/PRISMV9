---
name: tribal-mc-089
category: code-tribal
subdomain: post_processor
domain: tribal-knowledge
tags: ["mastercam", "machine-definition", "kinematic-chain", "table-table", "head-table", "simulation"]
confidence: 88
source: "web:community"
promoted_from: knowledge/tribal/mastercam-cam-tips-mc-089.md
promoted_at: 2026-06-09T22:31:16.417Z
---

# Machine Definition kinematic chain must exactly match physical machine for simulation

Mastercam Machine Definition specifies the kinematic chain (which axes are stacked on which) for simulation and post-processing. A table-table machine (A on B) behaves differently from a head-table machine (A head, C table) even with identical axis travel. Wrong kinematic chain causes simulation to show correct motion but the posted code moves incorrectly on the real machine. Verify by commanding a known orientation (e.g., A45 B0) and checking that the tool points the same direction in simulation and on the machine.

**Category:** post_processor
**Confidence:** 88
**Source:** web:community
**Operations:** post_processing, multiaxis

## Related
- [[mastercam-cam-tips-mc-299|Mastercam machine definition accuracy settings must match actual machine capability for reliable simulation]]
- [[solidcam-cam-tips-sc-096|Kinematic Chain Configuration — Correct Joint Order for Your Machine]]
- [[mastercam-cam-tips-mc-112|Probe moves must be verified in simulation to prevent probe tip crashes]]
- [[mastercam-cam-tips-mc-150|Gang tooling layout in Swiss machining requires careful clearance planning for simultaneous cuts]]
- [[mastercam-cam-tips-mc-223|Batch verification runs Machine Simulation on all operations unattended for overnight checking]]
