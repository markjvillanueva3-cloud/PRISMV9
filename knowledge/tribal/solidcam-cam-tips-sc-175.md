---
id: "sc-175"
title: "Rest Machining Multi-Level Stock — Chain Multiple Rest Operations"
source: "web:solidcam-docs"
confidence: 86
category: "cam_strategy"
tags: ["solidcam", "rest-machining", "multi-level", "stock-chain", "mold-cavity"]
_source: "solidcam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:43.798Z
---

# Rest Machining Multi-Level Stock — Chain Multiple Rest Operations

For complex parts requiring 3+ tool sizes, chain rest operations sequentially in SolidCAM. Each rest operation references the cumulative stock model from all previous operations, not just the immediately preceding one. In the Stock Model settings, select 'From All Previous Operations' to accumulate the material removal history. The operation order matters: always progress from largest to smallest tool. A typical 3-level rest chain for a mold cavity: 25mm roughing → 12mm rest roughing → 6mm rest roughing → 6mm rest finishing → 3mm rest finishing. Each level removes progressively less material and targets tighter geometry.

**Category:** cam_strategy
**Confidence:** 86
**Source:** web:solidcam-docs
**Operations:** roughing, rest_machining

## Related
- [[solidcam-cam-tips-sc-146-2|Cpk Prediction from Error Budget Analysis]]
- [[solidcam-cam-tips-sc-165-2|Mutual Information for SPC Feature Selection]]
- [[solidcam-cam-tips-sc-172-2|HSR/HSM 3D Finishing Strategies]]
- [[solidcam-cam-tips-sc-059|HSM Constant Z with Spiral Transition — Eliminate Z-Step Witness Lines]]
- [[solidcam-cam-tips-sc-060|HSM Linear Finishing — Optimal Angle for Surface Quality]]
