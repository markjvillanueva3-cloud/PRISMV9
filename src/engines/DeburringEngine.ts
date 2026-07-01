/**
 * DeburringEngine — Deburring Method Selection & Time Estimation
 *
 * Calculates parameters for deburring operations:
 * - Method selection (manual, tumble, thermal, electrochemical, brush)
 * - Cycle time estimation per method
 * - Edge break specification (radius or chamfer)
 * - Abrasive media selection for mass finishing
 * - Cost comparison between methods
 *
 * Reference: SME Deburring & Edge Finishing Handbook,
 *            Rösler mass finishing guide,
 *            Sievert thermal deburring specifications
 *
 * Actions: deburr_method, deburr_time, deburr_media
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export type DeburringMethod =
  | "manual" | "tumble" | "vibratory"
  | "thermal" | "electrochemical"
  | "brush" | "abrasive_flow" | "cryogenic";

export type BurrLocation =
  | "external_edge" | "internal_edge"
  | "cross_hole" | "thread_entry"
  | "pocket_corner" | "face_edge";

export interface DeburringInput {
  material_iso_group?: "P" | "M" | "K" | "N" | "S" | "H";
  burr_height_mm?: number;
  edge_break_mm?: number;        // target edge radius/chamfer
  part_size_mm?: [number, number, number]; // L×W×H bounding box
  batch_size?: number;
  burr_locations?: BurrLocation[];
  has_internal_features?: boolean;
  surface_finish_critical?: boolean;
}

export interface DeburringResult {
  recommended_method: DeburringMethod;
  alternative_methods: Array<{
    method: DeburringMethod;
    suitability: "excellent" | "good" | "marginal";
    reason: string;
  }>;
  cycle_time: AtomicValue;
  edge_break: AtomicValue;
  cost_per_part: AtomicValue;
  media_type: string;
  warnings: string[];
}

export interface MassFinishInput {
  material_iso_group?: "P" | "M" | "K" | "N" | "S" | "H";
  part_size_mm?: [number, number, number];
  target_ra_um?: number;
  deburr_only?: boolean;
  batch_size?: number;
}

export interface MassFinishResult {
  media_type: string;
  media_size: AtomicValue;
  compound: string;
  cycle_time: AtomicValue;
  machine_type: string;
  media_to_part_ratio: AtomicValue;
  predicted_ra: AtomicValue;
  warnings: string[];
}

// ── Reference Data ────────────────────────────────────────────────

/** Relative deburring difficulty by ISO material group (1=easy, 5=hard) */
const DEBURR_DIFFICULTY: Record<string, number> = {
  P: 3, M: 4, K: 2, N: 1, S: 5, H: 4,
};

/** Base cycle time (seconds) per method for a medium part */
const BASE_CYCLE_TIMES: Record<DeburringMethod, number> = {
  manual: 120,
  tumble: 1800,
  vibratory: 2400,
  thermal: 5,
  electrochemical: 60,
  brush: 30,
  abrasive_flow: 180,
  cryogenic: 15,
};

/** Cost factor relative to manual (1.0) */
const COST_FACTORS: Record<DeburringMethod, number> = {
  manual: 1.0,
  tumble: 0.3,
  vibratory: 0.25,
  thermal: 2.5,
  electrochemical: 3.0,
  brush: 0.8,
  abrasive_flow: 4.0,
  cryogenic: 2.0,
};

// ── Engine ─────────────────────────────────────────────────────────

export class DeburringEngine {
  /**
   * Recommend deburring method and estimate cycle time.
   */
  recommend(input: DeburringInput): DeburringResult {
    const warnings: string[] = [];
    const iso = input.material_iso_group ?? "P";
    const difficulty = DEBURR_DIFFICULTY[iso] ?? 3;
    const burrHeight = input.burr_height_mm ?? 0.3;
    const edgeBreak = input.edge_break_mm ?? 0.1;
    const batch = input.batch_size ?? 1;
    const hasInternal = input.has_internal_features ?? false;
    const locations = input.burr_locations ?? ["external_edge"];

    // Score each method
    const scores: Array<{
      method: DeburringMethod;
      score: number;
      reason: string;
    }> = [];

    // Cross-hole or internal → thermal or ECM
    const hasCrossHole = locations.includes("cross_hole");
    const hasInternalEdge = locations.includes("internal_edge");

    // Manual — always possible, bad for volume
    scores.push({
      method: "manual",
      score: batch <= 10 ? 70 : Math.max(20, 70 - batch),
      reason: "Universal but labor-intensive",
    });

    // Tumble/vibratory — good for volume external
    if (!hasInternal && !hasCrossHole) {
      scores.push({
        method: "vibratory",
        score: batch >= 20 ? 90 : 50 + batch,
        reason: "Cost-effective for external edges in volume",
      });
      scores.push({
        method: "tumble",
        score: batch >= 50 ? 85 : 40 + batch * 0.5,
        reason: "Barrel tumbling for high volume",
      });
    }

    // Thermal (TEM) — excellent for cross-holes
    if (hasCrossHole || hasInternalEdge) {
      scores.push({
        method: "thermal",
        score: 90,
        reason: "Reaches all surfaces including cross-holes",
      });
    } else {
      scores.push({
        method: "thermal",
        score: 50,
        reason: "Effective but expensive for simple edges",
      });
    }

    // Electrochemical — precision internal
    if (hasInternal || hasInternalEdge) {
      scores.push({
        method: "electrochemical",
        score: 85,
        reason: "Precise internal edge control",
      });
    }

    // Brush — fast external
    if (!hasCrossHole && !hasInternalEdge) {
      scores.push({
        method: "brush",
        score: batch >= 5 ? 75 : 60,
        reason: "Fast CNC-integrated edge break",
      });
    }

    // Abrasive flow — precision internal passages
    if (hasInternal && input.surface_finish_critical) {
      scores.push({
        method: "abrasive_flow",
        score: 80,
        reason: "Precision finish on internal passages",
      });
    }

    // Sort by score
    scores.sort((a, b) => b.score - a.score);
    const best = scores[0];

    // Cycle time
    const baseTime = BASE_CYCLE_TIMES[best.method];
    const diffFactor = 0.5 + difficulty * 0.2;
    const sizeFactor = input.part_size_mm
      ? Math.max(0.5, (input.part_size_mm[0] *
          input.part_size_mm[1] *
          input.part_size_mm[2]) / 500000)
      : 1.0;
    const cycleTime = baseTime * diffFactor * Math.min(sizeFactor, 3);

    // Cost per part
    const baseCost = 0.5; // base manual cost per minute (USD)
    const costPerPart = (cycleTime / 60) * baseCost *
      COST_FACTORS[best.method];

    // Media type
    const media = selectMedia(best.method, iso);

    // Warnings
    if (burrHeight > 1.0) {
      warnings.push(
        "Burr height > 1mm — may require pre-deburring or " +
        "machining adjustment"
      );
    }
    if (edgeBreak > 0.5 && best.method === "vibratory") {
      warnings.push(
        "Edge break > 0.5mm difficult with vibratory — " +
        "consider brush or manual"
      );
    }
    if (difficulty >= 4 && best.method === "tumble") {
      warnings.push(
        "Hard material may require extended tumble cycle"
      );
    }

    return {
      recommended_method: best.method,
      alternative_methods: scores.slice(1, 4).map(s => ({
        method: s.method,
        suitability: s.score >= 70
          ? "excellent" : s.score >= 50
            ? "good" : "marginal",
        reason: s.reason,
      })),
      cycle_time: av(r1(cycleTime), "s", 0.25,
        "Base time × difficulty × size factor"),
      edge_break: av(edgeBreak, "mm", 0.1,
        "Target edge radius/chamfer"),
      cost_per_part: av(r2(costPerPart), "USD", 0.3,
        "Cycle time × rate × method factor"),
      media_type: media,
      warnings,
    };
  }

  /**
   * Calculate mass finishing (tumble/vibratory) parameters.
   */
  massFinish(input: MassFinishInput): MassFinishResult {
    const warnings: string[] = [];
    const iso = input.material_iso_group ?? "P";
    const targetRa = input.target_ra_um ?? 1.6;
    const deburOnly = input.deburr_only ?? false;

    // Media selection
    let mediaType: string;
    let mediaSize: number;
    let compound: string;
    let machineType: string;

    if (deburOnly) {
      mediaType = "ceramic triangles";
      mediaSize = 15;
      compound = "Light cutting compound";
      machineType = "vibratory bowl";
    } else if (targetRa <= 0.4) {
      mediaType = "porcelain balls";
      mediaSize = 6;
      compound = "Burnishing compound";
      machineType = "high-energy centrifugal";
    } else if (targetRa <= 0.8) {
      mediaType = "plastic cones";
      mediaSize = 10;
      compound = "Fine polishing compound";
      machineType = "vibratory trough";
    } else {
      mediaType = "ceramic wedges";
      mediaSize = 20;
      compound = "General-purpose compound";
      machineType = "vibratory bowl";
    }

    // Cycle time
    const difficulty = DEBURR_DIFFICULTY[iso] ?? 3;
    let baseMinutes: number;
    if (deburOnly) {
      baseMinutes = 20;
    } else if (targetRa <= 0.4) {
      baseMinutes = 120;
    } else if (targetRa <= 0.8) {
      baseMinutes = 60;
    } else {
      baseMinutes = 30;
    }
    const cycleMinutes = baseMinutes * (0.5 + difficulty * 0.2);

    // Media-to-part ratio
    const ratio = input.part_size_mm
      ? Math.max(3, 8 - (input.part_size_mm[0] *
          input.part_size_mm[1] *
          input.part_size_mm[2]) / 200000)
      : 5;

    // Predicted Ra
    const predictedRa = deburOnly
      ? targetRa : Math.max(0.1, targetRa * 0.9);

    if (targetRa < 0.2) {
      warnings.push(
        "Ra < 0.2 μm very difficult with mass finishing — " +
        "consider lapping or polishing"
      );
    }

    return {
      media_type: mediaType,
      media_size: av(mediaSize, "mm", 0.1,
        "Selected for target finish"),
      compound,
      cycle_time: av(r1(cycleMinutes), "min", 0.2,
        "Base time × difficulty factor"),
      machine_type: machineType,
      media_to_part_ratio: av(r1(Math.max(ratio, 1)), ":1", 0.15,
        "Volume ratio for part separation"),
      predicted_ra: av(r2(predictedRa), "μm", 0.2,
        "Estimated achievable finish"),
      warnings,
    };
  }
}

// ── Helpers ───────────────────────────────────────────────────────

function selectMedia(
  method: DeburringMethod, iso: string
): string {
  switch (method) {
    case "vibratory":
    case "tumble":
      return iso === "N" ? "plastic media"
        : iso === "H" ? "ceramic high-cut"
          : "ceramic media";
    case "brush":
      return iso === "N" ? "nylon filament"
        : "abrasive nylon brush";
    case "thermal":
      return "oxygen/natural gas mixture";
    case "electrochemical":
      return "NaCl or NaNO₃ electrolyte";
    case "abrasive_flow":
      return "silicon carbide putty";
    case "cryogenic":
      return "liquid nitrogen + polycarbonate shot";
    default:
      return "hand tools / files";
  }
}

function av(
  value: number, unit: string,
  uncertainty: number, source: string
): AtomicValue {
  return { value, unit, uncertainty, source };
}

function r1(n: number): number { return Math.round(n * 10) / 10; }
function r2(n: number): number { return Math.round(n * 100) / 100; }

export const deburringEngine = new DeburringEngine();
