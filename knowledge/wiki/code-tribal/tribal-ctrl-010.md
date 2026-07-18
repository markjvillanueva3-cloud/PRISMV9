---
name: tribal-ctrl-010
category: code-tribal
subdomain: programming
domain: tribal-knowledge
tags: ["fanuc", "rigid-tapping", "g84", "m29", "synchronization"]
confidence: 92
source: "controller:fanuc_tapping_guide"
promoted_from: knowledge/tribal/controller-knowledge-tips-ctrl-010.md
promoted_at: 2026-05-26T16:07:20.117Z
---

# Fanuc rigid tapping G84 with synchronization

Fanuc rigid tapping (G84 with M29 or G84.2/G84.3) synchronizes spindle and Z-axis for tap-without-tension-compression holders. Key: set parameter #5200 bit 2 = 1 for rigid tap mode. Retract override is parameter #5211. For blind holes, use G84 with G80 cancel, and ensure bottom dwell (P parameter in ms). Max rigid tap speed depends on servo loop — typically 3000-5000 RPM on 0i-MF, 6000+ on 31i.

**Category:** programming
**Confidence:** 92
**Source:** controller:fanuc_tapping_guide

## Related
- [[controller-knowledge-tips-ctrl-062|Fanuc M19 spindle orientation and rigid tapping]]
- [[bobcad-cam-tips-bc-090|Machine-Specific Posts for Major CNC Brands]]
- [[camworks-cam-tips-cw-088|Machine-Specific Post Output — Optimize for Controller Capabilities]]
- [[controller-knowledge-tips-ctrl-001|Fanuc AI Contour Control for 5-axis surface finish]]
- [[controller-knowledge-tips-ctrl-002|Fanuc Nano Smoothing vs AI Contour Control]]
