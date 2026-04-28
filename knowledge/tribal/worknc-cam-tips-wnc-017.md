---
id: "wnc-017"
title: "Rest from Roughing Targets Unmachined Stock Zones"
source: "web:worknc-restrough"
confidence: 92
category: "cam_strategy"
tags: ["rest-roughing", "stock-detection", "reference-tool", "efficiency"]
_source: "worknc-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.634Z
---

# Rest from Roughing Targets Unmachined Stock Zones

WorkNC's rest-from-roughing operation calculates the remaining stock after the initial roughing pass and generates toolpaths only in areas where material remains. Reference the previous tool and operation to compute the rest zones. Use a tool 50-70% of the roughing tool diameter. The rest detection threshold should be 0.1-0.2 mm above the stock allowance to ensure complete material removal without redundant passes.

**Category:** cam_strategy
**Confidence:** 92
**Source:** web:worknc-restrough
**Operations:** roughing, rest_machining

## Related
- [[topsolid-cam-tips-ts-014|Rest Roughing Automatically Targets Unmachined Regions]]
- [[topsolid-cam-tips-ts-105|Air Cut Reduction Skips Empty Passes]]
- [[nx-cam-tips-ext-nx-132|Rest Milling with Progressive Tool Sizing]]
- [[edgecam-cam-tips-ec-123|Waveform Rest Roughing with Automatic Stock Tracking]]
- [[gibbscam-cam-tips-gc-028|VoluMill rest roughing identifies and cleans residual stock from larger tool]]
