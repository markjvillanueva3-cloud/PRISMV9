---
name: tribal-gc-067
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["gibbscam", "wire-edm", "slug-retention", "tab-stop", "bridge"]
confidence: 86
source: "web:community"
promoted_from: knowledge/tribal/gibbscam-cam-tips-gc-067.md
promoted_at: 2026-06-09T22:31:16.329Z
---

# Slug retention with tab stops prevents uncontrolled slug dropping

For large slugs in GibbsCAM Wire EDM, program tab stops (bridges) that leave thin material connections between the slug and parent material. Set 2-4 tabs per slug, each 0.3-0.5mm wide. The tabs hold the slug in place until the operator manually breaks them free. Position tabs at locations where the slug's weight would cause it to shift during cutting—typically at the top of the profile for gravity-held slugs. After removing the slug, a separate skim pass can clean up the tab witness marks on the finished surface.

**Category:** cam_strategy
**Confidence:** 86
**Source:** web:community

## Related
- [[gibbscam-cam-tips-gc-063|2-axis wire EDM uses automatic lead-in to prevent witness marks on part]]
- [[gibbscam-cam-tips-gc-064|4-axis taper EDM requires top/bottom profile synchronization with tight tolerance]]
- [[gibbscam-cam-tips-gc-065|Skim cuts progressively improve surface finish and dimensional accuracy]]
- [[gibbscam-cam-tips-gc-066|No-core cutting eliminates slug dropping for small internal features]]
- [[gibbscam-cam-tips-gc-068|Glue stop technique uses adhesive to hold slugs for unattended operation]]
