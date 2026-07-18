---
name: tribal-ts-187
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["topsolid", "surface-roughness", "stochastic", "log-normal", "cpk"]
confidence: 84
source: "web:topsolid-docs"
promoted_from: knowledge/tribal/topsolid-cam-tips-ts-187.md
promoted_at: 2026-06-09T22:31:16.779Z
---

# Stochastic Surface Roughness — Predicting Finish Distribution

Surface roughness varies stochastically due to tool vibration, material microstructure, and built-up edge formation. Model Ra as a log-normal distribution: ln(Ra) ~ Normal(µ, σ²), where µ and σ depend on cutting parameters. Collect 30+ Ra measurements across a production run to fit the distribution. Predict the probability of exceeding the specification: P(Ra > Ra_max) from the fitted distribution. If this probability exceeds the acceptable defect rate (e.g., 0.1%), tighten the cutting parameters (reduce feed, increase speed) or add a spring pass. TopSolid's finishing operations should target Ra_mean = 0.5 × Ra_spec to ensure high Cpk.

**Category:** cam_strategy
**Confidence:** 84
**Source:** web:topsolid-docs
**Operations:** finishing

## Related
- [[topsolid-cam-tips-ts-188|Process Capability Studies — Cp/Cpk Before Production Release]]
- [[topsolid-cam-tips-ts-122|TopSolid'Cam 7 Unified Architecture — Single Environment for All Operations]]
- [[topsolid-cam-tips-ts-123|TopSolid'Cam 7 Process Templates — Reusable Operation Sequences]]
- [[topsolid-cam-tips-ts-124|TopSolid'Cam 7 Contextual Machining — Feature-Driven Operation Proposals]]
- [[topsolid-cam-tips-ts-125|TopSolid'Cam 7 Stock Management — Automatic In-Process Stock Tracking]]
