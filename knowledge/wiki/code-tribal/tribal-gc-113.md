---
name: tribal-gc-113
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["gibbscam", "material-specific", "brass", "zero-rake", "chip-breaking"]
confidence: 85
source: "web:community"
promoted_from: knowledge/tribal/gibbscam-cam-tips-gc-113.md
promoted_at: 2026-06-09T22:31:16.341Z
---

# Brass machining uses zero-rake tooling and controlled chip breaking

Brass and bronze alloys require special attention in GibbsCAM because these materials can 'grab' positive-rake tools, pulling the cutter into the workpiece. Use zero-rake or negative-rake end mills. Set feed per tooth higher than for steel (0.15-0.25mm) because brass cuts easily and higher feed prevents rubbing. For leaded brass (C360), chips break naturally. For non-leaded brass (C260), program peck cycles for drilling and add chip-breaking retracts in pocketing. Surface speed can be aggressive (200-400 m/min with carbide). Avoid coolant with leaded brass as it creates hazardous lead-contaminated waste—use dry or MQL.

**Category:** cam_strategy
**Confidence:** 85
**Source:** web:community

## Related
- [[gibbscam-cam-tips-gc-095|Material-specific cutting data tables eliminate manual speed/feed calculation]]
- [[gibbscam-cam-tips-gc-109|Aluminum machining benefits from high RPM, high feed, and full flute engagement]]
- [[gibbscam-cam-tips-gc-110|Titanium machining requires low surface speed and constant chip load monitoring]]
- [[gibbscam-cam-tips-gc-111|Stainless steel programming avoids dwelling and light cuts that cause hardening]]
- [[gibbscam-cam-tips-gc-112|Hardened steel (>50 HRC) requires rigid tool assemblies and light radial engagement]]
