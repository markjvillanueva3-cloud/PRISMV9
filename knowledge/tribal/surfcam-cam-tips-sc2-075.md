---
id: "sc2-075"
title: "Tool Library with Complete Assembly Definitions"
source: "web:surfcam-tool-library"
confidence: 88
category: "setup"
tags: ["tool-library", "assembly", "holder", "cutting-data", "backup"]
_source: "surfcam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.089Z
---

# Tool Library with Complete Assembly Definitions

SURFCAM tool library stores complete tool assemblies: cutter, holder, arbor, and collet as a single unit. Define the holder geometry accurately (tapered body, flange, grip groove) because it is used for collision detection. For each tool, store the cutting data (speed, feed, depth) per material to auto-populate machining parameters when the tool is selected. Group tools by machine or department for quick access. Export tool libraries as backup files before major edits.

**Category:** setup
**Confidence:** 88
**Source:** web:surfcam-tool-library
**Operations:** setup

## Related
- [[esprit-cam-tips-esp-092|Centralized Tool Library with Assembly Management]]
- [[gibbscam-cam-tips-gc-093|Tool library centralizes cutting data for company-wide consistency]]
- [[mastercam-cam-tips-mc-098|Sandvik CoroPlus integration imports validated cutting data directly into tool library]]
- [[bobcad-cam-tips-bc-040|Collision Avoidance with Full Assembly Checking]]
- [[catia-cam-tips-cat-059|Tool Holder Definition Enables Accurate Collision Checking]]
