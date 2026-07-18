---
name: tribal-spr-019
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["canned-cycles", "drilling", "g83", "peck"]
confidence: 0
source: "web:sprutcam-docs"
promoted_from: knowledge/tribal/sprutcam-cam-tips-spr-019.md
promoted_at: 2026-06-09T22:31:16.623Z
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
