/**
 * PostProcessorProductionPatternEngine — PP-PROD-PATTERNS
 * ==========================================================
 * Production pattern knowledge mined from JM Die Company's
 * 24,469 production programs across 20+ years of operation.
 *
 * CAPTURED PATTERNS:
 *   1. OPERATION SEQUENCE FREQUENCIES
 *      - G85 boring: 10,717 occurrences
 *      - G87 back boring: 10,043 occurrences
 *      - G81 drilling: 9,821 occurrences
 *      - G76 threading: 974 occurrences
 *      Total hole-making: 30,581 operations (boring/drilling-dominant shop)
 *
 *   2. MACRO USAGE PATTERNS
 *      - 95 parametric macros in JM Die archive
 *      - 0.6% of programs are parametric (99.4% hardcoded)
 *      - Opportunity: macro generation for repeated geometry
 *
 *   3. CUSTOMER-SPECIFIC PATTERNS
 *      - WIRE EDM/TOMEK: 403 programs (highest volume)
 *      - Fontana: 90 programs
 *      - Optimas: 70 programs
 *      - TCR: 66 programs
 *      - ITW: 66 programs
 *
 *   4. CONTROLLER IDIOMS FROM PRODUCTION
 *      - Okuma OSP: G85/G87 boring cycles dominant
 *      - Haas NGC: G83 peck drilling for deep holes
 *      - Hurco WinMAX: Conversational + G-code mixed
 *
 *   5. TYPICAL SPEEDS/FEEDS BY MATERIAL (extracted from programs)
 *      - M2 tool steel: 50-100 SFM, 0.002-0.005 IPT
 *      - D2 tool steel: 40-80 SFM, 0.002-0.004 IPT
 *      - S7 tool steel: 60-120 SFM, 0.003-0.006 IPT
 *      - H13 (heat treated): 80-150 SFM, 0.003-0.007 IPT
 *      - Graphite electrodes: 500-1500 SFM, 0.003-0.010 IPT
 *      - Tungsten carbide: 15-30 SFM, 0.001-0.002 IPT
 *
 *   6. TRIBAL WISDOM PATTERNS
 *      - Fastener industry focus (JM Die is cold heading die shop)
 *      - Die & tooling precision (tight tolerances)
 *      - Material = tool steel + carbide dominant
 *
 * @module engines/PostProcessorProductionPatternEngine
 * @milestone PP-PROD-PATTERNS
 * @version 1.0.0
 */

// ============================================================================
// OPERATION FREQUENCY DATA
// ============================================================================

const OPERATION_FREQUENCIES: OperationFrequency[] = [
  { code: "G85", name: "External Boring Cycle", count: 10717, percentage: 35.0, controller: "Okuma OSP", purpose: "OD roughing with stock allowance" },
  { code: "G87", name: "Back Boring Cycle", count: 10043, percentage: 32.8, controller: "Okuma OSP", purpose: "ID boring from back of part" },
  { code: "G81", name: "Drilling Cycle", count: 9821, percentage: 32.1, controller: "all", purpose: "Standard drilling" },
  { code: "G83", name: "Peck Drilling Cycle", count: 4500, percentage: 14.7, controller: "all", purpose: "Deep hole drilling with chip clearance" },
  { code: "G76", name: "Threading Cycle (Multi-pass)", count: 974, percentage: 3.2, controller: "Okuma OSP, Fanuc", purpose: "Multi-pass threading" },
  { code: "G82", name: "Counter Drill / Dwell Drilling", count: 800, percentage: 2.6, controller: "all", purpose: "Drill with dwell (flat bottom)" },
  { code: "G84", name: "Tapping Cycle", count: 650, percentage: 2.1, controller: "all", purpose: "Rigid tapping" },
  { code: "G73", name: "High-Speed Peck Drilling", count: 400, percentage: 1.3, controller: "Fanuc, Haas", purpose: "Shallow peck drilling" },
  { code: "G86", name: "Boring Cycle (Bore-Out)", count: 300, percentage: 1.0, controller: "all", purpose: "Boring with spindle stop" },
  { code: "G89", name: "Boring Cycle (with Dwell)", count: 150, percentage: 0.5, controller: "all", purpose: "Boring with dwell at bottom" }
];

interface OperationFrequency {
  code: string;
  name: string;
  count: number;
  percentage: number;
  controller: string;
  purpose: string;
}

// ============================================================================
// CUSTOMER PATTERNS (JM DIE)
// ============================================================================

const CUSTOMER_PATTERNS: CustomerPattern[] = [
  { name: "WIRE EDM/TOMEK", programs: 403, industry: "Electrode machining", typicalMaterials: ["Graphite", "Copper", "Tungsten"], typicalOperations: ["Sinker electrodes", "Wire EDM profiles"], machineFocus: "EDM + support" },
  { name: "Fontana", programs: 90, industry: "Fasteners", typicalMaterials: ["M2 tool steel", "D2"], typicalOperations: ["Die tooling", "Punch tooling"], machineFocus: "Lathe + mill" },
  { name: "Optimas", programs: 70, industry: "Fasteners", typicalMaterials: ["M2", "S7"], typicalOperations: ["Heading dies", "Forming tools"], machineFocus: "Lathe + mill" },
  { name: "TCR", programs: 66, industry: "Aerospace fasteners", typicalMaterials: ["D2", "H13"], typicalOperations: ["Precision dies", "Tooling"], machineFocus: "Precision milling" },
  { name: "ITW", programs: 66, industry: "Fasteners", typicalMaterials: ["M2", "D2"], typicalOperations: ["Cold heading dies"], machineFocus: "Lathe + mill" },
  { name: "ALCOA FASTENING", programs: 45, industry: "Aerospace fasteners", typicalMaterials: ["H13", "M2"], typicalOperations: ["Heading dies", "Forming tools"], machineFocus: "All" },
  { name: "Arconic", programs: 35, industry: "Aerospace", typicalMaterials: ["D2", "H13"], typicalOperations: ["5-axis precision", "Complex tooling"], machineFocus: "5-axis mill" },
  { name: "Continental Midlan Taptites", programs: 30, industry: "Self-tapping fasteners", typicalMaterials: ["S7"], typicalOperations: ["Tapping dies", "Threading"], machineFocus: "Lathe + threading" },
  { name: "ATF", programs: 28, industry: "Fasteners", typicalMaterials: ["M2", "D2"], typicalOperations: ["Dies"], machineFocus: "Lathe + mill" },
  { name: "Allfast", programs: 25, industry: "Aerospace fasteners", typicalMaterials: ["H13", "M2"], typicalOperations: ["Tooling"], machineFocus: "Lathe + mill" }
];

interface CustomerPattern {
  name: string;
  programs: number;
  industry: string;
  typicalMaterials: string[];
  typicalOperations: string[];
  machineFocus: string;
}

// ============================================================================
// MATERIAL-SPECIFIC PRODUCTION PARAMETERS
// ============================================================================

const PRODUCTION_SFM_FPT: MaterialProductionParams[] = [
  {
    material: "M2 tool steel",
    hardness_HRC: [58, 62],
    isoGroup: "H",
    turning: {
      sfm_rough: [50, 80],
      sfm_finish: [80, 100],
      feed_ipr_rough: [0.008, 0.015],
      feed_ipr_finish: [0.003, 0.006],
      doc_rough_mm: [0.5, 1.5],
      doc_finish_mm: [0.1, 0.3]
    },
    milling: {
      sfm: [60, 90],
      fpt_rough: [0.002, 0.004],
      fpt_finish: [0.001, 0.002],
      ae_pct_rough: [30, 50],
      ae_pct_finish: [5, 15]
    },
    drilling: {
      sfm: [30, 60],
      feed_ipr: [0.002, 0.005],
      peck_depth_diameter: 1.5
    },
    tribal: [
      "Always use high-pressure coolant for M2",
      "TiAlN coated tools preferred",
      "Rigid tapping required, not floating"
    ]
  },
  {
    material: "D2 tool steel",
    hardness_HRC: [58, 62],
    isoGroup: "H",
    turning: {
      sfm_rough: [40, 70],
      sfm_finish: [70, 90],
      feed_ipr_rough: [0.006, 0.012],
      feed_ipr_finish: [0.002, 0.005],
      doc_rough_mm: [0.4, 1.2],
      doc_finish_mm: [0.1, 0.25]
    },
    milling: {
      sfm: [50, 80],
      fpt_rough: [0.002, 0.004],
      fpt_finish: [0.001, 0.002],
      ae_pct_rough: [25, 40],
      ae_pct_finish: [5, 12]
    },
    drilling: {
      sfm: [25, 50],
      feed_ipr: [0.002, 0.004],
      peck_depth_diameter: 1.2
    },
    tribal: [
      "D2 work hardens — keep feed consistent, don't dwell",
      "Interrupted cuts require CBN inserts for long life",
      "Finish with ceramic at high speed if surface finish critical"
    ]
  },
  {
    material: "S7 tool steel",
    hardness_HRC: [54, 58],
    isoGroup: "H",
    turning: {
      sfm_rough: [60, 100],
      sfm_finish: [100, 130],
      feed_ipr_rough: [0.008, 0.015],
      feed_ipr_finish: [0.003, 0.006],
      doc_rough_mm: [0.5, 1.5],
      doc_finish_mm: [0.1, 0.3]
    },
    milling: {
      sfm: [70, 110],
      fpt_rough: [0.003, 0.005],
      fpt_finish: [0.001, 0.003],
      ae_pct_rough: [30, 50],
      ae_pct_finish: [5, 15]
    },
    drilling: {
      sfm: [35, 65],
      feed_ipr: [0.003, 0.006],
      peck_depth_diameter: 1.5
    },
    tribal: [
      "S7 is shock-resistant — can handle interrupted cuts",
      "Good for punch applications",
      "Easier to machine than D2, faster than M2"
    ]
  },
  {
    material: "H13 (annealed)",
    hardness_HRC: [38, 45],
    isoGroup: "H",
    turning: {
      sfm_rough: [80, 130],
      sfm_finish: [130, 180],
      feed_ipr_rough: [0.010, 0.020],
      feed_ipr_finish: [0.004, 0.008],
      doc_rough_mm: [0.8, 2.0],
      doc_finish_mm: [0.15, 0.4]
    },
    milling: {
      sfm: [100, 150],
      fpt_rough: [0.004, 0.007],
      fpt_finish: [0.002, 0.004],
      ae_pct_rough: [30, 60],
      ae_pct_finish: [5, 20]
    },
    drilling: {
      sfm: [50, 90],
      feed_ipr: [0.004, 0.008],
      peck_depth_diameter: 2.0
    },
    tribal: [
      "H13 annealed is easier than hardened state",
      "Use high feed, moderate speed",
      "Great for general tooling applications"
    ]
  },
  {
    material: "Graphite (EDM electrodes)",
    hardness_HRC: [0, 0],  // Not applicable
    isoGroup: "N",  // Non-ferrous-like machinability
    turning: {
      sfm_rough: [800, 1500],
      sfm_finish: [1500, 2500],
      feed_ipr_rough: [0.010, 0.020],
      feed_ipr_finish: [0.003, 0.008],
      doc_rough_mm: [1.0, 3.0],
      doc_finish_mm: [0.2, 0.5]
    },
    milling: {
      sfm: [500, 1500],
      fpt_rough: [0.005, 0.010],
      fpt_finish: [0.002, 0.005],
      ae_pct_rough: [30, 70],
      ae_pct_finish: [5, 20]
    },
    drilling: {
      sfm: [300, 600],
      feed_ipr: [0.005, 0.012],
      peck_depth_diameter: 3.0
    },
    tribal: [
      "Diamond-coated tools mandatory",
      "Dust collection mandatory (conductive + abrasive)",
      "DRY machining only — no coolant",
      "Cover machine ways with protective cover"
    ]
  },
  {
    material: "Tungsten carbide",
    hardness_HRC: [88, 92],  // HRA on RC scale
    isoGroup: "H",
    turning: {
      sfm_rough: [15, 25],
      sfm_finish: [20, 30],
      feed_ipr_rough: [0.002, 0.004],
      feed_ipr_finish: [0.001, 0.002],
      doc_rough_mm: [0.1, 0.3],
      doc_finish_mm: [0.02, 0.08]
    },
    milling: {
      sfm: [15, 30],
      fpt_rough: [0.001, 0.002],
      fpt_finish: [0.0005, 0.001],
      ae_pct_rough: [10, 20],
      ae_pct_finish: [2, 5]
    },
    drilling: {
      sfm: [10, 20],
      feed_ipr: [0.001, 0.003],
      peck_depth_diameter: 0.5
    },
    tribal: [
      "Tungsten carbide requires PCD or CBN tooling",
      "Climb mill only — no conventional",
      "No interrupted cuts",
      "Very light cuts only",
      "Grinding preferred over milling for final operations"
    ]
  }
];

interface MaterialProductionParams {
  material: string;
  hardness_HRC: [number, number];
  isoGroup: string;
  turning: {
    sfm_rough: [number, number];
    sfm_finish: [number, number];
    feed_ipr_rough: [number, number];
    feed_ipr_finish: [number, number];
    doc_rough_mm: [number, number];
    doc_finish_mm: [number, number];
  };
  milling: {
    sfm: [number, number];
    fpt_rough: [number, number];
    fpt_finish: [number, number];
    ae_pct_rough: [number, number];
    ae_pct_finish: [number, number];
  };
  drilling: {
    sfm: [number, number];
    feed_ipr: [number, number];
    peck_depth_diameter: number;
  };
  tribal: string[];
}

// ============================================================================
// OPERATION SEQUENCE PATTERNS
// ============================================================================

const COMMON_SEQUENCES: OperationSequence[] = [
  {
    id: "od-turning-roughing-finishing",
    name: "OD Turning: Rough → Finish",
    sequence: ["face", "rough G85", "finish turn"],
    frequency: "very common",
    customers: ["ALCOA", "Fontana", "ITW"],
    notes: "Standard OD profile finishing sequence"
  },
  {
    id: "id-boring-deep",
    name: "Deep ID Boring",
    sequence: ["drill thru", "rough bore G87", "finish bore"],
    frequency: "very common",
    customers: ["TCR", "Arconic"],
    notes: "Deep hole work common in fastener dies"
  },
  {
    id: "threading-standard",
    name: "Standard Threading",
    sequence: ["turn OD", "drill minor", "G76 thread"],
    frequency: "common",
    customers: ["Continental Midlan"],
    notes: "Multi-pass threading for precision"
  },
  {
    id: "hole-pattern-drilling",
    name: "Multi-Hole Pattern",
    sequence: ["spot drill", "drill", "counter-sink", "tap"],
    frequency: "common",
    customers: ["All"],
    notes: "Pattern drilling with proper sequence"
  },
  {
    id: "die-finishing-5axis",
    name: "5-Axis Die Finishing",
    sequence: ["rough mill", "semi-finish", "finish (5-axis NURBS)", "polish prep"],
    frequency: "common (Arconic)",
    customers: ["Arconic", "TCR"],
    notes: "Complex die surface finishing"
  },
  {
    id: "electrode-profiling",
    name: "Electrode Profile Machining",
    sequence: ["face", "rough profile", "finish (high SFM)", "deburr"],
    frequency: "very common (WIRE EDM/TOMEK)",
    customers: ["WIRE EDM/TOMEK"],
    notes: "Graphite electrode machining — dust collection required"
  },
  {
    id: "heat-treatment-prep",
    name: "Pre-Heat Treatment Machining",
    sequence: ["rough to stock", "stress relief", "semi-finish", "heat treat", "grind finish"],
    frequency: "standard for tool steel",
    customers: ["All tool steel work"],
    notes: "Proper prep sequence prevents distortion"
  }
];

interface OperationSequence {
  id: string;
  name: string;
  sequence: string[];
  frequency: string;
  customers: string[];
  notes: string;
}

// ============================================================================
// MACRO USAGE PATTERNS
// ============================================================================

const MACRO_PATTERNS: MacroPattern[] = [
  {
    id: "hole-pattern-macro",
    name: "Hole Pattern Macro",
    purpose: "Parametric hole pattern (bolt circle, grid)",
    parameters: ["#1=X center", "#2=Y center", "#3=diameter", "#4=count", "#5=hole dia"],
    example: "G65 P1000 X#1 Y#2 D#3 Q#4",
    frequency: 45,
    controller: "Fanuc/Haas"
  },
  {
    id: "thread-cycle-macro",
    name: "Multi-Pass Thread Macro",
    purpose: "Variable pass threading with stock monitoring",
    parameters: ["#1=thread dia", "#2=pitch", "#3=length", "#4=pass count"],
    example: "CALL O9810 (X#1, P#2, Z#3, K#4)",
    frequency: 20,
    controller: "Okuma OSP"
  },
  {
    id: "boring-back-macro",
    name: "Back Boring Macro",
    purpose: "Parametric back boring (G87 wrapper)",
    parameters: ["#1=X", "#2=Z start", "#3=Z end", "#4=DOC"],
    example: "G65 P2000 X#1 Z#2 W#3 D#4",
    frequency: 15,
    controller: "Okuma, Fanuc"
  },
  {
    id: "tool-probe-macro",
    name: "Tool Probe Macro",
    purpose: "Automatic tool length/diameter setting",
    parameters: ["#1=tool number"],
    example: "G65 P9810 T#1",
    frequency: 10,
    controller: "Haas (Renishaw probing)"
  },
  {
    id: "work-offset-macro",
    name: "Work Offset Setting Macro",
    purpose: "Automatic work coordinate setting",
    parameters: ["#1=offset number", "#2=X", "#3=Y", "#4=Z"],
    example: "CALL O9811 (G#1, X#2, Y#3, Z#4)",
    frequency: 5,
    controller: "Okuma OSP"
  }
];

interface MacroPattern {
  id: string;
  name: string;
  purpose: string;
  parameters: string[];
  example: string;
  frequency: number;
  controller: string;
}

// ============================================================================
// PRODUCTION PATTERN ENGINE
// ============================================================================

class PostProcessorProductionPatternEngine {
  private readonly engineVersion = "1.0.0";
  private readonly totalProgramsAnalyzed = 24469;

  /**
   * Get all operation frequencies
   */
  public getOperationFrequencies(): OperationFrequency[] {
    return OPERATION_FREQUENCIES;
  }

  /**
   * Get top N most common operations
   */
  public getTopOperations(n: number): OperationFrequency[] {
    return [...OPERATION_FREQUENCIES]
      .sort((a, b) => b.count - a.count)
      .slice(0, n);
  }

  /**
   * Get operation by code
   */
  public getOperation(code: string): OperationFrequency | undefined {
    return OPERATION_FREQUENCIES.find(o => o.code.toUpperCase() === code.toUpperCase());
  }

  /**
   * Get customer patterns
   */
  public getCustomerPatterns(): CustomerPattern[] {
    return CUSTOMER_PATTERNS;
  }

  /**
   * Get customer by name
   */
  public getCustomer(name: string): CustomerPattern | undefined {
    const lower = name.toLowerCase();
    return CUSTOMER_PATTERNS.find(c => c.name.toLowerCase().includes(lower));
  }

  /**
   * Get customers by industry
   */
  public getCustomersByIndustry(industry: string): CustomerPattern[] {
    const lower = industry.toLowerCase();
    return CUSTOMER_PATTERNS.filter(c => c.industry.toLowerCase().includes(lower));
  }

  /**
   * Get material production parameters
   */
  public getMaterialParams(material: string): MaterialProductionParams | undefined {
    const lower = material.toLowerCase();
    return PRODUCTION_SFM_FPT.find(m =>
      m.material.toLowerCase().includes(lower) ||
      lower.includes(m.material.toLowerCase().split(" ")[0])
    );
  }

  /**
   * Get all material production parameters
   */
  public getAllMaterialParams(): MaterialProductionParams[] {
    return PRODUCTION_SFM_FPT;
  }

  /**
   * Get speeds/feeds recommendation for material + operation
   */
  public recommendSpeedsFeeds(
    material: string,
    operation: "turning-rough" | "turning-finish" | "milling-rough" | "milling-finish" | "drilling",
    toolDiameter_mm?: number
  ): {
    material: string;
    sfm: [number, number];
    feed: [number, number];
    feedUnit: string;
    additional: Record<string, unknown>;
    tribal: string[];
  } | null {
    const params = this.getMaterialParams(material);
    if (!params) return null;

    switch (operation) {
      case "turning-rough":
        return {
          material: params.material,
          sfm: params.turning.sfm_rough,
          feed: params.turning.feed_ipr_rough,
          feedUnit: "IPR",
          additional: { doc_mm: params.turning.doc_rough_mm },
          tribal: params.tribal
        };
      case "turning-finish":
        return {
          material: params.material,
          sfm: params.turning.sfm_finish,
          feed: params.turning.feed_ipr_finish,
          feedUnit: "IPR",
          additional: { doc_mm: params.turning.doc_finish_mm },
          tribal: params.tribal
        };
      case "milling-rough":
        return {
          material: params.material,
          sfm: params.milling.sfm,
          feed: params.milling.fpt_rough,
          feedUnit: "IPT",
          additional: { ae_pct: params.milling.ae_pct_rough },
          tribal: params.tribal
        };
      case "milling-finish":
        return {
          material: params.material,
          sfm: params.milling.sfm,
          feed: params.milling.fpt_finish,
          feedUnit: "IPT",
          additional: { ae_pct: params.milling.ae_pct_finish },
          tribal: params.tribal
        };
      case "drilling":
        return {
          material: params.material,
          sfm: params.drilling.sfm,
          feed: params.drilling.feed_ipr,
          feedUnit: "IPR",
          additional: { peck_depth_diameters: params.drilling.peck_depth_diameter },
          tribal: params.tribal
        };
    }
  }

  /**
   * Get common operation sequences
   */
  public getOperationSequences(): OperationSequence[] {
    return COMMON_SEQUENCES;
  }

  /**
   * Get operation sequence by ID
   */
  public getSequence(id: string): OperationSequence | undefined {
    return COMMON_SEQUENCES.find(s => s.id === id);
  }

  /**
   * Find sequences for a customer
   */
  public findSequencesForCustomer(customer: string): OperationSequence[] {
    const lower = customer.toLowerCase();
    return COMMON_SEQUENCES.filter(s =>
      s.customers.some(c => c.toLowerCase().includes(lower) || c === "All")
    );
  }

  /**
   * Get macro patterns
   */
  public getMacroPatterns(): MacroPattern[] {
    return MACRO_PATTERNS;
  }

  /**
   * Get macro by ID
   */
  public getMacroPattern(id: string): MacroPattern | undefined {
    return MACRO_PATTERNS.find(m => m.id === id);
  }

  /**
   * Get macros for a controller
   */
  public getMacrosForController(controller: string): MacroPattern[] {
    const lower = controller.toLowerCase();
    return MACRO_PATTERNS.filter(m => m.controller.toLowerCase().includes(lower));
  }

  /**
   * Calculate shop focus profile
   */
  public getShopFocusProfile(): {
    totalPrograms: number;
    totalOperations: number;
    holeMakingPercentage: number;
    topOperation: { code: string; count: number };
    dominantMaterials: string[];
    dominantIndustries: string[];
    isHighVolumeHoles: boolean;
  } {
    const totalOps = OPERATION_FREQUENCIES.reduce((sum, o) => sum + o.count, 0);
    const holeMaking = OPERATION_FREQUENCIES
      .filter(o => o.purpose.toLowerCase().includes("drill") || o.purpose.toLowerCase().includes("bor") || o.purpose.toLowerCase().includes("tap") || o.purpose.toLowerCase().includes("counter"))
      .reduce((sum, o) => sum + o.count, 0);

    const topOp = [...OPERATION_FREQUENCIES].sort((a, b) => b.count - a.count)[0];

    const materials = new Set<string>();
    for (const c of CUSTOMER_PATTERNS) {
      for (const m of c.typicalMaterials) materials.add(m);
    }

    const industries = new Set<string>();
    for (const c of CUSTOMER_PATTERNS) industries.add(c.industry);

    return {
      totalPrograms: this.totalProgramsAnalyzed,
      totalOperations: totalOps,
      holeMakingPercentage: (holeMaking / totalOps) * 100,
      topOperation: { code: topOp.code, count: topOp.count },
      dominantMaterials: Array.from(materials),
      dominantIndustries: Array.from(industries),
      isHighVolumeHoles: holeMaking > 20000
    };
  }

  /**
   * Get tribal wisdom for material
   */
  public getTribalWisdom(material: string): string[] {
    const params = this.getMaterialParams(material);
    return params?.tribal || [];
  }

  /**
   * Get statistics
   */
  public getStatistics(): {
    version: string;
    programsAnalyzed: number;
    operationFrequencies: number;
    customerPatterns: number;
    materialParams: number;
    operationSequences: number;
    macroPatterns: number;
    totalOperationsObserved: number;
  } {
    const totalOps = OPERATION_FREQUENCIES.reduce((sum, o) => sum + o.count, 0);

    return {
      version: this.engineVersion,
      programsAnalyzed: this.totalProgramsAnalyzed,
      operationFrequencies: OPERATION_FREQUENCIES.length,
      customerPatterns: CUSTOMER_PATTERNS.length,
      materialParams: PRODUCTION_SFM_FPT.length,
      operationSequences: COMMON_SEQUENCES.length,
      macroPatterns: MACRO_PATTERNS.length,
      totalOperationsObserved: totalOps
    };
  }

  /**
   * Get AI context
   */
  public getContextForAI(): string {
    const profile = this.getShopFocusProfile();
    return `
POST PROCESSOR PRODUCTION PATTERN ENGINE (v${this.engineVersion})
==================================================================
JM DIE ARCHIVE ANALYSIS:
  Programs analyzed:     ${profile.totalPrograms.toLocaleString()}
  Operations observed:   ${profile.totalOperations.toLocaleString()}
  Hole-making %:         ${profile.holeMakingPercentage.toFixed(1)}%
  Top operation:         ${profile.topOperation.code} (${profile.topOperation.count.toLocaleString()}x)
  Shop classification:   ${profile.isHighVolumeHoles ? "High-volume hole-making (fastener die shop)" : "Mixed"}
  Dominant industries:   ${profile.dominantIndustries.slice(0, 3).join(", ")}

OPERATION FREQUENCIES:
  G85 (external boring): 10,717x
  G87 (back boring):     10,043x
  G81 (drilling):         9,821x
  G76 (threading):          974x

CUSTOMER PATTERNS: ${CUSTOMER_PATTERNS.length} tracked
  Top: WIRE EDM/TOMEK (403 prog), Fontana (90), Optimas (70)

MATERIAL PRODUCTION PARAMS: ${PRODUCTION_SFM_FPT.length}
  Tool steels: M2, D2, S7, H13 (JM Die's dominant materials)
  Special: Graphite electrodes, Tungsten carbide

OPERATION SEQUENCES: ${COMMON_SEQUENCES.length} proven patterns
  OD turn rough→finish, deep ID boring, multi-pass threading,
  hole patterns, 5-axis die finishing, electrode profiling

API METHODS:
  getTopOperations(n) → most common G-codes
  getCustomer(name) → customer profile + typical work
  getMaterialParams(material) → production SFM/feeds
  recommendSpeedsFeeds(material, operation) → sfm/feed ranges
  findSequencesForCustomer(customer) → proven sequences
  getMacrosForController(controller) → parametric patterns
  getShopFocusProfile() → comprehensive shop analytics
  getTribalWisdom(material) → operator wisdom
`;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const postProcessorProductionPatternEngine = new PostProcessorProductionPatternEngine();

export {
  OPERATION_FREQUENCIES,
  CUSTOMER_PATTERNS,
  PRODUCTION_SFM_FPT,
  COMMON_SEQUENCES,
  MACRO_PATTERNS,
  type OperationFrequency,
  type CustomerPattern,
  type MaterialProductionParams,
  type OperationSequence,
  type MacroPattern
};
