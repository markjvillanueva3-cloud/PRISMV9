---
id: "wnc-199"
title: "WorkNC Probing Integration — On-Machine Verification"
source: "web:worknc-docs"
confidence: 90
category: "cam_strategy"
tags: ["probing", "verification", "renishaw", "closed-loop", "on-machine"]
_source: "worknc-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.789Z
---

# WorkNC Probing Integration — On-Machine Verification

WorkNC generates probing toolpaths for on-machine part verification using Renishaw, Blum, or Heidenhain touch probes. Program probing as operations in the machining sequence: (1) probe stock before roughing (verify stock dimensions), (2) probe after roughing (verify stock removal), (3) probe critical features after finishing (verify dimensions before unclamping). The probe results can update tool offsets automatically for closed-loop machining. WorkNC's post processor outputs brand-specific probe cycles (O9800 series for Renishaw on Fanuc, CYCLE 600 for Siemens, TOUCH PROBE for Heidenhain).

**Category:** cam_strategy
**Confidence:** 90
**Source:** web:worknc-docs
**Operations:** probing

## Related
- [[catia-cam-tips-cat-080|On-Machine Verification Probing Reduces Setup Iterations]]
- [[camworks-cam-tips-cw-116|Tool Measurement Probing — Verify Tool Length and Diameter On-Machine]]
- [[camworks-cam-tips-cw-117|In-Process Inspection — Verify Critical Dimensions Mid-Program]]
- [[camworks-cam-tips-cw-119|Verification Probing — Final Part Inspection On-Machine]]
- [[camworks-cam-tips-cw-152|ShopFloor In-Process Inspection Feedback — Closed-Loop Quality]]
