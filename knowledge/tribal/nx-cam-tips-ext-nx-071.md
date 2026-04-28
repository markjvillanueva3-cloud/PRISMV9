---
id: "nx-071"
title: "Blisk Roughing with Plunge-Then-Slot Strategy"
source: "web:siemens-nx-docs"
confidence: 86
category: "cam_strategy"
tags: ["siemens-nx", "blisk-roughing", "plunge-slot", "turbomachinery", "titanium"]
_source: "nx-cam-tips-ext.ts"
indexed_at: 2026-04-28T01:00:43.378Z
---

# Blisk Roughing with Plunge-Then-Slot Strategy

For blisk roughing in NX Turbomachinery Milling, use the Plunge then Slot strategy on narrow channels (< 2x tool diameter). NX first plunges to depth at multiple positions along the channel, then slots between plunge holes to remove remaining webs. This reduces radial cutting forces by 60% compared to direct slotting and prevents tool breakage on titanium and nickel alloys. Set plunge spacing to 70% of tool diameter for complete web removal.

**Category:** cam_strategy
**Confidence:** 86
**Source:** web:siemens-nx-docs
**Operations:** roughing, 5-axis

## Related
- [[nx-cam-tips-ext-nx-065|Hub Machining with Floor Extension for Fillet Access]]
- [[nx-cam-tips-ext-nx-072|Hub Finishing with Constant-Scallop Step-Over]]
- [[nx-cam-tips-ext-nx-073|Blade Finishing with Pressure/Suction Side Control]]
- [[nx-cam-tips-ext-nx-074|Splitter Blade Handling with Reduced Tool Diameters]]
- [[nx-cam-tips-ext-nx-043|VBM Level-Based Roughing with Variable Cut Depths]]
