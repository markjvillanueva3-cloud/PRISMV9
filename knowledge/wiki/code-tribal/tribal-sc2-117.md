---
name: tribal-sc2-117
category: code-tribal
subdomain: probing
domain: tribal-knowledge
tags: ["in-process-inspection", "critical-dimensions", "conditional", "macro"]
confidence: 87
source: "web:surfcam-in-process"
promoted_from: knowledge/tribal/surfcam-cam-tips-sc2-117.md
promoted_at: 2026-06-09T22:31:16.685Z
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
