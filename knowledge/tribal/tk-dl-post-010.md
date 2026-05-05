---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-post-010
title: G51 scaling with probe feedback: sub-micron bore accuracy (Renishaw RAMTIC)
category: quality
domain: document_learned
knowledge_type: quote_correction
confidence: 88
source: document:cnccookbook-g51@probe-feedback
created_at: 2026-03-06
usage_count: 0
tags: ["g51", "scaling", "probe", "ramtic", "bore-accuracy", "thermal-compensation", "mirror", "operation:roughing", "operation:finishing", "operation:boring"]
material_groups: []
operation_types: ["roughing", "finishing", "boring"]
content_hash: 5185c8b4cd31e64044fae1e888b8e75cd4e151e726f70f387b95ec8ace71620d
mirror_ts: 2026-05-05T13:36:02.156Z
mirror_engine: TribalVaultPopulatorEngine
---

# G51 scaling with probe feedback: sub-micron bore accuracy (Renishaw RAMTIC)

**Category:** `quality` · **Domain:** `document_learned`

**Confidence:** `88` · **Source:** `document:cnccookbook-g51@probe-feedback`

## Tip

G51 X Y Z P/I/J/K scales coordinates around a center point. Powerful technique: (1) rough-bore a hole, (2) probe-measure the actual diameter, (3) calculate correction factor (e.g., target 50.000mm measured 49.993mm → scale = 1 + 0.007/50 = 1.00014), (4) apply G51 with scale factor on finish pass. This is the basis of Renishaw's RAMTIC manufacturing process and achieves sub-micron accuracy by compensating for thermal expansion, tool deflection, and machine geometry errors in real-time. Cancel with G50. Per-axis scaling (I/J/K) also enables mirror imaging for symmetric parts.

## Applies to

- Operation types: `roughing`, `finishing`, `boring`

## Related tips

- [[esp-144|Robot Machining Calibration and TCP Accuracy]] _(category+op:2+tag:2)_
- [[ctrl-240|JM Die tool numbering convention — operation-based assignment]] _(op:3+tag:3)_
- [[tk-dl-g71-001|G71 rough turning: Type I vs Type II, U-word overloading trap, direction conventions]] _(op:3+tag:3)_
- [[tk-dl-gcode-exact-001|G09 vs G61 vs G60: exact stop (one-shot vs modal) and anti-backlash for probing]] _(op:3+tag:3)_
- [[gc-118|In-process inspection catches dimensional drift before scrapping parts]] _(op:3+tag:3)_

## Tags

#g51 #scaling #probe #ramtic #bore-accuracy #thermal-compensation #mirror #operation-roughing #operation-finishing #operation-boring
