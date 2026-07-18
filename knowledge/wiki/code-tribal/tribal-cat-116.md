---
name: tribal-cat-116
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["catia", "reaming", "pilot-hole", "feed", "drilling"]
confidence: 90
source: "web:catia-docs"
promoted_from: knowledge/tribal/catia-cam-tips-cat-116.md
promoted_at: 2026-05-26T16:07:20.081Z
---

# Reaming Requires Precise Pilot Hole and Low Feed

In CATIA reaming operations, the pilot hole must be drilled to 92-96% of the final reamer diameter (e.g., 9.7-9.8mm pilot for a 10mm reamer). Ream at 50% of the drilling RPM and 200-300% of the drilling feed (reamers are designed for high feed, low speed). Never peck a reamer — it must enter in one continuous motion to maintain concentricity. In CATIA, set the reaming cycle to G85 (feed-in, feed-out) with zero dwell. Specify the reamer as a separate tool type, not as a drill, so the correct cycle is generated.

**Category:** cam_strategy
**Confidence:** 90
**Source:** web:catia-docs
**Operations:** drilling

## Related
- [[catia-cam-tips-cat-072|Canned Cycle Output for Drilling Operations]]
- [[catia-cam-tips-cat-089|Stainless Steel Chip Breaking Strategy in CATIA]]
- [[catia-cam-tips-cat-110|Spot Drilling Depth Controls Subsequent Drill Centering]]
- [[catia-cam-tips-cat-111|Center Drilling vs Spot Drilling Selection Criteria]]
- [[catia-cam-tips-cat-112|Peck Drilling Cycle Configuration for Deep Holes]]
