---
name: tribal-teb-018
category: code-tribal
subdomain: roughing
domain: tribal-knowledge
tags: ["rest-roughing", "stock-model", "smaller-tool", "residual"]
confidence: 92
source: "web:tebis-docs"
promoted_from: knowledge/tribal/tebis-cam-tips-teb-018.md
promoted_at: 2026-05-26T16:07:20.616Z
---

# Rest Roughing Targets Material Left by Larger Tools

After initial roughing with a large tool, Tebis rest roughing identifies remaining material using the stock model and targets it with a smaller tool. The system calculates only where material remains, skipping already-cleared areas. Use a tool 40-60% of the previous tool diameter. Enable automatic detection of rest material thickness and skip areas with less than 0.5mm remaining. This typically removes 15-30% additional material before semi-finishing.

**Category:** roughing
**Confidence:** 92
**Source:** web:tebis-docs
**Operations:** roughing

## Related
- [[powermill-cam-tips-pm-004|Offset Area Clear Rest Roughing with Stock Model Input]]
- [[edgecam-cam-tips-ec-123|Waveform Rest Roughing with Automatic Stock Tracking]]
- [[gibbscam-cam-tips-gc-028|VoluMill rest roughing identifies and cleans residual stock from larger tool]]
- [[mastercam-cam-tips-mc-052|Rest roughing depth calculation must account for previous tool corner radius]]
- [[topsolid-cam-tips-ts-014|Rest Roughing Automatically Targets Unmachined Regions]]
