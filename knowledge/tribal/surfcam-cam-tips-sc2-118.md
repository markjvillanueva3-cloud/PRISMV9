---
id: "sc2-118"
title: "Final Verification Probing Before Part Release"
source: "web:surfcam-verification"
confidence: 86
category: "probing"
tags: ["verification-probing", "final-inspection", "spc", "dprnt", "quality"]
_source: "surfcam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.136Z
---

# Final Verification Probing Before Part Release

Program a final probing routine that measures all critical dimensions after the last machining operation. Compare measured values against the tolerance specification and generate a pass/fail result stored in a macro variable. For SPC (Statistical Process Control), output the measured values to a data file via DPRNT or similar data transfer command. This provides a digital inspection record that accompanies the physical part through the quality system.

**Category:** probing
**Confidence:** 86
**Source:** web:surfcam-verification
**Operations:** probing

## Related
- [[bobcad-cam-tips-bc-122|Verification Probing with SPC Data Output]]
- [[camworks-cam-tips-cw-176|Statistical Process Control — Xbar-R Charts for CNC Dimensions]]
- [[cimatron-cam-tips-cim-047|SPC Integration for Mold Shop Quality]]
- [[powermill-cam-tips-pm-085|SPC Control Charts for Critical Dimensions]]
- [[topsolid-cam-tips-ts-185|SPC Implementation for TopSolid-Programmed Parts — Xbar-R Control Charts]]
