---
schema_version: 1.0.0
kind: tribal_tip
id: wedm-kb-004
title: Flush pressure prevents wire breaks in deep cuts
category: troubleshooting
domain: process_engineering
knowledge_type: tip
confidence: 93
source: handbook:kunieda_2005_cirp
created_at: 2026-04-07
usage_count: 0
tags: ["wire-edm", "wire-break", "flushing", "deep-cut", "thick-section", "debris"]
material_groups: []
operation_types: ["wire_edm"]
content_hash: 87d6e7ca5cc10004756704f44f5d2feac791efb7762814b827346c3783236c91
mirror_ts: 2026-05-05T13:36:01.028Z
mirror_engine: TribalVaultPopulatorEngine
---

# Flush pressure prevents wire breaks in deep cuts

**Category:** `troubleshooting` · **Domain:** `process_engineering`

**Confidence:** `93` · **Source:** `handbook:kunieda_2005_cirp`

## Tip

In cuts deeper than 50mm, inadequate flushing is the #1 cause of wire breaks. Debris accumulates in the spark gap, causing short circuits and arc discharges that melt the wire. Increase flush pressure from the standard 5 bar to 8-10 bar for thicknesses >100mm. Use coaxial flushing (through the upper and lower guides) rather than side jets alone. For blind cavities where flushing is restricted, reduce cutting speed by 20-30% to compensate. Ref: Kunieda et al. CIRP 2005.

## Applies to

- Operation types: `wire_edm`

## Related tips

- [[jm-die-019|JM Die wire break risk factors — thickness, material, corner radius, flushing]] _(category+op:1+tag:3)_
- [[wedm-kb-001|Wire breakage: reduce power before increasing tension]] _(category+op:1+tag:2)_
- [[wedm-kb-016|Thermal distortion in thick sections: stress relief first]] _(category+op:1+tag:2)_
- [[wedm-kb-002|Wire breaks at corners: slow feed + increase OFF time]] _(category+op:1+tag:2)_
- [[wedm-kb-003|Wire break recovery: re-thread 2mm behind break point]] _(category+op:1+tag:2)_

## Tags

#wire-edm #wire-break #flushing #deep-cut #thick-section #debris
