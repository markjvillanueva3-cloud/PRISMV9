---
name: tribal-nx-071
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["siemens-nx", "blisk-roughing", "plunge-slot", "turbomachinery", "titanium"]
confidence: 86
source: "web:siemens-nx-docs"
promoted_from: knowledge/tribal/nx-cam-tips-ext-nx-071.md
promoted_at: 2026-06-09T22:31:16.480Z
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
