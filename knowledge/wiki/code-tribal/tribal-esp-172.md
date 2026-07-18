---
name: tribal-esp-172
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["additive", "waam", "wire-arc", "large-scale", "near-net-shape"]
confidence: 0
source: "web:esprit-docs"
promoted_from: knowledge/tribal/esprit-cam-tips-esp-172.md
promoted_at: 2026-06-09T22:31:16.253Z
---

# Wire Arc Additive Manufacturing (WAAM) in ESPRIT

ESPRIT supports WAAM (Wire Arc Additive Manufacturing) for large-scale additive manufacturing using welding-based deposition. WAAM deposits material at 2-8 kg/hour — 10x faster than laser DED — making it viable for large structural components (aerospace brackets, marine propellers). In ESPRIT, configure WAAM under Additive → Process → Wire Arc with wire feed rate, travel speed, voltage/amperage, and shielding gas flow. Key difference from laser DED: wider beads (3-8mm) and higher layer heights (1-3mm) require more aggressive machining allowances (2-5mm per side). ESPRIT calculates the near-net-shape volume to minimize both deposition and machining time.

**Category:** cam_strategy
**Confidence:** 0.79
**Source:** web:esprit-docs
**Operations:** additive, roughing

## Related
- [[camworks-cam-tips-cw-193|Hybrid Additive + Subtractive Workflow — Near-Net Shape to Finish]]
- [[sprutcam-cam-tips-spr-142|Additive/Hybrid Manufacturing]]
- [[tebis-cam-tips-teb-177|Additive DED Path Planning for Repair]]
- [[camworks-cam-tips-cw-194|Additive Stock Definition — Scan Data to CAMWorks Stock Model]]
- [[camworks-cam-tips-cw-195|Support Structure Removal — Programming for Additive Post-Processing]]
