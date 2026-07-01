---
name: tribal-wnc-143
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["worknc-designer", "check-surfaces", "avoid", "boundary", "safety"]
confidence: 90
source: "web:worknc-docs"
promoted_from: knowledge/tribal/worknc-cam-tips-wnc-143.md
promoted_at: 2026-05-26T16:07:21.626Z
---

# WorkNC Designer Check Surfaces — Controlling Tool Approach Boundaries

Check surfaces (also called avoid surfaces) define regions where the tool must not enter. WorkNC Designer creates check surfaces from: clamp locations, adjacent cavity walls, fixture components, and machine table surfaces. Define check surfaces with a safety offset (1-3mm clearance). The toolpath generator retracts the tool when it approaches a check surface and resumes cutting after clearing it. This is safer than relying on collision simulation alone because check surfaces actively modify the toolpath rather than just detecting problems.

**Category:** cam_strategy
**Confidence:** 90
**Source:** web:worknc-docs
**Operations:** milling

## Related
- [[worknc-cam-tips-wnc-140|WorkNC Designer — Surface Preparation for CAM]]
- [[worknc-cam-tips-wnc-141|WorkNC Designer Surface Extension — Cutter Runoff for Edge Quality]]
- [[worknc-cam-tips-wnc-142|WorkNC Designer Gap Filling — Repairing Imported Model Defects]]
- [[worknc-cam-tips-wnc-144|WorkNC Designer Parting Line Creation — Core and Cavity Split]]
- [[worknc-cam-tips-wnc-145|WorkNC Designer Electrode Geometry — Extracting Burn Shapes]]
