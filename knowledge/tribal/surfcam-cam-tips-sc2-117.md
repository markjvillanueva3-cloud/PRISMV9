---
id: "sc2-117"
title: "In-Process Inspection for Critical Dimensions"
source: "web:surfcam-in-process"
confidence: 87
category: "probing"
tags: ["in-process-inspection", "critical-dimensions", "conditional", "macro"]
_source: "surfcam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.135Z
---

# In-Process Inspection for Critical Dimensions

SURFCAM in-process inspection inserts probing cycles between machining operations to verify critical dimensions before proceeding. For example, probe a bore diameter after semi-finish boring — if it's oversized, skip the finish bore and alert the operator; if undersized, adjust the offset and run the finish bore. This prevents scrap from accumulating through multiple operations. Program conditional logic using macro variables (Fanuc #100-#199) to make go/no-go decisions.

**Category:** probing
**Confidence:** 87
**Source:** web:surfcam-in-process
**Operations:** probing, finishing

## Related
- [[bobcad-cam-tips-bc-121|In-Process Inspection for Critical Dimensions]]
- [[mastercam-cam-tips-mc-110|In-process inspection probes critical dimensions between operations]]
- [[catia-cam-tips-cat-176|Knowledge Pattern for Automated Multi-Operation Machining Sequences]]
- [[edgecam-cam-tips-ec-144|Code Wizard Variable System for Machine-Specific Output]]
- [[esprit-cam-tips-esp-075|Variable Output and Conditional Logic in Posts]]
