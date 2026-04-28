---
id: "cat-211"
title: "Statistical Tolerance Stack-Up Impact on Machining Sequence"
source: "web:dassault-forum"
confidence: 0.82
category: "cam_strategy"
tags: ["catia", "tolerance", "stack-up", "rss", "statistical"]
_source: "catia-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.981Z
---

# Statistical Tolerance Stack-Up Impact on Machining Sequence

When multiple machining operations contribute to a final dimension (e.g., bore diameter after rough-semi-finish-finish), the tolerance consumed by each operation follows a statistical stack-up. In CATIA, allocate tolerances using RSS (Root Sum of Squares): if the total tolerance is 0.025mm and three operations contribute, each gets 0.025/√3 = 0.014mm rather than 0.025/3 = 0.008mm. This is less conservative and allows higher feed rates in intermediate operations. Set each operation's stock allowance and tolerance in the CATIA machining parameters to reflect the RSS-allocated values. Verify the statistical assumption holds by measuring Cpk at each operation step.

**Category:** cam_strategy
**Confidence:** 0.82
**Source:** web:dassault-forum
**Operations:** finishing

## Related
- [[cimatron-cam-tips-cim-040|Statistical Tolerance Stack-Up for Mold Assemblies]]
- [[catia-cam-tips-cat-011|Wall Finishing With Spring Pass for Tolerance Control]]
- [[catia-cam-tips-cat-056|Gouge Detection Sensitivity Settings for Different Operations]]
- [[catia-cam-tips-cat-102|Machining Tolerance vs Surface Tolerance Distinction]]
- [[catia-cam-tips-cat-170|FBM Manufacturing Rules for Hole Tolerance-Based Process Selection]]
