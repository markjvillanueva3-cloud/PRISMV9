---
name: tribal-sc-146
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["solidcam", "hard-milling", "die-mold", "hsm", "direct-machining"]
confidence: 90
source: "web:solidcam-docs"
promoted_from: knowledge/tribal/solidcam-cam-tips-sc-146.md
promoted_at: 2026-05-26T16:07:20.460Z
---

# Direct Hard Milling — Skip EDM with HSM Strategies on Hardened Dies

SolidCAM's HSM strategies enable direct hard milling of die and mold steels at 50-65 HRC, eliminating the EDM step for many features. Use constant-stepover or constant-Z strategies with ball end mills (micro-grain carbide or CBN) at cutting speeds of 150-300 m/min and shallow depths (0.05-0.3mm axial, 0.05-0.2mm radial). The key is constant tool engagement — SolidCAM's trochoidal and morphing strategies prevent sudden load changes that cause micro-chipping in hardened steel. Program tool changes every 20-30 minutes regardless of visible wear. Direct hard milling achieves Ra 0.2-0.4 surface finish, reducing or eliminating manual polishing.

**Category:** cam_strategy
**Confidence:** 90
**Source:** web:solidcam-docs
**Operations:** finishing, hsm

## Related
- [[solidcam-cam-tips-sc-160-2|Deflection Compensation δ=FL³/3EI for Finishing]]
- [[solidcam-cam-tips-sc-143-2|Monte Carlo Cycle Time Estimation]]
- [[solidcam-cam-tips-sc-144-2|Weibull Tool Life for iMachining Replace-Before-Fail]]
- [[solidcam-cam-tips-sc-145-2|Bayesian Feed Rate Updating from Production Data]]
- [[solidcam-cam-tips-sc-147-2|Taguchi Robust Design for Stable Machining]]
