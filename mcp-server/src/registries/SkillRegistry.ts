/**
 * PRISM MCP Server - Skill Registry
 * Manages 135+ PRISM skills for manufacturing intelligence
 * 
 * Skill Categories (9):
 * - Core Development (prism-cognitive-core, prism-master-equation, etc.)
 * - Monolith Navigation (prism-monolith-index, prism-monolith-navigator)
 * - Materials (prism-material-schema, prism-material-physics, etc.)
 * - Session Management (prism-session-master, prism-quick-start, etc.)
 * - Quality & Validation (prism-validator, prism-quality-master, etc.)
 * - Code & Architecture (prism-code-master, prism-coding-patterns, etc.)
 * - AI & ML (prism-ai-ml-master, prism-algorithm-selector, etc.)
 * - Knowledge (prism-knowledge-master, prism-manufacturing-tables)
 * - Controller Programming (prism-fanuc-programming, prism-siemens-programming, etc.)
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

export type SkillCategory =
  | "core_development"
  | "monolith_navigation"
  | "materials"
  | "session_management"
  | "quality_validation"
  | "code_architecture"
  | "ai_ml"
  | "knowledge"
  | "controller_programming"
  | "extraction"
  | "experts"
  | "formulas"
  | "debugging"
  | "workflow";

export interface SkillDependency {
  skill_id: string;
  optional: boolean;
  purpose: string;
}

export interface SkillTrigger {
  pattern: string;
  description: string;
  examples: string[];
}

export interface Skill {
  skill_id: string;
  name: string;
  filename: string;
  category: SkillCategory;
  description: string;
  version: string;
  
  // Content info
  path: string;
  lines: number;
  size_bytes: number;
  
  // When to use
  triggers: SkillTrigger[];
  use_cases: string[];
  
  // Dependencies
  dependencies: SkillDependency[];
  required_by: string[];
  
  // Tags and metadata
  tags: string[];
  priority: number;  // 1-10, higher = more important
  
  // Status
  status: "active" | "deprecated" | "experimental";
  enabled: boolean;
  
  // Timestamps
  created: string;
  updated: string;
}

// ============================================================================
// SKILL DEFINITIONS (Built-in)
// ============================================================================

const BUILT_IN_SKILLS: Partial<Skill>[] = [
  // =========================================================================
  // CORE DEVELOPMENT
  // =========================================================================
  {
    skill_id: "prism-cognitive-core",
    name: "Cognitive Core",
    filename: "SKILL.md",
    category: "core_development",
    description: "Level 0 Always-On cognitive enhancement with 5 AI/ML patterns and 30 hooks. Master equation Ω(x) computation.",
    version: "2.0.0",
    triggers: [
      { pattern: "cognitive", description: "Cognitive enhancement needed", examples: ["apply cognitive patterns", "use AI reasoning"] },
      { pattern: "omega|quality score", description: "Quality scoring", examples: ["compute Ω(x)", "check quality"] }
    ],
    use_cases: ["Quality scoring", "AI pattern application", "Cognitive enhancement"],
    dependencies: [],
    required_by: ["prism-master-equation", "prism-reasoning-engine"],
    tags: ["cognitive", "core", "ai", "quality"],
    priority: 10,
    status: "active",
    enabled: true
  },
  {
    skill_id: "prism-master-equation",
    name: "Master Equation",
    filename: "SKILL.md",
    category: "core_development",
    description: "Master quality equation Ω(x) v2.0. Integrates 10 components with dual hard constraints.",
    version: "2.0.0",
    triggers: [
      { pattern: "master equation|omega", description: "Quality computation", examples: ["compute master equation", "calculate Ω(x)"] }
    ],
    use_cases: ["Quality scoring", "Output validation", "Process optimization"],
    dependencies: [{ skill_id: "prism-cognitive-core", optional: false, purpose: "Cognitive patterns" }],
    required_by: [],
    tags: ["quality", "equation", "core"],
    priority: 10,
    status: "active",
    enabled: true
  },
  {
    skill_id: "prism-skill-orchestrator",
    name: "Skill Orchestrator",
    filename: "SKILL.md",
    category: "core_development",
    description: "Master integration skill for 37 PRISM skills and 56 API agents.",
    version: "6.0.0",
    triggers: [
      { pattern: "orchestrat|coordinate", description: "Skill coordination", examples: ["orchestrate skills", "coordinate agents"] }
    ],
    use_cases: ["Skill selection", "Agent coordination", "Resource optimization"],
    dependencies: [],
    required_by: [],
    tags: ["orchestration", "coordination", "core"],
    priority: 10,
    status: "active",
    enabled: true
  },

  // =========================================================================
  // QUALITY & VALIDATION
  // =========================================================================
  {
    skill_id: "prism-validator",
    name: "PRISM Validator",
    filename: "SKILL.md",
    category: "quality_validation",
    description: "Automated quality checks. Syntax, ranges, cross-references, physical consistency.",
    version: "1.0.0",
    triggers: [
      { pattern: "validat|check|verify", description: "Validation needed", examples: ["validate data", "check consistency"] }
    ],
    use_cases: ["Data validation", "Syntax checking", "Physical consistency"],
    dependencies: [],
    required_by: ["prism-quality-master"],
    tags: ["validation", "quality", "checking"],
    priority: 9,
    status: "active",
    enabled: true
  },
  {
    skill_id: "prism-quality-master",
    name: "Quality Master",
    filename: "SKILL.md",
    category: "quality_validation",
    description: "Unified quality and validation reference. Consolidates 5 quality skills.",
    version: "1.0.0",
    triggers: [
      { pattern: "quality|standard", description: "Quality standards", examples: ["ensure quality", "check standards"] }
    ],
    use_cases: ["Quality assurance", "Standards compliance", "Output verification"],
    dependencies: [{ skill_id: "prism-validator", optional: false, purpose: "Validation" }],
    required_by: [],
    tags: ["quality", "master", "validation"],
    priority: 9,
    status: "active",
    enabled: true
  },
  {
    skill_id: "prism-safety-framework",
    name: "Safety Framework",
    filename: "SKILL.md",
    category: "quality_validation",
    description: "7 failure modes and 7 defense layers for S(x) score. CRITICAL for manufacturing safety.",
    version: "1.0.0",
    triggers: [
      { pattern: "safety|S\\(x\\)|failure mode", description: "Safety assessment", examples: ["check safety", "compute S(x)"] }
    ],
    use_cases: ["Safety scoring", "Failure mode analysis", "Risk assessment"],
    dependencies: [],
    required_by: ["prism-master-equation"],
    tags: ["safety", "critical", "manufacturing"],
    priority: 10,
    status: "active",
    enabled: true
  },
  {
    skill_id: "prism-reasoning-engine",
    name: "Reasoning Engine",
    filename: "SKILL.md",
    category: "quality_validation",
    description: "12 reasoning metrics for R(x) score. Validates logical consistency, evidence quality, and inference validity.",
    version: "1.0.0",
    triggers: [
      { pattern: "reason|R\\(x\\)|logic", description: "Reasoning assessment", examples: ["validate reasoning", "check logic"] }
    ],
    use_cases: ["Reasoning scoring", "Logic validation", "Evidence assessment"],
    dependencies: [],
    required_by: ["prism-master-equation"],
    tags: ["reasoning", "logic", "quality"],
    priority: 8,
    status: "active",
    enabled: true
  },
  {
    skill_id: "prism-code-perfection",
    name: "Code Perfection",
    filename: "SKILL.md",
    category: "quality_validation",
    description: "11 code quality metrics for C(x) score. Covers structure, patterns, error handling, and maintainability.",
    version: "1.0.0",
    triggers: [
      { pattern: "code quality|C\\(x\\)", description: "Code assessment", examples: ["check code quality", "compute C(x)"] }
    ],
    use_cases: ["Code quality scoring", "Pattern validation", "Maintainability assessment"],
    dependencies: [],
    required_by: ["prism-master-equation"],
    tags: ["code", "quality", "patterns"],
    priority: 8,
    status: "active",
    enabled: true
  },
  {
    skill_id: "prism-process-optimizer",
    name: "Process Optimizer",
    filename: "SKILL.md",
    category: "quality_validation",
    description: "12 process metrics for P(x) score. Optimizes workflows, checkpoints, and efficiency.",
    version: "1.0.0",
    triggers: [
      { pattern: "process|P\\(x\\)|workflow", description: "Process optimization", examples: ["optimize process", "check workflow"] }
    ],
    use_cases: ["Process scoring", "Workflow optimization", "Efficiency assessment"],
    dependencies: [],
    required_by: ["prism-master-equation"],
    tags: ["process", "optimization", "workflow"],
    priority: 8,
    status: "active",
    enabled: true
  },

  // =========================================================================
  // SESSION MANAGEMENT
  // =========================================================================
  {
    skill_id: "prism-session-master",
    name: "Session Master",
    filename: "SKILL.md",
    category: "session_management",
    description: "Unified session management. Lifecycle, context pressure, state persistence, recovery.",
    version: "1.0.0",
    triggers: [
      { pattern: "session|state|context", description: "Session management", examples: ["manage session", "save state"] }
    ],
    use_cases: ["Session lifecycle", "State persistence", "Context management"],
    dependencies: [],
    required_by: ["prism-quick-start"],
    tags: ["session", "state", "management"],
    priority: 9,
    status: "active",
    enabled: true
  },
  {
    skill_id: "prism-quick-start",
    name: "Quick Start",
    filename: "SKILL.md",
    category: "session_management",
    description: "Fast session initialization. 30-second resume capability.",
    version: "1.0.0",
    triggers: [
      { pattern: "quick start|resume|init", description: "Fast initialization", examples: ["quick start", "resume session"] }
    ],
    use_cases: ["Session initialization", "Quick resume", "Fast startup"],
    dependencies: [{ skill_id: "prism-session-master", optional: false, purpose: "Session management" }],
    required_by: [],
    tags: ["startup", "resume", "quick"],
    priority: 8,
    status: "active",
    enabled: true
  },
  {
    skill_id: "prism-session-buffer",
    name: "Session Buffer",
    filename: "SKILL.md",
    category: "session_management",
    description: "Graceful session limit management with buffer zones. Prevents lost progress.",
    version: "1.0.0",
    triggers: [
      { pattern: "buffer|limit|context window", description: "Buffer management", examples: ["check buffer", "manage limits"] }
    ],
    use_cases: ["Buffer zone monitoring", "Context limit management", "Progress protection"],
    dependencies: [],
    required_by: [],
    tags: ["buffer", "limits", "protection"],
    priority: 8,
    status: "active",
    enabled: true
  },
  {
    skill_id: "prism-task-continuity",
    name: "Task Continuity",
    filename: "SKILL.md",
    category: "session_management",
    description: "Task state preservation across sessions and compactions.",
    version: "1.0.0",
    triggers: [
      { pattern: "continuity|preserve|compaction", description: "Task continuity", examples: ["preserve state", "handle compaction"] }
    ],
    use_cases: ["State preservation", "Compaction recovery", "Task continuity"],
    dependencies: [],
    required_by: [],
    tags: ["continuity", "preservation", "recovery"],
    priority: 8,
    status: "active",
    enabled: true
  },
  {
    skill_id: "prism-state-manager",
    name: "State Manager",
    filename: "SKILL.md",
    category: "session_management",
    description: "CURRENT_STATE.json management. Read, update, and recovery protocols.",
    version: "1.0.0",
    triggers: [
      { pattern: "CURRENT_STATE|state file", description: "State file management", examples: ["read state", "update state file"] }
    ],
    use_cases: ["State file operations", "Recovery protocols", "State tracking"],
    dependencies: [],
    required_by: [],
    tags: ["state", "file", "management"],
    priority: 9,
    status: "active",
    enabled: true
  },

  // =========================================================================
  // MATERIALS
  // =========================================================================
  {
    skill_id: "prism-material-schema",
    name: "Material Schema",
    filename: "SKILL.md",
    category: "materials",
    description: "Complete 127-parameter material structure. All categories and relationships defined.",
    version: "1.0.0",
    triggers: [
      { pattern: "material schema|127 param", description: "Material structure", examples: ["material schema", "parameter structure"] }
    ],
    use_cases: ["Material data structure", "Parameter definitions", "Schema validation"],
    dependencies: [],
    required_by: ["prism-material-physics", "prism-material-validator"],
    tags: ["materials", "schema", "structure"],
    priority: 9,
    status: "active",
    enabled: true
  },
  {
    skill_id: "prism-material-physics",
    name: "Material Physics",
    filename: "SKILL.md",
    category: "materials",
    description: "Physics formulas using material parameters. Kienzle, Johnson-Cook, Taylor equations.",
    version: "2.0.0",
    triggers: [
      { pattern: "kienzle|johnson.cook|taylor|cutting force", description: "Material physics", examples: ["calculate forces", "apply Kienzle"] }
    ],
    use_cases: ["Force calculations", "Tool life prediction", "Constitutive modeling"],
    dependencies: [{ skill_id: "prism-material-schema", optional: false, purpose: "Material parameters" }],
    required_by: [],
    tags: ["physics", "materials", "calculations"],
    priority: 9,
    status: "active",
    enabled: true
  },
  {
    skill_id: "prism-material-lookup",
    name: "Material Lookup",
    filename: "SKILL.md",
    category: "materials",
    description: "Fast access patterns for material data. Search, filter, and caching strategies.",
    version: "1.0.0",
    triggers: [
      { pattern: "material lookup|find material|search material", description: "Material search", examples: ["find material", "lookup 4140"] }
    ],
    use_cases: ["Material search", "Fast lookup", "Caching"],
    dependencies: [],
    required_by: [],
    tags: ["materials", "lookup", "search"],
    priority: 7,
    status: "active",
    enabled: true
  },
  {
    skill_id: "prism-material-validator",
    name: "Material Validator",
    filename: "SKILL.md",
    category: "materials",
    description: "Validates material data completeness and physical consistency.",
    version: "1.0.0",
    triggers: [
      { pattern: "validate material|material consistency", description: "Material validation", examples: ["validate material", "check consistency"] }
    ],
    use_cases: ["Material validation", "Consistency checking", "Completeness verification"],
    dependencies: [{ skill_id: "prism-material-schema", optional: false, purpose: "Schema" }],
    required_by: [],
    tags: ["materials", "validation", "consistency"],
    priority: 8,
    status: "active",
    enabled: true
  },
  {
    skill_id: "prism-material-enhancer",
    name: "Material Enhancer",
    filename: "SKILL.md",
    category: "materials",
    description: "Enhancement workflows for 100% parameter coverage. Gap filling and estimation.",
    version: "1.0.0",
    triggers: [
      { pattern: "enhance material|fill gaps|estimate param", description: "Material enhancement", examples: ["enhance material", "fill parameters"] }
    ],
    use_cases: ["Parameter estimation", "Gap filling", "Data enhancement"],
    dependencies: [],
    required_by: [],
    tags: ["materials", "enhancement", "estimation"],
    priority: 7,
    status: "active",
    enabled: true
  },

  // =========================================================================
  // CONTROLLER PROGRAMMING
  // =========================================================================
  {
    skill_id: "prism-fanuc-programming",
    name: "FANUC Programming",
    filename: "SKILL.md",
    category: "controller_programming",
    description: "Complete FANUC CNC programming reference. G-codes, M-codes, macros, alarms.",
    version: "1.0.0",
    triggers: [
      { pattern: "fanuc|fanuc g.code|fanuc alarm", description: "FANUC programming", examples: ["FANUC G-code", "FANUC macro"] }
    ],
    use_cases: ["FANUC programming", "G-code reference", "Alarm troubleshooting"],
    dependencies: [],
    required_by: [],
    tags: ["fanuc", "controller", "programming"],
    priority: 8,
    status: "active",
    enabled: true
  },
  {
    skill_id: "prism-siemens-programming",
    name: "Siemens Programming",
    filename: "SKILL.md",
    category: "controller_programming",
    description: "Siemens SINUMERIK programming reference. 840D/828D controllers.",
    version: "1.0.0",
    triggers: [
      { pattern: "siemens|sinumerik|840d|828d", description: "Siemens programming", examples: ["Siemens G-code", "SINUMERIK"] }
    ],
    use_cases: ["Siemens programming", "SINUMERIK reference", "Controller setup"],
    dependencies: [],
    required_by: [],
    tags: ["siemens", "sinumerik", "controller"],
    priority: 8,
    status: "active",
    enabled: true
  },
  {
    skill_id: "prism-heidenhain-programming",
    name: "Heidenhain Programming",
    filename: "SKILL.md",
    category: "controller_programming",
    description: "Heidenhain TNC programming reference. Conversational and ISO modes.",
    version: "1.0.0",
    triggers: [
      { pattern: "heidenhain|tnc|conversational", description: "Heidenhain programming", examples: ["Heidenhain TNC", "conversational programming"] }
    ],
    use_cases: ["Heidenhain programming", "TNC reference", "Conversational mode"],
    dependencies: [],
    required_by: [],
    tags: ["heidenhain", "tnc", "controller"],
    priority: 8,
    status: "active",
    enabled: true
  },
  {
    skill_id: "prism-gcode-reference",
    name: "G-Code Reference",
    filename: "SKILL.md",
    category: "controller_programming",
    description: "Universal G-code reference. Cross-controller compatibility tables.",
    version: "1.0.0",
    triggers: [
      { pattern: "g.code|m.code|nc code", description: "G-code reference", examples: ["G-code list", "M-code meaning"] }
    ],
    use_cases: ["G-code lookup", "Cross-controller compatibility", "Code reference"],
    dependencies: [],
    required_by: [],
    tags: ["gcode", "reference", "universal"],
    priority: 8,
    status: "active",
    enabled: true
  },

  // =========================================================================
  // AI & ML
  // =========================================================================
  {
    skill_id: "prism-ai-ml-master",
    name: "AI/ML Master",
    filename: "SKILL.md",
    category: "ai_ml",
    description: "Unified AI/ML reference. Algorithm selection and implementation.",
    version: "1.0.0",
    triggers: [
      { pattern: "ai|ml|machine learning|algorithm", description: "AI/ML reference", examples: ["select algorithm", "ML approach"] }
    ],
    use_cases: ["Algorithm selection", "ML implementation", "AI patterns"],
    dependencies: [],
    required_by: [],
    tags: ["ai", "ml", "algorithms"],
    priority: 8,
    status: "active",
    enabled: true
  },
  {
    skill_id: "prism-algorithm-selector",
    name: "Algorithm Selector",
    filename: "SKILL.md",
    category: "ai_ml",
    description: "Problem to algorithm mapping. Decision trees for algorithm selection.",
    version: "1.0.0",
    triggers: [
      { pattern: "which algorithm|select algorithm|best algorithm", description: "Algorithm selection", examples: ["which algorithm", "best approach"] }
    ],
    use_cases: ["Algorithm selection", "Problem matching", "Decision support"],
    dependencies: [],
    required_by: [],
    tags: ["algorithms", "selection", "decision"],
    priority: 7,
    status: "active",
    enabled: true
  },
  {
    skill_id: "prism-universal-formulas",
    name: "Universal Formulas",
    filename: "SKILL.md",
    category: "formulas",
    description: "109 formulas across 20 domains. Manufacturing physics, optimization, statistics, and AI/ML.",
    version: "1.0.0",
    triggers: [
      { pattern: "formula|equation|calculation", description: "Formula reference", examples: ["find formula", "cutting force equation"] }
    ],
    use_cases: ["Formula lookup", "Calculation reference", "Physics equations"],
    dependencies: [],
    required_by: [],
    tags: ["formulas", "equations", "reference"],
    priority: 9,
    status: "active",
    enabled: true
  },

  // =========================================================================
  // MONOLITH NAVIGATION
  // =========================================================================
  {
    skill_id: "prism-monolith-index",
    name: "Monolith Index",
    filename: "SKILL.md",
    category: "monolith_navigation",
    description: "Complete indexed map of v8.89 monolith. 986,621 lines, 831 modules cataloged.",
    version: "1.0.0",
    triggers: [
      { pattern: "monolith|v8.89|module index", description: "Monolith navigation", examples: ["find in monolith", "module location"] }
    ],
    use_cases: ["Module lookup", "Monolith navigation", "Code location"],
    dependencies: [],
    required_by: ["prism-monolith-navigator", "prism-monolith-extractor"],
    tags: ["monolith", "index", "navigation"],
    priority: 7,
    status: "active",
    enabled: true
  },
  {
    skill_id: "prism-monolith-navigator",
    name: "Monolith Navigator",
    filename: "SKILL.md",
    category: "monolith_navigation",
    description: "Search strategies for finding functionality in monolith. Pattern recognition.",
    version: "1.0.0",
    triggers: [
      { pattern: "navigate monolith|find function|search code", description: "Code navigation", examples: ["find function", "locate code"] }
    ],
    use_cases: ["Code search", "Function location", "Pattern finding"],
    dependencies: [{ skill_id: "prism-monolith-index", optional: false, purpose: "Index" }],
    required_by: [],
    tags: ["monolith", "navigation", "search"],
    priority: 7,
    status: "active",
    enabled: true
  },
  {
    skill_id: "prism-monolith-extractor",
    name: "Monolith Extractor",
    filename: "SKILL.md",
    category: "monolith_navigation",
    description: "Protocols for safely extracting code from monolith. Validation and rollback.",
    version: "1.0.0",
    triggers: [
      { pattern: "extract|pull from monolith|isolate module", description: "Code extraction", examples: ["extract module", "isolate code"] }
    ],
    use_cases: ["Module extraction", "Code isolation", "Safe extraction"],
    dependencies: [{ skill_id: "prism-monolith-index", optional: false, purpose: "Index" }],
    required_by: [],
    tags: ["monolith", "extraction", "migration"],
    priority: 7,
    status: "active",
    enabled: true
  },

  // =========================================================================
  // CODE & ARCHITECTURE
  // =========================================================================
  {
    skill_id: "prism-code-master",
    name: "Code Master",
    filename: "SKILL.md",
    category: "code_architecture",
    description: "Unified code and architecture reference. Patterns, algorithms, dependencies.",
    version: "1.0.0",
    triggers: [
      { pattern: "code pattern|architecture|dependency", description: "Code reference", examples: ["code pattern", "architecture guide"] }
    ],
    use_cases: ["Pattern reference", "Architecture guidance", "Dependency management"],
    dependencies: [],
    required_by: [],
    tags: ["code", "architecture", "patterns"],
    priority: 8,
    status: "active",
    enabled: true
  },
  {
    skill_id: "prism-coding-patterns",
    name: "Coding Patterns",
    filename: "SKILL.md",
    category: "code_architecture",
    description: "MIT-based coding patterns. SOLID, DRY, design patterns for PRISM.",
    version: "1.0.0",
    triggers: [
      { pattern: "solid|dry|design pattern|best practice", description: "Coding patterns", examples: ["SOLID principles", "design pattern"] }
    ],
    use_cases: ["Pattern application", "Best practices", "Code quality"],
    dependencies: [],
    required_by: [],
    tags: ["patterns", "solid", "design"],
    priority: 7,
    status: "active",
    enabled: true
  },
  {
    skill_id: "prism-api-contracts",
    name: "API Contracts",
    filename: "SKILL.md",
    category: "code_architecture",
    description: "Complete API interface definitions. 500+ gateway routes.",
    version: "1.0.0",
    triggers: [
      { pattern: "api|endpoint|route|contract", description: "API reference", examples: ["API endpoint", "route definition"] }
    ],
    use_cases: ["API design", "Route reference", "Contract definition"],
    dependencies: [],
    required_by: [],
    tags: ["api", "contracts", "routes"],
    priority: 8,
    status: "active",
    enabled: true
  },

  // =========================================================================
  // KNOWLEDGE
  // =========================================================================
  {
    skill_id: "prism-knowledge-master",
    name: "Knowledge Master",
    filename: "SKILL.md",
    category: "knowledge",
    description: "Unified knowledge access. MIT/Stanford course integration.",
    version: "1.0.0",
    triggers: [
      { pattern: "knowledge|course|learning", description: "Knowledge access", examples: ["find course", "knowledge base"] }
    ],
    use_cases: ["Knowledge lookup", "Course reference", "Learning resources"],
    dependencies: [],
    required_by: [],
    tags: ["knowledge", "courses", "learning"],
    priority: 7,
    status: "active",
    enabled: true
  },
  {
    skill_id: "prism-manufacturing-tables",
    name: "Manufacturing Tables",
    filename: "SKILL.md",
    category: "knowledge",
    description: "Complete manufacturing reference tables. Thread specs, tolerances.",
    version: "1.0.0",
    triggers: [
      { pattern: "thread|tolerance|reference table", description: "Manufacturing tables", examples: ["thread spec", "tolerance chart"] }
    ],
    use_cases: ["Thread lookup", "Tolerance reference", "Standards"],
    dependencies: [],
    required_by: [],
    tags: ["manufacturing", "tables", "reference"],
    priority: 8,
    status: "active",
    enabled: true
  },
  {
    skill_id: "prism-error-catalog",
    name: "Error Catalog",
    filename: "SKILL.md",
    category: "knowledge",
    description: "Comprehensive error reference. Codes 1000-9999 with causes and fixes.",
    version: "1.0.0",
    triggers: [
      { pattern: "error|error code|troubleshoot", description: "Error reference", examples: ["error 1001", "troubleshoot issue"] }
    ],
    use_cases: ["Error lookup", "Troubleshooting", "Fix procedures"],
    dependencies: [],
    required_by: [],
    tags: ["errors", "troubleshooting", "catalog"],
    priority: 8,
    status: "active",
    enabled: true
  },

  // =========================================================================
  // DEBUGGING & WORKFLOW
  // =========================================================================
  {
    skill_id: "prism-debugging",
    name: "Debugging",
    filename: "SKILL.md",
    category: "debugging",
    description: "General debugging patterns and techniques.",
    version: "1.0.0",
    triggers: [
      { pattern: "debug|bug|issue|problem", description: "Debugging", examples: ["debug issue", "find bug"] }
    ],
    use_cases: ["Bug finding", "Issue resolution", "Problem solving"],
    dependencies: [],
    required_by: ["prism-sp-debugging"],
    tags: ["debugging", "troubleshooting"],
    priority: 8,
    status: "active",
    enabled: true
  },
  {
    skill_id: "prism-sp-debugging",
    name: "SP Debugging",
    filename: "SKILL.md",
    category: "debugging",
    description: "4-phase debugging process. Evidence collection, root cause, hypothesis testing, fix with prevention.",
    version: "1.0.0",
    triggers: [
      { pattern: "systematic debug|root cause|hypothesis", description: "Systematic debugging", examples: ["find root cause", "systematic debug"] }
    ],
    use_cases: ["Root cause analysis", "Systematic debugging", "Prevention"],
    dependencies: [{ skill_id: "prism-debugging", optional: false, purpose: "Base debugging" }],
    required_by: [],
    tags: ["debugging", "systematic", "root-cause"],
    priority: 8,
    status: "active",
    enabled: true
  },
  {
    skill_id: "prism-error-recovery",
    name: "Error Recovery",
    filename: "SKILL.md",
    category: "debugging",
    description: "Error recovery strategies and fallback procedures.",
    version: "1.0.0",
    triggers: [
      { pattern: "recover|fallback|error handling", description: "Error recovery", examples: ["recover from error", "fallback plan"] }
    ],
    use_cases: ["Error recovery", "Fallback procedures", "Graceful degradation"],
    dependencies: [],
    required_by: [],
    tags: ["recovery", "fallback", "errors"],
    priority: 8,
    status: "active",
    enabled: true
  },

  // =========================================================================
  // WORKFLOW PROCEDURES
  // =========================================================================
  {
    skill_id: "prism-sp-brainstorm",
    name: "SP Brainstorm",
    filename: "SKILL.md",
    category: "workflow",
    description: "Socratic design methodology. MANDATORY STOP before implementation with chunked approval.",
    version: "1.0.0",
    triggers: [
      { pattern: "brainstorm|design|plan", description: "Brainstorming", examples: ["brainstorm approach", "design solution"] }
    ],
    use_cases: ["Design planning", "Solution brainstorming", "Approach selection"],
    dependencies: [],
    required_by: [],
    tags: ["workflow", "brainstorm", "design"],
    priority: 9,
    status: "active",
    enabled: true
  },
  {
    skill_id: "prism-sp-planning",
    name: "SP Planning",
    filename: "SKILL.md",
    category: "workflow",
    description: "Detailed task planning. Creates 2-5 minute executable tasks with zero ambiguity.",
    version: "1.0.0",
    triggers: [
      { pattern: "plan task|break down|decompose", description: "Task planning", examples: ["plan tasks", "break down work"] }
    ],
    use_cases: ["Task planning", "Work breakdown", "Execution planning"],
    dependencies: [],
    required_by: [],
    tags: ["workflow", "planning", "tasks"],
    priority: 9,
    status: "active",
    enabled: true
  },
  {
    skill_id: "prism-sp-execution",
    name: "SP Execution",
    filename: "SKILL.md",
    category: "workflow",
    description: "Checkpoint execution with progress tracking. Safe interruption and state persistence.",
    version: "1.0.0",
    triggers: [
      { pattern: "execute|checkpoint|progress", description: "Task execution", examples: ["execute plan", "checkpoint progress"] }
    ],
    use_cases: ["Task execution", "Progress tracking", "Checkpointing"],
    dependencies: [],
    required_by: [],
    tags: ["workflow", "execution", "checkpoints"],
    priority: 9,
    status: "active",
    enabled: true
  },
  {
    skill_id: "prism-sp-review-quality",
    name: "SP Review Quality",
    filename: "SKILL.md",
    category: "workflow",
    description: "Code quality gate. Patterns, style, API contracts, 10 Commandments verification.",
    version: "1.0.0",
    triggers: [
      { pattern: "review quality|code review|quality check", description: "Quality review", examples: ["review code quality", "check patterns"] }
    ],
    use_cases: ["Code review", "Quality gates", "Pattern verification"],
    dependencies: [],
    required_by: [],
    tags: ["workflow", "review", "quality"],
    priority: 8,
    status: "active",
    enabled: true
  },
  {
    skill_id: "prism-sp-review-spec",
    name: "SP Review Spec",
    filename: "SKILL.md",
    category: "workflow",
    description: "Specification compliance gate. Verifies output matches approved design.",
    version: "1.0.0",
    triggers: [
      { pattern: "review spec|verify spec|compliance", description: "Spec review", examples: ["verify against spec", "check compliance"] }
    ],
    use_cases: ["Spec verification", "Compliance checking", "Design validation"],
    dependencies: [],
    required_by: [],
    tags: ["workflow", "review", "specification"],
    priority: 8,
    status: "active",
    enabled: true
  },
  {
    skill_id: "prism-sp-verification",
    name: "SP Verification",
    filename: "SKILL.md",
    category: "workflow",
    description: "Evidence-based completion proof. Level 5 verification standards.",
    version: "1.0.0",
    triggers: [
      { pattern: "verify|evidence|proof", description: "Verification", examples: ["verify completion", "provide evidence"] }
    ],
    use_cases: ["Completion verification", "Evidence collection", "Proof"],
    dependencies: [],
    required_by: [],
    tags: ["workflow", "verification", "evidence"],
    priority: 8,
    status: "active",
    enabled: true
  },
  {
    skill_id: "prism-sp-handoff",
    name: "SP Handoff",
    filename: "SKILL.md",
    category: "workflow",
    description: "Session transition protocol. State capture and next-session preparation.",
    version: "1.0.0",
    triggers: [
      { pattern: "handoff|transition|next session", description: "Session handoff", examples: ["prepare handoff", "session transition"] }
    ],
    use_cases: ["Session handoff", "State capture", "Transition preparation"],
    dependencies: [],
    required_by: [],
    tags: ["workflow", "handoff", "transition"],
    priority: 8,
    status: "active",
    enabled: true
  },

  // =========================================================================
  // DEVELOPMENT UTILITIES
  // =========================================================================
  {
    skill_id: "prism-dev-utilities",
    name: "Dev Utilities",
    filename: "SKILL.md",
    category: "core_development",
    description: "Unified development utilities. 8 tools consolidated.",
    version: "1.0.0",
    triggers: [
      { pattern: "utility|helper|tool", description: "Dev utilities", examples: ["use utility", "helper function"] }
    ],
    use_cases: ["Utility functions", "Helper tools", "Development aids"],
    dependencies: [],
    required_by: [],
    tags: ["utilities", "development", "tools"],
    priority: 6,
    status: "active",
    enabled: true
  },
  {
    skill_id: "prism-tdd",
    name: "TDD Framework",
    filename: "SKILL.md",
    category: "core_development",
    description: "Enhanced Test-Driven Development with RED-GREEN-REFACTOR cycle for manufacturing.",
    version: "1.0.0",
    triggers: [
      { pattern: "tdd|test driven|unit test", description: "TDD", examples: ["write tests", "TDD approach"] }
    ],
    use_cases: ["Test development", "TDD workflow", "Quality assurance"],
    dependencies: [],
    required_by: [],
    tags: ["tdd", "testing", "development"],
    priority: 7,
    status: "active",
    enabled: true
  },

  // =========================================================================
  // EXTRACTION
  // =========================================================================
  {
    skill_id: "prism-extraction-orchestrator",
    name: "Extraction Orchestrator",
    filename: "SKILL.md",
    category: "extraction",
    description: "Multi-agent extraction coordination.",
    version: "1.0.0",
    triggers: [
      { pattern: "extract|orchestrate extraction|bulk extract", description: "Extraction orchestration", examples: ["orchestrate extraction", "bulk extract"] }
    ],
    use_cases: ["Bulk extraction", "Extraction coordination", "Multi-agent extraction"],
    dependencies: [],
    required_by: [],
    tags: ["extraction", "orchestration"],
    priority: 7,
    status: "active",
    enabled: true
  },

  // =========================================================================
  // EXPERTS
  // =========================================================================
  {
    skill_id: "prism-expert-master",
    name: "Expert Master",
    filename: "SKILL.md",
    category: "experts",
    description: "Unified AI expert team reference. Consolidates 10 domain experts.",
    version: "1.0.0",
    triggers: [
      { pattern: "expert|specialist|domain expert", description: "Expert access", examples: ["consult expert", "domain specialist"] }
    ],
    use_cases: ["Expert consultation", "Domain expertise", "Specialist advice"],
    dependencies: [],
    required_by: [],
    tags: ["experts", "domain", "consultation"],
    priority: 7,
    status: "active",
    enabled: true
  }
];

// ============================================================================
// SKILL REGISTRY
// ============================================================================

export class SkillRegistry extends BaseRegistry<Skill> {
  private indexByCategory: Map<SkillCategory, Set<string>> = new Map();
  private indexByTag: Map<string, Set<string>> = new Map();
  private indexByTrigger: Map<string, Set<string>> = new Map();
  private builtInSkills: Map<string, Partial<Skill>> = new Map();

  constructor() {
    super("skills", path.join(PATHS.STATE_DIR, "skill-registry.json"), "1.0.0");
    this.initializeBuiltInSkills();
  }

  /**
   * Initialize built-in skill definitions
   */
  private initializeBuiltInSkills(): void {
    for (const skill of BUILT_IN_SKILLS) {
      if (skill.skill_id) {
        this.builtInSkills.set(skill.skill_id, skill);
      }
    }
    log.debug(`Initialized ${this.builtInSkills.size} built-in skill definitions`);
  }

  /**
   * Load skills from filesystem and merge with built-ins
   */
  async load(): Promise<void> {
    if (this.loaded) return;
    
    log.info("Loading SkillRegistry...");
    
    // Load from skills directories
    await this.loadFromPath(PATHS.SKILLS);

    // R1-AUDIT-T4: Built-in metadata is used ONLY for enrichment when matching
    // skill directories exist on disk (see loadFromPath → line 1131). No phantom
    // entries are created for non-existent skills. 212 skills discovered from disk,
    // 48 enriched with BUILT_IN_SKILLS metadata, 8 phantoms eliminated (2026-02-20).

    this.buildIndexes();
    
    this.loaded = true;
    log.info(`SkillRegistry loaded: ${this.entries.size} skills`);
  }

  /**
   * Load skills from a directory
   */
  private async loadFromPath(basePath: string): Promise<void> {
    try {
      if (!await fileExists(basePath)) {
        log.debug(`Skills path does not exist: ${basePath}`);
        return;
      }
      
      const entries = await listDirectory(basePath);
      const dirs = entries.filter(e => e.isDirectory);
      
      for (const dir of dirs) {
        try {
          const skillPath = path.join(dir.path, "SKILL.md");
          
          if (await fileExists(skillPath)) {
            const stats = await fs.stat(skillPath);
            const content = await fs.readFile(skillPath, "utf-8");
            const lines = content.split("\n").length;
            
            // Get built-in definition if exists
            const builtIn = this.builtInSkills.get(dir.name) || {};
            
            const skill: Skill = {
              skill_id: dir.name,
              name: builtIn.name || dir.name.replace(/^prism-/, "").replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase()),
              filename: "SKILL.md",
              category: builtIn.category || this.inferCategory(dir.name),
              description: builtIn.description || this.extractDescription(content),
              version: builtIn.version || "1.0.0",
              path: skillPath,
              lines,
              size_bytes: stats.size,
              triggers: builtIn.triggers || [],
              use_cases: builtIn.use_cases || [],
              dependencies: builtIn.dependencies || [],
              required_by: builtIn.required_by || [],
              tags: builtIn.tags || this.extractTags(dir.name, content),
              priority: builtIn.priority || 5,
              status: builtIn.status || "active",
              enabled: builtIn.enabled ?? true,
              created: builtIn.created || "2026-01-01",
              updated: new Date(stats.mtime).toISOString().split("T")[0]
            };
            
            this.set(dir.name, skill);
          }
        } catch (err) {
          log.warn(`Failed to load skill ${dir.name}: ${err}`);
        }
      }
    } catch (err) {
      log.warn(`Failed to load skills from ${basePath}: ${err}`);
    }
  }

  /**
   * Infer category from skill ID
   */
  private inferCategory(skillId: string): SkillCategory {
    if (skillId.includes("material")) return "materials";
    if (skillId.includes("session") || skillId.includes("state")) return "session_management";
    if (skillId.includes("valid") || skillId.includes("quality") || skillId.includes("safety") || skillId.includes("reason") || skillId.includes("code-perf") || skillId.includes("process-opt")) return "quality_validation";
    if (skillId.includes("monolith")) return "monolith_navigation";
    if (skillId.includes("fanuc") || skillId.includes("siemens") || skillId.includes("heidenhain") || skillId.includes("gcode")) return "controller_programming";
    if (skillId.includes("ai") || skillId.includes("algorithm")) return "ai_ml";
    if (skillId.includes("formula")) return "formulas";
    if (skillId.includes("debug") || skillId.includes("error")) return "debugging";
    if (skillId.includes("sp-") || skillId.includes("workflow")) return "workflow";
    if (skillId.includes("extract")) return "extraction";
    if (skillId.includes("expert")) return "experts";
    if (skillId.includes("code") || skillId.includes("api") || skillId.includes("pattern")) return "code_architecture";
    if (skillId.includes("knowledge") || skillId.includes("manufacturing") || skillId.includes("table")) return "knowledge";
    return "core_development";
  }

  /**
   * Extract description from SKILL.md content
   * Supports YAML front-matter (---\nkey: value\n---) and plain markdown
   */
  private extractDescription(content: string): string {
    // 1. Try YAML front-matter description field first
    const yamlMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (yamlMatch) {
      const yamlBlock = yamlMatch[1];
      // Handle multi-line description (description: |\n  line1\n  line2)
      // Multi-line block: indented lines after "description: |", ends at unindented line
      const multiLineDesc = yamlBlock.match(/description:\s*\|\s*\r?\n((?:[ \t]+[^\r\n]*\r?\n?)*)/);
      if (multiLineDesc) {
        const desc = multiLineDesc[1].split(/\r?\n/).map((l: string) => l.trim()).filter(Boolean).join(" ");
        if (desc && desc !== "---" && desc.length > 3) return desc.slice(0, 300);
      }
      // Handle single-line description (description: Some text here)
      // Exclude pipe char which indicates multi-line block
      const singleLineDesc = yamlBlock.match(/description:\s*([^|\r\n][^\r\n]*)/);
      if (singleLineDesc) {
        const desc = singleLineDesc[1].trim();
        if (desc && desc !== "---" && desc.length > 3) return desc.slice(0, 300);
      }
    }

    // 2. Try embedded YAML in code block (```yaml\nname:...\ndescription:...\n```)
    const embeddedYaml = content.match(/```yaml\r?\n[\s\S]*?description:\s*([^|\r\n][^\r\n]*)/);
    if (embeddedYaml) {
      const desc = embeddedYaml[1].trim();
      if (desc && desc.length > 10) return desc.slice(0, 300);
    }

    // 3. Try markdown heading followed by paragraph  
    const descMatch = content.match(/^#[^#].*?\n\n([^\n#-][^\n]+)/m);
    if (descMatch) {
      const desc = descMatch[1].trim();
      if (desc && desc !== "---" && desc.length > 10) return desc.slice(0, 300);
    }

    // 4. Try "Overview" or "Purpose" section content
    const overviewMatch = content.match(/##?\s*(?:OVERVIEW|Purpose|Summary|Description)\s*\r?\n+([^\n#][^\n]+)/mi);
    if (overviewMatch) {
      const desc = overviewMatch[1].trim();
      if (desc && desc.length > 10) return desc.slice(0, 300);
    }

    // 5. Build from title: extract # heading text as description
    const titleMatch = content.match(/^#\s+(?:PRISM\s+)?(?:SKILL:\s*)?(.+)/m);
    if (titleMatch) {
      const title = titleMatch[1].replace(/[═#*]/g, "").trim();
      if (title && title.length > 5) return title.slice(0, 300);
    }
    
    // 6. Fallback: first substantive non-heading, non-delimiter line
    const lines = content.split("\n").filter(l => {
      const trimmed = l.trim();
      return trimmed && trimmed.length > 10 && !trimmed.startsWith("#") && trimmed !== "---" 
        && !trimmed.startsWith("name:") && !trimmed.startsWith("```") && !trimmed.startsWith("═");
    });
    return lines[0]?.trim().slice(0, 300) || "";
  }

  /**
   * Extract tags from skill ID and content
   */
  private extractTags(skillId: string, _content: string): string[] {
    const tags: string[] = [];
    const parts = skillId.replace(/^prism-/, "").split("-");
    tags.push(...parts.filter(p => p.length > 2));
    return [...new Set(tags)];
  }

  /**
   * Build search indexes
   */
  private buildIndexes(): void {
    this.indexByCategory.clear();
    this.indexByTag.clear();
    this.indexByTrigger.clear();
    
    for (const [id, entry] of this.entries) {
      const skill = entry.data;
      
      // Index by category
      if (!this.indexByCategory.has(skill.category)) {
        this.indexByCategory.set(skill.category, new Set());
      }
      this.indexByCategory.get(skill.category)?.add(id);
      
      // Index by tags
      for (const tag of skill.tags || []) {
        if (!this.indexByTag.has(tag)) {
          this.indexByTag.set(tag, new Set());
        }
        this.indexByTag.get(tag)?.add(id);
      }
      
      // Index by trigger patterns
      for (const trigger of skill.triggers || []) {
        if (!this.indexByTrigger.has(trigger.pattern)) {
          this.indexByTrigger.set(trigger.pattern, new Set());
        }
        this.indexByTrigger.get(trigger.pattern)?.add(id);
      }
    }
  }

  /**
   * Get skill by ID
   */
  getSkill(id: string): Skill | undefined {
    return this.get(id);
  }

  /**
   * Get skills by category
   */
  getByCategory(category: SkillCategory): Skill[] {
    const ids = this.indexByCategory.get(category) || new Set();
    return Array.from(ids).map(id => this.get(id)!).filter(Boolean);
  }

  /**
   * Get skills by tag
   */
  getByTag(tag: string): Skill[] {
    const ids = this.indexByTag.get(tag) || new Set();
    return Array.from(ids).map(id => this.get(id)!).filter(Boolean);
  }

  /**
   * Find skills matching a query or trigger pattern
   */
  findForTask(taskDescription: string): Skill[] {
    if (!taskDescription) return [];
    const results: { skill: Skill; score: number }[] = [];
    const desc = taskDescription.toLowerCase();
    
    for (const entry of this.entries.values()) {
      const skill = entry.data;
      if (!skill.enabled || skill.status !== "active") continue;
      
      let score = 0;
      
      // Check triggers
      for (const trigger of skill.triggers || []) {
        try {
          const regex = new RegExp(trigger.pattern, "i");
          if (regex.test(taskDescription)) {
            score += 10;
          }
        } catch {
          if (desc.includes(trigger.pattern.toLowerCase())) {
            score += 8;
          }
        }
      }
      
      // Check use cases
      for (const useCase of skill.use_cases || []) {
        if (desc.includes(useCase.toLowerCase())) {
          score += 5;
        }
      }
      
      // Check tags
      for (const tag of skill.tags || []) {
        if (desc.includes(tag.toLowerCase())) {
          score += 3;
        }
      }
      
      // Check name and description
      if (desc.includes(skill.name.toLowerCase())) score += 5;
      if (skill.description.toLowerCase().split(" ").some(w => desc.includes(w) && w.length > 4)) score += 2;
      
      // Add priority weight
      score += skill.priority * 0.5;
      
      if (score > 0) {
        results.push({ skill, score });
      }
    }
    
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map(r => r.skill);
  }

  /**
   * Search skills with filters
   */
  search(options: {
    query?: string;
    category?: SkillCategory;
    tag?: string;
    enabled?: boolean;
    limit?: number;
    offset?: number;
  }): { skills: Skill[]; total: number; hasMore: boolean } {
    let results: Skill[] = [];
    
    if (options.category) {
      results = this.getByCategory(options.category);
    } else if (options.tag) {
      results = this.getByTag(options.tag);
    } else {
      results = this.all();
    }
    
    if (options.query) {
      const query = options.query.toLowerCase();
      results = results.filter(s =>
        s.name.toLowerCase().includes(query) ||
        s.skill_id.toLowerCase().includes(query) ||
        s.description.toLowerCase().includes(query)
      );
    }
    
    if (options.enabled !== undefined) {
      results = results.filter(s => s.enabled === options.enabled);
    }
    
    const total = results.length;
    const offset = options.offset || 0;
    const limit = options.limit || 20;
    const paged = results.slice(offset, offset + limit);
    
    return {
      skills: paged,
      total,
      hasMore: offset + paged.length < total
    };
  }

  /**
   * Get skill content
   */
  async getContent(skillId: string): Promise<string | undefined> {
    const skill = this.get(skillId);
    if (!skill) return undefined;
    
    try {
      return await fs.readFile(skill.path, "utf-8");
    } catch {
      return undefined;
    }
  }

  /**
   * Get statistics
   */
  getStats(): {
    total: number;
    byCategory: Record<string, number>;
    totalLines: number;
    totalSizeKB: number;
    activeEnabled: number;
  } {
    const stats = {
      total: this.entries.size,
      byCategory: {} as Record<string, number>,
      totalLines: 0,
      totalSizeKB: 0,
      activeEnabled: 0
    };
    
    for (const [category, ids] of this.indexByCategory) {
      stats.byCategory[category] = ids.size;
    }
    
    for (const entry of this.entries.values()) {
      const s = entry.data;
      stats.totalLines += s.lines || 0;
      stats.totalSizeKB += (s.size_bytes || 0) / 1024;
      if (s.status === "active" && s.enabled) stats.activeEnabled++;
    }
    
    stats.totalSizeKB = Math.round(stats.totalSizeKB * 10) / 10;
    
    return stats;
  }
}

// Export singleton instance
export const skillRegistry = new SkillRegistry();
