---
name: tribal-ts-181
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["topsolid", "monte-carlo", "tolerance", "assembly", "fit"]
confidence: 85
source: "web:topsolid-docs"
promoted_from: knowledge/tribal/topsolid-cam-tips-ts-181.md
promoted_at: 2026-06-09T22:31:16.777Z
---

# Monte Carlo Tolerance Analysis — Predicting Assembly Fit from Machining Data

Use Monte Carlo simulation to predict assembly fit from individual part machining variability. Model each machined dimension as a distribution (Normal or skewed based on SPC data), then simulate 10,000+ assemblies to predict the clearance/interference distribution. For a bore-shaft fit: bore ~ Normal(25.021, 0.004mm), shaft ~ Normal(24.993, 0.003mm), clearance = bore - shaft ~ Normal(0.028, 0.005mm). The simulation reveals the probability of interference (zero clearance) and guides tolerance allocation to the dimensions with the most impact on fit.

**Category:** cam_strategy
**Confidence:** 85
**Source:** web:topsolid-docs
**Operations:** general

## Related
- [[topsolid-cam-tips-ts-138|TopSolid'Design Assembly Context — Machine Parts in Assembly Position]]
- [[topsolid-cam-tips-ts-122|TopSolid'Cam 7 Unified Architecture — Single Environment for All Operations]]
- [[topsolid-cam-tips-ts-123|TopSolid'Cam 7 Process Templates — Reusable Operation Sequences]]
- [[topsolid-cam-tips-ts-124|TopSolid'Cam 7 Contextual Machining — Feature-Driven Operation Proposals]]
- [[topsolid-cam-tips-ts-125|TopSolid'Cam 7 Stock Management — Automatic In-Process Stock Tracking]]
