---
id: "mc-108"
title: "Part probing with Renishaw Productivity+ sets WCS from measured features"
source: "web:mastercam-docs"
confidence: 86
category: "quality"
tags: ["mastercam", "probing", "renishaw", "productivity-plus", "wcs-setup", "datum"]
_source: "mastercam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:43.193Z
---

# Part probing with Renishaw Productivity+ sets WCS from measured features

Renishaw Productivity+ for Mastercam programs probe cycles directly from the CAD model to establish WCS from measured part features. Typical workflow: probe a flat face (Z datum), two holes or edges (X-Y datum), then output G54 offset updates. Probe feed rate should be 300-500 mm/min for initial search and 50-100 mm/min for the measurement touch. Always probe at least 3 features to define a plane + 2 axes. This eliminates manual edge-finding (2-5 minutes per setup) and improves datum accuracy to +/-0.005 mm.

**Category:** quality
**Confidence:** 86
**Source:** web:mastercam-docs
**Operations:** probing, setup

## Related
- [[surfcam-cam-tips-sc2-203|SURFCAM In-Process Probing for WCS Alignment]]
- [[mastercam-cam-tips-mc-205|Workpiece coordinate systems (G54-G59) separate part location from program geometry]]
- [[wedm-knowledge-tips-wedm-mcam-001-2|Wire overburn decreases progressively per pass — 0.035→0.02→0.01→0]]
- [[wedm-knowledge-tips-wedm-mcam-003-2|Lead-in/lead-out with arcs reduces burrs — Line+Arc in, Arc+Line out]]
- [[controller-knowledge-tips-ctrl-050|Universal probing compatibility across controllers]]
