---
name: tribal-bc-020
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["islands", "pocket", "multi-level", "detection", "draft-angle"]
confidence: 88
source: "web:bobcad-island-machining"
promoted_from: knowledge/tribal/bobcad-cam-tips-bc-020.md
promoted_at: 2026-06-09T22:31:15.936Z
---

# Island Machining with Automatic Detection and Multi-Level

BobCAD pocket milling automatically detects islands within pocket boundaries. For multi-level pockets with islands, each Z-level regenerates the island boundary if the island has draft angles or variable cross-sections. Use spiral-out pattern for blind pockets (best chip evacuation) and offset pattern for open pockets (fastest cycle). Enable 'Machine islands first' to prevent deflection from uncut stock around narrow features. Set island stock allowance independently from pocket wall stock.

**Category:** cam_strategy
**Confidence:** 88
**Source:** web:bobcad-island-machining
**Operations:** pocketing, 2.5d_milling

## Related
- [[cimatron-cam-tips-cim-170|Pocket with Progressive Level Cutting]]
- [[hypermill-cam-tips-ext-hm-178|Pocket with Progressive Island Detection]]
- [[powermill-cam-tips-pm-132|Pocket with Island Detection]]
- [[powermill-cam-tips-pm-182|Pocket Island Detection Validation]]
- [[surfcam-cam-tips-sc2-022|Island Machining with Tapered Walls and Draft Angles]]
