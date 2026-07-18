---
name: tribal-cw-082
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["camworks", "simulation", "stock-comparison", "deviation", "quality"]
confidence: 89
source: "web:camworks-docs"
promoted_from: knowledge/tribal/camworks-cam-tips-cw-082.md
promoted_at: 2026-06-09T22:31:16.005Z
---

# Stock Comparison — Quantitative Analysis of Remaining Material

Stock comparison overlays the machined stock model against the target part geometry and displays deviation as a color map. Green = within tolerance, yellow = excess stock (needs more machining), red = gouged (material removed below target). Use stock comparison after the final finishing operation to verify the entire part is within specification before posting G-code. Export the comparison report for quality documentation — it provides numerical deviation values at any point.

**Category:** cam_strategy
**Confidence:** 89
**Source:** web:camworks-docs
**Operations:** milling

## Related
- [[gibbscam-cam-tips-gc-085|Stock comparison overlay quantifies material deviation from design intent]]
- [[camworks-cam-tips-cw-083|Gouge Checking — Detect Overcutting Before Shop Floor]]
- [[topsolid-cam-tips-ts-064|Stock Comparison Validates Final Part Accuracy]]
- [[camworks-cam-tips-cw-079|Machine Simulation — Full Kinematic Verification Before First Part]]
- [[camworks-cam-tips-cw-080|Collision Detection — Check Tool, Holder, and Spindle Against Part]]
