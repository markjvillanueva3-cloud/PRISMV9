---
id: "sc-173"
title: "3D Rest Finishing — Detect and Machine Only Unmachined Fillet Regions"
source: "web:solidcam-docs"
confidence: 88
category: "cam_strategy"
tags: ["solidcam", "rest-finishing", "fillets", "corners", "ball-mill"]
_source: "solidcam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:43.797Z
---

# 3D Rest Finishing — Detect and Machine Only Unmachined Fillet Regions

After 3D finishing with a large ball mill (e.g., 10mm), small fillets and corners retain unmachined stock. SolidCAM's 3D Rest Finishing identifies these regions automatically by comparing the current tool radius against the reference tool radius. Set the rest detection tolerance to 0.01-0.02mm to avoid false positives. Use a smaller ball mill (e.g., 4mm) and select Constant Z or Contour strategies for the rest regions. Enable 'Rest Only' mode to prevent the small tool from re-machining surfaces already finished by the larger tool. This approach is 3-5x faster than re-finishing the entire part with the small tool.

**Category:** cam_strategy
**Confidence:** 88
**Source:** web:solidcam-docs
**Operations:** finishing, rest_machining, 3d_surface

## Related
- [[solidcam-cam-tips-sc-148-2|Stochastic Chatter Probability with Stability Lobes]]
- [[solidcam-cam-tips-sc-174-2|Pencil Tracing for Corner Cleanup]]
- [[solidcam-cam-tips-sc-178-2|Trochoidal Milling via iMachining]]
- [[solidcam-cam-tips-sc-143-2|Monte Carlo Cycle Time Estimation]]
- [[solidcam-cam-tips-sc-144-2|Weibull Tool Life for iMachining Replace-Before-Fail]]
