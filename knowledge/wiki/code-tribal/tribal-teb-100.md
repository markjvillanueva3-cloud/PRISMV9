---
name: tribal-teb-100
category: code-tribal
subdomain: optimization
domain: tribal-knowledge
tags: ["cpk", "error-budget", "prediction", "deflection"]
confidence: 80
source: "web:tebis-forum"
promoted_from: knowledge/tribal/tebis-cam-tips-teb-100.md
promoted_at: 2026-06-09T22:31:16.728Z
---

# Cpk Prediction from Error Budget Analysis

Predict Cpk before cutting: RSS of machine positioning (±0.003mm), tool diameter tolerance (±0.005mm H6), tool deflection (FL³/3EI at cutting force), thermal growth (α×ΔT×L over cycle), measurement uncertainty (±0.002mm CMM). For ±0.01mm tolerance: need total error <0.005mm for Cpk≥1.33. If predicted Cpk marginal, improve largest contributor (usually tool deflection — shorter tools).

**Category:** optimization
**Confidence:** 80
**Source:** web:tebis-forum
**Operations:** optimization

## Related
- [[powermill-cam-tips-pm-079|Cpk Prediction from Toolpath and Machine Data]]
- [[cimatron-cam-tips-cim-105|Cpk Prediction from Error Budget]]
- [[mastercam-cam-tips-mc-295|Process capability prediction using Mastercam's tolerance analysis prevents scrap before first article]]
- [[nx-cam-tips-ext-nx-144|Cpk Prediction from Error Budget Analysis]]
- [[sprutcam-cam-tips-spr-036|Process Capability Prediction with SprutCAM Data]]
