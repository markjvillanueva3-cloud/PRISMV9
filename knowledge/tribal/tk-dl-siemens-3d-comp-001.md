---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-siemens-3d-comp-001
title: Siemens 3D tool radius compensation: CUT2D/CUT3DC/CUT3DCC/CUT3DF modes for 5-axis
category: controller
domain: document_learned
knowledge_type: tip
confidence: 90
source: document:Siemens-5-Axis-Machining-Manual
created_at: 2026-03-06
usage_count: 0
tags: ["siemens", "SINUMERIK", "CUT3DC", "CUT3DCC", "CUT3DF", "tool-radius-compensation", "5-axis", "aerospace", "ISD", "operation:pocketing", "operation:milling", "operation:5_axis", "controller:siemens"]
material_groups: []
operation_types: ["pocketing", "milling", "5_axis"]
content_hash: 76537bdd7dba5a4721dd0f978c36225449a712cd3b7899fd0601e159212c53d8
mirror_ts: 2026-05-05T13:36:01.496Z
mirror_engine: TribalVaultPopulatorEngine
---

# Siemens 3D tool radius compensation: CUT2D/CUT3DC/CUT3DCC/CUT3DF modes for 5-axis

**Category:** `controller` · **Domain:** `document_learned`

**Confidence:** `90` · **Source:** `document:Siemens-5-Axis-Machining-Manual`

## Tip

SINUMERIK 3D tool radius compensation modes for 5-axis machining: (1) CUT2D/CUT2DF: 2.5D compensation with plane from G17-G19 or frame. Standard for 3-axis. (2) CUT3DC: 3D circumferential milling — compensation perpendicular to path tangent AND tool orientation. Used for side-wall milling with variable tool angles. Program with G41/G42 for direction. (3) CUT3DCC: 3D circumferential with limitation surface — for structural aerospace pockets where smaller replacement tool machines wall AND adjusts TCP to maintain pocket floor level. CNC auto-recognizes dual compensation (wall direction + floor direction). (4) CUT3DFS: face milling, constant orientation (3-axis), tool in Z direction of G17-G19 system, frames have no effect. (5) CUT3DFF: face milling, constant orientation with frame-defined Z. (6) CUT3DF: 5-axis face milling with variable tool orientation. ORID: no orientation change in corner circles. ORIC: orientation changes proportionally in corner circles. Use ISD (Intersection Surface Distance) parameter to specify engaged flute length for circumferential milling.

## Applies to

- Operation types: `pocketing`, `milling`, `5_axis`

## Related tips

- [[tk-dl-haas-001|Haas-specific G-codes beyond standard Fanuc: G143, G150, G154, G187, G234, G254]] _(category+op:3+tag:4)_
- [[tk-dl-siemens-5ax-001|Siemens SINUMERIK 5-axis: TRAORI activation, CYCLE832 8-digit encoding, orientation modes]] _(category+op:1+tag:5)_
- [[ctrl-069|CUT2D/CUT3DC/CUT3DF 3D Tool Compensation Modes]] _(op:2+tag:7)_
- [[tk-dl-siemens-5ax-003|Siemens ORIPATH (LEAD/TILT), ORIWKS vs ORIMKS, TOROT safe retract from slanted holes]] _(category+op:1+tag:4)_
- [[ctrl-184|Okuma NAVI-Mill conversational programming — capabilities, limits, and G-code interop]] _(op:3+tag:3)_

## Tags

#siemens #sinumerik #cut3dc #cut3dcc #cut3df #tool-radius-compensation #5-axis #aerospace #isd #operation-pocketing #operation-milling #operation-5_axis #controller-siemens
