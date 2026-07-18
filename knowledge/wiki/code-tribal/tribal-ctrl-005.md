---
name: tribal-ctrl-005
category: code-tribal
subdomain: programming
domain: tribal-knowledge
tags: ["fanuc", "drilling", "g73", "g83", "peck", "cycle-time"]
confidence: 93
source: "controller:fanuc_programming_manual"
promoted_from: knowledge/tribal/controller-knowledge-tips-ctrl-005.md
promoted_at: 2026-05-26T16:07:20.108Z
---

# Fanuc high-speed peck drilling G73 vs G83

G73 (high-speed peck) retracts only a small amount (parameter #5114, typically 1mm) between pecks — much faster than G83 which retracts to R-plane. Use G73 for depths up to 5xD in steel, G83 only for deeper holes or gummy materials (stainless, titanium) where full retract is needed for chip clearing. On Fanuc 0i-TF (turning), G74 is the equivalent peck drilling cycle.

**Category:** programming
**Confidence:** 93
**Source:** controller:fanuc_programming_manual

## Related
- [[esprit-cam-tips-esp-080|Chip-Break Drilling for Efficient Chip Evacuation]]
- [[sprutcam-cam-tips-spr-019|Canned Drilling Cycles Configuration]]
- [[controller-knowledge-tips-ctrl-061|Fanuc milling-specific canned cycles (0i-MF / 31i-B5)]]
- [[camworks-cam-tips-cw-069|Turning Drill Operations — Center, Peck, and Deep Hole on Lathe]]
- [[camworks-cam-tips-cw-099|Peck Drilling — Deep Hole Chip Evacuation with Full Retract]]
