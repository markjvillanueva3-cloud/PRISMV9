---
id: "esp-007"
title: "ProfitMilling Air Cut Minimization with Stock Awareness"
source: "web:esprit-profitmilling"
confidence: 88
category: "cam_strategy"
tags: ["profitmilling", "air-cutting", "rapid-positioning", "linking"]
_source: "esprit-cam-tips.ts"
indexed_at: 2026-04-28T01:00:42.444Z
---

# ProfitMilling Air Cut Minimization with Stock Awareness

Enable ESPRIT's stock-aware rapid positioning to minimize air cutting between ProfitMilling passes. The system tracks the in-process stock boundary and positions rapids just 2-5mm above the actual stock surface rather than retracting to a fixed clearance plane. On parts with significant Z-depth variation, this can save 20-40% of non-cutting time. Combine with 'smooth linking' to replace retracts with smooth arcs between adjacent passes.

**Category:** cam_strategy
**Confidence:** 88
**Source:** web:esprit-profitmilling
**Operations:** roughing

## Related
- [[esprit-cam-tips-esp-006|ProfitMilling Rest Machining from Previous Stock]]
- [[fusion360-cam-tips-ext-f360-109|Stock-Aware Linking Minimizes Air Cutting]]
- [[mastercam-cam-tips-mc-040|Dynamic Mill micro lifts eliminate full retracts between slices]]
- [[mastercam-cam-tips-mc-206|Feed plane position controls where the tool transitions from rapid to feed rate on approach]]
- [[esprit-cam-tips-esp-001|ProfitMilling Constant Engagement Eliminates Load Spikes]]
