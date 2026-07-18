---
name: tribal-cw-178
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["camworks", "cpk", "capability", "prediction", "pre-production"]
confidence: 86
source: "web:camworks-docs"
promoted_from: knowledge/tribal/camworks-cam-tips-cw-178.md
promoted_at: 2026-06-09T22:31:16.025Z
---

# Cp/Cpk Prediction from Machining Parameters — Pre-Production Estimation

Estimate process capability (Cp/Cpk) before production starts by combining historical data from similar operations. For a new bore with ±0.02mm tolerance, look up the TechDB for historical sigma values of boring operations in the same material. Typical values: boring σ = 0.003-0.005mm (Cp = 0.02/(3×0.004) ≈ 1.67), reaming σ = 0.005-0.008mm, drilling σ = 0.01-0.02mm. If predicted Cpk < 1.33, upgrade the operation (drill → bore) or tighten the process (fixture, thermal control). This prevents discovering capability problems after production starts.

**Category:** cam_strategy
**Confidence:** 86
**Source:** web:camworks-docs
**Operations:** general

## Related
- [[camworks-cam-tips-cw-112|Cusp Analysis — Predict Surface Finish Before Cutting]]
- [[camworks-cam-tips-cw-144|TBM Report Generation — Tolerance Compliance Documentation]]
- [[camworks-cam-tips-cw-174|Monte Carlo Simulation for Tolerance Stack Analysis]]
- [[camworks-cam-tips-cw-177|Regression Models for Tool Life Prediction — Taylor Extended]]
- [[camworks-cam-tips-cw-188|Force Simulation for Tool Deflection Prediction]]
