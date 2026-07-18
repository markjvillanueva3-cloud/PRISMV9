---
name: tribal-teb-006
category: code-tribal
subdomain: mold_die
domain: tribal-knowledge
tags: ["stock-model", "material-tracking", "rest-machining"]
confidence: 91
source: "web:tebis-docs"
promoted_from: knowledge/tribal/tebis-cam-tips-teb-006.md
promoted_at: 2026-05-26T16:07:20.604Z
---

# Stock Model Tracks Material Removal Across All Operations

Tebis maintains a precise triangulated stock model that updates after each NCJob. Enable stock tracking in the NCJob Manager to pass residual stock between operations. The stock model detects remaining material in corners and undercuts, enabling targeted rest machining. For multi-setup molds, save the stock state after each setup and reload it when the part is re-fixtured. This prevents re-cutting already-machined areas and reduces total cycle time by 15-25%.

**Category:** mold_die
**Confidence:** 91
**Source:** web:tebis-docs
**Operations:** roughing, semi_finishing

## Related
- [[bobcad-cam-tips-bc-027|3D Rest Machining from Stock Model]]
- [[bobcad-cam-tips-bc-132|BobCAD V36 Rest Machining with Stock Model Tracking]]
- [[camworks-cam-tips-cw-043|Rest Machining — Automatic Stock Model for Multi-Tool Finishing]]
- [[edgecam-cam-tips-ec-006|Rest Machining from Waveform with Smaller Cutter]]
- [[esprit-cam-tips-esp-006|ProfitMilling Rest Machining from Previous Stock]]
