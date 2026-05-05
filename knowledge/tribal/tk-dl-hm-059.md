---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-hm-059
title: Custom tool reports via XLSX template duplication
category: setup
domain: document_learned
knowledge_type: anti_pattern
confidence: 87
source: document:Tool Report Customization
created_at: 2026-03-07
usage_count: 0
tags: ["hypermill", "tool-report", "setup-sheet", "customization"]
material_groups: []
operation_types: []
content_hash: bddb9f853ad256595213cb2deb148e484ad3099e6d29d19861a3dc685106a25d
mirror_ts: 2026-05-05T13:36:02.557Z
mirror_engine: TribalVaultPopulatorEngine
---

# Custom tool reports via XLSX template duplication

**Category:** `setup` · **Domain:** `document_learned`

**Confidence:** `87` · **Source:** `document:Tool Report Customization`

## Tip

To create custom tool reports: copy OM_REPORT_2 folder from ADDINS\hmAutoColor\SYSTEM_PROCESS\Reports\ToolReports to AUTOMATION\REPORTS\toolReports\report_templates\. Rename folder and files to your report name. In the ToolReport xlsx, Header and Tool Part Definition tabs control field mapping — only use existing parameters from column B, do not change rows, customize cell addresses in column C.

## Related tips

- [[tk-dl-hm-045|hyperMILL interface: 6 key toolbars — hyperMILL, Model, Visibility, Coordinates, View, Drafting]] _(category+tag:2)_
- [[tk-dl-hm-001|Never change measurement system mid-project in hyperMILL]] _(category+tag:1)_
- [[tk-dl-hm-002|Always enable Automatic Geometry Check in hyperMILL]] _(category+tag:1)_
- [[tk-dl-hm-071|Link associative workplane to hyperMILL Frame]] _(category+tag:1)_
- [[tk-dl-hm-022|Max angle increment must match controller RTCP capability]] _(category+tag:1)_

## Tags

#hypermill #tool-report #setup-sheet #customization
