---
id: "cim-049"
title: "EROWA/System 3R Pallet Integration"
source: "web:cimatron-docs"
confidence: 0.87
category: "cam_strategy"
tags: ["erowa", "system-3r", "pallet", "automation"]
_source: "cimatron-cam-tips.ts"
indexed_at: 2026-04-28T01:00:42.021Z
---

# EROWA/System 3R Pallet Integration

Configure Cimatron's coordinate systems to match EROWA/System 3R pallet reference points. Store pallet-specific offsets in the tool library. When programming electrodes, assign each electrode to a specific pallet position — the post processor outputs the correct G54-G59 offset. This enables unattended electrode changing on EDM machines. Pallet repeatability: ±0.002mm with proper maintenance.

**Category:** cam_strategy
**Confidence:** 0.87
**Source:** web:cimatron-docs
**Operations:** setup

## Related
- [[topsolid-cam-tips-ts-155|TopSolid EROWA/System 3R Holder Integration — Pallet Reference Systems]]
- [[topsolid-cam-tips-ts-059|Electrode Holder Interface with Standard Systems]]
- [[worknc-cam-tips-wnc-150|Electrode Datum and Holder Setup — EROWA/System 3R Integration]]
- [[cimatron-cam-tips-cim-046|Uncertainty Budget for EDM Electrode Positioning]]
- [[nx-cam-tips-ext-nx-121|Electrode Machining Workflow with NX]]
