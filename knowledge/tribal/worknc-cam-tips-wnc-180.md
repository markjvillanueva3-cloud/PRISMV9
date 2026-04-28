---
id: "wnc-180"
title: "Tool Wear Prediction — Flank Wear Rate as Random Variable"
source: "web:worknc-docs"
confidence: 83
category: "cam_strategy"
tags: ["tool-wear", "prediction", "log-normal", "flank-wear", "risk"]
_source: "worknc-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.774Z
---

# Tool Wear Prediction — Flank Wear Rate as Random Variable

Model flank wear rate (dVB/dt) as a random variable with log-normal distribution: ln(dVB/dt) ~ Normal(µ, σ²). The mean µ depends on cutting conditions (Taylor model), and σ captures tool-to-tool variability (typically 15-30% CV). Propagate through the wear equation VB(t) = dVB/dt × t to predict the probability of exceeding VB_max at any time t. Set tool change intervals where P(VB > VB_max) < 5%. This stochastic approach replaces the deterministic 'change every N minutes' rule with a risk-based schedule that adapts to the actual variability of each tool type.

**Category:** cam_strategy
**Confidence:** 83
**Source:** web:worknc-docs
**Operations:** general

## Related
- [[cimatron-cam-tips-cim-134|Archard Wear Model for Flank Wear Prediction]]
- [[powermill-cam-tips-pm-098|Archard Wear Model for Flank Wear Prediction]]
- [[bobcad-cam-tips-bc-200|Process Capability Monitoring for BobCAD Production Programs]]
- [[camworks-cam-tips-cw-197|In-Process Probing for Tool Wear Compensation — Closed-Loop Machining]]
- [[catia-cam-tips-cat-212|Tool Wear Compensation Strategy Using CATIA Offset Parameters]]
