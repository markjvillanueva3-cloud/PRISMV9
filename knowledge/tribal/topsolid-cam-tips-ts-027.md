---
id: "ts-027"
title: "Pencil Finishing Cleans Internal Corners and Fillets"
source: "web:topsolid-pencil"
confidence: 92
category: "cam_strategy"
tags: ["pencil", "corners", "fillets", "cleanup"]
_source: "topsolid-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.407Z
---

# Pencil Finishing Cleans Internal Corners and Fillets

TopSolid's pencil finishing (pencil trace) calculates where the tool contacts two surfaces simultaneously (internal corners and fillets) and generates passes only along these intersection lines. This produces clean, well-defined corners without machining the entire surface. Use a ball-nose cutter equal to or slightly smaller than the fillet radius. Multiple passes with increasing depth can achieve blend-free corners in mold cavities.

**Category:** cam_strategy
**Confidence:** 92
**Source:** web:topsolid-pencil
**Operations:** finishing, 3d_finishing

## Related
- [[worknc-cam-tips-wnc-028|Pencil Finishing Cleans Corners and Fillet Regions]]
- [[camworks-cam-tips-cw-037|Pencil Trace — Clean Internal Fillets and Blend Regions]]
- [[cimatron-cam-tips-cim-071|Pencil Tracing for Corner Cleanup]]
- [[hypermill-cam-tips-ext-hm-136|Pencil Tracing for Corner Cleanup]]
- [[powermill-cam-tips-pm-075|Pencil Finishing for Internal Corner Cleanup]]
