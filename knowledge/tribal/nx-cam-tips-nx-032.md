---
id: "nx-032"
title: "Mill-Turn Avoidance and Containment Planes"
source: "web:siemens-docs"
confidence: 85
category: "safety"
tags: ["nx", "mill-turn", "avoidance", "containment-planes", "crash-prevention"]
_source: "nx-cam-tips.ts"
indexed_at: 2026-04-28T01:00:43.519Z
---

# Mill-Turn Avoidance and Containment Planes

Define avoidance moves and containment planes for each spindle in NX mill-turn to protect the chuck, jaws, tailstock, and turret. Containment planes act as virtual walls the tool cannot cross. Set these per-spindle because the safe zones differ between main and sub spindle operations. Missing containment planes are the most common cause of mill-turn crashes.

**Category:** safety
**Confidence:** 85
**Source:** web:siemens-docs
**Operations:** turning, mill-turn

## Related
- [[nx-cam-tips-nx-031|Mill-Turn Dual Spindle IPW Transfer]]
- [[nx-cam-tips-nx-033|Rotary Roughing for Cylindrical Turn-Mill Parts]]
- [[nx-cam-tips-nx-001|VBM Face Selection for Prismatic Volumes]]
- [[nx-cam-tips-nx-002|VBM Volume Sequencing for Multi-Step Roughing]]
- [[nx-cam-tips-nx-003|VBM Associativity with CAD Changes]]
