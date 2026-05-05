---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-090
title: Haas macro look-ahead gotcha — G103 P1 for variable reads
category: programming
subcategory: macro
domain: controller_specific
knowledge_type: tip
confidence: 80
source: controller:web_research
created_at: 2026-03-07
usage_count: 0
tags: ["controller", "haas", "macro", "look-ahead", "G103", "probing", "gotcha", "machine:Haas", "controller:haas"]
material_groups: []
operation_types: []
content_hash: fc3185c9dc0ee8adc53c3f82ea6c92becb4faca8253e1e7f2a2c7cb1bea39758
mirror_ts: 2026-05-05T13:36:03.972Z
mirror_engine: TribalVaultPopulatorEngine
---

# Haas macro look-ahead gotcha — G103 P1 for variable reads

**Category:** `programming` · **Subcategory:** `macro` · **Domain:** `controller_specific`

**Confidence:** `80` · **Source:** `controller:web_research`

## Tip

Haas NGC look-ahead can cause macro variables to be read/evaluated before the intended motion block executes. This is critical when reading probe results or checking I/O states. The control processes macro lines ahead of actual motion. Fix: use G103 P1 to limit look-ahead to 1 block when reading macro variables that depend on completed motion (e.g., after G65 probe calls). Reset with G103 (no P) after the critical section. Also use G04 P0 (dwell zero) as a look-ahead stop before reading probe results stored in macro variables (#1-#33 or system variables).

## Related tips

- [[ctrl-023|Haas macro variables and probing]] _(category+tag:5)_
- [[tk-dl-haas-002|G103 limits block look-ahead for macro timing (Haas)]] _(category+tag:4)_
- [[ctrl-088|Haas G187 accuracy/speed control for HSM]] _(category+tag:4)_
- [[ctrl-091|Haas probing setup requirements and WIPS integration]] _(category+tag:4)_
- [[ctrl-190|Haas NGC Setting 130 — tapping feed mode and G95 IPR best practice]] _(category+tag:3)_

## Tags

#controller #haas #macro #look-ahead #g103 #probing #gotcha #machine-haas #controller-haas
