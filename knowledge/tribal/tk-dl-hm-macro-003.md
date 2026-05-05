---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-hm-macro-003
title: hyperMILL tool property namespace: 60+ properties for macro condition logic
category: tooling
subcategory: tool_selection
domain: document_learned
knowledge_type: tip
confidence: 95
source: document:hyperMILL-MacroTech-vtEditorConditionVariables.xml
created_at: 2026-03-06
usage_count: 0
tags: ["hyperMILL", "tool-properties", "barrel-tool", "t-slot", "boring-bar", "macro-conditions", "virtual-tool-editor", "operation:slotting", "operation:drilling", "operation:boring", "tool:bull_nose_endmill", "tool:indexable_insert", "tool:drill", "tool:boring_bar"]
material_groups: []
operation_types: ["slotting", "drilling", "boring"]
content_hash: 16dcf63da426158f4708fd4a23b99173fef76f682a75042e0eab15ac49799a9b
mirror_ts: 2026-05-05T13:36:00.847Z
mirror_engine: TribalVaultPopulatorEngine
---

# hyperMILL tool property namespace: 60+ properties for macro condition logic

**Category:** `tooling` · **Subcategory:** `tool_selection` · **Domain:** `document_learned`

**Confidence:** `95` · **Source:** `document:hyperMILL-MacroTech-vtEditorConditionVariables.xml`

## Tip

hyperMILL Virtual Tool Editor exposes 60+ tool properties for macro conditions. NCTool: NCNumber, ToolReach, ExtensionReach, ClearanceLength, UsableLength, GageLength, CompensationLength, Holder.CoolantThrough. MillingTool: Diameter, CornerRadius, TipLength, CuttingLength, CuttingEdges, CoreDiameter, CoreHeight, TaperAngle, NominalDiameter, TipDiameter, LensRadius, ShaftDiameter. Barrel tools: BarrelHeight, BarrelRadius, BarrelTaperAngle, BaseDiameter, BaseCornerRadius. T-Slot: DiscHeight, Upper/LowerCornerType/Radius/ChamferAngle/Height. Drill: TipAngle, BreakThroughLength, NoTipLength, CenteringRequired, Pitch, MinPitch, MaxPitch, TapTipType (spiralPoint/spiralFlute/forming/undefined), ThreadMillTipType (fullThread/partialThread/singleThread), ThreadApplication (internal/external/both). Boring bar: MinDrillDiameter, PresetDiameter, MaxDrillDiameter. Insert: Type, IsoCode, Thickness, CornerRadius, Angle. ToolHolder: ApproachAngle, MountingDirection.

## Applies to

- Operation types: `slotting`, `drilling`, `boring`

## Related tips

- [[ctrl-240|JM Die tool numbering convention — operation-based assignment]] _(op:2+tag:5)_
- [[ctrl-242|JM Die Okuma 6-digit tool format — turret position and geometry offsets]] _(op:2+tag:4)_
- [[tk-dl-hm-030|TOOL Builder holder orientation: Z-axis coaxial to spindle, X-axis per taper type]] _(category+op:1+tag:1)_
- [[ctrl-219|Hurco WinMax TVCC restrictions — G76, G87, G88 with I_J_ parameter not supported]] _(op:2+tag:3)_
- [[cw-140|TBM Hole Tolerance Routing — Drill vs Ream vs Bore Decision]] _(op:2+tag:3)_

## Tags

#hypermill #tool-properties #barrel-tool #t-slot #boring-bar #macro-conditions #virtual-tool-editor #operation-slotting #operation-drilling #operation-boring #tool-bull_nose_endmill #tool-indexable_insert #tool-drill #tool-boring_bar
