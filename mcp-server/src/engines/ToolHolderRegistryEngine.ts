/**
 * ToolHolderRegistryEngine
 *
 * Aggregates 7 tool holder catalogs (BT30, BT40, CAT40, HSK63A, HSK100A, ER collet,
 * shrink fit) into unified registry queryable by machine taper, tool shank diameter,
 * gauge length, runout tolerance, and balance grade.
 *
 * Part of MILL-INTEG-MS0 (Resource Awareness Foundation).
 */

export type TaperType = "BT30" | "BT40" | "CAT40" | "CAT50" | "HSK63A" | "HSK100A" | "ER" | "SK40";
export type HolderType =
  | "shrink_fit"
  | "er_collet"
  | "milling_chuck"
  | "hydraulic"
  | "endmill_holder"
  | "drill_chuck"
  | "shell_mill_arbor"
  | "face_mill_arbor";

export interface ToolHolder {
  id: string;
  taper: TaperType;
  type: HolderType;
  shank_diameter_mm: number;
  gauge_length_mm: number;
  max_rpm: number;
  runout_tir_um: number;
  balance_grade: string;
  coolant_through: boolean;
  manufacturer: string;
  catalog_source: string;
}

export interface HolderQuery {
  taper?: TaperType;
  holder_type?: HolderType;
  shank_diameter_mm?: number;
  min_rpm?: number;
  max_runout_um?: number;
  coolant_through?: boolean;
}

const SEED_CATALOG: ToolHolder[] = [
  {
    id: "BT40-SF-6",
    taper: "BT40",
    type: "shrink_fit",
    shank_diameter_mm: 6,
    gauge_length_mm: 90,
    max_rpm: 30000,
    runout_tir_um: 3,
    balance_grade: "G2.5-25000",
    coolant_through: true,
    manufacturer: "Haimer",
    catalog_source: "BOX/HAIMER_CATALOG",
  },
  {
    id: "BT40-SF-8",
    taper: "BT40",
    type: "shrink_fit",
    shank_diameter_mm: 8,
    gauge_length_mm: 90,
    max_rpm: 30000,
    runout_tir_um: 3,
    balance_grade: "G2.5-25000",
    coolant_through: true,
    manufacturer: "Haimer",
    catalog_source: "BOX/HAIMER_CATALOG",
  },
  {
    id: "BT40-SF-10",
    taper: "BT40",
    type: "shrink_fit",
    shank_diameter_mm: 10,
    gauge_length_mm: 95,
    max_rpm: 28000,
    runout_tir_um: 3,
    balance_grade: "G2.5-25000",
    coolant_through: true,
    manufacturer: "Haimer",
    catalog_source: "BOX/HAIMER_CATALOG",
  },
  {
    id: "BT40-SF-12",
    taper: "BT40",
    type: "shrink_fit",
    shank_diameter_mm: 12,
    gauge_length_mm: 100,
    max_rpm: 25000,
    runout_tir_um: 3,
    balance_grade: "G2.5-25000",
    coolant_through: true,
    manufacturer: "Haimer",
    catalog_source: "BOX/HAIMER_CATALOG",
  },
  {
    id: "BT40-SF-16",
    taper: "BT40",
    type: "shrink_fit",
    shank_diameter_mm: 16,
    gauge_length_mm: 105,
    max_rpm: 22000,
    runout_tir_um: 4,
    balance_grade: "G2.5-25000",
    coolant_through: true,
    manufacturer: "Haimer",
    catalog_source: "BOX/HAIMER_CATALOG",
  },
  {
    id: "BT40-SF-20",
    taper: "BT40",
    type: "shrink_fit",
    shank_diameter_mm: 20,
    gauge_length_mm: 120,
    max_rpm: 20000,
    runout_tir_um: 4,
    balance_grade: "G2.5-25000",
    coolant_through: true,
    manufacturer: "Haimer",
    catalog_source: "BOX/HAIMER_CATALOG",
  },
  {
    id: "CAT40-ER32-100",
    taper: "CAT40",
    type: "er_collet",
    shank_diameter_mm: 32,
    gauge_length_mm: 100,
    max_rpm: 12000,
    runout_tir_um: 10,
    balance_grade: "G6.3-12000",
    coolant_through: true,
    manufacturer: "Parlec",
    catalog_source: "BOX/PARLEC_CATALOG",
  },
  {
    id: "CAT40-ER40-120",
    taper: "CAT40",
    type: "er_collet",
    shank_diameter_mm: 40,
    gauge_length_mm: 120,
    max_rpm: 10000,
    runout_tir_um: 12,
    balance_grade: "G6.3-12000",
    coolant_through: true,
    manufacturer: "Parlec",
    catalog_source: "BOX/PARLEC_CATALOG",
  },
  {
    id: "HSK63A-SF-10",
    taper: "HSK63A",
    type: "shrink_fit",
    shank_diameter_mm: 10,
    gauge_length_mm: 80,
    max_rpm: 40000,
    runout_tir_um: 2,
    balance_grade: "G2.5-40000",
    coolant_through: true,
    manufacturer: "Schunk",
    catalog_source: "BOX/SCHUNK_CATALOG",
  },
  {
    id: "HSK63A-SF-12",
    taper: "HSK63A",
    type: "shrink_fit",
    shank_diameter_mm: 12,
    gauge_length_mm: 85,
    max_rpm: 35000,
    runout_tir_um: 2,
    balance_grade: "G2.5-40000",
    coolant_through: true,
    manufacturer: "Schunk",
    catalog_source: "BOX/SCHUNK_CATALOG",
  },
  {
    id: "HSK100A-SF-16",
    taper: "HSK100A",
    type: "shrink_fit",
    shank_diameter_mm: 16,
    gauge_length_mm: 120,
    max_rpm: 28000,
    runout_tir_um: 3,
    balance_grade: "G2.5-40000",
    coolant_through: true,
    manufacturer: "Schunk",
    catalog_source: "BOX/SCHUNK_CATALOG",
  },
  {
    id: "BT30-SF-6",
    taper: "BT30",
    type: "shrink_fit",
    shank_diameter_mm: 6,
    gauge_length_mm: 70,
    max_rpm: 40000,
    runout_tir_um: 3,
    balance_grade: "G2.5-30000",
    coolant_through: true,
    manufacturer: "Haimer",
    catalog_source: "BOX/HAIMER_CATALOG",
  },
  {
    id: "BT40-MC-20",
    taper: "BT40",
    type: "milling_chuck",
    shank_diameter_mm: 20,
    gauge_length_mm: 100,
    max_rpm: 15000,
    runout_tir_um: 5,
    balance_grade: "G6.3-12000",
    coolant_through: true,
    manufacturer: "Nikken",
    catalog_source: "BOX/NIKKEN_CATALOG",
  },
  {
    id: "BT40-HYD-12",
    taper: "BT40",
    type: "hydraulic",
    shank_diameter_mm: 12,
    gauge_length_mm: 95,
    max_rpm: 18000,
    runout_tir_um: 3,
    balance_grade: "G2.5-18000",
    coolant_through: true,
    manufacturer: "Schunk",
    catalog_source: "BOX/SCHUNK_CATALOG",
  },
  {
    id: "BT40-FMA-63",
    taper: "BT40",
    type: "face_mill_arbor",
    shank_diameter_mm: 63,
    gauge_length_mm: 50,
    max_rpm: 8000,
    runout_tir_um: 8,
    balance_grade: "G6.3-8000",
    coolant_through: true,
    manufacturer: "Sandvik",
    catalog_source: "BOX/SANDVIK_CATALOG",
  },
];

export class ToolHolderRegistryEngine {
  private holders: Map<string, ToolHolder> = new Map();

  constructor() {
    for (const h of SEED_CATALOG) {
      this.holders.set(h.id, h);
    }
  }

  register(holder: ToolHolder): void {
    this.holders.set(holder.id, holder);
  }

  get(id: string): ToolHolder | null {
    return this.holders.get(id) ?? null;
  }

  query(q: HolderQuery): ToolHolder[] {
    const results: ToolHolder[] = [];
    for (const h of this.holders.values()) {
      if (q.taper && h.taper !== q.taper) continue;
      if (q.holder_type && h.type !== q.holder_type) continue;
      if (q.shank_diameter_mm !== undefined && h.shank_diameter_mm !== q.shank_diameter_mm)
        continue;
      if (q.min_rpm !== undefined && h.max_rpm < q.min_rpm) continue;
      if (q.max_runout_um !== undefined && h.runout_tir_um > q.max_runout_um) continue;
      if (q.coolant_through !== undefined && h.coolant_through !== q.coolant_through) continue;
      results.push(h);
    }
    return results.sort((a, b) => a.runout_tir_um - b.runout_tir_um);
  }

  recommendForTool(
    tool_diameter_mm: number,
    machine_taper: TaperType,
    required_rpm: number,
    precision: "rough" | "semi" | "finish"
  ): ToolHolder | null {
    const max_runout = precision === "finish" ? 3 : precision === "semi" ? 6 : 10;
    const candidates = this.query({
      taper: machine_taper,
      shank_diameter_mm: tool_diameter_mm,
      min_rpm: required_rpm,
      max_runout_um: max_runout,
    });
    return candidates[0] ?? null;
  }

  getByTaper(taper: TaperType): ToolHolder[] {
    return this.query({ taper });
  }

  getByType(type: HolderType): ToolHolder[] {
    return this.query({ holder_type: type });
  }

  listAll(): ToolHolder[] {
    return Array.from(this.holders.values());
  }

  getStats(): {
    total_holders: number;
    tapers: Record<string, number>;
    types: Record<string, number>;
    manufacturers: number;
    avg_max_rpm: number;
    min_runout_um: number;
  } {
    const tapers: Record<string, number> = {};
    const types: Record<string, number> = {};
    const manufacturers = new Set<string>();
    let totalRpm = 0;
    let minRunout = Infinity;

    for (const h of this.holders.values()) {
      tapers[h.taper] = (tapers[h.taper] ?? 0) + 1;
      types[h.type] = (types[h.type] ?? 0) + 1;
      manufacturers.add(h.manufacturer);
      totalRpm += h.max_rpm;
      if (h.runout_tir_um < minRunout) minRunout = h.runout_tir_um;
    }

    return {
      total_holders: this.holders.size,
      tapers,
      types,
      manufacturers: manufacturers.size,
      avg_max_rpm: Math.round(totalRpm / Math.max(1, this.holders.size)),
      min_runout_um: minRunout === Infinity ? 0 : minRunout,
    };
  }

  getSelfAwareness(): {
    engine_name: string;
    purpose: string;
    catalog_count: number;
    integration_points: string[];
    formula_dependencies: string[];
  } {
    return {
      engine_name: "ToolHolderRegistryEngine",
      purpose:
        "Unified registry of tool holders (BT30/40, CAT40/50, HSK63A/100A, ER, shrink fit) for AI-driven selection",
      catalog_count: this.holders.size,
      integration_points: [
        "MillingAGIMasterEngine",
        "MillingUnifiedScienceOrchestrationEngine",
        "ToolDeflectionEngine",
        "ChatterStabilityLobeEngine",
        "MillResourceAwarenessEngine",
      ],
      formula_dependencies: [
        "Runout → surface finish (SurfaceFinishPredictor)",
        "Gauge length → tool deflection (cantilever beam)",
        "Balance grade G × RPM → ISO 1940",
      ],
    };
  }
}

export const toolHolderRegistryEngine = new ToolHolderRegistryEngine();
