---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-cad-macro-01
title: Macro special characters for CAD/CAM automation
category: automation
subcategory: tool_presetter
domain: document_learned
knowledge_type: rule
confidence: 75
source: document:AC1337_Mighty_Macros@table1
created_at: 2026-04-15
usage_count: 0
tags: ["macro", "special-characters", "cad", "cam", "automation", "scripting"]
material_groups: []
operation_types: []
content_hash: c54f79bf3dad0cd27fc45f582eefcb750761de2571d79c4422439b23eef99f70
mirror_ts: 2026-05-05T13:36:04.131Z
mirror_engine: TribalVaultPopulatorEngine
---

# Macro special characters for CAD/CAM automation

**Category:** `automation` · **Subcategory:** `tool_presetter` · **Domain:** `document_learned`

**Confidence:** `75` · **Source:** `document:AC1337_Mighty_Macros@table1`

## Tip

When writing macros for CAD/CAM software: ^C^C cancels previous actions (equivalent to double-Escape), semicolon (;) issues Enter/Return, backslash (\) pauses for user input, underscore (_) enables command translation across localized versions. These patterns apply broadly: AutoCAD, hyperMILL scripting, Mastercam toolpath macros. Always start macros with ^C^C to ensure clean state before executing commands.

## Related tips

- [[tk-dl-cad-macro-02|Cancel-Command-Pause-Input macro pattern]] _(category+tag:4)_
- [[ec-114|PCI Macro Language for Custom Automation]] _(category+tag:2)_
- [[sc2-197|SURFCAM API Automation for Part Family Programming]] _(category+tag:2)_
- [[sc2-138|SURFCAM Traditional Macro System for Batch Processing]] _(category+tag:2)_
- [[ac-001|hyperMILL Automation Center scripts automate repetitive CAM workflows]] _(category+tag:1)_

## Tags

#macro #special-characters #cad #cam #automation #scripting
