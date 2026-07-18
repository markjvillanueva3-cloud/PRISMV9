---
name: tribal-ts-014
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["rest-roughing", "re-roughing", "stock-detection", "efficiency"]
confidence: 92
source: "web:topsolid-rest"
promoted_from: knowledge/tribal/topsolid-cam-tips-ts-014.md
promoted_at: 2026-05-26T16:07:20.688Z
---

# Rest Roughing Automatically Targets Unmachined Regions

TopSolid's rest roughing (re-roughing) calculates the remaining stock from previous roughing operations and generates toolpaths only in areas where material remains. Reference the previous tool diameter to compute rest material zones. Use a tool 50-70% of the previous roughing tool diameter, and set the rest material detection threshold to 0.1 mm above the stock allowance to ensure complete coverage without air cutting.

**Category:** cam_strategy
**Confidence:** 92
**Source:** web:topsolid-rest
**Operations:** roughing, rest_machining

## Related
- [[worknc-cam-tips-wnc-017|Rest from Roughing Targets Unmachined Stock Zones]]
- [[topsolid-cam-tips-ts-105|Air Cut Reduction Skips Empty Passes]]
- [[edgecam-cam-tips-ec-123|Waveform Rest Roughing with Automatic Stock Tracking]]
- [[gibbscam-cam-tips-gc-028|VoluMill rest roughing identifies and cleans residual stock from larger tool]]
- [[mastercam-cam-tips-mc-052|Rest roughing depth calculation must account for previous tool corner radius]]
