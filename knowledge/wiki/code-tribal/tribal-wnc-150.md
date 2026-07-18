---
name: tribal-wnc-150
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["electrode", "datum", "erowa", "system-3r", "holder"]
confidence: 90
source: "web:worknc-docs"
promoted_from: knowledge/tribal/worknc-cam-tips-wnc-150.md
promoted_at: 2026-05-26T16:07:21.639Z
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
