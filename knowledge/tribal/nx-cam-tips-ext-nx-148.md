---
id: "nx-148"
title: "Thermal Drift Compensation for Long Aerospace Cuts"
source: "web:siemens-community"
confidence: 0.81
category: "cam_strategy"
tags: ["thermal-drift", "compensation", "aerospace", "probing"]
_source: "nx-cam-tips-ext.ts"
indexed_at: 2026-04-28T01:00:43.442Z
---

# Thermal Drift Compensation for Long Aerospace Cuts

Large aerospace parts with 4-8 hour cycle times experience 0.02-0.05mm thermal drift. Program probing cycles in NX every 90 minutes: measure a reference datum → calculate offset → apply WCS correction → continue machining. NX's macro capability (via Post Builder custom events) automates the probe-correct loop. Schedule finishing of critical features during thermally stable periods (after 2+ hours warmup).

**Category:** cam_strategy
**Confidence:** 0.81
**Source:** web:siemens-community
**Operations:** optimization

## Related
- [[edgecam-cam-tips-ec-221|Thermal Drift Compensation Using Touch Probe Feedback]]
- [[worknc-cam-tips-wnc-181|Thermal Drift Compensation — Statistical Model for Machine Growth]]
- [[camworks-cam-tips-cw-179|Thermal Compensation Strategies — Time-Based Offset Adjustment]]
- [[camworks-cam-tips-cw-197|In-Process Probing for Tool Wear Compensation — Closed-Loop Machining]]
- [[catia-cam-tips-cat-198|Thin-Wall Aerospace Machining with Deflection Compensation in CATIA]]
