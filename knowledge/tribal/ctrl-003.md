---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-003
title: Fanuc extended work offsets G54.1 P1-P300
category: programming
domain: controller_specific
knowledge_type: tip
confidence: 95
source: controller:fanuc_operator_manual
created_at: 2026-03-07
usage_count: 0
tags: ["fanuc", "work-offsets", "g54.1", "pallet", "tombstone", "controller:fanuc"]
material_groups: []
operation_types: []
content_hash: 9c3356b7ec121256eda9300f083b3bd2b8e83518bb41f12b6048bc793da815a2
mirror_ts: 2026-05-05T13:36:00.855Z
mirror_engine: TribalVaultPopulatorEngine
---

# Fanuc extended work offsets G54.1 P1-P300

**Category:** `programming` · **Domain:** `controller_specific`

**Confidence:** `95` · **Source:** `controller:fanuc_operator_manual`

## Tip

Beyond the standard G54-G59 (6 offsets), Fanuc controllers support G54.1 P1 through P300 for 300 additional work offsets. Essential for pallet systems and tombstone setups. On 0i-MF the default is 48 additional offsets (P1-P48); on 31i-B5 up to 300. Set parameter #1220 to enable the full range. Call with: G54.1 P25; (selects additional offset 25).

## Related tips

- [[ctrl-133|Hurco WinMax G154 extended work offsets (P1-P99)]] _(category+tag:4)_
- [[ctrl-203|Brother through-tool coolant M494/M495 and extended WCS G54.1 P1-P300]] _(category+tag:4)_
- [[ctrl-196|Haas G154 P1-P99 extended work offsets — pallet and tombstone programming]] _(category+tag:3)_
- [[ctrl-055|Fanuc work coordinate systems: G54-G59 and G54.1 extended offsets]] _(category+tag:3)_
- [[ctrl-151|Fanuc G68.2 tilted work plane — syntax and G53.1 confirmation]] _(category+tag:2)_

## Tags

#fanuc #work-offsets #g54-1 #pallet #tombstone #controller-fanuc
