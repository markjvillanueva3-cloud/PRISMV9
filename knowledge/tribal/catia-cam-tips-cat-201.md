---
id: "cat-201"
title: "DELMIA-CATIA Manufacturing Data Exchange for Process Planning"
source: "web:dassault-forum"
confidence: 0.82
category: "cam_strategy"
tags: ["catia", "delmia", "process-planning", "bop", "integration"]
_source: "catia-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.973Z
---

# DELMIA-CATIA Manufacturing Data Exchange for Process Planning

CATIA Manufacturing Programs integrate with DELMIA Process Planning on the 3DEXPERIENCE platform. The DELMIA 'Process Planner' role defines the high-level manufacturing Bill of Process (BOP): operations, work centers, time standards, and resource assignments. The CATIA 'NC Programmer' role then details each BOP operation with specific tool paths. The link is maintained through 'Manufacturing Item' objects — DELMIA's BOP references the same Manufacturing Items that CATIA's NC programs machine. Changes flow bidirectionally: if DELMIA re-sequences operations, CATIA's manufacturing program reorders accordingly; if CATIA's cycle time estimate changes, DELMIA's time standard updates.

**Category:** cam_strategy
**Confidence:** 0.82
**Source:** web:dassault-forum
**Operations:** setup

## Related
- [[catia-cam-tips-cat-044|Adaptive Roughing Maintains Constant Tool Engagement]]
- [[catia-cam-tips-cat-075|Cloud CAM on 3DEXPERIENCE Enables Browser-Based NC Programming]]
- [[catia-cam-tips-cat-076|DELMIA Machining Integration for Shop Floor Connectivity]]
- [[catia-cam-tips-cat-185|Multi-Setup Fixture Design Integration with Machining Program]]
- [[catia-cam-tips-cat-203|DELMIA Robotics Integration for Automated Part Loading]]
