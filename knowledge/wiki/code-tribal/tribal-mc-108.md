---
name: tribal-mc-108
category: code-tribal
subdomain: quality
domain: tribal-knowledge
tags: ["mastercam", "probing", "renishaw", "productivity-plus", "wcs-setup", "datum"]
confidence: 86
source: "web:mastercam-docs"
promoted_from: knowledge/tribal/mastercam-cam-tips-mc-108.md
promoted_at: 2026-06-09T22:31:16.422Z
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
