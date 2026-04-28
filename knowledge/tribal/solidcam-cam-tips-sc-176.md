---
id: "sc-176"
title: "Pencil Tracing for Rest Regions — Target Internal Corners Precisely"
source: "web:solidcam-docs"
confidence: 87
category: "cam_strategy"
tags: ["solidcam", "pencil-tracing", "rest-machining", "internal-corners", "efficiency"]
_source: "solidcam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:43.799Z
---

# Pencil Tracing for Rest Regions — Target Internal Corners Precisely

SolidCAM's Pencil Tracing strategy machines only the concave edges (internal corners) where previous tools left material. Unlike full rest finishing that sweeps across surfaces, pencil tracing follows the intersection curves between surfaces. Set the Pencil Detection Radius to match the reference tool corner radius. For sharp internal corners, pencil tracing with a small ball mill (2-3mm) at high spindle speed produces excellent results in 10-20% of the time of full surface re-finishing. Combine pencil tracing with constant-Z rest finishing: use pencil for the corner fillets and constant-Z for the remaining wall material.

**Category:** cam_strategy
**Confidence:** 87
**Source:** web:solidcam-docs
**Operations:** finishing, rest_machining

## Related
- [[solidcam-cam-tips-sc-172-2|HSR/HSM 3D Finishing Strategies]]
- [[solidcam-cam-tips-sc-175-2|Constant Scallop Height Finishing]]
- [[solidcam-cam-tips-sc-050|iMachining 3D Rest Material — Use Previous Tool Reference for Accuracy]]
- [[solidcam-cam-tips-sc-143-2|Monte Carlo Cycle Time Estimation]]
- [[solidcam-cam-tips-sc-144-2|Weibull Tool Life for iMachining Replace-Before-Fail]]
