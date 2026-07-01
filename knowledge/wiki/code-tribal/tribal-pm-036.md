---
name: tribal-pm-036
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["viewmill", "verification", "simulation", "gouge-check"]
confidence: 0
source: "web:powermill-docs"
promoted_from: knowledge/tribal/powermill-cam-tips-pm-036.md
promoted_at: 2026-06-09T22:31:16.540Z
---

# ViewMill Stock Verification Before Post-Processing

Always run ViewMill simulation before post-processing. ViewMill shows: (1) remaining stock colored by thickness, (2) collision detection with holder/machine, (3) gouge detection on finished surfaces. Use 'Compare' mode to overlay the machined stock against the target model — any red zones indicate unmachined material. Set simulation resolution to 0.02mm for finishing verification.

**Category:** cam_strategy
**Confidence:** 0.92
**Source:** web:powermill-docs
**Operations:** setup

## Related
- [[powermill-cam-tips-pm-023|ViewMill Verification Catches Gouges Before Machine]]
- [[camworks-cam-tips-cw-079|Machine Simulation — Full Kinematic Verification Before First Part]]
- [[camworks-cam-tips-cw-084|Toolpath Verification — Step Through Individual Points for Debugging]]
- [[cimatron-cam-tips-cim-018|Simulation Verification Before Post-Processing]]
- [[edgecam-cam-tips-ec-068|Full Machine Simulation with Kinematic Model]]
