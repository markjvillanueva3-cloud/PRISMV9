---
name: tribal-f360-120
category: code-tribal
subdomain: quality
domain: tribal-knowledge
tags: ["fusion360", "probing", "in-process", "inspection", "manufacturing-extension"]
confidence: 0
source: "web:fusion360-docs"
promoted_from: knowledge/tribal/fusion360-cam-tips-ext-f360-120.md
promoted_at: 2026-06-09T22:31:16.281Z
---

# Surface Inspection with In-Process Probing

The Manufacturing Extension enables in-process probing operations that measure critical surfaces between cutting operations. Insert a Probing operation after semi-finish to verify stock distribution before the finish pass. If the probe detects excess stock (>0.15mm over nominal), the system can trigger a re-cut. Configure probe approach speed at 500-1000mm/min and retract at 2000mm/min. Use the WCS Update feature to compensate for part shift during heavy roughing — probe three reference points and let Fusion adjust the remaining toolpaths.

**Category:** quality
**Confidence:** 0.85
**Source:** web:fusion360-docs
**Operations:** probing

## Related
- [[camworks-cam-tips-cw-117|In-Process Inspection — Verify Critical Dimensions Mid-Program]]
- [[edgecam-cam-tips-ec-111|In-Process Inspection Between Operations]]
- [[esprit-cam-tips-esp-117|In-Process Inspection Between Operations]]
- [[fusion360-cam-tips-f360-037|Probe Geometry for Tool Wear Compensation]]
- [[gibbscam-cam-tips-gc-118|In-process inspection catches dimensional drift before scrapping parts]]
