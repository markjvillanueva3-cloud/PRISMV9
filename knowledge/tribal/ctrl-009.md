---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-009
title: Fanuc through-spindle coolant M-codes vary by OEM
category: programming
domain: controller_specific
knowledge_type: rule
confidence: 95
source: controller:multi_oem_reference
created_at: 2026-03-07
usage_count: 0
tags: ["fanuc", "coolant", "tsc", "through-spindle", "m-codes", "oem", "machine:Haas", "machine:DMG Mori", "machine:Doosan", "machine:Brother", "controller:fanuc"]
material_groups: []
operation_types: []
content_hash: 167d18da8b99845592ff6da9bff6b13742bbbcd057966d04bf5e3ba62502846f
mirror_ts: 2026-05-05T13:36:00.856Z
mirror_engine: TribalVaultPopulatorEngine
---

# Fanuc through-spindle coolant M-codes vary by OEM

**Category:** `programming` · **Domain:** `controller_specific`

**Confidence:** `95` · **Source:** `controller:multi_oem_reference`

## Tip

Through-spindle coolant (TSC) M-codes are NOT standardized on Fanuc-based machines. Haas: M88 on / M89 off. DMG MORI: M51 on / M59 off. DN Solutions: M68 on / M69 off. Brother: M85 on / M86 off. Always check the OEM manual, not generic Fanuc docs. Standard coolant (M8 flood, M7 mist, M9 off) is universal across all Fanuc machines.

## Related tips

- [[ctrl-049|Cross-controller post processor selection guide]] _(category+tag:4)_
- [[ctrl-024|Haas NGC unique M-codes reference]] _(category+tag:4)_
- [[ctrl-057|Fanuc coolant M-codes including through-spindle]] _(category+tag:4)_
- [[tk-dl-haas-003|Use ROUND[] for macro integer comparisons (floating point trap)]] _(category+tag:3)_
- [[ctrl-158|Fanuc through-tool coolant M88/M89 and combined flood+through]] _(category+tag:3)_

## Tags

#fanuc #coolant #tsc #through-spindle #m-codes #oem #machine-haas #machine-dmg-mori #machine-doosan #machine-brother #controller-fanuc
