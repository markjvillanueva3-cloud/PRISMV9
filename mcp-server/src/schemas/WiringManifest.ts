/**
 * WiringManifest.ts — KAR-MS0 U-KAR02
 * Declarative wiring configuration for knowledge extraction and routing.
 *
 * Unifies:
 * - CATEGORY_WIRING from KnowledgeIngestionOrchestratorEngine
 * - KNOWLEDGE_CONSUMERS from ExtractionIntelligenceRouter
 * - TYPE_INDICATORS/DOMAIN_INDICATORS patterns
 *
 * Design principles:
 * - JSON-driven configuration (loadable from file)
 * - Priority levels 1-3 for conflict resolution
 * - Supports custom transforms between source and target
 * - Extensible without code changes
 */

import { z } from "zod";
import { KnowledgeTypeEnum, KnowledgeSourceTypeEnum, ResourceCategoryEnum } from "../types/KnowledgeAtom.js";

// ============================================================================
// Wiring Method Enum
// ============================================================================

/**
 * How to wire knowledge to a consumer.
 */
export const WiringMethodEnum = z.enum([
  "tip_inject",      // Inject into tip collection
  "registry_add",    // Add to registry (MaterialRegistry, ToolRegistry, etc.)
  "config_update",   // Update configuration/constants
  "direct_import",   // Update engine to import from knowledge bridge
  "code_gen",        // Generate code addition
  "formula_register",// Register formula in FormulaRegistry
  "event_emit",      // Emit event for listeners
  "queue",           // Add to processing queue
]);
export type WiringMethod = z.infer<typeof WiringMethodEnum>;

/**
 * Priority levels for wiring (1=highest, 3=lowest).
 */
export const WiringPriorityEnum = z.enum(["1", "2", "3"]);
export type WiringPriority = z.infer<typeof WiringPriorityEnum>;

// ============================================================================
// Consumer Definition Schema
// ============================================================================

/**
 * Knowledge consumer definition.
 * Describes what an engine/registry/hook can accept.
 */
export const ConsumerDefinitionSchema = z.object({
  /** Unique consumer ID */
  id: z.string(),

  /** Display name */
  name: z.string(),

  /** Consumer type */
  type: z.enum(["engine", "dispatcher", "pipeline", "registry", "hook", "algorithm"]),

  /** File path relative to src/ */
  file_path: z.string(),

  /** Knowledge types this consumer accepts */
  accepts: z.array(KnowledgeTypeEnum),

  /** Domains this consumer handles */
  domains: z.array(z.string()),

  /** How to wire data to this consumer */
  wiring_method: WiringMethodEnum,

  /** Priority (1=highest) */
  priority: z.number().min(1).max(100).default(50),

  /** Required fields in payload */
  required_fields: z.array(z.string()).optional(),

  /** Action to invoke (for dispatchers) */
  action: z.string().optional(),

  /** Whether consumer is active */
  enabled: z.boolean().default(true),
});
export type ConsumerDefinition = z.infer<typeof ConsumerDefinitionSchema>;

// ============================================================================
// Category Wiring Rule Schema
// ============================================================================

/**
 * Wiring rule: maps source category to target consumers.
 */
export const WiringRuleSchema = z.object({
  /** Source resource category */
  source_category: ResourceCategoryEnum,

  /** Source type (optional, for finer filtering) */
  source_type: KnowledgeSourceTypeEnum.optional(),

  /** Knowledge types to route */
  knowledge_types: z.array(KnowledgeTypeEnum),

  /** Target consumer IDs */
  targets: z.array(z.object({
    /** Consumer ID */
    consumer_id: z.string(),

    /** Action override (if different from consumer default) */
    action: z.string().optional(),

    /** Priority override (1=highest) */
    priority: WiringPriorityEnum.optional(),

    /** Transform function name (from TRANSFORMS registry) */
    transform: z.string().optional(),

    /** Condition expression (JS predicate) */
    condition: z.string().optional(),
  })),

  /** Whether this rule is active */
  enabled: z.boolean().default(true),

  /** Description */
  description: z.string().optional(),
});
export type WiringRule = z.infer<typeof WiringRuleSchema>;

// ============================================================================
// Transform Definition Schema
// ============================================================================

/**
 * Transform definition: converts data between source and target format.
 */
export const TransformDefinitionSchema = z.object({
  /** Transform ID */
  id: z.string(),

  /** Display name */
  name: z.string(),

  /** Source knowledge type */
  source_type: KnowledgeTypeEnum,

  /** Target format */
  target_format: z.string(),

  /** Field mappings (source_field -> target_field) */
  field_mappings: z.record(z.string(), z.string()),

  /** Default values for missing fields */
  defaults: z.record(z.string(), z.any()).optional(),

  /** Validation rules */
  validations: z.array(z.string()).optional(),
});
export type TransformDefinition = z.infer<typeof TransformDefinitionSchema>;

// ============================================================================
// Domain Routing Schema
// ============================================================================

/**
 * Domain-based routing rules.
 */
export const DomainRoutingSchema = z.object({
  /** Domain name */
  domain: z.string(),

  /** Patterns that trigger this domain */
  patterns: z.array(z.string()),

  /** Keywords that indicate this domain */
  keywords: z.array(z.string()),

  /** Preferred consumers for this domain */
  preferred_consumers: z.array(z.string()),

  /** Consumer IDs to exclude */
  excluded_consumers: z.array(z.string()).optional(),
});
export type DomainRouting = z.infer<typeof DomainRoutingSchema>;

// ============================================================================
// Full Wiring Manifest Schema
// ============================================================================

/**
 * Complete wiring manifest: the declarative configuration for knowledge routing.
 */
export const WiringManifestSchema = z.object({
  /** Schema version */
  schemaVersion: z.string().default("1.0.0"),

  /** Last updated timestamp */
  updatedAt: z.string(),

  /** All consumer definitions */
  consumers: z.array(ConsumerDefinitionSchema),

  /** Category-based wiring rules */
  wiring_rules: z.array(WiringRuleSchema),

  /** Transform definitions */
  transforms: z.array(TransformDefinitionSchema).optional(),

  /** Domain routing configurations */
  domain_routing: z.array(DomainRoutingSchema).optional(),

  /** Global settings */
  settings: z.object({
    /** Default priority for unspecified rules */
    default_priority: WiringPriorityEnum.default("2"),

    /** Minimum confidence threshold for wiring */
    min_confidence: z.number().min(0).max(1).default(0.7),

    /** Enable conflict detection */
    detect_conflicts: z.boolean().default(true),

    /** Log all wiring decisions */
    audit_logging: z.boolean().default(true),

    /** Dry run mode (don't actually wire) */
    dry_run: z.boolean().default(false),
  }).optional(),

  /** Metadata */
  metadata: z.object({
    source: z.string().optional(),
    generated_by: z.string().optional(),
    notes: z.string().optional(),
  }).optional(),
});
export type WiringManifest = z.infer<typeof WiringManifestSchema>;

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Validate a wiring manifest.
 */
export function validateManifest(manifest: unknown): { valid: boolean; errors: string[] } {
  const result = WiringManifestSchema.safeParse(manifest);
  if (result.success) {
    return { valid: true, errors: [] };
  }
  return {
    valid: false,
    errors: result.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`),
  };
}

/**
 * Parse and validate a wiring manifest.
 */
export function parseManifest(data: unknown): WiringManifest {
  return WiringManifestSchema.parse(data);
}

/**
 * Safely parse a wiring manifest.
 */
export function safeParseManifest(data: unknown): WiringManifest | null {
  const result = WiringManifestSchema.safeParse(data);
  return result.success ? result.data : null;
}

// ============================================================================
// Manifest Operations
// ============================================================================

/**
 * Find consumers that accept a given knowledge type and domain.
 */
export function findConsumers(
  manifest: WiringManifest,
  knowledgeType: z.infer<typeof KnowledgeTypeEnum>,
  domain: string
): ConsumerDefinition[] {
  return manifest.consumers
    .filter((c) => c.enabled && c.accepts.includes(knowledgeType))
    .filter((c) => c.domains.includes(domain) || c.domains.includes("general"))
    .sort((a, b) => b.priority - a.priority);
}

/**
 * Find wiring rules for a source category.
 */
export function findWiringRules(
  manifest: WiringManifest,
  sourceCategory: z.infer<typeof ResourceCategoryEnum>
): WiringRule[] {
  return manifest.wiring_rules.filter(
    (r) => r.enabled && r.source_category === sourceCategory
  );
}

/**
 * Resolve targets for a knowledge atom.
 */
export function resolveTargets(
  manifest: WiringManifest,
  sourceCategory: z.infer<typeof ResourceCategoryEnum>,
  knowledgeType: z.infer<typeof KnowledgeTypeEnum>,
  domain: string
): Array<{
  consumer: ConsumerDefinition;
  action: string;
  priority: string;
  transform?: string;
}> {
  const rules = findWiringRules(manifest, sourceCategory);
  const results: Array<{
    consumer: ConsumerDefinition;
    action: string;
    priority: string;
    transform?: string;
  }> = [];

  for (const rule of rules) {
    if (!rule.knowledge_types.includes(knowledgeType)) continue;

    for (const target of rule.targets) {
      const consumer = manifest.consumers.find((c) => c.id === target.consumer_id);
      if (!consumer || !consumer.enabled) continue;

      // Check domain match
      if (!consumer.domains.includes(domain) && !consumer.domains.includes("general")) {
        continue;
      }

      results.push({
        consumer,
        action: target.action || consumer.action || "ingest",
        priority: target.priority || manifest.settings?.default_priority || "2",
        transform: target.transform,
      });
    }
  }

  // Sort by priority (1 first)
  return results.sort((a, b) => parseInt(a.priority) - parseInt(b.priority));
}

/**
 * Detect conflicts where multiple consumers claim the same data.
 */
export function detectConflicts(
  manifest: WiringManifest,
  sourceCategory: z.infer<typeof ResourceCategoryEnum>,
  knowledgeType: z.infer<typeof KnowledgeTypeEnum>
): Array<{
  consumer_ids: string[];
  conflict_type: "same_action" | "overlapping_priority" | "exclusive_claim";
}> {
  const targets = resolveTargets(manifest, sourceCategory, knowledgeType, "general");
  const conflicts: Array<{
    consumer_ids: string[];
    conflict_type: "same_action" | "overlapping_priority" | "exclusive_claim";
  }> = [];

  // Check for same priority
  const byPriority = new Map<string, string[]>();
  for (const t of targets) {
    const ids = byPriority.get(t.priority) || [];
    ids.push(t.consumer.id);
    byPriority.set(t.priority, ids);
  }

  for (const [priority, ids] of byPriority) {
    if (ids.length > 1) {
      conflicts.push({
        consumer_ids: ids,
        conflict_type: "overlapping_priority",
      });
    }
  }

  return conflicts;
}

// ============================================================================
// Default Manifest Factory
// ============================================================================

/**
 * Create a default wiring manifest with PRISM's standard consumers.
 */
export function createDefaultManifest(): WiringManifest {
  return {
    schemaVersion: "1.0.0",
    updatedAt: new Date().toISOString(),
    consumers: [
      // Tribal Knowledge
      {
        id: "tribal-knowledge-engine",
        name: "TribalKnowledgeEngine",
        type: "engine",
        file_path: "src/engines/TribalKnowledgeEngine.ts",
        accepts: ["tip", "safety", "workflow", "process"],
        domains: ["milling", "turning", "wire_edm", "sinker_edm", "grinding", "5axis", "mill_turn", "general"],
        wiring_method: "tip_inject",
        priority: 100,
        enabled: true,
      },
      // Speed/Feed
      {
        id: "speed-feed-orchestrator",
        name: "SpeedFeedOrchestratorEngine",
        type: "engine",
        file_path: "src/engines/SpeedFeedOrchestratorEngine.ts",
        accepts: ["parameter", "formula", "tool", "material"],
        domains: ["milling", "turning", "drilling", "general"],
        wiring_method: "config_update",
        priority: 95,
        enabled: true,
      },
      // Formula Registry
      {
        id: "formula-registry",
        name: "FormulaRegistry",
        type: "registry",
        file_path: "src/registries/FormulaRegistry.ts",
        accepts: ["formula", "algorithm"],
        domains: ["general"],
        wiring_method: "formula_register",
        priority: 90,
        enabled: true,
      },
      // Material Registry
      {
        id: "material-registry",
        name: "MaterialRegistry",
        type: "registry",
        file_path: "src/registries/MaterialRegistry.ts",
        accepts: ["material"],
        domains: ["general"],
        wiring_method: "registry_add",
        priority: 90,
        enabled: true,
      },
      // Tool Registry
      {
        id: "tool-registry",
        name: "ToolRegistry",
        type: "registry",
        file_path: "src/registries/ToolRegistry.ts",
        accepts: ["tool"],
        domains: ["general"],
        wiring_method: "registry_add",
        priority: 90,
        enabled: true,
      },
      // Knowledge Graph
      {
        id: "knowledge-graph-engine",
        name: "KnowledgeGraphEngine",
        type: "engine",
        file_path: "src/engines/KnowledgeGraphEngine.ts",
        accepts: ["tip", "formula", "tool", "material", "algorithm", "workflow"],
        domains: ["general"],
        wiring_method: "tip_inject",
        priority: 50,
        enabled: true,
      },
    ],
    wiring_rules: [
      // Tool Catalog → Tool-related engines
      {
        source_category: "tool_catalog",
        knowledge_types: ["tool", "parameter"],
        targets: [
          { consumer_id: "tool-registry", priority: "1" },
          { consumer_id: "speed-feed-orchestrator", priority: "2" },
          { consumer_id: "knowledge-graph-engine", priority: "3" },
        ],
        enabled: true,
        description: "Route tool catalog data to tool-related consumers",
      },
      // Handbook → Formulas and materials
      {
        source_category: "handbook",
        knowledge_types: ["formula", "material", "parameter"],
        targets: [
          { consumer_id: "formula-registry", priority: "1" },
          { consumer_id: "material-registry", priority: "1" },
          { consumer_id: "speed-feed-orchestrator", priority: "2" },
        ],
        enabled: true,
        description: "Route handbook data to registries",
      },
      // Tribal Knowledge → Tips
      {
        source_category: "tribal_knowledge",
        knowledge_types: ["tip", "workflow", "safety", "process"],
        targets: [
          { consumer_id: "tribal-knowledge-engine", priority: "1" },
          { consumer_id: "knowledge-graph-engine", priority: "3" },
        ],
        enabled: true,
        description: "Route tribal knowledge to tip engines",
      },
      // Academic/MIT → Algorithms
      {
        source_category: "mit_course",
        knowledge_types: ["algorithm", "formula"],
        targets: [
          { consumer_id: "formula-registry", priority: "1" },
          { consumer_id: "knowledge-graph-engine", priority: "2" },
        ],
        enabled: true,
        description: "Route academic content to formula registry",
      },
      // Academic Paper → Formulas
      {
        source_category: "academic_paper",
        knowledge_types: ["formula", "algorithm"],
        targets: [
          { consumer_id: "formula-registry", priority: "1" },
        ],
        enabled: true,
        description: "Route academic papers to formula registry",
      },
      // Machine Manual → Machine specs
      {
        source_category: "machine_manual",
        knowledge_types: ["machine", "controller", "parameter"],
        targets: [
          { consumer_id: "speed-feed-orchestrator", priority: "2" },
        ],
        enabled: true,
        description: "Route machine manual data",
      },
      // CNC Program → Parameters
      {
        source_category: "cnc_program",
        knowledge_types: ["parameter", "workflow"],
        targets: [
          { consumer_id: "speed-feed-orchestrator", priority: "1" },
          { consumer_id: "tribal-knowledge-engine", priority: "2" },
        ],
        enabled: true,
        description: "Route proven CNC parameters",
      },
    ],
    domain_routing: [
      {
        domain: "milling",
        patterns: ["mill", "face_mill", "end_mill", "pocket", "contour"],
        keywords: ["milling", "pocket", "contour", "face", "slot"],
        preferred_consumers: ["speed-feed-orchestrator", "tribal-knowledge-engine"],
      },
      {
        domain: "turning",
        patterns: ["lathe", "turn", "bore", "thread"],
        keywords: ["turning", "lathe", "boring", "threading", "facing"],
        preferred_consumers: ["speed-feed-orchestrator", "tribal-knowledge-engine"],
      },
      {
        domain: "wire_edm",
        patterns: ["wire", "wedm", "wire_edm"],
        keywords: ["wire", "wedm", "spark", "wire cut"],
        preferred_consumers: ["tribal-knowledge-engine"],
      },
    ],
    settings: {
      default_priority: "2",
      min_confidence: 0.7,
      detect_conflicts: true,
      audit_logging: true,
      dry_run: false,
    },
    metadata: {
      source: "KAR-MS0 U-KAR02",
      generated_by: "WiringManifest.createDefaultManifest()",
      notes: "Default PRISM wiring manifest — extend via WIRING_MANIFEST.json",
    },
  };
}

// ============================================================================
// Compatibility Exports (for KnowledgeHooks.ts)
// ============================================================================

/**
 * Type alias for backward compatibility with KnowledgeHooks.
 */
export type WiringTargetRule = WiringRule;

/**
 * Default wiring manifest instance.
 * Pre-initialized for immediate use in hooks.
 */
export const DEFAULT_WIRING_MANIFEST: WiringManifest = createDefaultManifest();

/**
 * Resolve wiring targets for a KnowledgeAtom.
 * Wrapper around resolveTargets that extracts params from the atom.
 * Used by KnowledgeHooks.ts
 */
export function resolveWiringTargets(
  atom: { source: { category: string }; type: string; category?: string },
  manifest: WiringManifest
): Array<{
  consumer: ConsumerDefinition;
  action: string;
  priority: string;
  transform?: string;
  engine: string;
}> {
  // Map atom source category to ResourceCategory
  const sourceCategory = atom.source.category as z.infer<typeof ResourceCategoryEnum>;
  const knowledgeType = atom.type as z.infer<typeof KnowledgeTypeEnum>;
  const domain = atom.category || "general";

  const targets = resolveTargets(manifest, sourceCategory, knowledgeType, domain);

  // Add engine field for compatibility with KnowledgeHooks
  return targets.map((t) => ({
    ...t,
    engine: t.consumer.name,
  }));
}
