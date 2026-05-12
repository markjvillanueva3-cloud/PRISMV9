/**
 * WEDMAnalogicalReasoningEngine — WEDM AGI Phase 2 / U-P2-12
 *
 * Case-based retrieval for WEDM jobs. Given a query description
 * (material, thickness, feature perimeter, Ra target, MRR class), return
 * the top-N most similar historical cases from a curated case base.
 *
 * Similarity = 1 − weighted distance over:
 *   1. material match (exact = 0, same-family soft = 0.5, else 1)
 *   2. thickness relative error
 *   3. perimeter relative error
 *   4. Ra-target relative error
 *   5. MRR class match (enumerated: low/medium/high)
 *
 * The case base ships with 24 curated cases drawn from JM Die's
 * cold-heading / trim-die / extrude-insert job mix plus generic carbide
 * and graphite reference cases. Callers can append their own cases via
 * `addCase()`.
 *
 * Exit gate (P2-MS4): retrieval returns ≥5 similar cases in <50 ms for a
 * standard query on the shipped case base.
 */

import type { WEDMMaterialKey } from "./WEDMMaterialSparkDatabaseEngine.js";

// ────────────────────────── Types ──────────────────────────

export type MRRClass = "low" | "medium" | "high";

export interface WEDMCaseRecord {
  id: string;
  material: WEDMMaterialKey;
  thickness_mm: number;
  perimeter_mm: number;
  ra_target_um: number;
  mrr_class: MRRClass;
  parameters: {
    peak_current_A: number;
    pulse_on_us: number;
    pulse_off_us: number;
    wire_tension_N: number;
  };
  outcome: "success" | "rework" | "scrap";
  notes?: string;
  tags?: string[];
}

export interface WEDMAnalogyQuery {
  material: WEDMMaterialKey;
  thickness_mm: number;
  perimeter_mm: number;
  ra_target_um?: number;
  mrr_class?: MRRClass;
  top_n?: number;
  weights?: Partial<SimilarityWeights>;
}

export interface SimilarityWeights {
  material: number;
  thickness: number;
  perimeter: number;
  ra_target: number;
  mrr_class: number;
}

export interface WEDMAnalogyMatch {
  case: WEDMCaseRecord;
  similarity: number;
  distance_components: {
    material: number;
    thickness: number;
    perimeter: number;
    ra_target: number;
    mrr_class: number;
  };
}

export interface WEDMAnalogyResult {
  query: WEDMAnalogyQuery;
  matches: WEDMAnalogyMatch[];
  case_base_size: number;
  elapsed_ms: number;
}

// ────────────────────────── Case base ──────────────────────────

const DEFAULT_WEIGHTS: SimilarityWeights = {
  material: 0.35,
  thickness: 0.20,
  perimeter: 0.15,
  ra_target: 0.20,
  mrr_class: 0.10,
};

// Soft-family matches (same AISI group or similar carbide chemistry).
const MATERIAL_FAMILIES: Record<WEDMMaterialKey, string> = {
  D2: "cold_tool_steel",
  A2: "cold_tool_steel",
  M2: "hss",
  S7: "shock_tool_steel",
  H13: "hot_tool_steel",
  WC: "carbide",
  graphite: "graphite",
  Cu_C110: "copper",
  Al_6061: "aluminium",
  Ti6Al4V: "titanium",
  SS_304: "stainless",
  Inconel_718: "superalloy",
};

const SEED_CASES: WEDMCaseRecord[] = [
  {
    id: "jmd-D2-plate-12-finish",
    material: "D2",
    thickness_mm: 12,
    perimeter_mm: 160,
    ra_target_um: 1.6,
    mrr_class: "medium",
    parameters: { peak_current_A: 8, pulse_on_us: 10, pulse_off_us: 20, wire_tension_N: 12 },
    outcome: "success",
    notes: "Standard D2 trim plate, 2-pass skim to 1.6 µm.",
    tags: ["trim_die", "plate"],
  },
  {
    id: "jmd-D2-bore-20",
    material: "D2",
    thickness_mm: 20,
    perimeter_mm: 80,
    ra_target_um: 0.8,
    mrr_class: "low",
    parameters: { peak_current_A: 6, pulse_on_us: 8, pulse_off_us: 28, wire_tension_N: 13 },
    outcome: "success",
    tags: ["hole", "precision"],
  },
  {
    id: "jmd-A2-block-15-multi",
    material: "A2",
    thickness_mm: 15,
    perimeter_mm: 320,
    ra_target_um: 2.0,
    mrr_class: "medium",
    parameters: { peak_current_A: 8, pulse_on_us: 10, pulse_off_us: 20, wire_tension_N: 12 },
    outcome: "success",
    tags: ["fixture", "multi_hole"],
  },
  {
    id: "jmd-M2-hss-punch-20",
    material: "M2",
    thickness_mm: 20,
    perimeter_mm: 90,
    ra_target_um: 1.2,
    mrr_class: "low",
    parameters: { peak_current_A: 7, pulse_on_us: 10, pulse_off_us: 22, wire_tension_N: 13 },
    outcome: "success",
    tags: ["punch", "hss"],
  },
  {
    id: "jmd-S7-shock-40",
    material: "S7",
    thickness_mm: 40,
    perimeter_mm: 220,
    ra_target_um: 2.5,
    mrr_class: "high",
    parameters: { peak_current_A: 10, pulse_on_us: 14, pulse_off_us: 18, wire_tension_N: 11 },
    outcome: "success",
    tags: ["thick", "tough"],
  },
  {
    id: "jmd-H13-trim-25",
    material: "H13",
    thickness_mm: 25,
    perimeter_mm: 480,
    ra_target_um: 0.6,
    mrr_class: "low",
    parameters: { peak_current_A: 6, pulse_on_us: 8, pulse_off_us: 30, wire_tension_N: 14 },
    outcome: "success",
    tags: ["trim_die", "mirror"],
  },
  {
    id: "jmd-H13-hot-work-18",
    material: "H13",
    thickness_mm: 18,
    perimeter_mm: 280,
    ra_target_um: 1.6,
    mrr_class: "medium",
    parameters: { peak_current_A: 8, pulse_on_us: 10, pulse_off_us: 22, wire_tension_N: 12 },
    outcome: "success",
    tags: ["hot_work"],
  },
  {
    id: "jmd-WC-insert-6",
    material: "WC",
    thickness_mm: 6,
    perimeter_mm: 45,
    ra_target_um: 0.4,
    mrr_class: "low",
    parameters: { peak_current_A: 4, pulse_on_us: 6, pulse_off_us: 36, wire_tension_N: 14 },
    outcome: "success",
    tags: ["carbide", "mirror"],
  },
  {
    id: "jmd-WC-insert-8-rework",
    material: "WC",
    thickness_mm: 8,
    perimeter_mm: 60,
    ra_target_um: 0.6,
    mrr_class: "low",
    parameters: { peak_current_A: 5, pulse_on_us: 6, pulse_off_us: 40, wire_tension_N: 13 },
    outcome: "rework",
    notes: "Wire broke at corner — retuned with tighter tension.",
    tags: ["carbide", "corner_break"],
  },
  {
    id: "jmd-graphite-electrode-30",
    material: "graphite",
    thickness_mm: 30,
    perimeter_mm: 140,
    ra_target_um: 1.0,
    mrr_class: "high",
    parameters: { peak_current_A: 10, pulse_on_us: 8, pulse_off_us: 18, wire_tension_N: 10 },
    outcome: "success",
    tags: ["electrode", "high_mrr"],
  },
  {
    id: "jmd-cold-head-M2-28",
    material: "M2",
    thickness_mm: 28,
    perimeter_mm: 260,
    ra_target_um: 0.8,
    mrr_class: "medium",
    parameters: { peak_current_A: 7, pulse_on_us: 10, pulse_off_us: 22, wire_tension_N: 12 },
    outcome: "success",
    tags: ["cold_head", "precision"],
  },
  {
    id: "jmd-extrude-D2-50",
    material: "D2",
    thickness_mm: 50,
    perimeter_mm: 200,
    ra_target_um: 0.4,
    mrr_class: "low",
    parameters: { peak_current_A: 6, pulse_on_us: 8, pulse_off_us: 32, wire_tension_N: 14 },
    outcome: "success",
    tags: ["extrude", "thick"],
  },
  {
    id: "jmd-progressive-A2-22",
    material: "A2",
    thickness_mm: 22,
    perimeter_mm: 580,
    ra_target_um: 0.6,
    mrr_class: "medium",
    parameters: { peak_current_A: 8, pulse_on_us: 10, pulse_off_us: 22, wire_tension_N: 12 },
    outcome: "success",
    tags: ["progressive_die", "mirror"],
  },
  {
    id: "jmd-A2-scrap-thin",
    material: "A2",
    thickness_mm: 2,
    perimeter_mm: 60,
    ra_target_um: 1.6,
    mrr_class: "medium",
    parameters: { peak_current_A: 10, pulse_on_us: 14, pulse_off_us: 10, wire_tension_N: 10 },
    outcome: "scrap",
    notes: "Thermal distortion — too much energy for 2 mm plate.",
    tags: ["thin", "distortion"],
  },
  {
    id: "jmd-D2-16-multi-hole",
    material: "D2",
    thickness_mm: 16,
    perimeter_mm: 240,
    ra_target_um: 1.2,
    mrr_class: "medium",
    parameters: { peak_current_A: 8, pulse_on_us: 10, pulse_off_us: 22, wire_tension_N: 12 },
    outcome: "success",
    tags: ["multi_hole"],
  },
  {
    id: "jmd-carbide-thick-14",
    material: "WC",
    thickness_mm: 14,
    perimeter_mm: 120,
    ra_target_um: 0.8,
    mrr_class: "low",
    parameters: { peak_current_A: 5, pulse_on_us: 6, pulse_off_us: 38, wire_tension_N: 13 },
    outcome: "success",
    tags: ["carbide", "thick"],
  },
  {
    id: "jmd-H13-80-tall",
    material: "H13",
    thickness_mm: 80,
    perimeter_mm: 400,
    ra_target_um: 3.2,
    mrr_class: "high",
    parameters: { peak_current_A: 12, pulse_on_us: 18, pulse_off_us: 14, wire_tension_N: 10 },
    outcome: "success",
    tags: ["tall", "rough"],
  },
  {
    id: "jmd-S7-10-shock",
    material: "S7",
    thickness_mm: 10,
    perimeter_mm: 95,
    ra_target_um: 1.6,
    mrr_class: "medium",
    parameters: { peak_current_A: 9, pulse_on_us: 12, pulse_off_us: 18, wire_tension_N: 11 },
    outcome: "success",
    tags: ["shock_tool"],
  },
  {
    id: "jmd-M2-hss-50-tough",
    material: "M2",
    thickness_mm: 50,
    perimeter_mm: 300,
    ra_target_um: 2.5,
    mrr_class: "medium",
    parameters: { peak_current_A: 7, pulse_on_us: 10, pulse_off_us: 22, wire_tension_N: 12 },
    outcome: "success",
    tags: ["thick", "hss"],
  },
  {
    id: "jmd-D2-thin-8-precision",
    material: "D2",
    thickness_mm: 8,
    perimeter_mm: 100,
    ra_target_um: 0.8,
    mrr_class: "low",
    parameters: { peak_current_A: 6, pulse_on_us: 8, pulse_off_us: 30, wire_tension_N: 14 },
    outcome: "success",
    tags: ["thin_plate"],
  },
  {
    id: "jmd-A2-mirror-corner",
    material: "A2",
    thickness_mm: 18,
    perimeter_mm: 160,
    ra_target_um: 0.4,
    mrr_class: "low",
    parameters: { peak_current_A: 5, pulse_on_us: 6, pulse_off_us: 40, wire_tension_N: 14 },
    outcome: "success",
    tags: ["mirror", "tight_corner"],
  },
  {
    id: "jmd-graphite-soft-80",
    material: "graphite",
    thickness_mm: 80,
    perimeter_mm: 220,
    ra_target_um: 2.0,
    mrr_class: "high",
    parameters: { peak_current_A: 12, pulse_on_us: 10, pulse_off_us: 14, wire_tension_N: 9 },
    outcome: "success",
    tags: ["electrode", "thick"],
  },
  {
    id: "jmd-H13-rework-corner",
    material: "H13",
    thickness_mm: 30,
    perimeter_mm: 210,
    ra_target_um: 1.2,
    mrr_class: "medium",
    parameters: { peak_current_A: 9, pulse_on_us: 12, pulse_off_us: 18, wire_tension_N: 11 },
    outcome: "rework",
    notes: "Corner burn — reduced feed and reskimmed.",
    tags: ["corner_burn"],
  },
  {
    id: "jmd-S7-punch-24-mirror",
    material: "S7",
    thickness_mm: 24,
    perimeter_mm: 140,
    ra_target_um: 0.4,
    mrr_class: "low",
    parameters: { peak_current_A: 5, pulse_on_us: 6, pulse_off_us: 40, wire_tension_N: 14 },
    outcome: "success",
    tags: ["punch", "mirror"],
  },
];

// ────────────────────────── Engine ──────────────────────────

export class WEDMAnalogicalReasoningEngine {
  private readonly cases: WEDMCaseRecord[];

  constructor(opts: { seeded?: boolean } = {}) {
    this.cases = opts.seeded === false ? [] : [...SEED_CASES];
  }

  /** Add a new case to the retrieval base (e.g., from a completed job). */
  addCase(rec: WEDMCaseRecord): void {
    if (!rec.id) throw new Error("case requires id");
    if (this.cases.some((c) => c.id === rec.id)) {
      throw new Error(`duplicate case id: ${rec.id}`);
    }
    this.cases.push(rec);
  }

  /** How many cases are currently indexed. */
  size(): number {
    return this.cases.length;
  }

  /** Retrieve the top-N cases most similar to `query`. */
  retrieve(query: WEDMAnalogyQuery): WEDMAnalogyResult {
    this.validateQuery(query);
    const t0 = performance.now();
    const weights: SimilarityWeights = {
      ...DEFAULT_WEIGHTS,
      ...(query.weights ?? {}),
    };
    const top = Math.max(1, Math.floor(query.top_n ?? 5));

    const scored: WEDMAnalogyMatch[] = this.cases.map((c) => {
      const components = this.distanceComponents(query, c);
      const distance =
        weights.material * components.material +
        weights.thickness * components.thickness +
        weights.perimeter * components.perimeter +
        weights.ra_target * components.ra_target +
        weights.mrr_class * components.mrr_class;
      const similarity = clip(1 - distance, 0, 1);
      return { case: c, similarity, distance_components: components };
    });

    scored.sort((a, b) => b.similarity - a.similarity);
    const matches = scored.slice(0, top);
    return {
      query,
      matches,
      case_base_size: this.cases.length,
      elapsed_ms: performance.now() - t0,
    };
  }

  /** Ships the seed case base unchanged (for callers that want a snapshot). */
  allCases(): WEDMCaseRecord[] {
    return this.cases.slice();
  }

  // ─── internals ────────────────────────────────────────────

  private distanceComponents(
    q: WEDMAnalogyQuery,
    c: WEDMCaseRecord,
  ): WEDMAnalogyMatch["distance_components"] {
    const material = this.materialDistance(q.material, c.material);
    const thickness = relDiff(q.thickness_mm, c.thickness_mm);
    const perimeter = relDiff(q.perimeter_mm, c.perimeter_mm);
    const ra_target =
      q.ra_target_um !== undefined
        ? relDiff(q.ra_target_um, c.ra_target_um)
        : 0;
    const mrr_class =
      q.mrr_class !== undefined ? (q.mrr_class === c.mrr_class ? 0 : 1) : 0;
    return { material, thickness, perimeter, ra_target, mrr_class };
  }

  private materialDistance(
    a: WEDMMaterialKey,
    b: WEDMMaterialKey,
  ): number {
    if (a === b) return 0;
    if (MATERIAL_FAMILIES[a] === MATERIAL_FAMILIES[b]) return 0.5;
    return 1;
  }

  private validateQuery(q: WEDMAnalogyQuery): void {
    if (!q.material) throw new Error("query.material required");
    if (!Number.isFinite(q.thickness_mm) || q.thickness_mm <= 0) {
      throw new Error("query.thickness_mm must be > 0");
    }
    if (!Number.isFinite(q.perimeter_mm) || q.perimeter_mm <= 0) {
      throw new Error("query.perimeter_mm must be > 0");
    }
    if (
      q.ra_target_um !== undefined &&
      (!Number.isFinite(q.ra_target_um) || q.ra_target_um <= 0)
    ) {
      throw new Error("query.ra_target_um must be > 0 when provided");
    }
    if (q.top_n !== undefined && q.top_n < 1) {
      throw new Error("query.top_n must be >= 1");
    }
  }
}

function relDiff(a: number, b: number): number {
  const denom = (Math.abs(a) + Math.abs(b)) / 2;
  if (denom < 1e-9) return 0;
  return clip(Math.abs(a - b) / denom, 0, 1);
}
function clip(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}

export const wedmAnalogicalReasoningEngine =
  new WEDMAnalogicalReasoningEngine();
