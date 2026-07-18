---
name: tribal-nx-073
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["siemens-nx", "blade-finishing", "pressure-suction", "turbomachinery", "overlap"]
confidence: 87
source: "web:siemens-nx-docs"
promoted_from: knowledge/tribal/nx-cam-tips-ext-nx-073.md
promoted_at: 2026-06-09T22:31:16.480Z
---

# Blade Finishing with Pressure/Suction Side Control

NX Turbomachinery Blade Finishing allows separate programming of pressure and suction sides with independent step-over, tool axis, and feed rate parameters. Machine the pressure side (concave) first as it typically requires more aggressive tool tilting to avoid collisions. Use a smaller step-over (0.3-0.5 mm) on the suction side where the convex surface creates thinner cuts. Set leading/trailing edge overlap to 1.5 mm to prevent undercut at blade boundaries.

**Category:** cam_strategy
**Confidence:** 87
**Source:** web:siemens-nx-docs
**Operations:** finishing, 5-axis

## Related
- [[nx-cam-tips-ext-nx-065|Hub Machining with Floor Extension for Fillet Access]]
- [[nx-cam-tips-ext-nx-071|Blisk Roughing with Plunge-Then-Slot Strategy]]
- [[nx-cam-tips-ext-nx-072|Hub Finishing with Constant-Scallop Step-Over]]
- [[nx-cam-tips-ext-nx-074|Splitter Blade Handling with Reduced Tool Diameters]]
- [[nx-cam-tips-nx-041|Turbomachinery Hub and Blade Finishing Processors]]
