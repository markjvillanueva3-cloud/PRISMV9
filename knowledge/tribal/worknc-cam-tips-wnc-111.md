---
id: "wnc-111"
title: "Reference Rest Machining Targets Previous Tool Leftovers"
source: "web:worknc-refrest"
confidence: 93
category: "cam_strategy"
tags: ["reference-rest", "automatic", "previous-tool", "pioneer"]
_source: "worknc-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.707Z
---

# Reference Rest Machining Targets Previous Tool Leftovers

WorkNC's reference rest machining uses the previous tool's geometry to calculate exactly where material remains and generates toolpaths only in those areas. The reference tool diameter and corner radius define the rest material boundary. Use a tool 50-70% of the reference tool size. This is WorkNC's core rest machining capability and was the first automatic remachining system in any CAM software.

**Category:** cam_strategy
**Confidence:** 93
**Source:** web:worknc-refrest
**Operations:** rest_machining

## Related
- [[bobcad-cam-tips-bc-070|Feature Recognition for Automated Operation Suggestion]]
- [[camworks-cam-tips-cw-108|Automatic Tool Selection — Let TechDB Choose the Best Tool]]
- [[cimatron-cam-tips-cim-070|Steep and Shallow Automatic Strategy Assignment]]
- [[controller-knowledge-tips-ctrl-043|Index C200 multi-spindle programming with virtual axes]]
- [[esprit-cam-tips-esp-089|Automatic Feature Recognition from Solid Models]]
