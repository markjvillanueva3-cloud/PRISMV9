---
name: tribal-wnc-017
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["rest-roughing", "stock-detection", "reference-tool", "efficiency"]
confidence: 92
source: "web:worknc-restrough"
promoted_from: knowledge/tribal/worknc-cam-tips-wnc-017.md
promoted_at: 2026-05-26T16:07:21.383Z
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
