---
name: tribal-ec-187
category: code-tribal
subdomain: simulation
domain: tribal-knowledge
tags: ["simulator", "material-removal", "resolution", "visualization"]
confidence: 0
source: "web:edgecam-docs"
promoted_from: knowledge/tribal/edgecam-cam-tips-ec-187.md
promoted_at: 2026-06-09T22:31:16.205Z
---

# Simulator Material Removal Visualization Resolution

Adjust the simulator's material removal resolution for balancing accuracy vs performance. Set the voxel resolution in the Simulation Settings: 0.1mm for finish verification (slow but shows scallops), 0.5mm for general verification (good balance), 1.0mm for rapid overview (fast but misses detail). For large parts, use zone-based resolution — high resolution on critical surfaces, low resolution on rough areas. Enable 'section view' to verify internal features (bores, internal pockets) during simulation.

**Category:** simulation
**Confidence:** 0.83
**Source:** web:edgecam-docs
**Operations:** all

## Related
- [[surfcam-cam-tips-sc2-217|SURFCAM Material Removal Simulation Accuracy Settings]]
- [[topsolid-cam-tips-ts-063|Material Removal Verification Shows Stock Progress]]
- [[worknc-cam-tips-wnc-055|Material Removal Visualization Shows Stock Progress]]
- [[edgecam-cam-tips-ec-139|Tombstone Collision Avoidance with Fixture Definition]]
- [[edgecam-cam-tips-ec-185|Custom Machine Kinematic Model for Simulator Accuracy]]
