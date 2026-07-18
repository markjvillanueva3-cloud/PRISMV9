---
name: tribal-cat-211
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["catia", "tolerance", "stack-up", "rss", "statistical"]
confidence: 0
source: "web:dassault-forum"
promoted_from: knowledge/tribal/catia-cam-tips-cat-211.md
promoted_at: 2026-06-09T22:31:16.080Z
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
