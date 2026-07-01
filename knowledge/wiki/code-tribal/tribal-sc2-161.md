---
name: tribal-sc2-161
category: code-tribal
subdomain: speeds_feeds
domain: tribal-knowledge
tags: ["swiss-type", "micro-machining", "feed-rate", "minimum-feed", "sub-micron"]
confidence: 0
source: "web:surfcam-docs"
promoted_from: knowledge/tribal/surfcam-cam-tips-sc2-161.md
promoted_at: 2026-06-09T22:31:16.695Z
---

# SURFCAM Swiss-Type Micro-Machining Feed Rate Constraints

For Swiss-type micro-machining (features <0.5mm), SURFCAM requires careful feed rate management because the machine's minimum commanded feed may exceed the desired chip load. Calculate the minimum achievable feed per tooth: min_feed = (machine_min_feedrate) / (RPM × flutes). If this exceeds the target chip load, reduce RPM rather than increasing feed. For 0.3mm end mills at 40,000 RPM, the minimum chip load is typically 0.001-0.003mm/tooth. Enable SURFCAM's micro-machining mode to use sub-micron positioning resolution.

**Category:** speeds_feeds
**Confidence:** 0.84
**Source:** web:surfcam-docs
**Operations:** finishing, turning

## Related
- [[esprit-cam-tips-esp-049|Live Tooling RPM and Feed for Swiss Machines]]
- [[bobcad-cam-tips-bc-167|BobCAD Swiss-Type Lathe Programming with Guide Bushing]]
- [[bobcad-cam-tips-bc-168|BobCAD Swiss-Type Gang Tooling Layout Optimization]]
- [[bobcad-cam-tips-bc-169|BobCAD Swiss-Type Cross-Drilling and Cross-Milling]]
- [[bobcad-cam-tips-bc-170|BobCAD Swiss-Type Sub-Spindle Back-Working Operations]]
