---
name: prism-ppg-guide
version: 1.0.0
description: |
  Post Processor Generator product guide. Uses the ProductEngine PPG pipeline
  to compose GCodeTemplateEngine, DNCTransferEngine, and ToolpathCalculations
  into unified G-code validation, translation, and generation workflows.

  Modules Covered:
  - ProductEngine/PPG (ppg_validate, ppg_translate, ppg_templates, ppg_generate,
    ppg_controllers, ppg_compare, ppg_syntax, ppg_batch, ppg_history, ppg_get)

  Gateway Routes: prism_intelligence -> ppg_*
  R11 Product Packaging: MS1 — Post Processor Generator
---

## Quick Reference (Operational)

### When To Use
- Trigger keywords: "post processor", "G-code", "translate G-code", "validate program", "controller dialect", "PPG"
- User wants to validate G-code against a specific CNC controller
- User wants to translate G-code from one controller dialect to another (Fanuc/Siemens/Heidenhain/Haas/Mazak/Okuma)
- User wants to generate G-code for specific operations
- User wants to compare G-code output across multiple controllers

### How To Use
1. Load skill: `prism_skill_script->skill_content(id="prism-ppg-guide")`
2. Identify the user's controller, operation, or G-code content
3. Use PPG actions:
   - `prism_intelligence->ppg_validate` — Validate G-code syntax against controller dialect (7 checks, score 0-1)
   - `prism_intelligence->ppg_translate` — Translate G-code between controller dialects (Fanuc<->Siemens, canned cycles, comments)
   - `prism_intelligence->ppg_generate` — Generate G-code for single operation or full multi-operation program
   - `prism_intelligence->ppg_compare` — Compare G-code output across 2-6 controllers side-by-side
   - `prism_intelligence->ppg_batch` — Batch translate one program to multiple target controllers
   - `prism_intelligence->ppg_controllers` — List all 6 supported controllers with syntax details
   - `prism_intelligence->ppg_templates` — List all available operation templates per controller
   - `prism_intelligence->ppg_syntax` — Get controller-specific syntax reference (comments, cycles, modal groups)
   - `prism_intelligence->ppg_history` — Session history of recent PPG operations
   - `prism_intelligence->ppg_get` — Product metadata (version, actions, controller count)

### What It Returns
- **Format**: Structured JSON with G-code output, validation results, translation changes, warnings
- **Success**: Ready-to-use CNC programs with validation scores and dialect-specific syntax
- **Failure**: Missing required data -> specifies which inputs are needed

### Examples
**Example 1**: "Validate this Fanuc G-code program"
-> `ppg_validate(gcode: "...", controller: "fanuc")`
-> valid=true, score=0.95, errors=0, warnings=1

**Example 2**: "Translate this program from Fanuc to Siemens"
-> `ppg_translate(gcode: "...", source: "fanuc", target: "siemens")`
-> G81->CYCLE81, comments converted, auto-validated

**Example 3**: "Compare drilling across Fanuc, Siemens, and Heidenhain"
-> `ppg_compare(operation: "drilling", controllers: ["fanuc","siemens","heidenhain"])`
-> Side-by-side G-code output with validation scores

# POST PROCESSOR GENERATOR GUIDE

## Supported Controllers (6)
| Controller | Family | Comment Style | Canned Cycles | Program End |
|-----------|--------|---------------|---------------|-------------|
| Fanuc | fanuc | ( ) | G73/G81-G86 | M30 |
| Haas | haas | ( ) | G73/G81-G86 | M30 |
| Siemens | siemens | ; | CYCLE81-86 | M30 |
| Heidenhain | heidenhain | ; | CYCL DEF | END PGM |
| Mazak | mazak | ( ) | G73/G81-G86 | M30 |
| Okuma | okuma | ( ) | G73/G81-G86 | M30 |

## Supported Operations (13)
facing, drilling, peck_drilling, chip_break_drilling, tapping, boring,
thread_milling, circular_pocket, profile, tool_change, program_header,
program_footer, subprogram_call

## Composition Pipeline
```
Input G-code/Params -> Controller Resolution -> Generate/Translate
    -> Syntax Validation (7 checks) -> Score (0-1) -> Output
```

## Validation Checks (7)
1. Program end code (M30 / END PGM)
2. Comment syntax (parentheses vs semicolons)
3. Canned cycle compatibility (G81 vs CYCLE81 vs CYCL DEF)
4. Feed rate presence (F-word)
5. Spindle speed presence (S-word)
6. Work offset presence (G54-G59)
7. Tool change presence (T## M6)

## Tier Gating
| Feature | Free | Pro | Enterprise |
|---------|------|-----|------------|
| Single generation | Yes | Yes | Yes |
| Validation | Yes | Yes | Yes |
| Translation | Yes | Yes | Yes |
| Batch (targets) | 2 | Unlimited | Unlimited |
| Templates | 4 ops | All ops | All ops |
