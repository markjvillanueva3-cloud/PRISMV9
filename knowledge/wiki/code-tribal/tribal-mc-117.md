---
name: tribal-mc-117
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["mastercam", "common-edge", "shared-wall", "double-cut", "avoidance", "containment"]
confidence: 83
source: "web:community"
promoted_from: knowledge/tribal/mastercam-cam-tips-mc-117.md
promoted_at: 2026-06-09T22:31:16.424Z
---

# Common edge detection in Mastercam prevents double-cutting shared pocket walls

When adjacent pockets share a common wall, both pocket toolpaths machine the same edge, producing a double-cut witness line and wasting time. Mastercam's containment and avoidance regions can be configured to assign shared walls to only one pocket's toolpath. Define the shared wall as an avoidance boundary in one pocket and a cutting boundary in the adjacent pocket. This eliminates the double-cut and reduces total contouring time by the number of shared edges multiplied by 2x the wall height. Critical for mold cavity blocks with grid-pattern cooling channels or multi-pocket fixture plates.

**Category:** cam_strategy
**Confidence:** 83
**Source:** web:community
**Operations:** pocketing, contouring, finishing

## Related
- [[mastercam-cam-tips-mc-113|Reduce air cutting by using stock-aware toolpaths and tight containment boundaries]]
- [[mastercam-cam-tips-mc-182|Material boundary auto-detection in rest machining eliminates manual containment definition]]
- [[mastercam-cam-tips-mc-196|Boundary chains for 3D toolpaths must be projected correctly onto the machining surfaces]]
- [[mastercam-cam-tips-mc-257|Combining Equal Scallop with Steep/Shallow boundary yields optimal finish across mixed-angle surfaces]]
- [[wedm-knowledge-tips-wedm-mcam-001-2|Wire overburn decreases progressively per pass — 0.035→0.02→0.01→0]]
