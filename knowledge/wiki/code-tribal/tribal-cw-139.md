---
name: tribal-cw-139
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["camworks", "tbm", "surface-finish", "ra", "techdb"]
confidence: 91
source: "web:camworks-docs"
promoted_from: knowledge/tribal/camworks-cam-tips-cw-139.md
promoted_at: 2026-05-26T16:07:19.981Z
---

# TBM Surface Finish Mapping — Ra to Strategy Selection

TBM maps surface finish requirements (Ra, Rz) to machining strategies through the TechDB. Create finish-to-strategy rules: Ra > 3.2µm → rough only; Ra 1.6-3.2µm → rough + semi-finish; Ra 0.8-1.6µm → rough + semi-finish + finish; Ra < 0.8µm → add spring pass. The TechDB stores stepover, speed, and feed adjustments per surface finish tier. This ensures consistent surface quality without relying on programmer judgment for every surface, which is critical for high-mix shops with varying quality requirements.

**Category:** cam_strategy
**Confidence:** 91
**Source:** web:camworks-docs
**Operations:** milling, finishing

## Related
- [[camworks-cam-tips-cw-013|TechDB Knowledge-Based Machining — Capture Best Practices for Reuse]]
- [[camworks-cam-tips-cw-014|Operation Mapping Rules — Link Feature Types to Machining Strategies]]
- [[camworks-cam-tips-cw-015|Tool Selection Rules in TechDB — Automate Tool Choice by Feature Size]]
- [[camworks-cam-tips-cw-016|Feed/Speed Defaults — Material-Specific Cutting Data in TechDB]]
- [[camworks-cam-tips-cw-017|Strategy Templates — Save Complete Operation Plans for Part Families]]
