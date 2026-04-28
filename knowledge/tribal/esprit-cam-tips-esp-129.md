---
id: "esp-129"
title: "Swiss-Type Multi-Channel Synchronization with SyncChart"
source: "web:esprit-docs"
confidence: 0.91
category: "cam_strategy"
tags: ["swiss-type", "multi-channel", "syncchart", "synchronization", "citizen", "star"]
_source: "esprit-cam-tips.ts"
indexed_at: 2026-04-28T01:00:42.561Z
---

# Swiss-Type Multi-Channel Synchronization with SyncChart

ESPRIT's SyncChart editor is the primary tool for programming multi-channel Swiss-type lathes (Star, Citizen, Tsugami, Tornos). Each channel (main spindle, sub-spindle, gang slide, back-working) is a horizontal lane. Drag operations between channels to parallelize: while the main spindle roughs the OD, the gang slide can drill cross-holes. Insert sync points (wait codes) where channels must coordinate — typically at part cutoff and sub-spindle pickup. The SyncChart automatically generates M-code waits (M200/M201 pairs on Citizen, M96/M97 on Star).

**Category:** cam_strategy
**Confidence:** 0.91
**Source:** web:esprit-docs
**Operations:** turning_roughing, turning_finishing, drilling

## Related
- [[camworks-cam-tips-cw-166|Swiss-Type Simultaneous Operations — Overlapped Milling and Turning]]
- [[esprit-cam-tips-esp-046|Overlapping Operations in Multi-Channel Programming]]
- [[esprit-cam-tips-esp-047|Channel Programming for Citizen/Star/Tornos Swiss Machines]]
- [[esprit-cam-tips-esp-136|Swiss-Type Superimposed Axes for Complex Profiles]]
- [[sprutcam-cam-tips-spr-010|Swiss-Type Multi-Channel Programming]]
