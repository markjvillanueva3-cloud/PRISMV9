---
id: "gc-047"
title: "C-axis milling converts the lathe spindle into a rotary positioning axis"
source: "web:gibbscam-docs"
confidence: 87
category: "cam_strategy"
tags: ["gibbscam", "mtm", "c-axis", "milling", "rotary-positioning"]
_source: "gibbscam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:42.868Z
---

# C-axis milling converts the lathe spindle into a rotary positioning axis

C-axis milling in GibbsCAM MTM locks the lathe spindle at a precise angular position, enabling milling operations like cross-holes, flats, keyways, and hex features. Define the C-axis zero position and program milling operations using standard 2.5D strategies. For cross-drilled holes, set the C-axis angle for each hole position. GibbsCAM handles the C-axis positioning M-codes and spindle clamp/unclamp sequences automatically. When chaining C-axis milling with turning, add a C-axis unclamp operation between them to release the spindle for turning rotation.

**Category:** cam_strategy
**Confidence:** 87
**Source:** web:gibbscam-docs

## Related
- [[gibbscam-cam-tips-gc-141|MTM C-axis milling on the sub-spindle requires transformed coordinate origin]]
- [[gibbscam-cam-tips-gc-153|B-axis milling in GibbsCAM enables angled holes and contours without refixturing]]
- [[gibbscam-cam-tips-gc-041|MTM Sync Manager visually coordinates multi-channel simultaneous operations]]
- [[gibbscam-cam-tips-gc-042|Swiss-type programming requires guide bushing offset for Z-axis accuracy]]
- [[gibbscam-cam-tips-gc-043|Multi-spindle machines benefit from balanced operation time per spindle station]]
