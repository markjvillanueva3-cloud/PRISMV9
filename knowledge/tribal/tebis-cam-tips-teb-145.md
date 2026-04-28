---
id: "teb-145"
title: "Thermal Growth Model α×ΔT×L for Dimensional Prediction"
source: "web:tebis-forum"
confidence: 80
category: "optimization"
tags: ["thermal-growth", "cte", "dimensional", "compensation"]
_source: "tebis-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.344Z
---

# Thermal Growth Model α×ΔT×L for Dimensional Prediction

Linear thermal growth: δ = α × ΔT × L where α = CTE (steel ≈ 12×10⁻⁶/°C), ΔT = temperature change, L = measurement length. For a 500mm mold block with 5°C spindle heat rise: δ = 0.030mm. This error is systematic and can be compensated in Tebis by adjusting WCS offsets based on predicted thermal state. Schedule critical finishing during thermally stable windows.

**Category:** optimization
**Confidence:** 80
**Source:** web:tebis-forum
**Operations:** optimization

## Related
- [[cimatron-cam-tips-cim-116|Thermal Growth Model for Dimensional Prediction]]
- [[powermill-cam-tips-pm-095|Thermal Growth α×ΔT×L for Dimensional Control]]
- [[sprutcam-cam-tips-spr-104|Thermal Growth α×ΔT×L Compensation]]
- [[fusion360-cam-tips-ext-f360-199|Thermal Growth Compensation for Long Production Runs]]
- [[bobcad-cam-tips-bc-203|BobCAD Dimensional Uncertainty Budget for Critical Features]]
