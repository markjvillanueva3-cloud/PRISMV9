---
name: tribal-teb-116
category: code-tribal
subdomain: optimization
domain: tribal-knowledge
tags: ["uncertainty-propagation", "multi-operation", "rss", "tolerance"]
confidence: 79
source: "web:tebis-forum"
promoted_from: knowledge/tribal/tebis-cam-tips-teb-116.md
promoted_at: 2026-06-09T22:31:16.731Z
---

# Uncertainty Propagation Through Multi-Operation Sequences

In multi-operation sequences (rough→semi→finish), uncertainty compounds. Each operation adds: position error (machine repeatability), thermal contribution (time-dependent), tool error (runout, wear). Propagate via RSS at each stage: σ_total = √(σ₁² + σ₂² + σ₃²...). This analysis determines whether a 4-operation sequence can achieve the target tolerance or needs additional operations.

**Category:** optimization
**Confidence:** 79
**Source:** web:tebis-forum
**Operations:** optimization

## Related
- [[sprutcam-cam-tips-spr-093|Uncertainty Propagation Through Multi-Operation Sequences]]
- [[cimatron-cam-tips-cim-123|Uncertainty Propagation Through Operations]]
- [[powermill-cam-tips-pm-156|Uncertainty Propagation Through Operations]]
- [[sprutcam-cam-tips-spr-159|Uncertainty Propagation Through Operations]]
- [[bobcad-cam-tips-bc-203|BobCAD Dimensional Uncertainty Budget for Critical Features]]
