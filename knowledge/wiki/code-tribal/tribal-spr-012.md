---
name: tribal-spr-012
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["simulation", "collision", "machine-model", "safety"]
confidence: 0
source: "web:sprutcam-tutorials"
promoted_from: knowledge/tribal/sprutcam-cam-tips-spr-012.md
promoted_at: 2026-06-09T22:31:16.621Z
---

# Machine Simulation Collision Detection Setup

For accurate collision detection in SprutCAM's simulation: (1) import the full machine model including sheet metal covers, (2) define all clamp/fixture bodies as collision objects, (3) set 'Near Miss Distance' to 2mm for early warnings, (4) enable 'Tool Holder Check' with actual holder geometry. Run simulation at 'Detailed' mode for finishing operations — 'Fast' mode may miss close-proximity situations.

**Category:** cam_strategy
**Confidence:** 0.9
**Source:** web:sprutcam-tutorials
**Operations:** setup

## Related
- [[catia-cam-tips-cat-051|NC Machine Simulation Requires Complete Machine Model]]
- [[cimatron-cam-tips-cim-018|Simulation Verification Before Post-Processing]]
- [[solidcam-cam-tips-sc-092|Machine Simulation Setup — Import Exact Machine STL Models]]
- [[camworks-cam-tips-cw-080|Collision Detection — Check Tool, Holder, and Spindle Against Part]]
- [[camworks-cam-tips-cw-185|Machine Simulation with Full Kinematic Model — Crash Prevention]]
