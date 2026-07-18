---
name: tribal-gc-066
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["gibbscam", "wire-edm", "no-core", "coreless", "slug-elimination"]
confidence: 85
source: "web:gibbscam-docs"
promoted_from: knowledge/tribal/gibbscam-cam-tips-gc-066.md
promoted_at: 2026-06-09T22:31:16.329Z
---

# No-core cutting eliminates slug dropping for small internal features

For small internal cutouts where the slug would be difficult to manage, use GibbsCAM's no-core (coreless) cutting strategy. Instead of cutting a complete profile and dropping the slug, the wire erodes the entire enclosed area by making multiple passes with overlapping offsets. This is slower than conventional cutting but eliminates slug handling and the risk of slugs jamming. Ideal for features smaller than 10mm diameter in thick workpieces. Set the overlap percentage to 30-50% between passes for complete material removal.

**Category:** cam_strategy
**Confidence:** 85
**Source:** web:gibbscam-docs

## Related
- [[bobcad-cam-tips-bc-155|BobCAD Wire EDM No-Core Cutting Strategy]]
- [[esprit-cam-tips-esp-155|Wire EDM No-Core (Coreless) Cutting Strategy]]
- [[wedm-knowledge-tips-wedm-mcam-005-2|No Core toolpath removes material without slugs — zigzag or spiral cutting]]
- [[gibbscam-cam-tips-gc-063|2-axis wire EDM uses automatic lead-in to prevent witness marks on part]]
- [[gibbscam-cam-tips-gc-064|4-axis taper EDM requires top/bottom profile synchronization with tight tolerance]]
