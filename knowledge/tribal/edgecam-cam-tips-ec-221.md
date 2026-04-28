---
id: "ec-221"
title: "Thermal Drift Compensation Using Touch Probe Feedback"
source: "web:edgecam-docs"
confidence: 0.86
category: "quality"
tags: ["thermal-drift", "probing", "compensation", "production"]
_source: "edgecam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:42.439Z
---

# Thermal Drift Compensation Using Touch Probe Feedback

Compensate for machine thermal growth during long production runs by periodic probe checks. Program a reference feature measurement (e.g., probe a fixture surface or gauge block) every N parts (typically every 5-10 parts or 30-60 minutes). Compare the measured position to the nominal. If drift exceeds a threshold (0.005-0.01mm), update work offsets automatically via macro variables. In Edgecam, insert the probe routine as a conditional block triggered by a part counter. This maintains tolerances through thermal equilibrium changes.

**Category:** quality
**Confidence:** 0.86
**Source:** web:edgecam-docs
**Operations:** probing

## Related
- [[nx-cam-tips-ext-nx-148|Thermal Drift Compensation for Long Aerospace Cuts]]
- [[worknc-cam-tips-wnc-181|Thermal Drift Compensation — Statistical Model for Machine Growth]]
- [[camworks-cam-tips-cw-179|Thermal Compensation Strategies — Time-Based Offset Adjustment]]
- [[camworks-cam-tips-cw-197|In-Process Probing for Tool Wear Compensation — Closed-Loop Machining]]
- [[cimatron-cam-tips-cim-108|Thermal Compensation for Long Operations]]
