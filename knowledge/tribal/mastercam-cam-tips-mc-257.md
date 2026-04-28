---
id: "mc-257"
title: "Combining Equal Scallop with Steep/Shallow boundary yields optimal finish across mixed-angle surfaces"
source: "web:mastercam-forum"
confidence: 86
category: "cam_strategy"
tags: ["mastercam", "equal-scallop", "steep-shallow", "boundary", "surface-finish", "containment"]
_source: "mastercam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:43.323Z
---

# Combining Equal Scallop with Steep/Shallow boundary yields optimal finish across mixed-angle surfaces

For parts with both steep walls and gentle floor regions, split the finishing into two Equal Scallop toolpaths using containment boundaries derived from a Steep/Shallow analysis. In Mastercam, create a Steep/Shallow boundary with the threshold angle set to 60-75° from horizontal. Assign one Equal Scallop toolpath to the shallow regions (using a ball mill with larger stepover limit, e.g., 0.5 mm) and another to the steep regions (using a bull-nose or ball mill with tighter scallop height, e.g., 0.003 mm). Overlap the boundary by 1-2 tool diameters to prevent a visible witness line at the transition. This approach is 30-40% faster than a single Equal Scallop over the entire part because the shallow-region toolpath uses wider stepovers where the curvature permits.

**Category:** cam_strategy
**Confidence:** 86
**Source:** web:mastercam-forum
**Operations:** finishing

## Related
- [[mastercam-cam-tips-mc-063|Steep/Shallow boundary angle must match between roughing and finishing]]
- [[mastercam-cam-tips-mc-182|Material boundary auto-detection in rest machining eliminates manual containment definition]]
- [[mastercam-cam-tips-mc-256|Equal Scallop toolpath maintains constant cusp height across varying surface curvature for uniform finish]]
- [[mastercam-cam-tips-mc-259|Equal Scallop spiral pattern eliminates step-marks by using continuous spiral motion instead of offset rows]]
- [[mastercam-cam-tips-mc-056|Parallel finishing with 45-degree cut angle hides machining marks on flat surfaces]]
