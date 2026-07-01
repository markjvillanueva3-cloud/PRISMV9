---
name: tribal-gc-192
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["gibbscam", "micro-drilling", "peck", "dwell", "precision"]
confidence: 83
source: "web:gibbscam-docs"
promoted_from: knowledge/tribal/gibbscam-cam-tips-gc-192.md
promoted_at: 2026-06-09T22:31:16.362Z
---

# GibbsCAM micro-drilling with peck and dwell prevents drill wandering in thin features

Micro-drilling (diameter < 0.5 mm) in GibbsCAM requires special peck cycle parameters. Set peck depth to 0.5-1× drill diameter (not the 1-3× D used for conventional drilling). Add a 0.1-0.2 second dwell at each peck bottom to allow the drill to stabilize and cut cleanly. For aspect ratios above 5:1, switch to chip-break pecking (0.1 mm retract instead of full retract) to maintain the drill's piloting in the hole. Use a pilot hole (0.3× final diameter) for any micro-hole with aspect ratio above 8:1. In GibbsCAM's drill tile, set the 'Spotting' operation with a 120° or 140° spot drill to create a precise centering feature before the micro-drill engages.

**Category:** cam_strategy
**Confidence:** 83
**Source:** web:gibbscam-docs

## Related
- [[gibbscam-cam-tips-gc-004|Drill tile supports spot-drill-tap sequences with automatic depth linking]]
- [[gibbscam-cam-tips-gc-070|Corner strategies balance accuracy versus wire lag compensation]]
- [[camworks-cam-tips-cw-168|Swiss-Type Micro-Drilling — Deep Holes in Small Diameters]]
- [[bobcad-cam-tips-bc-112|Reaming for Precision Hole Finishing]]
- [[edgecam-cam-tips-ec-100|Bore Cycle with Dwell and Feed-Out]]
