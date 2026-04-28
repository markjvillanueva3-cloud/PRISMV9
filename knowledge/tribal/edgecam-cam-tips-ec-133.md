---
id: "ec-133"
title: "Edgecam Designer Geometry Repair for Imported Models"
source: "web:edgecam-docs"
confidence: 0.86
category: "cam_strategy"
tags: ["designer", "geometry-repair", "import", "stitch"]
_source: "edgecam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:42.369Z
---

# Edgecam Designer Geometry Repair for Imported Models

Edgecam Designer includes automatic geometry repair for imported STEP/IGES files. Run 'Check Model' to identify gaps, overlaps, and degenerate faces. Use 'Stitch' to close gaps up to a specified tolerance (start at 0.01mm, increase to 0.1mm if needed). 'Delete and Fill' removes problematic faces and replaces them with clean surfaces. Always repair before machining — bad geometry causes toolpath gaps and gouges.

**Category:** cam_strategy
**Confidence:** 0.86
**Source:** web:edgecam-docs
**Operations:** all

## Related
- [[topsolid-cam-tips-ts-141|TopSolid'Design Import Healing — Automatic Repair of Imported Geometry]]
- [[edgecam-cam-tips-ec-131|Edgecam Designer Push-Pull Direct Modeling for Fixturing]]
- [[edgecam-cam-tips-ec-132|Edgecam Designer Stock Model Creation from Raw Material]]
- [[edgecam-cam-tips-ec-134|Edgecam Designer Split Face for Selective Machining]]
- [[edgecam-cam-tips-ec-135|Edgecam Designer Offset Surface for Electrode Design]]
