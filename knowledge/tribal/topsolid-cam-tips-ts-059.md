---
id: "ts-059"
title: "Electrode Holder Interface with Standard Systems"
source: "web:topsolid-holder"
confidence: 90
category: "cam_strategy"
tags: ["holder", "system-3r", "erowa", "datum", "electrode"]
_source: "topsolid-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.431Z
---

# Electrode Holder Interface with Standard Systems

TopSolid designs electrodes with standard holder interfaces (System 3R, Erowa ITS, Hirschmann) built into the electrode model. The holder interface defines the datum reference for EDM positioning and is included in the electrode's coordinate system. When setting up electrode machining in TopSolid'Cam, use the holder interface as the workholding reference to ensure machining datums match the EDM setup datums. This eliminates electrode qualification time on the EDM machine.

**Category:** cam_strategy
**Confidence:** 90
**Source:** web:topsolid-holder
**Operations:** edm

## Related
- [[worknc-cam-tips-wnc-150|Electrode Datum and Holder Setup — EROWA/System 3R Integration]]
- [[topsolid-cam-tips-ts-155|TopSolid EROWA/System 3R Holder Integration — Pallet Reference Systems]]
- [[cimatron-cam-tips-cim-049|EROWA/System 3R Pallet Integration]]
- [[cimatron-cam-tips-cim-046|Uncertainty Budget for EDM Electrode Positioning]]
- [[nx-cam-tips-ext-nx-121|Electrode Machining Workflow with NX]]
