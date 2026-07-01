---
name: tribal-nx-041
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["nx", "turbomachinery", "hub-finishing", "blade-finishing", "fillet"]
confidence: 84
source: "web:siemens-docs"
promoted_from: knowledge/tribal/nx-cam-tips-nx-041.md
promoted_at: 2026-06-09T22:31:16.528Z
---

# Turbomachinery Hub and Blade Finishing Processors

NX provides separate finishing processors for hub, blade, and fillet surfaces on blisks and impellers. Each processor is tuned for its target geometry — hub finishing follows the flow path, blade finishing uses swarf or point-contact strategies, and fillet finishing uses small-diameter tools with gouge protection. Never try to finish all three with a single generic operation.

**Category:** cam_strategy
**Confidence:** 84
**Source:** web:siemens-docs
**Operations:** finishing, 5-axis

## Related
- [[nx-cam-tips-nx-040|Turbomachinery Multi-Blade Roughing Between Blades]]
- [[nx-cam-tips-nx-042|Turbomachinery Splitter Blade Support]]
- [[nx-cam-tips-ext-nx-065|Hub Machining with Floor Extension for Fillet Access]]
- [[nx-cam-tips-ext-nx-072|Hub Finishing with Constant-Scallop Step-Over]]
- [[nx-cam-tips-ext-nx-073|Blade Finishing with Pressure/Suction Side Control]]
