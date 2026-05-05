---
schema_version: 1.0.0
kind: tribal_tip
id: wedm-sp-002
title: Makino SP43/SP64 vs Mitsubishi FA-10S: E-pack numbering is incompatible — never cross-apply codes
category: troubleshooting
domain: process_engineering
knowledge_type: anti_pattern
confidence: 98
source: mastercam:makino_sp43_sp64_tech_file_mgw_s
created_at: 2026-04-14
usage_count: 0
tags: ["wire-edm", "makino", "sp43", "sp64", "mitsubishi", "fa-10s", "e-pack", "e-code", "incompatible", "cross-apply", "material:P", "material:1045 Steel", "material:Steel", "operation:roughing", "operation:finishing", "machine:Makino", "machine:Mitsubishi"]
material_groups: ["P"]
operation_types: ["wire_edm"]
content_hash: 0967d26d557a716df86aa5b79879a6887f1a7c5a0069be18b7803d3acd5f11a6
mirror_ts: 2026-05-05T13:36:00.803Z
mirror_engine: TribalVaultPopulatorEngine
---

# Makino SP43/SP64 vs Mitsubishi FA-10S: E-pack numbering is incompatible — never cross-apply codes

**Category:** `troubleshooting` · **Domain:** `process_engineering`

**Confidence:** `98` · **Source:** `mastercam:makino_sp43_sp64_tech_file_mgw_s`

## Tip

Makino MGW-S E-packs (SP43/SP64) use a completely different numbering and power parameter scheme from Mitsubishi FA-10S E-codes. Makino steel High Precision uses 1XXX roughing (e.g., 1025, 1035, 1045) + 12XX skim passes. Mitsubishi steel uses E12XX series (E1221–E1285). Despite the superficial similarity, these codes are NOT interchangeable — voltage, pulse width, servo reference, and flushing parameters all differ. Loading Makino codes on a Mitsubishi (or vice versa) will at minimum produce wrong surface finish, and at worst cause wire breaks and part damage. Mitsubishi carbide uses E-codes in the 5XXX range; Makino carbide ALSO uses 5XXX range (5025, 5035...) — this overlap makes the confusion especially dangerous. Always verify the machine type and control before selecting an E-pack family.

## Applies to

- Material groups: `P`
- Operation types: `wire_edm`

## Related tips

- [[wedm-sp-006|SP43/SP64 copper (Cu) library: 3-pass High Precision achieves Ra 12 µin — use for electrode and fixture cutting]] _(material:1+op:1+tag:9)_
- [[wedm-sp-003|SP43/SP64 High Precision vs Both Away: choose High Precision for ±0.0001" tolerance, Both Away for form accuracy]] _(material:1+op:1+tag:8)_
- [[wedm-mcam-004|Both Away Precision beats High Speed for die work: 2~2.5µm Ra in 5 passes on Makino DUO]] _(material:1+op:1+tag:7)_
- [[jm-die-019|JM Die wire break risk factors — thickness, material, corner radius, flushing]] _(category+material:1+op:1+tag:3)_
- [[wedm-kb-016|Thermal distortion in thick sections: stress relief first]] _(category+op:1+tag:4)_

## Tags

#wire-edm #makino #sp43 #sp64 #mitsubishi #fa-10s #e-pack #e-code #incompatible #cross-apply #material-p #material-1045-steel #material-steel #operation-roughing #operation-finishing #machine-makino #machine-mitsubishi
