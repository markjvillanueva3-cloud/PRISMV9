---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-solidcam-002
title: Empirical chip thinning table: 5% WOC→2.3x feed, 10%→1.7x, 25%→1.2x, 50%→1.0x baseline
category: feeds_speeds
domain: document_learned
knowledge_type: tip
confidence: 95
source: document:SolidCAM-Chip-Thickness-Math+Sandvik-Technical-Guide
created_at: 2026-03-06
usage_count: 0
tags: ["chip-thinning", "WOC", "feed-compensation", "empirical", "Sandvik", "Machining-Data-Handbook", "operation:slotting"]
material_groups: []
operation_types: ["slotting"]
content_hash: d4c46c69bbbaad6db2b2623e1a788de0cb76cd57031b3d9569b817d0a50820f0
mirror_ts: 2026-05-05T13:36:00.851Z
mirror_engine: TribalVaultPopulatorEngine
---

# Empirical chip thinning table: 5% WOC→2.3x feed, 10%→1.7x, 25%→1.2x, 50%→1.0x baseline

**Category:** `feeds_speeds` · **Domain:** `document_learned`

**Confidence:** `95` · **Source:** `document:SolidCAM-Chip-Thickness-Math+Sandvik-Technical-Guide`

## Tip

Industry-validated chip thinning compensation factors (Machining Data Handbook + Sandvik): At 5% WOC (ae/Dc=0.05) multiply feed by 2.30x. At 10% WOC: 1.70x. At 15%: 1.45x. At 20%: 1.30x. At 25%: 1.20x. At 30%: 1.12x. At 35%: 1.05x. At 40%: 1.02x. At 50%: 1.00x (baseline). At 60%: 0.98x. At 70%: 0.95x. At 80%: 0.92x. At 90%: 0.88x. At 100% (slotting): 0.85x — REDUCE feed due to heat buildup. These empirical values are more reliable than theoretical 1/sqrt(ae/Dc) for real-world use. Theoretical formula: factor = 1/sqrt(ae/Dc) for ae < 0.5×Dc, capped at 2.5x.

## Applies to

- Operation types: `slotting`

## Related tips

- [[tk-dl-chip-thin-001|Chip thinning: <50% radial engagement needs 2-4x feed increase, 5-flute +30% MRR]] _(op:1+tag:2)_
- [[tk-dl-fusion-002|Adaptive clearing chip thinning: factor = 1/√(1-(1-2ae/D)²), Fusion360 auto-adjusts feed in HSM]] _(op:1+tag:2)_
- [[tk-dl-hm-macro-003|hyperMILL tool property namespace: 60+ properties for macro condition logic]] _(op:1+tag:1)_
- [[tk-dl-hm-030|TOOL Builder holder orientation: Z-axis coaxial to spindle, X-axis per taper type]] _(op:1+tag:1)_
- [[wnc-050|Trochoidal Milling for Slotting Operations]] _(op:1+tag:1)_

## Tags

#chip-thinning #woc #feed-compensation #empirical #sandvik #machining-data-handbook #operation-slotting
