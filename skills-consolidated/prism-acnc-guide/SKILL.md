---
name: prism-acnc-guide
version: 1.0.0
description: |
  Auto CNC Programmer (ACNC) product guide. Executes a 7-step pipeline from
  feature description to complete G-code program with setup sheet and tool list.

  Modules Covered:
  - ProductEngine/ACNC (acnc_program, acnc_feature, acnc_simulate, acnc_output,
    acnc_tools, acnc_strategy, acnc_validate, acnc_batch, acnc_history, acnc_get)

  Gateway Routes: prism_intelligence -> acnc_*
  R11 Product Packaging: MS3 — Auto CNC Programmer
---

## Quick Reference (Operational)

### When To Use
- Trigger keywords: "auto program", "generate G-code", "CNC program", "ACNC", "auto machining"
- User describes a feature and wants a complete CNC program
- User wants tool/strategy recommendations for a feature
- User wants to simulate cutting parameters for safety
- User wants batch programming for multiple features

### How To Use
1. Load skill: `prism_skill_script->skill_content(id="prism-acnc-guide")`
2. Get user's feature description, material, and target controller
3. Use ACNC actions:
   - `prism_intelligence->acnc_program` — Full 7-step pipeline (feature → G-code + setup sheet)
   - `prism_intelligence->acnc_feature` — Parse feature from NL description or structured input
   - `prism_intelligence->acnc_strategy` — Select toolpath strategy for feature + material
   - `prism_intelligence->acnc_tools` — Select tool type, coating, holder for material + operation
   - `prism_intelligence->acnc_output` — Generate G-code for feature on target controller
   - `prism_intelligence->acnc_simulate` — Safety/collision check with cycle time estimate
   - `prism_intelligence->acnc_validate` — Validate G-code against controller dialect
   - `prism_intelligence->acnc_batch` — Program multiple features in one call
   - `prism_intelligence->acnc_history` — Session history of ACNC operations
   - `prism_intelligence->acnc_get` — Product metadata

### What It Returns
- **Format**: Structured JSON with G-code, tool list, setup sheet, safety scores
- **Success**: Complete CNC program ready for production with `ready_to_run` flag
- **Failure**: Missing inputs → specifies what's needed

### Examples
**Example 1**: "Program a pocket 25mm deep, 80x60mm in aluminum on Fanuc"
-> `acnc_program(description: "pocket 25mm deep 80x60mm", material: "6061", controller: "fanuc")`
-> Full pipeline: feature + strategy + tool + params + G-code + simulation + setup sheet

**Example 2**: "What tool for roughing titanium pockets?"
-> `acnc_tools(material: "Ti-6Al-4V", operation: "roughing", feature: "pocket")`
-> tool_type, coating, geometry, confidence, alternatives

**Example 3**: "Batch program: pocket, slot, and 3 holes in steel on Siemens"
-> `acnc_batch(material: "4140", controller: "siemens", features: [...], tier: "pro")`
-> 3 complete programs with unified tool list

# AUTO CNC PROGRAMMER GUIDE

## 7-Step Pipeline
```
1. Feature Recognition → Parse NL or structured input
2. Strategy Selection  → DecisionTree: feature + material → toolpath
3. Tool Selection      → DecisionTree: material + operation → tool
4. Parameter Calc      → Physics: SpeedFeed + MRR + ToolLife + Coolant
5. G-code Generation   → GCodeTemplateEngine: controller-specific output
6. Simulation          → Safety score + cycle time + collision check
7. Complete Output     → Setup sheet + G-code + tool list + ready flag
```

## Supported Features (9)
pocket, slot, profile, face, hole, thread, 3d_surface, chamfer, bore

## Natural Language Parsing
ACNC extracts dimensions from descriptions:
- "pocket 50mm deep, 100x80mm" → depth:50, width:100, length:80
- "drill hole diameter 12mm, 30mm deep" → feature:hole, diameter:12, depth:30
- "thread M10 15mm deep" → feature:thread, depth:15
- "tolerance 0.05mm" → tolerance captured for quality selection

## Tier Gating
| Feature | Free | Pro | Enterprise |
|---------|------|-----|------------|
| Single program | Yes | Yes | Yes |
| Feature/strategy/tool | Yes | Yes | Yes |
| Batch (features) | 2 | Unlimited | Unlimited |
| All controllers | Yes | Yes | Yes |
