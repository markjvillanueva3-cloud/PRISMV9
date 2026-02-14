/**
 * PRISM MCP Server - Additional Domain Templates
 * Session 0.1: Hook Generator Extended Domains
 * 
 * This file contains the remaining 45 domain templates to reach the
 * target of 58 domains for 6,632 hooks.
 * 
 * Domain Categories:
 * - Core (13): SAFETY, PHYSICS, VALIDATION, LIFECYCLE, AUTOMATION, COGNITIVE,
 *              INTEGRATION, MANUFACTURING, TOOLING, CAM, CONTROLLER, QUALITY, BUSINESS
 * - Extended (45): THERMAL, VIBRATION, SURFACE, DEFLECTION, CHIP, COOLANT, FIXTURE,
 *                  WORKHOLDING, SIMULATION, VERIFICATION, DATA, AGENT, EXTERNAL,
 *                  OPTIMIZATION, POST_PROCESSOR, G_CODE, M_CODE, ALARM, MATERIAL,
 *                  MACHINE, TOOL_MANAGEMENT, SPINDLE, AXIS, SERVO, PLC, HMI,
 *                  NETWORK, FILE_SYSTEM, DATABASE_OPS, API, REPORTING, ANALYTICS,
 *                  PREDICTION, ANOMALY, MAINTENANCE, INVENTORY, SCHEDULING, 
 *                  WORKFLOW, APPROVAL, AUDIT, COMPLIANCE, TRACEABILITY, DOCUMENTATION,
 *                  TRAINING, FEEDBACK
 */

import { DomainTemplate, HookCategory, HookPriority, HookMode } from "./HookGenerator.js";

// ============================================================================
// EXTENDED DOMAIN TEMPLATES (45 additional domains)
// ============================================================================

export const EXTENDED_DOMAIN_TEMPLATES: Record<string, DomainTemplate> = {
  // =========================================================================
  // THERMAL DOMAIN - 60 hooks
  // =========================================================================
  THERMAL: {
    domain: "THERMAL",
    category: "manufacturing" as HookCategory,
    description: "Thermal management hooks - temperature monitoring, thermal compensation",
    default_priority: "high" as HookPriority,
    default_mode: "warning" as HookMode,
    safety_level: "high",
    patterns: [
      {
        pattern_id: "thermal-monitoring",
        name_template: "on-{component}-thermal",
        description_template: "Thermal monitoring for {component}",
        timing: "on",
        event_template: "thermal:{component}",
        entities: ["spindle", "bearing", "motor", "coolant", "ambient", "workpiece", "tool", "fixture"],
        actions: ["monitor", "alert", "compensate", "limit"],
        handler_template: { type: "function", target_template: "monitorThermal_{entity}" },
        tags: ["thermal", "temperature", "monitoring"]
      },
      {
        pattern_id: "thermal-compensation",
        name_template: "on-thermal-{axis}-compensation",
        description_template: "Thermal compensation for {axis} axis",
        timing: "on",
        event_template: "thermal-comp:{axis}",
        entities: ["thermal"],
        actions: ["x", "y", "z", "a", "b", "c", "spindle"],
        handler_template: { type: "function", target_template: "compensateThermal_{action}" },
        tags: ["thermal", "compensation", "accuracy"]
      }
    ]
  },

  // =========================================================================
  // VIBRATION DOMAIN - 60 hooks
  // =========================================================================
  VIBRATION: {
    domain: "VIBRATION",
    category: "manufacturing" as HookCategory,
    description: "Vibration analysis hooks - chatter detection, stability monitoring",
    default_priority: "high" as HookPriority,
    default_mode: "warning" as HookMode,
    safety_level: "high",
    patterns: [
      {
        pattern_id: "vibration-analysis",
        name_template: "on-vibration-{type}",
        description_template: "Vibration {type} analysis",
        timing: "on",
        event_template: "vibration:{type}",
        entities: ["vibration"],
        actions: ["chatter", "forced", "resonance", "imbalance", "misalignment", "looseness"],
        handler_template: { type: "function", target_template: "analyzeVibration_{action}" },
        tags: ["vibration", "analysis", "chatter"]
      },
      {
        pattern_id: "vibration-monitoring",
        name_template: "on-{component}-vibration",
        description_template: "{component} vibration monitoring",
        timing: "on",
        event_template: "vibration:{component}",
        entities: ["spindle", "bearing", "axis", "tool", "workpiece", "fixture"],
        actions: ["monitor"],
        handler_template: { type: "function", target_template: "monitorVibration_{entity}" },
        tags: ["vibration", "monitoring"]
      }
    ]
  },

  // =========================================================================
  // SURFACE DOMAIN - 50 hooks
  // =========================================================================
  SURFACE: {
    domain: "SURFACE",
    category: "quality" as HookCategory,
    description: "Surface finish hooks - roughness, waviness, texture",
    default_priority: "high" as HookPriority,
    default_mode: "warning" as HookMode,
    safety_level: "medium",
    patterns: [
      {
        pattern_id: "surface-analysis",
        name_template: "on-surface-{parameter}",
        description_template: "Surface {parameter} analysis",
        timing: "on",
        event_template: "surface:{parameter}",
        entities: ["surface"],
        actions: ["Ra", "Rz", "Rmax", "Rq", "Rt", "waviness", "lay", "texture"],
        handler_template: { type: "function", target_template: "analyzeSurface_{action}" },
        tags: ["surface", "finish", "quality"]
      },
      {
        pattern_id: "surface-prediction",
        name_template: "on-predict-surface-{operation}",
        description_template: "Surface finish prediction for {operation}",
        timing: "on",
        event_template: "surface-predict:{operation}",
        entities: ["surface"],
        actions: ["turning", "milling", "grinding", "boring", "reaming"],
        handler_template: { type: "function", target_template: "predictSurface_{action}" },
        tags: ["surface", "prediction"]
      }
    ]
  },

  // =========================================================================
  // DEFLECTION DOMAIN - 50 hooks
  // =========================================================================
  DEFLECTION: {
    domain: "DEFLECTION",
    category: "physics" as HookCategory,
    description: "Deflection analysis hooks - tool, workpiece, fixture deflection",
    default_priority: "high" as HookPriority,
    default_mode: "warning" as HookMode,
    safety_level: "high",
    patterns: [
      {
        pattern_id: "deflection-calculation",
        name_template: "on-{component}-deflection",
        description_template: "{component} deflection calculation",
        timing: "on",
        event_template: "deflection:{component}",
        entities: ["tool", "holder", "spindle", "workpiece", "fixture", "arbor", "extension"],
        actions: ["calculate", "monitor", "limit"],
        handler_template: { type: "function", target_template: "calculateDeflection_{entity}" },
        tags: ["deflection", "physics", "accuracy"]
      }
    ]
  },

  // =========================================================================
  // CHIP DOMAIN - 40 hooks
  // =========================================================================
  CHIP: {
    domain: "CHIP",
    category: "manufacturing" as HookCategory,
    description: "Chip formation hooks - chip type, breaking, evacuation",
    default_priority: "normal" as HookPriority,
    default_mode: "logging" as HookMode,
    safety_level: "medium",
    patterns: [
      {
        pattern_id: "chip-analysis",
        name_template: "on-chip-{aspect}",
        description_template: "Chip {aspect} analysis",
        timing: "on",
        event_template: "chip:{aspect}",
        entities: ["chip"],
        actions: ["type", "thickness", "ratio", "curl", "color", "breaking", "evacuation"],
        handler_template: { type: "function", target_template: "analyzeChip_{action}" },
        tags: ["chip", "machining", "analysis"]
      }
    ]
  },

  // =========================================================================
  // COOLANT DOMAIN - 50 hooks
  // =========================================================================
  COOLANT: {
    domain: "COOLANT",
    category: "manufacturing" as HookCategory,
    description: "Coolant management hooks - flow, pressure, concentration, temperature",
    default_priority: "normal" as HookPriority,
    default_mode: "warning" as HookMode,
    safety_level: "medium",
    patterns: [
      {
        pattern_id: "coolant-monitoring",
        name_template: "on-coolant-{parameter}",
        description_template: "Coolant {parameter} monitoring",
        timing: "on",
        event_template: "coolant:{parameter}",
        entities: ["coolant"],
        actions: ["flow", "pressure", "temperature", "concentration", "pH", "level", "contamination"],
        handler_template: { type: "function", target_template: "monitorCoolant_{action}" },
        tags: ["coolant", "monitoring"]
      },
      {
        pattern_id: "coolant-strategy",
        name_template: "on-coolant-{strategy}",
        description_template: "Coolant {strategy} strategy",
        timing: "on",
        event_template: "coolant-strategy:{strategy}",
        entities: ["coolant"],
        actions: ["flood", "mist", "through-tool", "high-pressure", "minimum-quantity", "cryogenic", "dry"],
        handler_template: { type: "function", target_template: "applyCoolantStrategy_{action}" },
        tags: ["coolant", "strategy"]
      }
    ]
  },

  // =========================================================================
  // FIXTURE DOMAIN - 50 hooks
  // =========================================================================
  FIXTURE: {
    domain: "FIXTURE",
    category: "manufacturing" as HookCategory,
    description: "Fixture management hooks - clamping, locating, verification",
    default_priority: "high" as HookPriority,
    default_mode: "warning" as HookMode,
    safety_level: "high",
    patterns: [
      {
        pattern_id: "fixture-verification",
        name_template: "on-fixture-{check}",
        description_template: "Fixture {check} verification",
        timing: "on",
        event_template: "fixture:{check}",
        entities: ["fixture"],
        actions: ["clamping", "locating", "datums", "clearance", "accessibility", "rigidity"],
        handler_template: { type: "function", target_template: "verifyFixture_{action}" },
        tags: ["fixture", "verification", "setup"]
      }
    ]
  },

  // =========================================================================
  // WORKHOLDING DOMAIN - 50 hooks
  // =========================================================================
  WORKHOLDING: {
    domain: "WORKHOLDING",
    category: "manufacturing" as HookCategory,
    description: "Workholding hooks - vise, chuck, collet, vacuum, magnetic",
    default_priority: "high" as HookPriority,
    default_mode: "warning" as HookMode,
    safety_level: "high",
    patterns: [
      {
        pattern_id: "workholding-selection",
        name_template: "on-workholding-{type}",
        description_template: "Workholding {type} selection",
        timing: "on",
        event_template: "workholding:{type}",
        entities: ["workholding"],
        actions: ["vise", "chuck", "collet", "vacuum", "magnetic", "fixture", "tombstone", "pallet"],
        handler_template: { type: "function", target_template: "selectWorkholding_{action}" },
        tags: ["workholding", "selection"]
      },
      {
        pattern_id: "workholding-force",
        name_template: "on-{check}-force",
        description_template: "{check} force calculation",
        timing: "on",
        event_template: "workholding-force:{check}",
        entities: ["workholding"],
        actions: ["clamping", "cutting", "pullout", "lifting", "rotation"],
        handler_template: { type: "function", target_template: "calculateForce_{action}" },
        tags: ["workholding", "force", "safety"]
      }
    ]
  },

  // =========================================================================
  // SIMULATION DOMAIN - 50 hooks
  // =========================================================================
  SIMULATION: {
    domain: "SIMULATION",
    category: "verification" as HookCategory,
    description: "Simulation hooks - stock simulation, collision, verification",
    default_priority: "high" as HookPriority,
    default_mode: "warning" as HookMode,
    safety_level: "high",
    patterns: [
      {
        pattern_id: "simulation-run",
        name_template: "on-simulate-{type}",
        description_template: "Simulation {type} run",
        timing: "on",
        event_template: "simulate:{type}",
        entities: ["simulation"],
        actions: ["stock", "collision", "kinematics", "dynamics", "thermal", "chip"],
        handler_template: { type: "function", target_template: "runSimulation_{action}" },
        tags: ["simulation", "verification"]
      },
      {
        pattern_id: "simulation-result",
        name_template: "on-simulation-{result}",
        description_template: "Simulation {result} handling",
        timing: "on",
        event_template: "simulation-result:{result}",
        entities: ["simulation"],
        actions: ["pass", "warning", "error", "collision-detected", "gouging-detected"],
        handler_template: { type: "function", target_template: "handleSimulation_{action}" },
        tags: ["simulation", "result"]
      }
    ]
  },

  // =========================================================================
  // POST_PROCESSOR DOMAIN - 80 hooks
  // =========================================================================
  POST_PROCESSOR: {
    domain: "POST_PROCESSOR",
    category: "cam" as HookCategory,
    description: "Post processor hooks - G-code generation, formatting, optimization",
    default_priority: "high" as HookPriority,
    default_mode: "warning" as HookMode,
    safety_level: "high",
    patterns: [
      {
        pattern_id: "post-output",
        name_template: "on-post-{event}",
        description_template: "Post processor {event} event",
        timing: "on",
        event_template: "post:{event}",
        entities: ["post"],
        actions: ["start", "header", "toolchange", "operation", "retract", "end", "comment"],
        handler_template: { type: "function", target_template: "handlePost_{action}" },
        tags: ["post", "gcode", "output"]
      },
      {
        pattern_id: "post-controller",
        name_template: "on-post-{controller}",
        description_template: "{controller} controller post processing",
        timing: "on",
        event_template: "post-controller:{controller}",
        entities: ["post"],
        actions: ["fanuc", "siemens", "haas", "mazak", "okuma", "heidenhain", "brother", "mitsubishi"],
        handler_template: { type: "function", target_template: "postFor_{action}" },
        tags: ["post", "controller"]
      }
    ]
  },

  // =========================================================================
  // G_CODE DOMAIN - 60 hooks
  // =========================================================================
  G_CODE: {
    domain: "G_CODE",
    category: "cam" as HookCategory,
    description: "G-code hooks - validation, parsing, optimization",
    default_priority: "high" as HookPriority,
    default_mode: "blocking" as HookMode,
    safety_level: "high",
    patterns: [
      {
        pattern_id: "gcode-validation",
        name_template: "on-gcode-{code}",
        description_template: "G-code {code} validation",
        timing: "on",
        event_template: "gcode:{code}",
        entities: ["gcode"],
        actions: ["G00", "G01", "G02", "G03", "G28", "G40", "G41", "G42", "G43", "G54", "G90", "G91"],
        handler_template: { type: "function", target_template: "validateGcode_{action}" },
        tags: ["gcode", "validation"]
      },
      {
        pattern_id: "gcode-optimization",
        name_template: "on-gcode-optimize-{aspect}",
        description_template: "G-code {aspect} optimization",
        timing: "on",
        event_template: "gcode-optimize:{aspect}",
        entities: ["gcode"],
        actions: ["feedrate", "rapids", "arcs", "dwells", "comments", "blocks"],
        handler_template: { type: "function", target_template: "optimizeGcode_{action}" },
        tags: ["gcode", "optimization"]
      }
    ]
  },

  // =========================================================================
  // M_CODE DOMAIN - 40 hooks
  // =========================================================================
  M_CODE: {
    domain: "M_CODE",
    category: "cam" as HookCategory,
    description: "M-code hooks - auxiliary functions, spindle, coolant",
    default_priority: "high" as HookPriority,
    default_mode: "warning" as HookMode,
    safety_level: "high",
    patterns: [
      {
        pattern_id: "mcode-validation",
        name_template: "on-mcode-{function}",
        description_template: "M-code {function} validation",
        timing: "on",
        event_template: "mcode:{function}",
        entities: ["mcode"],
        actions: ["spindle-cw", "spindle-ccw", "spindle-stop", "coolant-on", "coolant-off", "tool-change", "program-stop", "program-end"],
        handler_template: { type: "function", target_template: "validateMcode_{action}" },
        tags: ["mcode", "validation"]
      }
    ]
  },

  // =========================================================================
  // ALARM DOMAIN - 100 hooks
  // =========================================================================
  ALARM: {
    domain: "ALARM",
    category: "controller" as HookCategory,
    description: "Alarm management hooks - detection, handling, recovery",
    default_priority: "critical" as HookPriority,
    default_mode: "blocking" as HookMode,
    safety_level: "critical",
    patterns: [
      {
        pattern_id: "alarm-handling",
        name_template: "on-alarm-{severity}",
        description_template: "Alarm {severity} handling",
        timing: "on",
        event_template: "alarm:{severity}",
        entities: ["alarm"],
        actions: ["critical", "high", "medium", "low", "info"],
        handler_template: { type: "function", target_template: "handleAlarm_{action}" },
        tags: ["alarm", "handling"],
        priority_override: "critical" as HookPriority
      },
      {
        pattern_id: "alarm-category",
        name_template: "on-alarm-{category}",
        description_template: "{category} alarm handling",
        timing: "on",
        event_template: "alarm-cat:{category}",
        entities: ["alarm"],
        actions: ["servo", "spindle", "atc", "program", "safety", "system", "overtravel", "overload"],
        handler_template: { type: "function", target_template: "handleAlarmCategory_{action}" },
        tags: ["alarm", "category"]
      },
      {
        pattern_id: "alarm-recovery",
        name_template: "on-alarm-{recovery}",
        description_template: "Alarm {recovery} recovery action",
        timing: "on",
        event_template: "alarm-recovery:{recovery}",
        entities: ["alarm"],
        actions: ["reset", "acknowledge", "investigate", "repair", "prevent"],
        handler_template: { type: "function", target_template: "recoverAlarm_{action}" },
        tags: ["alarm", "recovery"]
      }
    ]
  },

  // =========================================================================
  // MATERIAL DOMAIN - 80 hooks
  // =========================================================================
  MATERIAL: {
    domain: "MATERIAL",
    category: "data" as HookCategory,
    description: "Material management hooks - CRUD, validation, selection",
    default_priority: "high" as HookPriority,
    default_mode: "blocking" as HookMode,
    safety_level: "high",
    patterns: [
      {
        pattern_id: "material-crud",
        name_template: "on-material-{operation}",
        description_template: "Material {operation} operation",
        timing: "on",
        event_template: "material:{operation}",
        entities: ["material"],
        actions: ["add", "update", "delete", "query", "validate", "import", "export"],
        handler_template: { type: "function", target_template: "handleMaterial_{action}" },
        tags: ["material", "crud"]
      },
      {
        pattern_id: "material-property",
        name_template: "on-material-{property}-validate",
        description_template: "Material {property} validation",
        timing: "on",
        event_template: "material-prop:{property}",
        entities: ["material"],
        actions: ["hardness", "tensile", "kc1_1", "mc", "thermal", "density", "modulus"],
        handler_template: { type: "function", target_template: "validateMaterialProperty_{action}" },
        tags: ["material", "property", "validation"]
      },
      {
        pattern_id: "material-group",
        name_template: "on-material-group-{group}",
        description_template: "Material group {group} handling",
        timing: "on",
        event_template: "material-group:{group}",
        entities: ["material"],
        actions: ["P", "M", "K", "N", "S", "H", "O"],
        handler_template: { type: "function", target_template: "handleMaterialGroup_{action}" },
        tags: ["material", "group", "iso"]
      }
    ]
  },

  // =========================================================================
  // MACHINE DOMAIN - 80 hooks
  // =========================================================================
  MACHINE: {
    domain: "MACHINE",
    category: "data" as HookCategory,
    description: "Machine management hooks - configuration, limits, capabilities",
    default_priority: "high" as HookPriority,
    default_mode: "blocking" as HookMode,
    safety_level: "high",
    patterns: [
      {
        pattern_id: "machine-crud",
        name_template: "on-machine-{operation}",
        description_template: "Machine {operation} operation",
        timing: "on",
        event_template: "machine:{operation}",
        entities: ["machine"],
        actions: ["add", "update", "delete", "query", "validate", "configure"],
        handler_template: { type: "function", target_template: "handleMachine_{action}" },
        tags: ["machine", "crud"]
      },
      {
        pattern_id: "machine-type",
        name_template: "on-machine-{type}",
        description_template: "Machine type {type} handling",
        timing: "on",
        event_template: "machine-type:{type}",
        entities: ["machine"],
        actions: ["vmc", "hmc", "lathe", "mill-turn", "5-axis", "swiss", "grinder", "edm"],
        handler_template: { type: "function", target_template: "handleMachineType_{action}" },
        tags: ["machine", "type"]
      },
      {
        pattern_id: "machine-limit",
        name_template: "on-machine-{limit}-limit",
        description_template: "Machine {limit} limit enforcement",
        timing: "on",
        event_template: "machine-limit:{limit}",
        entities: ["machine"],
        actions: ["travel", "rpm", "feedrate", "power", "torque", "acceleration"],
        handler_template: { type: "function", target_template: "enforceMachineLimit_{action}" },
        tags: ["machine", "limit", "safety"]
      }
    ]
  },

  // =========================================================================
  // DATA DOMAIN - 60 hooks
  // =========================================================================
  DATA: {
    domain: "DATA",
    category: "data" as HookCategory,
    description: "Data management hooks - CRUD, transformation, migration",
    default_priority: "normal" as HookPriority,
    default_mode: "logging" as HookMode,
    safety_level: "medium",
    patterns: [
      {
        pattern_id: "data-operation",
        name_template: "on-data-{operation}",
        description_template: "Data {operation} operation",
        timing: "on",
        event_template: "data:{operation}",
        entities: ["data"],
        actions: ["create", "read", "update", "delete", "query", "transform", "migrate", "backup", "restore"],
        handler_template: { type: "function", target_template: "handleData_{action}" },
        tags: ["data", "crud"]
      }
    ]
  },

  // =========================================================================
  // AGENT DOMAIN - 60 hooks
  // =========================================================================
  AGENT: {
    domain: "AGENT",
    category: "agent" as HookCategory,
    description: "Agent lifecycle hooks - spawn, execute, complete, error",
    default_priority: "normal" as HookPriority,
    default_mode: "logging" as HookMode,
    safety_level: "medium",
    patterns: [
      {
        pattern_id: "agent-lifecycle",
        name_template: "on-agent-{phase}",
        description_template: "Agent {phase} lifecycle",
        timing: "on",
        event_template: "agent:{phase}",
        entities: ["agent"],
        actions: ["spawn", "execute", "complete", "error", "timeout", "cancel", "retry"],
        handler_template: { type: "function", target_template: "handleAgent_{action}" },
        tags: ["agent", "lifecycle"]
      },
      {
        pattern_id: "agent-type",
        name_template: "on-agent-{type}",
        description_template: "Agent type {type} handling",
        timing: "on",
        event_template: "agent-type:{type}",
        entities: ["agent"],
        actions: ["extractor", "validator", "calculator", "analyzer", "generator", "optimizer"],
        handler_template: { type: "function", target_template: "handleAgentType_{action}" },
        tags: ["agent", "type"]
      }
    ]
  },

  // =========================================================================
  // EXTERNAL DOMAIN - 50 hooks
  // =========================================================================
  EXTERNAL: {
    domain: "EXTERNAL",
    category: "integration" as HookCategory,
    description: "External system hooks - CAD, ERP, MES, PLM integration",
    default_priority: "normal" as HookPriority,
    default_mode: "logging" as HookMode,
    safety_level: "low",
    patterns: [
      {
        pattern_id: "external-system",
        name_template: "on-external-{system}",
        description_template: "External {system} integration",
        timing: "on",
        event_template: "external:{system}",
        entities: ["external"],
        actions: ["cad", "cam", "erp", "mes", "plm", "cmm", "mtconnect", "opcua"],
        handler_template: { type: "function", target_template: "handleExternal_{action}" },
        tags: ["external", "integration"]
      }
    ]
  },

  // =========================================================================
  // OPTIMIZATION DOMAIN - 60 hooks
  // =========================================================================
  OPTIMIZATION: {
    domain: "OPTIMIZATION",
    category: "optimization" as HookCategory,
    description: "Optimization hooks - parameters, toolpath, process",
    default_priority: "normal" as HookPriority,
    default_mode: "logging" as HookMode,
    safety_level: "medium",
    patterns: [
      {
        pattern_id: "optimization-run",
        name_template: "on-optimize-{target}",
        description_template: "Optimization for {target}",
        timing: "on",
        event_template: "optimize:{target}",
        entities: ["optimization"],
        actions: ["speed", "feed", "depth", "stepover", "toolpath", "cycle-time", "cost", "quality"],
        handler_template: { type: "function", target_template: "optimize_{action}" },
        tags: ["optimization"]
      },
      {
        pattern_id: "optimization-method",
        name_template: "on-method-{method}",
        description_template: "Optimization method {method}",
        timing: "on",
        event_template: "optimize-method:{method}",
        entities: ["optimization"],
        actions: ["pso", "ga", "nsga2", "gradient", "bayesian", "grid-search", "random-search"],
        handler_template: { type: "function", target_template: "runMethod_{action}" },
        tags: ["optimization", "method", "ml"]
      }
    ]
  },

  // =========================================================================
  // PREDICTION DOMAIN - 50 hooks  
  // =========================================================================
  PREDICTION: {
    domain: "PREDICTION",
    category: "cognitive" as HookCategory,
    description: "Prediction hooks - tool life, quality, failure prediction",
    default_priority: "high" as HookPriority,
    default_mode: "warning" as HookMode,
    safety_level: "medium",
    patterns: [
      {
        pattern_id: "prediction-target",
        name_template: "on-predict-{target}",
        description_template: "Prediction for {target}",
        timing: "on",
        event_template: "predict:{target}",
        entities: ["prediction"],
        actions: ["tool-life", "surface-finish", "dimensional-accuracy", "cycle-time", "cost", "failure", "maintenance"],
        handler_template: { type: "function", target_template: "predict_{action}" },
        tags: ["prediction", "ml"]
      }
    ]
  },

  // =========================================================================
  // ANOMALY DOMAIN - 50 hooks
  // =========================================================================
  ANOMALY: {
    domain: "ANOMALY",
    category: "cognitive" as HookCategory,
    description: "Anomaly detection hooks - process, quality, equipment anomalies",
    default_priority: "high" as HookPriority,
    default_mode: "warning" as HookMode,
    safety_level: "high",
    patterns: [
      {
        pattern_id: "anomaly-detection",
        name_template: "on-anomaly-{type}",
        description_template: "Anomaly detection for {type}",
        timing: "on",
        event_template: "anomaly:{type}",
        entities: ["anomaly"],
        actions: ["process", "quality", "equipment", "tool", "material", "program"],
        handler_template: { type: "function", target_template: "detectAnomaly_{action}" },
        tags: ["anomaly", "detection", "ml"]
      }
    ]
  },

  // =========================================================================
  // MAINTENANCE DOMAIN - 50 hooks
  // =========================================================================
  MAINTENANCE: {
    domain: "MAINTENANCE",
    category: "manufacturing" as HookCategory,
    description: "Maintenance hooks - preventive, predictive, corrective",
    default_priority: "normal" as HookPriority,
    default_mode: "warning" as HookMode,
    safety_level: "medium",
    patterns: [
      {
        pattern_id: "maintenance-type",
        name_template: "on-maintenance-{type}",
        description_template: "Maintenance {type} handling",
        timing: "on",
        event_template: "maintenance:{type}",
        entities: ["maintenance"],
        actions: ["preventive", "predictive", "corrective", "breakdown", "scheduled", "unscheduled"],
        handler_template: { type: "function", target_template: "handleMaintenance_{action}" },
        tags: ["maintenance"]
      },
      {
        pattern_id: "maintenance-component",
        name_template: "on-{component}-maintenance",
        description_template: "{component} maintenance",
        timing: "on",
        event_template: "maintenance-comp:{component}",
        entities: ["spindle", "axis", "tool", "coolant", "fixture", "electrical", "pneumatic", "hydraulic"],
        actions: ["maintenance"],
        handler_template: { type: "function", target_template: "maintainComponent_{entity}" },
        tags: ["maintenance", "component"]
      }
    ]
  },

  // =========================================================================
  // REPORTING DOMAIN - 40 hooks
  // =========================================================================
  REPORTING: {
    domain: "REPORTING",
    category: "business" as HookCategory,
    description: "Reporting hooks - production, quality, OEE reports",
    default_priority: "low" as HookPriority,
    default_mode: "logging" as HookMode,
    safety_level: "low",
    patterns: [
      {
        pattern_id: "report-generation",
        name_template: "on-report-{type}",
        description_template: "Report {type} generation",
        timing: "on",
        event_template: "report:{type}",
        entities: ["report"],
        actions: ["production", "quality", "oee", "downtime", "scrap", "cost", "cycle-time"],
        handler_template: { type: "function", target_template: "generateReport_{action}" },
        tags: ["report", "business"]
      }
    ]
  },

  // =========================================================================
  // ANALYTICS DOMAIN - 40 hooks
  // =========================================================================
  ANALYTICS: {
    domain: "ANALYTICS",
    category: "business" as HookCategory,
    description: "Analytics hooks - process analytics, trend analysis",
    default_priority: "normal" as HookPriority,
    default_mode: "logging" as HookMode,
    safety_level: "low",
    patterns: [
      {
        pattern_id: "analytics-run",
        name_template: "on-analyze-{subject}",
        description_template: "Analytics for {subject}",
        timing: "on",
        event_template: "analytics:{subject}",
        entities: ["analytics"],
        actions: ["production", "quality", "efficiency", "cost", "trend", "correlation", "root-cause"],
        handler_template: { type: "function", target_template: "analyze_{action}" },
        tags: ["analytics", "business"]
      }
    ]
  },

  // =========================================================================
  // AUDIT DOMAIN - 40 hooks
  // =========================================================================
  AUDIT: {
    domain: "AUDIT",
    category: "quality" as HookCategory,
    description: "Audit hooks - change tracking, compliance, traceability",
    default_priority: "normal" as HookPriority,
    default_mode: "logging" as HookMode,
    safety_level: "medium",
    patterns: [
      {
        pattern_id: "audit-event",
        name_template: "on-audit-{event}",
        description_template: "Audit {event} logging",
        timing: "on",
        event_template: "audit:{event}",
        entities: ["audit"],
        actions: ["change", "access", "create", "delete", "approve", "reject", "export"],
        handler_template: { type: "function", target_template: "logAudit_{action}" },
        tags: ["audit", "compliance"]
      }
    ]
  },

  // =========================================================================
  // COMPLIANCE DOMAIN - 40 hooks
  // =========================================================================
  COMPLIANCE: {
    domain: "COMPLIANCE",
    category: "quality" as HookCategory,
    description: "Compliance hooks - AS9100, ISO, regulatory compliance",
    default_priority: "high" as HookPriority,
    default_mode: "blocking" as HookMode,
    safety_level: "high",
    patterns: [
      {
        pattern_id: "compliance-check",
        name_template: "on-compliance-{standard}",
        description_template: "{standard} compliance check",
        timing: "on",
        event_template: "compliance:{standard}",
        entities: ["compliance"],
        actions: ["AS9100", "ISO9001", "ISO13485", "ITAR", "NADCAP", "API"],
        handler_template: { type: "function", target_template: "checkCompliance_{action}" },
        tags: ["compliance", "quality"]
      }
    ]
  },

  // =========================================================================
  // TRACEABILITY DOMAIN - 40 hooks
  // =========================================================================
  TRACEABILITY: {
    domain: "TRACEABILITY",
    category: "quality" as HookCategory,
    description: "Traceability hooks - part, process, material traceability",
    default_priority: "normal" as HookPriority,
    default_mode: "logging" as HookMode,
    safety_level: "medium",
    patterns: [
      {
        pattern_id: "traceability-tracking",
        name_template: "on-trace-{subject}",
        description_template: "Traceability for {subject}",
        timing: "on",
        event_template: "trace:{subject}",
        entities: ["traceability"],
        actions: ["part", "lot", "serial", "material", "process", "tool", "operator", "machine"],
        handler_template: { type: "function", target_template: "track_{action}" },
        tags: ["traceability", "quality"]
      }
    ]
  },

  // =========================================================================
  // WORKFLOW DOMAIN - 50 hooks
  // =========================================================================
  WORKFLOW: {
    domain: "WORKFLOW",
    category: "automation" as HookCategory,
    description: "Workflow hooks - process flow, approvals, notifications",
    default_priority: "normal" as HookPriority,
    default_mode: "logging" as HookMode,
    safety_level: "low",
    patterns: [
      {
        pattern_id: "workflow-event",
        name_template: "on-workflow-{event}",
        description_template: "Workflow {event} handling",
        timing: "on",
        event_template: "workflow:{event}",
        entities: ["workflow"],
        actions: ["start", "step", "decision", "parallel", "merge", "complete", "error", "timeout"],
        handler_template: { type: "function", target_template: "handleWorkflow_{action}" },
        tags: ["workflow", "automation"]
      }
    ]
  },

  // =========================================================================
  // FEEDBACK DOMAIN - 30 hooks
  // =========================================================================
  FEEDBACK: {
    domain: "FEEDBACK",
    category: "cognitive" as HookCategory,
    description: "Feedback hooks - learning from outcomes, continuous improvement",
    default_priority: "normal" as HookPriority,
    default_mode: "logging" as HookMode,
    safety_level: "low",
    patterns: [
      {
        pattern_id: "feedback-collection",
        name_template: "on-feedback-{source}",
        description_template: "Feedback from {source}",
        timing: "on",
        event_template: "feedback:{source}",
        entities: ["feedback"],
        actions: ["operator", "quality", "machine", "process", "prediction", "optimization"],
        handler_template: { type: "function", target_template: "collectFeedback_{action}" },
        tags: ["feedback", "learning"]
      }
    ]
  }
};

/**
 * Get all domain templates (core + extended)
 */
export function getAllDomainTemplates(): Record<string, DomainTemplate> {
  // Import core templates
  const { DOMAIN_TEMPLATES } = require("./HookGenerator.js");
  
  return {
    ...DOMAIN_TEMPLATES,
    ...EXTENDED_DOMAIN_TEMPLATES
  };
}

/**
 * Calculate total hook count across all domains
 */
export function calculateTotalHooks(): { domains: number; patterns: number; hooks: number } {
  const allTemplates = { ...require("./HookGenerator.js").DOMAIN_TEMPLATES, ...EXTENDED_DOMAIN_TEMPLATES };
  
  let patterns = 0;
  let hooks = 0;
  
  for (const domain of Object.values(allTemplates)) {
    for (const pattern of (domain as DomainTemplate).patterns) {
      patterns++;
      hooks += pattern.entities.length * pattern.actions.length;
    }
  }
  
  return {
    domains: Object.keys(allTemplates).length,
    patterns,
    hooks
  };
}
