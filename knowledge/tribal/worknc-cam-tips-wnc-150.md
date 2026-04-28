---
id: "wnc-150"
title: "Electrode Datum and Holder Setup — EROWA/System 3R Integration"
source: "web:worknc-docs"
confidence: 90
category: "cam_strategy"
tags: ["electrode", "datum", "erowa", "system-3r", "holder"]
_source: "worknc-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.737Z
---

# Electrode Datum and Holder Setup — EROWA/System 3R Integration

WorkNC programs electrodes with datum features that match precision tooling systems (EROWA ITS, System 3R Macro). The electrode CAM program includes: (1) machining the electrode shape, (2) machining reference flats for CMM qualification, and (3) engraving the electrode ID. The holder's reference datum transfers between the milling machine and EDM sinker — the electrode position in the sinker matches the CAM coordinate system without additional alignment. Set up the holder dimensions in WorkNC's tool library for accurate collision checking during electrode machining.

**Category:** cam_strategy
**Confidence:** 90
**Source:** web:worknc-docs
**Operations:** milling, edm

## Related
- [[topsolid-cam-tips-ts-059|Electrode Holder Interface with Standard Systems]]
- [[topsolid-cam-tips-ts-155|TopSolid EROWA/System 3R Holder Integration — Pallet Reference Systems]]
- [[cimatron-cam-tips-cim-046|Uncertainty Budget for EDM Electrode Positioning]]
- [[nx-cam-tips-ext-nx-121|Electrode Machining Workflow with NX]]
- [[tebis-cam-tips-teb-067|Electrode Design and Machining Workflow]]
