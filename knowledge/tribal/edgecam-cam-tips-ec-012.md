---
id: "ec-012"
title: "Pocketing with Island Detection and Offset Strategy"
source: "web:edgecam-milling"
confidence: 88
category: "cam_strategy"
tags: ["pocketing", "islands", "offset-pattern", "finishing-allowance"]
_source: "edgecam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:42.258Z
---

# Pocketing with Island Detection and Offset Strategy

Edgecam's pocketing automatically detects islands (bosses) within pocket boundaries. Use offset (outward spiral) pattern for general pocketing and raster pattern for simple rectangular pockets. Set the finishing pass allowance to 0.1-0.3mm and enable a separate finishing pass at full pocket depth. For pockets with multiple islands, verify the tool can fit between islands — Edgecam flags areas narrower than the tool diameter.

**Category:** cam_strategy
**Confidence:** 88
**Source:** web:edgecam-milling
**Operations:** pocketing

## Related
- [[surfcam-cam-tips-sc2-012|Pocket Milling with Island Detection and Multi-Pass Strategy]]
- [[bobcad-cam-tips-bc-012|Pocket Milling with Gouge Check for Neighboring Walls]]
- [[catia-cam-tips-cat-001|Pocketing Spiral vs Zigzag Tool Path Style Selection]]
- [[edgecam-cam-tips-ec-051|Wire EDM No-Core Pocketing for Small Features]]
- [[esprit-cam-tips-esp-010|ProfitMilling Slot Pass Control in ESPRIT EDGE 2025]]
