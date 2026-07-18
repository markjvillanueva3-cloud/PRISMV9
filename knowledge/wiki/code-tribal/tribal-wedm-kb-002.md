---
name: tribal-wedm-kb-002
category: code-tribal
subdomain: troubleshooting
domain: tribal-knowledge
tags: ["wire-edm", "wire-break", "corner", "sharp-corner", "feed-rate"]
confidence: 90
source: "handbook:mitsubishi_fa_app_notes"
promoted_from: knowledge/tribal/wedm-knowledge-tips-wedm-kb-002.md
promoted_at: 2026-05-26T16:07:21.254Z
---

# Wire breaks at corners: slow feed + increase OFF time

Wire breaks frequently at sharp inside corners (<R0.5mm) because the wire bends around the corner while discharge energy concentrates on a smaller area. Mitigations: (1) Add corner slowdown — reduce feed to 60% at corners with radius < 2× wire diameter. (2) Increase OFF time (B) by 20-30% in corner segments. (3) Consider 0.20mm wire instead of 0.25mm for tight radii. Mitsubishi FA controllers have automatic corner control (CC) that adjusts power at corners.

**Category:** troubleshooting
**Confidence:** 90
**Source:** handbook:mitsubishi_fa_app_notes
**Operations:** wire_edm

## Related
- [[wedm-knowledge-tips-jm-die-019|JM Die wire break risk factors — thickness, material, corner radius, flushing]]
- [[gibbscam-cam-tips-gc-070|Corner strategies balance accuracy versus wire lag compensation]]
- [[mastercam-cam-tips-mc-124|Slug management in wire EDM prevents loose slugs from shorting the wire]]
- [[solidcam-cam-tips-sc-135|Wire EDM Corner Strategy — Radius Compensation and Corner Dwell]]
- [[wedm-knowledge-tips-wedm-kb-001|Wire breakage: reduce power before increasing tension]]
