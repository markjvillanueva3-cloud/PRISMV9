---
name: tribal-wnc-124
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["auto-5", "collision", "holder", "spindle", "clearance"]
confidence: 91
source: "web:worknc-docs"
promoted_from: knowledge/tribal/worknc-cam-tips-wnc-124.md
promoted_at: 2026-05-26T16:07:21.584Z
---

# Auto5 Collision Body Definition — Tool, Holder, and Spindle

Auto5 checks collisions against the complete tool assembly: cutting tool, holder, collet/chuck, and spindle nose. Define each component with accurate dimensions in the tool library. The most common collision during Auto5 conversion is between the holder and part walls — not the cutter itself. Set a safety clearance margin (1-3mm) between collision bodies and the part to account for machine positioning accuracy. For deep cavities, use ER collet holders instead of hydraulic chucks — the smaller profile provides 5-10mm more clearance.

**Category:** cam_strategy
**Confidence:** 91
**Source:** web:worknc-docs
**Operations:** 5_axis

## Related
- [[camworks-cam-tips-cw-080|Collision Detection — Check Tool, Holder, and Spindle Against Part]]
- [[topsolid-cam-tips-ts-062|Collision Detection Covers Full Tool Assembly]]
- [[catia-cam-tips-cat-059|Tool Holder Definition Enables Accurate Collision Checking]]
- [[cimatron-cam-tips-cim-010|Tool Assembly Collision Checking]]
- [[cimatron-cam-tips-cim-093|Collision Checking with Complete Tool Assembly]]
