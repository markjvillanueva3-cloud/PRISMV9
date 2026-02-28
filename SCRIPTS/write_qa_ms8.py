#!/usr/bin/env python3
"""Generate all 5 QA-MS8 deliverable files."""
import json, os

OUT = "C:/PRISM/state/QA-MS8"
os.makedirs(OUT, exist_ok=True)

TIMESTAMP = "2026-02-28T11:00:00Z"
AUDITOR = "claude-opus-4-6"

# ── U00: prism_calc Audit ──
u00 = {
    "unit": "QA-MS8-U00",
    "title": "prism_calc Dispatcher Audit",
    "auditor": AUDITOR,
    "timestamp": TIMESTAMP,
    "status": "CONDITIONAL PASS",
    "scope": "calcDispatcher.ts — 56 actions, 13 engines + 4 inline handlers",
    "file": "src/tools/dispatchers/calcDispatcher.ts",
    "action_count": 56,
    "engine_routing": {
        "ManufacturingCalculations": {
            "actions": ["cutting_force", "tool_life", "speed_feed", "flow_stress", "surface_finish", "mrr", "power", "torque", "chip_load", "productivity"],
            "count": 10
        },
        "AdvancedCalculations": {
            "actions": ["stability", "deflection", "thermal", "cost_optimize", "multi_optimize"],
            "count": 5
        },
        "ToolpathCalculations": {
            "actions": ["engagement", "trochoidal", "hsm", "scallop", "stepover", "cycle_time", "arc_fit", "chip_thinning", "multi_pass", "coolant_strategy", "gcode_snippet"],
            "count": 11
        },
        "ToleranceEngine": {
            "actions": ["tolerance_analysis", "fit_analysis"],
            "count": 2
        },
        "GCodeTemplateEngine": {
            "actions": ["gcode_generate"],
            "count": 1
        },
        "DecisionTreeEngine": {
            "actions": ["decision_tree"],
            "count": 1
        },
        "ReportRenderer": {
            "actions": ["render_report"],
            "count": 1
        },
        "CampaignEngine": {
            "actions": ["campaign_create", "campaign_validate", "campaign_optimize", "campaign_cycle_time"],
            "count": 4
        },
        "InferenceChainEngine": {
            "actions": ["inference_chain"],
            "count": 1
        },
        "PhysicsPredictionEngine": {
            "actions": ["surface_integrity_predict", "chatter_predict", "thermal_compensate", "unified_machining_model", "coupling_sensitivity"],
            "count": 5
        },
        "OptimizationEngine": {
            "actions": ["optimize_parameters", "optimize_sequence", "sustainability_report", "eco_optimize"],
            "count": 4
        },
        "WorkholdingIntelligenceEngine": {
            "actions": ["fixture_recommend"],
            "count": 1
        },
        "AlgorithmEngine": {
            "actions": ["algorithm_calculate", "algorithm_validate", "algorithm_list", "algorithm_info", "algorithm_batch", "algorithm_benchmark"],
            "count": 6
        },
        "inline_dispatcher_native": {
            "actions": ["wear_prediction", "process_cost_calc", "uncertainty_chain", "controller_optimize"],
            "count": 4,
            "note": "Full physics models implemented inline in switch cases (~350 lines), violates engine/dispatcher separation"
        }
    },
    "parameter_normalization": {
        "alias_layer": "3-pass normalization: domain shorthands (ap->axial_depth, fz->feed_per_tooth, etc.), camelCase->snake_case, dynamic paramNormalizer (try/catch soft dep)",
        "validation": "z.record(z.any()).optional() — no action-specific Zod schema, validation deferred to engine functions",
        "material_lookup": "Per-call _matCache Map prevents redundant registry reads"
    },
    "orphaned_engine_methods": [
        {"engine": "ManufacturingCalculations", "method": "calculateDrillingForce", "note": "Full Sandvik/Shaw drilling model, no dispatcher action"},
        {"engine": "ToleranceEngine", "method": "findAchievableGrade", "note": "IT grade from deflection, no dispatcher action"},
        {"engine": "PhysicsPredictionEngine", "method": "get_source_file_catalog / catalog_source_files", "note": "Internal cases unreachable from MCP API"},
        {"engine": "OptimizationEngine", "method": "get_source_file_catalog / catalog_source_files", "note": "Same pattern — unreachable"},
        {"engine": "CampaignEngine", "method": "getCampaignSourceFileCatalog", "note": "Exported but not wired"},
        {"engine": "GCodeTemplateEngine", "method": "getSourceFileCatalog", "note": "Exported but not wired"}
    ],
    "findings": [
        {"severity": "MAJOR", "finding": "surface_finish action missing 'operation' parameter — engine receives undefined, loses boring/grinding/reaming Rz/Ra ratios"},
        {"severity": "MAJOR", "finding": "_physicsActions cross-field check is dead code — 'optimize' not in ACTIONS, result.Vc never exists. validateCrossFieldPhysics never called."},
        {"severity": "MAJOR", "finding": "calculateDrillingForce completely orphaned — core machining operation with no dispatcher exposure"},
        {"severity": "MINOR", "finding": "4 inline dispatcher-native actions (~350 lines of physics in switch cases) violate engine/dispatcher separation"},
        {"severity": "MINOR", "finding": "Sub-dispatcher error handling inconsistency — optimization()/workholdingIntelligence() return soft {error:...} objects vs main switch that throws"},
        {"severity": "MINOR", "finding": "toleranceStackUp receives raw params.stack_dimensions without type-checking"},
        {"severity": "INFO", "finding": "52 engine-routed + 4 inline = 56 total actions across 13 engines"}
    ],
    "rubric_scores": {
        "correctness": 4,
        "completeness": 3,
        "safety": 4,
        "performance": 5,
        "composite": "4.00",
        "pass_fail": "CONDITIONAL PASS"
    },
    "exit_conditions_met": {
        "all_actions_mapped": True,
        "unwired_actions_identified": True,
        "orphaned_engine_methods_identified": True
    }
}

# ── U01: prism_thread Audit ──
u01 = {
    "unit": "QA-MS8-U01",
    "title": "prism_thread Dispatcher Audit",
    "auditor": AUDITOR,
    "timestamp": TIMESTAMP,
    "status": "PASS",
    "scope": "threadDispatcher.ts — 12 actions, ThreadCalculationEngine, 311 thread definitions",
    "file": "src/tools/dispatchers/threadDispatcher.ts",
    "lines": 90,
    "action_count": 12,
    "actions": [
        "calculate_tap_drill", "calculate_thread_mill_params", "calculate_thread_depth",
        "calculate_engagement_percent", "get_thread_specifications", "get_go_nogo_gauges",
        "calculate_pitch_diameter", "calculate_minor_major_diameter", "select_thread_insert",
        "calculate_thread_cutting_params", "validate_thread_fit_class", "generate_thread_gcode"
    ],
    "engine": "ThreadCalculationEngine (sole engine, all 12 actions route through handleThreadTool())",
    "thread_standards": {
        "active": {
            "ISO_Metric_Coarse": {"count": 48, "range": "M1-M100"},
            "ISO_Metric_Fine": {"count": 73, "range": "M1-M100, multiple pitches"},
            "UNC": {"count": 26, "range": "#0-2 inch"},
            "UNF": {"count": 24, "range": "#0-1.5 inch"},
            "UNEF": {"count": 11, "range": "#12-1 inch"},
            "NPT": {"count": 15, "range": "1/16-6 inch"},
            "NPTF": {"count": 15, "range": "derived from NPT"},
            "BSP": {"count": 9, "range": "1/8-2 inch"},
            "BSPT": {"count": 9, "range": "derived from BSP"},
            "ACME": {"count": 23, "range": "1/4-5 inch"},
            "Stub_ACME": {"count": 23, "range": "derived from ACME"},
            "Trapezoidal": {"count": 35, "range": "Tr8-Tr100"}
        },
        "total_definitions": 311,
        "data_source": "Hardcoded TS constants, formula-generated from Machinery's Handbook (ISO 261/262/965, ASME B1.1, ASME B1.20.1, BS 21)",
        "missing_standards": ["Buttress (mentioned in engines, no data)", "Whitworth BSW/BSF (no parser)", "NPS (type declared, no data)"]
    },
    "orphaned_engines": [
        {"engine": "ThreadMillingEngine", "note": "Full engine with tests, never called by dispatcher"},
        {"engine": "SinglePointThreadEngine", "note": "Full engine with tests, never called by dispatcher"}
    ],
    "findings": [
        {"severity": "OK", "finding": "12 actions correctly routed through ThreadCalculationEngine via handleThreadTool()"},
        {"severity": "OK", "finding": "311 thread definitions across 12 standards, formula-generated from authoritative sources"},
        {"severity": "MAJOR", "finding": "calculateStrippingStrength() fully implemented in engine but no dispatcher action — thread stripping is critical safety calculation"},
        {"severity": "MINOR", "finding": "NPTF/BSPT are shallow copies of NPT/BSP — missing Dryseal tolerance differences and taper-adjusted diameters"},
        {"severity": "MINOR", "finding": "NPS type declared in PipeThread interface but no data exists — silently returns null"},
        {"severity": "MINOR", "finding": "ThreadMillingEngine and SinglePointThreadEngine orphaned — richer than dispatcher's simplified thread mill handler"},
        {"severity": "MINOR", "finding": "calculate_pitch_diameter uses simplified 0.02*pitch tolerance instead of ISO 965 size-dependent tolerances"},
        {"severity": "MINOR", "finding": "generate_thread_gcode: MAZAK/OKUMA/HEIDENHAIN fall through to FANUC defaults; thread mill G-code ignores controller param"},
        {"severity": "MINOR", "finding": "validate_thread_fit_class only handles ISO metric and Unified — pipe/ACME classes return valid:false with no explanation"}
    ],
    "rubric_scores": {
        "correctness": 4,
        "completeness": 4,
        "safety": 4,
        "performance": 5,
        "composite": "4.25",
        "pass_fail": "PASS"
    },
    "exit_conditions_met": {
        "all_actions_mapped": True,
        "thread_standard_coverage_assessed": True,
        "engine_method_coverage_verified": True
    }
}

# ── U02: prism_toolpath Audit ──
u02 = {
    "unit": "QA-MS8-U02",
    "title": "prism_toolpath Dispatcher Audit",
    "auditor": AUDITOR,
    "timestamp": TIMESTAMP,
    "status": "CONDITIONAL PASS",
    "scope": "toolpathDispatcher.ts — 8 actions, ~700 strategies (680 claim is stale)",
    "file": "src/tools/dispatchers/toolpathDispatcher.ts",
    "action_count": 8,
    "actions": [
        "strategy_select", "params_calculate", "strategy_search", "strategy_list",
        "strategy_info", "stats", "material_strategies", "prism_novel"
    ],
    "strategy_verification": {
        "envelope_claim": 680,
        "file_header_claim": "762+",
        "runtime_registry": "~700 in main ToolpathStrategyRegistry class (System A)",
        "extended_strategies": "~300+ additional entries in EXTENDED_STRATEGIES, NOT wired to dispatcher",
        "part1_registry": "~24 entries in ToolpathStrategyRegistry_Part1.ts, completely orphaned",
        "assessment": "680 is a stale approximation. Runtime count is ~700. Extended strategies unreachable from MCP API.",
        "categories": {
            "milling_roughing": 127,
            "milling_finishing": 156,
            "hole_making": 98,
            "turning": 124,
            "multiaxis": 157,
            "prism_novel": 55
        },
        "category_total_claimed": 717
    },
    "engine_routing": {
        "live_path": "toolpathDispatcher -> toolpathTools.ts -> toolpathRegistry.getBestStrategy() / getStrategiesByCategory()",
        "scoring": "Base 50 + bestFor bonus + CAM software match + material match + axes capability + priority weighting",
        "dead_paths": [
            "ToolpathGenerationEngine (generate/simulate/optimize methods not exposed via dispatcher)",
            "EXTENDED_STRATEGIES (consolidateExtendedStrategies output not called by dispatcher tools)",
            "ToolpathStrategyRegistry_Part1.ts (entire 704-line file orphaned, different schema)",
            "ToolpathCalculations.ts (physics math, called by prism_calc not prism_toolpath)"
        ]
    },
    "findings": [
        {"severity": "OK", "finding": "8 actions all wired to live toolpathRegistry methods"},
        {"severity": "OK", "finding": "Strategy selection uses multi-factor scoring with material/axes/priority weighting"},
        {"severity": "MAJOR", "finding": "ToolpathStrategyRegistry_Part1.ts (704 lines, ~24 strategies) is completely orphaned — different schema, never imported"},
        {"severity": "MAJOR", "finding": "EXTENDED_STRATEGIES (~300+ entries) exported but never called by dispatcher tools — unreachable from MCP"},
        {"severity": "MAJOR", "finding": "ToolpathGenerationEngine generate/simulate/optimize methods not exposed — no action to generate actual toolpaths"},
        {"severity": "MINOR", "finding": "680 strategy count is stale — actual runtime is ~700, file header claims 762+"},
        {"severity": "MINOR", "finding": "toolpath_stats() counts only main registry, not extended — returns incomplete total"},
        {"severity": "MINOR", "finding": "Only strategy_select and params_calculate go through pre/post hooks — other 6 actions bypass hooks"}
    ],
    "rubric_scores": {
        "correctness": 4,
        "completeness": 3,
        "safety": 5,
        "performance": 4,
        "composite": "4.00",
        "pass_fail": "CONDITIONAL PASS"
    },
    "exit_conditions_met": {
        "strategy_count_verified": True,
        "action_routing_verified": True,
        "category_distribution_documented": True
    }
}

# ── U03: prism_manus Audit ──
u03 = {
    "unit": "QA-MS8-U03",
    "title": "prism_manus Dispatcher Audit",
    "auditor": AUDITOR,
    "timestamp": TIMESTAMP,
    "status": "CONDITIONAL PASS",
    "scope": "manusDispatcher.ts — 11 actions, Claude API task executor (NOT manufacturing-specific)",
    "file": "src/tools/dispatchers/manusDispatcher.ts",
    "action_count": 11,
    "actions": [
        "create_task", "task_status", "task_result", "cancel_task", "list_tasks",
        "web_research", "code_sandbox", "hook_trigger", "hook_list", "hook_chain", "hook_stats"
    ],
    "architecture": {
        "nature": "General-purpose AI task executor using Claude API — NOT a manufacturing dispatcher despite the name",
        "engine": "No external engine — all logic inline in switch cases",
        "api": "Raw fetch to https://api.anthropic.com/v1/messages",
        "persistence": "In-memory Map only — tasks lost on server restart",
        "atcs_bridge": "ManusATCSBridge.ts handles ATCS delegation (via atcsDispatcher, not manusDispatcher)"
    },
    "action_groups": {
        "task_management": {
            "actions": ["create_task", "task_status", "task_result", "cancel_task", "list_tasks"],
            "note": "Async task queue with in-memory store"
        },
        "specialized_tasks": {
            "actions": ["web_research", "code_sandbox"],
            "note": "Both are Claude API calls with structured prompts — no actual web search or code execution"
        },
        "hook_management": {
            "actions": ["hook_trigger", "hook_list", "hook_chain", "hook_stats"],
            "note": "Read-only hook registry lookup — hook_trigger does NOT execute hooks despite returning status:'executed'"
        }
    },
    "findings": [
        {"severity": "OK", "finding": "11 actions all implemented with no stubs or fallthrough"},
        {"severity": "MAJOR", "finding": "code_sandbox does NOT execute code — calls Claude to 'mentally simulate' execution. Misleading name."},
        {"severity": "MAJOR", "finding": "web_research does NOT search the web — uses Claude model knowledge only. Misleading name."},
        {"severity": "MAJOR", "finding": "hook_trigger returns status:'executed' but does NOT actually execute hooks — metadata lookup only"},
        {"severity": "MINOR", "finding": "cancel_task silently no-ops on running tasks — no abort signal, no error returned"},
        {"severity": "MINOR", "finding": "Task store is in-memory only — all tasks lost on server restart"},
        {"severity": "MINOR", "finding": "3 duplicate callClaude implementations (manusDispatcher, atcsDispatcher, ManusATCSBridge)"},
        {"severity": "MINOR", "finding": "manus_integration.py is dead code — Python prototype for external Manus AI service, never called"},
        {"severity": "INFO", "finding": "Name 'prism_manus' is misleading — this is a general AI task executor, not manufacturing-specific"}
    ],
    "rubric_scores": {
        "correctness": 3,
        "completeness": 4,
        "safety": 4,
        "performance": 4,
        "composite": "3.75",
        "pass_fail": "CONDITIONAL PASS"
    },
    "exit_conditions_met": {
        "all_actions_inventoried": True,
        "engine_coverage_verified": True,
        "manufacturing_process_coverage_assessed": True
    }
}

# ── U04: Parameter Normalization Consistency ──
u04 = {
    "unit": "QA-MS8-U04",
    "title": "Parameter Normalization Consistency Across Manufacturing Dispatchers",
    "auditor": AUDITOR,
    "timestamp": TIMESTAMP,
    "status": "CONDITIONAL PASS",
    "scope": "Cross-dispatcher comparison: prism_calc, prism_thread, prism_toolpath, prism_manus",
    "dispatchers_compared": [
        {"name": "prism_calc", "param_schema": "z.record(z.any()).optional()", "normalization": "3-pass alias layer (domain→snake_case→dynamic normalizer)", "validation": "Deferred to engines"},
        {"name": "prism_thread", "param_schema": "z.record(z.any()).optional()", "normalization": "None — raw params passed to handleThreadTool()", "validation": "In threadTools.ts switch cases"},
        {"name": "prism_toolpath", "param_schema": "z.record(z.any()).optional()", "normalization": "None — raw params passed to toolpathTools functions", "validation": "In toolpathTools.ts functions"},
        {"name": "prism_manus", "param_schema": "z.record(z.any()).optional()", "normalization": "None — raw params used inline", "validation": "Minimal type checks in switch cases"}
    ],
    "parameter_naming": {
        "convention": "snake_case is the target convention (prism_calc enforces this via alias layer)",
        "consistency": "INCONSISTENT — only prism_calc has alias normalization. prism_thread/prism_toolpath accept whatever the caller sends.",
        "examples": {
            "prism_calc": "ap→axial_depth, fz→feed_per_tooth, toolDiameter→tool_diameter",
            "prism_thread": "No aliases — caller must use exact param names (designation, engagement_percent, etc.)",
            "prism_toolpath": "No aliases — caller must use exact param names (operation, material, feature_type, etc.)",
            "prism_manus": "No aliases — task, mode, prompt, hook_id etc."
        }
    },
    "unit_handling": {
        "system": "SI (metric) throughout — all dispatchers use mm, m/min, N, Pa, K",
        "imperial_support": "prism_calc has limited imperial detection (inch→mm conversion for tool_diameter). Other dispatchers: metric only.",
        "consistency": "MOSTLY CONSISTENT — SI default everywhere, but only prism_calc attempts any unit conversion"
    },
    "default_values": {
        "prism_calc": "Engine-level defaults (e.g., cutting_speed from material registry, Taylor coefficients, T_ref=25C). Auto-derivation from registry if params missing.",
        "prism_thread": "Hardcoded defaults in threadTools.ts (engagement_percent=75, fit_class='6H'). No registry lookup.",
        "prism_toolpath": "Strategy scoring defaults (priority='balanced'). No parameter-level defaults.",
        "prism_manus": "mode='balanced' (maps to sonnet model), limit=20 for list_tasks.",
        "consistency": "INCONSISTENT — prism_calc derives from registry, others use hardcoded defaults or require explicit params"
    },
    "findings": [
        {"severity": "MAJOR", "finding": "Only prism_calc has parameter alias normalization — prism_thread and prism_toolpath accept raw params with no normalization layer"},
        {"severity": "MINOR", "finding": "All 4 dispatchers use z.record(z.any()).optional() — no action-specific Zod schemas anywhere"},
        {"severity": "MINOR", "finding": "Imperial unit handling only in prism_calc — other dispatchers silently accept metric only"},
        {"severity": "MINOR", "finding": "Default value strategies differ: registry-derived (calc) vs hardcoded (thread) vs none (toolpath)"},
        {"severity": "OK", "finding": "SI (metric) is the consistent base unit system across all dispatchers"},
        {"severity": "OK", "finding": "Parameter naming within each dispatcher is internally consistent"},
        {"severity": "INFO", "finding": "prism_manus is not a manufacturing dispatcher — parameter comparison is not meaningful for manufacturing consistency"}
    ],
    "rubric_scores": {
        "correctness": 4,
        "completeness": 4,
        "safety": 4,
        "performance": 4,
        "composite": "4.00",
        "pass_fail": "CONDITIONAL PASS"
    },
    "recommended_fixes": [
        {
            "priority": "MEDIUM",
            "action": "Add alias normalization layer to prism_thread and prism_toolpath (copy from prism_calc pattern)",
            "reason": "Callers may use camelCase or domain abbreviations — currently silently ignored",
            "effort": "~30 lines per dispatcher"
        },
        {
            "priority": "LOW",
            "action": "Add action-specific Zod schemas to catch invalid params at dispatcher level",
            "reason": "z.record(z.any()) provides no compile-time or runtime param safety",
            "effort": "~1 session per dispatcher"
        }
    ],
    "exit_conditions_met": {
        "parameter_naming_compared": True,
        "unit_systems_verified": True,
        "default_value_policies_compared": True
    }
}

# ── Write all files ──
files = {
    "prism-calc-audit.json": u00,
    "prism-thread-audit.json": u01,
    "prism-toolpath-audit.json": u02,
    "prism-manus-audit.json": u03,
    "parameter-normalization-audit.json": u04,
}

for fname, data in files.items():
    path = os.path.join(OUT, fname)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"Wrote {path}")

print(f"\nDone -- {len(files)} files written to {OUT}")
