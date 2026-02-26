/**
 * PRISM MCP Server - Script Registry
 * Manages 163+ PRISM scripts for automation and utilities
 * 
 * Script Categories:
 * - Session Management (gsd_startup, session_memory_manager, etc.)
 * - Skill Management (intelligent_skill_selector, skill_sync, etc.)
 * - Data Processing (master_sync, format_skills, etc.)
 * - Analysis (comprehensive_audit, deep_dive, etc.)
 * - API Integration (api_parallel_test, api_swarm_executor, etc.)
 * - Extraction (bulk_extract, analyze_extraction_priority, etc.)
 * - Utilities (wire_new_skills, validate_skills, etc.)
 */

import * as path from "path";
import * as fs from "fs/promises";
import { BaseRegistry } from "./base.js";
import { PATHS } from "../constants.js";
import { log } from "../utils/Logger.js";
import { fileExists, listDirectory } from "../utils/files.js";

// ============================================================================
// TYPES
// ============================================================================

export type ScriptLanguage = "python" | "powershell" | "bash" | "javascript" | "typescript";
export type ScriptCategory =
  | "session_management"
  | "skill_management"
  | "data_processing"
  | "analysis"
  | "api_integration"
  | "extraction"
  | "validation"
  | "utilities"
  | "testing"
  | "deployment"
  | "dev_workflow";

export interface ScriptParameter {
  name: string;
  type: string;
  required: boolean;
  default?: unknown;
  description: string;
}

export interface Script {
  script_id: string;
  name: string;
  filename: string;
  category: ScriptCategory;
  description: string;
  
  // Language and execution
  language: ScriptLanguage;
  interpreter: string;  // e.g., "py -3", "pwsh", "node"
  
  // File info
  path: string;
  lines: number;
  size_bytes: number;
  
  // Parameters
  parameters: ScriptParameter[];
  
  // Dependencies
  requires: string[];  // Other scripts or modules required
  
  // Usage
  usage_examples: string[];
  
  // Tags and metadata
  tags: string[];
  priority: number;
  
  // Status
  status: "active" | "deprecated" | "experimental";
  enabled: boolean;
  
  // Timestamps
  created: string;
  updated: string;
}

// ============================================================================
// BUILT-IN SCRIPT DEFINITIONS
// ============================================================================

const BUILT_IN_SCRIPTS: Partial<Script>[] = [
  // === DEV WORKFLOW (run before/after builds) ===
  {
    script_id: "pre_build_check",
    name: "Pre-Build Check",
    filename: "pre_build_check.js",
    category: "dev_workflow",
    description: "Validates dispatcher wiring in index.ts, ACTIONS vs switch cases, duplicate functions. Run BEFORE npm run build.",
    language: "javascript",
    interpreter: "node",
    parameters: [],
    usage_examples: [`node ${PATHS.SCRIPTS}\\pre_build_check.js`],
    tags: ["build", "validation", "pre-build", "dispatchers"],
    priority: 10,
    status: "active",
    enabled: true
  },
  {
    script_id: "build_validator",
    name: "Build Validator",
    filename: "build_validator.js",
    category: "dev_workflow",
    description: "Deep build validation: action count drift, missing cases, dispatcher inventory, dead code detection.",
    language: "javascript",
    interpreter: "node",
    parameters: [],
    usage_examples: [`node ${PATHS.SCRIPTS}\\build_validator.js`],
    tags: ["build", "validation", "inventory", "dispatchers"],
    priority: 9,
    status: "active",
    enabled: true
  },
  {
    script_id: "snapshot",
    name: "Anti-Regression Snapshot",
    filename: "snapshot.js",
    category: "dev_workflow",
    description: "Take/diff snapshots of dispatcher state to catch regressions. Tracks functions, exports, actions per file.",
    language: "javascript",
    interpreter: "node",
    parameters: [
      { name: "command", type: "string", required: true, description: "take|diff|list" },
      { name: "label", type: "string", required: false, description: "Snapshot label (default: latest)" }
    ],
    usage_examples: [
      `node ${PATHS.SCRIPTS}\\snapshot.js take pre-refactor`,
      `node ${PATHS.SCRIPTS}\\snapshot.js diff pre-refactor`,
      `node ${PATHS.SCRIPTS}\\snapshot.js list`
    ],
    tags: ["regression", "snapshot", "validation", "anti-regression"],
    priority: 9,
    status: "active",
    enabled: true
  },
  {
    script_id: "func_map",
    name: "Function Map",
    filename: "func_map.js",
    category: "dev_workflow",
    description: "Shows all function/const/type/case signatures with line numbers for any TypeScript file. Saves 3-4 tool calls per edit.",
    language: "javascript",
    interpreter: "node",
    parameters: [
      { name: "filepath", type: "string", required: true, description: "Path to .ts file" },
      { name: "--exports-only", type: "string", required: false, description: "Show only exported symbols" }
    ],
    usage_examples: [
      `node ${PATHS.SCRIPTS}\\func_map.js src/tools/dispatchers/sessionDispatcher.ts`,
      `node ${PATHS.SCRIPTS}\\func_map.js src/index.ts --exports-only`
    ],
    tags: ["code", "navigation", "functions", "map"],
    priority: 8,
    status: "active",
    enabled: true
  },
  {
    script_id: "health_check",
    name: "Health Check",
    filename: "health_check.js",
    category: "dev_workflow",
    description: "Dispatcher inventory from source: tool names, action counts, line counts. Verifies all 24 dispatchers.",
    language: "javascript",
    interpreter: "node",
    parameters: [],
    usage_examples: [`node ${PATHS.SCRIPTS}\\health_check.js`],
    tags: ["health", "inventory", "dispatchers", "verification"],
    priority: 8,
    status: "active",
    enabled: true
  },

  // === SESSION MANAGEMENT ===
  {
    script_id: "session_state",
    name: "Session State Dump",
    filename: "session_state.js",
    category: "session_management",
    description: "Quick snapshot of entire system state: dispatchers, skills, scripts, TODO, build status. For session recovery after compaction.",
    language: "javascript",
    interpreter: "node",
    parameters: [],
    usage_examples: [`node ${PATHS.SCRIPTS}\\session_state.js`],
    tags: ["session", "state", "recovery", "compaction"],
    priority: 10,
    status: "active",
    enabled: true
  },
  {
    script_id: "gsd_startup",
    name: "GSD Startup",
    filename: "gsd_startup.py",
    category: "session_management",
    description: "Main entry point for session initialization. Auto-detects resume vs new session, selects relevant skills.",
    language: "python",
    interpreter: "py -3",
    parameters: [
      { name: "task", type: "string", required: false, description: "Task description for skill selection" }
    ],
    usage_examples: [
      `py -3 ${PATHS.SCRIPTS}\\gsd_startup.py "Your task description"`,
      `py -3 ${PATHS.SCRIPTS}\\gsd_startup.py  # Resume if active`
    ],
    tags: ["session", "startup", "gsd"],
    priority: 10,
    status: "active",
    enabled: true
  },
  {
    script_id: "gsd_loader",
    name: "GSD Loader",
    filename: "gsd_loader.py",
    category: "session_management",
    description: "Loads GSD protocol configuration.",
    language: "python",
    interpreter: "py -3",
    parameters: [],
    usage_examples: [`py -3 ${PATHS.SCRIPTS}\\gsd_loader.py`],
    tags: ["gsd", "loader", "config"],
    priority: 7,
    status: "active",
    enabled: true
  },
  {
    script_id: "session_init",
    name: "Session Init",
    filename: "session_init.py",
    category: "session_management",
    description: "Session bootstrapping and initialization.",
    language: "python",
    interpreter: "py -3",
    parameters: [],
    usage_examples: [`py -3 ${PATHS.SCRIPTS}\\session_init.py`],
    tags: ["session", "init"],
    priority: 7,
    status: "active",
    enabled: true
  },

  // === DATA PROCESSING ===
  {
    script_id: "generate_verified_steels",
    name: "Generate Verified Steels",
    filename: "generate_verified_steels.js",
    category: "data_processing",
    description: "ATCS material verification for steel materials. Active task.",
    language: "javascript",
    interpreter: "node",
    parameters: [],
    usage_examples: [`node ${PATHS.SCRIPTS}\\generate_verified_steels.js`],
    tags: ["materials", "steels", "verification", "atcs"],
    priority: 8,
    status: "active",
    enabled: true
  },
  {
    script_id: "generate_verified_stainless",
    name: "Generate Verified Stainless",
    filename: "generate_verified_stainless.js",
    category: "data_processing",
    description: "ATCS material verification for stainless steel materials.",
    language: "javascript",
    interpreter: "node",
    parameters: [],
    usage_examples: [`node ${PATHS.SCRIPTS}\\generate_verified_stainless.js`],
    tags: ["materials", "stainless", "verification", "atcs"],
    priority: 8,
    status: "active",
    enabled: true
  },
  {
    script_id: "generate_verified_nonferrous",
    name: "Generate Verified Nonferrous",
    filename: "generate_verified_nonferrous.js",
    category: "data_processing",
    description: "ATCS material verification for nonferrous materials.",
    language: "javascript",
    interpreter: "node",
    parameters: [],
    usage_examples: [`node ${PATHS.SCRIPTS}\\generate_verified_nonferrous.js`],
    tags: ["materials", "nonferrous", "verification", "atcs"],
    priority: 8,
    status: "active",
    enabled: true
  },
  {
    script_id: "materials_auto_enhancer_v1",
    name: "Materials Auto Enhancer",
    filename: "materials_auto_enhancer_v1.py",
    category: "data_processing",
    description: "Automated material enhancement with physics parameter injection.",
    language: "python",
    interpreter: "py -3",
    parameters: [],
    usage_examples: [`py -3 ${PATHS.SCRIPTS}\\materials_auto_enhancer_v1.py`],
    tags: ["materials", "enhancement", "physics"],
    priority: 7,
    status: "active",
    enabled: true
  },
  {
    script_id: "convert_machines_to_json",
    name: "Convert Machines to JSON",
    filename: "convert_machines_to_json.js",
    category: "data_processing",
    description: "Machine data format conversion.",
    language: "javascript",
    interpreter: "node",
    parameters: [],
    usage_examples: [`node ${PATHS.SCRIPTS}\\convert_machines_to_json.js`],
    tags: ["machines", "conversion", "json"],
    priority: 6,
    status: "active",
    enabled: true
  },
  {
    script_id: "controller_alarm_builder",
    name: "Controller Alarm Builder",
    filename: "controller_alarm_builder.py",
    category: "data_processing",
    description: "Builds alarm code registry for CNC controllers.",
    language: "python",
    interpreter: "py -3",
    parameters: [],
    usage_examples: [`py -3 ${PATHS.SCRIPTS}\\controller_alarm_builder.py`],
    tags: ["alarms", "controllers", "registry"],
    priority: 7,
    status: "active",
    enabled: true
  },

  // === REGISTRY & UTILITIES ===
  {
    script_id: "registry_builder_r2",
    name: "Registry Builder",
    filename: "registry_builder_r2.py",
    category: "utilities",
    description: "General-purpose registry construction tool.",
    language: "python",
    interpreter: "py -3",
    parameters: [],
    usage_examples: [`py -3 ${PATHS.SCRIPTS}\\registry_builder_r2.py`],
    tags: ["registry", "builder"],
    priority: 7,
    status: "active",
    enabled: true
  },
  {
    script_id: "script_registry_builder",
    name: "Script Registry Builder",
    filename: "script_registry_builder.py",
    category: "utilities",
    description: "Maintains the script registry.",
    language: "python",
    interpreter: "py -3",
    parameters: [],
    usage_examples: [`py -3 ${PATHS.SCRIPTS}\\script_registry_builder.py`],
    tags: ["scripts", "registry", "builder"],
    priority: 6,
    status: "active",
    enabled: true
  },
  {
    script_id: "regression_checker",
    name: "Regression Checker",
    filename: "regression_checker.py",
    category: "dev_workflow",
    description: "Anti-regression validation for code changes.",
    language: "python",
    interpreter: "py -3",
    parameters: [],
    usage_examples: [`py -3 ${PATHS.SCRIPTS}\\regression_checker.py`],
    tags: ["regression", "validation", "anti-regression"],
    priority: 9,
    status: "active",
    enabled: true
  },
  {
    script_id: "api_swarm_executor_v2",
    name: "API Swarm Executor v2",
    filename: "api_swarm_executor_v2.py",
    category: "api_integration",
    description: "Multi-agent swarm execution patterns via API.",
    language: "python",
    interpreter: "py -3",
    parameters: [],
    usage_examples: [`py -3 ${PATHS.SCRIPTS}\\api_swarm_executor_v2.py`],
    tags: ["api", "swarm", "executor", "parallel"],
    priority: 7,
    status: "active",
    enabled: true
  },
  {
    script_id: "ilp_combination_engine",
    name: "ILP Combination Engine",
    filename: "ilp_combination_engine.py",
    category: "utilities",
    description: "Integer Linear Programming optimization engine for skill/resource combinations.",
    language: "python",
    interpreter: "py -3",
    parameters: [],
    usage_examples: [`py -3 ${PATHS.SCRIPTS}\\ilp_combination_engine.py`],
    tags: ["ilp", "optimization", "combination"],
    priority: 7,
    status: "active",
    enabled: true
  },
  {
    script_id: "prism_json_sort",
    name: "JSON Sort",
    filename: "prism_json_sort.py",
    category: "utilities",
    description: "Sorts JSON file keys for consistent ordering.",
    language: "python",
    interpreter: "py -3",
    parameters: [],
    usage_examples: [`py -3 ${PATHS.SCRIPTS}\\prism_json_sort.py`],
    tags: ["json", "sort", "utility"],
    priority: 5,
    status: "active",
    enabled: true
  },

  // === CORE: GSD & BUILD (critical operational scripts) ===
  {
    script_id: "core_gsd_sync_v2",
    name: "GSD Sync V2",
    filename: "gsd_sync_v2.py",
    category: "session_management",
    description: "Auto-syncs GSD protocol files after every build. Updates dispatcher counts, action lists, and section files in data/docs/gsd/.",
    language: "python",
    interpreter: "py -3",
    parameters: [],
    usage_examples: [`py -3 ${PATHS.SCRIPTS}\\core\\gsd_sync_v2.py`],
    tags: ["gsd", "sync", "build", "auto-fire", "critical"],
    priority: 10,
    status: "active",
    enabled: true
  },
  {
    script_id: "core_phase0_hooks",
    name: "Phase0 Hook Definitions",
    filename: "phase0_hooks.py",
    category: "utilities",
    description: "Defines 39 hook definitions for core operations. Source of truth for hook registrations bridged to TypeScript HookEngine.",
    language: "python",
    interpreter: "py -3",
    parameters: [],
    usage_examples: [`py -3 ${PATHS.SCRIPTS}\\core\\phase0_hooks.py`],
    tags: ["hooks", "definitions", "registration", "phase0"],
    priority: 9,
    status: "active",
    enabled: true
  },

  // === CORE: COMPACTION & RECOVERY ===
  {
    script_id: "core_compaction_detector",
    name: "Compaction Detector",
    filename: "compaction_detector.py",
    category: "session_management",
    description: "Detects context compaction events via multi-signal analysis: 30s gap, session_boot mid-session, call count reset. Triggers survival save.",
    language: "python",
    interpreter: "py -3",
    parameters: [],
    usage_examples: [`py -3 ${PATHS.SCRIPTS}\\core\\compaction_detector.py`],
    tags: ["compaction", "detection", "context", "recovery", "critical"],
    priority: 10,
    status: "active",
    enabled: true
  },
  {
    script_id: "core_state_reconstructor",
    name: "State Reconstructor",
    filename: "state_reconstructor.py",
    category: "session_management",
    description: "Reconstructs session state from artifacts after compaction. Reads COMPACTION_SURVIVAL.json, RECENT_ACTIONS.json, checkpoints.",
    language: "python",
    interpreter: "py -3",
    parameters: [],
    usage_examples: [`py -3 ${PATHS.SCRIPTS}\\core\\state_reconstructor.py`],
    tags: ["state", "recovery", "compaction", "reconstruction", "critical"],
    priority: 10,
    status: "active",
    enabled: true
  },
  {
    script_id: "core_recovery_scorer",
    name: "Recovery Scorer",
    filename: "recovery_scorer.py",
    category: "session_management",
    description: "Scores recovery quality after compaction. Evaluates completeness of recovered state vs pre-compaction state.",
    language: "python",
    interpreter: "py -3",
    parameters: [],
    usage_examples: [`py -3 ${PATHS.SCRIPTS}\\core\\recovery_scorer.py`],
    tags: ["recovery", "scoring", "compaction", "quality"],
    priority: 8,
    status: "active",
    enabled: true
  },

  // === CORE: SESSION HANDOFF ===
  {
    script_id: "core_next_session_prep",
    name: "Next Session Prep",
    filename: "next_session_prep.py",
    category: "session_management",
    description: "Generates handoff packages for next session. Captures current position, remaining work, file states, and recovery instructions.",
    language: "python",
    interpreter: "py -3",
    parameters: [],
    usage_examples: [`py -3 ${PATHS.SCRIPTS}\\core\\next_session_prep.py`],
    tags: ["session", "handoff", "prep", "continuity"],
    priority: 9,
    status: "active",
    enabled: true
  },
  {
    script_id: "core_resume_detector",
    name: "Resume Detector",
    filename: "resume_detector.py",
    category: "session_management",
    description: "Detects session resume conditions: checks for handoff packages, stale state, pending work items. Returns resume scenario with confidence.",
    language: "python",
    interpreter: "py -3",
    parameters: [],
    usage_examples: [`py -3 ${PATHS.SCRIPTS}\\core\\resume_detector.py`],
    tags: ["resume", "detection", "session", "handoff"],
    priority: 9,
    status: "active",
    enabled: true
  },
  {
    script_id: "core_resume_validator",
    name: "Resume Validator",
    filename: "resume_validator.py",
    category: "validation",
    description: "Validates resume data integrity. Checks that handoff packages contain valid state, files exist, and work items are actionable.",
    language: "python",
    interpreter: "py -3",
    parameters: [],
    usage_examples: [`py -3 ${PATHS.SCRIPTS}\\core\\resume_validator.py`],
    tags: ["resume", "validation", "integrity", "session"],
    priority: 9,
    status: "active",
    enabled: true
  },
  {
    script_id: "core_checkpoint_mapper",
    name: "Checkpoint Mapper",
    filename: "checkpoint_mapper.py",
    category: "session_management",
    description: "Maps checkpoint dependency chains. Tracks which checkpoints depend on others for safe rollback and recovery paths.",
    language: "python",
    interpreter: "py -3",
    parameters: [],
    usage_examples: [`py -3 ${PATHS.SCRIPTS}\\core\\checkpoint_mapper.py`],
    tags: ["checkpoint", "dependencies", "mapping", "recovery"],
    priority: 7,
    status: "active",
    enabled: true
  },

  // === CORE: CONTEXT MANAGEMENT ===
  {
    script_id: "core_context_compressor",
    name: "Context Compressor",
    filename: "context_compressor.py",
    category: "utilities",
    description: "Compresses context when pressure is high. Removes low-priority data, summarizes verbose structures, externalizes large results to disk.",
    language: "python",
    interpreter: "py -3",
    parameters: [
      { name: "--file", type: "string", required: false, description: "Target file to compress" },
      { name: "--level", type: "string", required: false, description: "Compression level: light|medium|aggressive" },
      { name: "--output", type: "string", required: false, description: "Output path" }
    ],
    usage_examples: [
      `py -3 ${PATHS.SCRIPTS}\\core\\context_compressor.py --level medium`,
      `py -3 ${PATHS.SCRIPTS}\\core\\context_compressor.py --file state.json --level aggressive`
    ],
    tags: ["context", "compression", "pressure", "optimization"],
    priority: 9,
    status: "active",
    enabled: true
  },
  {
    script_id: "core_context_pressure",
    name: "Context Pressure Monitor",
    filename: "context_pressure.py",
    category: "utilities",
    description: "Monitors context pressure levels. Tracks token usage, calculates pressure percentage, triggers compression when thresholds exceeded.",
    language: "python",
    interpreter: "py -3",
    parameters: [],
    usage_examples: [`py -3 ${PATHS.SCRIPTS}\\core\\context_pressure.py`],
    tags: ["context", "pressure", "monitoring", "tokens"],
    priority: 9,
    status: "active",
    enabled: true
  },
  {
    script_id: "core_context_monitor",
    name: "Context Monitor",
    filename: "context_monitor.py",
    category: "utilities",
    description: "Continuous context monitoring: tracks growth rate, identifies large contributors, recommends externalization targets.",
    language: "python",
    interpreter: "py -3",
    parameters: [],
    usage_examples: [`py -3 ${PATHS.SCRIPTS}\\core\\context_monitor.py`],
    tags: ["context", "monitoring", "growth", "analysis"],
    priority: 8,
    status: "active",
    enabled: true
  },
  {
    script_id: "core_context_expander",
    name: "Context Expander",
    filename: "context_expander.py",
    category: "utilities",
    description: "Expands context by loading externalized data back from disk. Selective rehydration based on current task relevance.",
    language: "python",
    interpreter: "py -3",
    parameters: [],
    usage_examples: [`py -3 ${PATHS.SCRIPTS}\\core\\context_expander.py`],
    tags: ["context", "expansion", "rehydration", "loading"],
    priority: 7,
    status: "active",
    enabled: true
  },
  {
    script_id: "core_attention_scorer",
    name: "Attention Scorer",
    filename: "attention_scorer.py",
    category: "utilities",
    description: "Scores attention levels for focus management. Implements Manus Law 4: attention manipulation via recitation. Higher scores = more relevant to current task.",
    language: "python",
    interpreter: "py -3",
    parameters: [],
    usage_examples: [`py -3 ${PATHS.SCRIPTS}\\core\\attention_scorer.py`],
    tags: ["attention", "scoring", "focus", "manus", "context"],
    priority: 8,
    status: "active",
    enabled: true
  },
  {
    script_id: "core_focus_optimizer",
    name: "Focus Optimizer",
    filename: "focus_optimizer.py",
    category: "utilities",
    description: "Optimizes focus allocation across competing priorities. Uses attention scores to recommend which items to keep vs externalize.",
    language: "python",
    interpreter: "py -3",
    parameters: [],
    usage_examples: [`py -3 ${PATHS.SCRIPTS}\\core\\focus_optimizer.py`],
    tags: ["focus", "optimization", "attention", "priorities"],
    priority: 7,
    status: "active",
    enabled: true
  },

  // === CORE: ERROR & PATTERN ANALYSIS ===
  {
    script_id: "core_error_extractor",
    name: "Error Extractor",
    filename: "error_extractor.py",
    category: "analysis",
    description: "Extracts and classifies errors from logs and tool output. Feeds into failure_library for prevention and autoScriptRecommend for fixes.",
    language: "python",
    interpreter: "py -3",
    parameters: [],
    usage_examples: [`py -3 ${PATHS.SCRIPTS}\\core\\error_extractor.py`],
    tags: ["error", "extraction", "analysis", "failure"],
    priority: 8,
    status: "active",
    enabled: true
  },
  {
    script_id: "core_pattern_detector",
    name: "Pattern Detector",
    filename: "pattern_detector.py",
    category: "analysis",
    description: "Detects patterns in session behavior: repeated errors, common tool sequences, efficiency bottlenecks. Feeds into learning_store.",
    language: "python",
    interpreter: "py -3",
    parameters: [],
    usage_examples: [`py -3 ${PATHS.SCRIPTS}\\core\\pattern_detector.py`],
    tags: ["pattern", "detection", "analysis", "learning"],
    priority: 7,
    status: "active",
    enabled: true
  },
  {
    script_id: "core_learning_store",
    name: "Learning Store",
    filename: "learning_store.py",
    category: "utilities",
    description: "Persistent store for session learnings: patterns, workarounds, discovered approaches. Append-only, queried on session boot.",
    language: "python",
    interpreter: "py -3",
    parameters: [],
    usage_examples: [`py -3 ${PATHS.SCRIPTS}\\core\\learning_store.py`],
    tags: ["learning", "storage", "patterns", "knowledge"],
    priority: 7,
    status: "active",
    enabled: true
  },

  // === CORE: SESSION & WORKFLOW ===
  {
    script_id: "core_session_lifecycle",
    name: "Session Lifecycle",
    filename: "session_lifecycle.py",
    category: "session_management",
    description: "Full session lifecycle management: start, checkpoint, handoff, end. Coordinates state saves and recovery manifest generation.",
    language: "python",
    interpreter: "py -3",
    parameters: [],
    usage_examples: [`py -3 ${PATHS.SCRIPTS}\\core\\session_lifecycle.py`],
    tags: ["session", "lifecycle", "management", "coordination"],
    priority: 8,
    status: "active",
    enabled: true
  },
  {
    script_id: "core_workflow_tracker",
    name: "Workflow Tracker",
    filename: "workflow_tracker.py",
    category: "session_management",
    description: "Tracks workflow state machine transitions: IDLE→PLANNING→EXECUTING→REVIEWING→COMPLETE. Persists to WORKFLOW_STATE.json.",
    language: "python",
    interpreter: "py -3",
    parameters: [],
    usage_examples: [`py -3 ${PATHS.SCRIPTS}\\core\\workflow_tracker.py`],
    tags: ["workflow", "state", "tracking", "transitions"],
    priority: 7,
    status: "active",
    enabled: true
  },
  {
    script_id: "core_wip_capturer",
    name: "WIP Capturer",
    filename: "wip_capturer.py",
    category: "session_management",
    description: "Captures work-in-progress state: current file being edited, line number, reasoning trail, uncommitted changes. Used for compaction survival.",
    language: "python",
    interpreter: "py -3",
    parameters: [],
    usage_examples: [`py -3 ${PATHS.SCRIPTS}\\core\\wip_capturer.py`],
    tags: ["wip", "capture", "state", "compaction"],
    priority: 8,
    status: "active",
    enabled: true
  },

  // === CORE: SKILL & ORCHESTRATION ===
  {
    script_id: "core_skill_mcp",
    name: "Skill MCP Bridge",
    filename: "skill_mcp.py",
    category: "skill_management",
    description: "MCP bridge for skill registry operations. Loads, queries, and manages skills from the consolidated skill library.",
    language: "python",
    interpreter: "py -3",
    parameters: [],
    usage_examples: [`py -3 ${PATHS.SCRIPTS}\\core\\skill_mcp.py`],
    tags: ["skill", "mcp", "registry", "bridge"],
    priority: 7,
    status: "active",
    enabled: true
  },
  {
    script_id: "core_master_orchestrator_v2",
    name: "Master Orchestrator V2",
    filename: "master_orchestrator_v2.py",
    category: "utilities",
    description: "Master orchestration engine: routes tasks to appropriate agents, manages parallel execution, coordinates multi-step workflows.",
    language: "python",
    interpreter: "py -3",
    parameters: [],
    usage_examples: [`py -3 ${PATHS.SCRIPTS}\\core\\master_orchestrator_v2.py`],
    tags: ["orchestration", "master", "routing", "agents"],
    priority: 8,
    status: "active",
    enabled: true
  },
  {
    script_id: "core_manus_context_engineering",
    name: "Manus Context Engineering",
    filename: "manus_context_engineering.py",
    category: "utilities",
    description: "Implements Manus 6 Laws of context engineering: KV sort stability, tool mask state, memory externalization, error preservation, response variation.",
    language: "python",
    interpreter: "py -3",
    parameters: [],
    usage_examples: [`py -3 ${PATHS.SCRIPTS}\\core\\manus_context_engineering.py`],
    tags: ["manus", "context", "engineering", "laws"],
    priority: 7,
    status: "active",
    enabled: true
  }
];

// ============================================================================
// SCRIPT REGISTRY
// ============================================================================

export class ScriptRegistry extends BaseRegistry<Script> {
  private indexByCategory: Map<ScriptCategory, Set<string>> = new Map();
  private indexByLanguage: Map<ScriptLanguage, Set<string>> = new Map();
  private indexByTag: Map<string, Set<string>> = new Map();
  private builtInScripts: Map<string, Partial<Script>> = new Map();

  constructor() {
    super("scripts", path.join(PATHS.STATE_DIR, "script-registry.json"), "1.0.0");
    this.initializeBuiltInScripts();
  }

  /**
   * Initialize built-in script definitions
   */
  private initializeBuiltInScripts(): void {
    for (const script of BUILT_IN_SCRIPTS) {
      if (script.script_id) {
        this.builtInScripts.set(script.script_id, script);
      }
    }
    log.debug(`Initialized ${this.builtInScripts.size} built-in script definitions`);
  }

  /**
   * Load scripts from filesystem
   */
  async load(): Promise<void> {
    if (this.loaded) return;
    
    log.info("Loading ScriptRegistry...");
    
    // Load from scripts directory
    await this.loadFromPath(PATHS.SCRIPTS);

    // R1-AUDIT-T3: Built-in metadata is used ONLY for enrichment when matching
    // files are found on disk (see loadFromPath → line 924). No phantom entries
    // are created for non-existent scripts. All 42 built-ins verified to have
    // matching files on disk (2026-02-20).

    this.buildIndexes();
    
    this.loaded = true;
    log.info(`ScriptRegistry loaded: ${this.entries.size} scripts`);
  }

  /**
   * Load scripts from a directory
   */
  private async loadFromPath(basePath: string): Promise<void> {
    try {
      if (!await fileExists(basePath)) {
        log.debug(`Scripts path does not exist: ${basePath}`);
        return;
      }
      
      const files = await listDirectory(basePath, { recursive: true });
      const scriptFiles = files.filter(f => 
        !f.isDirectory &&
        !f.path.includes("__pycache__") &&
        !f.path.includes("node_modules") &&
        !f.path.includes("_archive") &&
        (f.name.endsWith(".py") || 
        f.name.endsWith(".ps1") || 
        f.name.endsWith(".sh") || 
        f.name.endsWith(".js") || 
        f.name.endsWith(".ts"))
      );
      
      for (const file of scriptFiles) {
        try {
          const scriptPath = file.path;
          const stats = await fs.stat(scriptPath);
          const content = await fs.readFile(scriptPath, "utf-8");
          const lines = content.split("\n").length;
          
          // W6.2: Generate unique scriptId using relative path from basePath
          // core/workflow_tracker.py → "workflow_tracker", session_init.py → "session_init"  
          // If collision, prefix with subdir: "core_workflow_tracker"
          const relPath = path.relative(basePath, scriptPath).replace(/\\/g, "/");
          const parts = relPath.split("/");
          const bareId = file.name.replace(/\.(py|ps1|sh|js|ts)$/, "");
          const scriptId = parts.length > 1 
            ? `${parts.slice(0, -1).join("_")}_${bareId}`  // subdir prefix
            : bareId;  // top-level, no prefix
          const builtIn = this.builtInScripts.get(scriptId) || this.builtInScripts.get(bareId) || {};
          
          const script: Script = {
            script_id: scriptId,
            name: builtIn.name || scriptId.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase()),
            filename: file.name,
            category: builtIn.category || this.inferCategory(scriptId),
            description: builtIn.description || this.extractDescription(content),
            language: this.getLanguage(file.name),
            interpreter: this.getInterpreter(file.name),
            path: scriptPath,
            lines,
            size_bytes: stats.size,
            parameters: builtIn.parameters || this.extractParameters(content),
            requires: builtIn.requires || [],
            usage_examples: builtIn.usage_examples || [],
            tags: builtIn.tags || this.extractTags(scriptId),
            priority: builtIn.priority || 5,
            status: builtIn.status || "active",
            enabled: builtIn.enabled ?? true,
            created: "2026-01-01",
            updated: new Date(stats.mtime).toISOString().split("T")[0]
          };
          
          this.set(scriptId, script);
        } catch (err) {
          log.warn(`Failed to load script ${file.name}: ${err}`);
        }
      }
    } catch (err) {
      log.warn(`Failed to load scripts from ${basePath}: ${err}`);
    }
  }

  /**
   * Get language from file extension
   */
  private getLanguage(filename: string): ScriptLanguage {
    if (filename.endsWith(".py")) return "python";
    if (filename.endsWith(".ps1")) return "powershell";
    if (filename.endsWith(".sh")) return "bash";
    if (filename.endsWith(".js")) return "javascript";
    if (filename.endsWith(".ts")) return "typescript";
    return "python";
  }

  /**
   * Get interpreter from file extension
   */
  private getInterpreter(filename: string): string {
    if (filename.endsWith(".py")) return "py -3";
    if (filename.endsWith(".ps1")) return "pwsh";
    if (filename.endsWith(".sh")) return "bash";
    if (filename.endsWith(".js")) return "node";
    if (filename.endsWith(".ts")) return "npx tsx";
    return "py -3";
  }

  /**
   * Infer category from script ID
   */
  private inferCategory(scriptId: string): ScriptCategory {
    if (scriptId.includes("session") || scriptId.includes("gsd") || scriptId.includes("startup")) return "session_management";
    if (scriptId.includes("skill")) return "skill_management";
    if (scriptId.includes("sync") || scriptId.includes("format") || scriptId.includes("process")) return "data_processing";
    if (scriptId.includes("audit") || scriptId.includes("analyze") || scriptId.includes("deep_dive") || scriptId.includes("plan")) return "analysis";
    if (scriptId.includes("api") || scriptId.includes("swarm")) return "api_integration";
    if (scriptId.includes("extract")) return "extraction";
    if (scriptId.includes("valid") || scriptId.includes("check")) return "validation";
    if (scriptId.includes("test")) return "testing";
    if (scriptId.includes("deploy")) return "deployment";
    return "utilities";
  }

  /**
   * Extract description from script content
   */
  private extractDescription(content: string): string {
    // Try docstring
    const docstringMatch = content.match(/^"""([\s\S]*?)"""/m) || content.match(/^'''([\s\S]*?)'''/m);
    if (docstringMatch) return docstringMatch[1].trim().split("\n")[0].slice(0, 200);
    
    // Try comment
    const commentMatch = content.match(/^#\s*(.+)/m);
    if (commentMatch) return commentMatch[1].slice(0, 200);
    
    return "";
  }

  /**
   * Extract parameters from script content (basic)
   */
  private extractParameters(content: string): ScriptParameter[] {
    const params: ScriptParameter[] = [];
    
    // Look for argparse arguments
    const argMatches = content.matchAll(/add_argument\(['"](-{1,2}[\w-]+)['"]/g);
    for (const match of argMatches) {
      params.push({
        name: match[1],
        type: "string",
        required: !match[1].startsWith("--"),
        description: ""
      });
    }
    
    return params;
  }

  /**
   * Extract tags from script ID
   */
  private extractTags(scriptId: string): string[] {
    return scriptId.split("_").filter(p => p.length > 2);
  }

  /**
   * Build search indexes
   */
  private buildIndexes(): void {
    this.indexByCategory.clear();
    this.indexByLanguage.clear();
    this.indexByTag.clear();
    
    for (const [id, entry] of this.entries) {
      const script = entry.data;
      
      // Index by category
      if (!this.indexByCategory.has(script.category)) {
        this.indexByCategory.set(script.category, new Set());
      }
      this.indexByCategory.get(script.category)?.add(id);
      
      // Index by language
      if (!this.indexByLanguage.has(script.language)) {
        this.indexByLanguage.set(script.language, new Set());
      }
      this.indexByLanguage.get(script.language)?.add(id);
      
      // Index by tags
      for (const tag of script.tags || []) {
        if (!this.indexByTag.has(tag)) {
          this.indexByTag.set(tag, new Set());
        }
        this.indexByTag.get(tag)?.add(id);
      }
    }
  }

  /**
   * Get script by ID
   */
  getScript(id: string): Script | undefined {
    return this.get(id);
  }

  /**
   * Get scripts by category
   */
  getByCategory(category: ScriptCategory): Script[] {
    const ids = this.indexByCategory.get(category) || new Set();
    return Array.from(ids).map(id => this.get(id)!).filter(Boolean);
  }

  /**
   * Get scripts by language
   */
  getByLanguage(language: ScriptLanguage): Script[] {
    const ids = this.indexByLanguage.get(language) || new Set();
    return Array.from(ids).map(id => this.get(id)!).filter(Boolean);
  }

  /**
   * Search scripts
   */
  search(options: {
    query?: string;
    category?: ScriptCategory;
    language?: ScriptLanguage;
    tag?: string;
    enabled?: boolean;
    limit?: number;
    offset?: number;
  }): { scripts: Script[]; total: number; hasMore: boolean } {
    let results: Script[] = [];
    
    if (options.category) {
      results = this.getByCategory(options.category);
    } else if (options.language) {
      results = this.getByLanguage(options.language);
    } else {
      results = this.all();
    }
    
    if (options.query) {
      const query = options.query.toLowerCase();
      results = results.filter(s =>
        s.name.toLowerCase().includes(query) ||
        s.script_id.toLowerCase().includes(query) ||
        s.description.toLowerCase().includes(query)
      );
    }
    
    if (options.tag) {
      results = results.filter(s => s.tags?.includes(options.tag!));
    }
    
    if (options.enabled !== undefined) {
      results = results.filter(s => s.enabled === options.enabled);
    }
    
    const total = results.length;
    const offset = options.offset || 0;
    const limit = options.limit || 20;
    const paged = results.slice(offset, offset + limit);
    
    return {
      scripts: paged,
      total,
      hasMore: offset + paged.length < total
    };
  }

  /**
   * Get execution command for a script
   */
  getExecutionCommand(scriptId: string, args?: Record<string, unknown>): string | undefined {
    const script = this.get(scriptId);
    if (!script) return undefined;
    
    let cmd = `${script.interpreter} "${script.path}"`;
    
    if (args) {
      for (const [key, value] of Object.entries(args)) {
        if (key.startsWith("-")) {
          cmd += ` ${key} "${value}"`;
        } else {
          cmd += ` "${value}"`;
        }
      }
    }
    
    return cmd;
  }

  /**
   * Get statistics
   */
  getStats(): {
    total: number;
    byCategory: Record<string, number>;
    byLanguage: Record<string, number>;
    totalLines: number;
    totalSizeKB: number;
  } {
    const stats = {
      total: this.entries.size,
      byCategory: {} as Record<string, number>,
      byLanguage: {} as Record<string, number>,
      totalLines: 0,
      totalSizeKB: 0
    };
    
    for (const [category, ids] of this.indexByCategory) {
      stats.byCategory[category] = ids.size;
    }
    
    for (const [language, ids] of this.indexByLanguage) {
      stats.byLanguage[language] = ids.size;
    }
    
    for (const entry of this.entries.values()) {
      const s = entry.data;
      stats.totalLines += s.lines || 0;
      stats.totalSizeKB += (s.size_bytes || 0) / 1024;
    }
    
    stats.totalSizeKB = Math.round(stats.totalSizeKB * 10) / 10;
    
    return stats;
  }
}

// Export singleton instance
export const scriptRegistry = new ScriptRegistry();
