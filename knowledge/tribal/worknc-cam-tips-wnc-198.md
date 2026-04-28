---
id: "wnc-198"
title: "WorkNC Multi-Setup Management — Automatic Work Coordinate Transfer"
source: "web:worknc-docs"
confidence: 90
category: "cam_strategy"
tags: ["multi-setup", "stock-transfer", "wcs", "orientation", "planning"]
_source: "worknc-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.788Z
---

# WorkNC Multi-Setup Management — Automatic Work Coordinate Transfer

WorkNC manages multi-setup parts with automatic stock transfer between setups. After completing Setup 1, the stock model (with all machined features) transfers to Setup 2 with the correct orientation. Work coordinate origins are defined per setup, and the post processor outputs the appropriate G54-G59 codes. For parts requiring 3+ setups, use WorkNC's setup planning tool to determine the optimal setup sequence that minimizes the number of setups while ensuring all features are accessible. The transferred stock prevents air cutting in subsequent setups.

**Category:** cam_strategy
**Confidence:** 90
**Source:** web:worknc-docs
**Operations:** milling, general

## Related
- [[catia-cam-tips-cat-182|Stock Transfer Between Setups with Intermediate Stock Bodies]]
- [[mastercam-cam-tips-mc-200|Machine group properties define stock shape, material, and coordinate system for all contained operations]]
- [[mastercam-cam-tips-mc-203|Multiple machine groups in one file enable multi-setup programming with coordinated fixtures]]
- [[surfcam-cam-tips-sc2-113|Multi-Setup Operations with Stock Transfer Between Setups]]
- [[topsolid-cam-tips-ts-010|Multi-Setup Machining in a Single Project Document]]
