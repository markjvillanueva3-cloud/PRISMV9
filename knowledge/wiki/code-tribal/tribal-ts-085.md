---
name: tribal-ts-085
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["spot-drill", "chamfer", "depth", "centering"]
confidence: 91
source: "web:topsolid-spot"
promoted_from: knowledge/tribal/topsolid-cam-tips-ts-085.md
promoted_at: 2026-05-26T16:07:21.028Z
---

# Spot Drilling with Automatic Depth Calculation

TopSolid calculates the spot drill depth to produce the correct chamfer diameter at the hole entry. For a 90° spot drill creating a 0.5 mm chamfer on a Ø10 hole, the depth is automatically set to the chamfer width (0.5 mm) below the surface. Enable 'Match chamfer to drawing' to read the chamfer dimension from the PMI data. Use a 90° spot drill for subsequent 118° drill bits and a 142° spot drill for 140° carbide drills to ensure proper centering.

**Category:** cam_strategy
**Confidence:** 91
**Source:** web:topsolid-spot
**Operations:** drilling

## Related
- [[worknc-cam-tips-wnc-081|Spot Drilling with Automatic Chamfer Depth]]
- [[catia-cam-tips-cat-110|Spot Drilling Depth Controls Subsequent Drill Centering]]
- [[camworks-cam-tips-cw-097|Spot Drilling — Establish Accurate Hole Location Before Full Drill]]
- [[catia-cam-tips-cat-111|Center Drilling vs Spot Drilling Selection Criteria]]
- [[edgecam-cam-tips-ec-097|Spot Drilling for Hole Location Accuracy]]
