---
id: "ec-166"
title: "Honeycomb Core Machining with Vacuum Fixturing"
source: "web:edgecam-forum"
confidence: 0.8
category: "cam_strategy"
tags: ["composite", "honeycomb", "vacuum-fixture", "dust-extraction"]
_source: "edgecam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:42.396Z
---

# Honeycomb Core Machining with Vacuum Fixturing

Program honeycomb core machining with minimal cutting forces to prevent cell wall damage. Use sharp, uncoated carbide tools with high helix angles (45-60°). Set axial depth to one cell height per pass and radial engagement to 30-50% of tool diameter. In Edgecam, program dust extraction M-codes instead of coolant — liquid coolant contaminates honeycomb cells. Define the vacuum fixture table as a fixture body in the machine setup to prevent plunging through the part into the vacuum table.

**Category:** cam_strategy
**Confidence:** 0.8
**Source:** web:edgecam-forum
**Operations:** roughing, finishing

## Related
- [[bobcad-cam-tips-bc-191|BobCAD Honeycomb Core Machining Strategies]]
- [[fusion360-cam-tips-ext-f360-185|Honeycomb Core Machining Strategy]]
- [[catia-cam-tips-cat-207|Honeycomb Core Machining with Ultrasonic-Assisted Cutting in CATIA]]
- [[catia-cam-tips-cat-208|Composite Edge Trimming with Dust Extraction Path Planning]]
- [[fusion360-cam-tips-ext-f360-184|Composite Edge Finishing with Burr Tool]]
