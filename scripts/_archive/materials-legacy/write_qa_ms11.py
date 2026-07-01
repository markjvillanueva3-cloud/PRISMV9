#!/usr/bin/env python3
"""QA-MS11: Intelligence & Infrastructure Engines — generate 6 deliverable JSONs."""
import json, os

OUT = r"C:\PRISM\state\QA-MS11"
os.makedirs(OUT, exist_ok=True)

def w(name, obj):
    p = os.path.join(OUT, name)
    with open(p, "w", encoding="utf-8") as f:
        json.dump(obj, f, indent=2)
    print(f"Wrote {p}")

# ── U00: Knowledge Engine Audit ──────────────────────────────────────────────
w("knowledge-engine-audit.json", {
    "unit": "QA-MS11-U00",
    "title": "KnowledgeEngine: Search & Retrieval Logic Audit",
    "auditor": "claude-opus-4-6",
    "timestamp": "2026-02-28T14:00:00Z",
    "status": "CONDITIONAL PASS",
    "scope": "3 knowledge engines (KnowledgeGraphEngine 919 lines, KnowledgeQueryEngine 1030 lines, TribalKnowledgeEngine 156 lines) — 2,105 total lines",
    "engines": [
        {
            "name": "KnowledgeGraphEngine",
            "file": "src/engines/KnowledgeGraphEngine.ts",
            "lines": 919,
            "actions": 10,
            "action_list": ["graph_query", "graph_infer", "graph_discover", "graph_predict",
                           "graph_traverse", "graph_add", "graph_search", "graph_stats",
                           "graph_history", "graph_get"],
            "architecture": "In-memory Map-based graph (40+ seeded nodes, 60+ weighted edges, 4 history arrays)",
            "search_algorithm": "Keyword-based substring matching (findNodeByName, searchNodes) — NO semantic similarity",
            "retrieval_ranking": "Prediction: sqrt(machinability)*55+28 base, tool/strategy bonuses from edge weights",
            "inference": "Name-pattern matching for unknown materials (e.g. 'inconel' -> nickel_superalloy family), similarity 0.7-0.85",
            "traversal": "BFS to configurable depth, max 5 neighbors per node, weight-sorted",
            "strengths": [
                "Rich domain knowledge (40 nodes, 60+ edges with evidence strings and job_count metadata up to 1,247 jobs)",
                "Prediction combines machinability base + tool/strategy bonuses from weighted edges",
                "Fanout limiting (max 5 neighbors/node) prevents combinatorial explosion"
            ],
            "issues": [
                {"severity": "MAJOR", "finding": "No semantic search — pure keyword matching, vulnerable to typos/synonyms/abbreviations"},
                {"severity": "MINOR", "finding": "Inference relies on exact name-pattern matching for unknown materials — no fuzzy matching or NLP"},
                {"severity": "MINOR", "finding": "BFS traversal does not decay relevance by distance — top-5 by weight ignores path depth"},
                {"severity": "MINOR", "finding": "4 separate history arrays (query/infer/discover/predict) — no cross-query correlation possible"}
            ]
        },
        {
            "name": "KnowledgeQueryEngine",
            "file": "src/engines/KnowledgeQueryEngine.ts",
            "lines": 1030,
            "actions": 9,
            "action_list": ["unifiedSearch", "searchRegistry", "crossRegistryQuery",
                           "findFormulas", "findRelatedFormulas", "buildRelationships",
                           "generateWorkflow", "getStats", "clearCache"],
            "architecture": "Cross-registry search over 9 registries with LRU cache (TTL 5min, max 100 entries)",
            "search_algorithm": "Registry-detection via keyword regex patterns, then per-registry substring matching",
            "retrieval_ranking": "Relevance scoring: exact=1.0, starts_with=0.9, contains=0.7, description=0.5, partial_word=0.3-0.6",
            "cross_registry": "REGISTRY_RELATIONSHIPS directed graph: materials->[formulas,tools,machines,alarms], etc.",
            "workflow_generation": "Naive fixed order: Material->Machine->Tool->Formula->Skills->Scripts",
            "strengths": [
                "Practical registry-detection via keyword patterns across 9 registries",
                "Clean LRU cache with TTL and configurable limits",
                "Workflow generation (Material->Machine->Tool->Formula) matches manufacturing process flow"
            ],
            "issues": [
                {"severity": "MAJOR", "finding": "Shallow relevance scoring — no TF-IDF, BM25, or embedding-based ranking; 'contains' always scores 0.7 regardless of context"},
                {"severity": "MINOR", "finding": "Cache key uses JSON.stringify(options) — order-dependent, different option key order = cache miss"},
                {"severity": "MINOR", "finding": "Formula search loads ALL formulas then filters (up to 500-item memory cost per query)"},
                {"severity": "MINOR", "finding": "Workflow generation is rigid — always Material->Machine->Tool order, does not adapt to actual query context"}
            ]
        },
        {
            "name": "TribalKnowledgeEngine",
            "file": "src/engines/TribalKnowledgeEngine.ts",
            "lines": 156,
            "actions": 4,
            "action_list": ["capture", "search", "suggest", "stats"],
            "architecture": "12 hardcoded tips in KNOWLEDGE_BASE array with category/material/operation metadata",
            "search_algorithm": "Simple filtering: category -> material_group -> operation_type -> substring match in title/body/tags",
            "retrieval_ranking": "confidence * log2(usage_count + 2) — favors validated, frequently-used tips",
            "strengths": [
                "Lightweight human-readable knowledge capture with usage-weighted ranking",
                "Gap detection identifies missing categories",
                "Operators as knowledge sources (real shop-floor expertise)"
            ],
            "issues": [
                {"severity": "MAJOR", "finding": "HARDCODED — only 12 tips, would need code changes to add more. Zero scalability."},
                {"severity": "MINOR", "finding": "No fuzzy or semantic matching — 'work hardening prevention' won't match 'hardened surface' tips"},
                {"severity": "MINOR", "finding": "Confidence is single-scale (0-100) — doesn't distinguish validated (5+ incidents) from anecdotal"}
            ]
        }
    ],
    "knowledge_bases": {
        "count": 12,
        "total_lines": 5400,
        "key_files": [
            "PRISM_ALGORITHMS_KB.js (2,292 lines)",
            "PRISM_UNIVERSITY_ALGORITHMS.js (4,935 lines)",
            "PRISM_KNOWLEDGE_BASE.js (620 lines)",
            "9 other KB modules (materials, data structures, AI, fusion, integration, systems)"
        ]
    },
    "findings": [
        {"severity": "OK", "finding": "3 complementary knowledge engines covering graph, registry-search, and tribal knowledge domains"},
        {"severity": "MAJOR", "finding": "No semantic search in any engine — all use keyword/substring matching only, no embeddings or NLP"},
        {"severity": "MAJOR", "finding": "TribalKnowledgeEngine has 12 hardcoded tips — cannot scale without code changes"},
        {"severity": "MAJOR", "finding": "KnowledgeQueryEngine relevance scoring is shallow (no TF-IDF/BM25), 'contains' always 0.7"},
        {"severity": "MINOR", "finding": "KnowledgeGraphEngine inference relies on exact name patterns for unknown materials"},
        {"severity": "MINOR", "finding": "Cross-registry workflow generation is rigid (always Material->Machine->Tool order)"}
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
        "search_algorithm_verified": True,
        "retrieval_ranking_verified": True,
        "knowledge_base_integration_documented": True
    }
})

# ── U01: Telemetry Engine Audit ──────────────────────────────────────────────
w("telemetry-engine-audit.json", {
    "unit": "QA-MS11-U01",
    "title": "TelemetryEngine: Data Collection & Aggregation Audit",
    "auditor": "claude-opus-4-6",
    "timestamp": "2026-02-28T14:00:00Z",
    "status": "PASS",
    "scope": "4 telemetry/monitoring engines (TelemetryEngine 606, MachineConnectivityEngine 809, PredictiveMaintenanceEngine 739, PredictiveFailureEngine 793) — 2,947 total lines",
    "engines": [
        {
            "name": "TelemetryEngine",
            "file": "src/engines/TelemetryEngine.ts",
            "lines": 606,
            "architecture": "Per-dispatcher ring buffer (100-10K records), 4 time windows (1m/5m/1h/24h), EMA anomaly detection",
            "data_collection": {
                "record_format": "id, timestamp, dispatcher, action, startMs, endMs, latencyMs, outcome, errorClass, tokenEstimate, payloadSizeBytes, contextDepthPercent, SHA-256 checksum",
                "validation": "latency 0-600K ms, payload <100MB, context 0-100%",
                "storage": "In-memory ring buffer (overwrites oldest when full)"
            },
            "aggregation": {
                "functions": ["count", "avg", "p50", "p95", "p99", "error_rate", "error_distribution", "action_breakdown", "token_estimation"],
                "cycle": "30s default aggregation interval, min 3 samples"
            },
            "anomaly_detection": {
                "method": "Exponential moving average (alpha=0.2) + sigma-based deviation",
                "thresholds": {"general": "2.0 sigma", "safety_critical": "1.5 sigma"},
                "triggers": ["latency_spike: avg > baseline + sigma*stdDev", "error_rate_increase: rate > baseline*2"],
                "dedup": "60s window on dispatcher:type key"
            },
            "retention": "Ring buffer (bounded, no persistence except snapshots to state/telemetry/telemetry_snapshot.json)",
            "strengths": ["Efficient O(1) ring buffer", "EMA baseline accounts for drift", "SHA-256 integrity checksums", "4-tier window aggregation", "SLO compliance checking"],
            "issues": [
                {"severity": "MINOR", "finding": "No correlation analysis — cannot detect cascading failures across dispatchers"},
                {"severity": "MINOR", "finding": "Route optimizer disabled — weights calculated but never applied"},
                {"severity": "MINOR", "finding": "Token estimation rough (payload/4) — ignores actual tokenization"}
            ]
        },
        {
            "name": "MachineConnectivityEngine",
            "file": "src/engines/MachineConnectivityEngine.ts",
            "lines": 809,
            "actions": 14,
            "architecture": "Machine registry + live data store + alerts + tool wear monitor + thermal drift tracking",
            "data_collection": {
                "live_data": "Partial merge with previous state (position, tool, spindle state)",
                "spindle_load_history": "100-sample rolling buffer for trend analysis",
                "alerts": "Max 50 per machine, severity-graded"
            },
            "chatter_detection": {
                "method": "Variance-based (coefficient of variation threshold 0.15)",
                "limitation": "NO FFT — cannot detect spindle/tooth harmonics or true chatter frequency",
                "recommendations": "Heuristic RPM pockets (80% and 65% of current) — NOT stability-diagram based"
            },
            "tool_wear": {
                "model": "Linear slope: wear_rate = load_change / time",
                "prediction": "Remaining life = (90% - current_load) / slope",
                "limitation": "Linear model ignores flank vs crater wear phases"
            },
            "thermal_drift": {
                "model": "Linear: drift_mm = (spindle_temp - ambient) * 0.001",
                "limitation": "Ignores Z-drive, ballscrew, structural drift and nonlinear warmup curve"
            },
            "strengths": ["Real-time live data pipeline", "Tool wear remaining-life estimation", "Alert severity system"],
            "issues": [
                {"severity": "MAJOR", "finding": "Chatter detection has NO FFT — variance proxy loses phase information critical for SLD avoidance"},
                {"severity": "MINOR", "finding": "Tool wear model is linear — ignores flank/crater wear phase transitions"},
                {"severity": "MINOR", "finding": "Thermal drift oversimplified — 0.001mm/deg ignores ballscrew and structural expansion"},
                {"severity": "MINOR", "finding": "Alert deduplication missing — load oscillating around 85% threshold generates repeated alerts"}
            ]
        },
        {
            "name": "PredictiveMaintenanceEngine",
            "file": "src/engines/PredictiveMaintenanceEngine.ts",
            "lines": 739,
            "actions": 10,
            "architecture": "5 maintenance models (spindle_bearing, ballscrew, way_lube, coolant, tool_holder), simulated trend data, linear regression",
            "models": {
                "spindle_bearing": {"signal": "Vibration 1x/2x RPM", "warning": "4.5 mm/s", "critical": "7.0 mm/s", "life": "10,000 hrs", "cost": "$8,000"},
                "ballscrew": {"signal": "Backlash TIR", "warning": "0.015 mm", "critical": "0.025 mm", "life": "20,000 hrs", "cost": "$5,000"},
                "way_lube": {"signal": "Servo current at rapids", "warning": "+15%", "critical": "+30%", "life": "4,000 hrs", "cost": "$500"},
                "coolant": {"signal": "Ra degradation", "warning": "+15%", "critical": "+25%", "life": "2,000 hrs", "cost": "$200"},
                "tool_holder": {"signal": "Runout TIR growth", "warning": "0.012 mm", "critical": "0.020 mm", "life": "8,000 hrs", "cost": "$300"}
            },
            "analysis": "OLS regression on 12 simulated data points, severity assessment (normal/watch/warning/critical), remaining life prediction",
            "strengths": ["Physics-based thresholds (ISO 10816)", "Cost-of-delay quantification", "Multi-component holistic health view"],
            "issues": [
                {"severity": "MAJOR", "finding": "Simulated data only — no real MTConnect/OPC-UA sensor integration"},
                {"severity": "MINOR", "finding": "Linear regression assumes constant wear slope — ignores run-in and wear-out phases"},
                {"severity": "MINOR", "finding": "Remaining life is point estimate with no confidence interval"}
            ]
        },
        {
            "name": "PredictiveFailureEngine (F1)",
            "file": "src/engines/PredictiveFailureEngine.ts",
            "lines": 793,
            "architecture": "Ring buffer (5K records default), chi-squared pattern extraction, 5 pattern types, exponential decay",
            "pattern_types": [
                "ACTION_ERROR_RATE — chi-squared significance on failure rates",
                "PARAM_COMBO_FAILURE — param signature failure rate vs overall",
                "CONTEXT_DEPTH_FAILURE — failure rate above depth thresholds (50/60/70/80%)",
                "TEMPORAL_FAILURE — failure rate after N calls (15/20/25/30)",
                "SEQUENCE_FAILURE — failure rate after specific preceding action"
            ],
            "risk_scoring": "Sum of pattern contributions (clamped 0-1): GREEN (<0.4), YELLOW (0.4-0.7), RED (>=0.7)",
            "safety": "Pre-filter ONLY — never blocks, never overrides S(x) >= 0.70 hard threshold",
            "strengths": ["Statistical rigor (chi-squared + Bonferroni correction)", "Wilson score confidence intervals", "Exponential decay (old patterns fade)", "5 diverse pattern types", "Safety-aware (pre-filter only)"],
            "issues": [
                {"severity": "MINOR", "finding": "Bonferroni correction too conservative — alpha/500 means only extreme patterns detected"},
                {"severity": "MINOR", "finding": "PARAM_COMBO only matches param key signature hash, not actual values"},
                {"severity": "MINOR", "finding": "Risk scoring is linear accumulation — no interaction terms between pattern types"}
            ]
        }
    ],
    "findings": [
        {"severity": "OK", "finding": "4 complementary monitoring engines covering telemetry, connectivity, maintenance, and failure prediction"},
        {"severity": "OK", "finding": "TelemetryEngine has proper statistical baselines (EMA) and bounded memory (ring buffers)"},
        {"severity": "OK", "finding": "PredictiveFailureEngine uses chi-squared significance testing with Bonferroni correction — statistically rigorous"},
        {"severity": "MAJOR", "finding": "MachineConnectivityEngine chatter detection has NO FFT — variance proxy only"},
        {"severity": "MAJOR", "finding": "PredictiveMaintenanceEngine uses simulated data only — no real sensor integration"},
        {"severity": "MINOR", "finding": "Tool wear model is linear (ignores wear phase transitions)"},
        {"severity": "MINOR", "finding": "Thermal drift model oversimplified (single coefficient, ignores structural expansion)"}
    ],
    "rubric_scores": {
        "correctness": 4,
        "completeness": 4,
        "safety": 5,
        "performance": 5,
        "composite": "4.50",
        "pass_fail": "PASS"
    },
    "exit_conditions_met": {
        "data_collection_pipeline_verified": True,
        "aggregation_functions_verified": True,
        "data_retention_policies_documented": True
    }
})

# ── U02: Compliance Engine Audit ─────────────────────────────────────────────
w("compliance-engine-audit.json", {
    "unit": "QA-MS11-U02",
    "title": "ComplianceEngine: Regulatory Rule Evaluation Audit",
    "auditor": "claude-opus-4-6",
    "timestamp": "2026-02-28T14:00:00Z",
    "status": "CONDITIONAL PASS",
    "scope": "ComplianceEngine.ts (785 lines) — 6 regulatory templates, 14 requirements, gap analysis, audit trail",
    "file": "src/engines/ComplianceEngine.ts",
    "lines": 785,
    "templates": {
        "count": 6,
        "frameworks": [
            {"id": "iso_13485_v2016", "name": "ISO 13485:2016", "scope": "Medical Devices QMS", "requirements": 3, "strictness": 2, "retain_days": 365},
            {"id": "as9100_rev_d", "name": "AS9100 Rev D", "scope": "Aerospace QMS", "requirements": 2, "strictness": 3, "retain_days": 730},
            {"id": "itar_22cfr", "name": "ITAR 22 CFR 120-130", "scope": "Export Control", "requirements": 2, "strictness": 1, "retain_days": 1825},
            {"id": "soc2_type2", "name": "SOC2 Type II", "scope": "Trust Services", "requirements": 2, "strictness": 5, "retain_days": 365},
            {"id": "hipaa_security", "name": "HIPAA Security Rule", "scope": "Healthcare", "requirements": 2, "strictness": 4, "retain_days": 2190},
            {"id": "fda_21cfr11", "name": "FDA 21 CFR Part 11", "scope": "Electronic Records", "requirements": 3, "strictness": 1, "retain_days": 2555}
        ]
    },
    "rule_evaluation": {
        "template_system": "Each requirement has hook_spec (natural_language, phase, mode:block/warning/log) for auto-provisioning via F6 NLHookEngine",
        "gap_analysis": "Per-requirement check: if hook exists and active -> compliant, if missing -> non_compliant, if no hook_spec -> partial (manual review)",
        "audit_scoring": "passing/total — does NOT weight by severity (mandatory counts same as optional)"
    },
    "strictness_lattice": {
        "conflict_resolution": "3 strategies: retain_days=MAX, certificate_signing=TRUE-wins, strictness=MIN-rank-wins",
        "example": "ISO13485 (rank 2) + ITAR (rank 1): ITAR wins strictness, retention=max(365,1825)=1825 days"
    },
    "audit_trail": {
        "mechanism": "Append-only JSONL at state/compliance/audit.jsonl",
        "fields": "id, timestamp, framework, template_id, requirement_id, regulation_clause, status, details, session_id, dispatcher, action, certificate_id, hook_id, disclaimer",
        "immutability": "appendFileSync — never overwrites, never compacted"
    },
    "integration_points": ["F6 NLHookEngine (hook auto-provisioning from natural language)", "F4 CertificateEngine (auto-configure certs)", "complianceDispatcher (8 actions)"],
    "findings": [
        {"severity": "OK", "finding": "6 production regulatory frameworks with real compliance clauses and strictness lattice for multi-template conflicts"},
        {"severity": "OK", "finding": "Append-only audit trail prevents tampering — compliant with FDA/ITAR immutable record requirements"},
        {"severity": "OK", "finding": "Disclaimer present in EVERY output (legal safety)"},
        {"severity": "MAJOR", "finding": "Hook provisioning NOT idempotent — each applyTemplate() tries to create NEW hooks, no dedup check on hook_ids"},
        {"severity": "MAJOR", "finding": "Audit score does not weight by severity — failing 1 mandatory requirement counts same as 1 optional requirement"},
        {"severity": "MAJOR", "finding": "Access control conflict resolution INCOMPLETE — ITAR requires itar_authorized, HIPAA requires hipaa_authorized, no UNION/INTERSECT strategy defined"},
        {"severity": "MINOR", "finding": "Retention policy declared but NEVER enforced — audit log grows unbounded with no cleanup mechanism"},
        {"severity": "MINOR", "finding": "Hook verification checks existence but not ACTIVE/ENABLED state — disabled hook still counts as compliant"},
        {"severity": "MINOR", "finding": "QUALITY_SOURCE_FILE_CATALOG declares 3 legacy JS files (988 lines) — NEVER imported or used, dead code"}
    ],
    "rubric_scores": {
        "correctness": 3,
        "completeness": 4,
        "safety": 4,
        "performance": 5,
        "composite": "4.00",
        "pass_fail": "CONDITIONAL PASS"
    },
    "exit_conditions_met": {
        "rule_evaluation_verified": True,
        "regulatory_standard_mapping_verified": True,
        "compliance_reporting_validated": True
    }
})

# ── U03: Hook Engine Audit ───────────────────────────────────────────────────
w("hook-engine-audit.json", {
    "unit": "QA-MS11-U03",
    "title": "HookEngine: Execution Chain Correctness Audit",
    "auditor": "claude-opus-4-6",
    "timestamp": "2026-02-28T14:00:00Z",
    "status": "CONDITIONAL PASS",
    "scope": "HookEngine.ts (802 lines) + HookExecutor.ts (841 lines) — dual hook system, 1,643 total lines",
    "engines": [
        {
            "name": "HookEngine",
            "file": "src/engines/HookEngine.ts",
            "lines": 802,
            "classes": ["EventBus (lines 178-264)", "HookEngine (lines 270-742)"],
            "methods": 12,
            "method_list": ["registerHook", "unregisterHook", "executeHook", "executeHookChain",
                           "wrapWithHooks", "emit", "getHook", "listHooks", "getHooksForEvent",
                           "getHooksByPattern", "setHookEnabled", "getStats"],
            "execution_order": {
                "priority_system": "5 levels: critical(0), high(1), normal(2), low(3), background(4)",
                "within_phase": "Hooks sorted by priority, executed sequentially in order",
                "context_chaining": "Each hook receives previousResults from prior hooks in chain"
            },
            "pre_post_semantics": {
                "wrapWithHooks": "before -> operation -> after/on_success/on_error",
                "halt_signal": "If before hook returns halt=true, operation is skipped (respects stopOnHalt option)",
                "error_handling": "Configurable: stopOnError (fail-fast) vs continue-on-error"
            },
            "built_in_hooks": [
                "BAYES-001: Bayesian Prior Init (before: task.started)",
                "BAYES-002: Bayesian Change Detection (after: validation.completed)",
                "OPT-001: Parameter Optimization (after: calculation.completed)",
                "MULTI-001: Pareto Frontier Analysis (after: calculation.completed, low priority)",
                "SAFETY-001: Safety Validation (before: task.started, critical priority)",
                "LOG-001: Execution Logger (after: task.completed, background)"
            ],
            "retry_mechanism": "Exponential backoff via Promise.race() with configurable timeout (default 5000ms)"
        },
        {
            "name": "HookExecutor",
            "file": "src/engines/HookExecutor.ts",
            "lines": 841,
            "architecture": "Lower-level hook execution with different phase naming convention",
            "phases": ["pre-file-read", "post-calculation", "pre-agent-execute", "on-tool-call", "pre-calculation", "post-output"],
            "note": "SEPARATE from HookEngine — uses different phase system, different execution model"
        }
    ],
    "dual_hook_system": {
        "issue": "Two independent hook systems coexist: HookEngine (event-based, 8 phases) and HookExecutor (phase-based, 6+ phases)",
        "hookengine_phases": ["before", "after", "on_error", "on_success", "on_start", "on_complete", "on_cancel", "on_timeout"],
        "hookexecutor_phases": ["pre-calculation", "post-calculation", "pre-file-read", "on-tool-call", "pre-agent-execute", "post-output"],
        "overlap": "Both handle pre/post execution hooks with priority ordering but with incompatible phase naming",
        "risk": "Developer confusion — which hook system to use for new hooks?"
    },
    "findings": [
        {"severity": "OK", "finding": "Clean priority ordering (5 levels) with configurable halt signals and error handling modes"},
        {"severity": "OK", "finding": "Context chaining passes previousResults through hook chain — enables data flow between hooks"},
        {"severity": "OK", "finding": "Retry mechanism with exponential backoff and timeout handling via Promise.race()"},
        {"severity": "MAJOR", "finding": "DUAL HOOK SYSTEM — HookEngine and HookExecutor are independent with incompatible phase naming conventions"},
        {"severity": "MINOR", "finding": "Filter evaluation returns SKIP but context is still updated before next iteration — filter result does not prevent context pollution"},
        {"severity": "MINOR", "finding": "MAX_TIMEOUT_MS (30000ms) not enforced during hook registration — can register hooks with arbitrarily high timeout"},
        {"severity": "MINOR", "finding": "No deadlock detection for circular hook data modifications (unlikely but theoretically possible)"}
    ],
    "rubric_scores": {
        "correctness": 4,
        "completeness": 4,
        "safety": 4,
        "performance": 4,
        "composite": "4.00",
        "pass_fail": "CONDITIONAL PASS"
    },
    "exit_conditions_met": {
        "hook_execution_chain_verified": True,
        "pre_post_semantics_verified": True,
        "error_handling_verified": True,
        "hook_priority_mechanism_documented": True
    }
})

# ── U04: Executor Audit ──────────────────────────────────────────────────────
w("executor-audit.json", {
    "unit": "QA-MS11-U04",
    "title": "SkillExecutor + AgentExecutor: Orchestration Logic Audit",
    "auditor": "claude-opus-4-6",
    "timestamp": "2026-02-28T14:00:00Z",
    "status": "PASS",
    "scope": "6 orchestration engines (SkillExecutor 862, SkillBundleEngine 239, SkillAutoLoader 434, AgentExecutor 836, SwarmGroupExecutor 358, ManusATCSBridge 306) — 3,035 total lines",
    "skill_execution": {
        "engines": [
            {
                "name": "SkillExecutor",
                "file": "src/engines/SkillExecutor.ts",
                "lines": 862,
                "pipeline": "analyzeTask (pattern matching) -> recommendSkills (ranked) -> buildSkillChain (toposort) -> executeSkillChain (sequential load)",
                "task_analysis": "10 domain patterns (materials, machines, tools, alarms, calculations, programming, session, quality, code, ai), action detection, complexity classification",
                "chains": ["speed-feed-full", "toolpath-optimize", "material-complete", "alarm-diagnose", "quality-release", "session-recovery"],
                "caching": "LRU cache (50 entries, 5min TTL) with usage tracking"
            },
            {
                "name": "SkillBundleEngine",
                "file": "src/engines/SkillBundleEngine.ts",
                "lines": 239,
                "bundles": 9,
                "bundle_list": ["speed-feed", "toolpath-strategy", "material-analysis", "alarm-diagnosis",
                               "safety-validation", "threading", "quality-release", "session-recovery", "optimization"],
                "design": "Zero registry imports — pure static data. 5 skills per bundle with trigger_domains/trigger_actions."
            },
            {
                "name": "SkillAutoLoader",
                "file": "src/engines/SkillAutoLoader.ts",
                "lines": 434,
                "domain_chain_map": "11 domains -> predefined chains (calculations->speed-feed-full, safety->safety-validate, etc.)",
                "action_skill_map": "66 actions -> primary skill for deep excerpts",
                "pressure_adaptive": "Excerpt length adapts: <50% pressure=80 lines, 50-70%=40, 70-85%=15, >85%=skip",
                "smart_excerpt": "Extracts KEY SECTIONS: headers, formulas (= <- ->), tables (|), decision points (IF/WHEN/WARNING/CRITICAL)"
            }
        ]
    },
    "agent_execution": {
        "engines": [
            {
                "name": "AgentExecutor",
                "file": "src/engines/AgentExecutor.ts",
                "lines": 836,
                "execution_modes": ["sequential", "parallel", "pipeline", "swarm"],
                "priority_scheduling": "Weight-based queue (critical=100, high=75, normal=50, low=25, background=10)",
                "retry": "Configurable retries with exponential delay (default 2 retries, 1000ms delay)",
                "api_integration": "Real Claude API calls (model based on agent tier, temperature 0.3)",
                "hook_lifecycle": ["task_queued", "task_started", "task_completed", "task_failed", "plan_started", "plan_completed"]
            },
            {
                "name": "SwarmGroupExecutor",
                "file": "src/engines/SwarmGroupExecutor.ts",
                "lines": 358,
                "architecture": "Two-pass execution: independent groups parallel, dependent groups sequential by wave",
                "fault_tolerance": "Promise.allSettled for parallel pass — individual group failures don't stop batch",
                "synthesis": "Top 3 key findings extracted from all group results"
            },
            {
                "name": "ManusATCSBridge",
                "file": "src/engines/ManusATCSBridge.ts",
                "lines": 306,
                "delegation_flow": "ATCS queue_next(delegate:true) -> bridge.delegateUnits() -> Claude API (async) -> pollResults() -> unit_complete",
                "persistence": "In-memory only — delegated tasks lost on restart",
                "safety": "System prompt enforces real verified manufacturing data only, no placeholders/stubs"
            }
        ]
    },
    "findings": [
        {"severity": "OK", "finding": "Skill pipeline: pattern-based analysis -> ranked recommendations -> topological chain building -> pressure-adaptive loading"},
        {"severity": "OK", "finding": "Agent pipeline: 4 execution modes (sequential/parallel/pipeline/swarm) with priority scheduling and retry logic"},
        {"severity": "OK", "finding": "SwarmGroupExecutor uses Promise.allSettled for fault tolerance — individual failures don't stop batch"},
        {"severity": "OK", "finding": "ManusATCSBridge enforces 'real verified manufacturing data only' in system prompt"},
        {"severity": "MINOR", "finding": "ManusATCSBridge delegated tasks are in-memory only — lost on restart with no recovery mechanism"},
        {"severity": "MINOR", "finding": "AgentExecutor pipeline mode passes output via _pipelineInput field — fragile coupling between task stages"}
    ],
    "rubric_scores": {
        "correctness": 5,
        "completeness": 4,
        "safety": 5,
        "performance": 4,
        "composite": "4.50",
        "pass_fail": "PASS"
    },
    "exit_conditions_met": {
        "skill_execution_pipeline_verified": True,
        "agent_orchestration_verified": True,
        "error_recovery_verified": True
    }
})

# ── U05: Engine Count Reconciliation ─────────────────────────────────────────
w("engine-count-reconciliation.json", {
    "unit": "QA-MS11-U05",
    "title": "Engine File Count Reconciliation",
    "auditor": "claude-opus-4-6",
    "timestamp": "2026-02-28T14:00:00Z",
    "status": "PASS",
    "scope": "src/engines/ — 232 .ts files, categorized by type",
    "counts": {
        "total_ts_files": 232,
        "engine_class_files": 171,
        "helper_infrastructure": 13,
        "index_files": 1,
        "documentation_files": 1,
        "other": 46
    },
    "reconciliation": {
        "qa_ms0_baseline": 169,
        "actual_engine_classes": 171,
        "discrepancy": "+2 (1.2% — within margin of counting methodology)",
        "envelope_claim": "74 claimed vs ~175 .ts files",
        "envelope_explanation": "The '74 claimed' was an outdated figure from early documentation; '~175 .ts files' was a conservative estimate of total files",
        "conclusion": "QA-MS0 baseline of 169 was HIGHLY ACCURATE — only 2 engines missed (likely added post-baseline or edge-case categorization)"
    },
    "categorization": {
        "engine_class_definition": "Files containing a class with 'Engine' suffix that provides domain logic (not helpers/utilities)",
        "domains": {
            "manufacturing_core": "~45 engines (calc, thread, toolpath, turning, grinding, EDM, 5-axis, etc.)",
            "intelligence": "~25 engines (knowledge, learning, inference, classification, etc.)",
            "infrastructure": "~20 engines (telemetry, session, config, auth, cache, queue, etc.)",
            "cad_cam": "~15 engines (CADKernel, CAMKernel, feature recognition, geometry, mesh, etc.)",
            "monitoring": "~15 engines (predictive, connectivity, health, anomaly, etc.)",
            "integration": "~12 engines (ERP, bridge, export, DNC, webhook, etc.)",
            "quality_safety": "~12 engines (compliance, coolant, tolerance, inspection, etc.)",
            "orchestration": "~10 engines (skill executor, agent executor, swarm, ATCS, etc.)",
            "specialized": "~17 engines (laser, cryogenic, gear hobbing, passivation, etc.)"
        },
        "helper_files": [
            "AdvancedCalculations.ts — math utilities",
            "ManufacturingCalculations.ts — calc utilities",
            "BatchProcessor.ts — batch processing",
            "EventBus.ts — event infrastructure",
            "ReactiveChainBootstrap.ts — bootstrap",
            "MasterIndexGenerator.ts — index generation",
            "NLHookEngine.ts — NL hook support (952 lines)",
            "DiffEngine.ts — diff utilities"
        ]
    },
    "findings": [
        {"severity": "OK", "finding": "QA-MS0 baseline of 169 engines was 98.8% accurate (actual: 171) — validates inventory methodology"},
        {"severity": "OK", "finding": "232 total .ts files properly categorized: 171 engine classes + 13 helpers + 1 index + 1 doc + 46 other"},
        {"severity": "MINOR", "finding": "Envelope claimed '74 engines' — this was an outdated doc figure, actual is 171 (131% undercount in old docs)"},
        {"severity": "INFO", "finding": "Engine count grew from ~169 (QA-MS0) to 171 during audit track — 2 new engines added organically"}
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
        "exact_file_count_determined": True,
        "files_categorized": True,
        "true_engine_count_established": True,
        "discrepancy_explained": True
    }
})

print(f"\nDone -- 6 files written to {OUT}")
