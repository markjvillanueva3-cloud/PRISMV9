---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-hm-032
title: VMC collision check tolerance must be ≤ half tool diameter
category: safety
domain: document_learned
knowledge_type: rule
confidence: 95
source: document:hypermill-vmc-v33@p22-25
created_at: 2026-03-07
usage_count: 0
tags: ["hypermill", "collision-check", "tolerance", "virtual-machining", "nc-approval", "v33", "operation:milling", "operation:chamfering"]
material_groups: []
operation_types: ["milling", "chamfering"]
content_hash: 8aaf5f5ad920f46db49159682d4f5d4f2b3e229c1528bec72e716162e5403d1d
mirror_ts: 2026-05-05T13:36:00.839Z
mirror_engine: TribalVaultPopulatorEngine
---

# VMC collision check tolerance must be ≤ half tool diameter

**Category:** `safety` · **Domain:** `document_learned`

**Confidence:** `95` · **Source:** `document:hypermill-vmc-v33@p22-25`

## Tip

CRITICAL: In hyperMILL VIRTUAL Machining Center collision check options, the tolerance values for permissible tool-to-part and tool-to-stock contact must be no larger than HALF the tool diameter. OPEN MIND explicitly recommends this limit. Check options include: tool vs model, holder/shaft/core vs model, tool vs stock, G0 rapid checks. Part allowance can use job settings or manual override. Use negative allowance for chamfer milling. Always check ALL available elements before approving — unchecked elements show as red strikethrough in approval report.

## Applies to

- Operation types: `milling`, `chamfering`

## Related tips

- [[tk-dl-hm-033|NC file approval requires collision check — no exceptions]] _(category+tag:5)_
- [[tk-dl-hm-029|VT collision check only works for hole machining, not milling]] _(category+op:1+tag:3)_
- [[tk-dl-hm-013|Update rest material cycle when reference tool changes]] _(category+op:1+tag:2)_
- [[tk-dl-cad-drawing-11|Edge break/deburr note is mandatory on machined parts]] _(category+op:1+tag:1)_
- [[tk-dl-hm-102|5-Axis job sequence: face→rough→chamfer→contour→plane→multi-orientation finish]] _(op:2+tag:3)_

## Tags

#hypermill #collision-check #tolerance #virtual-machining #nc-approval #v33 #operation-milling #operation-chamfering
