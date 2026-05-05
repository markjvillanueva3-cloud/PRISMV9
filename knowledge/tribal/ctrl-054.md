---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-054
title: Fanuc G37 automatic tool length measurement
category: programming
subcategory: macro
domain: controller_specific
knowledge_type: heuristic
confidence: 80
source: controller:web_research
created_at: 2026-03-07
usage_count: 0
tags: ["controller", "fanuc", "probing", "G37", "tool-measurement", "tool-setting", "controller:fanuc"]
material_groups: []
operation_types: []
content_hash: e085c98af63797aad7fe39ea88d766b7c5dc6fd9b86033e78cf063595db7e6fe
mirror_ts: 2026-05-05T13:36:03.932Z
mirror_engine: TribalVaultPopulatorEngine
---

# Fanuc G37 automatic tool length measurement

**Category:** `programming` · **Subcategory:** `macro` · **Domain:** `controller_specific`

**Confidence:** `80` · **Source:** `controller:web_research`

## Tip

G37 performs automatic tool offset measurement. When the probe skip signal is received during a G37 move, the Z position is captured and used to set the specified tool length offset (H register). Syntax: G37 Zxx.xxx Hnn (measure tool, set offset Hnn). The resulting offset equals the distance between the work coordinate zero and the probe contact point. This is typically used with a fixed tool setter (table-mounted or spindle-mounted). Combine with Macro B for automated tool breakage detection: measure tool, compare to expected length stored in #500+, trigger alarm (#3000=101[TOOL BROKEN]) if deviation exceeds threshold. More reliable than G31-based manual measurement for production environments.

## Related tips

- [[ctrl-053|Fanuc probing with G31 skip signal]] _(category+tag:4)_
- [[ctrl-056|Fanuc G10 programmatic offset setting for automation]] _(category+tag:4)_
- [[ctrl-065|Fanuc Macro B tool breakage detection pattern]] _(category+tag:4)_
- [[ctrl-004|Fanuc Macro B custom probing cycles]] _(category+tag:3)_
- [[ctrl-155|Fanuc Macro B skip function G31 — probing and in-process gauging]] _(category+tag:3)_

## Tags

#controller #fanuc #probing #g37 #tool-measurement #tool-setting #controller-fanuc
