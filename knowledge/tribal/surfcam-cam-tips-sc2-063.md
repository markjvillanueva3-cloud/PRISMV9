---
id: "sc2-063"
title: "Solid Verification Detects Gouges Before Posting"
source: "web:surfcam-simulation"
confidence: 91
category: "setup"
tags: ["solid-verification", "gouge-detection", "deviation-map", "simulation"]
_source: "surfcam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.080Z
---

# Solid Verification Detects Gouges Before Posting

SURFCAM solid verification renders a 3D stock model that is progressively cut by the toolpath. Gouges appear as red zones on the finished model where the tool cut below the target surface. Set verification resolution to 0.01mm for finish operations and 0.1mm for roughing (higher resolution increases computation time). Compare the verified model against the design model to generate a deviation color map. Any deviation exceeding 0.02mm warrants toolpath correction before posting.

**Category:** setup
**Confidence:** 91
**Source:** web:surfcam-simulation
**Operations:** verification

## Related
- [[edgecam-cam-tips-ec-071|Gouge Detection for Surface Quality Assurance]]
- [[fusion360-cam-tips-ext-f360-086|In-App Simulation Resolution for Detecting Small Gouges]]
- [[gibbscam-cam-tips-gc-086|Gouge detection sensitivity should match surface tolerance requirements]]
- [[powermill-cam-tips-pm-023|ViewMill Verification Catches Gouges Before Machine]]
- [[surfcam-cam-tips-sc2-217|SURFCAM Material Removal Simulation Accuracy Settings]]
