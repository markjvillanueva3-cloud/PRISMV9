/**
 * HyperMillFAIBridge — Map hyperMILL operations to AS9102 FAI plan
 *
 * Connects FirstArticleInspectionPipelineEngine to hyperMILL job output:
 *   - Maps operations with tolerances → FAI balloon numbers (Form 3 characteristics)
 *   - Auto-identifies critical dimensions from tolerance tightness
 *   - Generates AS9102 Form 1/2/3 field data
 *   - Assigns balloon numbers sequentially, critical characteristics first
 *
 * AS9102 Form Summary:
 *   Form 1 — Design Documentation (part number, revision, drawing, supplier, PO)
 *   Form 2 — Product Accountability (material cert, traceability, lot size)
 *   Form 3 — Characteristic Accountability (all toleranced dimensions, pass/fail, method)
 *
 * Critical dimension criterion (per AS9102 Rev C):
 *   - is_critical flag explicitly set, OR
 *   - Tolerance ≤ 0.05mm (tight machining), OR
 *   - Feature type includes "bore", "thread", "datum"
 *
 * References:
 *   - SAE AS9102 Rev C (2014): First Article Inspection Requirements
 *   - ISO 9001:2015 §8.5.1 clause (f): validation at production
 *   - AIAG PPAP 4th Edition (2006): Part Approval Process
 *   - ISO 14253-1 (2013): Decision rules for conformance
 *
 * HM-REV-MS10 / U-HMR52
 */

import {
  FirstArticleInspectionPipelineEngine,
  firstArticleInspectionPipelineEngine,
} from "./FirstArticleInspectionPipelineEngine.js";
import type {
  FeatureInput,
  FAIInput,
  FAIResult,
  CharacteristicDesignator,
  InspectionMethod,
} from "./FirstArticleInspectionPipelineEngine.js";
import type { HyperMillOperation, HyperMillFixture } from "./HyperMillSetupSheetBridge.js";

// ============================================================================
// Types
// ============================================================================

export interface HyperMillFAIInput {
  /** hyperMILL job ID */
  job_id: string;
  /** Part number on drawing */
  part_number: string;
  /** Drawing revision */
  revision?: string;
  /** Supplier / shop name */
  supplier?: string;
  /** Purchase order */
  purchase_order?: string;
  /** Drawing number (may differ from part_number) */
  drawing_number?: string;
  /** Organisation (for AS9102 Form 1 header) */
  organization?: string;
  /** Inspector name */
  inspector?: string;
  /** Serial number of first article */
  serial_number?: string;
  /** Material cert ID */
  material_cert_id?: string;
  /** hyperMILL operations (toleranced ops become Form 3 characteristics) */
  operations: HyperMillOperation[];
  /** Fixture info */
  fixture?: HyperMillFixture;
}

export interface BalloonMapping {
  /** AS9102 characteristic number (balloon number) */
  char_number: number;
  /** Source operation ID */
  operation_id: string;
  /** Feature name */
  feature_name: string;
  /** Nominal dimension (mm) */
  nominal_mm: number;
  /** Plus tolerance (mm) */
  tol_plus_mm: number;
  /** Minus tolerance (mm) */
  tol_minus_mm: number;
  /** Critical vs major vs minor */
  designator: CharacteristicDesignator;
  /** Inspection method */
  inspection_method: InspectionMethod;
}

export interface HyperMillFAIResult {
  job_id: string;
  part_number: string;
  /** Total number of AS9102 balloon numbers (Form 3 rows) */
  balloon_count: number;
  /** Number of critical characteristics */
  critical_count: number;
  /** AS9102 Form 1 data */
  form_1: {
    part_number: string;
    revision: string;
    drawing_number: string;
    organization: string;
    supplier: string;
    purchase_order: string;
    serial_number: string;
    inspection_date: string;
    inspector: string;
  };
  /** AS9102 Form 2 data (product accountability) */
  form_2: {
    material_cert_id: string;
    lot_size: number;
    traceability_status: string;
  };
  /** AS9102 Form 3 rows (characteristic accountability) */
  form_3: BalloonMapping[];
  /** Full FAI result from FirstArticleInspectionPipelineEngine */
  fai_result: FAIResult;
  /** Summary disposition (ACCEPT = awaiting measurements, PENDING = no measurements yet) */
  disposition: "ACCEPT" | "REJECT" | "MRB" | "PENDING";
}

// ============================================================================
// Constants
// ============================================================================

/** Tolerance threshold below which a dimension is auto-flagged as critical (mm) */
const CRITICAL_TOLERANCE_MM = 0.05;

/** Feature types that are always critical per AS9102 aerospace practice */
const CRITICAL_FEATURE_TYPES = new Set([
  "bore", "bearing_bore", "thread", "datum", "locating_feature",
  "seal_groove", "critical_hole", "interference_fit",
]);

// ============================================================================
// Engine
// ============================================================================

export class HyperMillFAIBridge {
  /**
   * Generate AS9102 FAI plan from hyperMILL operation data.
   *
   * Maps each toleranced operation to a Form 3 characteristic (balloon number).
   * Critical characteristics are identified automatically and sorted first.
   *
   * @param input - hyperMILL job data with operation tolerances
   * @returns Complete FAI documentation with balloon mappings
   */
  async generate(input: HyperMillFAIInput): Promise<HyperMillFAIResult> {
    const {
      job_id,
      part_number,
      revision = "A",
      supplier = "N/A",
      purchase_order = "N/A",
      drawing_number = part_number,
      organization = "N/A",
      inspector = "N/A",
      serial_number = "SN-001",
      material_cert_id = "CERT-001",
      operations,
    } = input;

    // ── Step 1: Identify toleranced operations → features ─────────────────
    const tolerancedOps = operations.filter(
      (op) =>
        op.nominal_dimension_mm !== undefined ||
        op.tolerance_plus_mm !== undefined ||
        op.tolerance_minus_mm !== undefined
    );

    // ── Step 2: Classify each as critical/major/minor ─────────────────────
    const classifiedFeatures: Array<{
      op: HyperMillOperation;
      designator: CharacteristicDesignator;
      inspection_method: InspectionMethod;
    }> = tolerancedOps.map((op) => {
      const isCritical =
        op.is_critical === true ||
        (op.tolerance_plus_mm !== undefined && op.tolerance_plus_mm <= CRITICAL_TOLERANCE_MM) ||
        (op.tolerance_minus_mm !== undefined && op.tolerance_minus_mm <= CRITICAL_TOLERANCE_MM) ||
        CRITICAL_FEATURE_TYPES.has(op.feature_type?.toLowerCase() ?? "");

      const isMajor =
        !isCritical &&
        (op.tolerance_plus_mm !== undefined && op.tolerance_plus_mm <= 0.1);

      const designator: CharacteristicDesignator = isCritical
        ? "critical"
        : isMajor
        ? "major"
        : "minor";

      // Inspection method based on tolerance tightness
      const tol = Math.min(op.tolerance_plus_mm ?? 99, op.tolerance_minus_mm ?? 99);
      const inspection_method: InspectionMethod =
        tol <= 0.02
          ? "CMM"
          : tol <= 0.1
          ? "CMM"
          : tol <= 0.5
          ? "gauge"
          : "manual";

      return { op, designator, inspection_method };
    });

    // ── Step 3: Sort — critical first, then major, then minor ─────────────
    const SORT_ORDER: Record<CharacteristicDesignator, number> = {
      critical: 0,
      major: 1,
      minor: 2,
    };
    classifiedFeatures.sort((a, b) => SORT_ORDER[a.designator] - SORT_ORDER[b.designator]);

    // ── Step 4: Assign balloon numbers ────────────────────────────────────
    const balloonMappings: BalloonMapping[] = classifiedFeatures.map((f, idx) => ({
      char_number: idx + 1,
      operation_id: f.op.operation_id,
      feature_name: f.op.operation_name,
      nominal_mm: f.op.nominal_dimension_mm ?? 0,
      tol_plus_mm: f.op.tolerance_plus_mm ?? 0,
      tol_minus_mm: f.op.tolerance_minus_mm ?? 0,
      designator: f.designator,
      inspection_method: f.inspection_method,
    }));

    // ── Step 5: Build FAI input for FirstArticleInspectionPipelineEngine ──
    const faiFeatures: FeatureInput[] = balloonMappings.map((b) => ({
      feature_id: b.operation_id,
      feature_name: b.feature_name,
      reference_location: `Balloon #${b.char_number}`,
      designator: b.designator,
      nominal: b.nominal_mm,
      tolerance_plus: b.tol_plus_mm,
      tolerance_minus: b.tol_minus_mm,
      unit: "mm",
      inspection_method: b.inspection_method,
    }));

    const faiInput: FAIInput = {
      part_number,
      revision,
      features: faiFeatures.length > 0 ? faiFeatures : [{
        feature_id: "placeholder",
        feature_name: "No toleranced dimensions found",
        reference_location: "N/A",
        designator: "minor",
        nominal: 0,
        tolerance_plus: 0.5,
        tolerance_minus: 0.5,
        unit: "mm",
        inspection_method: "visual",
      }],
      material_cert_id,
      serial_number,
      purchase_order,
      supplier,
      drawing_number,
      organization,
      inspector,
    };

    // ── Step 6: Run FirstArticleInspectionPipelineEngine (async) ─────────
    const faiResult = await firstArticleInspectionPipelineEngine.runFAI(faiInput);

    const criticalCount = balloonMappings.filter((b) => b.designator === "critical").length;

    return {
      job_id,
      part_number,
      balloon_count: balloonMappings.length,
      critical_count: criticalCount,
      form_1: {
        part_number,
        revision,
        drawing_number,
        organization,
        supplier,
        purchase_order,
        serial_number,
        inspection_date: new Date().toISOString().slice(0, 10),
        inspector,
      },
      form_2: {
        material_cert_id,
        lot_size: 1,
        traceability_status: material_cert_id !== "CERT-001" ? "certified" : "pending",
      },
      form_3: balloonMappings,
      fai_result: faiResult,
      disposition: balloonMappings.length === 0 ? "PENDING" : "PENDING",
    };
  }
}

export const hyperMillFAIBridge = new HyperMillFAIBridge();
