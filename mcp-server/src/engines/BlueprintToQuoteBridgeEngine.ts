/**
 * BlueprintToQuoteBridgeEngine — Connects BlueprintOCR extraction → QuoteEstimator input.
 *
 * Bridges the gap between "upload a drawing" and "get an instant quote" by translating
 * extracted blueprint data (dimensions, GD&T, title block, notes) into a fully populated
 * QuoteEstimateInput. This is the key pathway for competing with Xometry's upload→quote flow.
 *
 * Pipeline: Drawing → BlueprintOCR.analyzeBlueprint() → THIS ENGINE → QuoteEstimator.estimate()
 *
 * @module BlueprintToQuoteBridgeEngine
 */

import type { QuoteEstimateInput, FeatureSpec, SecondaryOp, NREItem } from "./QuoteEstimatorEngine.js";
import type { BlueprintAnalysis as OCRBlueprintAnalysis } from "./BlueprintOCREngine.js";

// Re-export QuoteEstimateInput so the blueprint->quote dispatcher call sites can name the
// quote-input type from the bridge (its natural type surface) -- fixes the TS2694 at
// shopDispatcher emp_blueprint_to_quote, which imported it from here but it was only an
// internal `import type`, never re-exported.
export type { QuoteEstimateInput } from "./QuoteEstimatorEngine.js";

// ─── Types ───────────────────────────────────────────────────

/** Output from BlueprintOCREngine.analyzeBlueprint() */
export interface BlueprintAnalysis {
  dimensions?: Array<{
    type: string;         // "linear" | "diameter" | "radius" | "angular" | "thread" | "chamfer"
    value: number;
    unit: string;
    tolerance?: { upper: number; lower: number };
    text: string;
  }>;
  gdt?: Array<{
    symbol: string;       // "position" | "flatness" | "perpendicularity" | "concentricity" | "runout" etc.
    tolerance_value: number;
    datum_refs?: string[];
    feature_type?: string;
  }>;
  title_block?: {
    part_number?: string;
    part_name?: string;
    revision?: string;
    material?: string;
    finish?: string;
    scale?: string;
    drawn_by?: string;
    date?: string;
    units?: string;
    third_angle?: boolean;
  };
  notes?: Array<{
    category: string;     // "process" | "material" | "finish" | "safety" | "inspection"
    text: string;
  }>;
  bounding_box?: { length: number; width: number; height: number; unit: string };
}

export interface BridgeResult {
  quote_input: QuoteEstimateInput;
  extraction_confidence: number;
  extraction_notes: string[];
  unmapped_notes: string[];
}

// ─── Material Mapping ────────────────────────────────────────

const MATERIAL_MAP: Record<string, string> = {
  "6061": "aluminum_6061", "al 6061": "aluminum_6061", "6061-t6": "aluminum_6061",
  "7075": "aluminum_7075", "al 7075": "aluminum_7075", "7075-t6": "aluminum_7075",
  "2024": "aluminum_2024", "al 2024": "aluminum_2024",
  "1018": "steel_1018", "aisi 1018": "steel_1018", "c1018": "steel_1018",
  "4140": "steel_4140", "aisi 4140": "steel_4140",
  "4340": "steel_4340", "aisi 4340": "steel_4340",
  "304": "stainless_304", "ss 304": "stainless_304", "304 ss": "stainless_304",
  "316": "stainless_316", "ss 316": "stainless_316", "316 ss": "stainless_316",
  "17-4": "stainless_17-4", "17-4 ph": "stainless_17-4",
  "ti gr2": "titanium_gr2", "ti grade 2": "titanium_gr2", "cp titanium": "titanium_gr2",
  "ti gr5": "titanium_gr5", "ti-6al-4v": "titanium_gr5", "ti 6-4": "titanium_gr5",
  "inconel 718": "inconel_718", "in718": "inconel_718",
  "brass 360": "brass_360", "c360": "brass_360", "free-cutting brass": "brass_360",
  "delrin": "plastic_delrin", "acetal": "plastic_delrin", "pom": "plastic_delrin",
  "peek": "plastic_peek",
  "nylon": "plastic_nylon", "nylon 6": "plastic_nylon", "pa6": "plastic_nylon",
};

// ─── Secondary Ops Mapping ───────────────────────────────────

const FINISH_MAP: Record<string, string> = {
  "anodize": "anodize_type_ii", "hard anodize": "anodize_type_iii",
  "type ii anodize": "anodize_type_ii", "type iii anodize": "anodize_type_iii",
  "black oxide": "black_oxide", "passivate": "passivate", "passivation": "passivate",
  "zinc plate": "zinc_plate", "nickel plate": "nickel_plate", "chrome plate": "chrome_plate",
  "hard chrome": "chrome_plate", "electroless nickel": "nickel_plate",
  "powder coat": "powder_coat", "powder coating": "powder_coat",
  "stress relieve": "heat_treat_stress_relief", "stress relief": "heat_treat_stress_relief",
  "heat treat": "heat_treat_harden", "harden": "heat_treat_harden",
  "case harden": "heat_treat_case_harden", "carburize": "carburizing",
  "nitride": "nitriding", "nitriding": "nitriding",
  "bead blast": "bead_blast", "tumble": "deburr_tumble",
  "laser engrave": "laser_engrave", "laser mark": "laser_engrave",
  "ndt": "ndt_dye_penetrant", "dye penetrant": "ndt_dye_penetrant",
  "fpi": "ndt_dye_penetrant", "mag particle": "ndt_mag_particle",
  "x-ray": "ndt_xray", "radiographic": "ndt_xray",
};

// ─── Engine ──────────────────────────────────────────────────

class BlueprintToQuoteBridgeEngine {
  /**
   * Convert BlueprintOCR analysis output into a QuoteEstimateInput.
   */
  bridge(analysis: BlueprintAnalysis, overrides?: Partial<QuoteEstimateInput>): BridgeResult {
    const notes: string[] = [];
    const unmapped: string[] = [];
    let confidence = 30; // base

    // ── 1. Part Info from Title Block ──
    const tb = analysis.title_block;
    const partName = tb?.part_name ?? overrides?.part_name;
    const partNumber = tb?.part_number ?? overrides?.part_number;
    if (partName) confidence += 5;

    // ── 2. Material Resolution ──
    let material = overrides?.material ?? "steel_1018";
    if (tb?.material) {
      const resolved = this.resolveMaterial(tb.material);
      if (resolved) {
        material = resolved;
        confidence += 10;
        notes.push(`Material resolved: "${tb.material}" → ${material}`);
      } else {
        notes.push(`Material "${tb.material}" not auto-resolved, using fallback`);
        unmapped.push(`Material: ${tb.material}`);
      }
    } else {
      notes.push("No material in title block, using override or default");
    }

    // ── 3. Bounding Box → Stock Dimensions ──
    let stockDims: QuoteEstimateInput["stock_dimensions_mm"] | undefined;
    if (analysis.bounding_box) {
      const bb = analysis.bounding_box;
      const factor = bb.unit === "in" || bb.unit === "inch" ? 25.4 : 1;
      stockDims = {
        length: bb.length * factor,
        width: bb.width * factor,
        height: bb.height * factor,
      };
      confidence += 10;
      notes.push(`Stock from bounding box: ${stockDims.length.toFixed(1)}×${stockDims.width.toFixed(1)}×${stockDims.height.toFixed(1)}mm`);
    }

    // ── 4. Dimensions → Feature Detection ──
    const features: FeatureSpec[] = [];
    const dims = analysis.dimensions ?? [];
    const isInch = tb?.units === "in" || tb?.units === "inch";

    // Count holes (diameter dimensions)
    const holeDims = dims.filter(d => d.type === "diameter");
    if (holeDims.length > 0) {
      features.push({
        type: "hole",
        count: holeDims.length,
        tolerance_mm: this.tightestTolerance(holeDims, isInch),
      });
      confidence += 5;
    }

    // Count threads
    const threadDims = dims.filter(d => d.type === "thread");
    if (threadDims.length > 0) {
      features.push({ type: "thread", count: threadDims.length });
      confidence += 3;
    }

    // Count chamfers
    const chamferDims = dims.filter(d => d.type === "chamfer");
    if (chamferDims.length > 0) {
      features.push({ type: "chamfer", count: chamferDims.length });
    }

    // Infer pockets/slots from linear dims with tight tolerances
    const tightLinear = dims.filter(d =>
      d.type === "linear" && d.tolerance &&
      Math.abs(d.tolerance.upper - d.tolerance.lower) < (isInch ? 0.002 : 0.05));
    if (tightLinear.length > 2) {
      features.push({ type: "pocket", count: Math.ceil(tightLinear.length / 3) });
      confidence += 3;
    }

    if (features.length > 0) {
      notes.push(`Detected ${features.length} feature groups from ${dims.length} dimensions`);
    }

    // ── 5. GD&T → Tolerance + Inspection Level ──
    const gdt = analysis.gdt ?? [];
    let tightestTol: number | undefined;
    let inspLevel: QuoteEstimateInput["inspection_level"] = "standard";

    if (gdt.length > 0) {
      const tolValues = gdt.map(g => g.tolerance_value).filter(v => v > 0);
      if (tolValues.length > 0) {
        tightestTol = Math.min(...tolValues);
        if (isInch) tightestTol *= 25.4;
        confidence += 10;
        notes.push(`GD&T: ${gdt.length} callouts, tightest = ${tightestTol.toFixed(4)}mm`);
      }

      // If position callouts or many GD&T → need CMM
      const posCount = gdt.filter(g => g.symbol === "position").length;
      if (posCount > 3 || gdt.length > 6) inspLevel = "full_cmm";
      else if (posCount > 0 || gdt.length > 2) inspLevel = "detailed";
    }

    // Also check dimension tolerances
    const dimTols = dims
      .filter(d => d.tolerance)
      .map(d => {
        const range = Math.abs((d.tolerance!.upper - d.tolerance!.lower));
        return isInch ? range * 25.4 : range;
      });
    if (dimTols.length > 0) {
      const minDimTol = Math.min(...dimTols);
      if (tightestTol == null || minDimTol < tightestTol) {
        tightestTol = minDimTol;
      }
    }

    // ── 6. Notes → Secondary Ops + Certifications ──
    const secondaryOps: SecondaryOp[] = [];
    const certifications: string[] = [];
    const processNotes = analysis.notes ?? [];

    for (const note of processNotes) {
      const lower = note.text.toLowerCase();

      // Check finish notes
      if (note.category === "finish" || note.category === "process") {
        for (const [key, opType] of Object.entries(FINISH_MAP)) {
          if (lower.includes(key)) {
            if (!secondaryOps.some(o => o.type === opType)) {
              secondaryOps.push({ type: opType, notes: note.text });
            }
          }
        }
      }

      // Check certifications
      if (lower.includes("as9100")) certifications.push("AS9100");
      if (lower.includes("itar")) certifications.push("ITAR");
      if (lower.includes("nadcap")) certifications.push("NADCAP");
      if (lower.includes("iso 13485") || lower.includes("iso13485")) certifications.push("ISO13485");

      // Check for FAI requirement
      if (lower.includes("first article") || lower.includes("fai") || lower.includes("as9102")) {
        certifications.push("FAI_AS9102");
      }

      // Unmapped notes
      if (note.category === "process" && !secondaryOps.length) {
        unmapped.push(`Process note: ${note.text}`);
      }
    }

    // Title block finish → secondary op
    if (tb?.finish) {
      const lower = tb.finish.toLowerCase();
      for (const [key, opType] of Object.entries(FINISH_MAP)) {
        if (lower.includes(key) && !secondaryOps.some(o => o.type === opType)) {
          secondaryOps.push({ type: opType, notes: `From title block: ${tb.finish}` });
        }
      }
    }

    if (secondaryOps.length > 0) {
      notes.push(`Secondary ops detected: ${secondaryOps.map(o => o.type).join(", ")}`);
      confidence += 5;
    }

    // ── 7. Complexity Inference ──
    const complexity = this.inferComplexity(features, gdt, dims);
    notes.push(`Complexity inferred: ${complexity}`);

    // ── 8. Machine Type Inference ──
    const machineType = this.inferMachineType(features, dims);

    // ── 9. Build QuoteEstimateInput ──
    const quoteInput: QuoteEstimateInput = {
      part_name: partName,
      part_number: partNumber,
      quantity: overrides?.quantity ?? 1,
      material,
      stock_dimensions_mm: stockDims,
      complexity,
      features: features.length > 0 ? features : undefined,
      machine_type: machineType,
      tightest_tolerance_mm: tightestTol ?? overrides?.tightest_tolerance_mm,
      secondary_ops: secondaryOps.length > 0 ? secondaryOps : undefined,
      inspection_level: inspLevel,
      first_article_required: certifications.includes("FAI_AS9102"),
      certifications: certifications.filter(c => c !== "FAI_AS9102"),
      customer_tier: overrides?.customer_tier,
      rush: overrides?.rush,
      rush_tier: overrides?.rush_tier,
      repeat_order: overrides?.repeat_order,
      target_margin_pct: overrides?.target_margin_pct,
      ...overrides,
    };

    confidence = Math.min(95, Math.max(15, confidence));

    return {
      quote_input: quoteInput,
      extraction_confidence: confidence,
      extraction_notes: notes,
      unmapped_notes: unmapped,
    };
  }

  /**
   * Resolve a material string from a drawing to our material key.
   */
  resolveMaterial(rawMaterial: string): string | null {
    const lower = rawMaterial.toLowerCase().trim();
    // Direct lookup
    if (MATERIAL_MAP[lower]) return MATERIAL_MAP[lower];
    // Substring match
    for (const [key, value] of Object.entries(MATERIAL_MAP)) {
      if (lower.includes(key)) return value;
    }
    return null;
  }

  /**
   * Normalize BlueprintOCREngine.analyzeBlueprint() output into this engine's LOCAL
   * BlueprintAnalysis contract that bridge() consumes. The two `BlueprintAnalysis`
   * interfaces collide by NAME only: the OCR shape uses `gdt_frames` / `dim.nominal` /
   * `dim.raw_text` / `gdt.datum_references` / `title.title`, none of which bridge() reads.
   * Feeding the raw OCR shape straight into bridge() (the prior shopDispatcher +
   * businessDispatcher bug) silently dropped ALL GD&T -- bridge() reads `analysis.gdt`
   * while OCR emits `gdt_frames` -- and mis-read dimensions, producing under-spec'd quotes
   * from real prints with no error. This adapter is the single source of truth for the
   * OCR->bridge translation.
   *
   * `bounding_box` has NO OCR source and is intentionally left undefined (bridge() guards
   * it). Real stock extents must come through bridge() `overrides.stock_dimensions_mm`,
   * never inferred from the unordered OCR dimension callouts -- a max-extent guess would
   * fabricate a wrong stock volume and mis-price material + machining.
   */
  fromOCRAnalysis(ocr: OCRBlueprintAnalysis): BlueprintAnalysis {
    return {
      dimensions: (ocr.dimensions ?? []).map((d) => ({
        type: d.type,
        value: d.nominal,
        unit: d.unit,
        // Pass {upper, lower} through unchanged (both are signed offsets from nominal;
        // bridge reads |upper - lower|, offset-invariant). Drop OCR's tolerance.type.
        ...(d.tolerance ? { tolerance: { upper: d.tolerance.upper, lower: d.tolerance.lower } } : {}),
        text: d.raw_text,
      })),
      // KEY remap: OCR `gdt_frames` -> bridge `gdt`. Missing this drops all GD&T tolerance.
      gdt: (ocr.gdt_frames ?? []).map((g) => ({
        symbol: g.symbol,
        // Pass tolerance_value through; bridge applies x25.4 itself when inch -- do NOT pre-scale.
        tolerance_value: g.tolerance_value,
        datum_refs: g.datum_references,
        feature_type: g.applied_to,
      })),
      title_block: ocr.title_block
        ? {
            part_number: ocr.title_block.part_number,
            // RENAME: OCR `title` -> bridge `part_name` (drives part labeling + a +5 confidence bump).
            part_name: ocr.title_block.title,
            revision: ocr.title_block.revision,
            material: ocr.title_block.material,
            finish: ocr.title_block.finish,
            scale: ocr.title_block.scale,
            drawn_by: ocr.title_block.drawn_by,
            date: ocr.title_block.date,
            // bridge decides inch/mm solely from this; "mixed" -> falls through to mm (bridge default).
            units: ocr.title_block.units,
            third_angle: ocr.title_block.third_angle,
          }
        : undefined,
      notes: (ocr.notes ?? []).map((n) => ({ category: n.category, text: n.text })),
      // bounding_box: no OCR source -> omitted (bridge guards `if (analysis.bounding_box)`).
    };
  }

  /** OCR-shape entrypoint: normalize OCR analysis, then bridge to a QuoteEstimateInput. */
  bridgeFromOCR(ocr: OCRBlueprintAnalysis, overrides?: Partial<QuoteEstimateInput>): BridgeResult {
    return this.bridge(this.fromOCRAnalysis(ocr), overrides);
  }

  // ─── Private Helpers ─────────────────────────────────────────

  private tightestTolerance(dims: BlueprintAnalysis["dimensions"], isInch: boolean): number | undefined {
    if (!dims) return undefined;
    const tols = dims
      .filter(d => d.tolerance)
      .map(d => {
        const range = Math.abs(d.tolerance!.upper - d.tolerance!.lower);
        return isInch ? range * 25.4 : range;
      });
    return tols.length > 0 ? Math.min(...tols) : undefined;
  }

  private inferComplexity(
    features: FeatureSpec[],
    gdt: BlueprintAnalysis["gdt"],
    dims: BlueprintAnalysis["dimensions"],
  ): "simple" | "medium" | "complex" | "very_complex" {
    const featureCount = features.reduce((s, f) => s + f.count, 0);
    const gdtCount = gdt?.length ?? 0;
    const dimCount = dims?.length ?? 0;
    const has5axis = features.some(f => f.requires_5axis);
    const hasUndercut = features.some(f => f.type === "undercut");

    if (has5axis || hasUndercut || (featureCount > 20 && gdtCount > 8)) return "very_complex";
    if (featureCount > 10 || gdtCount > 4 || dimCount > 30) return "complex";
    if (featureCount > 3 || gdtCount > 0 || dimCount > 10) return "medium";
    return "simple";
  }

  private inferMachineType(
    features: FeatureSpec[],
    dims: BlueprintAnalysis["dimensions"],
  ): string {
    // Check for turning indicators (many diameter dims, cylindrical features)
    const diaDims = dims?.filter(d => d.type === "diameter") ?? [];
    const linearDims = dims?.filter(d => d.type === "linear") ?? [];

    if (diaDims.length > linearDims.length * 1.5) return "cnc_lathe";

    // Check for 5-axis features
    if (features.some(f => f.requires_5axis)) return "cnc_mill_5axis";

    // Complex parts likely need more axes
    const featureTypes = new Set(features.map(f => f.type));
    if (featureTypes.size > 5) return "cnc_mill_5axis";

    return "cnc_mill_3axis";
  }
}

export const blueprintToQuoteBridgeEngine = new BlueprintToQuoteBridgeEngine();
export { BlueprintToQuoteBridgeEngine };
