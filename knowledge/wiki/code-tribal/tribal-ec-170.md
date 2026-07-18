---
name: tribal-ec-170
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["hard-turning", "cbn", "ceramic", "surface-finish"]
confidence: 0
source: "web:edgecam-docs"
promoted_from: knowledge/tribal/edgecam-cam-tips-ec-170.md
promoted_at: 2026-06-09T22:31:16.201Z
---

# Hard Turning versus Hard Milling Decision Criteria

In Edgecam, choose hard turning over hard milling when: the part is axially symmetric, surface finish requirement is Ra 0.2-0.8μm (achievable with CBN inserts), and the hardness is 55-68 HRC. Hard turning uses CBN or ceramic inserts at 150-250 m/min, 0.05-0.15 mm/rev feed, 0.1-0.3mm depth of cut. For interrupted cuts (keyways, cross-holes), use ceramic inserts which handle impact better than CBN. Set Edgecam's constant surface speed (G96) with max RPM limiter.

**Category:** cam_strategy
**Confidence:** 0.86
**Source:** web:edgecam-docs
**Operations:** turning, finishing

## Related
- [[esprit-cam-tips-esp-030|ProfitTurning Hard Turning with CBN/Ceramic Inserts]]
- [[edgecam-cam-tips-ec-174|CBN Insert Management for Hard Turning Tool Life]]
- [[bobcad-cam-tips-bc-117|Hardened Steel (>45 HRC) with Light Passes and Dry Cutting]]
- [[camworks-cam-tips-cw-123|Hardened Steel Machining — CBN/Ceramic Tooling with Light Cuts]]
- [[cimatron-cam-tips-cim-076|Hardened Steel Finishing Parameters for Mold and Die]]
