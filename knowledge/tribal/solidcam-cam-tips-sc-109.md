---
id: "sc-109"
title: "AFRM Feature Recognition — Automatic Pocket and Hole Detection"
source: "web:solidcam-docs"
confidence: 87
category: "cam_strategy"
tags: ["solidcam", "afrm", "feature-recognition", "automation", "pockets"]
_source: "solidcam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:43.747Z
---

# AFRM Feature Recognition — Automatic Pocket and Hole Detection

SolidCAM's AFRM (Automatic Feature Recognition & Machining) detects pockets, holes, and chamfers directly from the solid model. It groups features by type and depth, then auto-generates complete machining sequences using best-practice templates. For best results, ensure the SolidWorks model has clean topology — merged faces, zero-thickness walls, and tangent discontinuities confuse the recognition algorithm. Run AFRM first to handle standard features, then manually program complex freeform surfaces that AFRM cannot classify.

**Category:** cam_strategy
**Confidence:** 87
**Source:** web:solidcam-docs
**Operations:** 2d_pocket, drilling, workflow

## Related
- [[solidcam-cam-tips-sc-107|Operation Templates — Save Proven Process Sequences for Reuse]]
- [[solidcam-cam-tips-sc-108|Coordinate System Automation — Auto-Detect Machining Origins from Model]]
- [[solidcam-cam-tips-sc-110|Batch Processing — Post-Process Multiple Parts Unattended]]
- [[solidcam-cam-tips-sc-111|Wizard Customization — Tailor AFRM Templates to Shop Standards]]
- [[solidcam-cam-tips-sc-143-2|Monte Carlo Cycle Time Estimation]]
