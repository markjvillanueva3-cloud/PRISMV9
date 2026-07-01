---
name: tribal-bc-085
category: code-tribal
subdomain: setup
domain: tribal-knowledge
tags: ["toolpath-verify", "feed-rate", "color-code", "stock-aware"]
confidence: 87
source: "web:bobcad-toolpath-verify"
promoted_from: knowledge/tribal/bobcad-cam-tips-bc-085.md
promoted_at: 2026-06-09T22:31:15.953Z
---

# Toolpath Verification with Feed Rate Display

BobCAD toolpath verification displays color-coded feed rates: green = nominal, yellow/red = reduced (corners, tight curves), blue = rapid. Use this to identify segments where feed drops may indicate problem zones or where machine dynamics will struggle. V37 adds improved visualization of stock-aware linking — verify that retract heights are optimized and the tool stays close to the stock during rapid traverses.

**Category:** setup
**Confidence:** 87
**Source:** web:bobcad-toolpath-verify
**Operations:** verification

## Related
- [[gibbscam-cam-tips-gc-087|Toolpath verification with backplot reveals rapid moves and feed transitions]]
- [[surfcam-cam-tips-sc2-067|Toolpath Verification with Feed Rate Color Mapping]]
- [[bobcad-cam-tips-bc-199|Statistical Feed Rate Optimization from BobCAD Engagement Data]]
- [[camworks-cam-tips-cw-131|VoluMill Feed Rate Optimization — Variable Feed Based on Engagement]]
- [[catia-cam-tips-cat-210|Stochastic Cutting Force Consideration for Feed Rate Limits]]
