---
name: tribal-ec-169
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["hard-milling", "die-steel", "entry-strategy", "hrc"]
confidence: 0
source: "web:edgecam-docs"
promoted_from: knowledge/tribal/edgecam-cam-tips-ec-169.md
promoted_at: 2026-06-09T22:31:16.201Z
---

# Hard Milling Entry Strategy for Die Steel >55 HRC

For hardened die steel (55-65 HRC), never plunge directly — always use arc or helical entry in Edgecam. Set helix angle to 1-2° maximum and arc radius to 2-3x tool radius. Cutting speed: 100-200 m/min with CBN or ceramic-coated carbide. Feed per tooth: 0.03-0.08mm. Axial depth: 0.1-0.5mm for finishing, maximum 1x diameter for roughing with Waveform. Never use conventional (up) milling — always climb mill to ensure the chip starts thick and thins, preventing rubbing.

**Category:** cam_strategy
**Confidence:** 0.88
**Source:** web:edgecam-docs
**Operations:** roughing, finishing

## Related
- [[cimatron-cam-tips-cim-028|Hard Milling Strategy for >50 HRC Materials]]
- [[bobcad-cam-tips-bc-117|Hardened Steel (>45 HRC) with Light Passes and Dry Cutting]]
- [[bobcad-cam-tips-bc-195|BobCAD Hard Milling Toolpath Smoothing for Surface Quality]]
- [[bobcad-cam-tips-bc-197|BobCAD Rest Machining Progressive Tool Strategy for Hard Milling]]
- [[bobcad-cam-tips-bc-198|BobCAD MQL and Air Blast Configuration for Hard Milling]]
