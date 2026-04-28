---
id: "spr-019"
title: "Canned Drilling Cycles Configuration"
source: "web:sprutcam-docs"
confidence: 0.88
category: "cam_strategy"
tags: ["canned-cycles", "drilling", "g83", "peck"]
_source: "sprutcam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:43.861Z
---

# Canned Drilling Cycles Configuration

Configure SprutCAM's canned drilling cycles per controller type. Standard mappings: G81 (spot/simple drill), G83 (deep hole peck with full retract), G73 (chip breaking with partial retract), G84 (tapping), G85/G86 (boring). Set peck depth progression (e.g., first peck 5×D, subsequent 3×D, final 1×D) for deep holes. Enable 'Dwell' at bottom for blind holes to ensure full-diameter cutting.

**Category:** cam_strategy
**Confidence:** 0.88
**Source:** web:sprutcam-docs
**Operations:** drilling

## Related
- [[surfcam-cam-tips-sc2-051|Turning Center Drilling with Configurable Canned Cycles]]
- [[surfcam-cam-tips-sc2-212|SURFCAM Post Processor Canned Cycle Customization]]
- [[controller-knowledge-tips-ctrl-005|Fanuc high-speed peck drilling G73 vs G83]]
- [[bobcad-cam-tips-bc-049|Center Drilling and Canned Cycle Mapping]]
- [[camworks-cam-tips-cw-087|Canned Cycle Output — Map Operations to Controller Drill Cycles]]
