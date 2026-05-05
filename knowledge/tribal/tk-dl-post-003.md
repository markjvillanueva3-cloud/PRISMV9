---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-post-003
title: Circular interpolation validation: check radius, sweep, and chord before G02/G03
category: programming
domain: document_learned
knowledge_type: rule
confidence: 90
source: document:autodesk-post-processor-guide@ch5-circular-settings
created_at: 2026-03-06
usage_count: 0
tags: ["circular-interpolation", "g02", "g03", "validation", "radius", "sweep", "linearize"]
material_groups: []
operation_types: []
content_hash: d318af2d2718fbdb3ab41b600903f7b9b26845044572e6f96341af0391112e8c
mirror_ts: 2026-05-05T13:36:01.475Z
mirror_engine: TribalVaultPopulatorEngine
---

# Circular interpolation validation: check radius, sweep, and chord before G02/G03

**Category:** `programming` · **Domain:** `document_learned`

**Confidence:** `90` · **Source:** `document:autodesk-post-processor-guide@ch5-circular-settings`

## Tip

Before outputting G02/G03, validate: (1) radius ≥ minimumCircularRadius (0.01mm) — tiny arcs linearize more accurately, (2) radius ≤ maximumCircularRadius (1000mm) — large arcs lose precision with IJK format, (3) sweep ≥ minimumCircularSweep (0.01°) — near-zero arcs are just points, (4) sweep ≤ maximumCircularSweep (180° for radius mode, 360° for IJK mode), (5) chord ≥ minimumChordLength (0.25mm). Full 360° circles CANNOT use radius (R) format — must use IJK center point format. Linearize any arc that fails these checks.

## Related tips

- [[ctrl-244|JM Die Haas arc programming — G2/G3 with I/J center offsets]] _(category+tag:1)_
- [[ctrl-245|JM Die Okuma L-word radius — arc programming shorthand]] _(category+tag:1)_
- [[ctrl-225|JM Die Okuma lathe program structure — NAT subroutines with bar feeder loop]] _(category)_
- [[ctrl-229|JM Die Haas mill program header — standard safety line and tool documentation]] _(category)_
- [[ctrl-231|JM Die Haas tool change sequence — M06 with G43 height offset]] _(category)_

## Tags

#circular-interpolation #g02 #g03 #validation #radius #sweep #linearize
