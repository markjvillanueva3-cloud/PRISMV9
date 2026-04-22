/**
 * LathePrintIngestPipelineEngine — U-LTH33 (LATHE-MASTER P4)
 *
 * Orchestrates the blueprint-to-structured-data pipeline for lathe prints:
 * 1. BlueprintVisionOCR — extracts raw text/dims from PDF/image
 * 2. PDFBlueprintDimensionExtractor — parses dimension callouts
 * 3. GDTCalloutParser — identifies GD&T symbols/datums
 *
 * Produces BlueprintIntake JSON:
 * { dims, tols, gdt, material, surface_finish, notes, features }
 *
 * @milestone LATHE-MASTER U-LTH33
 * @version 1.0.0
 */

import { z } from "zod";

// ============================================================================
// SCHEMAS
// ============================================================================

/** Dimension extracted from print */
export const DimensionSchema = z.object({
  id: z.string(),
  type: z.enum([
    "diameter", "length", "radius", "chamfer", "thread_pitch",
    "groove_width", "groove_depth", "angle", "runout", "concentricity"
  ]),
  nominal_mm: z.number(),
  tolerance_plus_mm: z.number().optional(),
  tolerance_minus_mm: z.number().optional(),
  tolerance_class: z.string().optional(), // e.g., "H7", "g6"
  feature_ref: z.string().optional(), // which feature this dimension belongs to
  confidence: z.number().min(0).max(1),
});
export type Dimension = z.infer<typeof DimensionSchema>;

/** GD&T callout */
export const GDTCalloutSchema = z.object({
  id: z.string(),
  symbol: z.enum([
    "position", "concentricity", "runout", "total_runout",
    "perpendicularity", "parallelism", "angularity",
    "cylindricity", "circularity", "straightness",
    "surface_profile", "line_profile", "flatness"
  ]),
  tolerance_mm: z.number(),
  datum_refs: z.array(z.string()), // e.g., ["A", "B"]
  material_modifier: z.enum(["MMC", "LMC", "RFS"]).optional(),
  feature_ref: z.string().optional(),
  confidence: z.number().min(0).max(1),
});
export type GDTCallout = z.infer<typeof GDTCalloutSchema>;

/** Surface finish callout */
export const SurfaceFinishSchema = z.object({
  id: z.string(),
  ra_um: z.number(), // Ra in micrometers
  process: z.enum(["turned", "ground", "lapped", "polished", "honed", "as_machined"]).optional(),
  feature_ref: z.string().optional(),
  confidence: z.number().min(0).max(1),
});
export type SurfaceFinish = z.infer<typeof SurfaceFinishSchema>;

/** Material callout */
export const MaterialCalloutSchema = z.object({
  raw_text: z.string(),
  iso_group: z.enum(["P", "M", "K", "N", "S", "H"]).optional(),
  aisi: z.string().optional(),
  din: z.string().optional(),
  hardness_hrc: z.number().optional(),
  condition: z.string().optional(), // e.g., "annealed", "hardened"
  confidence: z.number().min(0).max(1),
});
export type MaterialCallout = z.infer<typeof MaterialCalloutSchema>;

/** Recognized turning feature */
export const TurningFeatureSchema = z.object({
  id: z.string(),
  type: z.enum([
    "od_turn", "id_bore", "face", "groove_od", "groove_id", "groove_face",
    "thread_external", "thread_internal", "chamfer_od", "chamfer_id",
    "radius_od", "radius_id", "taper_od", "taper_id", "knurl",
    "undercut", "center_drill", "drill", "tap", "ream"
  ]),
  start_z_mm: z.number().optional(),
  end_z_mm: z.number().optional(),
  diameter_mm: z.number().optional(),
  depth_mm: z.number().optional(),
  related_dims: z.array(z.string()), // dimension IDs
  related_gdt: z.array(z.string()), // GDT callout IDs
  confidence: z.number().min(0).max(1),
});
export type TurningFeature = z.infer<typeof TurningFeatureSchema>;

/** Note/instruction from print */
export const PrintNoteSchema = z.object({
  id: z.string(),
  category: z.enum([
    "general", "material", "heat_treat", "plating", "inspection",
    "machining", "marking", "packaging", "drawing_std"
  ]),
  text: z.string(),
  criticality: z.enum(["info", "important", "critical"]),
});
export type PrintNote = z.infer<typeof PrintNoteSchema>;

/** Full blueprint intake result */
export const BlueprintIntakeSchema = z.object({
  source: z.object({
    filename: z.string().optional(),
    page_count: z.number().optional(),
    format: z.enum(["pdf", "image", "dxf", "text"]),
  }),
  part_number: z.string().optional(),
  revision: z.string().optional(),
  drawing_std: z.string().optional(), // e.g., "ASME Y14.5-2018"

  dimensions: z.array(DimensionSchema),
  gdt_callouts: z.array(GDTCalloutSchema),
  surface_finishes: z.array(SurfaceFinishSchema),
  material: MaterialCalloutSchema.optional(),
  features: z.array(TurningFeatureSchema),
  notes: z.array(PrintNoteSchema),

  // Metadata
  extraction_confidence: z.number().min(0).max(1),
  warnings: z.array(z.string()),
  extraction_timestamp: z.string(),
});
export type BlueprintIntake = z.infer<typeof BlueprintIntakeSchema>;

// ============================================================================
// OCR TEXT PATTERNS
// ============================================================================

const DIMENSION_PATTERNS = {
  // Diameter: Ø50.00 +0.02/-0.01 or ⌀50 H7
  diameter: /[ØÆ⌀]\s*(\d+\.?\d*)\s*(?:([+-]?\d+\.?\d*)\s*\/\s*([+-]?\d+\.?\d*))?(?:\s*([A-Z]\d+))?/gi,
  // Length/linear: 100.00 ±0.05 or 100 h6
  linear: /(\d+\.?\d*)\s*(?:±\s*(\d+\.?\d*)|([+-]\d+\.?\d*)\s*\/\s*([+-]\d+\.?\d*))?(?:\s*([a-z]\d+))?/gi,
  // Thread: M12x1.5 or 1/4-20 UNC
  thread_metric: /M\s*(\d+\.?\d*)(?:\s*[xX×]\s*(\d+\.?\d*))?(?:\s*-\s*(\d+[A-Za-z]+))?/gi,
  thread_inch: /(\d+\/?\d*)\s*-\s*(\d+)\s*(UNC|UNF|UNEF|UN)/gi,
  // Chamfer: 0.5 x 45° or C0.5
  chamfer: /(?:C\s*(\d+\.?\d*)|(\d+\.?\d*)\s*[xX×]\s*(\d+\.?\d*)\s*°)/gi,
  // Radius: R5 or R2.5
  radius: /R\s*(\d+\.?\d*)/gi,
  // Angle: 30° or 30 deg
  angle: /(\d+\.?\d*)\s*(?:°|deg)/gi,
};

const GDT_PATTERNS = {
  // Position: ⌖ ⌀0.05 A|B|C or POS ⌀0.05 A B C
  position: /(?:⌖|POS(?:ITION)?)\s*[ØÆ⌀]?\s*(\d+\.?\d*)\s*([A-Z](?:\|[A-Z])*|\s*[A-Z](?:\s*[A-Z])*)?(?:\s*([MLR]))?/gi,
  // Concentricity: ◎ 0.02 A or CONC 0.02 A
  concentricity: /(?:◎|CONC(?:ENTRICITY)?)\s*[ØÆ⌀]?\s*(\d+\.?\d*)\s*([A-Z](?:\|[A-Z])*)?/gi,
  // Runout: ↗ 0.03 A or TIR 0.03 A
  runout: /(?:↗|TIR|RUNOUT)\s*[ØÆ⌀]?\s*(\d+\.?\d*)\s*([A-Z](?:\|[A-Z])*)?/gi,
  // Total runout: ⌰ 0.05 A|B
  total_runout: /(?:⌰|TOTAL\s*RUNOUT)\s*[ØÆ⌀]?\s*(\d+\.?\d*)\s*([A-Z](?:\|[A-Z])*)?/gi,
  // Perpendicularity: ⊥ 0.02 A
  perpendicularity: /(?:⊥|PERP(?:ENDICULARITY)?)\s*[ØÆ⌀]?\s*(\d+\.?\d*)\s*([A-Z](?:\|[A-Z])*)?/gi,
  // Parallelism: ∥ 0.03 A
  parallelism: /(?:∥|PAR(?:ALLELISM)?)\s*[ØÆ⌀]?\s*(\d+\.?\d*)\s*([A-Z](?:\|[A-Z])*)?/gi,
  // Cylindricity: ⌭ 0.02
  cylindricity: /(?:⌭|CYL(?:INDRICITY)?)\s*[ØÆ⌀]?\s*(\d+\.?\d*)/gi,
  // Circularity: ○ 0.01
  circularity: /(?:○|CIRC(?:ULARITY)?)\s*[ØÆ⌀]?\s*(\d+\.?\d*)/gi,
  // Straightness: ⏤ 0.02
  straightness: /(?:⏤|STR(?:AIGHTNESS)?)\s*[ØÆ⌀]?\s*(\d+\.?\d*)/gi,
};

const SURFACE_FINISH_PATTERNS = {
  // Ra 1.6 or 1.6 Ra or Ra=1.6
  ra: /Ra\s*[=:]?\s*(\d+\.?\d*)|(\d+\.?\d*)\s*Ra/gi,
  // Rz 6.3 or RMS 63
  rz: /(?:Rz|RMS)\s*[=:]?\s*(\d+\.?\d*)/gi,
  // Symbol with value: √ 1.6 or ∇ 32
  symbol: /[√∇▽]\s*(\d+\.?\d*)/gi,
};

const MATERIAL_PATTERNS = {
  // AISI/SAE: 4140, 1018, 303, 316L - require AISI/SAE prefix OR word boundary
  aisi_sae: /(?:AISI|SAE|MATERIAL[:\s]+)\s*(1\d{3}|4\d{3}|5\d{3}|6\d{3}|303|304|316L?|17-4\s*PH)\b/gi,
  // DIN: 42CrMo4, 1.4301
  din: /(?:DIN)?\s*(\d{1,2}[A-Za-z]+\d+|1\.\d{4})/gi,
  // Aluminum: 6061-T6, 7075-T651
  aluminum: /(6061|7075|2024|5052)\s*-?\s*T\d+/gi,
  // Brass/Bronze
  brass_bronze: /(C360|C544|C932|C954|PB\d+)/gi,
  // Titanium: Ti-6Al-4V
  titanium: /Ti-?(\d+[A-Za-z]+-?\d+[A-Za-z]*)/gi,
  // Inconel/Hastelloy
  superalloy: /(Inconel\s*\d+|Hastelloy\s*[A-Z])/gi,
  // Hardness: 58-62 HRC or HRC 60
  hardness: /(?:HRC|Rc)\s*(\d+)\s*(?:-\s*(\d+))?|(\d+)\s*(?:-\s*(\d+))?\s*HRC/gi,
};

const NOTE_PATTERNS = {
  // Heat treat: HEAT TREAT TO 58-62 HRC
  heat_treat: /(?:HEAT\s*TREAT|H\/T|HT)\s*(?:TO)?\s*(\d+)\s*-?\s*(\d+)?\s*(HRC|HB)?/gi,
  // Plating: ZINC PLATE PER QQ-Z-325
  plating: /(?:PLATE|COATING|FINISH)\s*[:\s]*([A-Z]+(?:\s*[A-Z]+)*)\s*(?:PER|TO)?\s*([A-Z]{2,}-?[A-Z]?-?\d+)?/gi,
  // Break edges: BREAK ALL SHARP EDGES
  break_edges: /BREAK\s*(?:ALL)?\s*(?:SHARP)?\s*EDGES?\s*(?:(\d+\.?\d*)\s*(?:MAX|R)?)?/gi,
  // Deburr: DEBURR ALL
  deburr: /DEBURR\s*(?:ALL)?/gi,
  // Inspection: 100% INSPECTION REQUIRED
  inspection: /(\d+%?)\s*INSPECTION\s*(?:REQUIRED)?/gi,
  // General tolerance: UNLESS OTHERWISE SPECIFIED
  general_tol: /(?:UNLESS\s*(?:OTHERWISE\s*)?SPECIFIED|UOS)/gi,
};

// ============================================================================
// ENGINE CLASS
// ============================================================================

class LathePrintIngestPipelineEngine {
  private idCounter = 0;

  private nextId(prefix: string): string {
    return `${prefix}-${++this.idCounter}`;
  }

  /**
   * Main entry: ingest raw text/OCR output and produce structured intake
   */
  ingest(input: {
    raw_text: string;
    filename?: string;
    format?: "pdf" | "image" | "dxf" | "text";
    page_count?: number;
  }): BlueprintIntake {
    this.idCounter = 0;
    const { raw_text, filename, format = "text", page_count } = input;
    const warnings: string[] = [];

    // Step 1: Extract dimensions
    const dimensions = this.extractDimensions(raw_text);
    if (dimensions.length === 0) {
      warnings.push("No dimensions found in print");
    }

    // Step 2: Extract GD&T callouts
    const gdt_callouts = this.extractGDTCallouts(raw_text);

    // Step 3: Extract surface finishes
    const surface_finishes = this.extractSurfaceFinishes(raw_text);

    // Step 4: Extract material
    const material = this.extractMaterial(raw_text);
    if (!material) {
      warnings.push("Material not identified");
    }

    // Step 5: Extract notes
    const notes = this.extractNotes(raw_text);

    // Step 6: Infer turning features from dimensions
    const features = this.inferTurningFeatures(dimensions, gdt_callouts);

    // Step 7: Extract part info
    const partInfo = this.extractPartInfo(raw_text);

    // Calculate overall confidence
    const all_confidences = [
      ...dimensions.map((d) => d.confidence),
      ...gdt_callouts.map((g) => g.confidence),
      ...surface_finishes.map((s) => s.confidence),
      ...(material ? [material.confidence] : []),
    ];
    const extraction_confidence =
      all_confidences.length > 0
        ? all_confidences.reduce((a, b) => a + b, 0) / all_confidences.length
        : 0;

    if (extraction_confidence < 0.7) {
      warnings.push(`Low extraction confidence: ${(extraction_confidence * 100).toFixed(1)}%`);
    }

    return {
      source: {
        filename,
        page_count,
        format,
      },
      part_number: partInfo.partNumber,
      revision: partInfo.revision,
      drawing_std: partInfo.drawingStd,
      dimensions,
      gdt_callouts,
      surface_finishes,
      material,
      features,
      notes,
      extraction_confidence,
      warnings,
      extraction_timestamp: new Date().toISOString(),
    };
  }

  /**
   * Extract dimensions from raw text
   */
  extractDimensions(text: string): Dimension[] {
    const dims: Dimension[] = [];

    // Diameter
    let match: RegExpExecArray | null;
    const diaRegex = new RegExp(DIMENSION_PATTERNS.diameter.source, "gi");
    while ((match = diaRegex.exec(text)) !== null) {
      const nominal = parseFloat(match[1]);
      if (isNaN(nominal) || nominal <= 0) continue;
      dims.push({
        id: this.nextId("DIM"),
        type: "diameter",
        nominal_mm: nominal,
        tolerance_plus_mm: match[2] ? parseFloat(match[2]) : undefined,
        tolerance_minus_mm: match[3] ? parseFloat(match[3]) : undefined,
        tolerance_class: match[4] || undefined,
        confidence: match[4] ? 0.95 : match[2] ? 0.9 : 0.75,
      });
    }

    // Thread (metric)
    const threadMetricRegex = new RegExp(DIMENSION_PATTERNS.thread_metric.source, "gi");
    while ((match = threadMetricRegex.exec(text)) !== null) {
      const nominal = parseFloat(match[1]);
      if (isNaN(nominal) || nominal <= 0) continue;
      const pitch = match[2] ? parseFloat(match[2]) : undefined;
      dims.push({
        id: this.nextId("DIM"),
        type: "diameter",
        nominal_mm: nominal,
        tolerance_class: match[3] || undefined,
        confidence: 0.9,
      });
      if (pitch) {
        dims.push({
          id: this.nextId("DIM"),
          type: "thread_pitch",
          nominal_mm: pitch,
          confidence: 0.9,
        });
      }
    }

    // Radius
    const radiusRegex = new RegExp(DIMENSION_PATTERNS.radius.source, "gi");
    while ((match = radiusRegex.exec(text)) !== null) {
      const nominal = parseFloat(match[1]);
      if (isNaN(nominal) || nominal <= 0) continue;
      dims.push({
        id: this.nextId("DIM"),
        type: "radius",
        nominal_mm: nominal,
        confidence: 0.85,
      });
    }

    // Chamfer
    const chamferRegex = new RegExp(DIMENSION_PATTERNS.chamfer.source, "gi");
    while ((match = chamferRegex.exec(text)) !== null) {
      const size = match[1] ? parseFloat(match[1]) : match[2] ? parseFloat(match[2]) : NaN;
      if (isNaN(size) || size <= 0) continue;
      dims.push({
        id: this.nextId("DIM"),
        type: "chamfer",
        nominal_mm: size,
        confidence: 0.85,
      });
    }

    // Angle
    const angleRegex = new RegExp(DIMENSION_PATTERNS.angle.source, "gi");
    while ((match = angleRegex.exec(text)) !== null) {
      const nominal = parseFloat(match[1]);
      if (isNaN(nominal) || nominal < 0 || nominal > 360) continue;
      dims.push({
        id: this.nextId("DIM"),
        type: "angle",
        nominal_mm: nominal, // degrees stored as nominal
        confidence: 0.85,
      });
    }

    return dims;
  }

  /**
   * Extract GD&T callouts from raw text
   */
  extractGDTCallouts(text: string): GDTCallout[] {
    const callouts: GDTCallout[] = [];

    const gdtTypes: Array<{ key: keyof typeof GDT_PATTERNS; symbol: GDTCallout["symbol"] }> = [
      { key: "position", symbol: "position" },
      { key: "concentricity", symbol: "concentricity" },
      { key: "runout", symbol: "runout" },
      { key: "total_runout", symbol: "total_runout" },
      { key: "perpendicularity", symbol: "perpendicularity" },
      { key: "parallelism", symbol: "parallelism" },
      { key: "cylindricity", symbol: "cylindricity" },
      { key: "circularity", symbol: "circularity" },
      { key: "straightness", symbol: "straightness" },
    ];

    for (const { key, symbol } of gdtTypes) {
      const pattern = new RegExp(GDT_PATTERNS[key].source, "gi");
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(text)) !== null) {
        const tol = parseFloat(match[1]);
        if (isNaN(tol) || tol <= 0) continue;
        const datums = match[2]
          ? match[2]
              .replace(/\|/g, " ")
              .split(/\s+/)
              .filter((d) => /^[A-Z]$/.test(d))
          : [];
        const modifier = match[3] as "MMC" | "LMC" | "RFS" | undefined;

        callouts.push({
          id: this.nextId("GDT"),
          symbol,
          tolerance_mm: tol,
          datum_refs: datums,
          material_modifier: modifier,
          confidence: datums.length > 0 ? 0.9 : 0.75,
        });
      }
    }

    return callouts;
  }

  /**
   * Extract surface finish callouts
   */
  extractSurfaceFinishes(text: string): SurfaceFinish[] {
    const finishes: SurfaceFinish[] = [];

    // Ra values
    const raRegex = new RegExp(SURFACE_FINISH_PATTERNS.ra.source, "gi");
    let match: RegExpExecArray | null;
    while ((match = raRegex.exec(text)) !== null) {
      const ra = parseFloat(match[1] || match[2]);
      if (isNaN(ra) || ra <= 0) continue;
      finishes.push({
        id: this.nextId("SF"),
        ra_um: ra,
        confidence: 0.9,
      });
    }

    // Symbol-based (√, ∇)
    const symbolRegex = new RegExp(SURFACE_FINISH_PATTERNS.symbol.source, "gi");
    while ((match = symbolRegex.exec(text)) !== null) {
      const val = parseFloat(match[1]);
      if (isNaN(val) || val <= 0) continue;
      // Assume microinch if > 10, convert to Ra µm
      const ra_um = val > 10 ? val * 0.025 : val;
      finishes.push({
        id: this.nextId("SF"),
        ra_um,
        confidence: 0.8,
      });
    }

    return finishes;
  }

  /**
   * Extract material callout
   */
  extractMaterial(text: string): MaterialCallout | undefined {
    let raw_text = "";
    let aisi: string | undefined;
    let din: string | undefined;
    let hardness_hrc: number | undefined;
    let confidence = 0.5;

    // AISI/SAE
    const aisiMatch = new RegExp(MATERIAL_PATTERNS.aisi_sae.source, "gi").exec(text);
    if (aisiMatch) {
      aisi = aisiMatch[1];
      raw_text = aisiMatch[0];
      confidence = 0.85;
    }

    // DIN
    const dinMatch = new RegExp(MATERIAL_PATTERNS.din.source, "gi").exec(text);
    if (dinMatch) {
      din = dinMatch[1];
      raw_text = raw_text || dinMatch[0];
      confidence = Math.max(confidence, 0.85);
    }

    // Aluminum
    const alMatch = new RegExp(MATERIAL_PATTERNS.aluminum.source, "gi").exec(text);
    if (alMatch) {
      aisi = alMatch[1]; // Just the alloy number (6061, 7075, etc.)
      raw_text = raw_text || alMatch[0];
      confidence = 0.9;
    }

    // Superalloy (Inconel, Hastelloy, Titanium)
    const superMatch = new RegExp(MATERIAL_PATTERNS.superalloy.source, "gi").exec(text);
    if (superMatch) {
      aisi = superMatch[0];
      raw_text = raw_text || superMatch[0];
      confidence = 0.9;
    }
    const tiMatch = new RegExp(MATERIAL_PATTERNS.titanium.source, "gi").exec(text);
    if (tiMatch) {
      aisi = "Ti-" + tiMatch[1];
      raw_text = raw_text || tiMatch[0];
      confidence = 0.9;
    }

    // Hardness
    const hardnessMatch = new RegExp(MATERIAL_PATTERNS.hardness.source, "gi").exec(text);
    if (hardnessMatch) {
      hardness_hrc = parseInt(hardnessMatch[1] || hardnessMatch[3], 10);
      raw_text = raw_text || hardnessMatch[0];
    }

    if (!raw_text) return undefined;

    // Infer ISO group
    const iso_group = this.inferISOGroup(aisi || din || raw_text);

    return {
      raw_text,
      iso_group,
      aisi,
      din,
      hardness_hrc,
      confidence,
    };
  }

  private inferISOGroup(material: string): "P" | "M" | "K" | "N" | "S" | "H" | undefined {
    const m = material.toUpperCase();
    // Check superalloy FIRST (before non-ferrous which would match Ti)
    if (/INCONEL|HASTELLOY|WASPALOY|TI-|TITANIUM/.test(m)) return "S"; // Superalloy
    if (/HRC\s*[56]\d|HARDENED/.test(m)) return "H"; // Hardened
    if (/4140|4340|1018|1045|1020|4130/.test(m)) return "P"; // Carbon/alloy steel
    if (/304|316|303|17-4|A286/.test(m)) return "M"; // Stainless
    if (/CAST|GRAY|DUCTILE|GG|GGG/.test(m)) return "K"; // Cast iron
    if (/6061|7075|2024|5052|AL|ALUMINUM/.test(m)) return "N"; // Non-ferrous
    return undefined;
  }

  /**
   * Extract notes from print
   */
  extractNotes(text: string): PrintNote[] {
    const notes: PrintNote[] = [];

    // Heat treat
    const htMatch = new RegExp(NOTE_PATTERNS.heat_treat.source, "gi").exec(text);
    if (htMatch) {
      notes.push({
        id: this.nextId("NOTE"),
        category: "heat_treat",
        text: htMatch[0],
        criticality: "important",
      });
    }

    // Plating
    const plateMatch = new RegExp(NOTE_PATTERNS.plating.source, "gi").exec(text);
    if (plateMatch) {
      notes.push({
        id: this.nextId("NOTE"),
        category: "plating",
        text: plateMatch[0],
        criticality: "important",
      });
    }

    // Break edges
    const breakMatch = new RegExp(NOTE_PATTERNS.break_edges.source, "gi").exec(text);
    if (breakMatch) {
      notes.push({
        id: this.nextId("NOTE"),
        category: "machining",
        text: breakMatch[0],
        criticality: "info",
      });
    }

    // Deburr
    const deburrMatch = new RegExp(NOTE_PATTERNS.deburr.source, "gi").exec(text);
    if (deburrMatch) {
      notes.push({
        id: this.nextId("NOTE"),
        category: "machining",
        text: deburrMatch[0],
        criticality: "info",
      });
    }

    // Inspection
    const inspMatch = new RegExp(NOTE_PATTERNS.inspection.source, "gi").exec(text);
    if (inspMatch) {
      const pct = parseInt(inspMatch[1], 10);
      notes.push({
        id: this.nextId("NOTE"),
        category: "inspection",
        text: inspMatch[0],
        criticality: pct >= 100 ? "critical" : "important",
      });
    }

    return notes;
  }

  /**
   * Infer turning features from extracted dimensions
   */
  inferTurningFeatures(dimensions: Dimension[], gdt_callouts: GDTCallout[]): TurningFeature[] {
    const features: TurningFeature[] = [];

    // Group diameter dimensions → OD or ID features
    const diameters = dimensions.filter((d) => d.type === "diameter");
    for (const dim of diameters) {
      const related_gdt = gdt_callouts
        .filter((g) => g.feature_ref === dim.id || g.symbol === "concentricity" || g.symbol === "runout")
        .map((g) => g.id);

      // Simple heuristic: smaller diameters might be ID, larger might be OD
      // Real implementation would use geometry analysis
      const featureType = dim.nominal_mm < 10 ? "id_bore" : "od_turn";

      features.push({
        id: this.nextId("FEAT"),
        type: featureType,
        diameter_mm: dim.nominal_mm,
        related_dims: [dim.id],
        related_gdt,
        confidence: dim.confidence * 0.9,
      });
    }

    // Thread features
    const threadPitches = dimensions.filter((d) => d.type === "thread_pitch");
    for (const dim of threadPitches) {
      features.push({
        id: this.nextId("FEAT"),
        type: "thread_external",
        depth_mm: dim.nominal_mm, // pitch stored as depth (approximation)
        related_dims: [dim.id],
        related_gdt: [],
        confidence: 0.85,
      });
    }

    // Chamfer features
    const chamfers = dimensions.filter((d) => d.type === "chamfer");
    for (const dim of chamfers) {
      features.push({
        id: this.nextId("FEAT"),
        type: "chamfer_od",
        depth_mm: dim.nominal_mm,
        related_dims: [dim.id],
        related_gdt: [],
        confidence: 0.8,
      });
    }

    // Radius features
    const radii = dimensions.filter((d) => d.type === "radius");
    for (const dim of radii) {
      features.push({
        id: this.nextId("FEAT"),
        type: "radius_od",
        depth_mm: dim.nominal_mm,
        related_dims: [dim.id],
        related_gdt: [],
        confidence: 0.8,
      });
    }

    return features;
  }

  /**
   * Extract part info (part number, revision, drawing standard)
   */
  extractPartInfo(text: string): { partNumber?: string; revision?: string; drawingStd?: string } {
    let partNumber: string | undefined;
    let revision: string | undefined;
    let drawingStd: string | undefined;

    // Part number: P/N 12345 or PART NO. ABC-123
    const pnMatch = /(?:P\/N|PART\s*(?:NO\.?|NUMBER))\s*[:.]?\s*([A-Z0-9\-]+)/i.exec(text);
    if (pnMatch) partNumber = pnMatch[1];

    // Revision: REV A or REVISION 3
    const revMatch = /REV(?:ISION)?\s*[:.]?\s*([A-Z0-9]+)/i.exec(text);
    if (revMatch) revision = revMatch[1];

    // Drawing standard: ASME Y14.5-2018 or ISO 1101
    const stdMatch = /(ASME\s*Y14\.5[-\s]*\d{4}|ISO\s*\d{4,5})/i.exec(text);
    if (stdMatch) drawingStd = stdMatch[1];

    return { partNumber, revision, drawingStd };
  }

  /**
   * Batch ingest multiple prints
   */
  batchIngest(
    inputs: Array<{ raw_text: string; filename?: string }>
  ): Array<BlueprintIntake & { index: number }> {
    return inputs.map((input, index) => ({
      index,
      ...this.ingest({ ...input, format: "text" }),
    }));
  }

  /**
   * Validate extraction against ground truth (for testing)
   */
  validateExtraction(
    intake: BlueprintIntake,
    groundTruth: {
      dim_count?: number;
      gdt_count?: number;
      material?: string;
      part_number?: string;
    }
  ): { accuracy: number; details: Record<string, { expected: unknown; actual: unknown; match: boolean }> } {
    const details: Record<string, { expected: unknown; actual: unknown; match: boolean }> = {};
    let matches = 0;
    let total = 0;

    if (groundTruth.dim_count !== undefined) {
      const match = intake.dimensions.length === groundTruth.dim_count;
      details.dim_count = { expected: groundTruth.dim_count, actual: intake.dimensions.length, match };
      if (match) matches++;
      total++;
    }

    if (groundTruth.gdt_count !== undefined) {
      const match = intake.gdt_callouts.length === groundTruth.gdt_count;
      details.gdt_count = { expected: groundTruth.gdt_count, actual: intake.gdt_callouts.length, match };
      if (match) matches++;
      total++;
    }

    if (groundTruth.material !== undefined) {
      const match = intake.material?.aisi === groundTruth.material || intake.material?.din === groundTruth.material;
      details.material = { expected: groundTruth.material, actual: intake.material?.aisi || intake.material?.din, match };
      if (match) matches++;
      total++;
    }

    if (groundTruth.part_number !== undefined) {
      const match = intake.part_number === groundTruth.part_number;
      details.part_number = { expected: groundTruth.part_number, actual: intake.part_number, match };
      if (match) matches++;
      total++;
    }

    return {
      accuracy: total > 0 ? matches / total : 1,
      details,
    };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const lathePrintIngestPipelineEngine = new LathePrintIngestPipelineEngine();
export default LathePrintIngestPipelineEngine;
