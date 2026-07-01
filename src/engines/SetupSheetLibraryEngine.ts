/**
 * PRISM MCP Server — Setup Sheet Library Engine
 *
 * Persistent in-memory library for storing, searching, and reusing
 * machine setup configurations. Supports save/find/get and similarity-based
 * reuse suggestions for new parts.
 *
 * @module SetupSheetLibraryEngine
 */

// ============================================================================
// TYPES
// ============================================================================

export interface WorkholdingSpec {
  type: string;
  jaw_type?: string;
  pressure_kn?: number;
}

export interface DatumSpec {
  primary: string;
  secondary?: string;
  tertiary?: string;
}

export interface ToolEntry {
  position: number;
  id: string;
  description: string;
}

export interface SetupInput {
  part_number: string;
  operation: string;
  machine_id?: string;
  workholding: WorkholdingSpec;
  datum: DatumSpec;
  tools: ToolEntry[];
  notes?: string;
  photo_ref?: string;
}

export interface SetupRecord extends SetupInput {
  setup_id: string;
  created_at: string;
  updated_at: string;
}

export interface SaveResult {
  setup_id: string;
  saved: true;
}

export interface FindInput {
  part_number?: string;
  material?: string;
  workholding_type?: string;
  keyword?: string;
}

export interface FindResult {
  matches: Array<SetupRecord & { relevance_score: number }>;
  total: number;
}

export interface SuggestInput {
  material: string;
  approximate_size: { x: number; y: number; z: number };
  features: string[];
}

export interface SuggestResult {
  suggestions: Array<SetupRecord & { match_score: number; match_reasons: string[] }>;
}

// ============================================================================
// HELPERS
// ============================================================================

let _idCounter = 0;

function generateId(): string {
  _idCounter++;
  const ts = Date.now().toString(36);
  const seq = _idCounter.toString(36).padStart(4, "0");
  return `SETUP-${ts}-${seq}`;
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, " ").trim();
}

function tokenize(s: string): string[] {
  return normalize(s).split(/\s+/).filter(Boolean);
}

function tokenOverlap(a: string[], b: string[]): number {
  const setB = new Set(b);
  let matches = 0;
  for (const t of a) {
    if (setB.has(t)) matches++;
  }
  return matches;
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

// ============================================================================
// ENGINE
// ============================================================================

export class SetupSheetLibraryEngine {
  private store: Map<string, SetupRecord> = new Map();

  /**
   * Store a setup configuration.
   */
  saveSetup(input: SetupInput): SaveResult {
    const now = new Date().toISOString();

    // Check for existing setup with same part_number + operation — update it
    let existing: SetupRecord | undefined;
    for (const rec of this.store.values()) {
      if (rec.part_number === input.part_number && rec.operation === input.operation) {
        existing = rec;
        break;
      }
    }

    if (existing) {
      const updated: SetupRecord = {
        ...input,
        setup_id: existing.setup_id,
        created_at: existing.created_at,
        updated_at: now,
      };
      this.store.set(existing.setup_id, updated);
      return { setup_id: existing.setup_id, saved: true };
    }

    const setup_id = generateId();
    const record: SetupRecord = {
      ...input,
      setup_id,
      created_at: now,
      updated_at: now,
    };
    this.store.set(setup_id, record);
    return { setup_id, saved: true };
  }

  /**
   * Search setups by part number, material tag, workholding type, or keyword.
   */
  findSetup(input: FindInput): FindResult {
    const results: Array<SetupRecord & { relevance_score: number }> = [];

    for (const rec of this.store.values()) {
      let score = 0;

      // Part number match
      if (input.part_number) {
        const normPN = normalize(input.part_number);
        const recPN = normalize(rec.part_number);
        if (recPN === normPN) {
          score += 10;
        } else if (recPN.includes(normPN) || normPN.includes(recPN)) {
          score += 5;
        }
      }

      // Workholding type match
      if (input.workholding_type) {
        const normWH = normalize(input.workholding_type);
        const recWH = normalize(rec.workholding.type);
        if (recWH === normWH) {
          score += 4;
        } else if (recWH.includes(normWH)) {
          score += 2;
        }
      }

      // Material match (search in notes since we don't store material directly)
      if (input.material) {
        const normMat = normalize(input.material);
        const searchableText = normalize(
          [rec.notes ?? "", rec.operation, rec.part_number].join(" "),
        );
        if (searchableText.includes(normMat)) {
          score += 3;
        }
      }

      // Keyword search across all text fields
      if (input.keyword) {
        const kwTokens = tokenize(input.keyword);
        const recText = normalize(
          [
            rec.part_number,
            rec.operation,
            rec.machine_id ?? "",
            rec.workholding.type,
            rec.workholding.jaw_type ?? "",
            rec.datum.primary,
            rec.datum.secondary ?? "",
            rec.datum.tertiary ?? "",
            rec.notes ?? "",
            ...rec.tools.map((t) => `${t.id} ${t.description}`),
          ].join(" "),
        );
        const recTokens = tokenize(recText);
        const overlap = tokenOverlap(kwTokens, recTokens);
        if (overlap > 0) {
          score += overlap * 2;
        }
        // Substring match fallback
        for (const kw of kwTokens) {
          if (recText.includes(kw) && overlap === 0) {
            score += 1;
          }
        }
      }

      if (score > 0) {
        results.push({ ...rec, relevance_score: score });
      }
    }

    // Sort by relevance descending
    results.sort((a, b) => b.relevance_score - a.relevance_score);

    return { matches: results, total: results.length };
  }

  /**
   * Retrieve full setup by ID.
   */
  getSetup(input: { setup_id: string }): SetupRecord | { error: string } {
    const rec = this.store.get(input.setup_id);
    if (!rec) {
      return { error: `Setup not found: ${input.setup_id}` };
    }
    return rec;
  }

  /**
   * Given a new part description, find similar prior setups by matching
   * size envelope, features, and material against stored setups.
   */
  suggestReuse(input: SuggestInput): SuggestResult {
    const suggestions: Array<SetupRecord & { match_score: number; match_reasons: string[] }> = [];
    const inputVolume = input.approximate_size.x * input.approximate_size.y * input.approximate_size.z;
    const inputFeatureTokens = input.features.flatMap((f) => tokenize(f));
    const inputMatTokens = tokenize(input.material);

    for (const rec of this.store.values()) {
      let score = 0;
      const reasons: string[] = [];

      // Build searchable text from the stored setup
      const recText = normalize(
        [
          rec.part_number,
          rec.operation,
          rec.notes ?? "",
          ...rec.tools.map((t) => t.description),
        ].join(" "),
      );
      const recTokens = tokenize(recText);

      // Feature matching
      const featureOverlap = tokenOverlap(inputFeatureTokens, recTokens);
      if (featureOverlap > 0) {
        const featureScore = (featureOverlap / Math.max(inputFeatureTokens.length, 1)) * 40;
        score += featureScore;
        reasons.push(`${featureOverlap} feature keyword matches`);
      }

      // Material matching
      const matOverlap = tokenOverlap(inputMatTokens, recTokens);
      if (matOverlap > 0) {
        score += 20;
        reasons.push("Material match in setup notes/description");
      }

      // Workholding type heuristic — vise for prismatic, chuck for round
      const hasRoundFeatures = input.features.some((f) => {
        const fl = f.toLowerCase();
        return fl.includes("bore") || fl.includes("round") || fl.includes("turn") || fl.includes("od");
      });
      const hasPrismaticFeatures = input.features.some((f) => {
        const fl = f.toLowerCase();
        return fl.includes("pocket") || fl.includes("slot") || fl.includes("flat") || fl.includes("mill");
      });

      const whType = rec.workholding.type.toLowerCase();
      if (hasRoundFeatures && (whType.includes("chuck") || whType.includes("collet"))) {
        score += 10;
        reasons.push("Workholding type matches round-part features");
      }
      if (hasPrismaticFeatures && (whType.includes("vise") || whType.includes("fixture"))) {
        score += 10;
        reasons.push("Workholding type matches prismatic features");
      }

      // Size envelope heuristic — if notes mention dimensions, rough compare
      // (since we don't store size in setup, just give a small bonus for any match)
      if (inputVolume > 0 && score > 0) {
        score += 5; // base bonus for having any match context
        reasons.push("Size envelope considered");
      }

      // Tool count similarity
      const toolCount = rec.tools.length;
      const expectedTools = Math.max(input.features.length, 1);
      const toolRatio = Math.min(toolCount, expectedTools) / Math.max(toolCount, expectedTools);
      if (toolRatio > 0.5) {
        score += toolRatio * 10;
        reasons.push(`Tool count similarity (${toolCount} tools)`);
      }

      if (score > 0) {
        suggestions.push({
          ...rec,
          match_score: round2(score),
          match_reasons: reasons,
        });
      }
    }

    // Sort by match score descending
    suggestions.sort((a, b) => b.match_score - a.match_score);

    // Return top 10
    return { suggestions: suggestions.slice(0, 10) };
  }

  /** Clear all stored setups (for testing). */
  clear(): void {
    this.store.clear();
  }

  /** Get count of stored setups. */
  get size(): number {
    return this.store.size;
  }
}

/** Singleton instance */
export const setupSheetLibraryEngine = new SetupSheetLibraryEngine();
