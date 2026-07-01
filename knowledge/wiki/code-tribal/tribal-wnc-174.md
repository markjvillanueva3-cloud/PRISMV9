---
name: tribal-wnc-174
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["monte-carlo", "electrode", "accuracy", "spark-gap", "simulation"]
confidence: 84
source: "web:worknc-docs"
promoted_from: knowledge/tribal/worknc-cam-tips-wnc-174.md
promoted_at: 2026-06-09T22:31:16.825Z
---

# Monte Carlo for Electrode Burn Accuracy — Predicting Cavity Dimensions

Model electrode burning accuracy with Monte Carlo simulation. Input variables: electrode dimensional accuracy (Normal, µ=0, σ=0.003mm), spark gap variation (Normal, µ=gap, σ=0.005mm), electrode wear (Uniform, 0-5%), and positioning repeatability (Normal, µ=0, σ=0.002mm). Simulate 10,000 burns to predict the cavity dimension distribution. If the predicted Cpk < 1.33 for the mold tolerance, improve the dominant contributor: typically spark gap control for roughing electrodes and electrode accuracy for finishing. This analysis justifies the precision level needed in WorkNC electrode machining programs.

**Category:** cam_strategy
**Confidence:** 84
**Source:** web:worknc-docs
**Operations:** edm

## Related
- [[camworks-cam-tips-cw-174|Monte Carlo Simulation for Tolerance Stack Analysis]]
- [[catia-cam-tips-cat-213|Monte Carlo Process Capability Estimation for CATIA Machining]]
- [[edgecam-cam-tips-ec-216|Monte Carlo Tool Life Simulation for Job Costing]]
- [[esprit-cam-tips-esp-199|Monte Carlo Simulation for Process Tolerance Stack-Up]]
- [[cimatron-cam-tips-cim-039|Process Variability in Electrode Spark Gap Control]]
