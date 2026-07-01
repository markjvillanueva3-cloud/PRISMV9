---
name: tribal-wedm-kb-013
category: code-tribal
subdomain: speeds_feeds
domain: tribal-knowledge
tags: ["wire-edm", "thick-section", "flushing", "efficiency", "deep-cut"]
confidence: 90
source: "handbook:kunieda_2005_cirp"
promoted_from: knowledge/tribal/wedm-knowledge-tips-wedm-kb-013.md
promoted_at: 2026-05-26T16:07:21.280Z
---

# Thick section (>50mm): flushing efficiency degrades as 1/sqrt(thickness)

For sections thicker than 50mm, flushing efficiency degrades approximately as 1/sqrt(thickness/50). At 100mm thickness, flushing is ~71% efficient; at 150mm, ~58%. This means debris removal is incomplete, causing secondary discharges that worsen Ra and increase wire break risk. Compensate by: (1) increasing flush pressure to 8-10 bar, (2) reducing cutting speed by 20-40%, (3) using submerged cutting mode. Kunieda (2005) confirmed this empirically.

**Category:** speeds_feeds
**Confidence:** 90
**Source:** handbook:kunieda_2005_cirp
**Operations:** wire_edm

## Related
- [[wedm-knowledge-tips-wedm-kb-004|Flush pressure prevents wire breaks in deep cuts]]
- [[wedm-knowledge-tips-wedm-mcam-002-2|Reverse cutting method eliminates re-threading between passes]]
- [[esprit-cam-tips-esp-158|Wire EDM Submerged vs. Flushing Mode Selection]]
- [[mastercam-cam-tips-mc-121|Wire EDM flushing pressure must be balanced to prevent wire deflection and breakage]]
- [[surfcam-cam-tips-sc2-167|SURFCAM Wire EDM Submerged vs Flushing Mode Selection]]
