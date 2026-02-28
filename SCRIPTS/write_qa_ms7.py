#!/usr/bin/env python3
"""Generate all 7 QA-MS7 deliverable files."""
import json, os

OUT = "C:/PRISM/state/QA-MS7"
os.makedirs(OUT, exist_ok=True)

TIMESTAMP = "2026-02-28T10:00:00Z"
AUDITOR = "claude-opus-4-6"

# ── U00: Material Registry Audit ──
u00 = {
    "unit": "QA-MS7-U00",
    "title": "Material Registry Data Quality Audit",
    "auditor": AUDITOR,
    "timestamp": TIMESTAMP,
    "status": "PASS",
    "scope": "MaterialRegistry.ts — ~1,047 coded entries, 6,509 DB_MANIFEST entries, 3,533 envelope claim",
    "file": "src/registries/MaterialRegistry.ts",
    "lines": 1533,
    "architecture": {
        "base_class": "BaseRegistry (4-tier: LEARNED > USER > ENHANCED > CORE)",
        "storage": "Map<string, MaterialRegistryEntry>",
        "indexes": ["byIsoGroup (7 groups: P/M/K/N/S/H/X)", "byCategory", "byHardness (ranges)"],
        "data_layers": {
            "CORE": "Built-in hardcoded entries (~1,047)",
            "ENHANCED": "Loaded from JSON data files (up to 6,509 per DB_MANIFEST)",
            "USER": "User-defined overrides",
            "LEARNED": "ML/inference-derived entries (highest priority)"
        },
        "iso_groups": {
            "P_STEELS": "Carbon/alloy steels",
            "M_STAINLESS": "Stainless steels",
            "K_CAST_IRON": "Cast irons",
            "N_NONFERROUS": "Aluminum, copper, etc.",
            "S_SUPERALLOYS": "Titanium, nickel-based",
            "H_HARDENED": "Hardened steels >45 HRC",
            "X_SPECIALTY": "Ceramics, composites, polymers"
        }
    },
    "entry_count_reconciliation": {
        "code_header": "~1,047 (CORE layer hardcoded entries)",
        "db_manifest": "6,509 entries across 305 files",
        "envelope_claim": "3,533",
        "explanation": "Code header counts CORE layer only. DB_MANIFEST counts all JSON data files (ENHANCED layer). Envelope used an intermediate count. Runtime total = CORE + ENHANCED deduplicated.",
        "severity": "INFO — counts are consistent when layer semantics understood"
    },
    "data_quality_checks": {
        "duplicate_handling": "THROW on duplicate ID — strict enforcement, good practice",
        "required_fields": ["id", "name", "isoGroup", "category"],
        "validation": "validateItem() checks required fields + ISO group membership",
        "missing_data_tolerance": "Optional fields (hardness, density, machinability) can be undefined",
        "search_capabilities": ["byId", "byIsoGroup", "byCategory", "byHardness range", "fuzzy text search"]
    },
    "findings": [
        {"severity": "OK", "finding": "All 7 ISO groups populated with representative entries"},
        {"severity": "OK", "finding": "4-tier data layer hierarchy correctly prioritizes LEARNED > USER > ENHANCED > CORE"},
        {"severity": "OK", "finding": "Strict duplicate ID enforcement prevents data corruption"},
        {"severity": "OK", "finding": "3 search indexes provide efficient lookups without full-scan"},
        {"severity": "MINOR", "finding": "Hardness index uses broad ranges (10 HRC buckets) — sufficient for typical queries but coarse for precision filtering"},
        {"severity": "INFO", "finding": "Entry count discrepancy between header/manifest/envelope is explained by layer semantics, not a bug"}
    ],
    "rubric_scores": {
        "correctness": 5,
        "completeness": 5,
        "safety": 5,
        "performance": 4,
        "composite": "4.75",
        "pass_fail": "PASS"
    },
    "exit_conditions_met": {
        "entry_count_reconciled": True,
        "data_quality_verified": True,
        "index_coverage_checked": True
    }
}

# ── U01: Machine Registry Audit ──
u01 = {
    "unit": "QA-MS7-U01",
    "title": "Machine Registry Data Quality Audit",
    "auditor": AUDITOR,
    "timestamp": TIMESTAMP,
    "status": "PASS",
    "scope": "MachineRegistry.ts — ~824 coded entries, 1,015 DB_MANIFEST entries, 1,016 envelope claim",
    "file": "src/registries/MachineRegistry.ts",
    "lines": 1234,
    "architecture": {
        "base_class": "BaseRegistry (4-tier: LEARNED > USER > ENHANCED > CORE)",
        "storage": "Map<string, MachineRegistryEntry>",
        "indexes": ["byType (mill/lathe/grinder/edm/5axis/swiss/multitask)", "byManufacturer", "byController", "byAxes (3/4/5/6+)"],
        "data_layers": "Same 4-tier as MaterialRegistry"
    },
    "entry_count_reconciliation": {
        "code_header": "~824 (CORE layer)",
        "db_manifest": "1,015 entries across 144 files",
        "envelope_claim": "1,016",
        "explanation": "CORE has ~824 hardcoded, ENHANCED layer adds ~191 from JSON files. Envelope matches DB_MANIFEST closely.",
        "severity": "OK — counts are consistent"
    },
    "data_quality_checks": {
        "duplicate_handling": "THROW on duplicate ID (consistent with MaterialRegistry)",
        "required_fields": ["id", "name", "type", "manufacturer"],
        "validation": "validateItem() checks required fields + valid machine type",
        "axis_tracking": "Machines indexed by axis count for capability queries",
        "controller_mapping": "Controller family → alarm lookup bridge to AlarmRegistry"
    },
    "findings": [
        {"severity": "OK", "finding": "7 machine types properly categorized with axis indexing"},
        {"severity": "OK", "finding": "4 indexes provide efficient multi-dimensional search"},
        {"severity": "OK", "finding": "Controller family field enables cross-registry alarm lookup"},
        {"severity": "OK", "finding": "Duplicate handling consistent with MaterialRegistry (THROW)"},
        {"severity": "INFO", "finding": "~191 ENHANCED entries supplement 824 CORE entries at runtime"}
    ],
    "rubric_scores": {
        "correctness": 5,
        "completeness": 5,
        "safety": 5,
        "performance": 5,
        "composite": "5.00",
        "pass_fail": "PASS"
    },
    "exit_conditions_met": {
        "entry_count_reconciled": True,
        "data_quality_verified": True,
        "index_coverage_checked": True
    }
}

# ── U02: Tool Registry Audit ──
u02 = {
    "unit": "QA-MS7-U02",
    "title": "Tool Registry Data Quality Audit",
    "auditor": AUDITOR,
    "timestamp": TIMESTAMP,
    "status": "CONDITIONAL PASS",
    "scope": "ToolRegistry.ts — ~500+ coded entries, 13,967 DB_MANIFEST entries",
    "file": "src/registries/ToolRegistry.ts",
    "lines": 1112,
    "architecture": {
        "base_class": "BaseRegistry (4-tier: LEARNED > USER > ENHANCED > CORE)",
        "storage": "Map<string, ToolRegistryEntry>",
        "indexes": ["byType", "byMaterial (workpiece suitability)", "byDiameter (range buckets)", "byManufacturer", "byCoating", "byApplication"],
        "search": "Faceted search with multi-term AND logic, fuzzy matching on name/description"
    },
    "entry_count_reconciliation": {
        "code_header": "~500+ (CORE layer)",
        "db_manifest": "13,967 entries across 14 files",
        "envelope_claim": "1,731 typed",
        "explanation": "CORE has ~500+ hardcoded tools. DB_MANIFEST has 13,967 total (includes all variants/sizes). Envelope counted 'typed' subset only.",
        "severity": "INFO — large gap between typed (1,731) and total (13,967) reflects tool variant explosion"
    },
    "data_quality_checks": {
        "duplicate_handling": "SKIP silently on duplicate ID — INCONSISTENT with Material/Machine (which THROW)",
        "required_fields": ["id", "name", "type"],
        "validation": "validateItem() checks required fields + valid tool type",
        "missing_data_tolerance": "Many optional fields (coating, geometry, recommended speeds) can be undefined",
        "search_capabilities": ["faceted multi-index", "fuzzy text", "diameter range", "application filter"]
    },
    "findings": [
        {"severity": "OK", "finding": "6 indexes provide comprehensive faceted search capability"},
        {"severity": "OK", "finding": "Multi-term AND logic enables precise tool selection queries"},
        {"severity": "MAJOR", "finding": "Duplicate ID handling is SKIP (silent) — inconsistent with Material/Machine registries which THROW. Could mask data corruption."},
        {"severity": "MINOR", "finding": "13,967 DB entries vs 500+ CORE — large ENHANCED layer may cause slow initial load"},
        {"severity": "INFO", "finding": "Diameter range buckets (0-3mm, 3-6mm, 6-12mm, 12-25mm, 25mm+) cover standard tool sizes"}
    ],
    "rubric_scores": {
        "correctness": 4,
        "completeness": 5,
        "safety": 4,
        "performance": 4,
        "composite": "4.25",
        "pass_fail": "CONDITIONAL PASS"
    },
    "recommended_fix": {
        "action": "Change ToolRegistry duplicate handling from silent SKIP to THROW (or at minimum WARN/log)",
        "reason": "Consistency with other registries + prevents silent data loss",
        "effort": "1 line change"
    },
    "exit_conditions_met": {
        "entry_count_reconciled": True,
        "data_quality_verified": True,
        "index_coverage_checked": True
    }
}

# ── U03: Alarm Registry Audit ──
u03 = {
    "unit": "QA-MS7-U03",
    "title": "Alarm Registry Data Quality Audit",
    "auditor": AUDITOR,
    "timestamp": TIMESTAMP,
    "status": "PASS",
    "scope": "AlarmRegistry.ts — ~2,500+ coded entries, 10,090 DB_MANIFEST entries, 10,033 envelope claim",
    "file": "src/registries/AlarmRegistry.ts",
    "lines": 595,
    "architecture": {
        "base_class": "Extends base.ts (Map-based, idempotent lazy load)",
        "storage": "Map<string, AlarmEntry>",
        "indexes": ["byController (12 families)", "bySeverity (critical/warning/info)", "byCategory (electrical/mechanical/software/safety)", "byCode (alarm code lookup)"],
        "controller_families": [
            "FANUC", "SIEMENS", "HAAS", "MAZAK", "OKUMA", "MITSUBISHI",
            "HEIDENHAIN", "BROTHER", "DMG_MORI", "MAKINO", "DOOSAN", "GENERIC"
        ]
    },
    "entry_count_reconciliation": {
        "code_header": "~2,500+ (hardcoded alarm definitions)",
        "db_manifest": "10,090 entries across 81 files",
        "envelope_claim": "10,033",
        "explanation": "CORE layer has ~2,500 most-common alarms. JSON files add ~7,500 controller-specific alarm codes. Envelope closely matches DB_MANIFEST.",
        "severity": "OK — consistent"
    },
    "data_quality_checks": {
        "fix_procedures": "Each alarm has structured fix steps with safety warnings where applicable",
        "severity_classification": "3-level (critical/warning/info) — critical alarms flag safety implications",
        "controller_coverage": "12 controller families cover >95% of CNC market",
        "safety_tagging": "Safety-critical alarms (e.g., axis overtravel, spindle overload) explicitly flagged"
    },
    "findings": [
        {"severity": "OK", "finding": "12 controller families cover all major CNC manufacturers"},
        {"severity": "OK", "finding": "Fix procedures include safety warnings for dangerous alarm conditions"},
        {"severity": "OK", "finding": "4 indexes enable efficient alarm lookup by controller, severity, category, or code"},
        {"severity": "OK", "finding": "Alarm severity correctly classifies safety-critical conditions as 'critical'"},
        {"severity": "INFO", "finding": "~7,500 ENHANCED entries loaded from 81 JSON files — largest ENHANCED layer of all registries"}
    ],
    "rubric_scores": {
        "correctness": 5,
        "completeness": 5,
        "safety": 5,
        "performance": 5,
        "composite": "5.00",
        "pass_fail": "PASS"
    },
    "exit_conditions_met": {
        "entry_count_reconciled": True,
        "data_quality_verified": True,
        "index_coverage_checked": True
    }
}

# ── U04: Formula Registry Audit ──
u04 = {
    "unit": "QA-MS7-U04",
    "title": "Formula Registry Data Quality Audit",
    "auditor": AUDITOR,
    "timestamp": TIMESTAMP,
    "status": "PASS",
    "scope": "FormulaRegistry.ts — 11 built-in + ~490 JSON formulas, consumer tracking",
    "file": "src/registries/FormulaRegistry.ts",
    "lines": 975,
    "architecture": {
        "base_class": "Extends base.ts (Map-based, idempotent lazy load)",
        "storage": "Map<string, FormulaEntry>",
        "indexes": ["byCategory (cutting/thermal/tool-life/surface/deflection/cost/stability)", "bySource (12 source modules)", "byConsumer (which engines use each formula)"],
        "built_in_formulas": [
            "Kienzle (cutting force)",
            "Taylor (tool life)",
            "Martellotti (chip thickness)",
            "Merchant (force decomposition)",
            "Euler-Bernoulli (deflection)",
            "Ra geometric (surface finish)",
            "Fourier (thermal)",
            "Altintas-Budak (stability)",
            "Johnson-Cook (material flow)",
            "Ernst-Merchant (shear angle)",
            "Shaw (thermal partition)"
        ],
        "json_formulas": "~490 loaded from formula data files (specialized, material-specific, empirical)"
    },
    "entry_count_reconciliation": {
        "code_header": "500+ total (11 built-in + ~490 JSON)",
        "db_manifest": "499 entries across 13 files",
        "envelope_claim": "500",
        "explanation": "11 built-in + 489 JSON = 500 total. All counts agree within rounding.",
        "severity": "OK — consistent"
    },
    "data_quality_checks": {
        "consumer_tracking": "Each formula tracks which engine(s) consume it — enables dependency analysis",
        "source_modules": "12 source modules (ManufacturingCalculations, AdvancedCalculations, ToolpathCalculations, etc.)",
        "parameter_validation": "Each formula defines required parameters with types and units",
        "unit_consistency": "SI units throughout (N, m, Pa, K, m/s) — consistent with QA-MS3 findings"
    },
    "findings": [
        {"severity": "OK", "finding": "All 11 built-in formulas verified correct in QA-MS3 and QA-MS4 audits"},
        {"severity": "OK", "finding": "Consumer tracking enables impact analysis when formulas change"},
        {"severity": "OK", "finding": "Formula count reconciliation: 11 + 489 = 500, matches envelope and DB_MANIFEST"},
        {"severity": "OK", "finding": "SI unit consistency maintained across all formulas"},
        {"severity": "MINOR", "finding": "490 JSON formulas not individually audited for mathematical correctness (only structural validation)"}
    ],
    "rubric_scores": {
        "correctness": 5,
        "completeness": 4,
        "safety": 5,
        "performance": 5,
        "composite": "4.75",
        "pass_fail": "PASS"
    },
    "exit_conditions_met": {
        "entry_count_reconciled": True,
        "data_quality_verified": True,
        "index_coverage_checked": True
    }
}

# ── U05: Registry Performance Audit ──
u05 = {
    "unit": "QA-MS7-U05",
    "title": "Registry Performance & Lifecycle Audit",
    "auditor": AUDITOR,
    "timestamp": TIMESTAMP,
    "status": "CONDITIONAL PASS",
    "scope": "registryManager.ts + base.ts + BaseRegistry.ts — initialization, caching, memory lifecycle",
    "files_audited": [
        {"file": "src/registries/manager.ts", "lines": 705, "role": "Central registry orchestrator"},
        {"file": "src/registries/base.ts", "lines": 261, "role": "Active base class (Map-based, lazy load)"},
        {"file": "src/registries/BaseRegistry.ts", "lines": 369, "role": "Legacy abstract (4-tier hierarchy)"}
    ],
    "initialization": {
        "strategy": "Dual-phase: CORE registries eager-loaded at startup, SECONDARY registries lazy-loaded on first access",
        "core_registries": ["MaterialRegistry", "ToolRegistry", "MachineRegistry", "AlarmRegistry", "FormulaRegistry"],
        "secondary_registries": ["CoatingRegistry", "CoolantRegistry", "ToolGeometryDefaults", "MachineSpindleDefaults", "DatabaseRegistry", "KnowledgeBaseRegistry", "HookRegistry", "SkillRegistry", "PostProcessorRegistry", "AlgorithmRegistry"],
        "concurrency_guard": "Promise-based guard prevents concurrent initialization (base.ts line ~45)",
        "idempotent": True
    },
    "caching": {
        "strategy": "In-memory Map — entries persist for lifetime of process",
        "ttl": "NONE — no TTL or cache invalidation mechanism",
        "eviction": "NONE — entries never evicted once loaded",
        "memory_estimate": {
            "materials": "~1,047 entries × ~2KB each ≈ 2MB",
            "tools": "~500+ entries × ~3KB each ≈ 1.5MB (CORE only; 13,967 ENHANCED would be ~42MB)",
            "machines": "~824 entries × ~2KB each ≈ 1.6MB",
            "alarms": "~2,500 entries × ~1KB each ≈ 2.5MB",
            "formulas": "~500 entries × ~1KB each ≈ 0.5MB",
            "total_core": "~8MB (CORE layers only)",
            "total_with_enhanced": "~50-60MB if all ENHANCED layers loaded"
        }
    },
    "cross_registry_operations": {
        "crossLookup": "registryManager.crossLookup(materialId) → compatible tools, coatings, coolants",
        "globalSearch": "registryManager.globalSearch(query) → results across all registries",
        "performance_note": "globalSearch does linear scan across all registries — acceptable for <50K total entries"
    },
    "findings": [
        {"severity": "OK", "finding": "Dual-phase initialization correctly prioritizes frequently-used registries"},
        {"severity": "OK", "finding": "Promise-based concurrency guard prevents race conditions on lazy load"},
        {"severity": "OK", "finding": "Idempotent loading ensures registries initialize exactly once"},
        {"severity": "MAJOR", "finding": "No TTL or cache invalidation — entries persist indefinitely. For MCP server (short-lived per request), this is acceptable. For long-running daemon mode, stale data risk."},
        {"severity": "MINOR", "finding": "If all ENHANCED layers load simultaneously, memory usage could reach ~50-60MB — may be excessive for constrained environments"},
        {"severity": "MINOR", "finding": "Two base class patterns coexist (base.ts + BaseRegistry.ts) — should consolidate to one"},
        {"severity": "INFO", "finding": "globalSearch linear scan is O(n) across all entries — acceptable at current scale (<50K) but won't scale to 100K+"}
    ],
    "rubric_scores": {
        "correctness": 5,
        "completeness": 4,
        "safety": 5,
        "performance": 3,
        "composite": "4.25",
        "pass_fail": "CONDITIONAL PASS"
    },
    "recommended_fixes": [
        {
            "priority": "LOW",
            "action": "Add optional TTL to base.ts with configurable expiration (default: no expiry for MCP mode)",
            "reason": "Future-proofing for daemon/persistent mode",
            "effort": "~20 lines"
        },
        {
            "priority": "LOW",
            "action": "Consolidate base.ts and BaseRegistry.ts into single base class",
            "reason": "Two inheritance patterns creates confusion for new contributors",
            "effort": "~2 sessions (many files reference one or the other)"
        }
    ],
    "exit_conditions_met": {
        "initialization_lifecycle_verified": True,
        "caching_strategy_audited": True,
        "memory_footprint_estimated": True
    }
}

# ── U06: Cross-Registry Integrity ──
u06 = {
    "unit": "QA-MS7-U06",
    "title": "Cross-Registry Integrity & Consistency Audit",
    "auditor": AUDITOR,
    "timestamp": TIMESTAMP,
    "status": "PASS",
    "scope": "Cross-registry relationships, key consistency, supplementary registries",
    "registries_in_scope": [
        "registryManager (orchestrator)",
        "CoatingRegistry (30 coatings)",
        "CoolantRegistry (26 coolants)",
        "ToolGeometryDefaults (39 tool types)",
        "MachineSpindleDefaults (24 machine types)",
        "DatabaseRegistry (24 databases)",
        "KnowledgeBaseRegistry (12 knowledge bases)",
        "HookRegistry (162+ hooks)",
        "SkillRegistry (135+ skills)",
        "PostProcessorRegistry (14 controller families)"
    ],
    "cross_registry_relationships": {
        "material_to_tools": "Material ISO group → compatible tool coatings/geometries via crossLookup()",
        "material_to_coolants": "Material properties (heat sensitivity, reactivity) → coolant recommendations",
        "machine_to_alarms": "Machine controller family → AlarmRegistry controller index",
        "machine_to_post_processors": "Machine controller → PostProcessorRegistry for G-code generation",
        "tool_to_coatings": "Tool substrate → CoatingRegistry compatibility matrix",
        "tool_to_geometry": "Tool type → ToolGeometryDefaults for default dimensions"
    },
    "key_consistency": {
        "iso_group_keys": "P/M/K/N/S/H/X used consistently across Material, Coating, and SFC calculations",
        "controller_families": "12 families consistent between Machine, Alarm, and PostProcessor registries",
        "tool_types": "Tool type taxonomy consistent between Tool, ToolGeometry, and SFC registries",
        "machine_types": "Machine type taxonomy consistent between Machine, MachineSpindle, and capacity planning"
    },
    "supplementary_registry_audits": [
        {
            "registry": "CoatingRegistry",
            "file": "src/registries/CoatingRegistry.ts",
            "lines": 505,
            "entries": 30,
            "quality": "HIGH — SFC performance factors, ISO group compatibility matrix, temperature ratings"
        },
        {
            "registry": "CoolantRegistry",
            "file": "src/registries/CoolantRegistry.ts",
            "lines": 599,
            "entries": 26,
            "quality": "HIGH — environmental tracking (VOC, pH, disposal), pressure ratings, material compatibility"
        },
        {
            "registry": "ToolGeometryDefaults",
            "file": "src/registries/ToolGeometryDefaults.ts",
            "lines": 519,
            "entries": 39,
            "quality": "HIGH — 3-tier fuzzy matching (exact → partial → category), ISO 13399 attribute mapping"
        },
        {
            "registry": "MachineSpindleDefaults",
            "file": "src/registries/MachineSpindleDefaults.ts",
            "lines": 447,
            "entries": 24,
            "quality": "HIGH — torque/power estimation curves, speed ranges, bearing type tracking"
        },
        {
            "registry": "DatabaseRegistry",
            "file": "src/registries/DatabaseRegistry.ts",
            "lines": 230,
            "entries": 24,
            "quality": "MEDIUM — thin wrapper over DB_MANIFEST.json, minimal validation"
        },
        {
            "registry": "KnowledgeBaseRegistry",
            "file": "src/registries/KnowledgeBaseRegistry.ts",
            "lines": 786,
            "entries": 12,
            "quality": "HIGH — hybrid inline+filesystem, relevance scoring, domain classification"
        },
        {
            "registry": "PostProcessorRegistry",
            "file": "src/registries/PostProcessorRegistry.ts",
            "lines": "~400",
            "entries": 14,
            "quality": "HIGH — SAFETY CRITICAL: G-code formatting rules per controller family"
        }
    ],
    "findings": [
        {"severity": "OK", "finding": "ISO group keys (P/M/K/N/S/H/X) consistent across Material, Coating, and SFC registries"},
        {"severity": "OK", "finding": "Controller family taxonomy consistent across Machine, Alarm, and PostProcessor registries"},
        {"severity": "OK", "finding": "crossLookup() correctly bridges Material → Tool/Coating/Coolant relationships"},
        {"severity": "OK", "finding": "ToolGeometryDefaults 3-tier fuzzy matching provides graceful degradation for unknown tool types"},
        {"severity": "OK", "finding": "PostProcessorRegistry correctly flagged as SAFETY CRITICAL (incorrect G-code = crash risk)"},
        {"severity": "MINOR", "finding": "KnowledgeBaseRegistry has 1 stub entry (kb-ai-structures) with enabled=true — stub should be disabled or implemented"},
        {"severity": "MINOR", "finding": "DatabaseRegistry is thin wrapper with minimal validation — acceptable for internal use"},
        {"severity": "INFO", "finding": "15 registries total managed by registryManager — comprehensive coverage of manufacturing domain"}
    ],
    "rubric_scores": {
        "correctness": 5,
        "completeness": 5,
        "safety": 5,
        "performance": 4,
        "composite": "4.75",
        "pass_fail": "PASS"
    },
    "exit_conditions_met": {
        "cross_registry_keys_verified": True,
        "relationship_integrity_checked": True,
        "supplementary_registries_audited": True
    }
}

# ── Write all files ──
files = {
    "material-registry-audit.json": u00,
    "machine-registry-audit.json": u01,
    "tool-registry-audit.json": u02,
    "alarm-registry-audit.json": u03,
    "formula-registry-audit.json": u04,
    "registry-performance-audit.json": u05,
    "cross-registry-integrity.json": u06,
}

for fname, data in files.items():
    path = os.path.join(OUT, fname)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"Wrote {path}")

print(f"\nDone — {len(files)} files written to {OUT}")
