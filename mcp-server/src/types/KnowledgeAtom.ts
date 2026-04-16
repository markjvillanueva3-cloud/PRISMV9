/**
 * KnowledgeAtom.ts — KAR-MS0 U-KAR01
 * Universal Knowledge Atom Model with Source Provenance
 *
 * This interface unifies 13+ existing knowledge interfaces:
 * - KnowledgeTip (TribalKnowledgeEngine)
 * - ExtractedTip (extractedKnowledgeBridge, SocialMediaParserEngine)
 * - KnowledgeBaseEntry (KnowledgeBaseRegistry)
 * - KnowledgeEntry (ApprenticeEngine)
 * - DiscoveredResource, ExtractionResult (KnowledgeIngestionOrchestratorEngine)
 * - OkumaDialectTip, ControllerKnowledgeDB
 * - CamInsight, TipEntry, etc.
 *
 * Design principles:
 * - Confidence normalized to 0-1 (adapters convert 0-100)
 * - Content field unifies body/text/tip/insight/description
 * - Source provenance tracks origin with authority ranking
 * - Payload supports type-specific extensions
 * - Targets array enables declarative wiring
 */

import { z } from "zod";

// ============================================================================
// Source Type Enumerations
// ============================================================================

/**
 * Primary source types for knowledge extraction.
 * Maps to extraction pipeline categories.
 */
export const KnowledgeSourceTypeEnum = z.enum([
  "pdf",           // PDF documents (handbooks, catalogs, papers)
  "video",         // Video tutorials and courses
  "program",       // CNC programs (.MIN, .nc, .mcx)
  "database",      // Registry/catalog databases
  "tribal",        // Operator tips, shop floor knowledge
  "academic",      // Academic papers, MIT courses
  "manual",        // Machine/controller manuals
  "catalog",       // Tool/material catalogs
  "standard",      // ISO/ANSI/DIN standards
  "social",        // Social media (forums, Reddit, etc.)
  "erp",           // ERP/MES system data
  "unknown",       // Unclassified
]);
export type KnowledgeSourceType = z.infer<typeof KnowledgeSourceTypeEnum>;

/**
 * Resource categories from KnowledgeIngestionOrchestratorEngine.
 * Used for routing to appropriate extractors.
 */
export const ResourceCategoryEnum = z.enum([
  "tool_catalog",
  "handbook",
  "mit_course",
  "academic_paper",
  "machine_manual",
  "standard",
  "cnc_program",
  "tribal_knowledge",
  "video_tutorial",
  "unknown",
]);
export type ResourceCategory = z.infer<typeof ResourceCategoryEnum>;

/**
 * Knowledge type discriminant for payload typing.
 */
export const KnowledgeTypeEnum = z.enum([
  "formula",       // Mathematical formula (Kienzle, Taylor, etc.)
  "tip",           // Practical tip/insight
  "tool",          // Cutting tool data
  "material",      // Material properties
  "algorithm",     // Computational algorithm
  "workflow",      // Process workflow/sequence
  "parameter",     // Cutting parameters (S/F)
  "alarm",         // Alarm code/diagnostic
  "controller",    // Controller-specific knowledge
  "machine",       // Machine capability/spec
  "process",       // Process knowledge
  "quality",       // Quality/inspection knowledge
  "safety",        // Safety procedure
  "maintenance",   // Maintenance procedure
  "general",       // General knowledge
]);
export type KnowledgeType = z.infer<typeof KnowledgeTypeEnum>;

/**
 * Authority level for conflict resolution.
 * Higher = more trusted.
 */
export const AuthorityLevelEnum = z.enum([
  "canonical",     // 10: ISO standards, physics constants
  "manufacturer",  // 9: Tool/machine manufacturer data
  "academic",      // 8: Peer-reviewed papers, MIT courses
  "handbook",      // 7: Machinery's Handbook, reference books
  "expert",        // 6: Expert-validated tribal knowledge
  "proven",        // 5: Proven from production programs
  "operator",      // 4: Operator experience (unvalidated)
  "inferred",      // 3: ML/algorithm inferred
  "social",        // 2: Social media, forums
  "unknown",       // 1: Unknown provenance
]);
export type AuthorityLevel = z.infer<typeof AuthorityLevelEnum>;

/** Numeric authority values for ranking */
export const AUTHORITY_RANK: Record<AuthorityLevel, number> = {
  canonical: 10,
  manufacturer: 9,
  academic: 8,
  handbook: 7,
  expert: 6,
  proven: 5,
  operator: 4,
  inferred: 3,
  social: 2,
  unknown: 1,
};

// ============================================================================
// Source Provenance Schema
// ============================================================================

/**
 * Source provenance tracks where knowledge came from.
 * Essential for lineage tracking and conflict resolution.
 */
export const KnowledgeSourceSchema = z.object({
  /** File path or URL where knowledge was extracted from */
  path: z.string(),

  /** Primary source type */
  sourceType: KnowledgeSourceTypeEnum,

  /** Resource category for routing */
  category: ResourceCategoryEnum,

  /** Authority level for conflict resolution */
  authority: AuthorityLevelEnum,

  /** Numeric authority rank (1-10) */
  authorityRank: z.number().min(1).max(10),

  /** Extraction method used */
  extractionMethod: z.string().optional(),

  /** Page number or timestamp within source */
  location: z.string().optional(),

  /** Original source attribution (author, publisher) */
  attribution: z.string().optional(),

  /** Citation in standard format */
  citation: z.string().optional(),

  /** ISO date when source was published/updated */
  sourceDate: z.string().optional(),
});
export type KnowledgeSource = z.infer<typeof KnowledgeSourceSchema>;

// ============================================================================
// Wiring Target Schema
// ============================================================================

/**
 * Target engine/registry for wiring this atom.
 */
export const WiringTargetSchema = z.object({
  /** Target engine name */
  engine: z.string(),

  /** Action to invoke on target */
  action: z.string(),

  /** Data type being wired */
  dataType: KnowledgeTypeEnum,

  /** Priority (1=highest) */
  priority: z.number().min(1).max(10).default(5),

  /** Whether wiring has been executed */
  wired: z.boolean().default(false),

  /** Timestamp of last wiring attempt */
  wiredAt: z.string().optional(),

  /** Error if wiring failed */
  wireError: z.string().optional(),
});
export type WiringTarget = z.infer<typeof WiringTargetSchema>;

// ============================================================================
// Knowledge Atom Core Schema
// ============================================================================

/**
 * KnowledgeAtom — Universal knowledge container.
 * All extracted knowledge flows through this interface.
 */
export const KnowledgeAtomSchema = z.object({
  /** Unique identifier (UUID or composite key) */
  id: z.string(),

  /** Human-readable title */
  title: z.string(),

  /** Main content (unified from body/text/tip/insight/description) */
  content: z.string(),

  /** Knowledge type discriminant */
  type: KnowledgeTypeEnum,

  /** Category for classification */
  category: z.string(),

  /** Subcategory for finer classification */
  subcategory: z.string().optional(),

  /** Search/filter tags */
  tags: z.array(z.string()).default([]),

  /** Auto-generated tags from ContentAutoTaggerEngine */
  autoTags: z.array(z.string()).optional(),

  /**
   * Confidence score (0-1).
   * Adapters must normalize 0-100 scales to 0-1.
   */
  confidence: z.number().min(0).max(1),

  /** Source provenance (where this came from) */
  source: KnowledgeSourceSchema,

  /** Target engines for wiring */
  targets: z.array(WiringTargetSchema).default([]),

  /** ISO timestamp when extracted */
  extractedAt: z.string(),

  /** ISO timestamp when last updated */
  updatedAt: z.string().optional(),

  /** Usage count for popularity ranking */
  usageCount: z.number().default(0),

  /** Version for conflict resolution */
  version: z.number().default(1),

  /** Previous version ID for lineage */
  previousVersionId: z.string().optional(),

  /**
   * Type-specific payload.
   * Schema varies by KnowledgeType.
   */
  payload: z.record(z.string(), z.any()).optional(),

  // ─── Domain-Specific Fields (optional) ───────────────────────────

  /** Material groups this applies to (ISO P/M/K/N/S/H) */
  materialGroups: z.array(z.string()).optional(),

  /** Operation types (face_milling, turning, drilling, etc.) */
  operationTypes: z.array(z.string()).optional(),

  /** Machine IDs this applies to */
  machineIds: z.array(z.string()).optional(),

  /** Controller types (fanuc, okuma_osp, haas, etc.) */
  controllerTypes: z.array(z.string()).optional(),

  /** Tool types this applies to */
  toolTypes: z.array(z.string()).optional(),

  /** Warnings or edge-case flags */
  warnings: z.array(z.string()).optional(),
});
export type KnowledgeAtom = z.infer<typeof KnowledgeAtomSchema>;

// ============================================================================
// Adapter Functions — Convert existing types to KnowledgeAtom
// ============================================================================

/**
 * Normalize confidence from 0-100 scale to 0-1.
 */
export function normalizeConfidence(value: number): number {
  if (value > 1) {
    return Math.min(1, value / 100);
  }
  return Math.max(0, Math.min(1, value));
}

/**
 * Map string confidence to numeric.
 */
export function mapConfidenceString(conf: "high" | "medium" | "low" | string): number {
  switch (conf) {
    case "high": return 0.9;
    case "medium": return 0.7;
    case "low": return 0.5;
    default: return 0.5;
  }
}

/**
 * Generate a stable ID from source + content hash.
 */
export function generateAtomId(source: string, content: string): string {
  const hash = simpleHash(`${source}:${content}`);
  return `atom-${hash}`;
}

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Adapter: KnowledgeTip → KnowledgeAtom
 * From TribalKnowledgeEngine
 */
export function fromKnowledgeTip(tip: {
  id: string;
  title: string;
  body: string;
  category: string;
  subcategory?: string;
  tags: string[];
  confidence: number;
  source: string;
  created_at: string;
  usage_count?: number;
  material_groups?: string[];
  operation_types?: string[];
  machine_ids?: string[];
  auto_tags?: string[];
}): KnowledgeAtom {
  return {
    id: tip.id,
    title: tip.title,
    content: tip.body,
    type: "tip",
    category: tip.category,
    subcategory: tip.subcategory,
    tags: tip.tags,
    autoTags: tip.auto_tags,
    confidence: normalizeConfidence(tip.confidence),
    source: {
      path: tip.source,
      sourceType: "tribal",
      category: "tribal_knowledge",
      authority: "operator",
      authorityRank: AUTHORITY_RANK.operator,
    },
    targets: [],
    extractedAt: tip.created_at,
    usageCount: tip.usage_count || 0,
    version: 1,
    materialGroups: tip.material_groups,
    operationTypes: tip.operation_types,
    machineIds: tip.machine_ids,
  };
}

/**
 * Adapter: ExtractedTip → KnowledgeAtom
 * From extractedKnowledgeBridge or SocialMediaParserEngine
 */
export function fromExtractedTip(tip: {
  id?: string;
  title: string;
  body: string;
  category: string;
  tags: string[];
  confidence: number;
  source: string;
}): KnowledgeAtom {
  const id = tip.id || generateAtomId(tip.source, tip.body);
  return {
    id,
    title: tip.title,
    content: tip.body,
    type: "tip",
    category: tip.category,
    tags: tip.tags,
    confidence: normalizeConfidence(tip.confidence),
    source: {
      path: tip.source,
      sourceType: "unknown",
      category: "unknown",
      authority: "unknown",
      authorityRank: AUTHORITY_RANK.unknown,
    },
    targets: [],
    extractedAt: new Date().toISOString(),
    usageCount: 0,
    version: 1,
  };
}

/**
 * Adapter: KnowledgeEntry → KnowledgeAtom
 * From ApprenticeEngine
 */
export function fromKnowledgeEntry(entry: {
  knowledge_id: string;
  source: string;
  material: string;
  topic: string;
  insight: string;
  formalized_rule: string;
  physics_validation: string;
  confidence: "high" | "medium" | "low";
  timestamp: string;
}): KnowledgeAtom {
  return {
    id: entry.knowledge_id,
    title: entry.topic,
    content: entry.insight,
    type: "tip",
    category: entry.topic,
    tags: [entry.material],
    confidence: mapConfidenceString(entry.confidence),
    source: {
      path: entry.source,
      sourceType: "tribal",
      category: "tribal_knowledge",
      authority: "expert",
      authorityRank: AUTHORITY_RANK.expert,
    },
    targets: [],
    extractedAt: entry.timestamp,
    usageCount: 0,
    version: 1,
    payload: {
      formalizedRule: entry.formalized_rule,
      physicsValidation: entry.physics_validation,
    },
    materialGroups: [entry.material],
  };
}

/**
 * Adapter: KnowledgeBaseEntry → KnowledgeAtom
 * From KnowledgeBaseRegistry
 */
export function fromKnowledgeBaseEntry(entry: {
  id: string;
  name: string;
  topic: string;
  description: string;
  source_file: string;
  entry_count: number;
  query_types: string[];
  sections: string[];
  keywords: string[];
}): KnowledgeAtom {
  return {
    id: entry.id,
    title: entry.name,
    content: entry.description,
    type: "general",
    category: entry.topic,
    tags: entry.keywords,
    confidence: 0.8, // Reference material is generally reliable
    source: {
      path: entry.source_file,
      sourceType: "database",
      category: "handbook",
      authority: "handbook",
      authorityRank: AUTHORITY_RANK.handbook,
    },
    targets: [],
    extractedAt: new Date().toISOString(),
    usageCount: 0,
    version: 1,
    payload: {
      entryCount: entry.entry_count,
      queryTypes: entry.query_types,
      sections: entry.sections,
    },
  };
}

/**
 * Adapter: ExtractionResult → KnowledgeAtom[]
 * From KnowledgeIngestionOrchestratorEngine
 * Returns multiple atoms (one per extracted item type)
 */
export function fromExtractionResult(result: {
  resource: string;
  category: string;
  extracted: {
    formulas: number;
    tools: number;
    materials: number;
    algorithms: number;
  };
  wiredTo: string[];
}): KnowledgeAtom {
  const categoryMap: Record<string, ResourceCategory> = {
    tool_catalog: "tool_catalog",
    handbook: "handbook",
    mit_course: "mit_course",
    academic_paper: "academic_paper",
    machine_manual: "machine_manual",
    standard: "standard",
  };

  return {
    id: generateAtomId(result.resource, JSON.stringify(result.extracted)),
    title: `Extraction from ${result.resource.split("/").pop()}`,
    content: `Extracted: ${result.extracted.formulas} formulas, ${result.extracted.tools} tools, ${result.extracted.materials} materials, ${result.extracted.algorithms} algorithms`,
    type: "general",
    category: result.category,
    tags: result.wiredTo,
    confidence: 0.85,
    source: {
      path: result.resource,
      sourceType: "pdf",
      category: categoryMap[result.category] || "unknown",
      authority: "handbook",
      authorityRank: AUTHORITY_RANK.handbook,
    },
    targets: result.wiredTo.map((engine) => ({
      engine,
      action: "ingest",
      dataType: "general" as const,
      priority: 5,
      wired: true,
    })),
    extractedAt: new Date().toISOString(),
    usageCount: 0,
    version: 1,
    payload: result.extracted,
  };
}

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Validate a KnowledgeAtom, returning errors if invalid.
 */
export function validateAtom(atom: unknown): { valid: boolean; errors: string[] } {
  const result = KnowledgeAtomSchema.safeParse(atom);
  if (result.success) {
    return { valid: true, errors: [] };
  }
  return {
    valid: false,
    errors: result.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`),
  };
}

/**
 * Parse and validate a KnowledgeAtom.
 * Throws on validation failure.
 */
export function parseAtom(data: unknown): KnowledgeAtom {
  return KnowledgeAtomSchema.parse(data);
}

/**
 * Safely parse a KnowledgeAtom, returning null on failure.
 */
export function safeParseAtom(data: unknown): KnowledgeAtom | null {
  const result = KnowledgeAtomSchema.safeParse(data);
  return result.success ? result.data : null;
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a new KnowledgeAtom with defaults.
 */
export function createAtom(params: {
  title: string;
  content: string;
  type: KnowledgeType;
  category: string;
  sourcePath: string;
  sourceType: KnowledgeSourceType;
  authority: AuthorityLevel;
  confidence?: number;
  tags?: string[];
  payload?: Record<string, unknown>;
}): KnowledgeAtom {
  const id = generateAtomId(params.sourcePath, params.content);
  const now = new Date().toISOString();

  return {
    id,
    title: params.title,
    content: params.content,
    type: params.type,
    category: params.category,
    tags: params.tags || [],
    confidence: params.confidence ?? 0.7,
    source: {
      path: params.sourcePath,
      sourceType: params.sourceType,
      category: mapSourceTypeToCategory(params.sourceType),
      authority: params.authority,
      authorityRank: AUTHORITY_RANK[params.authority],
    },
    targets: [],
    extractedAt: now,
    usageCount: 0,
    version: 1,
    payload: params.payload,
  };
}

function mapSourceTypeToCategory(sourceType: KnowledgeSourceType): ResourceCategory {
  const map: Record<KnowledgeSourceType, ResourceCategory> = {
    pdf: "handbook",
    video: "video_tutorial",
    program: "cnc_program",
    database: "unknown",
    tribal: "tribal_knowledge",
    academic: "academic_paper",
    manual: "machine_manual",
    catalog: "tool_catalog",
    standard: "standard",
    social: "unknown",
    erp: "unknown",
    unknown: "unknown",
  };
  return map[sourceType];
}

// ============================================================================
// Batch Operations
// ============================================================================

/**
 * Validate multiple atoms, returning valid ones and errors.
 */
export function validateAtomBatch(atoms: unknown[]): {
  valid: KnowledgeAtom[];
  invalid: Array<{ index: number; errors: string[] }>;
} {
  const valid: KnowledgeAtom[] = [];
  const invalid: Array<{ index: number; errors: string[] }> = [];

  atoms.forEach((atom, index) => {
    const result = validateAtom(atom);
    if (result.valid) {
      valid.push(atom as KnowledgeAtom);
    } else {
      invalid.push({ index, errors: result.errors });
    }
  });

  return { valid, invalid };
}

/**
 * Deduplicate atoms by ID, keeping highest confidence version.
 */
export function deduplicateAtoms(atoms: KnowledgeAtom[]): KnowledgeAtom[] {
  const byId = new Map<string, KnowledgeAtom>();

  for (const atom of atoms) {
    const existing = byId.get(atom.id);
    if (!existing || atom.confidence > existing.confidence) {
      byId.set(atom.id, atom);
    }
  }

  return Array.from(byId.values());
}

// ============================================================================
// All types are already exported inline above:
// - KnowledgeAtom, KnowledgeSource, WiringTarget
// - KnowledgeSourceType, ResourceCategory, KnowledgeType, AuthorityLevel
// ============================================================================
