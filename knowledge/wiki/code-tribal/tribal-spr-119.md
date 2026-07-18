---
name: tribal-spr-119
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["bayesian-optimization", "gaussian-process", "robot", "efficient"]
confidence: 0
source: "web:sprutcam-forum"
promoted_from: knowledge/tribal/sprutcam-cam-tips-spr-119.md
promoted_at: 2026-06-09T22:31:16.645Z
---

# Bayesian Optimization for Expensive Trials

GP surrogate + Expected Improvement. Converges in 15-25 trials vs 100+ grid. Start with 5-point LHS. Best for SprutCAM robot machining where each trial is expensive (setup time, risk of robot collision). After convergence, parameters are optimal for specific robot-tool-part configuration.

**Category:** cam_strategy
**Confidence:** 0.76
**Source:** web:sprutcam-forum
**Operations:** optimization

## Related
- [[powermill-cam-tips-pm-105|Bayesian Optimization for Adaptive Parameter Search]]
- [[tebis-cam-tips-teb-152|Bayesian Optimization for Multi-Objective Parameter Search]]
- [[tebis-cam-tips-teb-166|Bayesian Optimization for Efficient Parameter Search]]
- [[cimatron-cam-tips-cim-137|Bayesian Optimization for Efficient Parameter Search]]
- [[wedm-knowledge-tips-wedm-research-005|Bayesian-optimized CNN-SVM for real-time surface classification]]
