/**
 * TextToCADGenerationEngine — CADCAM-DAGI-MS0/U-DAGI09
 *
 * Natural language to CAD model. Parses text like "Make a flanged bushing with
 * 20mm bore, 40mm OD, 10mm flange" into structured specs, then generates CAD.
 *
 * Features:
 *   - Natural language parsing (regex + patterns)
 *   - Dimension extraction with unit conversion
 *   - Feature recognition from descriptions
 *   - Iterative refinement ("add a keyway", "make bore 22mm")
 *   - Multi-turn conversation context
 *   - Integration with NeuralCADGenerationEngine (U-DAGI07)
 *
 * Pipeline:
 *   1. Parse text → extract dimensions, features, material
 *   2. Build structured spec (FeatureSpec[])
 *   3. Generate CAD via NeuralCADGenerationEngine
 *   4. Track conversation for refinements
 *   5. Apply delta modifications on follow-ups
 *
 * @module engines/TextToCADGenerationEngine
 */
import { BaseEngine } from "./BaseEngine.js";
import type { EngineInfo, EngineCapability } from "./IEngine.js";
import {
  neuralCADGenerationEngine,
  type GenerationInput,
  type GenerationBackend,
  type GenerationResult,
  type GenerationConfig,
  type FeatureSpec,
} from "./NeuralCADGenerationEngine.js";
import type { EmbeddingBackend } from "./CADFeatureEmbeddingEngine.js";
import type { RAGCorpusEntry } from "./CADRetrievalAugmentationEngine.js";

// ── Types ────────────────────────────────────────────────────────────────────

/** Parsed dimension from text. */
export interface ParsedDimension {
  name: string;
  value: number;
  unit: "mm" | "in";
  original: string;
}

/** Parsed text result. */
export interface ParsedText {
  description: string;
  dimensions: ParsedDimension[];
  features: FeatureSpec[];
  material?: string;
  machineCategory?: string;
  constraints: string[];
}

/** Conversation turn for multi-turn refinement. */
export interface ConversationTurn {
  id: number;
  userText: string;
  parsed: ParsedText;
  generatedCode: string;
  timestamp: number;
}

/** Conversation context for iterative refinement. */
export interface ConversationContext {
  sessionId: string;
  turns: ConversationTurn[];
  currentSpec: FeatureSpec[];
  material?: string;
}

/** Refinement type. */
export type RefinementType = "add" | "remove" | "modify" | "replace";

/** Detected refinement from text. */
export interface DetectedRefinement {
  type: RefinementType;
  target?: string;
  newValue?: number | string;
  feature?: FeatureSpec;
  description: string;
}

/** Text-to-CAD input. */
export interface TextToCADInput {
  text: string;
  context?: ConversationContext;
  customer?: string;
  machineCategory?: string;
}

/** Text-to-CAD result. */
export interface TextToCADResult {
  success: boolean;
  code: string;
  confidence: number;
  parsed: ParsedText;
  refinements: DetectedRefinement[];
  context: ConversationContext;
  errors: string[];
}

// ── Dimension Patterns ───────────────────────────────────────────────────────

const DIMENSION_PATTERNS = [
  // "25mm diameter", "30 mm bore", "40mm OD"
  /(\d+(?:\.\d+)?)\s*(?:mm|millimeter)\s*(diameter|bore|od|id|length|width|height|depth|thick(?:ness)?|radius|chamfer|fillet)/gi,
  // "1.5 inch length", "2" bore"
  /(\d+(?:\.\d+)?)\s*(?:inch|in|")\s*(diameter|bore|od|id|length|width|height|depth|thick(?:ness)?|radius)/gi,
  // "diameter 25mm", "bore of 30mm"
  /(diameter|bore|od|id|length|width|height|depth|thick(?:ness)?|radius)\s*(?:of|=|:)?\s*(\d+(?:\.\d+)?)\s*(?:mm|in)?/gi,
  // "M10 thread", "M12x1.5"
  /M(\d+)(?:x([\d.]+))?/gi,
  // Fractions: "1/4 inch"
  /(\d+)\/(\d+)\s*(?:inch|in|")/gi,
];

const FEATURE_KEYWORDS: Record<string, string> = {
  shaft: "cylinder",
  bore: "hole",
  hole: "hole",
  thread: "thread",
  keyway: "slot",
  groove: "groove",
  chamfer: "chamfer",
  fillet: "fillet",
  pocket: "pocket",
  slot: "slot",
  boss: "boss",
  flange: "flange",
  plate: "box",
  block: "box",
  bracket: "lbracket",
  bushing: "cylinder",
  spacer: "cylinder",
  collar: "cylinder",
  pulley: "cylinder",
  rib: "rib",
  web: "web",
};

const MATERIAL_KEYWORDS = [
  "steel", "aluminum", "brass", "copper", "titanium", "stainless",
  "4140", "4340", "d2", "m2", "s7", "a2", "h13", "6061", "7075",
  "carbide", "tungsten", "graphite", "plastic", "nylon", "delrin",
];

const REFINEMENT_PATTERNS = [
  { pattern: /add\s+(?:a\s+)?(.+)/i, type: "add" as RefinementType },
  { pattern: /remove\s+(?:the\s+)?(.+)/i, type: "remove" as RefinementType },
  { pattern: /(?:change|make|set)\s+(?:the\s+)?(\w+)\s+(?:to\s+)?(\d+(?:\.\d+)?)/i, type: "modify" as RefinementType },
  { pattern: /increase\s+(?:the\s+)?(\w+)\s+(?:to|by)\s+(\d+(?:\.\d+)?)/i, type: "modify" as RefinementType },
  { pattern: /decrease\s+(?:the\s+)?(\w+)\s+(?:to|by)\s+(\d+(?:\.\d+)?)/i, type: "modify" as RefinementType },
  { pattern: /replace\s+(?:the\s+)?(.+?)\s+with\s+(.+)/i, type: "replace" as RefinementType },
];

// ── Parsing Functions ────────────────────────────────────────────────────────

/**
 * Parse dimensions from text.
 */
function parseDimensions(text: string): ParsedDimension[] {
  const dimensions: ParsedDimension[] = [];
  const lower = text.toLowerCase();

  // Standard dimension patterns
  for (const pattern of DIMENSION_PATTERNS.slice(0, 3)) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      const isReversed = isNaN(parseFloat(match[1]));
      const value = isReversed ? parseFloat(match[2]) : parseFloat(match[1]);
      const name = isReversed ? match[1].toLowerCase() : match[2].toLowerCase();
      const unit = lower.includes("inch") || lower.includes('"') ? "in" : "mm";

      if (!isNaN(value) && name) {
        dimensions.push({
          name: normalizeDimensionName(name),
          value,
          unit: unit as "mm" | "in",
          original: match[0],
        });
      }
    }
  }

  // Thread patterns
  const threadMatches = text.matchAll(/M(\d+)(?:x([\d.]+))?/gi);
  for (const match of threadMatches) {
    dimensions.push({
      name: "threadDiameter",
      value: parseFloat(match[1]),
      unit: "mm",
      original: match[0],
    });
    if (match[2]) {
      dimensions.push({
        name: "threadPitch",
        value: parseFloat(match[2]),
        unit: "mm",
        original: match[0],
      });
    }
  }

  // Fraction patterns
  const fractionMatches = text.matchAll(/(\d+)\/(\d+)\s*(?:inch|in|")/gi);
  for (const match of fractionMatches) {
    const value = parseFloat(match[1]) / parseFloat(match[2]);
    dimensions.push({
      name: "dimension",
      value: value * 25.4, // Convert to mm
      unit: "mm",
      original: match[0],
    });
  }

  return dimensions;
}

function normalizeDimensionName(name: string): string {
  const map: Record<string, string> = {
    od: "outerDiameter",
    id: "innerDiameter",
    dia: "diameter",
    thick: "thickness",
    len: "length",
    wid: "width",
    hgt: "height",
    rad: "radius",
  };
  return map[name] || name;
}

/**
 * Extract features from text.
 */
function extractFeatures(text: string, dimensions: ParsedDimension[]): FeatureSpec[] {
  const features: FeatureSpec[] = [];
  const lower = text.toLowerCase();

  // Find base shape first
  let hasBaseShape = false;
  for (const [keyword, featureType] of Object.entries(FEATURE_KEYWORDS)) {
    if (lower.includes(keyword)) {
      const params: Record<string, number | string> = {};

      // Map dimensions to parameters based on feature type
      for (const dim of dimensions) {
        if (featureType === "cylinder" || featureType === "hole") {
          if (dim.name.includes("diameter") || dim.name === "od") {
            params.diameter = dim.unit === "in" ? dim.value * 25.4 : dim.value;
          } else if (dim.name === "length" || dim.name === "depth") {
            params.length = dim.unit === "in" ? dim.value * 25.4 : dim.value;
          }
        } else if (featureType === "box") {
          if (dim.name === "width") params.width = dim.unit === "in" ? dim.value * 25.4 : dim.value;
          if (dim.name === "length") params.length = dim.unit === "in" ? dim.value * 25.4 : dim.value;
          if (dim.name === "height" || dim.name === "thickness") {
            params.height = dim.unit === "in" ? dim.value * 25.4 : dim.value;
          }
        } else if (featureType === "flange") {
          if (dim.name.includes("outer") || dim.name === "od") {
            params.outerDiameter = dim.unit === "in" ? dim.value * 25.4 : dim.value;
          }
          if (dim.name.includes("inner") || dim.name === "id" || dim.name === "bore") {
            params.innerDiameter = dim.unit === "in" ? dim.value * 25.4 : dim.value;
          }
          if (dim.name === "thickness") {
            params.thickness = dim.unit === "in" ? dim.value * 25.4 : dim.value;
          }
        }
      }

      // Set defaults for missing params
      if (featureType === "cylinder" && !params.diameter) params.diameter = 25;
      if (featureType === "cylinder" && !params.length) params.length = 50;
      if (featureType === "hole" && !params.diameter) params.diameter = 10;
      if (featureType === "hole" && !params.length) params.depth = 20;
      if (featureType === "box" && !params.width) params.width = 50;
      if (featureType === "box" && !params.length) params.length = 50;
      if (featureType === "box" && !params.height) params.height = 10;

      features.push({ type: featureType, params });

      if (["cylinder", "box", "flange"].includes(featureType)) {
        hasBaseShape = true;
      }
    }
  }

  // Add secondary features
  if (lower.includes("chamfer")) {
    const chamDim = dimensions.find(d => d.name === "chamfer");
    features.push({
      type: "chamfer",
      params: { size: chamDim ? (chamDim.unit === "in" ? chamDim.value * 25.4 : chamDim.value) : 1 },
    });
  }

  if (lower.includes("fillet") || lower.includes("rounded")) {
    const radDim = dimensions.find(d => d.name === "radius" || d.name === "fillet");
    features.push({
      type: "fillet",
      params: { radius: radDim ? (radDim.unit === "in" ? radDim.value * 25.4 : radDim.value) : 2 },
    });
  }

  if (lower.includes("thread")) {
    const threadDia = dimensions.find(d => d.name === "threadDiameter");
    const threadPitch = dimensions.find(d => d.name === "threadPitch");
    features.push({
      type: "thread",
      params: {
        diameter: threadDia?.value ?? 10,
        pitch: threadPitch?.value ?? 1.5,
        length: 20,
      },
    });
  }

  // Default to box if no base shape
  if (!hasBaseShape && features.length === 0) {
    features.push({
      type: "box",
      params: { width: 50, length: 50, height: 20 },
    });
  }

  return features;
}

/**
 * Extract material from text.
 */
function extractMaterial(text: string): string | undefined {
  const lower = text.toLowerCase();
  for (const mat of MATERIAL_KEYWORDS) {
    if (lower.includes(mat)) {
      return mat.toUpperCase();
    }
  }
  return undefined;
}

/**
 * Extract constraints from text.
 */
function extractConstraints(text: string): string[] {
  const constraints: string[] = [];
  const lower = text.toLowerCase();

  if (lower.includes("concentric")) constraints.push("concentric");
  if (lower.includes("perpendicular")) constraints.push("perpendicular");
  if (lower.includes("parallel")) constraints.push("parallel");
  if (lower.includes("symmetric")) constraints.push("symmetric");
  if (lower.includes("tangent")) constraints.push("tangent");
  if (lower.includes("centered")) constraints.push("centered");

  return constraints;
}

/**
 * Detect refinements from text.
 */
function detectRefinements(text: string): DetectedRefinement[] {
  const refinements: DetectedRefinement[] = [];

  for (const { pattern, type } of REFINEMENT_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      refinements.push({
        type,
        target: match[1],
        newValue: match[2] ? parseFloat(match[2]) : undefined,
        description: match[0],
      });
    }
  }

  return refinements;
}

/**
 * Apply refinement to existing spec.
 */
function applyRefinement(
  features: FeatureSpec[],
  refinement: DetectedRefinement
): FeatureSpec[] {
  const updated = [...features];

  switch (refinement.type) {
    case "add": {
      // Add new feature from target description
      const target = refinement.target?.toLowerCase() ?? "";
      const featureType = FEATURE_KEYWORDS[target] ?? target;
      updated.push({
        type: featureType,
        params: {},
      });
      break;
    }
    case "remove": {
      // Remove feature matching target
      const target = refinement.target?.toLowerCase() ?? "";
      const idx = updated.findIndex(f =>
        f.type.toLowerCase().includes(target) ||
        (FEATURE_KEYWORDS[target] && f.type === FEATURE_KEYWORDS[target])
      );
      if (idx >= 0) updated.splice(idx, 1);
      break;
    }
    case "modify": {
      // Modify dimension on matching feature
      const target = refinement.target?.toLowerCase() ?? "";
      for (const f of updated) {
        if (target in f.params || normalizeDimensionName(target) in f.params) {
          const key = target in f.params ? target : normalizeDimensionName(target);
          f.params[key] = refinement.newValue ?? f.params[key];
        }
      }
      break;
    }
    case "replace":
      // Full replacement would need more context
      break;
  }

  return updated;
}

// ── Engine ───────────────────────────────────────────────────────────────────

/**
 * TextToCADGenerationEngine — natural language to CAD model.
 */
export class TextToCADGenerationEngine extends BaseEngine {
  constructor() {
    const info: EngineInfo = {
      name: "TextToCADGenerationEngine",
      version: "1.0.0",
      domain: "cad_text",
      description:
        "Natural language to CAD generation. Parses text descriptions into " +
        "structured specs and generates parametric CAD models with iterative refinement.",
    };
    super(info);
  }

  getCapabilities(): EngineCapability[] {
    return [
      { name: "from_text", description: "Generate CAD from natural language", actions: ["from_text"] },
      { name: "parse_text", description: "Parse text to structured spec", actions: ["text_parse"] },
      { name: "refine", description: "Apply iterative refinement", actions: ["text_refine"] },
      { name: "context", description: "Manage conversation context", actions: ["text_context"] },
    ];
  }

  validate(input: unknown): string | null {
    if (input == null || typeof input !== "object") return "input must be an object";
    const obj = input as Record<string, unknown>;
    if (!obj.text || typeof obj.text !== "string") {
      return "text is required and must be a string";
    }
    return null;
  }

  protected async executeImpl(input: unknown): Promise<unknown> {
    const obj = input as Record<string, unknown>;
    const typedInput: TextToCADInput = {
      text: obj.text as string,
      context: obj.context as ConversationContext | undefined,
      customer: obj.customer as string | undefined,
      machineCategory: obj.machineCategory as string | undefined,
    };
    return this.generate(
      typedInput,
      obj.generationBackend as GenerationBackend,
      obj.embeddingBackend as EmbeddingBackend | undefined,
      obj.corpus as RAGCorpusEntry[] | undefined,
      obj.config as GenerationConfig | undefined,
    );
  }

  /**
   * Parse natural language text to structured spec.
   */
  parseText(text: string): ParsedText {
    const dimensions = parseDimensions(text);
    const features = extractFeatures(text, dimensions);
    const material = extractMaterial(text);
    const constraints = extractConstraints(text);

    // Detect machine category
    let machineCategory: string | undefined;
    const lower = text.toLowerCase();
    if (lower.includes("lathe") || lower.includes("turning") || lower.includes("shaft")) {
      machineCategory = "lathe";
    } else if (lower.includes("mill") || lower.includes("pocket") || lower.includes("slot")) {
      machineCategory = "mill";
    } else if (lower.includes("edm") || lower.includes("wire")) {
      machineCategory = "wire_edm";
    }

    return {
      description: text,
      dimensions,
      features,
      material,
      machineCategory,
      constraints,
    };
  }

  /**
   * Create or update conversation context.
   */
  createContext(sessionId?: string): ConversationContext {
    return {
      sessionId: sessionId ?? `session-${Date.now()}`,
      turns: [],
      currentSpec: [],
    };
  }

  /**
   * Detect refinements in text.
   */
  detectRefinements(text: string): DetectedRefinement[] {
    return detectRefinements(text);
  }

  /**
   * Apply refinement to spec.
   */
  applyRefinement(features: FeatureSpec[], refinement: DetectedRefinement): FeatureSpec[] {
    return applyRefinement(features, refinement);
  }

  /**
   * Full text-to-CAD pipeline.
   */
  async generate(
    input: TextToCADInput,
    generationBackend: GenerationBackend,
    embeddingBackend?: EmbeddingBackend,
    corpus?: RAGCorpusEntry[],
    config?: GenerationConfig,
  ): Promise<TextToCADResult> {
    const errors: string[] = [];

    // Create or use existing context
    let context = input.context ?? this.createContext();

    // Parse text
    const parsed = this.parseText(input.text);

    // Detect refinements (for follow-up turns)
    const refinements = this.detectRefinements(input.text);

    // Build feature spec
    let features: FeatureSpec[];
    if (context.turns.length > 0 && refinements.length > 0) {
      // Apply refinements to existing spec
      features = [...context.currentSpec];
      for (const ref of refinements) {
        features = this.applyRefinement(features, ref);
      }
    } else {
      // Use parsed features
      features = parsed.features;
    }

    // Update context
    context.currentSpec = features;
    context.material = parsed.material ?? context.material;

    // Generate via NeuralCADGenerationEngine
    const genInput: GenerationInput = {
      type: "features",
      features,
      text: input.text,
      customer: input.customer,
      machineCategory: input.machineCategory ?? parsed.machineCategory,
    };

    let genResult: GenerationResult;
    try {
      genResult = await neuralCADGenerationEngine.generate(
        genInput,
        generationBackend,
        embeddingBackend,
        corpus,
        config,
      );
    } catch (err) {
      return {
        success: false,
        code: "",
        confidence: 0,
        parsed,
        refinements,
        context,
        errors: [`Generation failed: ${err instanceof Error ? err.message : String(err)}`],
      };
    }

    if (!genResult.success) {
      errors.push(genResult.error ?? "Generation failed");
    }

    // Add turn to context
    context.turns.push({
      id: context.turns.length + 1,
      userText: input.text,
      parsed,
      generatedCode: genResult.code,
      timestamp: Date.now(),
    });

    return {
      success: genResult.success,
      code: genResult.code,
      confidence: genResult.confidence,
      parsed,
      refinements,
      context,
      errors,
    };
  }

  /**
   * Get supported feature keywords.
   */
  getSupportedFeatures(): string[] {
    return Object.keys(FEATURE_KEYWORDS);
  }

  /**
   * Get supported material keywords.
   */
  getSupportedMaterials(): string[] {
    return [...MATERIAL_KEYWORDS];
  }
}

export const textToCADGenerationEngine = new TextToCADGenerationEngine();
