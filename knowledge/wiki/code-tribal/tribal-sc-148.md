---
name: tribal-sc-148
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["solidcam", "steep-shallow", "surface-classification", "die-mold", "finishing"]
confidence: 91
source: "web:solidcam-docs"
promoted_from: knowledge/tribal/solidcam-cam-tips-sc-148.md
promoted_at: 2026-05-26T16:07:20.464Z
---

# Steep and Shallow Detection — Auto-Split Surfaces for Optimal Strategy

SolidCAM's HSM module automatically classifies mold surfaces as steep (>45 degrees from horizontal) or shallow (<45 degrees) and applies the optimal strategy to each zone. Steep areas use Constant-Z (waterline) machining for consistent tool engagement, while shallow areas use Constant Stepover (scallop-height control) to prevent excessive cusp heights. Set the threshold angle (default 45 degrees, adjustable 30-60 degrees) based on tool geometry and surface finish requirements. The overlap zone between steep and shallow regions should be 2-3 toolpath passes wide to eliminate visible transition lines. This automatic splitting is essential for complex mold cavities with mixed geometry.

**Category:** cam_strategy
**Confidence:** 91
**Source:** web:solidcam-docs
**Operations:** finishing, 3d_surface

## Related
- [[bobcad-cam-tips-bc-217|Stochastic Chatter Prediction for BobCAD Toolpath Segments]]
- [[cimatron-cam-tips-cim-107|Stochastic Chatter Probability Mapping]]
- [[hypermill-cam-tips-ext-hm-150|Stochastic Chatter Avoidance with Stability Lobes]]
- [[nx-cam-tips-ext-nx-147|Stochastic Chatter Probability Mapping]]
- [[powermill-cam-tips-pm-081|Stochastic Chatter Avoidance with Stability Lobes]]
