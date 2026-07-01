/**
 * PRISM Manufacturing Intelligence — Cross-Catalog Validation Engine
 * ENRICH-MS4: Validates tool data quality across manufacturers using statistical methods
 *
 * Capabilities:
 * 1. Cross-manufacturer dimension correlation (median/IQR outlier detection)
 * 2. Grade/coating standardization to ISO categories
 * 3. Tool classification validation (type vs physical dimensions)
 * 4. Per-manufacturer completeness scoring
 * 5. Cross-catalog duplicate detection (Euclidean distance on normalized dims)
 *
 * @version 1.0.0
 * @module CrossCatalogValidationEngine
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/** Minimal tool record consumed by this engine — compatible with CatalogTool */
export interface ValidationToolRecord {
  id: string;
  manufacturer: string;
  series?: string;
  designation?: string;
  type: string;
  material?: string;
  coating?: string;
  grade?: string;
  physical: {
    diameter_mm: number;
    overall_length_mm: number;
    shank_diameter_mm: number;
    flute_length_mm: number;
  };
  flute_count?: number;
  helix_angle_deg?: number;
  point_angle_deg?: number;
  ic_mm?: number;              // inscribed circle for inserts
  cutting_data?: Record<string, unknown>;
  source?: string;
}

/** Dimension outlier result */
export interface DimensionOutlier {
  diameter: number;
  field: "overall_length_mm" | "flute_length_mm" | "shank_diameter_mm";
  manufacturer: string;
  toolId: string;
  value: number;
  median: number;
  iqr: number;
  deviation: number;
  isOutlier: boolean;
}

/** Grade equivalence mapping */
export interface GradeMapping {
  manufacturer: string;
  grade: string;
  isoCategory: string;
  substrate: string;
  coating: string;
}

/** Classification error */
export interface ClassificationError {
  toolId: string;
  manufacturer: string;
  type: string;
  issue: string;
  field: string;
  value: number | undefined;
  expected: string;
}

/** Per-manufacturer completeness score */
export interface CompletenessScore {
  manufacturer: string;
  toolCount: number;
  overallScore: number;
  fieldScores: Record<string, number>;
}

/** Potential duplicate pair */
export interface DuplicatePair {
  toolA: { id: string; manufacturer: string; designation?: string };
  toolB: { id: string; manufacturer: string; designation?: string };
  distance: number;
  matchingFields: string[];
}

/** Full validation report */
export interface CrossCatalogValidationResult {
  timestamp: string;
  toolsAnalyzed: number;
  manufacturers: string[];
  dimensionOutliers: DimensionOutlier[];
  gradeMappings: GradeMapping[];
  classificationErrors: ClassificationError[];
  completenessScores: CompletenessScore[];
  duplicates: DuplicatePair[];
  summary: {
    outlierCount: number;
    classificationErrorCount: number;
    duplicateCount: number;
    avgCompleteness: number;
  };
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Common end mill diameters for cross-manufacturer comparison */
const COMMON_DIAMETERS = [6, 10, 12, 16, 20];
const DIAMETER_TOLERANCE = 0.1; // mm tolerance for matching nominal sizes

/** Dimension fields to compare across manufacturers */
const DIMENSION_FIELDS = ["overall_length_mm", "flute_length_mm", "shank_diameter_mm"] as const;

/** IQR multiplier for outlier detection (2× IQR from median) */
const IQR_MULTIPLIER = 2.0;

/**
 * Known manufacturer grade → ISO category mappings
 * Format: { mfrGrade: { isoCategory, substrate, coating } }
 */
const GRADE_MAPPINGS: Record<string, { isoCategory: string; substrate: string; coating: string }> = {
  // Kennametal
  "KC7325": { isoCategory: "K10-K20", substrate: "carbide", coating: "CVD" },
  "KC7225": { isoCategory: "K20-K30", substrate: "carbide", coating: "CVD" },
  "KC5010": { isoCategory: "P10-P20", substrate: "carbide", coating: "CVD" },
  "KC5025": { isoCategory: "P20-P30", substrate: "carbide", coating: "CVD" },
  "KC730":  { isoCategory: "P25-P35", substrate: "carbide", coating: "PVD" },
  "KCSM40": { isoCategory: "M10-M20", substrate: "carbide", coating: "PVD" },
  "KCU10":  { isoCategory: "P05-P15", substrate: "carbide", coating: "PVD" },
  "KCU25":  { isoCategory: "P15-P25", substrate: "carbide", coating: "CVD" },
  // Tungaloy
  "AH725":  { isoCategory: "P10-P20", substrate: "carbide", coating: "PVD" },
  "AH120":  { isoCategory: "P05-P15", substrate: "carbide", coating: "PVD" },
  "AH130":  { isoCategory: "M10-M20", substrate: "carbide", coating: "PVD" },
  "AH3135": { isoCategory: "M20-M30", substrate: "carbide", coating: "PVD" },
  "T9125":  { isoCategory: "K10-K20", substrate: "carbide", coating: "CVD" },
  "T9115":  { isoCategory: "K05-K15", substrate: "carbide", coating: "CVD" },
  // Sandvik Coromant
  "GC4230": { isoCategory: "P10-P20", substrate: "carbide", coating: "CVD" },
  "GC4240": { isoCategory: "P20-P30", substrate: "carbide", coating: "CVD" },
  "GC4325": { isoCategory: "P15-P25", substrate: "carbide", coating: "CVD" },
  "GC2220": { isoCategory: "M10-M20", substrate: "carbide", coating: "CVD" },
  "GC1125": { isoCategory: "M05-M15", substrate: "carbide", coating: "PVD" },
  "GC3210": { isoCategory: "K10-K20", substrate: "carbide", coating: "CVD" },
  "GC1105": { isoCategory: "S05-S15", substrate: "carbide", coating: "PVD" },
  "GC7015": { isoCategory: "H05-H15", substrate: "carbide", coating: "PVD" },
  // Seco
  "TP2500": { isoCategory: "P15-P25", substrate: "carbide", coating: "CVD" },
  "TP1500": { isoCategory: "P05-P15", substrate: "carbide", coating: "PVD" },
  "TK1001": { isoCategory: "K05-K15", substrate: "carbide", coating: "CVD" },
  "TM2000": { isoCategory: "M10-M20", substrate: "carbide", coating: "CVD" },
  "TS2000": { isoCategory: "S10-S20", substrate: "carbide", coating: "PVD" },
  // ISCAR
  "IC8150": { isoCategory: "P05-P15", substrate: "carbide", coating: "CVD" },
  "IC8250": { isoCategory: "P15-P25", substrate: "carbide", coating: "CVD" },
  "IC6015": { isoCategory: "M05-M15", substrate: "carbide", coating: "PVD" },
  "IC5005": { isoCategory: "K05-K15", substrate: "carbide", coating: "CVD" },
  "IC908":  { isoCategory: "P10-M10", substrate: "carbide", coating: "PVD" },
  // Korloy
  "PC9530": { isoCategory: "P15-P25", substrate: "carbide", coating: "CVD" },
  "NC3030": { isoCategory: "P20-P30", substrate: "carbide", coating: "CVD" },
  "PC5300": { isoCategory: "P05-P15", substrate: "carbide", coating: "PVD" },
  // Mitsubishi
  "MC7020": { isoCategory: "P10-P20", substrate: "carbide", coating: "CVD" },
  "MC6025": { isoCategory: "P15-P25", substrate: "carbide", coating: "CVD" },
  "MP7130": { isoCategory: "M10-M20", substrate: "carbide", coating: "PVD" },
  "MC5020": { isoCategory: "K10-K20", substrate: "carbide", coating: "CVD" },
};

/** Required fields and their weights for completeness scoring */
const COMPLETENESS_FIELDS: Record<string, number> = {
  DC: 1.0,            // diameter — critical
  shank: 0.8,
  OAL: 0.8,
  LOC: 0.9,
  flutes: 0.7,
  helix: 0.5,
  coating: 0.6,
  cutting_data: 0.9,
};

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class CrossCatalogValidationEngine {
  private tools: ValidationToolRecord[] = [];

  /**
   * Load tools for validation. Accepts any array conforming to ValidationToolRecord.
   */
  loadTools(tools: ValidationToolRecord[]): void {
    this.tools = tools;
    log.info(`[CrossCatalogValidation] Loaded ${tools.length} tools from ${new Set(tools.map(t => t.manufacturer)).size} manufacturers`);
  }

  /**
   * 1. Cross-manufacturer dimension correlation
   * For common diameters, computes median + IQR per dimension field.
   * Flags tools deviating > 2× IQR from median as potential data errors.
   */
  validateDimensions(tools?: ValidationToolRecord[]): DimensionOutlier[] {
    const data = tools ?? this.tools;
    if (data.length === 0) return [];

    const outliers: DimensionOutlier[] = [];

    for (const nomDia of COMMON_DIAMETERS) {
      // Filter end mills at this nominal diameter
      const atDia = data.filter(t =>
        (t.type === "end_mill" || t.type === "ball_mill" || t.type === "bull_mill" || t.type === "slot_drill") &&
        Math.abs(t.physical.diameter_mm - nomDia) <= DIAMETER_TOLERANCE
      );
      if (atDia.length < 3) continue; // need at least 3 for meaningful stats

      for (const field of DIMENSION_FIELDS) {
        const values = atDia
          .map(t => ({ tool: t, val: t.physical[field] }))
          .filter(v => v.val > 0);

        if (values.length < 3) continue;

        const sorted = values.map(v => v.val).sort((a, b) => a - b);
        const median = this.computeMedian(sorted);
        const q1 = this.computeQuantile(sorted, 0.25);
        const q3 = this.computeQuantile(sorted, 0.75);
        const iqr = q3 - q1;

        // Avoid flagging when IQR is tiny (all values nearly identical)
        const effectiveIqr = Math.max(iqr, 0.5); // minimum 0.5mm IQR

        for (const v of values) {
          const deviation = Math.abs(v.val - median);
          const isOutlier = deviation > IQR_MULTIPLIER * effectiveIqr;
          outliers.push({
            diameter: nomDia,
            field,
            manufacturer: v.tool.manufacturer,
            toolId: v.tool.id,
            value: v.val,
            median: Math.round(median * 100) / 100,
            iqr: Math.round(effectiveIqr * 100) / 100,
            deviation: Math.round(deviation * 100) / 100,
            isOutlier,
          });
        }
      }
    }

    // Return only outliers by default (non-outliers available if caller wants full report)
    return outliers.filter(o => o.isOutlier);
  }

  /**
   * 2. Grade/coating standardization
   * Maps manufacturer-specific grade names to ISO standard categories.
   */
  standardizeGrades(tools?: ValidationToolRecord[]): GradeMapping[] {
    const data = tools ?? this.tools;
    const mappings: GradeMapping[] = [];
    const seen = new Set<string>();

    for (const t of data) {
      const grade = t.grade ?? t.coating;
      if (!grade) continue;

      const key = `${t.manufacturer}:${grade}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const known = GRADE_MAPPINGS[grade];
      if (known) {
        mappings.push({
          manufacturer: t.manufacturer,
          grade,
          isoCategory: known.isoCategory,
          substrate: known.substrate,
          coating: known.coating,
        });
      } else {
        // Attempt heuristic mapping from grade prefix
        const isoCategory = this.inferIsoCategory(grade);
        mappings.push({
          manufacturer: t.manufacturer,
          grade,
          isoCategory: isoCategory ?? "UNKNOWN",
          substrate: t.material ?? "unknown",
          coating: t.coating ?? "unknown",
        });
      }
    }

    return mappings;
  }

  /**
   * 3. Tool classification validation
   * Checks that tool type matches physical dimensions.
   */
  validateClassification(tools?: ValidationToolRecord[]): ClassificationError[] {
    const data = tools ?? this.tools;
    const errors: ClassificationError[] = [];

    for (const t of data) {
      // Drills: should have flute_count=2 (or 1 for spade), point_angle 90-180
      if (t.type === "drill") {
        if (t.flute_count !== undefined && t.flute_count !== 2 && t.flute_count !== 1 && t.flute_count !== 3) {
          errors.push({
            toolId: t.id, manufacturer: t.manufacturer, type: t.type,
            issue: `Drill has unexpected flute count ${t.flute_count} (expected 1-3)`,
            field: "flute_count", value: t.flute_count, expected: "1, 2, or 3",
          });
        }
        if (t.point_angle_deg !== undefined && (t.point_angle_deg < 90 || t.point_angle_deg > 180)) {
          errors.push({
            toolId: t.id, manufacturer: t.manufacturer, type: t.type,
            issue: `Drill point angle ${t.point_angle_deg}° outside valid range 90-180°`,
            field: "point_angle_deg", value: t.point_angle_deg, expected: "90-180",
          });
        }
      }

      // End mills: flute_count >= 2
      if (t.type === "end_mill" || t.type === "ball_mill" || t.type === "bull_mill" || t.type === "slot_drill") {
        if (t.flute_count !== undefined && t.flute_count < 2) {
          errors.push({
            toolId: t.id, manufacturer: t.manufacturer, type: t.type,
            issue: `End mill has only ${t.flute_count} flute(s) (expected >= 2)`,
            field: "flute_count", value: t.flute_count, expected: ">= 2",
          });
        }
      }

      // Inserts: should have IC > 0
      if (t.type === "insert") {
        if (t.ic_mm !== undefined && t.ic_mm <= 0) {
          errors.push({
            toolId: t.id, manufacturer: t.manufacturer, type: t.type,
            issue: `Insert has IC = ${t.ic_mm}mm (expected > 0)`,
            field: "ic_mm", value: t.ic_mm, expected: "> 0",
          });
        }
        if (t.ic_mm === undefined) {
          errors.push({
            toolId: t.id, manufacturer: t.manufacturer, type: t.type,
            issue: "Insert missing inscribed circle (IC) dimension",
            field: "ic_mm", value: undefined, expected: "> 0",
          });
        }
      }

      // Physical sanity: OAL > LOC, shank > 0, diameter > 0
      if (t.physical.diameter_mm <= 0) {
        errors.push({
          toolId: t.id, manufacturer: t.manufacturer, type: t.type,
          issue: `Diameter ${t.physical.diameter_mm}mm invalid`,
          field: "diameter_mm", value: t.physical.diameter_mm, expected: "> 0",
        });
      }
      if (t.physical.overall_length_mm > 0 && t.physical.flute_length_mm > 0 &&
          t.physical.flute_length_mm > t.physical.overall_length_mm) {
        errors.push({
          toolId: t.id, manufacturer: t.manufacturer, type: t.type,
          issue: `LOC (${t.physical.flute_length_mm}mm) exceeds OAL (${t.physical.overall_length_mm}mm)`,
          field: "flute_length_mm", value: t.physical.flute_length_mm,
          expected: `<= ${t.physical.overall_length_mm}`,
        });
      }
    }

    return errors;
  }

  /**
   * 4. Per-manufacturer completeness scoring
   * Scores each manufacturer on data quality across key fields.
   */
  scoreCompleteness(tools?: ValidationToolRecord[]): CompletenessScore[] {
    const data = tools ?? this.tools;
    const byMfr = new Map<string, ValidationToolRecord[]>();

    for (const t of data) {
      const arr = byMfr.get(t.manufacturer) ?? [];
      arr.push(t);
      byMfr.set(t.manufacturer, arr);
    }

    const scores: CompletenessScore[] = [];

    for (const [mfr, mfrTools] of Array.from(byMfr.entries())) {
      const fieldScores: Record<string, number> = {};

      // DC (diameter) — always present if physical exists
      fieldScores.DC = this.fieldScore(mfrTools, t => t.physical.diameter_mm > 0 ? 1.0 : 0);
      fieldScores.shank = this.fieldScore(mfrTools, t => t.physical.shank_diameter_mm > 0 ? 1.0 : 0);
      fieldScores.OAL = this.fieldScore(mfrTools, t => t.physical.overall_length_mm > 0 ? 1.0 : 0);
      fieldScores.LOC = this.fieldScore(mfrTools, t => t.physical.flute_length_mm > 0 ? 1.0 : 0);
      fieldScores.flutes = this.fieldScore(mfrTools, t =>
        t.flute_count !== undefined && t.flute_count > 0 ? 1.0 : 0);
      fieldScores.helix = this.fieldScore(mfrTools, t =>
        t.helix_angle_deg !== undefined && t.helix_angle_deg > 0 ? 1.0 : 0.0);
      fieldScores.coating = this.fieldScore(mfrTools, t =>
        t.coating ? 1.0 : (t.grade ? 0.5 : 0));
      fieldScores.cutting_data = this.fieldScore(mfrTools, t =>
        t.cutting_data && Object.keys(t.cutting_data).length > 0 ? 1.0 : 0);

      // Weighted overall score
      let weightedSum = 0;
      let totalWeight = 0;
      for (const [field, weight] of Object.entries(COMPLETENESS_FIELDS)) {
        weightedSum += (fieldScores[field] ?? 0) * weight;
        totalWeight += weight;
      }

      scores.push({
        manufacturer: mfr,
        toolCount: mfrTools.length,
        overallScore: Math.round((weightedSum / totalWeight) * 1000) / 1000,
        fieldScores: Object.fromEntries(
          Object.entries(fieldScores).map(([k, v]) => [k, Math.round(v * 1000) / 1000])
        ),
      });
    }

    return scores.sort((a, b) => b.overallScore - a.overallScore);
  }

  /**
   * 5. Duplicate detection
   * Finds tools with very similar dimensions across catalogs.
   * Uses Euclidean distance on normalized dimension vectors.
   */
  findDuplicates(tools?: ValidationToolRecord[], threshold = 0.05): DuplicatePair[] {
    const data = tools ?? this.tools;
    if (data.length < 2) return [];

    // Compute normalization ranges
    const dims = data.map(t => [
      t.physical.diameter_mm,
      t.physical.overall_length_mm,
      t.physical.flute_length_mm,
      t.physical.shank_diameter_mm,
      t.flute_count ?? 0,
    ]);

    const ranges = [0, 1, 2, 3, 4].map(i => {
      const vals = dims.map(d => d[i]).filter(v => v > 0);
      if (vals.length === 0) return { min: 0, range: 1 };
      const min = Math.min(...vals);
      const max = Math.max(...vals);
      return { min, range: Math.max(max - min, 0.001) };
    });

    const normalize = (d: number[]): number[] =>
      d.map((v, i) => (v - ranges[i].min) / ranges[i].range);

    const duplicates: DuplicatePair[] = [];
    const maxCompare = Math.min(data.length, 5000); // cap for performance

    for (let i = 0; i < maxCompare; i++) {
      for (let j = i + 1; j < maxCompare; j++) {
        const a = data[i];
        const b = data[j];

        // Only compare across different manufacturers
        if (a.manufacturer === b.manufacturer) continue;
        // Only compare same tool type
        if (a.type !== b.type) continue;

        const na = normalize(dims[i]);
        const nb = normalize(dims[j]);

        const dist = Math.sqrt(na.reduce((sum, v, k) => sum + (v - nb[k]) ** 2, 0));

        if (dist < threshold) {
          const matchingFields: string[] = [];
          if (Math.abs(a.physical.diameter_mm - b.physical.diameter_mm) < 0.01) matchingFields.push("DC");
          if (Math.abs(a.physical.overall_length_mm - b.physical.overall_length_mm) < 0.5) matchingFields.push("OAL");
          if (Math.abs(a.physical.flute_length_mm - b.physical.flute_length_mm) < 0.5) matchingFields.push("LOC");
          if (a.flute_count === b.flute_count && a.flute_count !== undefined) matchingFields.push("flutes");

          duplicates.push({
            toolA: { id: a.id, manufacturer: a.manufacturer, designation: a.designation },
            toolB: { id: b.id, manufacturer: b.manufacturer, designation: b.designation },
            distance: Math.round(dist * 10000) / 10000,
            matchingFields,
          });
        }
      }
    }

    return duplicates.sort((a, b) => a.distance - b.distance);
  }

  /**
   * Run all validations and return a comprehensive report.
   */
  runAll(tools?: ValidationToolRecord[]): CrossCatalogValidationResult {
    const data = tools ?? this.tools;
    const manufacturers = Array.from(new Set(data.map(t => t.manufacturer)));

    const dimensionOutliers = this.validateDimensions(data);
    const gradeMappings = this.standardizeGrades(data);
    const classificationErrors = this.validateClassification(data);
    const completenessScores = this.scoreCompleteness(data);
    const duplicates = this.findDuplicates(data);

    const avgCompleteness = completenessScores.length > 0
      ? Math.round(completenessScores.reduce((s, c) => s + c.overallScore, 0) / completenessScores.length * 1000) / 1000
      : 0;

    return {
      timestamp: new Date().toISOString(),
      toolsAnalyzed: data.length,
      manufacturers,
      dimensionOutliers,
      gradeMappings,
      classificationErrors,
      completenessScores,
      duplicates,
      summary: {
        outlierCount: dimensionOutliers.length,
        classificationErrorCount: classificationErrors.length,
        duplicateCount: duplicates.length,
        avgCompleteness,
      },
    };
  }

  // ── Private Helpers ──

  private computeMedian(sorted: number[]): number {
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  }

  private computeQuantile(sorted: number[], q: number): number {
    const pos = (sorted.length - 1) * q;
    const lo = Math.floor(pos);
    const hi = Math.ceil(pos);
    if (lo === hi) return sorted[lo];
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
  }

  private fieldScore(tools: ValidationToolRecord[], scorer: (t: ValidationToolRecord) => number): number {
    if (tools.length === 0) return 0;
    return tools.reduce((sum, t) => sum + scorer(t), 0) / tools.length;
  }

  private inferIsoCategory(grade: string): string | null {
    const upper = grade.toUpperCase();
    // Common prefix patterns
    if (/^(KC|KCU|KCPK)/.test(upper)) return "P-K range (Kennametal)";
    if (/^(AH|T9)/.test(upper)) return "P-M range (Tungaloy)";
    if (/^GC\d/.test(upper)) return "Sandvik general";
    if (/^IC\d/.test(upper)) return "ISCAR general";
    if (/^(TP|TK|TM|TS)/.test(upper)) return "Seco general";
    if (/^(PC|NC)/.test(upper)) return "Korloy general";
    if (/^(MC|MP)/.test(upper)) return "Mitsubishi general";
    if (/^(VP|VPX|VP15)/.test(upper)) return "Mitsubishi milling";
    return null;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const crossCatalogValidationEngine = new CrossCatalogValidationEngine();
