---
id: "sc2-012"
title: "Pocket Milling with Island Detection and Multi-Pass Strategy"
source: "web:surfcam-2axis-pocket"
confidence: 90
category: "cam_strategy"
tags: ["pocketing", "islands", "multi-pass", "chip-evacuation"]
_source: "surfcam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.041Z
---

# Pocket Milling with Island Detection and Multi-Pass Strategy

SURFCAM pocket milling automatically detects islands (bosses) within pocket boundaries and generates toolpaths that clear around them. For multi-level pockets, set Z-level step-down to 1xD for roughing with 0.3mm radial stock for finishing. Use spiral-out pattern for blind pockets (best chip evacuation) and offset pattern for open pockets (fastest cycle time). Enable 'Machine islands first' to prevent tool deflection from uncut stock surrounding narrow island features.

**Category:** cam_strategy
**Confidence:** 90
**Source:** web:surfcam-2axis-pocket
**Operations:** pocketing, 2.5d_milling

## Related
- [[edgecam-cam-tips-ec-012|Pocketing with Island Detection and Offset Strategy]]
- [[bobcad-cam-tips-bc-012|Pocket Milling with Gouge Check for Neighboring Walls]]
- [[catia-cam-tips-cat-001|Pocketing Spiral vs Zigzag Tool Path Style Selection]]
- [[edgecam-cam-tips-ec-051|Wire EDM No-Core Pocketing for Small Features]]
- [[esprit-cam-tips-esp-010|ProfitMilling Slot Pass Control in ESPRIT EDGE 2025]]
