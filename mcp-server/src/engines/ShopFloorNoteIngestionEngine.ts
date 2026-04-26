/**
 * ShopFloorNoteIngestionEngine — Obsidian Notes to PRISM Knowledge
 *
 * Ingests shop floor notes captured in Obsidian into PRISM's knowledge graph.
 * Parses markdown structure, extracts entities (machines, materials, operations),
 * and creates knowledge entries with proper relationships.
 *
 * Actions (wired to prism_knowledge):
 * - shop_note_ingest: Ingest a single Obsidian note
 * - shop_note_parse: Parse markdown and extract entities without persisting
 * - shop_note_batch: Batch ingest multiple notes
 * - shop_note_validate: Validate extracted entities against PRISM registries
 * - shop_note_status: Get ingestion status and statistics
 *
 * @milestone OBSIDIAN-MS0 U-OBS-SHOP04
 */

import * as fs from "fs";
import * as path from "path";
import { createHash } from "crypto";
import { z } from "zod";
import { safeWriteSync } from "../utils/atomicWrite.js";
import { log } from "../utils/Logger.js";
// Types only - engines loaded lazily to avoid circular deps and enable isolated testing
import type { KnowledgeTip, KnowledgeCategory, KnowledgeDomain } from "./TribalKnowledgeEngine.js";
import type { IngestionResult } from "./ContentIngestionPipelineEngine.js";

// ============================================================================
// SCHEMAS
// ============================================================================

export const IngestSingleSchema = z.object({
  file_path: z.string().optional(),
  content: z.string().optional(),
  source: z.string().default("obsidian"),
  validate_entities: z.boolean().default(true),
  create_relationships: z.boolean().default(true),
}).refine(
  (data) => data.file_path !== undefined || data.content !== undefined,
  { message: "Either file_path or content must be provided" }
);

export const ParseNoteSchema = z.object({
  file_path: z.string().optional(),
  content: z.string().optional(),
  extract_frontmatter: z.boolean().default(true),
  extract_entities: z.boolean().default(true),
}).refine(
  (data) => data.file_path !== undefined || data.content !== undefined,
  { message: "Either file_path or content must be provided" }
);

export const BatchIngestSchema = z.object({
  directory: z.string().optional(),
  files: z.array(z.string()).optional(),
  notes: z.array(z.object({
    content: z.string(),
    filename: z.string().optional(),
    source: z.string().optional(),
  })).optional(),
  source: z.string().default("obsidian_batch"),
  validate_entities: z.boolean().default(true),
  create_relationships: z.boolean().default(true),
  incremental: z.boolean().default(true),
}).refine(
  (data) => data.directory !== undefined || data.files !== undefined || data.notes !== undefined,
  { message: "Either directory, files, or notes must be provided" }
);

export const ValidateEntitiesSchema = z.object({
  entities: z.array(z.object({
    type: z.enum(["machine", "material", "operation", "tool", "controller"]),
    value: z.string(),
    confidence: z.number().min(0).max(1).default(1),
  })),
  strict: z.boolean().default(false),
});

// ============================================================================
// TYPES
// ============================================================================

export type EntityType = "machine" | "material" | "operation" | "tool" | "controller";

export interface ExtractedEntity {
  type: EntityType;
  value: string;
  original_text: string;
  position: { start: number; end: number };
  confidence: number;
  registry_match?: string;
  validated?: boolean;
}

export interface ParsedFrontmatter {
  title?: string;
  date?: string;
  machine?: string | string[];
  material?: string | string[];
  operation?: string | string[];
  tags?: string[];
  author?: string;
  category?: string;
  [key: string]: unknown;
}

export interface ParsedSection {
  heading: string;
  level: number;
  content: string;
  entities: ExtractedEntity[];
}

export interface ParseResult {
  success: boolean;
  filename?: string;
  frontmatter: ParsedFrontmatter;
  sections: ParsedSection[];
  entities: ExtractedEntity[];
  wiki_links: string[];
  tags: string[];
  raw_body: string;
  checksum: string;
}

export interface ValidationResult {
  valid: boolean;
  total_entities: number;
  validated_count: number;
  unvalidated: Array<{
    entity: ExtractedEntity;
    reason: string;
    suggestions: string[];
  }>;
  warnings: string[];
}

export interface IngestResult {
  success: boolean;
  tip_id?: string;
  tip?: KnowledgeTip;
  parse_result: ParseResult;
  validation_result?: ValidationResult;
  relationships_created: number;
  warnings: string[];
  processing_time_ms: number;
}

export interface BatchIngestResult {
  total_notes: number;
  ingested_count: number;
  skipped_count: number;
  failed_count: number;
  results: Array<{
    filename?: string;
    success: boolean;
    tip_id?: string;
    error?: string;
  }>;
  entities_extracted: number;
  relationships_created: number;
  processing_time_ms: number;
}

export interface IngestionStats {
  total_ingested: number;
  total_sessions: number;
  last_ingestion?: string;
  sources: Record<string, number>;
  entity_counts: Record<EntityType, number>;
  validation_rate: number;
  top_machines: Array<{ machine: string; count: number }>;
  top_materials: Array<{ material: string; count: number }>;
  top_operations: Array<{ operation: string; count: number }>;
  recent_notes: Array<{
    filename?: string;
    tip_id: string;
    ingested_at: string;
    entity_count: number;
  }>;
}

// ============================================================================
// ENTITY PATTERNS
// ============================================================================

const MACHINE_PATTERNS: Array<{ pattern: RegExp; type: string }> = [
  { pattern: /\b(Haas\s+(?:VF-?\d+|ST-?\d+|UMC-?\d+|DM-?\d+))\b/gi, type: "Haas" },
  { pattern: /\b(Okuma\s+(?:LB\d+|GENOS|MU-\d+|MB-\d+))\b/gi, type: "Okuma" },
  { pattern: /\b(Mazak\s+(?:QTN|INTEGREX|VTC|VARIAXIS)[^\s]*)\b/gi, type: "Mazak" },
  { pattern: /\b(DMG\s+(?:MORI\s+)?(?:CTX|NTX|DMU|CMX)[^\s]*)\b/gi, type: "DMG" },
  { pattern: /\b(Hurco\s+(?:VMX|VM|TM)\d+)\b/gi, type: "Hurco" },
  { pattern: /\b(Makino\s+(?:a\d+|PS\d+|F\d+|D\d+))\b/gi, type: "Makino" },
  { pattern: /\b(Fanuc\s+(?:Robodrill|RoboCut)[^\s]*)\b/gi, type: "Fanuc" },
  { pattern: /\b(Mitsubishi\s+(?:MV\d+|FA\d+)[^\s]*)\b/gi, type: "Mitsubishi" },
  { pattern: /\b(Sodick\s+(?:AQ\d+|VL\d+)[^\s]*)\b/gi, type: "Sodick" },
  { pattern: /\b(VMC|HMC|lathe|mill|turning\s+center|machining\s+center)\b/gi, type: "generic" },
];

const MATERIAL_PATTERNS: Array<{ pattern: RegExp; group: string }> = [
  { pattern: /\b(6061|7075|2024|5052|A356)(?:-T\d+)?\b/gi, group: "aluminum" },
  { pattern: /\b(304|316|303|17-4(?:\s+PH)?|410|420)\s*(?:stainless)?\b/gi, group: "stainless" },
  { pattern: /\b(1018|1045|4140|4340|8620|D2|A2|O1|S7)\b/gi, group: "steel" },
  { pattern: /\b(Ti-6Al-4V|Ti64|CP\s*Ti|Grade\s*\d+\s*Ti(?:tanium)?)\b/gi, group: "titanium" },
  { pattern: /\b(Inconel\s*\d+|Hastelloy|Waspaloy|Rene)\b/gi, group: "superalloy" },
  { pattern: /\b(brass|bronze|copper|C360|C110)\b/gi, group: "copper" },
  { pattern: /\b(Delrin|Acetal|PEEK|UHMW|Nylon|ABS|Polycarbonate)\b/gi, group: "plastic" },
  { pattern: /\b(aluminum|steel|titanium|nickel|cobalt|tungsten)\b/gi, group: "generic" },
];

const OPERATION_PATTERNS: Array<{ pattern: RegExp; category: string }> = [
  { pattern: /\b(face\s*mill(?:ing)?|end\s*mill(?:ing)?|slot(?:ting)?|pocket(?:ing)?)\b/gi, category: "milling" },
  { pattern: /\b(rough(?:ing)?|finish(?:ing)?|semi-?finish)\b/gi, category: "strategy" },
  { pattern: /\b(turn(?:ing)?|bore|boring|face|grooving|threading)\b/gi, category: "turning" },
  { pattern: /\b(drill(?:ing)?|tap(?:ping)?|ream(?:ing)?|counter(?:sink|bore))\b/gi, category: "holemaking" },
  { pattern: /\b(EDM|wire\s*cut|sinker|electrode)\b/gi, category: "edm" },
  { pattern: /\b(grind(?:ing)?|surface\s*grind|cylindrical\s*grind)\b/gi, category: "grinding" },
  { pattern: /\b(3\+2|5-?axis|simultaneous|indexed)\b/gi, category: "multiaxis" },
  { pattern: /\b(HSM|high.?speed|trochoidal|adaptive)\b/gi, category: "hsm" },
];

const TOOL_PATTERNS: Array<{ pattern: RegExp; type: string }> = [
  { pattern: /\b(\d+(?:\/\d+)?["']?\s*(?:end\s*mill|ball\s*mill|bull\s*nose))\b/gi, type: "endmill" },
  { pattern: /\b(\d+(?:\.\d+)?\s*mm\s*(?:end\s*mill|ball|flat))\b/gi, type: "endmill_metric" },
  { pattern: /\b(insert|CCMT|CNMG|WNMG|DCMT|TCMT|VNMG)\b/gi, type: "insert" },
  { pattern: /\b(carbide|HSS|ceramic|CBN|PCD|diamond)\b/gi, type: "material" },
  { pattern: /\b(TiAlN|TiN|AlTiN|DLC|CVD|PVD)\b/gi, type: "coating" },
];

const CONTROLLER_PATTERNS: Array<{ pattern: RegExp; brand: string }> = [
  { pattern: /\b(Fanuc\s*(?:\d+[iMT]|0i|31i|32i)?)\b/gi, brand: "Fanuc" },
  { pattern: /\b(OSP[-\s]*(?:P\d+|suite))\b/gi, brand: "Okuma" },
  { pattern: /\b(Mazatrol\s*(?:Matrix|SmoothX|SmoothG)?)\b/gi, brand: "Mazak" },
  { pattern: /\b(Siemens\s*(?:840D?|828D?|Sinumerik)?)\b/gi, brand: "Siemens" },
  { pattern: /\b(Haas\s*(?:NGC|Classic)?)\b/gi, brand: "Haas" },
  { pattern: /\b(Heidenhain\s*(?:TNC|iTNC)?(?:\d+)?)\b/gi, brand: "Heidenhain" },
];

// ============================================================================
// STATE
// ============================================================================

const STATE_PATH = path.join(
  process.cwd(),
  "data/state/SHOP_FLOOR_NOTE_INGESTION.json"
);

interface IngestionState {
  ingested_checksums: Record<string, { tip_id: string; ingested_at: string }>;
  entity_registry: Record<EntityType, Record<string, number>>;
  session_log: Array<{
    timestamp: string;
    source: string;
    notes_ingested: number;
    entities_extracted: number;
  }>;
  total_ingested: number;
}

// ============================================================================
// ENGINE
// ============================================================================

class ShopFloorNoteIngestionEngineImpl {
  private state: IngestionState;

  constructor() {
    this.state = this.loadState();
  }

  private loadState(): IngestionState {
    try {
      if (fs.existsSync(STATE_PATH)) {
        return JSON.parse(fs.readFileSync(STATE_PATH, "utf-8"));
      }
    } catch {
      log.warn("Failed to load shop floor note ingestion state, starting fresh");
    }
    return {
      ingested_checksums: {},
      entity_registry: {
        machine: {},
        material: {},
        operation: {},
        tool: {},
        controller: {},
      },
      session_log: [],
      total_ingested: 0,
    };
  }

  private saveState(): void {
    try {
      const dir = path.dirname(STATE_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      safeWriteSync(STATE_PATH, JSON.stringify(this.state, null, 2));
    } catch (err) {
      log.error(`Failed to save ingestion state: ${err}`);
    }
  }

  private computeChecksum(content: string): string {
    return createHash("sha256").update(content).digest("hex").slice(0, 16);
  }

  // ==========================================================================
  // PARSING
  // ==========================================================================

  private parseFrontmatter(content: string): { frontmatter: ParsedFrontmatter; body: string } {
    const frontmatterMatch = content.match(/^---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n/);
    if (!frontmatterMatch) {
      return { frontmatter: {}, body: content };
    }

    const yamlContent = frontmatterMatch[1];
    const body = content.slice(frontmatterMatch[0].length);
    const frontmatter: ParsedFrontmatter = {};

    for (const line of yamlContent.split(/\r?\n/)) {
      const match = line.match(/^(\w+):\s*(.+)$/);
      if (match) {
        const [, key, value] = match;
        if (value.startsWith("[") && value.endsWith("]")) {
          frontmatter[key] = value.slice(1, -1).split(",").map(s => s.trim().replace(/^['"]|['"]$/g, ""));
        } else if (value.startsWith("- ")) {
          frontmatter[key] = [value.slice(2).trim()];
        } else {
          frontmatter[key] = value.trim().replace(/^['"]|['"]$/g, "");
        }
      }
    }

    return { frontmatter, body };
  }

  private parseSections(body: string): ParsedSection[] {
    const sections: ParsedSection[] = [];
    const lines = body.split(/\r?\n/);
    let currentSection: ParsedSection | null = null;
    let contentBuffer: string[] = [];

    for (const line of lines) {
      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
      if (headingMatch) {
        if (currentSection) {
          currentSection.content = contentBuffer.join("\n").trim();
          currentSection.entities = this.extractEntities(currentSection.content);
          sections.push(currentSection);
        }
        currentSection = {
          heading: headingMatch[2],
          level: headingMatch[1].length,
          content: "",
          entities: [],
        };
        contentBuffer = [];
      } else if (currentSection) {
        contentBuffer.push(line);
      } else {
        contentBuffer.push(line);
      }
    }

    if (currentSection) {
      currentSection.content = contentBuffer.join("\n").trim();
      currentSection.entities = this.extractEntities(currentSection.content);
      sections.push(currentSection);
    } else if (contentBuffer.length > 0) {
      const content = contentBuffer.join("\n").trim();
      sections.push({
        heading: "Content",
        level: 0,
        content,
        entities: this.extractEntities(content),
      });
    }

    return sections;
  }

  private extractWikiLinks(content: string): string[] {
    const links: string[] = [];
    const wikiPattern = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;
    let match;
    while ((match = wikiPattern.exec(content)) !== null) {
      links.push(match[1]);
    }
    return [...new Set(links)];
  }

  private extractTags(content: string, frontmatter: ParsedFrontmatter): string[] {
    const tags = new Set<string>();

    if (frontmatter.tags) {
      const fmTags = Array.isArray(frontmatter.tags) ? frontmatter.tags : [frontmatter.tags];
      fmTags.forEach(t => tags.add(String(t)));
    }

    const inlinePattern = /#([a-zA-Z][\w-/]*)/g;
    let match;
    while ((match = inlinePattern.exec(content)) !== null) {
      if (!match[1].match(/^\d+$/)) {
        tags.add(match[1]);
      }
    }

    return [...tags];
  }

  private extractEntities(content: string): ExtractedEntity[] {
    const entities: ExtractedEntity[] = [];

    for (const { pattern, type } of MACHINE_PATTERNS) {
      let match;
      const regex = new RegExp(pattern.source, pattern.flags);
      while ((match = regex.exec(content)) !== null) {
        entities.push({
          type: "machine",
          value: match[1].trim(),
          original_text: match[0],
          position: { start: match.index, end: match.index + match[0].length },
          confidence: type === "generic" ? 0.6 : 0.9,
        });
      }
    }

    for (const { pattern, group } of MATERIAL_PATTERNS) {
      let match;
      const regex = new RegExp(pattern.source, pattern.flags);
      while ((match = regex.exec(content)) !== null) {
        entities.push({
          type: "material",
          value: match[1].trim(),
          original_text: match[0],
          position: { start: match.index, end: match.index + match[0].length },
          confidence: group === "generic" ? 0.5 : 0.85,
        });
      }
    }

    for (const { pattern, category } of OPERATION_PATTERNS) {
      let match;
      const regex = new RegExp(pattern.source, pattern.flags);
      while ((match = regex.exec(content)) !== null) {
        entities.push({
          type: "operation",
          value: match[1].trim(),
          original_text: match[0],
          position: { start: match.index, end: match.index + match[0].length },
          confidence: category === "strategy" ? 0.7 : 0.85,
        });
      }
    }

    for (const { pattern, type } of TOOL_PATTERNS) {
      let match;
      const regex = new RegExp(pattern.source, pattern.flags);
      while ((match = regex.exec(content)) !== null) {
        entities.push({
          type: "tool",
          value: match[1].trim(),
          original_text: match[0],
          position: { start: match.index, end: match.index + match[0].length },
          confidence: type === "material" || type === "coating" ? 0.7 : 0.8,
        });
      }
    }

    for (const { pattern, brand } of CONTROLLER_PATTERNS) {
      let match;
      const regex = new RegExp(pattern.source, pattern.flags);
      while ((match = regex.exec(content)) !== null) {
        entities.push({
          type: "controller",
          value: match[1].trim(),
          original_text: match[0],
          position: { start: match.index, end: match.index + match[0].length },
          confidence: 0.85,
        });
      }
    }

    return this.deduplicateEntities(entities);
  }

  private deduplicateEntities(entities: ExtractedEntity[]): ExtractedEntity[] {
    const seen = new Map<string, ExtractedEntity>();
    for (const entity of entities) {
      const key = `${entity.type}:${entity.value.toLowerCase()}`;
      const existing = seen.get(key);
      if (!existing || entity.confidence > existing.confidence) {
        seen.set(key, entity);
      }
    }
    return [...seen.values()];
  }

  // ==========================================================================
  // VALIDATION
  // ==========================================================================

  private validateEntitiesAgainstRegistries(
    entities: ExtractedEntity[],
    strict: boolean
  ): ValidationResult {
    const result: ValidationResult = {
      valid: true,
      total_entities: entities.length,
      validated_count: 0,
      unvalidated: [],
      warnings: [],
    };

    for (const entity of entities) {
      const registry = this.state.entity_registry[entity.type];
      const normalizedValue = entity.value.toLowerCase();

      const matchedKey = Object.keys(registry).find(
        k => k.toLowerCase() === normalizedValue ||
             k.toLowerCase().includes(normalizedValue) ||
             normalizedValue.includes(k.toLowerCase())
      );

      if (matchedKey) {
        entity.validated = true;
        entity.registry_match = matchedKey;
        result.validated_count++;
      } else {
        entity.validated = false;
        const suggestions = this.findSimilarEntities(entity.type, entity.value);

        if (strict) {
          result.valid = false;
          result.unvalidated.push({
            entity,
            reason: `No registry match for ${entity.type}: ${entity.value}`,
            suggestions,
          });
        } else {
          result.warnings.push(
            `Unvalidated ${entity.type}: ${entity.value}` +
            (suggestions.length > 0 ? ` (similar: ${suggestions.join(", ")})` : "")
          );
          this.registerEntity(entity);
          result.validated_count++;
        }
      }
    }

    return result;
  }

  private findSimilarEntities(type: EntityType, value: string): string[] {
    const registry = this.state.entity_registry[type];
    const normalizedValue = value.toLowerCase();
    const suggestions: Array<{ key: string; score: number }> = [];

    for (const key of Object.keys(registry)) {
      const normalizedKey = key.toLowerCase();
      const score = this.similarityScore(normalizedValue, normalizedKey);
      if (score > 0.5) {
        suggestions.push({ key, score });
      }
    }

    return suggestions
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(s => s.key);
  }

  private similarityScore(a: string, b: string): number {
    if (a === b) return 1;
    if (a.includes(b) || b.includes(a)) return 0.8;

    const aWords = a.split(/[\s-]+/);
    const bWords = b.split(/[\s-]+/);
    let matches = 0;
    for (const aw of aWords) {
      if (bWords.some(bw => bw.includes(aw) || aw.includes(bw))) {
        matches++;
      }
    }
    return matches / Math.max(aWords.length, bWords.length);
  }

  private registerEntity(entity: ExtractedEntity): void {
    const registry = this.state.entity_registry[entity.type];
    const key = entity.value;
    registry[key] = (registry[key] || 0) + 1;
  }

  // ==========================================================================
  // INGESTION
  // ==========================================================================

  private determineCategory(
    frontmatter: ParsedFrontmatter,
    entities: ExtractedEntity[],
    tags: string[]
  ): KnowledgeCategory {
    if (frontmatter.category) {
      return frontmatter.category as KnowledgeCategory;
    }

    const hasEDM = entities.some(e =>
      e.type === "operation" && /edm|wire\s*cut|sinker/i.test(e.value)
    );
    if (hasEDM) return "process_engineering";

    const hasMultiaxis = entities.some(e =>
      e.type === "operation" && /5-?axis|simultaneous/i.test(e.value)
    );
    if (hasMultiaxis) return "multiaxis";

    const hasTurning = entities.some(e =>
      e.type === "operation" && /turn|bore|thread|groove/i.test(e.value)
    );
    if (hasTurning) return "turning";

    const hasMilling = entities.some(e =>
      e.type === "operation" && /mill|slot|pocket/i.test(e.value)
    );
    if (hasMilling) return "milling";

    if (tags.some(t => /setup|fixture|clamp/i.test(t))) return "setup";
    if (tags.some(t => /tool|insert|carbide/i.test(t))) return "tooling";
    if (tags.some(t => /speed|feed|sfm|ipm/i.test(t))) return "speeds_feeds";
    if (tags.some(t => /safety|hazard/i.test(t))) return "safety";
    if (tags.some(t => /maintenance|pm/i.test(t))) return "maintenance";
    if (tags.some(t => /quality|spc|inspection/i.test(t))) return "quality";

    return "shop_floor";
  }

  private determineDomain(
    frontmatter: ParsedFrontmatter,
    entities: ExtractedEntity[]
  ): KnowledgeDomain {
    const hasController = entities.some(e => e.type === "controller");
    if (hasController) return "controller_specific";

    const hasTool = entities.some(e => e.type === "tool");
    if (hasTool && entities.filter(e => e.type === "tool").length >= 2) {
      return "tooling_technology";
    }

    return "shop_floor";
  }

  private buildTipFromNote(
    parseResult: ParseResult,
    source: string
  ): Omit<KnowledgeTip, "id" | "created_at" | "usage_count"> {
    const title = parseResult.frontmatter.title ||
      parseResult.sections[0]?.heading ||
      "Shop Floor Note";

    const body = parseResult.sections
      .map(s => s.content)
      .join("\n\n")
      .slice(0, 2000);

    const category = this.determineCategory(
      parseResult.frontmatter,
      parseResult.entities,
      parseResult.tags
    );

    const domain = this.determineDomain(
      parseResult.frontmatter,
      parseResult.entities
    );

    const materialGroups = parseResult.entities
      .filter(e => e.type === "material")
      .map(e => e.value);

    const operationTypes = parseResult.entities
      .filter(e => e.type === "operation")
      .map(e => e.value);

    const machineIds = parseResult.entities
      .filter(e => e.type === "machine")
      .map(e => e.value);

    return {
      title,
      body,
      category,
      domain,
      tags: parseResult.tags,
      material_groups: [...new Set(materialGroups)],
      operation_types: [...new Set(operationTypes)],
      machine_ids: [...new Set(machineIds)],
      confidence: 70,
      source: `obsidian:${source}`,
    };
  }

  // ==========================================================================
  // PUBLIC METHODS
  // ==========================================================================

  /**
   * Parse an Obsidian markdown note without ingesting.
   */
  parse(params: z.infer<typeof ParseNoteSchema>): ParseResult {
    let content: string;
    let filename: string | undefined;

    if (params.file_path) {
      if (!fs.existsSync(params.file_path)) {
        return {
          success: false,
          frontmatter: {},
          sections: [],
          entities: [],
          wiki_links: [],
          tags: [],
          raw_body: "",
          checksum: "",
        };
      }
      content = fs.readFileSync(params.file_path, "utf-8");
      filename = path.basename(params.file_path);
    } else {
      content = params.content!;
    }

    const { frontmatter, body } = params.extract_frontmatter !== false
      ? this.parseFrontmatter(content)
      : { frontmatter: {}, body: content };

    const sections = this.parseSections(body);

    const allEntities = params.extract_entities !== false
      ? this.deduplicateEntities(
          sections.flatMap(s => s.entities)
        )
      : [];

    const wikiLinks = this.extractWikiLinks(content);
    const tags = this.extractTags(body, frontmatter);

    return {
      success: true,
      filename,
      frontmatter,
      sections,
      entities: allEntities,
      wiki_links: wikiLinks,
      tags,
      raw_body: body,
      checksum: this.computeChecksum(content),
    };
  }

  /**
   * Validate extracted entities against PRISM registries.
   */
  validate(params: z.infer<typeof ValidateEntitiesSchema>): ValidationResult {
    const entities: ExtractedEntity[] = params.entities.map(e => ({
      type: e.type,
      value: e.value,
      original_text: e.value,
      position: { start: 0, end: 0 },
      confidence: e.confidence,
    }));

    return this.validateEntitiesAgainstRegistries(entities, params.strict);
  }

  /**
   * Ingest a single Obsidian note into PRISM.
   */
  async ingest(params: z.infer<typeof IngestSingleSchema>): Promise<IngestResult> {
    const start = performance.now();
    const warnings: string[] = [];

    const parseParams = {
      file_path: params.file_path,
      content: params.content,
      extract_frontmatter: true,
      extract_entities: true,
    };
    const parseResult = this.parse(parseParams);

    if (!parseResult.success) {
      return {
        success: false,
        parse_result: parseResult,
        relationships_created: 0,
        warnings: ["Failed to parse note"],
        processing_time_ms: performance.now() - start,
      };
    }

    const existing = this.state.ingested_checksums[parseResult.checksum];
    if (existing) {
      return {
        success: true,
        tip_id: existing.tip_id,
        parse_result: parseResult,
        relationships_created: 0,
        warnings: ["Note already ingested (checksum match)"],
        processing_time_ms: performance.now() - start,
      };
    }

    let validationResult: ValidationResult | undefined;
    if (params.validate_entities && parseResult.entities.length > 0) {
      validationResult = this.validateEntitiesAgainstRegistries(
        parseResult.entities,
        false
      );
      warnings.push(...validationResult.warnings);
    }

    const tipData = this.buildTipFromNote(parseResult, params.source);

    // Lazy import to avoid circular deps and enable isolated testing
    const { contentIngestionPipelineEngine } = await import("./ContentIngestionPipelineEngine.js");
    const ingestionResult = await contentIngestionPipelineEngine.ingest({
      content_type: "text",
      content: `${tipData.title}\n\n${tipData.body}`,
      source: tipData.source,
      title: tipData.title,
      metadata: {
        obsidian_import: true,
        entities: parseResult.entities,
        wiki_links: parseResult.wiki_links,
      },
    });

    if (ingestionResult.items_created === 0) {
      return {
        success: false,
        parse_result: parseResult,
        validation_result: validationResult,
        relationships_created: 0,
        warnings: [...warnings, "Ingestion pipeline rejected note (duplicate or invalid)"],
        processing_time_ms: performance.now() - start,
      };
    }

    const tipId = ingestionResult.items[0]?.tip_id || `shop-note-${Date.now()}`;

    this.state.ingested_checksums[parseResult.checksum] = {
      tip_id: tipId,
      ingested_at: new Date().toISOString(),
    };
    this.state.total_ingested++;

    for (const entity of parseResult.entities) {
      this.registerEntity(entity);
    }

    this.saveState();

    // Lazy import to avoid circular deps
    const { tribalKnowledgeEngine } = await import("./TribalKnowledgeEngine.js");
    const tip = tribalKnowledgeEngine.search({ query: tipId })[0];

    return {
      success: true,
      tip_id: tipId,
      tip,
      parse_result: parseResult,
      validation_result: validationResult,
      relationships_created: params.create_relationships ? parseResult.wiki_links.length : 0,
      warnings,
      processing_time_ms: performance.now() - start,
    };
  }

  /**
   * Batch ingest multiple Obsidian notes.
   */
  async batch(params: z.infer<typeof BatchIngestSchema>): Promise<BatchIngestResult> {
    const start = performance.now();
    const results: BatchIngestResult["results"] = [];
    let ingested = 0, skipped = 0, failed = 0;
    let totalEntities = 0, totalRelationships = 0;

    const notes: Array<{ content: string; filename?: string; source?: string }> = [];

    if (params.directory) {
      const files = fs.readdirSync(params.directory)
        .filter(f => f.endsWith(".md"))
        .map(f => path.join(params.directory!, f));

      for (const file of files) {
        notes.push({
          content: fs.readFileSync(file, "utf-8"),
          filename: path.basename(file),
          source: path.basename(file, ".md"),
        });
      }
    } else if (params.files) {
      for (const file of params.files) {
        if (fs.existsSync(file)) {
          notes.push({
            content: fs.readFileSync(file, "utf-8"),
            filename: path.basename(file),
            source: path.basename(file, ".md"),
          });
        }
      }
    } else if (params.notes) {
      notes.push(...params.notes);
    }

    for (const note of notes) {
      try {
        if (params.incremental) {
          const checksum = this.computeChecksum(note.content);
          if (this.state.ingested_checksums[checksum]) {
            skipped++;
            results.push({
              filename: note.filename,
              success: true,
              tip_id: this.state.ingested_checksums[checksum].tip_id,
            });
            continue;
          }
        }

        const result = await this.ingest({
          content: note.content,
          source: note.source || params.source,
          validate_entities: params.validate_entities,
          create_relationships: params.create_relationships,
        });

        if (result.success) {
          ingested++;
          totalEntities += result.parse_result.entities.length;
          totalRelationships += result.relationships_created;
          results.push({
            filename: note.filename,
            success: true,
            tip_id: result.tip_id,
          });
        } else {
          failed++;
          results.push({
            filename: note.filename,
            success: false,
            error: result.warnings.join("; "),
          });
        }
      } catch (err) {
        failed++;
        results.push({
          filename: note.filename,
          success: false,
          error: String(err),
        });
      }
    }

    this.state.session_log.push({
      timestamp: new Date().toISOString(),
      source: params.source,
      notes_ingested: ingested,
      entities_extracted: totalEntities,
    });
    this.saveState();

    return {
      total_notes: notes.length,
      ingested_count: ingested,
      skipped_count: skipped,
      failed_count: failed,
      results,
      entities_extracted: totalEntities,
      relationships_created: totalRelationships,
      processing_time_ms: performance.now() - start,
    };
  }

  /**
   * Get ingestion status and statistics.
   */
  status(): IngestionStats {
    const entityCounts: Record<EntityType, number> = {
      machine: 0,
      material: 0,
      operation: 0,
      tool: 0,
      controller: 0,
    };

    for (const type of Object.keys(this.state.entity_registry) as EntityType[]) {
      for (const count of Object.values(this.state.entity_registry[type])) {
        entityCounts[type] += count;
      }
    }

    const topMachines = Object.entries(this.state.entity_registry.machine)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([machine, count]) => ({ machine, count }));

    const topMaterials = Object.entries(this.state.entity_registry.material)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([material, count]) => ({ material, count }));

    const topOperations = Object.entries(this.state.entity_registry.operation)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([operation, count]) => ({ operation, count }));

    const sources: Record<string, number> = {};
    for (const log of this.state.session_log) {
      sources[log.source] = (sources[log.source] || 0) + log.notes_ingested;
    }

    const totalEntities = Object.values(entityCounts).reduce((a, b) => a + b, 0);
    const validatedEntities = Object.keys(this.state.entity_registry)
      .flatMap(type => Object.keys(this.state.entity_registry[type as EntityType]))
      .length;

    const recentNotes = Object.entries(this.state.ingested_checksums)
      .map(([checksum, data]) => ({
        checksum,
        tip_id: data.tip_id,
        ingested_at: data.ingested_at,
        entity_count: 0,
      }))
      .sort((a, b) => b.ingested_at.localeCompare(a.ingested_at))
      .slice(0, 10);

    return {
      total_ingested: this.state.total_ingested,
      total_sessions: this.state.session_log.length,
      last_ingestion: this.state.session_log[this.state.session_log.length - 1]?.timestamp,
      sources,
      entity_counts: entityCounts,
      validation_rate: totalEntities > 0 ? validatedEntities / totalEntities : 1,
      top_machines: topMachines,
      top_materials: topMaterials,
      top_operations: topOperations,
      recent_notes: recentNotes,
    };
  }

  /**
   * Reset state for testing.
   */
  resetState(): void {
    this.state = {
      ingested_checksums: {},
      entity_registry: {
        machine: {},
        material: {},
        operation: {},
        tool: {},
        controller: {},
      },
      session_log: [],
      total_ingested: 0,
    };
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const shopFloorNoteIngestionEngine = new ShopFloorNoteIngestionEngineImpl();
export { ShopFloorNoteIngestionEngineImpl as ShopFloorNoteIngestionEngine };
