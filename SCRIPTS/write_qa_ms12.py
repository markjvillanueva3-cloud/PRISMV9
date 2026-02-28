#!/usr/bin/env python3
"""QA-MS12: Hook System & Orchestration — generate 5 deliverable JSONs."""
import json, os

OUT = r"C:\PRISM\state\QA-MS12"
os.makedirs(OUT, exist_ok=True)

def w(name, obj):
    p = os.path.join(OUT, name)
    with open(p, "w", encoding="utf-8") as f:
        json.dump(obj, f, indent=2)
    print(f"Wrote {p}")

# ── U00: Hook Registration Audit ────────────────────────────────────────────
w("hook-registration-audit.json", {
    "unit": "QA-MS12-U00",
    "title": "Hook Registration System Inventory & Reconciliation",
    "auditor": "claude-opus-4-6",
    "timestamp": "2026-02-28T15:00:00Z",
    "status": "CONDITIONAL PASS",
    "scope": "All hook registration sources: hooks/ directory, HookEngine.ts Phase 0, HookExecutor.ts, autoHookWrapper cadences",
    "hook_counts": {
        "total_registered": 220,
        "domain_hooks": 179,
        "phase0_built_in": 41,
        "qa_ms0_baseline_claim": 157,
        "envelope_claim": 112,
        "discrepancy": "+63 above QA-MS0 baseline (179 domain + 41 Phase0 = 220 actual)"
    },
    "domain_hook_breakdown": {
        "EnforcementHooks": {"count": 17, "type": "Pre/post-action blocking", "priority": "critical"},
        "LifecycleHooks": {"count": 14, "type": "Session/checkpoint/pressure", "priority": "high"},
        "ManufacturingHooks": {"count": 9, "type": "Force/thermal/deflection/MRR", "priority": "normal"},
        "CognitiveHooks": {"count": 10, "type": "Bayesian/pattern/learning", "priority": "normal"},
        "ObservabilityHooks": {"count": 11, "type": "Performance/usage/audit", "priority": "low"},
        "AutomationHooks": {"count": 11, "type": "Index/cache/backup/sync", "priority": "low"},
        "CrossReferenceHooks": {"count": 12, "type": "Integrity/compatibility/batch", "priority": "high"},
        "AdvancedManufacturingHooks": {"count": 8, "type": "Chip/chatter/power/G-code", "priority": "normal"},
        "RecoveryHooks": {"count": 9, "type": "Circuit breaker/retry/rollback", "priority": "high"},
        "SchemaHooks": {"count": 7, "type": "Version/deprecation/migration", "priority": "normal"},
        "ControllerHooks": {"count": 5, "type": "FANUC/SIEMENS/HAAS specific", "priority": "normal"},
        "AgentHooks": {"count": 7, "type": "Tier selection/cost/escalation", "priority": "high"},
        "OrchestrationHooks": {"count": 7, "type": "Swarm/pipeline/consensus/ATCS", "priority": "high"},
        "SafetyQualityHooks": {"count": 20, "type": "Spindle/collision/workholding/SPC", "priority": "critical"},
        "CadenceDefinitions": {"count": 6, "type": "Daily/weekly/hourly/shift/monthly/quarterly", "priority": "low"},
        "SpecialtyManufacturingHooks": {"count": 20, "type": "Turning/5-axis/EDM/grinding", "priority": "normal"},
        "SpecialtyCadences": {"count": 6, "type": "M97-M102 automation cadences", "priority": "low"}
    },
    "phase0_hooks": {
        "count": 41,
        "categories": "CALC(12), FILE(8), STATE(6), AGENT(5), BATCH(6), FORMULA(4), plus INTEL, DISPATCH, ORCH, SESSION, CONTEXT, REFL",
        "blocking_hooks": ["CALC-SAFETY-VIOLATION-001 (HARD BLOCK)", "STATE-ANTI-REGRESSION-001 (HARD BLOCK)", "FILE-GCODE-VALIDATE-001 (HARD BLOCK)"]
    },
    "registration_mechanism": {
        "entry_point": "registerDomainHooks() called from index.ts line 314 at server startup",
        "loading": "allHooks array from hooks/index.ts -> hookExecutor.register(hook) for each",
        "guard": "Single-call registration flag prevents duplicate registration",
        "fallback": "Domain hooks also loaded from HOOK_REGISTRY.json — if file missing, domain hooks silently fail to load"
    },
    "hook_modes": {
        "blocking": "~7 hooks (enforcement, hard blocks — stops execution on failure)",
        "warning": "~80 hooks (validation with advisory — logs warning, continues)",
        "silent": "~130+ hooks (background telemetry — no output)"
    },
    "findings": [
        {"severity": "OK", "finding": "220 hooks registered across 17 categories covering enforcement, lifecycle, manufacturing, cognitive, observability, and more"},
        {"severity": "OK", "finding": "Phase 0 built-in hooks (41) include 3 HARD BLOCK hooks for safety/anti-regression/G-code validation"},
        {"severity": "MAJOR", "finding": "Hook count discrepancy: QA-MS0 claimed 157, envelope claimed 112, actual is 220 — inventory tracking severely outdated"},
        {"severity": "MAJOR", "finding": "Domain hooks loaded from HOOK_REGISTRY.json with silent failure — if file missing/corrupt, 179 domain hooks don't load"},
        {"severity": "MINOR", "finding": "index.ts header comment says '32 dispatchers' — actual is 45 (stale comment)"},
        {"severity": "MINOR", "finding": "No verification that TypeScript hook definitions match JSON registry contents"}
    ],
    "rubric_scores": {
        "correctness": 4,
        "completeness": 4,
        "safety": 4,
        "performance": 5,
        "composite": "4.25",
        "pass_fail": "CONDITIONAL PASS"
    },
    "exit_conditions_met": {
        "exact_hook_count_determined": True,
        "registered_vs_unregistered_identified": True,
        "hook_type_distribution_documented": True
    }
})

# ── U01: Auto-Hook Proxy Audit ──────────────────────────────────────────────
w("auto-hook-proxy-audit.json", {
    "unit": "QA-MS12-U01",
    "title": "Auto-Hook Proxy: Universal Hook Wrapping Verification",
    "auditor": "claude-opus-4-6",
    "timestamp": "2026-02-28T15:00:00Z",
    "status": "PASS",
    "scope": "autoHookWrapper.ts (~2600 lines) — universal dispatcher wrapping, 88 cadence functions, call counter",
    "file": "src/tools/autoHookWrapper.ts",
    "coverage": {
        "dispatchers_wrapped": 45,
        "dispatchers_total": 45,
        "coverage_pct": "100%",
        "mechanism": "Proxy applied at server.tool() registration time — ALL prism_* tools get wrapWithUniversalHooks()",
        "calc_extra_layer": "~22 calc tools get additional wrapToolWithAutoHooks() for Lambda/Phi safety validation"
    },
    "proxy_execution_phases": {
        "phase1_pre": ["Call counter increment (globalDispatchCount++)", "Session journal append", "Tool call recording for telemetry",
                       "Input validation", "Skill context matching", "Pattern pre-matching", "Cache lookup", "Pre-calc enrichment"],
        "phase2_execution": ["Handler invocation with error wrapping", "Computation cache update", "Error pattern detection (autoErrorLearn)",
                            "Memory graph capture (DISPATCH node)", "PFP outcome recording", "Phase event emission"],
        "phase3_post": ["Quality gate validation (autoQualityGate)", "Anti-regression check", "Decision logging",
                       "Performance tracking hook", "Telemetry snapshot", "Certificate validation", "Session metrics recording"],
        "phase4_cadence": ["Every 5 calls: autoTodoRefresh", "Every 10 calls: autoCheckpoint",
                          "Every 15+ calls: autoContextPressure", "Every 20 calls: autoCompactionDetect",
                          "Periodic: autoSessionHealthPoll, autoTelemetryAnomalyCheck, autoMemoryGraphIntegrity"]
    },
    "cadence_functions": {
        "total": 88,
        "categories": {
            "periodic_call_based": 7,
            "context_threshold": 4,
            "error_based": 4,
            "skill_knowledge": 5,
            "quality_validation": 3,
            "memory_session": 6,
            "cognitive_pattern": 4,
            "swarm_orchestration": 2,
            "telemetry_monitoring": 4,
            "specialized_subsystems": 49
        }
    },
    "bypass_paths": {
        "found": False,
        "evidence": "Proxy applied at registration time (index.ts line 343) — cannot invoke dispatcher without going through proxy",
        "global_counter": "Incremented on EVERY call — cannot be skipped",
        "minor_gaps": "3 cadence functions wrapped in try/catch without logging (Python compression, D3 error chain, memory graph) — silent failure possible but non-blocking"
    },
    "performance_overhead": {
        "fixed_cost": "~2-3ms (counter increment, journal append, tool recording)",
        "variable_cost": "5-50ms per cadence function that fires",
        "typical_total": "50-150ms overhead per dispatcher call (1-3 cadence functions + pattern matching)",
        "worst_case": "200-300ms on checkpoint call + pattern extraction"
    },
    "call_counter": {
        "implementation": "var globalDispatchCount in autoHookWrapper.ts",
        "cadence_triggers": "callNum % N === 0 triggers specific cadence functions",
        "persistence": "NOT persisted across server restarts — counter resets to 0",
        "query": "getDispatchCount() returns current count",
        "reset": "resetReconFlag() clears recovery state"
    },
    "findings": [
        {"severity": "OK", "finding": "ALL 45 dispatchers wrapped with universal proxy — 100% coverage, zero bypass paths"},
        {"severity": "OK", "finding": "88 auto-fire cadence functions covering lifecycle, error handling, quality, memory, telemetry, and pattern detection"},
        {"severity": "OK", "finding": "Calc tools get additional Lambda/Phi safety validation layer on top of universal hooks"},
        {"severity": "MINOR", "finding": "Call counter not persisted — resets on server restart, cadence functions may fire at wrong intervals after restart"},
        {"severity": "MINOR", "finding": "3 cadence functions have silent try/catch failures (autoPythonCompactionPredict, autoD3ErrorChain, memoryGraphEngine.captureDispatch)"},
        {"severity": "MINOR", "finding": "Typical 50-150ms overhead per call — acceptable for MCP but could accumulate in high-frequency batch operations"}
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
        "all_dispatchers_wrapped": True,
        "bypass_paths_identified": True,
        "performance_impact_assessed": True
    }
})

# ── U02: Orchestration Audit ────────────────────────────────────────────────
w("orchestration-audit.json", {
    "unit": "QA-MS12-U02",
    "title": "prism_orchestrate + prism_atcs + prism_autonomous: Orchestration & Swarm Logic Audit",
    "auditor": "claude-opus-4-6",
    "timestamp": "2026-02-28T15:00:00Z",
    "status": "PASS",
    "scope": "3 orchestration dispatchers (orchestrate 714, atcs 1510, autonomous 1140) — 3,364 total lines",
    "dispatchers": [
        {
            "name": "prism_orchestrate",
            "file": "src/tools/dispatchers/orchestrationDispatcher.ts",
            "lines": 714,
            "actions": 26,
            "action_list": ["agent_execute", "agent_parallel", "agent_pipeline",
                           "plan_create", "plan_execute", "plan_status", "queue_stats", "session_list",
                           "swarm_execute", "swarm_parallel", "swarm_consensus", "swarm_pipeline",
                           "swarm_status", "swarm_patterns", "swarm_quick",
                           "roadmap_plan", "roadmap_next_batch", "roadmap_advance", "roadmap_gate",
                           "roadmap_list", "roadmap_load",
                           "roadmap_claim", "roadmap_release", "roadmap_heartbeat", "roadmap_discover",
                           "roadmap_register", "roadmap_populate_context"],
            "engines": ["AgentExecutor", "SwarmExecutor", "RoadmapExecutor", "HookExecutor", "TaskClaimService", "RoadmapLoader", "AgentRegistry", "TaskAgentClassifier"],
            "swarm_patterns": ["parallel", "pipeline", "map_reduce", "consensus", "hierarchical", "ensemble", "competition", "collaboration"],
            "deadlock_prevention": {
                "dag_cycle_detection": "Kahn's algorithm for topological sort — returns hasCycles:true if circular dependency",
                "heartbeat_stale_reaping": "roadmap_heartbeat + reap_stale flag clears claims older than timeout",
                "operation_timeouts": "Default 30s timeout on agent/swarm execution with on-agent-timeout hook",
                "no_nested_locking": "Claim->Execute->Release pattern is atomic (no re-entrant claims)"
            }
        },
        {
            "name": "prism_atcs",
            "file": "src/tools/dispatchers/atcsDispatcher.ts",
            "lines": 1510,
            "actions": 12,
            "action_list": ["task_init", "task_resume", "task_status", "queue_next", "unit_complete",
                           "batch_validate", "checkpoint", "replan", "assemble", "stub_scan",
                           "delegate_to_manus", "poll_delegated"],
            "state_machine": "PENDING -> IN_PROGRESS -> COMPLETE / FAILED / NEEDS_RESEARCH / HALTED",
            "quality_gates": {
                "stub_scan": "Zero-tolerance: detects TODO/FIXME/TBD/PLACEHOLDER, suspicious values (0.0/-1/999/N-A/unknown), vague language (approximately/typically/generally)",
                "acceptance_criteria": "validateAcceptanceCriteria() checks required_fields, rejects if missing",
                "ralph_loop": "prism_ralph->loop for batch validation, results written to ralph-loops/ subdirectory"
            },
            "manus_bridge": "delegate_to_manus -> ManusATCSBridge.delegateUnits() async, poll_delegated -> pollResults()"
        },
        {
            "name": "prism_autonomous",
            "file": "src/tools/dispatchers/autonomousDispatcher.ts",
            "lines": 1140,
            "actions": 8,
            "action_list": ["auto_configure", "auto_plan", "auto_execute", "auto_status",
                           "auto_validate", "auto_dry_run", "auto_pause", "auto_resume"],
            "architecture": "Bridge between ATCS state machine + AgentExecutor API calls + SwarmExecutor patterns",
            "gap_coverage": "23 gaps from ATCS_MANUS_MERGE_BRAINSTORM.md all addressed",
            "safety": {
                "cost_control": {"max_cost_per_task": "$50", "max_cost_per_batch": "$10", "max_failure_rate": "30%"},
                "safety_critical_types": ["force_calculation", "speed_calculation", "collision_check", "spindle_validation", "tool_breakage", "workholding", "coolant_flow"],
                "rate_limiting": "5 units per tool call, 200ms between API calls",
                "dry_run": "auto_dry_run validates prompts and estimates costs without real API calls"
            }
        }
    ],
    "total_actions": 46,
    "findings": [
        {"severity": "OK", "finding": "DAG-based parallelism with Kahn's cycle detection prevents infinite dependency loops"},
        {"severity": "OK", "finding": "Multi-Claude coordination via atomic mkdir-based locking + heartbeat stale detection"},
        {"severity": "OK", "finding": "Zero-tolerance stub scan catches TODO/FIXME/TBD plus suspicious values and vague language"},
        {"severity": "OK", "finding": "Cost transparency: token tracking, rate limiting ($50 task cap, $10 batch cap), budget circuit breaker"},
        {"severity": "OK", "finding": "8 swarm patterns (parallel/pipeline/map_reduce/consensus/hierarchical/ensemble/competition/collaboration)"},
        {"severity": "MINOR", "finding": "ManusATCSBridge delegated tasks are in-memory only — lost on server restart without recovery"},
        {"severity": "MINOR", "finding": "Heartbeat timeout misconfiguration could leave stale claims if not properly tuned"}
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
        "orchestration_workflow_verified": True,
        "atcs_task_scheduling_verified": True,
        "autonomous_coordination_verified": True,
        "deadlock_prevention_verified": True
    }
})

# ── U03: Autopilot Audit ────────────────────────────────────────────────────
w("autopilot-audit.json", {
    "unit": "QA-MS12-U03",
    "title": "prism_autopilot_d: Autopilot Action Verification",
    "auditor": "claude-opus-4-6",
    "timestamp": "2026-02-28T15:00:00Z",
    "status": "PASS",
    "scope": "autoPilotDispatcher.ts (166 lines) — 7 actions, AutoPilot + AutoPilotV2 integration",
    "file": "src/tools/dispatchers/autoPilotDispatcher.ts",
    "lines": 166,
    "actions": 7,
    "action_list": ["autopilot", "autopilot_quick", "brainstorm_lenses", "formula_optimize",
                   "autopilot_v2", "registry_status", "working_tools"],
    "deprecated_removed": {
        "ralph_loop_lite": "Removed from ACTIONS enum per QA-MS8 finding — was generating fake incrementing scores via math formula, violating Law 2 ('Lives depend on real scores')"
    },
    "decision_logic": {
        "autopilot": "Full mode — enableSwarms:true, enableRalphLoops:3, enableFormulaOptimization:true",
        "autopilot_quick": "Minimal mode — enableSwarms:false, enableRalphLoops:1, enableFormulaOptimization:false",
        "brainstorm_lenses": "7 lenses: assumptions, alternatives, inversions, fusions, tenX, simplifications, futureProof",
        "formula_optimize": "Queries FormulaRegistry for top 5 matching formulas, falls back to prism_knowledge or prism_calc"
    },
    "safety_guardrails": {
        "hook_integration": "Can trigger on-decision and on-outcome events (via HookExecutor) but no direct hook.execute() calls in dispatcher",
        "configuration_safety": "Swarm/Ralph/Formula toggles are per-invocation configuration",
        "modular_design": "AutoPilot and AutoPilotV2 classes loaded with try/catch — graceful fallback if unavailable"
    },
    "findings": [
        {"severity": "OK", "finding": "7 actions covering full/quick autopilot, brainstorm lenses, formula optimization, registry status, and tool discovery"},
        {"severity": "OK", "finding": "ralph_loop_lite correctly removed per QA-MS8 finding — no fake score generation"},
        {"severity": "OK", "finding": "Modular design with try/catch loading of AutoPilot/AutoPilotV2 — graceful degradation"},
        {"severity": "MINOR", "finding": "No direct hook.execute() calls — relies on EventBus events for hook triggering (indirect)"},
        {"severity": "MINOR", "finding": "Formula optimizer falls back to alternative tools if FormulaRegistry unavailable — degraded but functional"}
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
        "all_actions_inventoried": True,
        "decision_logic_verified": True,
        "safety_guardrails_verified": True
    }
})

# ── U04: Hook-Dispatcher Interaction Audit ──────────────────────────────────
w("hook-dispatcher-interaction-audit.json", {
    "unit": "QA-MS12-U04",
    "title": "Hook-to-Dispatcher Interaction Audit",
    "auditor": "claude-opus-4-6",
    "timestamp": "2026-02-28T15:00:00Z",
    "status": "PASS",
    "scope": "HookExecutor.ts (842 lines) + hookDispatcher.ts (167 lines) + 9 dispatchers importing HookExecutor",
    "hook_executor": {
        "file": "src/engines/HookExecutor.ts",
        "lines": 842,
        "phases": "50+ phases (pre/post file-read/write, material-add/update, calculation, session, quality, agent, swarm, cognitive, error, manufacturing)",
        "modes": ["blocking (stops execution on failure)", "warning (logs warning, continues)", "logging (just logs)", "silent (background)"],
        "priority": "critical(0) -> high(25) -> normal(50) -> low(75) -> background(100)",
        "execution": "Sequential within phase by priority, 5s default timeout, configurable stopOnError/continueOnError"
    },
    "hook_dispatcher": {
        "file": "src/tools/dispatchers/hookDispatcher.ts",
        "lines": 167,
        "actions": 20,
        "action_list": ["list", "get", "execute", "chain", "toggle", "emit", "event_list", "event_history",
                       "fire", "chain_v2", "status", "history", "enable", "disable", "coverage", "gaps",
                       "performance", "failures", "subscribe", "reactive_chains"]
    },
    "dispatcher_hook_imports": {
        "count": 9,
        "dispatchers": [
            "orchestrationDispatcher.ts — on-agent-timeout, on-swarm-consensus",
            "calcDispatcher.ts — calculation quality hooks",
            "intelligenceDispatcher.ts — decision hooks",
            "guardDispatcher.ts — safety enforcement hooks",
            "sessionDispatcher.ts — session lifecycle hooks",
            "documentDispatcher.ts — code generation hooks",
            "toolpathDispatcher.ts — pre/post-toolpath hooks",
            "dataDispatcher.ts — data import hooks",
            "threadDispatcher.ts — thread safety hooks"
        ]
    },
    "interaction_flows": {
        "orchestration": "agent_execute -> on-agent-timeout (if timeout); swarm_consensus -> on-swarm-consensus",
        "atcs": "unit_complete -> stub_scan (quality gate); batch_validate -> ralph_loop (via prism_ralph, not hook)",
        "autonomous": "auto_execute -> [no direct hooks, via ATCS bridge]",
        "autopilot": "autopilot -> [no hook.execute() calls, EventBus events only]"
    },
    "circular_dependency_analysis": {
        "found": False,
        "evidence": [
            "Dispatcher -> hook.execute() is one-way (hooks return result, no callback to dispatcher)",
            "Hook handlers can emit EventBus events but EventBus.publish is async and non-blocking",
            "No hook handler invokes prism_hook dispatcher (no re-entrance)",
            "maxConcurrentHooks is for background parallelism, not reentrant execution"
        ],
        "deadlock_prevention": ["5s default timeout per hook execution", "ContinueOnError configurable flag", "No nested locks/mutexes", "EventBus async pub/sub"]
    },
    "hook_ordering_conflicts": {
        "found": False,
        "mitigation": [
            "Priority-based execution ensures critical hooks run first (priority 0)",
            "Condition checks allow hooks to skip if precondition not met",
            "Tags enable selective hook execution",
            "Category grouping separates enforcement/validation/logging concerns"
        ],
        "note": "System relies on hook authors designing non-overlapping responsibilities — no automated conflict detection"
    },
    "findings": [
        {"severity": "OK", "finding": "9 dispatchers directly integrate with HookExecutor for domain-specific hook firing"},
        {"severity": "OK", "finding": "NO circular dependencies found — dispatcher->hook flow is strictly one-way"},
        {"severity": "OK", "finding": "Deadlock prevention via 5s timeout, continueOnError flag, async EventBus, no nested locks"},
        {"severity": "OK", "finding": "Hook dispatcher (prism_hook) provides 20 actions for full hook management, monitoring, and gap analysis"},
        {"severity": "MINOR", "finding": "No automated hook ordering conflict detection — relies on hook authors designing non-overlapping responsibilities"},
        {"severity": "MINOR", "finding": "36 dispatchers do NOT directly import HookExecutor — they rely solely on autoHookWrapper proxy for hook integration"}
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
        "hook_dispatcher_interaction_documented": True,
        "circular_dependencies_checked": True,
        "hook_ordering_conflicts_identified": True
    }
})

print(f"\nDone -- 5 files written to {OUT}")
