---
schema_version: 1.0.0
kind: tribal_tip
id: TK-RX-007
title: Stock-to-leave by tolerance grade: ±0.05mm→0.2-0.3mm, ±0.02mm→0.1mm, ±0.01mm→0.05mm
category: strategy
domain: document_learned
knowledge_type: rule
confidence: 90
source: document:Fusion360-Skill-Roadmap@stock-allowance-guidelines
created_at: 2026-03-06
usage_count: 0
tags: ["stock-to-leave", "allowance", "tolerance", "finishing", "deflection", "spring-pass", "operation:finishing", "operation:grinding"]
material_groups: []
operation_types: ["finishing", "semi-finishing"]
content_hash: 767a2c2eb91621d2e0412b77a804b7ca3d5af063222208269b0cc6dbf18c255a
mirror_ts: 2026-05-05T13:36:01.503Z
mirror_engine: TribalVaultPopulatorEngine
---

# Stock-to-leave by tolerance grade: ±0.05mm→0.2-0.3mm, ±0.02mm→0.1mm, ±0.01mm→0.05mm

**Category:** `strategy` · **Domain:** `document_learned`

**Confidence:** `90` · **Source:** `document:Fusion360-Skill-Roadmap@stock-allowance-guidelines`

## Tip

Recommended finishing stock allowance based on final tolerance requirement: Tolerance ±0.1mm: stock-to-leave 0.3-0.5mm (single finish pass). Tolerance ±0.05mm: stock 0.2-0.3mm (single finish pass, light cut). Tolerance ±0.02mm: stock 0.1-0.15mm (may need semi-finish + finish). Tolerance ±0.01mm: stock 0.05-0.08mm (requires semi-finish + finish + spring pass). Tolerance ±0.005mm: stock 0.03-0.05mm (grinding or diamond tooling territory). Rule: stock ≥ 2× expected tool deflection at finishing conditions. Too little stock causes rubbing; too much stock causes deflection variation. Always verify with a test cut on first article.

## Applies to

- Operation types: `finishing`, `semi-finishing`

## Related tips

- [[tk-dl-solidcam-003|Ball nose chip thickness varies with height: near tip chips are thin (rubbing risk), use stepdown ≤ 10% of ball diameter]] _(category+op:1+tag:2)_
- [[tk-rx-006|Strategy selection by surface wall angle: <30° planar, 30-45° equidistant, >45° Z-level]] _(category+op:1+tag:2)_
- [[tk-dl-inventorcam-hsm-001|InventorCAM HSM finishing: 17 strategies, ball nose step down = R/5, bull nose = R/3]] _(category+op:1+tag:2)_
- [[tk-dl-cam-006|Morphed machining: passes follow drive curves for blended surfaces]] _(category+op:1+tag:2)_
- [[tk-dl-cam-011|Spiral Z-level finishing gives best surface on closed milling areas]] _(category+op:1+tag:2)_

## Tags

#stock-to-leave #allowance #tolerance #finishing #deflection #spring-pass #operation-finishing #operation-grinding
