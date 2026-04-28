---
id: "nx-073"
title: "Blade Finishing with Pressure/Suction Side Control"
source: "web:siemens-nx-docs"
confidence: 87
category: "cam_strategy"
tags: ["siemens-nx", "blade-finishing", "pressure-suction", "turbomachinery", "overlap"]
_source: "nx-cam-tips-ext.ts"
indexed_at: 2026-04-28T01:00:43.379Z
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
