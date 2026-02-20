# PRISM CCE - Cognitive Composition Engine
## Skill ID: prism-cce
## Version: 1.0.0
## Category: P2-CCE

---

## Overview

The Cognitive Composition Engine (CCE) transforms PRISM from "lots of tools" into **intelligent tool composition**. Instead of manually selecting which tools to use, CCE automatically:

1. **Analyzes** your problem to identify category and complexity
2. **Matches** the best techniques from 58+ cognitive techniques
3. **Composes** an execution plan with tool sequences
4. **Guides** execution with step-by-step instructions

---

## 7 CCE Tools

| Tool | Purpose |
|------|---------|
| `cce_analyze_problem` | Identify problem type, complexity, requirements |
| `cce_technique_list` | Browse 58+ techniques by category |
| `cce_technique_get` | Get technique details |
| `cce_match_techniques` | Find best techniques for problem |
| `cce_compose` | Create execution plan |
| `cce_execute` | Get step-by-step guide |
| `cce_stats` | Get CCE statistics |

---

## Problem Categories

calculation, optimization, selection, diagnosis, prediction, data_extraction, data_validation, planning, comparison, explanation, pattern, anomaly, decomposition, synthesis, configuration, retrieval, creation, classification

---

## Technique Categories

deductive, inductive, abductive, analogical, causal, heuristic, exhaustive, greedy, evolutionary, gradient, divide_conquer, hierarchical, modular, recursive, aggregation, consensus, ensemble, fusion, verification, cross_validation

---

## Key Techniques

| ID | Name | Tools |
|----|------|-------|
| CALC-KIENZLE-001 | Kienzle Cutting Force | calc_cutting_force |
| CALC-TAYLOR-001 | Taylor Tool Life | calc_tool_life |
| OPT-SPEED-FEED-001 | Speed & Feed Optimization | calc_speed_feed |
| DIAG-ALARM-001 | Alarm Code Diagnosis | alarm_decode, alarm_fix |
| SEL-MATERIAL-001 | Material Selection | material_search |
| SAFE-SPINDLE-001 | Spindle Protection | check_spindle_torque |

---

## Files

- `cce_core.py` - Core engine with 58 techniques
- `cce_tools.py` - MCP tool handlers
