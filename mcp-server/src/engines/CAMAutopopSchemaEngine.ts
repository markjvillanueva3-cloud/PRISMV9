/**
 * CAMAutopopSchemaEngine - Universal canonical-schema bridge for CAM
 * auto-population across the six target CAM systems.
 *
 * Loads the canonical entity schemas (`canonical-schemas.json`) and the
 * per-CAM mapping rules (`cam-mapping-rules.json`) from
 * `data/cam-autopop/` and exposes typed lookups used by downstream
 * import/export/sync engines (Phases 3-8 of L2-CAMX-EXHAUST roadmap).
 *
 * This engine is pure: lazy JSON load on first access, in-process
 * caches, no I/O after warmup, no dispatcher imports.
 *
 * Coverage: CAM-AUTOPOP-CORE-MS0 (Phase 2 of L2-CAMX-EXHAUST).
 *
 * @see data/cam-autopop/canonical-schemas.json
 * @see data/cam-autopop/cam-mapping-rules.json
 */

import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// ============================================================================
// TYPES
// ============================================================================

export type AutopopEntity = "TOOL" | "HOLDER" | "FIXTURE" | "MACHINE" | "CAD_PART";

export type AutopopCAM =
  | "fusion360"
  | "hypermill"
  | "mastercam"
  | "inventor_hsm"
  | "esprit"
  | "solidcam";

export interface AutopopFieldDef {
  name: string;
  type: string;
  description?: string;
  required?: boolean;
  min?: number;
  max?: number;
  unit?: string;
  values?: readonly string[];
  items?: unknown;
}

export interface AutopopGroup {
  fields: readonly AutopopFieldDef[];
}

export interface AutopopEntitySchema {
  description: string;
  fieldCount: number;
  groups: Record<string, AutopopGroup>;
}

export interface CanonicalSchemaFile {
  schemaVersion: string;
  metadata: {
    title: string;
    description: string;
    version: string;
    extractedDate: string;
    milestone: string;
    source: string;
    entityCount: number;
    totalFieldCount: number;
    physics_links: readonly string[];
  };
  entities: Record<AutopopEntity, AutopopEntitySchema>;
}

export interface CAMDescriptor {
  id: AutopopCAM;
  name: string;
  vendor: string;
  tool_format: string;
  post_format: string;
  machine_format: string;
}

export interface AutopopMappingRule {
  native_format: string;
  native_root: string;
  field_map: Record<string, string>;
  quirks: readonly string[];
  lossy_fields: readonly string[];
}

export interface MappingRulesFile {
  schemaVersion: string;
  metadata: {
    title: string;
    description: string;
    version: string;
    extractedDate: string;
    milestone: string;
    depends_on: readonly string[];
    source: string;
    cam_count: number;
    entity_count: number;
    cams: readonly CAMDescriptor[];
  };
  rules: Record<AutopopEntity, Record<AutopopCAM, AutopopMappingRule>>;
}

// ============================================================================
// PATHS
// ============================================================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const AUTOPOP_ROOT = resolve(__dirname, "..", "..", "data", "cam-autopop");
const SCHEMA_PATH = resolve(AUTOPOP_ROOT, "canonical-schemas.json");
const RULES_PATH = resolve(AUTOPOP_ROOT, "cam-mapping-rules.json");

const ENTITY_IDS: readonly AutopopEntity[] = [
  "TOOL",
  "HOLDER",
  "FIXTURE",
  "MACHINE",
  "CAD_PART",
];

const CAM_IDS: readonly AutopopCAM[] = [
  "fusion360",
  "hypermill",
  "mastercam",
  "inventor_hsm",
  "esprit",
  "solidcam",
];

function readJson<T>(path: string): T {
  const raw = readFileSync(path, "utf8");
  return JSON.parse(raw) as T;
}

// ============================================================================
// ENGINE
// ============================================================================

/**
 * CAMAutopopSchemaEngine — static API for canonical-schema + per-CAM
 * mapping queries.
 *
 * Lazy-loads `canonical-schemas.json` and `cam-mapping-rules.json` on
 * first access; subsequent calls are served from in-process caches.
 *
 * Static-only by design — there is no per-instance state.
 */
export class CAMAutopopSchemaEngine {
  private static schemaCache: CanonicalSchemaFile | null = null;
  private static rulesCache: MappingRulesFile | null = null;

  /**
   * Load the full canonical-schemas file (cached after first read).
   * @returns The parsed canonical-schemas.json contents.
   * @throws Error if the file is missing.
   */
  static getCanonicalSchemaFile(): CanonicalSchemaFile {
    if (!this.schemaCache) {
      if (!existsSync(SCHEMA_PATH)) {
        throw new Error(
          `CAMAutopopSchemaEngine: canonical-schemas.json not found at ${SCHEMA_PATH}`,
        );
      }
      this.schemaCache = readJson<CanonicalSchemaFile>(SCHEMA_PATH);
    }
    return this.schemaCache;
  }

  /**
   * Load the full mapping-rules file (cached after first read).
   * @returns The parsed cam-mapping-rules.json contents.
   * @throws Error if the file is missing.
   */
  static getMappingRulesFile(): MappingRulesFile {
    if (!this.rulesCache) {
      if (!existsSync(RULES_PATH)) {
        throw new Error(
          `CAMAutopopSchemaEngine: cam-mapping-rules.json not found at ${RULES_PATH}`,
        );
      }
      this.rulesCache = readJson<MappingRulesFile>(RULES_PATH);
    }
    return this.rulesCache;
  }

  /**
   * Return the canonical schema for a single entity.
   * @param entity One of TOOL, HOLDER, FIXTURE, MACHINE, CAD_PART.
   * @returns The entity schema, or null if the id is unknown.
   */
  static getCanonicalSchema(entity: string): AutopopEntitySchema | null {
    const file = this.getCanonicalSchemaFile();
    const upper = String(entity).toUpperCase() as AutopopEntity;
    const schema = file.entities[upper];
    return schema ?? null;
  }

  /**
   * List the canonical entity ids known to the engine.
   * @returns A frozen list of entity identifiers.
   */
  static listEntities(): readonly AutopopEntity[] {
    // Anchor against schema file for drift detection
    const file = this.getCanonicalSchemaFile();
    const declared = Object.keys(file.entities) as AutopopEntity[];
    return declared.length > 0 ? declared : ENTITY_IDS;
  }

  /**
   * List the CAM systems supported by the mapping rules.
   * @returns A frozen list of CAM descriptors (id + name + vendor + native formats).
   */
  static listCAMs(): readonly CAMDescriptor[] {
    const rules = this.getMappingRulesFile();
    return rules.metadata.cams;
  }

  /**
   * Return the mapping rule that bridges a canonical entity to a single
   * CAM's native representation.
   * @param entity Canonical entity id (TOOL, HOLDER, FIXTURE, MACHINE, CAD_PART).
   * @param cam CAM id (fusion360, hypermill, mastercam, inventor_hsm, esprit, solidcam).
   * @returns The mapping rule, or null if either id is unknown or the pair has no rule.
   */
  static getMappingRule(entity: string, cam: string): AutopopMappingRule | null {
    const rules = this.getMappingRulesFile();
    const e = String(entity).toUpperCase() as AutopopEntity;
    const c = String(cam).toLowerCase() as AutopopCAM;
    const entityRules = rules.rules[e];
    if (!entityRules) return null;
    const rule = entityRules[c];
    return rule ?? null;
  }

  /**
   * Return every mapping rule registered for an entity (one per CAM).
   * Convenience for cross-CAM diffing.
   * @param entity Canonical entity id.
   * @returns Array of {cam, rule} pairs, or null if entity is unknown.
   */
  static listMappingRulesForEntity(
    entity: string,
  ): readonly { cam: AutopopCAM; rule: AutopopMappingRule }[] | null {
    const rules = this.getMappingRulesFile();
    const e = String(entity).toUpperCase() as AutopopEntity;
    const entityRules = rules.rules[e];
    if (!entityRules) return null;
    const out: { cam: AutopopCAM; rule: AutopopMappingRule }[] = [];
    for (const c of CAM_IDS) {
      const rule = entityRules[c];
      if (rule) out.push({ cam: c, rule });
    }
    return out;
  }

  /**
   * Reset internal caches. Used by tests; should not be called in
   * production code.
   */
  static resetCachesForTesting(): void {
    this.schemaCache = null;
    this.rulesCache = null;
  }
}

export default CAMAutopopSchemaEngine;
