// WIRE-EXEMPT: dispatcher import was removed by an unrelated peer revert mid-session
// (CAD-FUSION-LIVE-MS0 / 2026-05-06). Engine is consumed via direct import by
// PrintToFusion360Bridge + downstream OCR pipelines and does not need its own
// dispatcher action surface; restoring the previous prism_cad lazy import is
// scheduled in the same milestone's restoration commit alongside the rest of the
// reverted CAD edits.
/**
 * BlueprintVisionOCREngine -- vision-LLM-powered blueprint OCR (free Ollama-first)
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
 * Uses a vision LLM for actual image understanding (free Ollama-first via
 * llmEngine.queryVision, Claude vision backup) -- NOT regex-based text parsing.
 * For text-based extraction, use BlueprintOCREngine instead.
 *
 * Output types are compatible with BlueprintOCREngine's interfaces for
 * seamless integration with downstream pipelines (WEDM, milling, turning).
 *
 * Pipeline:
 *   image (base64/file) → vision LLM (Ollama-first) → structured JSON → BlueprintAnalysis
 *   → WEDMPrintToProgramEngine or other program generators
 *
 * @module engines/BlueprintVisionOCREngine
 */

import { log } from "../utils/Logger.js";
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
import { resolveSurfaceFinishRa, mapSurfaceFinishes, selectPartDefaultFinish, type SurfaceFinishCallout } from "../utils/surfaceFinishNormalize.js";
import { resolveThread } from "../utils/threadCalloutNormalize.js";
import { resolveChamfer } from "../utils/chamferCalloutNormalize.js";
import { validateExtractedGdt } from "../utils/gdtFcfValidate.js";
import { normalizeGdtSymbol } from "../utils/gdtSymbolNormalize.js";

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
  /** Model override (advisory; the llmEngine vision ladder selects the provider) */
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
  /** Part-level surface-finish callouts (e.g. "63 RMS all over"); the VLM emits these in
   * surface_finishes[] -- text callouts are recovered to a canonical Ra (um). Previously dropped. */
  surface_finishes?: SurfaceFinishCallout[];
  /** The single unambiguous part-level "all over / unless otherwise noted" finish, if any --
   * an INFORMATIONAL default (NOT applied to dimensions; carries finish_system/assumed
   * provenance). null when none or ambiguous (U-XRAY-PART-DEFAULT-FINISH). */
  part_default_surface_finish?: SurfaceFinishCallout | null;
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
  /** Inferred part class (punch/die/shaft/bushing/plate/blisk/turbine_blade/medical_implant/...) */
  part_class?: PartClass;
  /** Features the part class typically carries that the OCR did not surface — flagged as expected-but-absent. */
  expected_features?: ExpectedFeatureFlag[];
}

/** Coarse part class — used to apply feature-prior expectations.
 *
 * Covers tooling, turbomachinery, medical, automotive, aerospace, and structural
 * domains. Each member has a corresponding rule set in `flagExpectedFeatures`.
 */
export type PartClass =
  // Tooling
  | "extrude_punch"
  | "die"
  | "shaft"
  | "bushing"
  | "plate"
  // Turbomachinery
  | "blisk"
  | "impeller"
  | "turbine_blade"
  | "turbine_vane"
  | "turbine_nozzle"
  | "turbine_disk"
  | "casing"
  // Medical
  | "medical_implant"
  | "surgical_instrument"
  | "bone_screw"
  // Automotive
  | "engine_block"
  | "transmission_housing"
  | "valve_body"
  | "brake_caliper"
  | "connecting_rod"
  // Aerospace structural
  | "structural_frame"
  | "bulkhead"
  | "bracket"
  | "fitting"
  | "lug"
  | "pylon"
  // Catch-all
  | "general";

/** A feature the inferred part class typically carries that we did NOT see in OCR. */
export interface ExpectedFeatureFlag {
  /** Stable identifier — kind of feature expected. */
  kind:
    // Tooling priors
    | "central_oil_hole"
    | "cross_drilled_relief_holes"
    | "ejector_pin_hole"
    | "lifter_groove"
    | "vent_groove"
    | "cooling_lines"
    | "datum_relief"
    | "bevel_face_chamfer"
    // Turbomachinery priors
    | "leading_edge_fillet"
    | "trailing_edge_fillet"
    | "blade_root_fillet"
    | "balance_hole"
    | "tip_clearance"
    | "shroud_seal"
    // Medical priors
    | "polish_callout"
    | "biocompat_note"
    | "radiopaque_marker"
    | "thread_chamfer"
    | "cannulation"
    // Automotive priors
    | "valve_seat_angle"
    | "valve_guide_bore"
    | "main_bearing_bore"
    | "deck_flatness_callout"
    | "head_bolt_pattern"
    // Aerospace priors
    | "edge_distance_callout"
    | "fatigue_finish_callout"
    | "shot_peen_zone"
    | "anti_fretting_coating"
    | "bushing_press_fit"
    | "lockwire_hole";
  /** Why we expect it (part class + reasoning). */
  reason: string;
  /** Suggested nominal callout from common shop conventions, in mm. */
  typical_size_mm?: number;
  /** Whether the OCR found anything matching this kind (true => no flag emitted). */
  found: boolean;
  /** [0,1] confidence that this feature is genuinely missing vs. just unlabeled. */
  confidence: number;
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
- GD&T feature control frames read LEFT-TO-RIGHT in this fixed ASME Y14.5 order: [1] the geometric characteristic symbol (set "symbol" to one of the listed names); [2] the tolerance zone -- a LEADING DIAMETER SYMBOL means a cylindrical/diametral zone, then the tolerance value; [3] an OPTIONAL material modifier (circled M = MMC, circled L = LMC, none = RFS); [4] the datum references in order primary|secondary|tertiary as ["A","B","C"] IN THAT ORDER. Copy the whole frame verbatim into raw_text.
- FORM tolerances (flatness, straightness, circularity, cylindricity) take NO datum -> datum_references = []. LOCATION/ORIENTATION/RUNOUT (position, perpendicularity, parallelism, angularity, concentricity, symmetry, circular_runout, total_runout) REQUIRE at least one datum; if such a symbol appears with no datum, still report it -- do NOT invent a datum.
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
  // Vision provider = the shared FREE Ollama-first llmEngine.queryVision substrate
  // (FREE-AI-MIGRATION). No Anthropic client / API key is held here anymore -- the
  // provider ladder (Ollama vision -> Claude vision backup -> offline) lives in LLMEngine.

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

  /**
   * Run the blueprint image + prompt through the shared FREE Ollama-first
   * llmEngine.queryVision substrate (FREE-AI-MIGRATION/U-BLUEPRINT-VISION-OCR-LLM-ROUTE).
   * Was a direct PAID Claude Vision call (new Anthropic().messages.create); now routes
   * Ollama vision model first (free) -> Claude vision backup (a weak local read, or ollama
   * down + key set) -> offline. complexity:"high" -- blueprint dimension/GD&T extraction is
   * high-stakes, so a weak local read escalates to the Claude backup. The llmEngine ladder
   * owns timeout + retry/cooldown, so the old per-call retry loop is gone.
   *
   * R12: a blueprint OCR read needs a REAL vision provider; an "offline" result is a generic
   * stub, not a real extraction, so we THROW rather than parse an empty response into bogus
   * dimensions. `_model` is advisory now -- the provider is chosen by the vision ladder.
   */
  private async callVision(
    imageData: string,
    mediaType: MediaType,
    prompt: string,
    _model?: string,
  ): Promise<{ text: string; tokens_used: number }> {
    const { llmEngine } = await import("./LLMEngine.js");
    const startMs = Date.now();
    const res = await llmEngine.queryVision({
      prompt,
      images: [{ data: imageData, media_type: mediaType }],
      complexity: "high",
      max_tokens: 4096, // blueprints carry more dimensions than a single CAD frame
    });
    if (res.model === "offline") {
      throw new Error(
        "No vision AI provider available (Ollama vision model down and no Claude backup key) -- BlueprintVisionOCR requires a real provider for blueprint extraction.",
      );
    }
    const tokensUsed = res.tokens_used.input + res.tokens_used.output;
    const elapsed = Date.now() - startMs;
    log.info(`[BlueprintVisionOCR] vision read via ${res.model}: ${elapsed}ms, ${tokensUsed} tokens`);
    return { text: res.answer, tokens_used: tokensUsed };
  }

  /** Parse JSON from the vision LLM response, handling markdown fences */
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

    // Pre-compute the single unambiguous part-level "all over / unless otherwise noted" finish
    // as an INFORMATIONAL signal (U-XRAY-PART-DEFAULT-FINISH). It is deliberately NOT applied to
    // any dimension's surface_finish_ra: that field is cost/process-bearing (feeds quote
    // multipliers in TolerancePricingImpactEngine + WEDM trim-pass count in WireEDMPunchDieAdapter),
    // so silently stamping a derived part-default onto it would corrupt downstream numbers with no
    // provenance. A consumer must opt in with operator-confirm + confidence handling (queued).
    const surfaceFinishes = mapSurfaceFinishes(raw.surface_finishes);
    const partDefaultFinish = selectPartDefaultFinish(surfaceFinishes);

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

    const baseResult: BlueprintVisionResult = {
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
      // Part-level surface finishes the VLM returned (recovers text callouts the engine
      // previously dropped entirely -- U-XRAY-PART-SURFACE-FINISHES).
      surface_finishes: surfaceFinishes,
      part_default_surface_finish: partDefaultFinish,
      part_bounds_mm: raw.part_bounds_mm || undefined,
      thickness_mm: raw.thickness_mm ?? undefined,
      tokens_used,
      processing_time_ms: elapsed,
    };

    // Apply feature-prior post-processing: classify part, then flag features
    // the class typically carries that the OCR did not surface. Catches "punch
    // with no oil hole detected" early — before the print-to-program pipeline
    // drops the feature silently.
    baseResult.part_class = this.inferPartClass(baseResult);
    baseResult.expected_features = this.flagExpectedFeatures(baseResult);
    return baseResult;
  }

  // ── Part-Class Inference + Feature Priors ─────────────────────────

  /**
   * Coarse part-class classifier driven by title-block fields, drawing-number
   * patterns, and detected geometry. Pure function of the BlueprintVisionResult —
   * no Vision API calls.
   */
  inferPartClass(r: BlueprintVisionResult): PartClass {
    const fields: string[] = [];
    if (r.title_block.title) fields.push(r.title_block.title);
    if (r.title_block.drawing_number) fields.push(r.title_block.drawing_number);
    if (r.title_block.part_number) fields.push(r.title_block.part_number);
    for (const n of r.notes) if (n.text) fields.push(n.text);
    const blob = fields.join(" | ").toUpperCase();

    // Turbomachinery (check before generic shaft)
    if (/\bBLISK\b|BLADED\s*DISK|INTEGRAL\s*BLADED/.test(blob)) return "blisk";
    if (/\bIMPELLER\b|COMPRESSOR\s*WHEEL|PUMP\s*WHEEL/.test(blob)) return "impeller";
    if (/TURBINE\s*BLADE|HPT\s*BLADE|LPT\s*BLADE|FAN\s*BLADE/.test(blob)) return "turbine_blade";
    if (/TURBINE\s*VANE|STATOR\s*VANE|NGV/.test(blob)) return "turbine_vane";
    if (/TURBINE\s*NOZZLE|NOZZLE\s*SEGMENT|NOZZLE\s*GUIDE/.test(blob)) return "turbine_nozzle";
    if (/TURBINE\s*DISK|ROTOR\s*DISK|HPT\s*DISK|LPT\s*DISK/.test(blob)) return "turbine_disk";
    if (/\bCASING\b|TURBINE\s*CASING|COMPRESSOR\s*CASING|HOUSING\s*ASSY/.test(blob)) return "casing";

    // Medical
    if (/IMPLANT|HIP\s*STEM|KNEE\s*COMPONENT|DENTAL\s*ABUTMENT|SPINAL\s*CAGE|BONE\s*PLATE/.test(blob)) return "medical_implant";
    if (/SURGICAL\s*INSTRUMENT|FORCEP|RETRACTOR|OSTEOTOME|RONGEUR/.test(blob)) return "surgical_instrument";
    if (/BONE\s*SCREW|CORTICAL\s*SCREW|CANNULATED\s*SCREW|PEDICLE\s*SCREW/.test(blob)) return "bone_screw";

    // Automotive
    if (/ENGINE\s*BLOCK|CYLINDER\s*BLOCK|V[0-9]\s*BLOCK|I[0-9]\s*BLOCK/.test(blob)) return "engine_block";
    if (/TRANSMISSION\s*HOUSING|TRANS\s*HOUSING|GEARBOX\s*HOUSING|BELL\s*HOUSING/.test(blob)) return "transmission_housing";
    if (/VALVE\s*BODY|VALVE\s*COVER\s*ASSY|HYDRAULIC\s*VALVE\s*BODY/.test(blob)) return "valve_body";
    if (/BRAKE\s*CALIPER|CALIPER\s*BODY/.test(blob)) return "brake_caliper";
    if (/CONNECTING\s*ROD|CONROD|PISTON\s*ROD/.test(blob)) return "connecting_rod";

    // Aerospace structural
    if (/\bPYLON\b|ENGINE\s*MOUNT|NACELLE\s*MOUNT/.test(blob)) return "pylon";
    if (/\bBULKHEAD\b|PRESSURE\s*BULKHEAD|FWD\s*BULKHEAD|AFT\s*BULKHEAD/.test(blob)) return "bulkhead";
    if (/STRUCTURAL\s*FRAME|FUSELAGE\s*FRAME|RIB\s*ASSY|WING\s*RIB|LONGERON/.test(blob)) return "structural_frame";
    if (/CLEVIS\s*LUG|SHEAR\s*LUG|\bLUG\b\s*(?:AT|ON|—|FOR)|ATTACH\s*LUG/.test(blob)) return "lug";
    if (/HYDRAULIC\s*FITTING|FUEL\s*FITTING|AN\s*FITTING|MS\s*FITTING/.test(blob)) return "fitting";
    if (/\bBRACKET\b|MOUNTING\s*BRACKET|SUPPORT\s*BRACKET/.test(blob)) return "bracket";

    // Tooling
    if (/EXTRUDE\s*PUNCH|PIERCE\s*PUNCH|FORM\s*PUNCH/.test(blob)) return "extrude_punch";
    if (/\bDIE\b|DIE\s*PLATE|DIE\s*BLOCK/.test(blob)) return "die";
    if (/\bSHAFT\b|SPINDLE\s*SHAFT|DRIVE\s*SHAFT/.test(blob)) return "shaft";
    if (/BUSHING|BUSH\b/.test(blob)) return "bushing";
    if (/\bPLATE\b/.test(blob)) return "plate";

    // Geometry-based fallback: aspect ratio of bounds.
    const b = r.part_bounds_mm;
    if (b && b.width > 0 && b.height > 0) {
      const aspect = Math.max(b.width, b.height) / Math.min(b.width, b.height);
      if (aspect > 4) return "shaft";
    }
    return "general";
  }

  /**
   * Returns expected-but-absent features for the inferred part class.
   * Detection rules per class are deliberately conservative — they prefer
   * false-positive flags (operator confirms absent) over silent misses.
   */
  flagExpectedFeatures(r: BlueprintVisionResult): ExpectedFeatureFlag[] {
    const cls = r.part_class ?? this.inferPartClass(r);
    const flags: ExpectedFeatureFlag[] = [];
    const dimsByLocation = new Set(r.dimensions.map((d) => (d.location_hint || d.raw_text || "").toLowerCase()));
    const allText = [
      ...r.notes.map((n) => n.text),
      ...r.dimensions.map((d) => d.raw_text || ""),
      ...r.dimensions.map((d) => d.location_hint || ""),
    ].join(" ").toLowerCase();

    const has = (re: RegExp): boolean => re.test(allText);
    const hasSmallDiameter = (maxMm: number): boolean =>
      r.dimensions.some((d) => d.type === "diameter" && d.nominal > 0 && d.nominal <= maxMm);

    // Punch / die priors
    if (cls === "extrude_punch" || cls === "die") {
      const oilHoleFound = has(/oil\s*hole|coolant\s*hole|through.?hole|thru\s*hole/) || hasSmallDiameter(2.0);
      flags.push({
        kind: "central_oil_hole",
        reason: `${cls === "extrude_punch" ? "Extrude punches" : "Dies"} typically carry a small Ø.04–.08" central oil/lubrication hole.`,
        typical_size_mm: 1.27,
        found: oilHoleFound,
        confidence: oilHoleFound ? 0.0 : 0.85,
      });
      const reliefFound = has(/cross.?drill|relief\s*hole|vent\s*hole/) ||
        r.dimensions.filter((d) => d.type === "diameter" && d.nominal > 0 && d.nominal <= 2.5).length >= 2;
      flags.push({
        kind: "cross_drilled_relief_holes",
        reason: `${cls === "extrude_punch" ? "Extrude punches" : "Dies"} carrying lubrication frequently have Ø.05–.10" cross-drilled relief holes.`,
        typical_size_mm: 1.524,
        found: reliefFound,
        confidence: reliefFound ? 0.0 : 0.65,
      });
    }
    if (cls === "die") {
      const ejectorFound = has(/ejector|knockout|kick.?out/) || dimsByLocation.has("ejector");
      flags.push({
        kind: "ejector_pin_hole",
        reason: "Dies typically have ejector pin holes for part release.",
        found: ejectorFound,
        confidence: ejectorFound ? 0.0 : 0.55,
      });
      const ventFound = has(/vent|gas\s*relief|air\s*relief/);
      flags.push({
        kind: "vent_groove",
        reason: "Closed-cavity dies often need vent grooves to release trapped air during forming.",
        found: ventFound,
        confidence: ventFound ? 0.0 : 0.4,
      });
    }
    if (cls === "shaft") {
      const reliefFound = has(/relief|undercut|neck/);
      flags.push({
        kind: "datum_relief",
        reason: "Stepped shafts almost always carry a small relief/undercut at each shoulder transition for grinding/clamping clearance.",
        typical_size_mm: 0.5,
        found: reliefFound,
        confidence: reliefFound ? 0.0 : 0.55,
      });
      const chamferFound = has(/chamfer|×\s*\d|x\s*\d+\s*°|x\s*\d+\.\d+\s*x\s*\d+/);
      flags.push({
        kind: "bevel_face_chamfer",
        reason: "Shaft ends typically carry a small chamfer (.5×45° or 1×30°) for assembly.",
        typical_size_mm: 0.5,
        found: chamferFound,
        confidence: chamferFound ? 0.0 : 0.6,
      });
    }

    // Turbomachinery priors
    const isAirfoil = cls === "blisk" || cls === "impeller" || cls === "turbine_blade" || cls === "turbine_vane";
    if (isAirfoil) {
      const leFound = has(/leading\s*edge|le\s*radius|le\s*fillet/);
      flags.push({
        kind: "leading_edge_fillet",
        reason: `${cls} airfoils require a controlled leading-edge radius (typ. Ø.005-.015") for aero performance + stress.`,
        typical_size_mm: 0.25,
        found: leFound,
        confidence: leFound ? 0.0 : 0.85,
      });
      const teFound = has(/trailing\s*edge|te\s*radius|te\s*fillet/);
      flags.push({
        kind: "trailing_edge_fillet",
        reason: `${cls} airfoils require a controlled trailing-edge radius (typ. Ø.003-.010") for wake + tool deflection.`,
        typical_size_mm: 0.15,
        found: teFound,
        confidence: teFound ? 0.0 : 0.85,
      });
      const rootFound = has(/root\s*fillet|hub\s*fillet|fillet\s*at\s*root/);
      flags.push({
        kind: "blade_root_fillet",
        reason: "Airfoil-to-hub junctions require a generous fillet (R.020-.050) to relieve fatigue stress at the root.",
        typical_size_mm: 1.0,
        found: rootFound,
        confidence: rootFound ? 0.0 : 0.8,
      });
    }
    if (cls === "blisk" || cls === "impeller" || cls === "turbine_disk") {
      const balanceFound = has(/balance|imbalance|grams\s*ip/);
      flags.push({
        kind: "balance_hole",
        reason: "Rotating turbomachinery components carry rotor-balancing material removal callouts.",
        typical_size_mm: 3.0,
        found: balanceFound,
        confidence: balanceFound ? 0.0 : 0.6,
      });
    }
    if (cls === "turbine_blade" || cls === "turbine_vane") {
      const tipFound = has(/tip\s*clearance|tip\s*gap|shroud\s*clearance/);
      flags.push({
        kind: "tip_clearance",
        reason: "Turbine blades/vanes have a tip-clearance callout against shroud — affects performance and grinding allowance.",
        typical_size_mm: 0.5,
        found: tipFound,
        confidence: tipFound ? 0.0 : 0.55,
      });
    }

    // Medical priors
    if (cls === "medical_implant") {
      const polishFound = has(/ra\s*[≤<]?\s*0?\.[0-9]|polish|mirror\s*finish|electropolish/);
      flags.push({
        kind: "polish_callout",
        reason: "Medical implants require a polish callout (typ. Ra ≤ 0.4 μm) on biocontact surfaces.",
        found: polishFound,
        confidence: polishFound ? 0.0 : 0.85,
      });
      const biocompatFound = has(/iso\s*10993|biocompat|astm\s*f136|astm\s*f1537|cytotoxicity/);
      flags.push({
        kind: "biocompat_note",
        reason: "Medical implants require a biocompatibility specification reference (ISO 10993, ASTM F136 for Ti-6Al-4V ELI).",
        found: biocompatFound,
        confidence: biocompatFound ? 0.0 : 0.9,
      });
    }
    if (cls === "bone_screw") {
      const cannFound = has(/cannulat|through\s*hole.*screw|axial\s*hole/);
      flags.push({
        kind: "cannulation",
        reason: "Modern bone screws are commonly cannulated for guidewire-assisted insertion.",
        typical_size_mm: 1.5,
        found: cannFound,
        confidence: cannFound ? 0.0 : 0.55,
      });
      const threadChamFound = has(/lead\s*chamfer|thread\s*chamfer|thread\s*lead/);
      flags.push({
        kind: "thread_chamfer",
        reason: "Self-tapping bone screws require a lead chamfer at the entering threads.",
        typical_size_mm: 0.5,
        found: threadChamFound,
        confidence: threadChamFound ? 0.0 : 0.7,
      });
    }
    if (cls === "surgical_instrument") {
      const polishFound = has(/ra\s*[≤<]?\s*0?\.[0-9]|polish|electropolish|passivat/);
      flags.push({
        kind: "polish_callout",
        reason: "Surgical instruments require polish + passivation callouts to meet sterilization/corrosion specs.",
        found: polishFound,
        confidence: polishFound ? 0.0 : 0.8,
      });
    }

    // Automotive priors
    if (cls === "engine_block") {
      const deckFound = has(/flatness|deck\s*surface|gasket\s*surface/);
      flags.push({
        kind: "deck_flatness_callout",
        reason: "Engine block deck surfaces (head-mating face) need a flatness callout (typ. .002\" / .05mm).",
        typical_size_mm: 0.05,
        found: deckFound,
        confidence: deckFound ? 0.0 : 0.85,
      });
      const mainBoreFound = has(/main\s*bearing|crankshaft\s*bore|main\s*journal/);
      flags.push({
        kind: "main_bearing_bore",
        reason: "Engine blocks have line-bored main-bearing journals — requires concentricity + roundness callouts.",
        found: mainBoreFound,
        confidence: mainBoreFound ? 0.0 : 0.8,
      });
    }
    if (cls === "valve_body") {
      const seatFound = has(/seat\s*angle|valve\s*seat|45\s*°|30\s*°/);
      flags.push({
        kind: "valve_seat_angle",
        reason: "Valve seats need angle callouts (typ. 30°/45° dual-angle).",
        found: seatFound,
        confidence: seatFound ? 0.0 : 0.85,
      });
      const guideFound = has(/valve\s*guide|guide\s*bore|stem\s*bore/);
      flags.push({
        kind: "valve_guide_bore",
        reason: "Valve bodies have valve-guide bores with .015-.025\" tolerance to stem.",
        typical_size_mm: 7.0,
        found: guideFound,
        confidence: guideFound ? 0.0 : 0.85,
      });
    }

    // Aerospace priors
    if (cls === "lug" || cls === "bracket" || cls === "fitting") {
      const edgeDistFound = has(/edge\s*distance|e\/d\s*ratio|edge\s*to\s*hole/);
      flags.push({
        kind: "edge_distance_callout",
        reason: "Aerospace lugs/brackets/fittings require an edge-distance callout (typ. e/D ≥ 1.5–2.0).",
        found: edgeDistFound,
        confidence: edgeDistFound ? 0.0 : 0.7,
      });
    }
    if (cls === "lug" || cls === "bulkhead" || cls === "structural_frame") {
      const fatigueFound = has(/fatigue|sn\s*curve|surface\s*finish.*ra|ra\s*[<≤]?\s*[0-9]/);
      flags.push({
        kind: "fatigue_finish_callout",
        reason: "Fatigue-critical aerospace structural parts require a surface finish callout (Ra ≤ 1.6 μm typical).",
        found: fatigueFound,
        confidence: fatigueFound ? 0.0 : 0.65,
      });
      const peenFound = has(/shot\s*peen|laser\s*peen|peening/);
      flags.push({
        kind: "shot_peen_zone",
        reason: "Fatigue-critical surfaces are commonly shot-peened (Almen .010–.016A typical).",
        found: peenFound,
        confidence: peenFound ? 0.0 : 0.5,
      });
    }
    if (cls === "lug") {
      const bushFound = has(/bushing|press\s*fit|interference\s*fit/);
      flags.push({
        kind: "bushing_press_fit",
        reason: "Aerospace clevis/shear lugs commonly carry a pressed-in bushing for the eye bolt.",
        found: bushFound,
        confidence: bushFound ? 0.0 : 0.55,
      });
    }
    if (cls === "fitting" || cls === "lug") {
      const lockFound = has(/lockwire|safety\s*wire|cotter|castle\s*nut/);
      flags.push({
        kind: "lockwire_hole",
        reason: "Aerospace fittings/lugs commonly require lockwire holes drilled at 90° to bolt centerlines.",
        typical_size_mm: 1.0,
        found: lockFound,
        confidence: lockFound ? 0.0 : 0.45,
      });
    }

    // Filter out found features (consumer asked for expected-but-absent).
    return flags.filter((f) => !f.found);
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
        // Recover a surface-finish callout the VLM emitted as TEXT ("63 RMS", "N6") into
        // a canonical Ra (um) instead of dropping/leaking it (U-XRAY-SURFACE-FINISH-NORMALIZE).
        surface_finish_ra: resolveSurfaceFinishRa(d.surface_finish_ra),
        // Recover a thread callout ("1/4-20 UNC", "M6x1.0") the VLM emitted as TEXT into a canonical
        // thread spec (major dia / tpi / pitch / class) instead of raw text (U-XRAY-THREAD-NORMALIZE).
        thread: resolveThread(d.type, d.raw_text),
        chamfer: resolveChamfer(d.type, d.raw_text),
        location_hint: d.location_hint || undefined,
        raw_text: d.raw_text || String(d.nominal),
        confidence: d.confidence ?? 0.8,
      };
    });
  }

  private convertGDT(raw: RawGDT[]): ExtractedGDT[] {
    return raw.map((g, i) => {
      const frame: ExtractedGDT = {
        id: `GDT-${i + 1}`,
        // Normalize the VLM's symbol (abbreviation / variant spelling / unicode) to the canonical
        // GDTSymbol so the FCF validator recognizes it and the datum-deficiency flag fires (e.g.
        // "TP" -> "position"). Raw verbatim symbol is preserved in raw_text. Falls back to the raw
        // value when unrecognized (then validateExtractedGdt leaves it un-annotated -- never guessed).
        symbol: (normalizeGdtSymbol(g.symbol) || g.symbol || "position") as GDTSymbol,
        tolerance_value: g.tolerance_value ?? 0,
        tolerance_unit: g.tolerance_unit === "in" ? "in" as const : "mm" as const,
        material_condition: g.material_condition as "MMC" | "LMC" | "RFS" | undefined,
        datum_references: g.datum_references || [],
        applied_to: g.applied_to || undefined,
        // fall back to the verbatim symbol so the original token survives for audit even when the VLM
        // omitted raw_text (the .symbol field is now the normalized canonical name, not the raw emission).
        raw_text: g.raw_text || g.symbol || "",
        confidence: g.confidence ?? 0.8,
      };
      // Attach INFORMATIONAL ASME Y14.5 FCF syntax validation (datum-deficient frame flag,
      // etc.) -- reuses FCFSyntaxValidatorEngine via the gdtFcfValidate adapter. Pure, no GPU,
      // no value mutation; undefined verdict (unknown symbol) leaves the frame un-annotated.
      const verdict = validateExtractedGdt(frame);
      if (verdict) {
        frame.fcf_valid = verdict.fcf_valid;
        frame.fcf_issues = verdict.fcf_issues;
      }
      return frame;
    });
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
// RAW VISION RESPONSE TYPES (internal -- what the vision LLM returns)
// ============================================================================

interface RawVisionResponse {
  title_block?: Partial<TitleBlockData>;
  dimensions?: RawDimension[];
  gdt?: RawGDT[];
  notes?: RawNote[];
  profiles?: RawProfile[];
  part_bounds_mm?: { width: number; height: number; depth?: number };
  thickness_mm?: number | null;
  // Tolerant shape: the VLM often emits partial / text-only entries (raw_text "63 RMS"
  // with no numeric ra_um); mapSurfaceFinishes takes unknown + recovers them.
  surface_finishes?: Array<Partial<{ ra_um: number | string; location: string; raw_text: string }>>;
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
