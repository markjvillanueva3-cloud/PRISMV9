---
name: prism-threading-mastery
description: |
  Complete threading reference covering all 12 prism_thread actions.
  Tap vs thread mill decision. Standards (UNC/UNF/metric/pipe).
  Go/No-Go gauges. G-code generation for major controllers.
---

## Quick Reference (Operational)

### When To Use
- Trigger keywords: "threading", "mastery", "complete", "covering", "thread", "actions", "mill"
- User asks about machining parameters, process physics, or material behavior related to this topic.

### How To Use
1. Load skill: `prism_skill_script→skill_content(id="prism-threading-mastery")`
2. Apply relevant knowledge to current task context
3. Cross-reference with related dispatchers:
   - prism_skill_script→skill_content(id="prism-threading-mastery") to load reference data
   - prism_calc→[relevant_action] for calculations using this knowledge
   - prism_data→material_get/tool_get for parameter lookups

### What It Returns
- **Format**: Structured markdown reference with formulas, tables, and decision criteria
- **Location**: Loaded into context via skill_content (not a file output)
- **Success**: Relevant physics models, parameter ranges, and decision criteria for the machining scenario
- **Failure**: Skill not found → verify skill ID in SKILL_INDEX.json

### Examples
**Example 1**: User asks "What threading parameters for 316 stainless?"
→ Load skill: skill_content("prism-threading-mastery") → Extract relevant threading data → Cross-ref with prism_data→material_get("316SS") → Provide physics-based recommendation

**Example 2**: User needs to troubleshoot mastery issues on Inconel 718
→ Load skill → Identify root cause criteria → Apply diagnostic flowchart → Recommend parameter adjustments with safety validation

# PRISM Threading Mastery
## All 12 prism_thread Actions

## Method Selection

| Method | When to Use | Advantages | Limitations |
|--------|------------|------------|-------------|
| **Tapping** | Production, standard sizes, through holes | Fast, simple, low cost | Fixed size, breakage risk |
| **Thread Milling** | Large threads, blind holes, hard materials, CNC | Flexible size, better finish, no breakage | Slower, requires CNC interpolation |
| **Single-point** | Lathe, large diameters, custom threads | Any thread form, high accuracy | Slow, multiple passes |
| **Thread forming** | Soft materials, high strength needed | No chips, stronger thread | Limited materials, high torque |

## Action Reference

### Specifications & Dimensions
| Action | Input | Output |
|--------|-------|--------|
| `get_thread_specifications` | thread_standard, size | Full spec: pitch, major/minor dia, class |
| `calculate_pitch_diameter` | standard, size, class | Pitch diameter with tolerances |
| `calculate_minor_major_diameter` | standard, size | Min/max diameters |
| `calculate_engagement_percent` | hole_dia, thread_spec | % thread engagement (target: 65-75%) |
| `calculate_thread_depth` | standard, size, engagement% | Required thread depth |

### Process Parameters
| Action | Input | Output |
|--------|-------|--------|
| `calculate_tap_drill` | thread_spec | Drill size for target engagement |
| `calculate_thread_mill_params` | thread_spec, tool, material | Speed, feed, stepover, passes |
| `calculate_thread_cutting_params` | thread_spec, material, method | Cutting speed, feed, DOC per pass |
| `select_thread_insert` | thread_spec, material | Insert grade, geometry recommendation |

### Verification & Output
| Action | Input | Output |
|--------|-------|--------|
| `get_go_nogo_gauges` | thread_spec, class | GO and NO-GO gauge dimensions |
| `validate_thread_fit_class` | measured_dims, spec | Pass/fail per fit class |
| `generate_thread_gcode` | thread_spec, controller, method | Ready-to-run G-code |

## Common Thread Standards

| Standard | Format | Example | Pitch Type |
|----------|--------|---------|------------|
| UNC | size-TPI | 1/2-13 UNC | Coarse |
| UNF | size-TPI | 1/2-20 UNF | Fine |
| Metric | M×pitch | M12×1.75 | Coarse |
| Metric Fine | M×pitch | M12×1.25 | Fine |
| NPT | size-TPI | 1/2-14 NPT | Taper pipe |
| BSPT | size-TPI | 1/2-14 BSPT | British taper |

## Engagement Rules
- **Minimum:** 50% (3× diameter depth in soft materials)
- **Optimal:** 65-75% (best strength/torque balance)
- **Maximum:** 83% (diminishing returns, high tap breakage risk)
- **Rule of thumb:** Thread depth = 1.5× major diameter (steel), 2× (aluminum)

## G-code Patterns (by Controller)
**FANUC rigid tap:** `G84 X_ Y_ Z_ R_ F_ (pitch×RPM)`
**FANUC thread mill:** Helical G02/G03 with Z feed per revolution
**Siemens tap:** `CYCLE84(RTP, RFP, SDIS, DP, DTB, SDAC, MPIT, PIT, AXN)`
**HAAS tap:** `G84 X_ Y_ Z_ R_ F_ J_ (J=retract speed)`

## Workflow: Complete Threading Setup
```
1. get_thread_specifications("M12x1.75")  → full spec
2. calculate_tap_drill("M12x1.75", 75)    → Ø10.2mm drill
3. calculate_engagement_percent(10.2, "M12x1.75") → 76.8%
4. calculate_thread_cutting_params("M12x1.75", "4140", "tap") → 15 m/min, sync feed
5. get_go_nogo_gauges("M12x1.75", "6H")   → GO: 10.863mm, NOGO: 11.063mm
6. generate_thread_gcode("M12x1.75", "FANUC", "rigid_tap") → G84 program
```
