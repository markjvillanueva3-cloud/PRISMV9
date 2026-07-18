---
name: tribal-wnc-142
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["worknc-designer", "gap-filling", "repair", "import", "healing"]
confidence: 90
source: "web:worknc-docs"
promoted_from: knowledge/tribal/worknc-cam-tips-wnc-142.md
promoted_at: 2026-05-26T16:07:21.623Z
---

# WorkNC Designer Gap Filling — Repairing Imported Model Defects

Imported IGES/STEP models frequently have gaps between adjacent surfaces (translation errors). WorkNC Designer fills gaps automatically: select adjacent surface edges, and Designer creates a bridging surface with G1 or G2 continuity. For gaps < 0.1mm, automatic healing usually succeeds. For larger gaps (0.1-1mm), use interactive filling with curvature matching. Gaps > 1mm indicate a serious model problem — request a corrected file from the designer. Never leave gaps in the model; toolpath calculations fail unpredictably near gaps, producing gouges or missed material.

**Category:** cam_strategy
**Confidence:** 90
**Source:** web:worknc-docs
**Operations:** general

## Related
- [[edgecam-cam-tips-ec-119|Edgecam Solid Import with Healing and Repair]]
- [[topsolid-cam-tips-ts-141|TopSolid'Design Import Healing — Automatic Repair of Imported Geometry]]
- [[worknc-cam-tips-wnc-140|WorkNC Designer — Surface Preparation for CAM]]
- [[worknc-cam-tips-wnc-141|WorkNC Designer Surface Extension — Cutter Runoff for Edge Quality]]
- [[worknc-cam-tips-wnc-143|WorkNC Designer Check Surfaces — Controlling Tool Approach Boundaries]]
