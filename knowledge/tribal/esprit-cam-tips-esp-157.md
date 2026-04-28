---
id: "esp-157"
title: "Wire EDM Glue Stop Strategy for Slug Retention"
source: "web:esprit-docs"
confidence: 0.88
category: "cam_strategy"
tags: ["wire-edm", "glue-stop", "tab", "slug-retention", "unattended"]
_source: "esprit-cam-tips.ts"
indexed_at: 2026-04-28T01:00:42.596Z
---

# Wire EDM Glue Stop Strategy for Slug Retention

Glue stop (also called tab or bridge) strategy in ESPRIT leaves small uncut segments that hold the slug in place during wire EDM. Program under Wire EDM → Strategy → Glue Stops with tab width (0.3-1.0mm), tab count (2-4 per slug depending on weight), and tab positions (evenly spaced or user-defined). After all rough and skim cuts, manually break the tabs and finish the witness marks. For precision work, program a separate final skim pass that removes only the tab locations, minimizing witness mark cleanup. ESPRIT automatically adjusts the wire approach angle at each tab start/stop.

**Category:** cam_strategy
**Confidence:** 0.88
**Source:** web:esprit-docs
**Operations:** wire_edm

## Related
- [[bobcad-cam-tips-bc-066|Wire Threading and Glue Stop Programming]]
- [[gibbscam-cam-tips-gc-068|Glue stop technique uses adhesive to hold slugs for unattended operation]]
- [[bobcad-cam-tips-bc-157|BobCAD Wire EDM Tab and Bridge Cutting for Slug Retention]]
- [[camworks-cam-tips-cw-162|Wire EDM Auto-Threading and Recovery — Unattended Operation]]
- [[edgecam-cam-tips-ec-052|Wire EDM Threading and Slug Management]]
