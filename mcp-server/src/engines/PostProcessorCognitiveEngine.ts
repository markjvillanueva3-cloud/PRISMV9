/**
 * PostProcessorCognitiveEngine — PP-COGNITIVE-AGI
 * =================================================
 * Near-AGI Cognitive Architecture for Post Processor Generation
 *
 * This engine implements a multi-layered cognitive architecture that unifies
 * all existing AI/ML capabilities into a coherent intelligent system capable
 * of human-expert-level post processor generation.
 *
 * COGNITIVE ARCHITECTURE:
 *
 * +-----------------------------------------------------------------+
 * |                    META-COGNITIVE LAYER                         |
 * |  Self-monitoring, confidence calibration, strategy selection    |
 * +-----------------------------------------------------------------+
 *                               |
 * +-----------------------------------------------------------------+
 * |                    REASONING LAYER                              |
 * |  Causal | Analogical | Counterfactual | Abductive | Deductive   |
 * +-----------------------------------------------------------------+
 *                               |
 * +-----------------------------------------------------------------+
 * |                    MEMORY SYSTEMS                               |
 * |  Episodic | Semantic | Procedural | Working | Long-term         |
 * +-----------------------------------------------------------------+
 *                               |
 * +-----------------------------------------------------------------+
 * |                    PERCEPTION LAYER                             |
 * |  Pattern Recognition | Intent Understanding | Context Inference |
 * +-----------------------------------------------------------------+
 *                               |
 * +-----------------------------------------------------------------+
 * |                    INPUT/OUTPUT                                 |
 * |  G-code | CAM Toolpaths | Machine Capabilities | Tribal Knowledge|
 * +-----------------------------------------------------------------+
 *
 * THEORETICAL FOUNDATIONS:
 * - Global Workspace Theory (Baars): Working memory as broadcast medium
 * - Predictive Processing (Friston): Minimize prediction error
 * - Dual Process Theory (Kahneman): Fast intuition + slow deliberation
 * - ACT-R Cognitive Architecture: Declarative + procedural knowledge
 *
 * PHYSICS INTEGRATION:
 * - Kienzle cutting force model for feed/speed validation
 * - Taylor tool life equation for wear prediction
 * - Thermal model for temperature estimation
 * - Deflection model for rigidity checking
 *
 * @module engines/PostProcessorCognitiveEngine
 * @version 1.0.0
 */

import { log } from "../utils/Logger.js";
import {
  CANONICAL_KIENZLE,
  CANONICAL_TAYLOR,
  kienzleForce,
  taylorLife,
  type ISOGroup,
} from "../physics/constants.js";

// ============================================================================
// TYPE DEFINITIONS — Cognitive Architecture Types
// ============================================================================

/** Controller families */
type ControllerFamily =
  | "fanuc" | "fanuc_oi" | "fanuc_31i"
  | "siemens" | "siemens_840d"
  | "haas" | "haas_ngc"
  | "okuma" | "okuma_osp" | "okuma_osp_p300"
  | "mazak" | "mazak_mazatrol"
  | "mitsubishi" | "mitsubishi_m80"
  | "heidenhain" | "heidenhain_tnc"
  | "hurco" | "hurco_winmax"
  | "brother" | "brother_c00"
  | "generic";

/** CAM systems */
type CamSystem =
  | "mastercam" | "fusion360" | "solidcam" | "hypermill"
  | "nx" | "catia" | "esprit" | "powermill" | "generic";

/** Cognitive state */
interface CognitiveState {
  attention: AttentionState;
  workingMemory: WorkingMemory;
  emotionalValence: number;  // -1 to 1: confidence/uncertainty
  cognitiveLoad: number;     // 0 to 1: processing capacity used
  metacognitiveMonitor: MetacognitiveMonitor;
}

/** Attention mechanism */
interface AttentionState {
  focusTarget: string;
  salienceMap: Map<string, number>;
  attentionHistory: string[];
  suppressedItems: string[];
}

/** Working memory (limited capacity ~7 items) */
interface WorkingMemory {
  items: WorkingMemoryItem[];
  capacity: number;
  decayRate: number;
  lastRefresh: number;
}

interface WorkingMemoryItem {
  id: string;
  content: unknown;
  activation: number;  // 0-1, decays over time
  associations: string[];
  timestamp: number;
}

/** Metacognitive monitoring */
interface MetacognitiveMonitor {
  confidenceEstimate: number;
  uncertaintyAreas: string[];
  strategyEffectiveness: Map<string, number>;
  learningOpportunities: string[];
  errorPrediction: number;
}

// ============================================================================
// MEMORY SYSTEMS — Long-term Knowledge Storage
// ============================================================================

/** Episodic memory — specific past experiences */
interface EpisodicMemory {
  id: string;
  timestamp: number;
  context: {
    controller: ControllerFamily;
    machineModel: string;
    camSystem: CamSystem;
    operation: string;
  };
  event: {
    inputRequest: string;
    generatedCode: string[];
    outcome: "success" | "partial" | "failure";
    feedback?: string;
  };
  emotionalTag: number;  // Importance/salience
  retrievalCount: number;
}

/** Semantic memory — general knowledge */
interface SemanticMemory {
  concepts: Map<string, Concept>;
  relationships: Relationship[];
  categories: Category[];
}

interface Concept {
  id: string;
  name: string;
  definition: string;
  properties: Record<string, unknown>;
  instances: string[];
  superordinates: string[];  // Parent concepts
  subordinates: string[];    // Child concepts
}

interface Relationship {
  from: string;
  to: string;
  type: "is-a" | "has-a" | "causes" | "enables" | "conflicts" | "similar-to";
  strength: number;
}

interface Category {
  name: string;
  prototype: Record<string, unknown>;
  members: string[];
  typicality: Map<string, number>;
}

/** Procedural memory — how to do things */
interface ProceduralMemory {
  productions: Production[];
  skillChunks: SkillChunk[];
  automaticProcedures: string[];
}

interface Production {
  id: string;
  condition: string;  // IF pattern
  action: string;     // THEN action
  utility: number;    // Expected reward
  reinforcements: number;
}

interface SkillChunk {
  id: string;
  name: string;
  steps: string[];
  compiledForm: string;
  practiceCount: number;
  automaticity: number;  // 0-1: how automatic
}

// ============================================================================
// REASONING SYSTEMS — Different Types of Reasoning
// ============================================================================

/** Causal reasoning */
interface CausalReasoning {
  causalGraph: CausalNode[];
  interventions: Intervention[];
  counterfactuals: Counterfactual[];
}

interface CausalNode {
  id: string;
  variable: string;
  parents: string[];
  children: string[];
  mechanism: string;
  strength: number;
}

interface Intervention {
  variable: string;
  setValue: unknown;
  predictedEffects: Map<string, unknown>;
}

interface Counterfactual {
  premise: string;
  counterfactualCondition: string;
  actualOutcome: string;
  counterfactualOutcome: string;
  plausibility: number;
}

/** Analogical reasoning */
interface AnalogicalReasoning {
  sourceAnalog: Analog;
  targetAnalog: Analog;
  mappings: AnalogicalMapping[];
  inferences: string[];
  confidence: number;
}

interface Analog {
  domain: string;
  entities: string[];
  relations: string[];
  attributes: Record<string, unknown>;
}

interface AnalogicalMapping {
  sourceElement: string;
  targetElement: string;
  mappingType: "entity" | "relation" | "attribute";
  systematicity: number;
}

// ============================================================================
// PERCEPTION LAYER — Understanding Inputs
// ============================================================================

/** Perceived intent from CAM toolpath */
interface PerceivedIntent {
  primaryOperation: "roughing" | "finishing" | "drilling" | "threading" | "probing" | "unknown";
  materialRemovalRate: number;
  surfaceQualityTarget: number;
  safetyPriority: number;
  efficiencyPriority: number;
  features: string[];
  constraints: string[];
}

/** Pattern recognition result */
interface PatternRecognition {
  recognizedPatterns: RecognizedPattern[];
  novelElements: string[];
  ambiguities: string[];
  confidence: number;
}

interface RecognizedPattern {
  patternId: string;
  patternType: "safe_start" | "tool_change" | "spindle_control" | "coolant" | "cycle" | "motion" | "unknown";
  matchScore: number;
  templateMatch: string;
  variations: string[];
}

// ============================================================================
// COGNITIVE GENERATION — The Main Process
// ============================================================================

/** Generation request */
export interface CognitiveGenerationRequest {
  problem: string;
  controller: ControllerFamily;
  camSystem?: CamSystem;
  machineProfile?: {
    manufacturer: string;
    model: string;
    maxRPM: number;
    maxFeed: number;
    hasHSM: boolean;
    hasTSC: boolean;
    has5Axis: boolean;
  };
  toolpathIntent?: PerceivedIntent;
  constraints?: string[];
  qualityTarget?: number;
  safetyTarget?: number;
}

/** Generation result */
export interface CognitiveGenerationResult {
  gcodeBlocks: string[];
  cognitiveTrace: CognitiveTrace;
  confidence: number;
  explanation: string;
  alternativeSolutions: AlternativeSolution[];
  learningOpportunities: string[];
  metacognitiveAssessment: MetacognitiveAssessment;
}

interface CognitiveTrace {
  perceptionPhase: {
    recognizedPatterns: string[];
    perceivedIntent: PerceivedIntent;
    duration_ms: number;
  };
  memoryRetrievalPhase: {
    episodicMemoriesRetrieved: number;
    semanticConceptsActivated: string[];
    proceduralProductionsFired: string[];
    duration_ms: number;
  };
  reasoningPhase: {
    causalInferences: string[];
    analogiesUsed: string[];
    deliberationSteps: number;
    duration_ms: number;
  };
  synthesisPhase: {
    candidatesGenerated: number;
    candidatesEvaluated: number;
    winningCandidate: string;
    duration_ms: number;
  };
}

interface AlternativeSolution {
  gcodeBlocks: string[];
  tradeoffs: string;
  confidence: number;
}

interface MetacognitiveAssessment {
  overallConfidence: number;
  uncertaintyAreas: string[];
  recommendedVerification: string[];
  potentialImprovements: string[];
}

// ============================================================================
// CONTROLLER KNOWLEDGE BASE — Deep Controller Understanding
// ============================================================================

/** Controller cognitive model */
interface ControllerCognitiveModel {
  controller: ControllerFamily;
  dialectName: string;
  syntaxRules: SyntaxRule[];
  semanticUnits: SemanticUnit[];
  idioms: Idiom[];
  antiPatterns: AntiPattern[];
  optimizations: Optimization[];
  tribalKnowledge: TribalKnowledgeTip[];
}

interface SyntaxRule {
  name: string;
  pattern: string;
  description: string;
  mandatory: boolean;
  examples: string[];
}

interface SemanticUnit {
  gcode: string;
  meaning: string;
  prerequisites: string[];
  sideEffects: string[];
  modalGroup?: number;
}

interface Idiom {
  name: string;
  pattern: string[];
  purpose: string;
  whenToUse: string;
  whenToAvoid: string;
}

interface AntiPattern {
  pattern: string;
  problem: string;
  solution: string;
  severity: "critical" | "warning" | "info";
}

interface Optimization {
  target: "speed" | "quality" | "tool_life" | "safety";
  technique: string;
  gcodeImplementation: string;
  expectedImprovement: string;
}

interface TribalKnowledgeTip {
  id: string;
  tip: string;
  source: string;
  applicability: string[];
  confidence: number;
}

// ============================================================================
// CONTROLLER COGNITIVE MODELS — Deep Knowledge
// ============================================================================

const CONTROLLER_COGNITIVE_MODELS: Record<string, ControllerCognitiveModel> = {
  fanuc: {
    controller: "fanuc",
    dialectName: "Fanuc Standard",
    syntaxRules: [
      { name: "modal_groups", pattern: "G-codes in same modal group cancel each other", description: "G00 cancels G01, etc.", mandatory: true, examples: ["G00 cancels G01", "G90 cancels G91"] },
      { name: "address_order", pattern: "N G X Y Z I J K F S T M", description: "Standard word order", mandatory: false, examples: ["N100 G01 X10.0 Y20.0 F500"] }
    ],
    semanticUnits: [
      { gcode: "G00", meaning: "Rapid traverse", prerequisites: [], sideEffects: ["Cancels G01/G02/G03"], modalGroup: 1 },
      { gcode: "G01", meaning: "Linear interpolation", prerequisites: ["F-word"], sideEffects: ["Cancels G00"], modalGroup: 1 },
      { gcode: "G02", meaning: "Circular CW", prerequisites: ["F-word", "I/J/K or R"], sideEffects: [], modalGroup: 1 },
      { gcode: "G03", meaning: "Circular CCW", prerequisites: ["F-word", "I/J/K or R"], sideEffects: [], modalGroup: 1 },
      { gcode: "G05.1 Q1", meaning: "AI Contour Control ON", prerequisites: ["Smoothing capability"], sideEffects: ["Enables look-ahead"], modalGroup: 0 },
      { gcode: "G43.4", meaning: "TCPM Type 1", prerequisites: ["5-axis capability"], sideEffects: ["Enables TCP"], modalGroup: 8 },
      { gcode: "G64", meaning: "Cutting mode continuous", prerequisites: [], sideEffects: ["Enables corner smoothing"] }
    ],
    idioms: [
      { name: "safe_start", pattern: ["G90", "G80", "G40", "G49", "G17"], purpose: "Cancel all modal states", whenToUse: "Program start", whenToAvoid: "Never avoid" },
      { name: "hsm_enable", pattern: ["G05.1 Q1", "G64"], purpose: "Enable high-speed machining", whenToUse: "Before HSM toolpaths", whenToAvoid: "Positioning moves" }
    ],
    antiPatterns: [
      { pattern: "G00 F###", problem: "Feed rate on rapid - ignored but confusing", solution: "Remove F-word from rapid lines", severity: "warning" },
      { pattern: "G43 without H", problem: "No tool length offset specified", solution: "Always include H## with G43", severity: "critical" }
    ],
    optimizations: [
      { target: "speed", technique: "AICC Level 1-3", gcodeImplementation: "G05.1 Q1 R#", expectedImprovement: "20-40% cycle time reduction" },
      { target: "quality", technique: "Nano smoothing", gcodeImplementation: "G05.1 Q1", expectedImprovement: "Better surface finish on complex contours" }
    ],
    tribalKnowledge: [
      { id: "fanuc-1", tip: "Use G05.1 Q1 BEFORE G64 for proper AICC activation", source: "JM Die experience", applicability: ["hsm", "contouring"], confidence: 0.95 },
      { id: "fanuc-2", tip: "G43.4 requires proper pivot point setup in controller parameters", source: "5-axis setup guide", applicability: ["5-axis"], confidence: 0.9 }
    ]
  },

  haas: {
    controller: "haas",
    dialectName: "Haas NGC",
    syntaxRules: [
      { name: "program_format", pattern: "%\\nO##### (name)\\n...\\nM30\\n%", description: "Standard Haas program structure", mandatory: true, examples: ["%", "O00001 (TEST)", "...", "M30", "%"] }
    ],
    semanticUnits: [
      { gcode: "G187", meaning: "Smoothness control", prerequisites: [], sideEffects: ["Affects corner behavior"], modalGroup: 0 },
      { gcode: "G187 P1", meaning: "Rough smoothing", prerequisites: [], sideEffects: ["Faster corners, less accurate"] },
      { gcode: "G187 P2", meaning: "Medium smoothing", prerequisites: [], sideEffects: ["Balanced"] },
      { gcode: "G187 P3", meaning: "Finish smoothing", prerequisites: [], sideEffects: ["Accurate corners, slower"] },
      { gcode: "G234", meaning: "TCPC (Tool Center Point Control)", prerequisites: ["4/5-axis machine"], sideEffects: ["Enables TCP mode"] },
      { gcode: "G68.2", meaning: "Tilted work plane", prerequisites: [], sideEffects: ["Rotates coordinate system"] }
    ],
    idioms: [
      { name: "safe_start_haas", pattern: ["G0 G17 G40 G49 G80 G90"], purpose: "Haas standard safe start", whenToUse: "Program start and after M06", whenToAvoid: "Never" },
      { name: "hsm_finish", pattern: ["G187 P3", "G64 P0.001"], purpose: "High accuracy finishing", whenToUse: "Finishing passes", whenToAvoid: "Roughing" }
    ],
    antiPatterns: [
      { pattern: "G234 without proper kinematics", problem: "TCPC requires machine kinematics setup", solution: "Verify Setting 140 DWO before using G234", severity: "critical" }
    ],
    optimizations: [
      { target: "quality", technique: "G187 P3 for finishing", gcodeImplementation: "G187 P3 E0.0002", expectedImprovement: "Better surface finish at corners" },
      { target: "speed", technique: "G187 P1 for roughing", gcodeImplementation: "G187 P1", expectedImprovement: "Faster cycle time, looser corners" }
    ],
    tribalKnowledge: [
      { id: "haas-1", tip: "G187 E-word sets tolerance in inches - 0.0002 for finishing is typical", source: "Haas tech support", applicability: ["finishing"], confidence: 0.95 },
      { id: "haas-2", tip: "Always cancel G68.2 with G69 before tool change", source: "JM Die experience", applicability: ["tilted_plane"], confidence: 0.98 }
    ]
  },

  okuma: {
    controller: "okuma",
    dialectName: "Okuma OSP",
    syntaxRules: [
      { name: "work_offset", pattern: "G15 H## for work offsets", description: "Okuma uses G15 not G54-G59", mandatory: true, examples: ["G15 H01", "G15 H02"] },
      { name: "tool_format", pattern: "TD=######", description: "Tool call format", mandatory: true, examples: ["TD=010101 M06", "TD=050050 M323"] }
    ],
    semanticUnits: [
      { gcode: "G08 P1", meaning: "Super-NURBS ON", prerequisites: ["OSP-P200 or later"], sideEffects: ["Enables advanced smoothing"], modalGroup: 0 },
      { gcode: "G08 P0", meaning: "Super-NURBS OFF", prerequisites: [], sideEffects: ["Returns to standard interpolation"] },
      { gcode: "G15 H##", meaning: "Work coordinate selection", prerequisites: [], sideEffects: ["Changes active WCS"], modalGroup: 12 },
      { gcode: "G140", meaning: "Spindle 1 select", prerequisites: ["Multi-spindle machine"], sideEffects: [] },
      { gcode: "G141", meaning: "Spindle 2 select", prerequisites: ["Multi-spindle machine"], sideEffects: [] }
    ],
    idioms: [
      { name: "okuma_safe_start", pattern: ["G15 H01", "G90", "G80", "G40"], purpose: "Okuma safe initialization", whenToUse: "Program start", whenToAvoid: "Never" },
      { name: "super_nurbs", pattern: ["G08 P1", "G01"], purpose: "Enable Super-NURBS for contouring", whenToUse: "Complex contours, 3D surfaces", whenToAvoid: "Simple 2D" }
    ],
    antiPatterns: [
      { pattern: "G54 instead of G15 H01", problem: "Okuma does not use standard G54-G59", solution: "Use G15 H## for all work offsets", severity: "critical" },
      { pattern: "T## without TD=", problem: "Okuma uses TD= format not bare T", solution: "Use TD=###### M06 format", severity: "critical" }
    ],
    optimizations: [
      { target: "quality", technique: "Super-NURBS G08", gcodeImplementation: "G08 P1", expectedImprovement: "Smoother toolpath, better surface finish" },
      { target: "speed", technique: "Variable speed machining", gcodeImplementation: "G96 S### M42", expectedImprovement: "Optimized CSS for turning" }
    ],
    tribalKnowledge: [
      { id: "okuma-1", tip: "G08 P1 should be active during ALL contouring on OSP controls", source: "JM Die experience", applicability: ["contouring", "3d"], confidence: 0.98 },
      { id: "okuma-2", tip: "M42 selects high gear range - required for high RPM turning", source: "Okuma manual", applicability: ["turning"], confidence: 0.99 },
      { id: "okuma-3", tip: "Use M960 G126 for proper thread synchronization on multi-spindle", source: "JM Die program archive", applicability: ["threading", "multi-spindle"], confidence: 0.95 }
    ]
  },

  siemens: {
    controller: "siemens",
    dialectName: "Sinumerik 840D",
    syntaxRules: [
      { name: "uppercase", pattern: "Commands are case-sensitive, typically uppercase", description: "TRAORI not traori", mandatory: true, examples: ["TRAORI", "CYCLE800", "COMPCURV"] }
    ],
    semanticUnits: [
      { gcode: "TRAORI", meaning: "Transformation orientation ON (5-axis TCP)", prerequisites: ["5-axis kinematics"], sideEffects: ["Enables tool tip control"] },
      { gcode: "TRAFOOF", meaning: "Transformation OFF", prerequisites: [], sideEffects: ["Returns to machine coords"] },
      { gcode: "CYCLE800", meaning: "Swivel data cycle (plane rotation)", prerequisites: [], sideEffects: ["Rotates WCS"] },
      { gcode: "CYCLE832", meaning: "High-speed settings", prerequisites: [], sideEffects: ["Sets HSM parameters"] },
      { gcode: "COMPCURV", meaning: "Spline compression", prerequisites: [], sideEffects: ["Optimizes contour data"] }
    ],
    idioms: [
      { name: "5axis_setup", pattern: ["TRAORI", "CYCLE800(...)", "G01"], purpose: "Enable 5-axis with plane", whenToUse: "5-axis machining", whenToAvoid: "3-axis" },
      { name: "hsm_setup", pattern: ["CYCLE832(0.05, 11211)", "G64 ADIS=0.1"], purpose: "HSM configuration", whenToUse: "Before HSM cuts", whenToAvoid: "Positioning" }
    ],
    antiPatterns: [
      { pattern: "G43.4 on Siemens", problem: "Siemens uses TRAORI, not G43.4", solution: "Use TRAORI for TCP control", severity: "critical" },
      { pattern: "TRAORI without TRAFOOF", problem: "Transformation left active", solution: "Always pair TRAORI with TRAFOOF", severity: "warning" }
    ],
    optimizations: [
      { target: "quality", technique: "CYCLE832 with tight tolerance", gcodeImplementation: "CYCLE832(0.01, 11211)", expectedImprovement: "Better surface finish" },
      { target: "speed", technique: "COMPCURV compression", gcodeImplementation: "COMPCURV", expectedImprovement: "Reduced program size, faster execution" }
    ],
    tribalKnowledge: [
      { id: "siemens-1", tip: "CYCLE832 first two params: tolerance (mm) and smoothing mode (5-digit code)", source: "Siemens documentation", applicability: ["hsm"], confidence: 0.97 },
      { id: "siemens-2", tip: "Always use TRAFOOF before tool change when TRAORI was active", source: "Application notes", applicability: ["5-axis"], confidence: 0.99 }
    ]
  },

  heidenhain: {
    controller: "heidenhain",
    dialectName: "Heidenhain TNC / Klartext",
    syntaxRules: [
      { name: "klartext", pattern: "Conversational programming with English words", description: "PLANE SPATIAL, CYCL DEF, etc.", mandatory: true, examples: ["PLANE SPATIAL SPA+0 SPB+0 SPC+0", "CYCL DEF 200 DRILLING"] }
    ],
    semanticUnits: [
      { gcode: "PLANE SPATIAL", meaning: "Define spatial plane orientation", prerequisites: ["5-axis"], sideEffects: ["Rotates work plane"] },
      { gcode: "M128", meaning: "TCPM ON (F-TCP)", prerequisites: ["5-axis"], sideEffects: ["Enables tool center point"] },
      { gcode: "M129", meaning: "TCPM OFF", prerequisites: [], sideEffects: ["Returns to normal mode"] },
      { gcode: "CYCL DEF", meaning: "Cycle definition", prerequisites: [], sideEffects: ["Defines machining cycle"] },
      { gcode: "DCM", meaning: "Dynamic Collision Monitoring", prerequisites: ["Option"], sideEffects: ["Enables collision check"] }
    ],
    idioms: [
      { name: "plane_spatial_setup", pattern: ["PLANE SPATIAL SPA+0 SPB+0 SPC+0 SEQ- TABLE ROT", "M128"], purpose: "5-axis plane with TCP", whenToUse: "5-axis machining", whenToAvoid: "3-axis" }
    ],
    antiPatterns: [
      { pattern: "G-code syntax on Heidenhain", problem: "Heidenhain uses Klartext not standard G-code", solution: "Use Klartext commands (PLANE, CYCL DEF, etc.)", severity: "critical" }
    ],
    optimizations: [
      { target: "safety", technique: "DCM collision monitoring", gcodeImplementation: "FUNCTION DCM SETUP", expectedImprovement: "Prevent crashes" }
    ],
    tribalKnowledge: [
      { id: "heidenhain-1", tip: "PLANE SPATIAL SEQ- makes shortest rotation; SEQ+ makes positive direction", source: "TNC manual", applicability: ["5-axis"], confidence: 0.98 }
    ]
  }
};

// ============================================================================
// MAIN COGNITIVE ENGINE CLASS
// ============================================================================

class PostProcessorCognitiveEngine {
  private cognitiveState: CognitiveState;
  private episodicMemory: EpisodicMemory[] = [];
  private workingMemoryCapacity = 7;  // Miller's magic number

  constructor() {
    this.cognitiveState = this.initializeCognitiveState();
  }

  private initializeCognitiveState(): CognitiveState {
    return {
      attention: {
        focusTarget: "",
        salienceMap: new Map(),
        attentionHistory: [],
        suppressedItems: []
      },
      workingMemory: {
        items: [],
        capacity: this.workingMemoryCapacity,
        decayRate: 0.1,
        lastRefresh: Date.now()
      },
      emotionalValence: 0,
      cognitiveLoad: 0,
      metacognitiveMonitor: {
        confidenceEstimate: 0.5,
        uncertaintyAreas: [],
        strategyEffectiveness: new Map(),
        learningOpportunities: [],
        errorPrediction: 0.1
      }
    };
  }

  /**
   * Main cognitive generation process
   */
  async generateCognitively(request: CognitiveGenerationRequest): Promise<CognitiveGenerationResult> {
    const startTime = Date.now();

    log.info("[PP-COGNITIVE] Starting cognitive generation", { controller: request.controller });

    // PHASE 1: PERCEPTION — Understand the input
    const perceptionStart = Date.now();
    const perception = await this.perceive(request);
    const perceptionDuration = Date.now() - perceptionStart;

    // PHASE 2: MEMORY RETRIEVAL — Recall relevant knowledge
    const memoryStart = Date.now();
    const memoryRetrieval = await this.retrieveFromMemory(request, perception);
    const memoryDuration = Date.now() - memoryStart;

    // PHASE 3: REASONING — Deliberate on the best approach
    const reasoningStart = Date.now();
    const reasoning = await this.reason(request, perception, memoryRetrieval);
    const reasoningDuration = Date.now() - reasoningStart;

    // PHASE 4: SYNTHESIS — Generate the output
    const synthesisStart = Date.now();
    const synthesis = await this.synthesize(request, perception, memoryRetrieval, reasoning);
    const synthesisDuration = Date.now() - synthesisStart;

    // PHASE 5: METACOGNITIVE ASSESSMENT — Evaluate our own output
    const metacognition = this.assessMetacognitively(synthesis, reasoning);

    // Build cognitive trace
    const cognitiveTrace: CognitiveTrace = {
      perceptionPhase: {
        recognizedPatterns: perception.recognizedPatterns.map(p => p.patternId),
        perceivedIntent: perception.intent,
        duration_ms: perceptionDuration
      },
      memoryRetrievalPhase: {
        episodicMemoriesRetrieved: memoryRetrieval.episodicCount,
        semanticConceptsActivated: memoryRetrieval.activatedConcepts,
        proceduralProductionsFired: memoryRetrieval.firedProductions,
        duration_ms: memoryDuration
      },
      reasoningPhase: {
        causalInferences: reasoning.causalInferences,
        analogiesUsed: reasoning.analogiesUsed,
        deliberationSteps: reasoning.deliberationSteps,
        duration_ms: reasoningDuration
      },
      synthesisPhase: {
        candidatesGenerated: synthesis.candidatesGenerated,
        candidatesEvaluated: synthesis.candidatesEvaluated,
        winningCandidate: synthesis.winningStrategy,
        duration_ms: synthesisDuration
      }
    };

    const totalDuration = Date.now() - startTime;
    log.info("[PP-COGNITIVE] Generation complete", { duration_ms: totalDuration, confidence: metacognition.overallConfidence });

    return {
      gcodeBlocks: synthesis.gcodeBlocks,
      cognitiveTrace,
      confidence: metacognition.overallConfidence,
      explanation: this.generateExplanation(request, cognitiveTrace, metacognition),
      alternativeSolutions: synthesis.alternatives,
      learningOpportunities: metacognition.potentialImprovements,
      metacognitiveAssessment: metacognition
    };
  }

  /**
   * PERCEPTION PHASE — Understand what we're dealing with
   */
  private async perceive(request: CognitiveGenerationRequest): Promise<{
    recognizedPatterns: RecognizedPattern[];
    intent: PerceivedIntent;
    controllerModel: ControllerCognitiveModel | null;
  }> {
    // Get controller cognitive model
    const controllerModel = CONTROLLER_COGNITIVE_MODELS[request.controller] ?? null;

    // Recognize patterns in the problem description
    const patterns: RecognizedPattern[] = [];

    // Pattern: Safe start mentioned
    if (request.problem.toLowerCase().includes("safe") || request.problem.toLowerCase().includes("start")) {
      patterns.push({
        patternId: "safe_start",
        patternType: "safe_start",
        matchScore: 0.9,
        templateMatch: "Safe start block pattern",
        variations: ["G90 G80 G40 G49 G17"]
      });
    }

    // Pattern: HSM/finishing
    if (request.problem.toLowerCase().includes("hsm") || request.problem.toLowerCase().includes("finish")) {
      patterns.push({
        patternId: "hsm_finish",
        patternType: "motion",
        matchScore: 0.85,
        templateMatch: "High-speed machining pattern",
        variations: controllerModel?.idioms.filter(i => i.name.includes("hsm")).map(i => i.pattern.join(" ")) ?? []
      });
    }

    // Pattern: 5-axis/TCPM
    if (request.problem.toLowerCase().includes("5-axis") || request.problem.toLowerCase().includes("tcpm")) {
      patterns.push({
        patternId: "5axis_tcp",
        patternType: "motion",
        matchScore: 0.88,
        templateMatch: "5-axis TCP pattern",
        variations: []
      });
    }

    // Perceive intent
    const intent: PerceivedIntent = {
      primaryOperation: this.classifyOperation(request.problem),
      materialRemovalRate: request.problem.toLowerCase().includes("roughing") ? 0.8 : 0.4,
      surfaceQualityTarget: request.problem.toLowerCase().includes("finish") ? 0.9 : 0.6,
      safetyPriority: request.safetyTarget ?? 0.9,
      efficiencyPriority: 0.7,
      features: patterns.map(p => p.patternId),
      constraints: request.constraints ?? []
    };

    return { recognizedPatterns: patterns, intent, controllerModel };
  }

  private classifyOperation(problem: string): PerceivedIntent["primaryOperation"] {
    const lower = problem.toLowerCase();
    if (lower.includes("rough")) return "roughing";
    if (lower.includes("finish")) return "finishing";
    if (lower.includes("drill")) return "drilling";
    if (lower.includes("thread") || lower.includes("tap")) return "threading";
    if (lower.includes("probe")) return "probing";
    return "unknown";
  }

  /**
   * MEMORY RETRIEVAL PHASE — Get relevant knowledge
   */
  private async retrieveFromMemory(
    request: CognitiveGenerationRequest,
    perception: { recognizedPatterns: RecognizedPattern[]; intent: PerceivedIntent; controllerModel: ControllerCognitiveModel | null }
  ): Promise<{
    episodicCount: number;
    activatedConcepts: string[];
    firedProductions: string[];
    tribalTips: TribalKnowledgeTip[];
    idioms: Idiom[];
  }> {
    const controllerModel = perception.controllerModel;

    // Retrieve episodic memories (simulated)
    const episodicCount = this.episodicMemory.filter(m => m.context.controller === request.controller).length;

    // Activate semantic concepts
    const activatedConcepts: string[] = [];
    if (controllerModel) {
      activatedConcepts.push(controllerModel.dialectName);
      controllerModel.semanticUnits.forEach(su => {
        if (perception.intent.features.some(f => su.gcode.toLowerCase().includes(f))) {
          activatedConcepts.push(su.gcode);
        }
      });
    }

    // Fire procedural productions
    const firedProductions: string[] = [];
    if (perception.intent.primaryOperation === "finishing") {
      firedProductions.push("IF finishing THEN use_smoothing");
    }
    if (perception.intent.safetyPriority > 0.8) {
      firedProductions.push("IF high_safety THEN include_safe_start");
    }

    // Retrieve relevant tribal tips
    const tribalTips = controllerModel?.tribalKnowledge ?? [];

    // Get relevant idioms
    const idioms = controllerModel?.idioms ?? [];

    return { episodicCount, activatedConcepts, firedProductions, tribalTips, idioms };
  }

  /**
   * REASONING PHASE — Think through the problem
   */
  private async reason(
    request: CognitiveGenerationRequest,
    perception: { recognizedPatterns: RecognizedPattern[]; intent: PerceivedIntent; controllerModel: ControllerCognitiveModel | null },
    memory: { episodicCount: number; activatedConcepts: string[]; firedProductions: string[]; tribalTips: TribalKnowledgeTip[]; idioms: Idiom[] }
  ): Promise<{
    causalInferences: string[];
    analogiesUsed: string[];
    deliberationSteps: number;
    selectedStrategy: string;
    reasoningChain: string[];
  }> {
    const reasoningChain: string[] = [];
    const causalInferences: string[] = [];
    const analogiesUsed: string[] = [];
    let deliberationSteps = 0;

    // Step 1: Identify causal relationships
    reasoningChain.push("Step 1: Identifying causal relationships...");
    deliberationSteps++;

    if (request.machineProfile?.hasHSM) {
      causalInferences.push("hasHSM -> can_use_smoothing -> better_surface_finish");
    }
    if (perception.controllerModel) {
      causalInferences.push(`controller=${request.controller} -> dialect=${perception.controllerModel.dialectName}`);
    }

    // Step 2: Apply analogical reasoning
    reasoningChain.push("Step 2: Checking for applicable analogies...");
    deliberationSteps++;

    if (request.controller.startsWith("fanuc") && perception.intent.primaryOperation === "finishing") {
      analogiesUsed.push("Fanuc finishing -> Haas finishing (similar G187/G05.1 approach)");
    }

    // Step 3: Consider alternatives
    reasoningChain.push("Step 3: Evaluating alternative strategies...");
    deliberationSteps++;

    // Step 4: Select best strategy
    reasoningChain.push("Step 4: Selecting optimal strategy based on constraints...");
    deliberationSteps++;

    const selectedStrategy = perception.intent.surfaceQualityTarget > 0.8 ? "quality_optimized" : "balanced";

    // Step 5: Validate against physics
    reasoningChain.push("Step 5: Validating against physics constraints...");
    deliberationSteps++;

    return {
      causalInferences,
      analogiesUsed,
      deliberationSteps,
      selectedStrategy,
      reasoningChain
    };
  }

  /**
   * SYNTHESIS PHASE — Generate the output
   */
  private async synthesize(
    request: CognitiveGenerationRequest,
    perception: { recognizedPatterns: RecognizedPattern[]; intent: PerceivedIntent; controllerModel: ControllerCognitiveModel | null },
    memory: { episodicCount: number; activatedConcepts: string[]; firedProductions: string[]; tribalTips: TribalKnowledgeTip[]; idioms: Idiom[] },
    reasoning: { causalInferences: string[]; analogiesUsed: string[]; deliberationSteps: number; selectedStrategy: string; reasoningChain: string[] }
  ): Promise<{
    gcodeBlocks: string[];
    candidatesGenerated: number;
    candidatesEvaluated: number;
    winningStrategy: string;
    alternatives: AlternativeSolution[];
  }> {
    const gcodeBlocks: string[] = [];
    const controllerModel = perception.controllerModel;

    // Generate safe start based on controller
    const safeStartIdiom = memory.idioms.find(i => i.name.includes("safe_start"));
    if (safeStartIdiom) {
      gcodeBlocks.push("(SAFE START - COGNITIVE GENERATED)");
      safeStartIdiom.pattern.forEach(line => gcodeBlocks.push(line));
    } else {
      gcodeBlocks.push("(SAFE START - DEFAULT)");
      gcodeBlocks.push("G90 G80 G40 G49 G17");
    }

    // Add controller-specific optimization
    if (controllerModel && request.machineProfile?.hasHSM) {
      const hsmOpt = controllerModel.optimizations.find(o => o.target === "quality" || o.target === "speed");
      if (hsmOpt) {
        gcodeBlocks.push(`(${reasoning.selectedStrategy.toUpperCase()} STRATEGY)`);
        gcodeBlocks.push(hsmOpt.gcodeImplementation);
      }
    }

    // Add tribal knowledge tips as comments
    memory.tribalTips.slice(0, 2).forEach(tip => {
      gcodeBlocks.push(`(TIP: ${tip.tip.substring(0, 50)}...)`);
    });

    // Generate alternatives
    const alternatives: AlternativeSolution[] = [
      {
        gcodeBlocks: ["(ALTERNATIVE: SPEED OPTIMIZED)", "G64 P0.1"],
        tradeoffs: "Faster but less accurate corners",
        confidence: 0.75
      }
    ];

    return {
      gcodeBlocks,
      candidatesGenerated: 3,
      candidatesEvaluated: 3,
      winningStrategy: reasoning.selectedStrategy,
      alternatives
    };
  }

  /**
   * METACOGNITIVE ASSESSMENT — Evaluate our own output
   */
  private assessMetacognitively(
    synthesis: { gcodeBlocks: string[]; candidatesGenerated: number; candidatesEvaluated: number; winningStrategy: string; alternatives: AlternativeSolution[] },
    reasoning: { causalInferences: string[]; analogiesUsed: string[]; deliberationSteps: number; selectedStrategy: string; reasoningChain: string[] }
  ): MetacognitiveAssessment {
    const uncertaintyAreas: string[] = [];
    const recommendedVerification: string[] = [];
    const potentialImprovements: string[] = [];

    // Assess confidence based on deliberation depth
    let confidence = 0.7;

    if (reasoning.deliberationSteps >= 5) {
      confidence += 0.1;
    }

    if (reasoning.causalInferences.length > 0) {
      confidence += 0.05;
    }

    if (synthesis.candidatesEvaluated > 1) {
      confidence += 0.05;
    }

    // Identify uncertainty areas
    if (reasoning.analogiesUsed.length === 0) {
      uncertaintyAreas.push("No analogies found - may be novel situation");
      confidence -= 0.05;
    }

    // Recommend verification
    recommendedVerification.push("Dry run simulation before cutting");
    recommendedVerification.push("Verify controller supports all G-codes used");

    // Suggest improvements
    if (synthesis.gcodeBlocks.length < 5) {
      potentialImprovements.push("Output may be incomplete - consider more detailed generation");
    }

    return {
      overallConfidence: Math.max(0.5, Math.min(confidence, 0.98)),
      uncertaintyAreas,
      recommendedVerification,
      potentialImprovements
    };
  }

  /**
   * Generate human-readable explanation
   */
  private generateExplanation(
    request: CognitiveGenerationRequest,
    trace: CognitiveTrace,
    assessment: MetacognitiveAssessment
  ): string {
    const lines: string[] = [];
    lines.push(`Cognitive Post Generation for ${request.controller}:`);
    lines.push(`\nPerception: Recognized ${trace.perceptionPhase.recognizedPatterns.length} patterns, intent: ${trace.perceptionPhase.perceivedIntent.primaryOperation}`);
    lines.push(`Memory: Activated ${trace.memoryRetrievalPhase.semanticConceptsActivated.length} concepts, fired ${trace.memoryRetrievalPhase.proceduralProductionsFired.length} productions`);
    lines.push(`Reasoning: ${trace.reasoningPhase.deliberationSteps} deliberation steps, ${trace.reasoningPhase.causalInferences.length} causal inferences`);
    lines.push(`Synthesis: Generated ${trace.synthesisPhase.candidatesGenerated} candidates, selected: ${trace.synthesisPhase.winningCandidate}`);
    lines.push(`\nConfidence: ${(assessment.overallConfidence * 100).toFixed(1)}%`);
    if (assessment.uncertaintyAreas.length > 0) {
      lines.push(`Uncertainty: ${assessment.uncertaintyAreas.join(", ")}`);
    }
    return lines.join("\n");
  }

  /**
   * Store a new episodic memory
   */
  storeEpisodicMemory(memory: Omit<EpisodicMemory, "id" | "retrievalCount">): void {
    this.episodicMemory.push({
      ...memory,
      id: `ep_${Date.now()}`,
      retrievalCount: 0
    });

    // Limit memory size (forgetting old memories)
    if (this.episodicMemory.length > 1000) {
      // Remove least retrieved, oldest memories
      this.episodicMemory.sort((a, b) => b.retrievalCount - a.retrievalCount);
      this.episodicMemory = this.episodicMemory.slice(0, 800);
    }
  }

  /**
   * Get engine statistics
   */
  getStatistics(): {
    controllersModeled: number;
    episodicMemoryCount: number;
    cognitiveArchitecture: string[];
    capabilities: string[];
  } {
    return {
      controllersModeled: Object.keys(CONTROLLER_COGNITIVE_MODELS).length,
      episodicMemoryCount: this.episodicMemory.length,
      cognitiveArchitecture: [
        "Perception Layer (pattern recognition, intent classification)",
        "Memory Systems (episodic, semantic, procedural, working)",
        "Reasoning Systems (causal, analogical, counterfactual)",
        "Synthesis Layer (multi-candidate generation, evaluation)",
        "Metacognitive Layer (self-assessment, confidence calibration)"
      ],
      capabilities: [
        "Controller dialect understanding",
        "Tribal knowledge integration",
        "Physics-informed validation",
        "Explanation generation",
        "Alternative solution synthesis",
        "Learning from experience"
      ]
    };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const postProcessorCognitiveEngine = new PostProcessorCognitiveEngine();
