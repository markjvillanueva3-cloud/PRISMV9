---
id: "nx-065"
title: "Hub Machining with Floor Extension for Fillet Access"
source: "web:siemens-nx-docs"
confidence: 84
category: "cam_strategy"
tags: ["siemens-nx", "hub-machining", "path-extension", "fillet", "turbomachinery"]
_source: "nx-cam-tips-ext.ts"
indexed_at: 2026-04-28T01:00:43.373Z
---

# Hub Machining with Floor Extension for Fillet Access

When finishing blisk or impeller hubs, enable Path Extension in the Hub Finishing processor to extend toolpath passes beyond the blade root fillets by 1-2 mm. Without extension, the tool retracts at the fillet boundary leaving a witness line. Set the extension method to Tangent so the tool continues along the surface tangent direction, producing seamless transitions between the hub and blade root fillet areas.

**Category:** cam_strategy
**Confidence:** 84
**Source:** web:siemens-nx-docs
**Operations:** finishing, 5-axis

## Related
- [[nx-cam-tips-ext-nx-071|Blisk Roughing with Plunge-Then-Slot Strategy]]
- [[nx-cam-tips-ext-nx-072|Hub Finishing with Constant-Scallop Step-Over]]
- [[nx-cam-tips-ext-nx-073|Blade Finishing with Pressure/Suction Side Control]]
- [[nx-cam-tips-ext-nx-074|Splitter Blade Handling with Reduced Tool Diameters]]
- [[nx-cam-tips-nx-041|Turbomachinery Hub and Blade Finishing Processors]]
