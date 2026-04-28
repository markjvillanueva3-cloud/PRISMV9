---
id: "pm-148"
title: "Constant Scallop vs Fixed Step-Over"
source: "web:powermill-docs"
confidence: 0.87
category: "cam_strategy"
tags: ["constant-scallop", "fixed-step-over", "comparison", "efficiency"]
_source: "powermill-cam-tips.ts"
indexed_at: 2026-04-28T01:00:43.640Z
---

# Constant Scallop vs Fixed Step-Over

Constant scallop varies step-over by curvature: wider on flat, finer on curved. Fixed step-over gives uniform point spacing. Constant scallop saves 20-30% cycle time with uniform quality. Fixed is simpler and more predictable. For production molds: use constant scallop. For prototype/quick jobs: fixed step-over. PowerMill supports both — switch per operation.

**Category:** cam_strategy
**Confidence:** 0.87
**Source:** web:powermill-docs
**Operations:** finishing

## Related
- [[tebis-cam-tips-teb-044|Constant Scallop Adapts Step-Over to Local Surface Curvature]]
- [[cimatron-cam-tips-cim-072|Constant Scallop Height Finishing]]
- [[hypermill-cam-tips-ext-hm-137|Constant Scallop Height Finishing]]
- [[nx-cam-tips-ext-nx-072|Hub Finishing with Constant-Scallop Step-Over]]
- [[nx-cam-tips-ext-nx-196|Constant Scallop for Freeform, Fixed for Prismatic]]
