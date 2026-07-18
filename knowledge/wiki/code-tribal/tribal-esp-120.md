---
name: tribal-esp-120
category: code-tribal
subdomain: tooling
domain: tribal-knowledge
tags: ["tool-probing", "length-compensation", "breakage-detection", "tool-setter"]
confidence: 89
source: "web:esprit-probing"
promoted_from: knowledge/tribal/esprit-cam-tips-esp-120.md
promoted_at: 2026-06-09T22:31:16.240Z
---

# Tool Length and Diameter Probing for Compensation

Program automatic tool probing in ESPRIT to measure tool length and diameter on-machine using a tool setter (Renishaw TRS, Blum LaserControl). Probe each tool after loading and before first use to set accurate length offsets. For critical operations, probe the tool after machining to detect wear or breakage — if the tool is shorter than the wear limit, trigger an automatic sister tool change. ESPRIT's post processor inserts the correct probing macro calls for your specific tool setter brand and model.

**Category:** tooling
**Confidence:** 89
**Source:** web:esprit-probing
**Operations:** probing

## Related
- [[solidcam-cam-tips-sc-115|Solid Probe Tool Presetting — Check Tool Length Between Operations]]
- [[surfcam-cam-tips-sc2-205|SURFCAM Tool Length Measurement with Laser Probe]]
- [[bobcad-cam-tips-bc-123|Tool Measurement with On-Machine Probe]]
- [[surfcam-cam-tips-sc2-115|Tool Length Measurement with Laser or Touch Probe]]
