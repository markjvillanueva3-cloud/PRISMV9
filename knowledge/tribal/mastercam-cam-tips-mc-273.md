---
id: "mc-273"
title: "Mastercam for SolidWorks in-process stock display shows remaining material at each operation stage"
source: "web:mastercam-docs"
confidence: 82
category: "cam_strategy"
tags: ["mastercam", "solidworks", "in-process-stock", "visualization", "stock-model", "verification"]
_source: "mastercam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:43.335Z
---

# Mastercam for SolidWorks in-process stock display shows remaining material at each operation stage

MCAM-SW provides an in-process stock visualization directly in the SolidWorks graphics window. Right-click any operation in the Mastercam Operations Manager and select 'Show Stock' to display the remaining stock model overlaid on the SolidWorks part. The stock is shown as a semi-transparent body, making it easy to identify: (1) areas of excessive remaining stock that need additional roughing passes; (2) thin-wall conditions where stock removal on one side may cause deflection; (3) regions where rest machining is needed due to tool-radius limitations. Toggle between 'Stock Before' and 'Stock After' each operation to verify material removal progression. This visual feedback is faster than running a full Mastercam Verify simulation for quick stock checks during programming.

**Category:** cam_strategy
**Confidence:** 82
**Source:** web:mastercam-docs
**Operations:** general

## Related
- [[mastercam-cam-tips-mc-096|Save Stock Model at operation boundaries to speed up re-simulation]]
- [[mastercam-cam-tips-mc-176|Scaling micro toolpath output verifies dimensional accuracy before committing machine time]]
- [[mastercam-cam-tips-mc-178|Stock model generation from previous operations provides accurate rest material boundaries]]
- [[mastercam-cam-tips-mc-180|Rest finishing targets only areas where the semi-finish tool left excess material]]
- [[mastercam-cam-tips-mc-182|Material boundary auto-detection in rest machining eliminates manual containment definition]]
