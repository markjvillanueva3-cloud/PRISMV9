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
  },

  // === L5-P1: 14 CORE MANUFACTURING AUTOMATION SCRIPTS ===
  {
    script_id: "auto_material_lookup",
    name: "Auto Material Lookup",
    filename: "auto_material_lookup.ts",
    category: "data_processing",
    description: "Automatically looks up material properties from registry by name, UNS, or AISI designation. Returns cutting data, heat treat specs, and machinability ratings.",
    language: "typescript",
    interpreter: "node",
    parameters: [
      { name: "material", type: "string", required: true, description: "Material name, UNS, or AISI designation" }
    ],
    usage_examples: [`node ${PATHS.SCRIPTS}\\auto_material_lookup.ts "Ti-6Al-4V"`, `node ${PATHS.SCRIPTS}\\auto_material_lookup.ts "UNS S31600"`],
    tags: ["material", "lookup", "registry", "automation"],
    priority: 8,
    status: "active",
    enabled: true
  },
  {
    script_id: "auto_tool_recommend",
    name: "Auto Tool Recommend",
    filename: "auto_tool_recommend.ts",
    category: "data_processing",
    description: "Recommends cutting tools from 13,967-entry registry based on material, operation, and machine. Returns top 3 ranked by performance/cost.",
    language: "typescript",
    interpreter: "node",
    parameters: [
      { name: "material", type: "string", required: true, description: "Workpiece material" },
      { name: "operation", type: "string", required: true, description: "Operation type (roughing, finishing, drilling, etc.)" },
      { name: "diameter", type: "number", required: false, description: "Tool diameter in mm" }
    ],
    usage_examples: [`node ${PATHS.SCRIPTS}\\auto_tool_recommend.ts --material "4140" --operation "roughing"`],
    tags: ["tool", "recommend", "selection", "automation"],
    priority: 8,
    status: "active",
    enabled: true
  },
  {
    script_id: "auto_machine_match",
    name: "Auto Machine Match",
    filename: "auto_machine_match.ts",
    category: "data_processing",
    description: "Matches part requirements to available machines from 1,016-entry registry. Checks envelope, spindle power, axis travel, and controller compatibility.",
    language: "typescript",
    interpreter: "node",
    parameters: [
      { name: "partSize", type: "string", required: true, description: "Part bounding box (LxWxH mm)" },
      { name: "spindlePower", type: "number", required: false, description: "Required spindle power in kW" },
      { name: "axes", type: "number", required: false, description: "Required axis count (3, 4, or 5)" }
    ],
    usage_examples: [`node ${PATHS.SCRIPTS}\\auto_machine_match.ts --partSize "300x200x100"`],
    tags: ["machine", "match", "selection", "envelope"],
    priority: 7,
    status: "active",
    enabled: true
  },
  {
    script_id: "auto_safety_check",
    name: "Auto Safety Check",
    filename: "auto_safety_check.ts",
    category: "validation",
    description: "Validates cutting parameters against machine limits and safety thresholds. Checks RPM, feed, DOC, power, and force limits. Blocks unsafe operations.",
    language: "typescript",
    interpreter: "node",
    parameters: [
      { name: "params", type: "string", required: true, description: "JSON string of cutting parameters" },
      { name: "machine", type: "string", required: true, description: "Machine model name" }
    ],
    usage_examples: [`node ${PATHS.SCRIPTS}\\auto_safety_check.ts --params '{"rpm":12000,"feed":5000}' --machine "VF-2"`],
    tags: ["safety", "validation", "limits", "blocking"],
    priority: 10,
    status: "active",
    enabled: true
  },
  {
    script_id: "auto_cost_estimate",
    name: "Auto Cost Estimate",
    filename: "auto_cost_estimate.ts",
    category: "analysis",
    description: "Estimates per-part manufacturing cost from cycle time, material, tooling, and shop rate. Returns cost breakdown and batch quantity curves.",
    language: "typescript",
    interpreter: "node",
    parameters: [
      { name: "cycleTime", type: "number", required: true, description: "Cycle time in minutes" },
      { name: "material", type: "string", required: true, description: "Material type" },
      { name: "quantity", type: "number", required: false, default: 1, description: "Batch quantity" }
    ],
    usage_examples: [`node ${PATHS.SCRIPTS}\\auto_cost_estimate.ts --cycleTime 14.2 --material "7075-T6" --quantity 100`],
    tags: ["cost", "estimate", "quoting", "economics"],
    priority: 7,
    status: "active",
    enabled: true
  },
  {
    script_id: "auto_setup_sheet",
    name: "Auto Setup Sheet",
    filename: "auto_setup_sheet.ts",
    category: "utilities",
    description: "Generates shop floor setup sheet from job data: tool list, WCS, fixture notes, runtime. Outputs formatted PDF or markdown.",
    language: "typescript",
    interpreter: "node",
    parameters: [
      { name: "jobId", type: "string", required: true, description: "Job identifier" },
      { name: "format", type: "string", required: false, default: "pdf", description: "Output format (pdf, md, html)" }
    ],
    usage_examples: [`node ${PATHS.SCRIPTS}\\auto_setup_sheet.ts --jobId "J-2024-047"`],
    tags: ["setup", "sheet", "shop-floor", "documentation"],
    priority: 7,
    status: "active",
    enabled: true
  },
  {
    script_id: "auto_export_pdf",
    name: "Auto Export PDF",
    filename: "auto_export_pdf.ts",
    category: "utilities",
    description: "Exports PRISM data to PDF: speed/feed cards, quality reports, quotes, FAI documents. Uses template system with company branding.",
    language: "typescript",
    interpreter: "node",
    parameters: [
      { name: "template", type: "string", required: true, description: "Template name (speed-feed-card, quality-report, quote, fai)" },
      { name: "data", type: "string", required: true, description: "JSON data to render" }
    ],
    usage_examples: [`node ${PATHS.SCRIPTS}\\auto_export_pdf.ts --template "speed-feed-card" --data '{"material":"4140"}'`],
    tags: ["export", "pdf", "report", "template"],
    priority: 6,
    status: "active",
    enabled: true
  },
  {
    script_id: "auto_backup_data",
    name: "Auto Backup Data",
    filename: "auto_backup_data.ts",
    category: "utilities",
    description: "Backs up PRISM data (registries, state, settings) to timestamped archive. Supports incremental and full backup modes.",
    language: "typescript",
    interpreter: "node",
    parameters: [
      { name: "mode", type: "string", required: false, default: "incremental", description: "Backup mode (full, incremental)" }
    ],
    usage_examples: [`node ${PATHS.SCRIPTS}\\auto_backup_data.ts --mode full`],
    tags: ["backup", "data", "archive", "recovery"],
    priority: 6,
    status: "active",
    enabled: true
  },
  {
    script_id: "auto_spc_update",
    name: "Auto SPC Update",
    filename: "auto_spc_update.ts",
    category: "analysis",
    description: "Updates SPC charts with new measurement data. Calculates X-bar/R, Cp/Cpk, and checks Western Electric rules for out-of-control signals.",
    language: "typescript",
    interpreter: "node",
    parameters: [
      { name: "dimension", type: "string", required: true, description: "Dimension identifier" },
      { name: "value", type: "number", required: true, description: "New measurement value" }
    ],
    usage_examples: [`node ${PATHS.SCRIPTS}\\auto_spc_update.ts --dimension "bore-25H7" --value 25.003`],
    tags: ["spc", "quality", "measurement", "control-chart"],
    priority: 7,
    status: "active",
    enabled: true
  },
  {
    script_id: "auto_tool_reorder",
    name: "Auto Tool Reorder",
    filename: "auto_tool_reorder.ts",
    category: "utilities",
    description: "Checks tool inventory against reorder points and generates purchase requisitions. Tracks usage rate and lead times.",
    language: "typescript",
    interpreter: "node",
    parameters: [
      { name: "checkAll", type: "boolean", required: false, default: false, description: "Check all tools (default: only low-stock)" }
    ],
    usage_examples: [`node ${PATHS.SCRIPTS}\\auto_tool_reorder.ts`, `node ${PATHS.SCRIPTS}\\auto_tool_reorder.ts --checkAll`],
    tags: ["tool", "inventory", "reorder", "procurement"],
    priority: 6,
    status: "active",
    enabled: true
  },
  {
    script_id: "auto_maintenance_alert",
    name: "Auto Maintenance Alert",
    filename: "auto_maintenance_alert.ts",
    category: "analysis",
    description: "Monitors machine health metrics and generates maintenance alerts when thresholds are exceeded. Tracks spindle hours, vibration, and thermal drift.",
    language: "typescript",
    interpreter: "node",
    parameters: [
      { name: "machineId", type: "string", required: false, description: "Specific machine (default: all)" }
    ],
    usage_examples: [`node ${PATHS.SCRIPTS}\\auto_maintenance_alert.ts`, `node ${PATHS.SCRIPTS}\\auto_maintenance_alert.ts --machineId "VF-2-001"`],
    tags: ["maintenance", "predictive", "health", "alert"],
    priority: 7,
    status: "active",
    enabled: true
  },
  {
    script_id: "auto_quote_generate",
    name: "Auto Quote Generate",
    filename: "auto_quote_generate.ts",
    category: "analysis",
    description: "Generates customer quotes from part data: material + machining + tooling + overhead + margin. Outputs formatted quote document.",
    language: "typescript",
    interpreter: "node",
    parameters: [
      { name: "partId", type: "string", required: true, description: "Part identifier" },
      { name: "quantity", type: "number", required: true, description: "Quantity to quote" },
      { name: "margin", type: "number", required: false, default: 25, description: "Profit margin percentage" }
    ],
    usage_examples: [`node ${PATHS.SCRIPTS}\\auto_quote_generate.ts --partId "BR-2024-047" --quantity 500 --margin 30`],
    tags: ["quote", "costing", "business", "customer"],
    priority: 7,
    status: "active",
    enabled: true
  },
  {
    script_id: "auto_compliance_check",
    name: "Auto Compliance Check",
    filename: "auto_compliance_check.ts",
    category: "validation",
    description: "Validates manufacturing process against industry standards (AS9100, IATF 16949, FDA 21 CFR 820). Reports gaps and required documentation.",
    language: "typescript",
    interpreter: "node",
    parameters: [
      { name: "standard", type: "string", required: true, description: "Standard to check (AS9100, IATF16949, FDA820, NACE)" },
      { name: "processId", type: "string", required: true, description: "Process or job identifier" }
    ],
    usage_examples: [`node ${PATHS.SCRIPTS}\\auto_compliance_check.ts --standard "AS9100" --processId "J-2024-047"`],
    tags: ["compliance", "standards", "audit", "aerospace", "medical"],
    priority: 8,
    status: "active",
    enabled: true
  },
  {
    script_id: "auto_unit_convert",
    name: "Auto Unit Convert",
    filename: "auto_unit_convert.ts",
    category: "utilities",
    description: "Converts between manufacturing units: metric/imperial, SFM/m-min, IPR/mm-rev, PSI/MPa, HP/kW. Handles all common CNC parameter units.",
    language: "typescript",
    interpreter: "node",
    parameters: [
      { name: "value", type: "number", required: true, description: "Value to convert" },
      { name: "from", type: "string", required: true, description: "Source unit" },
      { name: "to", type: "string", required: true, description: "Target unit" }
    ],
    usage_examples: [`node ${PATHS.SCRIPTS}\\auto_unit_convert.ts --value 200 --from "SFM" --to "m/min"`, `node ${PATHS.SCRIPTS}\\auto_unit_convert.ts --value 0.004 --from "IPR" --to "mm/rev"`],
    tags: ["units", "conversion", "metric", "imperial"],
    priority: 6,
    status: "active",
    enabled: true
  },

  // === L5-P1: 14 PASS2 SPECIALTY SCRIPTS (M125-M138) ===
  {
    script_id: "tap_test_processor",
    name: "Tap Test Processor",
    filename: "tap_test_processor.ts",
    category: "analysis",
    description: "Processes FRF (Frequency Response Function) tap test data to generate stability lobe diagrams. Reads accelerometer CSV, computes transfer function, outputs stable RPM zones.",
    language: "typescript",
    interpreter: "node",
    parameters: [
      { name: "inputFile", type: "string", required: true, description: "CSV file with accelerometer data" },
      { name: "toolDiameter", type: "number", required: true, description: "Tool diameter in mm" },
      { name: "flutes", type: "number", required: true, description: "Number of flutes" }
    ],
    usage_examples: [`node ${PATHS.SCRIPTS}\\tap_test_processor.ts --inputFile "tap_data.csv" --toolDiameter 12 --flutes 4`],
    tags: ["frf", "tap-test", "stability-lobe", "vibration", "chatter"],
    priority: 8,
    status: "active",
    enabled: true
  },
  {
    script_id: "oee_calculator",
    name: "OEE Calculator",
    filename: "oee_calculator.ts",
    category: "analysis",
    description: "Calculates Overall Equipment Effectiveness from machine log data: Availability x Performance x Quality. Supports shift-level and machine-level aggregation.",
    language: "typescript",
    interpreter: "node",
    parameters: [
      { name: "machineId", type: "string", required: true, description: "Machine identifier" },
      { name: "period", type: "string", required: false, default: "shift", description: "Aggregation period (shift, day, week, month)" }
    ],
    usage_examples: [`node ${PATHS.SCRIPTS}\\oee_calculator.ts --machineId "VF-2-001" --period "week"`],
    tags: ["oee", "utilization", "availability", "performance", "quality"],
    priority: 7,
    status: "active",
    enabled: true
  },
  {
    script_id: "tool_crib_optimizer",
    name: "Tool Crib Optimizer",
    filename: "tool_crib_optimizer.ts",
    category: "analysis",
    description: "Analyzes tool usage patterns to recommend standard tool list, identify duplicate tools, and suggest consolidation opportunities across machines.",
    language: "typescript",
    interpreter: "node",
    parameters: [
      { name: "period", type: "string", required: false, default: "90d", description: "Analysis period (30d, 60d, 90d, 1y)" }
    ],
    usage_examples: [`node ${PATHS.SCRIPTS}\\tool_crib_optimizer.ts --period "90d"`],
    tags: ["tool-crib", "optimization", "inventory", "standardization"],
    priority: 6,
    status: "active",
    enabled: true
  },
  {
    script_id: "program_comparison",
    name: "Program Comparison",
    filename: "program_comparison.ts",
    category: "utilities",
    description: "Diffs two G-code programs highlighting parameter changes, added/removed blocks, and tool path differences. Ignores comments and whitespace.",
    language: "typescript",
    interpreter: "node",
    parameters: [
      { name: "fileA", type: "string", required: true, description: "First G-code file" },
      { name: "fileB", type: "string", required: true, description: "Second G-code file" }
    ],
    usage_examples: [`node ${PATHS.SCRIPTS}\\program_comparison.ts --fileA "O1000_v1.nc" --fileB "O1000_v2.nc"`],
    tags: ["gcode", "diff", "comparison", "program"],
    priority: 6,
    status: "active",
    enabled: true
  },
  {
    script_id: "machine_capability_study",
    name: "Machine Capability Study",
    filename: "machine_capability_study.ts",
    category: "analysis",
    description: "Runs Cpk study protocol: generates measurement plan, collects data, computes Cp/Cpk/Pp/Ppk with confidence intervals, outputs capability report.",
    language: "typescript",
    interpreter: "node",
    parameters: [
      { name: "dimension", type: "string", required: true, description: "Dimension to study" },
      { name: "nominal", type: "number", required: true, description: "Nominal value" },
      { name: "tolerance", type: "number", required: true, description: "Total tolerance band" },
      { name: "sampleSize", type: "number", required: false, default: 30, description: "Number of samples" }
    ],
    usage_examples: [`node ${PATHS.SCRIPTS}\\machine_capability_study.ts --dimension "bore" --nominal 25.000 --tolerance 0.026 --sampleSize 50`],
    tags: ["cpk", "capability", "study", "quality", "spc"],
    priority: 7,
    status: "active",
    enabled: true
  },
  {
    script_id: "batch_quote_generator",
    name: "Batch Quote Generator",
    filename: "batch_quote_generator.ts",
    category: "analysis",
    description: "Processes batch RFQs: reads multi-part quote request, estimates each part, generates quote package with volume discounts and lead times.",
    language: "typescript",
    interpreter: "node",
    parameters: [
      { name: "rfqFile", type: "string", required: true, description: "RFQ file (CSV or JSON)" },
      { name: "margin", type: "number", required: false, default: 25, description: "Default margin %" }
    ],
    usage_examples: [`node ${PATHS.SCRIPTS}\\batch_quote_generator.ts --rfqFile "rfq_2024_q4.csv" --margin 30`],
    tags: ["quote", "batch", "rfq", "pricing", "business"],
    priority: 7,
    status: "active",
    enabled: true
  },
  {
    script_id: "vendor_catalog_parser",
    name: "Vendor Catalog Parser",
    filename: "vendor_catalog_parser.ts",
    category: "data_processing",
    description: "Parses vendor tool catalog PDFs into structured JSON data for tool registry import. Extracts dimensions, grades, coatings, and recommended parameters.",
    language: "typescript",
    interpreter: "node",
    parameters: [
      { name: "catalogFile", type: "string", required: true, description: "Vendor catalog PDF file" },
      { name: "vendor", type: "string", required: true, description: "Vendor name (sandvik, kennametal, iscar, seco, etc.)" }
    ],
    usage_examples: [`node ${PATHS.SCRIPTS}\\vendor_catalog_parser.ts --catalogFile "sandvik_2024.pdf" --vendor "sandvik"`],
    tags: ["vendor", "catalog", "parser", "tool-data", "import"],
    priority: 6,
    status: "active",
    enabled: true
  },
  {
    script_id: "mtconnect_bridge",
    name: "MTConnect Bridge",
    filename: "mtconnect_bridge.ts",
    category: "api_integration",
    description: "Bridges MTConnect XML stream to PRISM telemetry format. Parses real-time machine data (spindle speed, axis positions, alarms) into PRISM events.",
    language: "typescript",
    interpreter: "node",
    parameters: [
      { name: "agentUrl", type: "string", required: true, description: "MTConnect agent URL" },
      { name: "interval", type: "number", required: false, default: 1000, description: "Poll interval in ms" }
    ],
    usage_examples: [`node ${PATHS.SCRIPTS}\\mtconnect_bridge.ts --agentUrl "http://machine:5000/current"`],
    tags: ["mtconnect", "telemetry", "machine-data", "iot", "streaming"],
    priority: 8,
    status: "active",
    enabled: true
  },
  {
    script_id: "shift_report_generator",
    name: "Shift Report Generator",
    filename: "shift_report_generator.ts",
    category: "utilities",
    description: "Auto-generates shift handoff report: parts produced, scrap, machine status, tool changes, issues, and next-shift priorities.",
    language: "typescript",
    interpreter: "node",
    parameters: [
      { name: "shift", type: "string", required: false, default: "current", description: "Shift identifier (day, swing, night, or current)" }
    ],
    usage_examples: [`node ${PATHS.SCRIPTS}\\shift_report_generator.ts --shift "day"`],
    tags: ["shift", "report", "handoff", "production", "summary"],
    priority: 6,
    status: "active",
    enabled: true
  },
  {
    script_id: "tool_life_regression",
    name: "Tool Life Regression",
    filename: "tool_life_regression.ts",
    category: "analysis",
    description: "Performs regression on actual tool life data to update Taylor C/n constants. Compares predicted vs. actual, adjusts model, outputs updated coefficients.",
    language: "typescript",
    interpreter: "node",
    parameters: [
      { name: "toolId", type: "string", required: true, description: "Tool identifier" },
      { name: "material", type: "string", required: true, description: "Workpiece material" }
    ],
    usage_examples: [`node ${PATHS.SCRIPTS}\\tool_life_regression.ts --toolId "EM-12-4F-ALTIN" --material "4140"`],
    tags: ["tool-life", "taylor", "regression", "wear", "prediction"],
    priority: 7,
    status: "active",
    enabled: true
  },
  {
    script_id: "material_cert_validator",
    name: "Material Cert Validator",
    filename: "material_cert_validator.ts",
    category: "validation",
    description: "Parses material certificate PDFs and validates chemistry, mechanical properties, and heat treatment against specification requirements (AMS, ASTM, DIN).",
    language: "typescript",
    interpreter: "node",
    parameters: [
      { name: "certFile", type: "string", required: true, description: "Material certificate PDF" },
      { name: "spec", type: "string", required: true, description: "Specification to validate against (e.g., AMS 4911, ASTM A564)" }
    ],
    usage_examples: [`node ${PATHS.SCRIPTS}\\material_cert_validator.ts --certFile "heat_lot_A12345.pdf" --spec "AMS 4911"`],
    tags: ["material", "cert", "validation", "traceability", "compliance"],
    priority: 8,
    status: "active",
    enabled: true
  },
  {
    script_id: "fixture_force_validator",
    name: "Fixture Force Validator",
    filename: "fixture_force_validator.ts",
    category: "validation",
    description: "Validates fixture clamping force against cutting force estimates. Computes safety factor, checks deflection, flags insufficient clamping.",
    language: "typescript",
    interpreter: "node",
    parameters: [
      { name: "clampForce", type: "number", required: true, description: "Total clamping force in N" },
      { name: "cuttingParams", type: "string", required: true, description: "JSON with cutting parameters" }
    ],
    usage_examples: [`node ${PATHS.SCRIPTS}\\fixture_force_validator.ts --clampForce 5000 --cuttingParams '{"Fc":1200,"material":"4140"}'`],
    tags: ["fixture", "force", "validation", "safety", "clamping"],
    priority: 8,
    status: "active",
    enabled: true
  },
  {
    script_id: "nc_program_optimizer",
    name: "NC Program Optimizer",
    filename: "nc_program_optimizer.ts",
    category: "utilities",
    description: "Post-processes G-code for optimization: removes redundant moves, optimizes rapid paths, applies arc fitting, constant chip load adjustments.",
    language: "typescript",
    interpreter: "node",
    parameters: [
      { name: "inputFile", type: "string", required: true, description: "Input G-code file" },
      { name: "optimizations", type: "string", required: false, default: "all", description: "Optimizations to apply (rapids, arcs, chipload, all)" }
    ],
    usage_examples: [`node ${PATHS.SCRIPTS}\\nc_program_optimizer.ts --inputFile "O1000.nc" --optimizations "all"`],
    tags: ["gcode", "optimization", "rapids", "arc-fitting", "cycle-time"],
    priority: 7,
    status: "active",
    enabled: true
  },
  {
    script_id: "thermal_model_calibrator",
    name: "Thermal Model Calibrator",
    filename: "thermal_model_calibrator.ts",
    category: "analysis",
    description: "Calibrates machine thermal compensation model from interferometer measurement data. Computes thermal coefficients per axis and temperature range.",
    language: "typescript",
    interpreter: "node",
    parameters: [
      { name: "measurementFile", type: "string", required: true, description: "Interferometer data CSV" },
      { name: "machineId", type: "string", required: true, description: "Machine identifier" }
    ],
    usage_examples: [`node ${PATHS.SCRIPTS}\\thermal_model_calibrator.ts --measurementFile "thermal_survey.csv" --machineId "NV5000-001"`],
    tags: ["thermal", "compensation", "calibration", "interferometer", "precision"],
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
