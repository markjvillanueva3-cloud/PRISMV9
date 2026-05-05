---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-218
title: Hurco WinMax TVCC — tool vector canned cycles without transform plane
category: programming
domain: controller_specific
knowledge_type: rule
confidence: 94
source: controller:cope_hurco_tvcc_asr_technical_note
created_at: 2026-04-15
usage_count: 0
tags: ["hurco", "winmax", "tvcc", "tool-vector-canned-cycle", "g08.2", "drilling", "tapping", "5-axis", "3+2", "operation:drilling", "operation:tapping", "machine:Hurco", "tool:drill", "tool:tap"]
material_groups: []
operation_types: ["drilling", "tapping"]
content_hash: aaba852b7728e6efafcfc3df814d20d69e0d6d323a5f749d3554fa664ba45c85
mirror_ts: 2026-05-05T13:36:00.917Z
mirror_engine: TribalVaultPopulatorEngine
---

# Hurco WinMax TVCC — tool vector canned cycles without transform plane

**Category:** `programming` · **Domain:** `controller_specific`

**Confidence:** `94` · **Source:** `controller:cope_hurco_tvcc_asr_technical_note`

## Tip

Tool Vector Canned Cycles (TVCC) execute canned cycles along the current tool vector at a 3D point without requiring a full Transform Plane (G68.2). Use G08.2 to re-orient the tool, then the canned cycle with TVCC syntax. Format: G__ X_Y_Z_ I_ R_ where I_ is incremental hole depth along (inverse of) tool vector (positive to drill into part), R_ is incremental retract distance along tool vector. TVCC requirements: (1) MUST be in G90 absolute mode, (2) does NOT use G98/G99 retract modes, (3) is NON-MODAL — XYZ position and I depth must be specified for each hole. Example: G84 X0Y0Z0 I10. Q5 R5 F100 S1000 (rigid tap 10mm depth, 5mm peck, 5mm retract above hole).

## Applies to

- Operation types: `drilling`, `tapping`

## Related tips

- [[ctrl-219|Hurco WinMax TVCC restrictions — G76, G87, G88 with I_J_ parameter not supported]] _(category+op:2+tag:9)_
- [[ctrl-202|Brother Machining Load Monitor M341/M342/M343 — automatic tool breakage detection]] _(category+op:2+tag:5)_
- [[ctrl-036|Brother CNC-C00 high-speed tapping advantage]] _(category+op:2+tag:5)_
- [[ctrl-061|Fanuc milling-specific canned cycles (0i-MF / 31i-B5)]] _(category+op:2+tag:5)_
- [[ctrl-199|Brother G77/G78 pitch-based tapping — 30+ taps per minute]] _(category+op:2+tag:4)_

## Tags

#hurco #winmax #tvcc #tool-vector-canned-cycle #g08-2 #drilling #tapping #5-axis #3-2 #operation-drilling #operation-tapping #machine-hurco #tool-drill #tool-tap
