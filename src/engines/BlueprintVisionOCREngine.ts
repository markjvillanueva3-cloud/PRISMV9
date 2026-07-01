/**
 * BlueprintVisionOCREngine — Claude Vision-powered blueprint OCR
 *
 * Takes a photo or scan of a manufacturing blueprint and extracts:
 *   - Dimensions with tolerances (linear, diameter, radius, angular, thread)
 *   - GD&T callouts (position, flatness, perpendicularity, etc.)
 *   - Material specifications
 *   - Surface finish requirements
 *   - Part geometry (profiles, holes, features)
 *   - Title block data
 *   - Manufacturing notes
 *
 * Uses Claude Vision API for actual image understanding — NOT regex-based
 * text parsing. For text-based extraction, use BlueprintOCREngine instead.
 *
 * Output types are compatible with BlueprintOCREngine's interfaces for
 * seamless integration with downstream pipelines (WEDM, milling, turning).
 *
 * Pipeline:
 *   image (base64/file) → Claude Vision → structured JSON → BlueprintAnalysis
 *   → WEDMPrintToProgramEngine or other program generators
 *
 * @module engines/BlueprintVisionOCREngine
 */

import { log } from "../utils/Logger.js";
import Anthropic from "@anthropic-ai/sdk";
import * as fs from "fs";
import * as path from "path";
import type {
  BlueprintAnalysis,
  ExtractedDimension,
  ExtractedGDT,
  TitleBlockData,
  ExtractedNote,
  DimensionType,
  GDTSymbol,
  ToleranceType,
} from "./BlueprintOCREngine.js";

// ============================================================================
// TYPES
// ============================================================================

export type ImageSource =
  | { type: "base64"; data: string; media_type?: MediaType }
  | { type: "file"; path: string }
  | { type: "url"; url: string };

type MediaType = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

export interface BlueprintVisionInput {
  /** Image source — base64 data, file path, or URL */
  image: ImageSource;
  /** Expected unit system (helps Vision focus, auto-detected if omitted) */
  expected_units?: "mm" | "inch";
  /** What kind of blueprint (helps prompt engineering) */
  blueprint_type?: "wire_edm" | "milling" | "turning" | "general";
  /** Extract geometry contours for direct program generation */
  extract_geometry?: boolean;
  /** Model override (default: claude-sonnet-4-20250514) */
  model?: string;
}

/** Extracted 2D profile from the blueprint image */
export interface ExtractedProfile {
  id: string;
  name: string;
  type: "external" | "internal" | "hole" | "slot" | "pocket";
  /** Approximate vertices or control points (from visual analysis) */
  points: Array<{ x: number; y: number }>;
  /** Whether the profile is closed */
  is_closed: boolean;
  /** Estimated dimensions */
  width_mm?: number;
  height_mm?: number;
  diameter_mm?: number;
  /** Corner radii if visible */
  corner_radii_mm?: number[];
  confidence: number;
}

export interface BlueprintVisionResult extends BlueprintAnalysis {
  /** Extracted geometry profiles (if extract_geometry=true) */
  profiles: ExtractedProfile[];
  /** Overall part bounding box in mm */
  part_bounds_mm?: { width: number; height: number; depth?: number };
  /** Detected part thickness (critical for wire EDM) */
  thickness_mm?: number;
  /** Tokens used for the API call */
  tokens_used: number;
  /** Processing time in ms */
  processing_time_ms: number;
  /** Raw Vision API response (for debugging) */
  raw_response?: string;
}

// ============================================================================
// VISION PROMPT — Manufacturing Blueprint Analysis
// ============================================================================

const BLUEPRINT_ANALYSIS_PROMPT = `You are a manufacturing engineer analyzing an engineering drawing/blueprint. Extract ALL manufacturing-relevant information from this image.

Return a JSON object with this exact structure:
{
  "title_block": {
    "part_number": "string or null",
    "revision": "string or null",
    "drawing_number": "string or null",
    "title": "string or null",
    "material": "string or null (e.g., 'D2 Tool Steel', '4140', 'SS 304', 'Al 6061')",
    "finish": "string or null",
    "scale": "string or null",
    "units": "mm or in or mixed",
    "general_tolerance": "string or null (e.g., '.005', '±0.1')",
    "third_angle": true
  },
  "dimensions": [
    {
      "type": "linear|diameter|radius|angular|chamfer|depth|thread|counterbore|countersink",
      "nominal": 25.4,
      "unit": "mm or in",
      "tolerance_type": "bilateral|unilateral_plus|unilateral_minus|limit|basic|reference|null",
      "tolerance_upper": 0.01,
      "tolerance_lower": -0.01,
      "surface_finish_ra": null,
      "location_hint": "where on the part this dimension is",
      "raw_text": "the exact text shown on drawing",
      "confidence": 0.95
    }
  ],
  "gdt": [
    {
      "symbol": "position|flatness|perpendicularity|parallelism|concentricity|circularity|cylindricity|profile_line|profile_surface|circular_runout|total_runout|straightness|symmetry|angularity",
      "tolerance_value": 0.05,
      "tolerance_unit": "mm or in",
      "material_condition": "MMC|LMC|RFS|null",
      "datum_references": ["A", "B"],
      "applied_to": "what feature",
      "raw_text": "the feature control frame text",
      "confidence": 0.90
    }
  ],
  "notes": [
    {
      "category": "process|material|finish|tolerance|inspection|safety|assembly|general",
      "text": "the note text",
      "is_critical": false
    }
  ],
  "profiles": [
    {
      "name": "descriptive name",
      "type": "external|internal|hole|slot|pocket",
      "points": [{"x": 0, "y": 0}, {"x": 25.4, "y": 0}, ...],
      "is_closed": true,
      "width_mm": 25.4,
      "height_mm": 12.7,
      "diameter_mm": null,
      "corner_radii_mm": [0.5, 0.5],
      "confidence": 0.85
    }
  ],
  "part_bounds_mm": { "width": 50.0, "height": 25.0, "depth": 12.7 },
  "thickness_mm": 25.4,
  "surface_finishes": [
    { "ra_um": 0.8, "location": "all machined surfaces", "raw_text": "Ra 0.8" }
  ]
}

Important rules:
- Extract EVERY dimension visible on the drawing, even if partially obscured
- Convert all dimensions to the drawing's unit system (mm or inch)
- For GD&T, identify the geometric characteristic symbol and all datum references
- For profiles/geometry, provide approximate coordinates in the drawing's coordinate system
- thickness_mm is the stock/part thickness (critical for wire EDM)
- If you can't determine a value, use null — do NOT guess
- confidence: 0.0-1.0 reflecting how certain you are of the extraction
- Return ONLY the JSON object, no other text`;

const WIRE_EDM_PROMPT_SUFFIX = `

This blueprint is for WIRE EDM cutting. Pay special attention to:
- Internal profiles/cavities (die openings, punch shapes)
- Through-features (wire EDM cuts through the full thickness)
- Corner radii (minimum radius determines wire diameter needed)
- Surface finish requirements (determines number of skim passes)
- Material hardness (HRC callouts)
- Taper angles if any
- Thread/start hole locations
- Slug retention features (tabs, micro-joints)`;

// ============================================================================
// MEDIA TYPE MAP
// ============================================================================

const MEDIA_TYPE_MAP: Record<string, MediaType> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
};

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class BlueprintVisionOCREngine {
  private client: Anthropic | null = null;
  private defaultModel = "claude-sonnet-4-20250514";

  /** Lazy-init Anthropic client */
  private getClient(): Anthropic {
    if (!this.client) {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        throw new Error(
          "ANTHROPIC_API_KEY not set. Set the environment variable to use Vision OCR.",
        );
      }
      this.client = new Anthropic({ apiKey });
    }
    return this.client;
  }

  /** Resolve image source to base64 + media type */
  private resolveImage(source: ImageSource): { data: string; media_type: MediaType } {
    if (source.type === "base64") {
      return {
        data: source.data,
        media_type: source.media_type || "image/jpeg",
      };
    }

    if (source.type === "file") {
      if (!fs.existsSync(source.path)) {
        throw new Error(`Image file not found: ${source.path}`);
      }
      const ext = path.extname(source.path).toLowerCase();
      const media_type = MEDIA_TYPE_MAP[ext] || "image/jpeg";
      const data = fs.readFileSync(source.path).toString("base64");
      return { data, media_type };
    }

    // URL sources — let the API handle them
    throw new Error("URL image sources require the API to fetch. Use base64 or file instead.");
  }

  /** Call Claude Vision API with retry logic */
  private async callVision(
    imageData: string,
    mediaType: MediaType,
    prompt: string,
    model?: string,
  ): Promise<{ text: string; tokens_used: number }> {
    const client = this.getClient();
    const modelId = model || this.defaultModel;
    const maxRetries = 2;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const startMs = Date.now();
        const response = await client.messages.create({
          model: modelId,
          max_tokens: 4096, // Blueprints need more tokens than video frames
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image",
                  source: { type: "base64", media_type: mediaType, data: imageData },
                },
                { type: "text", text: prompt },
              ],
            },
          ],
        });

        const elapsed = Date.now() - startMs;
        const text = response.content[0]?.type === "text" ? response.content[0].text : "";
        const tokensUsed = (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0);

        log.info(`[BlueprintVisionOCR] API call: ${elapsed}ms, ${tokensUsed} tokens (model: ${modelId})`);

        return { text, tokens_used: tokensUsed };
      } catch (err: unknown) {
        lastError = err instanceof Error ? err : new Error(String(err));
        log.warn(`[BlueprintVisionOCR] API attempt ${attempt + 1} failed: ${lastError.message}`);
        if (attempt < maxRetries) {
          await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
        }
      }
    }

    throw lastError || new Error("Vision API call failed after retries");
  }

  /** Parse JSON from Claude response, handling markdown fences */
  private parseJSON<T>(text: string): T {
    let cleaned = text.trim();
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
    }
    try {
      return JSON.parse(cleaned) as T;
    } catch {
      throw new Error(`Failed to parse Vision response as JSON: ${cleaned.substring(0, 300)}`);
    }
  }

  // ── Public Methods ──────────────────────────────────────────────────

  /**
   * Analyze a blueprint image and extract all manufacturing data.
   *
   * This is the primary entry point for the photo-to-program workflow.
   */
  async analyzeBlueprint(input: BlueprintVisionInput): Promise<BlueprintVisionResult> {
    const startMs = Date.now();

    // Resolve image
    const { data, media_type } = this.resolveImage(input.image);

    // Build prompt
    let prompt = BLUEPRINT_ANALYSIS_PROMPT;
    if (input.blueprint_type === "wire_edm") {
      prompt += WIRE_EDM_PROMPT_SUFFIX;
    }
    if (input.expected_units) {
      prompt += `\n\nThe drawing uses ${input.expected_units === "mm" ? "metric (millimeters)" : "imperial (inches)"} units.`;
    }
    if (input.extract_geometry) {
      prompt += "\n\nIMPORTANT: Extract profile geometry with as many coordinate points as you can determine from the drawing. This data will be used to generate CNC cutting paths.";
    }

    // Call Vision API
    const { text, tokens_used } = await this.callVision(data, media_type, prompt, input.model);
    const elapsed = Date.now() - startMs;

    // Parse response
    const raw = this.parseJSON<RawVisionResponse>(text);

    // Convert to BlueprintAnalysis-compatible format
    const dimensions = this.convertDimensions(raw.dimensions || []);
    const gdt = this.convertGDT(raw.gdt || []);
    const titleBlock = this.convertTitleBlock(raw.title_block || {});
    const notes = this.convertNotes(raw.notes || []);
    const profiles = this.convertProfiles(raw.profiles || []);

    // Build summary
    const tightest = dimensions.length > 0
      ? Math.min(...dimensions
          .filter(d => d.tolerance)
          .map(d => Math.abs(d.tolerance!.upper - d.tolerance!.lower)))
      : 0;

    const material = titleBlock.material || "";
    const criticalFeatures = dimensions
      .filter(d => d.tolerance && Math.abs(d.tolerance.upper - d.tolerance.lower) < 0.05)
      .map(d => d.location_hint || d.raw_text);

    return {
      dimensions,
      gdt_frames: gdt,
      title_block: titleBlock,
      notes,
      summary: {
        total_dimensions: dimensions.length,
        total_gdt: gdt.length,
        total_notes: notes.length,
        tightest_tolerance_mm: tightest,
        critical_features: criticalFeatures,
        material,
        has_gdt: gdt.length > 0,
      },
      profiles,
      part_bounds_mm: raw.part_bounds_mm || undefined,
      thickness_mm: raw.thickness_mm ?? undefined,
      tokens_used,
      processing_time_ms: elapsed,
    };
  }

  /**
   * Quick extraction — just dimensions and material (faster, cheaper).
   * Useful for initial feasibility checks before full analysis.
   */
  async quickExtract(input: BlueprintVisionInput): Promise<{
    material: string;
    thickness_mm: number | null;
    dimension_count: number;
    tightest_tolerance_mm: number;
    units: "mm" | "in";
    tokens_used: number;
  }> {
    const { data, media_type } = this.resolveImage(input.image);

    const quickPrompt = `Analyze this manufacturing blueprint quickly. Return JSON:
{
  "material": "material specification (e.g., 'D2 Tool Steel', '4140')",
  "thickness_mm": number or null,
  "dimensions": [{"nominal": 25.4, "unit": "mm", "tol_range": 0.02}],
  "units": "mm or in"
}
Only return the JSON, nothing else.`;

    const { text, tokens_used } = await this.callVision(data, media_type, quickPrompt, input.model);
    const raw = this.parseJSON<{
      material: string;
      thickness_mm: number | null;
      dimensions: Array<{ nominal: number; unit: string; tol_range?: number }>;
      units: string;
    }>(text);

    const tightest = raw.dimensions.length > 0
      ? Math.min(...raw.dimensions.filter(d => d.tol_range).map(d => d.tol_range!))
      : 0;

    return {
      material: raw.material || "unknown",
      thickness_mm: raw.thickness_mm,
      dimension_count: raw.dimensions.length,
      tightest_tolerance_mm: tightest,
      units: raw.units === "in" ? "in" : "mm",
      tokens_used,
    };
  }

  // ── Conversion Helpers ──────────────────────────────────────────────

  private convertDimensions(raw: RawDimension[]): ExtractedDimension[] {
    return raw.map((d, i) => {
      const tol = d.tolerance_type && d.tolerance_upper != null && d.tolerance_lower != null
        ? {
            type: (d.tolerance_type || "bilateral") as ToleranceType,
            upper: d.tolerance_upper,
            lower: d.tolerance_lower,
          }
        : undefined;

      return {
        id: `DIM-${i + 1}`,
        type: (d.type || "linear") as DimensionType,
        nominal: d.nominal ?? 0,
        unit: d.unit === "in" ? "in" as const : "mm" as const,
        tolerance: tol,
        surface_finish_ra: d.surface_finish_ra ?? undefined,
        location_hint: d.location_hint || undefined,
        raw_text: d.raw_text || String(d.nominal),
        confidence: d.confidence ?? 0.8,
      };
    });
  }

  private convertGDT(raw: RawGDT[]): ExtractedGDT[] {
    return raw.map((g, i) => ({
      id: `GDT-${i + 1}`,
      symbol: (g.symbol || "position") as GDTSymbol,
      tolerance_value: g.tolerance_value ?? 0,
      tolerance_unit: g.tolerance_unit === "in" ? "in" as const : "mm" as const,
      material_condition: g.material_condition as "MMC" | "LMC" | "RFS" | undefined,
      datum_references: g.datum_references || [],
      applied_to: g.applied_to || undefined,
      raw_text: g.raw_text || "",
      confidence: g.confidence ?? 0.8,
    }));
  }

  private convertTitleBlock(raw: Partial<TitleBlockData>): TitleBlockData {
    return {
      part_number: raw.part_number || undefined,
      revision: raw.revision || undefined,
      drawing_number: raw.drawing_number || undefined,
      title: raw.title || undefined,
      material: raw.material || undefined,
      finish: raw.finish || undefined,
      scale: raw.scale || undefined,
      units: raw.units || undefined,
      general_tolerance: raw.general_tolerance || undefined,
      third_angle: raw.third_angle ?? true,
      confidence: 0.85,
    };
  }

  private convertNotes(raw: RawNote[]): ExtractedNote[] {
    return raw.map((n, i) => ({
      id: `NOTE-${i + 1}`,
      category: (n.category || "general") as ExtractedNote["category"],
      text: n.text || "",
      is_critical: n.is_critical ?? false,
      confidence: 0.85,
    }));
  }

  private convertProfiles(raw: RawProfile[]): ExtractedProfile[] {
    return raw.map((p, i) => ({
      id: `PROFILE-${i + 1}`,
      name: p.name || `Profile ${i + 1}`,
      type: (p.type || "external") as ExtractedProfile["type"],
      points: (p.points || []).map(pt => ({ x: pt.x ?? 0, y: pt.y ?? 0 })),
      is_closed: p.is_closed ?? true,
      width_mm: p.width_mm ?? undefined,
      height_mm: p.height_mm ?? undefined,
      diameter_mm: p.diameter_mm ?? undefined,
      corner_radii_mm: p.corner_radii_mm ?? undefined,
      confidence: p.confidence ?? 0.7,
    }));
  }
}

// ============================================================================
// RAW VISION RESPONSE TYPES (internal — what Claude Vision returns)
// ============================================================================

interface RawVisionResponse {
  title_block?: Partial<TitleBlockData>;
  dimensions?: RawDimension[];
  gdt?: RawGDT[];
  notes?: RawNote[];
  profiles?: RawProfile[];
  part_bounds_mm?: { width: number; height: number; depth?: number };
  thickness_mm?: number | null;
  surface_finishes?: Array<{ ra_um: number; location: string; raw_text: string }>;
}

interface RawDimension {
  type?: string;
  nominal?: number;
  unit?: string;
  tolerance_type?: string | null;
  tolerance_upper?: number | null;
  tolerance_lower?: number | null;
  surface_finish_ra?: number | null;
  location_hint?: string;
  raw_text?: string;
  confidence?: number;
}

interface RawGDT {
  symbol?: string;
  tolerance_value?: number;
  tolerance_unit?: string;
  material_condition?: string | null;
  datum_references?: string[];
  applied_to?: string;
  raw_text?: string;
  confidence?: number;
}

interface RawNote {
  category?: string;
  text?: string;
  is_critical?: boolean;
}

interface RawProfile {
  name?: string;
  type?: string;
  points?: Array<{ x?: number; y?: number }>;
  is_closed?: boolean;
  width_mm?: number | null;
  height_mm?: number | null;
  diameter_mm?: number | null;
  corner_radii_mm?: number[];
  confidence?: number;
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const blueprintVisionOCREngine = new BlueprintVisionOCREngine();
