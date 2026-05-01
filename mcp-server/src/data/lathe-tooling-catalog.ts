// Lathe Tooling Catalog — Okuma Multus (Iscar, Kennametal, Sandvik)
// Source: H:/PRISM/resources/OKUMA MULTUS PDFS/ (3D model file nomenclature + manufacturer specs)
// Covers: Insert grades, geometries, holders, cutting parameters, application guidelines
// Tool count: Sandvik 1771 | Kennametal 5 | Iscar 1

// ---------------------------------------------------------------------------
// INTERFACES
// ---------------------------------------------------------------------------

export interface InsertGrade {
  grade: string;
  manufacturer: string;
  substrate: "carbide" | "cermet" | "ceramic" | "CBN" | "PCD";
  coating?: string;
  isoGroups: Array<"P" | "M" | "K" | "N" | "S" | "H">;
  hardnessHRC?: number;
  application: string;
  /** Recommended cutting speed range m/min per ISO group */
  speedRange: Partial<Record<"P" | "M" | "K" | "N" | "S" | "H", { min: number; max: number }>>;
  /** Feed range mm/rev per ISO group */
  feedRange: Partial<Record<"P" | "M" | "K" | "N" | "S" | "H", { min: number; max: number }>>;
  roughing: boolean;
  finishing: boolean;
  interruptedCut: boolean;
  coolantRequired: boolean;
  notes: string;
}

export interface InsertGeometry {
  designation: string;
  manufacturer: string;
  /** ISO insert shape letter */
  shape: "C" | "D" | "E" | "K" | "R" | "S" | "T" | "V" | "W";
  shapeDegrees: number;
  /** Inscribed circle mm */
  icSize_mm: number;
  /** Nose radius options mm */
  noseRadii_mm: number[];
  chipbreakers: string[];
  reliefAngle_deg: number;
  application: "turning" | "grooving" | "parting" | "threading" | "boring" | "profiling";
  positiveGeometry: boolean;
  notes: string;
}

export interface LatheTurningHolder {
  designation: string;
  manufacturer: string;
  system: "capto" | "vdi" | "sl570" | "shank" | "qchange" | "boring_bar";
  /** Capto size C3/C4/C5/C6/C8, VDI size 20/25/30/40, shank mm */
  mountingSize: string;
  insertShape: string;
  hand: "L" | "R" | "N";
  /** Approach angle degrees */
  approachAngle_deg: number;
  /** Back angle degrees */
  backAngle_deg?: number;
  /** Shank cross-section mm (square or rect h×b) */
  shankH_mm?: number;
  shankB_mm?: number;
  /** Boring bar bore diameter mm */
  boreDia_mm?: number;
  /** Overhang / min bore mm */
  overhang_mm?: number;
  minBore_mm?: number;
  /** Insert IC mm compatibility */
  insertIC_mm: number;
  coolantThrough: boolean;
  notes: string;
}

export interface GroovingPartingHolder {
  designation: string;
  manufacturer: string;
  system: "capto" | "sl570" | "shank" | "qchange" | "boring_bar";
  mountingSize: string;
  hand: "L" | "R" | "N";
  /** Blade/insert width mm */
  width_mm: number;
  /** Max depth of cut mm */
  maxDOC_mm?: number;
  insertSystem: string;
  coolantThrough: boolean;
  notes: string;
}

export interface CuttingParameters {
  material: string;
  isoGroup: "P" | "M" | "K" | "N" | "S" | "H";
  operation: "roughing" | "semi_finishing" | "finishing";
  /** Cutting speed m/min */
  vc_min: number;
  vc_max: number;
  /** Feed mm/rev */
  fn_min: number;
  fn_max: number;
  /** Depth of cut mm */
  ap_min: number;
  ap_max: number;
  notes: string;
}

export interface ApplicationGuideline {
  scenario: string;
  manufacturer?: string;
  recommendedGrades: string[];
  avoidGrades?: string[];
  holderNotes: string;
  parameterAdjustment: string;
  coolant: string;
  warnings: string[];
}

// ---------------------------------------------------------------------------
// SANDVIK — INSERT GRADES
// ---------------------------------------------------------------------------

export const SANDVIK_INSERT_GRADES: InsertGrade[] = [
  {
    grade: "GC4325",
    manufacturer: "Sandvik",
    substrate: "carbide",
    coating: "Inveio CVD Al2O3+TiCN",
    isoGroups: ["P"],
    application: "Steel turning — roughing to finishing, excellent thermal resistance",
    speedRange: { P: { min: 200, max: 500 } },
    feedRange: { P: { min: 0.15, max: 0.6 } },
    roughing: true,
    finishing: true,
    interruptedCut: false,
    coolantRequired: false,
    notes: "Inveio coating with columnar Al2O3. Best for continuous steel turning. ISO P25.",
  },
  {
    grade: "GC4415",
    manufacturer: "Sandvik",
    substrate: "carbide",
    coating: "Inveio CVD Al2O3+TiCN",
    isoGroups: ["P"],
    application: "Steel turning — high speed finishing",
    speedRange: { P: { min: 250, max: 600 } },
    feedRange: { P: { min: 0.1, max: 0.35 } },
    roughing: false,
    finishing: true,
    interruptedCut: false,
    coolantRequired: false,
    notes: "Premium steel finishing. ISO P15. Uni-directional Inveio coating.",
  },
  {
    grade: "GC4435",
    manufacturer: "Sandvik",
    substrate: "carbide",
    coating: "Inveio CVD",
    isoGroups: ["P"],
    application: "Steel roughing with interrupted cuts",
    speedRange: { P: { min: 150, max: 380 } },
    feedRange: { P: { min: 0.2, max: 0.8 } },
    roughing: true,
    finishing: false,
    interruptedCut: true,
    coolantRequired: false,
    notes: "Tough substrate for heavy roughing steel. ISO P35.",
  },
  {
    grade: "GC2135",
    manufacturer: "Sandvik",
    substrate: "carbide",
    coating: "PVD TiAlN",
    isoGroups: ["M"],
    application: "Stainless steel turning — toughness with edge security",
    speedRange: { M: { min: 120, max: 320 } },
    feedRange: { M: { min: 0.15, max: 0.5 } },
    roughing: true,
    finishing: true,
    interruptedCut: true,
    coolantRequired: true,
    notes: "PVD coated for stainless. ISO M35. Good resistance to built-up edge.",
  },
  {
    grade: "GC2025",
    manufacturer: "Sandvik",
    substrate: "carbide",
    coating: "PVD TiAlSiN",
    isoGroups: ["M"],
    application: "Stainless steel and duplex — semi-finishing to finishing",
    speedRange: { M: { min: 150, max: 380 } },
    feedRange: { M: { min: 0.1, max: 0.4 } },
    roughing: false,
    finishing: true,
    interruptedCut: false,
    coolantRequired: true,
    notes: "ISO M25. Excellent for austenitic and duplex stainless.",
  },
  {
    grade: "GC1125",
    manufacturer: "Sandvik",
    substrate: "carbide",
    coating: "PVD TiN+TiAlN",
    isoGroups: ["M", "K"],
    application: "Cast iron and stainless — versatile CVD/PVD combo",
    speedRange: { M: { min: 100, max: 280 }, K: { min: 150, max: 400 } },
    feedRange: { M: { min: 0.1, max: 0.4 }, K: { min: 0.1, max: 0.5 } },
    roughing: false,
    finishing: true,
    interruptedCut: false,
    coolantRequired: false,
    notes: "ISO M25/K25. General-purpose finishing grade.",
  },
  {
    grade: "H13A",
    manufacturer: "Sandvik",
    substrate: "carbide",
    isoGroups: ["K", "N"],
    application: "Aluminium, non-ferrous and cast iron — uncoated",
    speedRange: { K: { min: 200, max: 600 }, N: { min: 500, max: 3000 } },
    feedRange: { K: { min: 0.1, max: 0.5 }, N: { min: 0.05, max: 0.4 } },
    roughing: true,
    finishing: true,
    interruptedCut: false,
    coolantRequired: false,
    notes: "Uncoated fine-grain for aluminium and non-ferrous. ISO K/N.",
  },
  {
    grade: "S05F",
    manufacturer: "Sandvik",
    substrate: "carbide",
    coating: "PVD TiAlN",
    isoGroups: ["S"],
    application: "Titanium and superalloys finishing",
    speedRange: { S: { min: 30, max: 80 } },
    feedRange: { S: { min: 0.05, max: 0.2 } },
    roughing: false,
    finishing: true,
    interruptedCut: false,
    coolantRequired: true,
    notes: "ISO S05. High pressure coolant recommended for Ti alloys.",
  },
  {
    grade: "S30T",
    manufacturer: "Sandvik",
    substrate: "carbide",
    coating: "PVD TiAlN",
    isoGroups: ["S"],
    application: "Titanium and superalloys — roughing",
    speedRange: { S: { min: 20, max: 55 } },
    feedRange: { S: { min: 0.1, max: 0.4 } },
    roughing: true,
    finishing: false,
    interruptedCut: true,
    coolantRequired: true,
    notes: "ISO S30. Robust edge for Ti roughing. High pressure coolant required.",
  },
  {
    grade: "CB7015",
    manufacturer: "Sandvik",
    substrate: "CBN",
    isoGroups: ["H"],
    hardnessHRC: 45,
    application: "Hardened steel turning 45–65 HRC — finishing",
    speedRange: { H: { min: 100, max: 250 } },
    feedRange: { H: { min: 0.05, max: 0.15 } },
    roughing: false,
    finishing: true,
    interruptedCut: false,
    coolantRequired: false,
    notes: "CBN grade for hardened steels. ISO H05-H15. Dry recommended.",
  },
  {
    grade: "CB7025",
    manufacturer: "Sandvik",
    substrate: "CBN",
    isoGroups: ["H"],
    hardnessHRC: 40,
    application: "Hardened steel — interrupted and continuous",
    speedRange: { H: { min: 80, max: 200 } },
    feedRange: { H: { min: 0.05, max: 0.2 } },
    roughing: false,
    finishing: true,
    interruptedCut: true,
    coolantRequired: false,
    notes: "CBN ISO H25. Better toughness than CB7015 for interrupted cuts.",
  },
  {
    grade: "GC4205",
    manufacturer: "Sandvik",
    substrate: "cermet",
    coating: "PVD",
    isoGroups: ["P", "M"],
    application: "Steel and stainless finishing — superior surface finish",
    speedRange: { P: { min: 200, max: 500 }, M: { min: 150, max: 350 } },
    feedRange: { P: { min: 0.05, max: 0.2 }, M: { min: 0.05, max: 0.2 } },
    roughing: false,
    finishing: true,
    interruptedCut: false,
    coolantRequired: false,
    notes: "Cermet grade for mirror-quality finishes on steel/SS.",
  },
];

// ---------------------------------------------------------------------------
// KENNAMETAL — INSERT GRADES
// ---------------------------------------------------------------------------

export const KENNAMETAL_INSERT_GRADES: InsertGrade[] = [
  {
    grade: "KC5010",
    manufacturer: "Kennametal",
    substrate: "carbide",
    coating: "TiN/Al2O3/TiCN CVD",
    isoGroups: ["P", "M"],
    application: "Steel and stainless turning — roughing to semi-finishing",
    speedRange: { P: { min: 180, max: 450 }, M: { min: 120, max: 300 } },
    feedRange: { P: { min: 0.15, max: 0.6 }, M: { min: 0.1, max: 0.4 } },
    roughing: true,
    finishing: true,
    interruptedCut: false,
    coolantRequired: false,
    notes: "Kennametal KC5010 premium CVD grade. ISO P10/M10.",
  },
  {
    grade: "KC5025",
    manufacturer: "Kennametal",
    substrate: "carbide",
    coating: "TiN/Al2O3/TiCN CVD",
    isoGroups: ["P"],
    application: "Steel roughing — tough against interruptions",
    speedRange: { P: { min: 150, max: 380 } },
    feedRange: { P: { min: 0.2, max: 0.8 } },
    roughing: true,
    finishing: false,
    interruptedCut: true,
    coolantRequired: false,
    notes: "KC5025 — heavier CVD for tough steel roughing. ISO P25.",
  },
  {
    grade: "KCU10",
    manufacturer: "Kennametal",
    substrate: "carbide",
    coating: "PVD TiAlN",
    isoGroups: ["M", "K"],
    application: "Stainless and cast iron — universal finishing",
    speedRange: { M: { min: 130, max: 320 }, K: { min: 160, max: 420 } },
    feedRange: { M: { min: 0.08, max: 0.3 }, K: { min: 0.1, max: 0.4 } },
    roughing: false,
    finishing: true,
    interruptedCut: false,
    coolantRequired: false,
    notes: "KCU10 PVD grade for SS and cast iron. Good deformation resistance.",
  },
  {
    grade: "KC5510",
    manufacturer: "Kennametal",
    substrate: "carbide",
    coating: "PVD AlTiN",
    isoGroups: ["P", "M"],
    application: "High-speed steel and stainless finishing",
    speedRange: { P: { min: 250, max: 600 }, M: { min: 180, max: 400 } },
    feedRange: { P: { min: 0.08, max: 0.25 }, M: { min: 0.06, max: 0.2 } },
    roughing: false,
    finishing: true,
    interruptedCut: false,
    coolantRequired: false,
    notes: "KC5510 premium PVD for high-speed finishing.",
  },
  {
    grade: "KCP25B",
    manufacturer: "Kennametal",
    substrate: "carbide",
    coating: "CVD MT-TiCN/Al2O3",
    isoGroups: ["P"],
    application: "Steel general purpose — roughing to finishing",
    speedRange: { P: { min: 160, max: 430 } },
    feedRange: { P: { min: 0.15, max: 0.6 } },
    roughing: true,
    finishing: true,
    interruptedCut: true,
    coolantRequired: false,
    notes: "KCP25B — versatile CVD grade for all steel applications. ISO P25.",
  },
  {
    grade: "KCM15",
    manufacturer: "Kennametal",
    substrate: "carbide",
    coating: "PVD TiAlSiN",
    isoGroups: ["M"],
    application: "Stainless steel semi-finishing to finishing",
    speedRange: { M: { min: 150, max: 360 } },
    feedRange: { M: { min: 0.1, max: 0.35 } },
    roughing: false,
    finishing: true,
    interruptedCut: false,
    coolantRequired: true,
    notes: "KCM15 for demanding stainless applications. ISO M15.",
  },
  {
    grade: "KCK15",
    manufacturer: "Kennametal",
    substrate: "carbide",
    coating: "CVD TiCN/Al2O3",
    isoGroups: ["K"],
    application: "Cast iron turning — high speed",
    speedRange: { K: { min: 200, max: 600 } },
    feedRange: { K: { min: 0.1, max: 0.5 } },
    roughing: true,
    finishing: true,
    interruptedCut: false,
    coolantRequired: false,
    notes: "KCK15 for grey and nodular cast iron. ISO K15. Dry preferred.",
  },
  {
    grade: "KBH10",
    manufacturer: "Kennametal",
    substrate: "CBN",
    isoGroups: ["H"],
    hardnessHRC: 45,
    application: "Hardened steel turning 45–65 HRC",
    speedRange: { H: { min: 80, max: 220 } },
    feedRange: { H: { min: 0.05, max: 0.15 } },
    roughing: false,
    finishing: true,
    interruptedCut: false,
    coolantRequired: false,
    notes: "CBN for hardened die steels. ISO H05-H15. Dry machining.",
  },
];

// ---------------------------------------------------------------------------
// ISCAR — INSERT GRADES
// ---------------------------------------------------------------------------

export const ISCAR_INSERT_GRADES: InsertGrade[] = [
  {
    grade: "IC808",
    manufacturer: "Iscar",
    substrate: "carbide",
    coating: "PVD TiAlN (SUMO TEC)",
    isoGroups: ["P", "M"],
    application: "Steel and stainless semi-finishing to finishing",
    speedRange: { P: { min: 180, max: 450 }, M: { min: 130, max: 320 } },
    feedRange: { P: { min: 0.1, max: 0.4 }, M: { min: 0.08, max: 0.3 } },
    roughing: false,
    finishing: true,
    interruptedCut: false,
    coolantRequired: false,
    notes: "IC808 SUMO TEC PVD. Excellent for stainless and steel finishing.",
  },
  {
    grade: "IC807",
    manufacturer: "Iscar",
    substrate: "carbide",
    coating: "PVD TiAlN (SUMO TEC)",
    isoGroups: ["P"],
    application: "Steel finishing at high speeds",
    speedRange: { P: { min: 250, max: 600 } },
    feedRange: { P: { min: 0.08, max: 0.25 } },
    roughing: false,
    finishing: true,
    interruptedCut: false,
    coolantRequired: false,
    notes: "IC807 premium PVD for high-speed steel finishing. ISO P05-P15.",
  },
  {
    grade: "IC9150",
    manufacturer: "Iscar",
    substrate: "carbide",
    coating: "CVD TiCN/Al2O3/TiN",
    isoGroups: ["P", "M"],
    application: "Steel roughing — multi-layer CVD toughness",
    speedRange: { P: { min: 150, max: 380 }, M: { min: 100, max: 280 } },
    feedRange: { P: { min: 0.2, max: 0.8 }, M: { min: 0.15, max: 0.5 } },
    roughing: true,
    finishing: false,
    interruptedCut: true,
    coolantRequired: false,
    notes: "IC9150 CVD multi-layer for tough roughing. ISO P35/M35.",
  },
  {
    grade: "IC930",
    manufacturer: "Iscar",
    substrate: "carbide",
    coating: "CVD Al2O3+TiCN",
    isoGroups: ["P"],
    application: "Steel turning at high temperatures — thermally stable",
    speedRange: { P: { min: 200, max: 500 } },
    feedRange: { P: { min: 0.15, max: 0.5 } },
    roughing: true,
    finishing: true,
    interruptedCut: false,
    coolantRequired: false,
    notes: "IC930 — thermally hard Al2O3 outer layer. ISO P25.",
  },
  {
    grade: "IC1008",
    manufacturer: "Iscar",
    substrate: "cermet",
    isoGroups: ["P", "M"],
    application: "Steel and stainless fine finishing — superior surface quality",
    speedRange: { P: { min: 200, max: 500 }, M: { min: 150, max: 350 } },
    feedRange: { P: { min: 0.05, max: 0.2 }, M: { min: 0.05, max: 0.15 } },
    roughing: false,
    finishing: true,
    interruptedCut: false,
    coolantRequired: false,
    notes: "Cermet. Ra <0.8 achievable on steel.",
  },
  {
    grade: "IC328",
    manufacturer: "Iscar",
    substrate: "carbide",
    coating: "CVD",
    isoGroups: ["K"],
    application: "Cast iron — dry high-speed",
    speedRange: { K: { min: 200, max: 550 } },
    feedRange: { K: { min: 0.1, max: 0.5 } },
    roughing: true,
    finishing: true,
    interruptedCut: false,
    coolantRequired: false,
    notes: "ISO K25. Cast iron dedicated. Dry preferred.",
  },
  {
    grade: "IC20",
    manufacturer: "Iscar",
    substrate: "carbide",
    isoGroups: ["N"],
    application: "Aluminium and non-ferrous — uncoated",
    speedRange: { N: { min: 500, max: 3000 } },
    feedRange: { N: { min: 0.05, max: 0.4 } },
    roughing: true,
    finishing: true,
    interruptedCut: false,
    coolantRequired: false,
    notes: "Ultra-sharp uncoated for aluminium. No BUE.",
  },
];

// ---------------------------------------------------------------------------
// SANDVIK — INSERT GEOMETRIES (ISO holder code families present in catalog)
// ---------------------------------------------------------------------------

export const SANDVIK_INSERT_GEOMETRIES: InsertGeometry[] = [
  // D-shape (55°) inserts
  {
    designation: "DCMT",
    manufacturer: "Sandvik",
    shape: "D",
    shapeDegrees: 55,
    icSize_mm: 9.525,
    noseRadii_mm: [0.4, 0.8],
    chipbreakers: ["MF", "MM", "MR", "-MF1", "-MF2"],
    reliefAngle_deg: 7,
    application: "profiling",
    positiveGeometry: true,
    notes: "55° diamond for profiling and copy turning. Standard MF/MM chipbreakers.",
  },
  {
    designation: "DNMG",
    manufacturer: "Sandvik",
    shape: "D",
    shapeDegrees: 55,
    icSize_mm: 12.7,
    noseRadii_mm: [0.4, 0.8, 1.2],
    chipbreakers: ["MF", "MM", "MR", "QM", "PM"],
    reliefAngle_deg: 0,
    application: "turning",
    positiveGeometry: false,
    notes: "55° negative. Double-sided for steel and cast iron roughing.",
  },
  // C-shape (80°) inserts
  {
    designation: "CNMG",
    manufacturer: "Sandvik",
    shape: "C",
    shapeDegrees: 80,
    icSize_mm: 12.7,
    noseRadii_mm: [0.4, 0.8, 1.2, 1.6],
    chipbreakers: ["MF", "MM", "MR", "QM", "PM", "HR"],
    reliefAngle_deg: 0,
    application: "turning",
    positiveGeometry: false,
    notes: "80° negative — strong tip for heavy roughing steel/CI.",
  },
  {
    designation: "CCMT",
    manufacturer: "Sandvik",
    shape: "C",
    shapeDegrees: 80,
    icSize_mm: 9.525,
    noseRadii_mm: [0.2, 0.4, 0.8],
    chipbreakers: ["MF", "MF2", "MM"],
    reliefAngle_deg: 7,
    application: "turning",
    positiveGeometry: true,
    notes: "80° positive for stainless and general steel semi-finishing.",
  },
  // V-shape (35°) inserts
  {
    designation: "VCMT",
    manufacturer: "Sandvik",
    shape: "V",
    shapeDegrees: 35,
    icSize_mm: 9.525,
    noseRadii_mm: [0.2, 0.4, 0.8],
    chipbreakers: ["MF", "MF2"],
    reliefAngle_deg: 7,
    application: "profiling",
    positiveGeometry: true,
    notes: "35° acute tip for deep profiling and undercutting.",
  },
  {
    designation: "VNMG",
    manufacturer: "Sandvik",
    shape: "V",
    shapeDegrees: 35,
    icSize_mm: 12.7,
    noseRadii_mm: [0.4, 0.8, 1.2],
    chipbreakers: ["MF", "MM"],
    reliefAngle_deg: 0,
    application: "profiling",
    positiveGeometry: false,
    notes: "35° negative for profiling. Double-sided economy.",
  },
  // S-shape (90°) inserts
  {
    designation: "SNMG",
    manufacturer: "Sandvik",
    shape: "S",
    shapeDegrees: 90,
    icSize_mm: 12.7,
    noseRadii_mm: [0.8, 1.2, 1.6],
    chipbreakers: ["MR", "QM"],
    reliefAngle_deg: 0,
    application: "turning",
    positiveGeometry: false,
    notes: "Square 90° — maximum tip strength for heavy roughing.",
  },
  // T-shape (60°) inserts
  {
    designation: "TNMG",
    manufacturer: "Sandvik",
    shape: "T",
    shapeDegrees: 60,
    icSize_mm: 11.0,
    noseRadii_mm: [0.4, 0.8, 1.2],
    chipbreakers: ["MF", "MM", "MR"],
    reliefAngle_deg: 0,
    application: "turning",
    positiveGeometry: false,
    notes: "Triangular negative — three cutting edges, versatile.",
  },
  {
    designation: "TCMT",
    manufacturer: "Sandvik",
    shape: "T",
    shapeDegrees: 60,
    icSize_mm: 9.525,
    noseRadii_mm: [0.2, 0.4, 0.8],
    chipbreakers: ["MF", "MM"],
    reliefAngle_deg: 7,
    application: "turning",
    positiveGeometry: true,
    notes: "Triangular positive for stainless and light steel turning.",
  },
  // W-shape (80° trigon) inserts
  {
    designation: "WNMG",
    manufacturer: "Sandvik",
    shape: "W",
    shapeDegrees: 80,
    icSize_mm: 12.7,
    noseRadii_mm: [0.8, 1.2],
    chipbreakers: ["MR", "QM"],
    reliefAngle_deg: 0,
    application: "turning",
    positiveGeometry: false,
    notes: "Trigon — six cutting edges for economy roughing.",
  },
  // CoroCut grooving inserts (266 series)
  {
    designation: "N123",
    manufacturer: "Sandvik",
    shape: "R",
    shapeDegrees: 0,
    icSize_mm: 0,
    noseRadii_mm: [0.1, 0.2, 0.4],
    chipbreakers: ["F", "G", "GF", "GM", "GR"],
    reliefAngle_deg: 0,
    application: "grooving",
    positiveGeometry: true,
    notes: "CoroCut 2 — external grooving, parting, recessing.",
  },
  {
    designation: "N151",
    manufacturer: "Sandvik",
    shape: "R",
    shapeDegrees: 0,
    icSize_mm: 0,
    noseRadii_mm: [0.1, 0.2, 0.4, 0.8],
    chipbreakers: ["F", "G", "GF", "GM"],
    reliefAngle_deg: 0,
    application: "grooving",
    positiveGeometry: true,
    notes: "CoroCut 1 — parting and external grooving on smaller tools.",
  },
];

// ---------------------------------------------------------------------------
// SANDVIK — OD TURNING HOLDERS (shank-mounted, from OD turn (525) folder)
// ---------------------------------------------------------------------------

export const SANDVIK_OD_TURNING_HOLDERS: LatheTurningHolder[] = [
  // DCLNR/L series — 55° D insert, 95° approach
  { designation: "DCLNR 123C", manufacturer: "Sandvik", system: "shank", mountingSize: "12×12", insertShape: "CNMG", hand: "R", approachAngle_deg: 95, shankH_mm: 12, shankB_mm: 12, insertIC_mm: 9.525, coolantThrough: false, notes: "D-style holder 12mm sq. CNMG-09" },
  { designation: "DCLNR 124B", manufacturer: "Sandvik", system: "shank", mountingSize: "12×12", insertShape: "CNMG", hand: "R", approachAngle_deg: 95, shankH_mm: 12, shankB_mm: 12, insertIC_mm: 12.7, coolantThrough: false, notes: "D-style holder 12mm sq. CNMG-12" },
  { designation: "DCLNR 163D", manufacturer: "Sandvik", system: "shank", mountingSize: "16×16", insertShape: "CNMG", hand: "R", approachAngle_deg: 95, shankH_mm: 16, shankB_mm: 16, insertIC_mm: 9.525, coolantThrough: false, notes: "D-style holder 16mm sq." },
  { designation: "DCLNR 164D", manufacturer: "Sandvik", system: "shank", mountingSize: "16×16", insertShape: "CNMG", hand: "R", approachAngle_deg: 95, shankH_mm: 16, shankB_mm: 16, insertIC_mm: 12.7, coolantThrough: false, notes: "D-style holder 16mm sq. CNMG-12" },
  { designation: "DCLNR 204D", manufacturer: "Sandvik", system: "shank", mountingSize: "20×20", insertShape: "CNMG", hand: "R", approachAngle_deg: 95, shankH_mm: 20, shankB_mm: 20, insertIC_mm: 12.7, coolantThrough: false, notes: "D-style 20mm sq." },
  { designation: "DCLNR 244D", manufacturer: "Sandvik", system: "shank", mountingSize: "25×25", insertShape: "CNMG", hand: "R", approachAngle_deg: 95, shankH_mm: 25, shankB_mm: 25, insertIC_mm: 12.7, coolantThrough: false, notes: "D-style 25mm sq." },
  { designation: "DCLNL 123C", manufacturer: "Sandvik", system: "shank", mountingSize: "12×12", insertShape: "CNMG", hand: "L", approachAngle_deg: 95, shankH_mm: 12, shankB_mm: 12, insertIC_mm: 9.525, coolantThrough: false, notes: "LH version" },
  { designation: "DCLNL 164D", manufacturer: "Sandvik", system: "shank", mountingSize: "16×16", insertShape: "CNMG", hand: "L", approachAngle_deg: 95, shankH_mm: 16, shankB_mm: 16, insertIC_mm: 12.7, coolantThrough: false, notes: "LH 16mm" },
  { designation: "DCLNL 204D", manufacturer: "Sandvik", system: "shank", mountingSize: "20×20", insertShape: "CNMG", hand: "L", approachAngle_deg: 95, shankH_mm: 20, shankB_mm: 20, insertIC_mm: 12.7, coolantThrough: false, notes: "LH 20mm" },
  // DSRNR/L — 75° approach, S insert
  { designation: "DSRNR 123B", manufacturer: "Sandvik", system: "shank", mountingSize: "12×12", insertShape: "SNMG", hand: "R", approachAngle_deg: 75, shankH_mm: 12, shankB_mm: 12, insertIC_mm: 9.525, coolantThrough: false, notes: "S-style 75° approach 12mm" },
  { designation: "DSRNR 164D", manufacturer: "Sandvik", system: "shank", mountingSize: "16×16", insertShape: "SNMG", hand: "R", approachAngle_deg: 75, shankH_mm: 16, shankB_mm: 16, insertIC_mm: 12.7, coolantThrough: false, notes: "S-style 75° approach 16mm" },
  { designation: "DSRNR 204D", manufacturer: "Sandvik", system: "shank", mountingSize: "20×20", insertShape: "SNMG", hand: "R", approachAngle_deg: 75, shankH_mm: 20, shankB_mm: 20, insertIC_mm: 12.7, coolantThrough: false, notes: "S-style 75° approach 20mm" },
  // SCLCR/L — S insert, 95° approach (high-precision clamping)
  { designation: "SCLCR 123B", manufacturer: "Sandvik", system: "shank", mountingSize: "12×12", insertShape: "CCMT/CCMG", hand: "R", approachAngle_deg: 95, shankH_mm: 12, shankB_mm: 12, insertIC_mm: 9.525, coolantThrough: false, notes: "Screw-clamp for positive inserts. 12mm" },
  { designation: "SCLCR 163D", manufacturer: "Sandvik", system: "shank", mountingSize: "16×16", insertShape: "CCMT/CCMG", hand: "R", approachAngle_deg: 95, shankH_mm: 16, shankB_mm: 16, insertIC_mm: 9.525, coolantThrough: false, notes: "Screw-clamp 16mm" },
  { designation: "SCLCR 204D", manufacturer: "Sandvik", system: "shank", mountingSize: "20×20", insertShape: "CCMT/CCMG", hand: "R", approachAngle_deg: 95, shankH_mm: 20, shankB_mm: 20, insertIC_mm: 12.7, coolantThrough: false, notes: "Screw-clamp 20mm" },
  // SVJBR/L — V insert, 107.5° approach (back turning)
  { designation: "SVJBR 122B", manufacturer: "Sandvik", system: "shank", mountingSize: "12×12", insertShape: "VCMT/VCMG", hand: "R", approachAngle_deg: 107, shankH_mm: 12, shankB_mm: 12, insertIC_mm: 9.525, coolantThrough: false, notes: "V-insert back turning" },
  { designation: "SVJBR 163D", manufacturer: "Sandvik", system: "shank", mountingSize: "16×16", insertShape: "VCMT/VCMG", hand: "R", approachAngle_deg: 107, shankH_mm: 16, shankB_mm: 16, insertIC_mm: 9.525, coolantThrough: false, notes: "V-insert 16mm back turning" },
  // DTGNR/L — T insert, 91° approach
  { designation: "DTGNR 123B", manufacturer: "Sandvik", system: "shank", mountingSize: "12×12", insertShape: "TNMG/TCMT", hand: "R", approachAngle_deg: 91, shankH_mm: 12, shankB_mm: 12, insertIC_mm: 9.525, coolantThrough: false, notes: "T-insert 91° 12mm" },
  { designation: "DTGNR 163D", manufacturer: "Sandvik", system: "shank", mountingSize: "16×16", insertShape: "TNMG/TCMT", hand: "R", approachAngle_deg: 91, shankH_mm: 16, shankB_mm: 16, insertIC_mm: 9.525, coolantThrough: false, notes: "T-insert 91° 16mm" },
  { designation: "DTGNR 204D", manufacturer: "Sandvik", system: "shank", mountingSize: "20×20", insertShape: "TNMG/TCMT", hand: "R", approachAngle_deg: 91, shankH_mm: 20, shankB_mm: 20, insertIC_mm: 9.525, coolantThrough: false, notes: "T-insert 91° 20mm" },
  // PCLNR — high-precision, HP coolant, positive CNMG
  { designation: "PCLNR 20 4DHP", manufacturer: "Sandvik", system: "shank", mountingSize: "20×20", insertShape: "CNMG", hand: "R", approachAngle_deg: 95, shankH_mm: 20, shankB_mm: 20, insertIC_mm: 12.7, coolantThrough: true, notes: "High-pressure coolant holder. Wiper edge compatible." },
  { designation: "PCLNL 20 4DHP", manufacturer: "Sandvik", system: "shank", mountingSize: "20×20", insertShape: "CNMG", hand: "L", approachAngle_deg: 95, shankH_mm: 20, shankB_mm: 20, insertIC_mm: 12.7, coolantThrough: true, notes: "LH HP coolant." },
  { designation: "PDJNR 16 3DHP", manufacturer: "Sandvik", system: "shank", mountingSize: "16×16", insertShape: "DNMG", hand: "R", approachAngle_deg: 93, shankH_mm: 16, shankB_mm: 16, insertIC_mm: 9.525, coolantThrough: true, notes: "D-insert HP coolant 16mm." },
  { designation: "PDJNR 20 4DHP", manufacturer: "Sandvik", system: "shank", mountingSize: "20×20", insertShape: "DNMG", hand: "R", approachAngle_deg: 93, shankH_mm: 20, shankB_mm: 20, insertIC_mm: 12.7, coolantThrough: true, notes: "D-insert HP coolant 20mm." },
  // DSSNR/L — with F1 wiper chipbreaker
  { designation: "DSSNR 164D-F1", manufacturer: "Sandvik", system: "shank", mountingSize: "16×16", insertShape: "SNMG", hand: "R", approachAngle_deg: 75, shankH_mm: 16, shankB_mm: 16, insertIC_mm: 12.7, coolantThrough: false, notes: "Wiper F1 chipbreaker for superior surface finish." },
  { designation: "DSSNL 164D-F1", manufacturer: "Sandvik", system: "shank", mountingSize: "16×16", insertShape: "SNMG", hand: "L", approachAngle_deg: 75, shankH_mm: 16, shankB_mm: 16, insertIC_mm: 12.7, coolantThrough: false, notes: "LH wiper F1." },
  // DDJNR/L — 93° approach, D insert
  { designation: "DDJNR 123C", manufacturer: "Sandvik", system: "shank", mountingSize: "12×12", insertShape: "DNMG", hand: "R", approachAngle_deg: 93, shankH_mm: 12, shankB_mm: 12, insertIC_mm: 9.525, coolantThrough: false, notes: "93° approach for profiling. 12mm" },
  { designation: "DDJNR 164D", manufacturer: "Sandvik", system: "shank", mountingSize: "16×16", insertShape: "DNMG", hand: "R", approachAngle_deg: 93, shankH_mm: 16, shankB_mm: 16, insertIC_mm: 12.7, coolantThrough: false, notes: "93° approach 16mm" },
  // DVJNR/L — V insert, 93° approach
  { designation: "DVJNR 123B", manufacturer: "Sandvik", system: "shank", mountingSize: "12×12", insertShape: "VNMG", hand: "R", approachAngle_deg: 93, shankH_mm: 12, shankB_mm: 12, insertIC_mm: 9.525, coolantThrough: false, notes: "V-insert 93° 12mm" },
  { designation: "DVJNR 163D", manufacturer: "Sandvik", system: "shank", mountingSize: "16×16", insertShape: "VNMG", hand: "R", approachAngle_deg: 93, shankH_mm: 16, shankB_mm: 16, insertIC_mm: 9.525, coolantThrough: false, notes: "V-insert 93° 16mm" },
  // TR-style twin-clamping for high-feed
  { designation: "TR-D13JCR 12B", manufacturer: "Sandvik", system: "shank", mountingSize: "12×12", insertShape: "DCMT", hand: "R", approachAngle_deg: 93, shankH_mm: 12, shankB_mm: 12, insertIC_mm: 9.525, coolantThrough: false, notes: "Twin-clamp D-insert 12mm" },
  { designation: "TR-D13JCR 16D", manufacturer: "Sandvik", system: "shank", mountingSize: "16×16", insertShape: "DCMT", hand: "R", approachAngle_deg: 93, shankH_mm: 16, shankB_mm: 16, insertIC_mm: 9.525, coolantThrough: false, notes: "Twin-clamp D-insert 16mm" },
  { designation: "TR-V13JBR 12B", manufacturer: "Sandvik", system: "shank", mountingSize: "12×12", insertShape: "VCMT", hand: "R", approachAngle_deg: 107, shankH_mm: 12, shankB_mm: 12, insertIC_mm: 9.525, coolantThrough: false, notes: "Twin-clamp V-insert 12mm" },
];

// ---------------------------------------------------------------------------
// SANDVIK — CAPTO OD TURNING HOLDERS (C3/C4/C5/C6/C8)
// ---------------------------------------------------------------------------

export const SANDVIK_CAPTO_OD_HOLDERS: LatheTurningHolder[] = [
  // C3 Capto
  { designation: "C3-DCLNR-22040-12", manufacturer: "Sandvik", system: "capto", mountingSize: "C3", insertShape: "CNMG", hand: "R", approachAngle_deg: 95, overhang_mm: 40, insertIC_mm: 12.7, coolantThrough: false, notes: "Capto C3 D-style 12 insert" },
  { designation: "C3-DSRNR-19048-12", manufacturer: "Sandvik", system: "capto", mountingSize: "C3", insertShape: "SNMG", hand: "R", approachAngle_deg: 75, overhang_mm: 48, insertIC_mm: 12.7, coolantThrough: false, notes: "Capto C3 S-style 75°" },
  { designation: "C3-SCLCR-22040-09C", manufacturer: "Sandvik", system: "capto", mountingSize: "C3", insertShape: "CCMT", hand: "R", approachAngle_deg: 95, overhang_mm: 40, insertIC_mm: 9.525, coolantThrough: false, notes: "Capto C3 screw-clamp positive" },
  { designation: "C3-SCLCR-22040-12", manufacturer: "Sandvik", system: "capto", mountingSize: "C3", insertShape: "CCMT", hand: "R", approachAngle_deg: 95, overhang_mm: 40, insertIC_mm: 12.7, coolantThrough: false, notes: "Capto C3 screw-clamp IC12" },
  { designation: "C3-SVJBR-22040-11", manufacturer: "Sandvik", system: "capto", mountingSize: "C3", insertShape: "VCMT", hand: "R", approachAngle_deg: 107, overhang_mm: 40, insertIC_mm: 9.525, coolantThrough: false, notes: "Capto C3 V-insert back turn" },
  // C4 Capto
  { designation: "C4-DCLNR-27050-12", manufacturer: "Sandvik", system: "capto", mountingSize: "C4", insertShape: "CNMG", hand: "R", approachAngle_deg: 95, overhang_mm: 50, insertIC_mm: 12.7, coolantThrough: false, notes: "Capto C4 D-style IC12" },
  { designation: "C4-DCLNR-27055-16", manufacturer: "Sandvik", system: "capto", mountingSize: "C4", insertShape: "CNMG", hand: "R", approachAngle_deg: 95, overhang_mm: 55, insertIC_mm: 16.5, coolantThrough: false, notes: "Capto C4 D-style IC16" },
  { designation: "C4-SCLCR-22050-12", manufacturer: "Sandvik", system: "capto", mountingSize: "C4", insertShape: "CCMT", hand: "R", approachAngle_deg: 95, overhang_mm: 50, insertIC_mm: 12.7, coolantThrough: false, notes: "Capto C4 screw-clamp" },
  { designation: "C4-DDJNR-27055-15", manufacturer: "Sandvik", system: "capto", mountingSize: "C4", insertShape: "DNMG", hand: "R", approachAngle_deg: 93, overhang_mm: 55, insertIC_mm: 15.875, coolantThrough: false, notes: "Capto C4 93° D-insert" },
  { designation: "C4-SVJBR-22040-11", manufacturer: "Sandvik", system: "capto", mountingSize: "C4", insertShape: "VCMT", hand: "R", approachAngle_deg: 107, overhang_mm: 40, insertIC_mm: 9.525, coolantThrough: false, notes: "Capto C4 V-insert" },
  // C5 Capto
  { designation: "C5-DCLNR-27050-12", manufacturer: "Sandvik", system: "capto", mountingSize: "C5", insertShape: "CNMG", hand: "R", approachAngle_deg: 95, overhang_mm: 50, insertIC_mm: 12.7, coolantThrough: false, notes: "Capto C5 D-style IC12" },
  { designation: "C5-SCLCR-22040-09", manufacturer: "Sandvik", system: "capto", mountingSize: "C5", insertShape: "CCMT", hand: "R", approachAngle_deg: 95, overhang_mm: 40, insertIC_mm: 9.525, coolantThrough: false, notes: "Capto C5 screw-clamp IC09" },
  { designation: "C5-PCLNR-35150-16HP", manufacturer: "Sandvik", system: "capto", mountingSize: "C5", insertShape: "CNMG", hand: "R", approachAngle_deg: 95, overhang_mm: 150, insertIC_mm: 16.5, coolantThrough: true, notes: "Capto C5 HP coolant IC16" },
  { designation: "C5-SVJBR-22040-11", manufacturer: "Sandvik", system: "capto", mountingSize: "C5", insertShape: "VCMT", hand: "R", approachAngle_deg: 107, overhang_mm: 40, insertIC_mm: 9.525, coolantThrough: false, notes: "Capto C5 V-insert" },
  // C6 Capto
  { designation: "C6-DCLNR-27050-12", manufacturer: "Sandvik", system: "capto", mountingSize: "C6", insertShape: "CNMG", hand: "R", approachAngle_deg: 95, overhang_mm: 50, insertIC_mm: 12.7, coolantThrough: false, notes: "Capto C6 D-style IC12" },
  { designation: "C6-PCLNR-35175-16HP", manufacturer: "Sandvik", system: "capto", mountingSize: "C6", insertShape: "CNMG", hand: "R", approachAngle_deg: 95, overhang_mm: 175, insertIC_mm: 16.5, coolantThrough: true, notes: "Capto C6 HP coolant long reach" },
  { designation: "C6-SVJBR-27040-16", manufacturer: "Sandvik", system: "capto", mountingSize: "C6", insertShape: "VCMT", hand: "R", approachAngle_deg: 107, overhang_mm: 40, insertIC_mm: 16.5, coolantThrough: false, notes: "Capto C6 V-insert IC16" },
  { designation: "C6-DCMNN-00090-12", manufacturer: "Sandvik", system: "capto", mountingSize: "C6", insertShape: "CNMG", hand: "N", approachAngle_deg: 90, overhang_mm: 90, insertIC_mm: 12.7, coolantThrough: false, notes: "Multi-task neutral — C6 for back machining" },
  // C8 Capto
  { designation: "C8-DCLNR-35070-12", manufacturer: "Sandvik", system: "capto", mountingSize: "C8", insertShape: "CNMG", hand: "R", approachAngle_deg: 95, overhang_mm: 70, insertIC_mm: 12.7, coolantThrough: false, notes: "Capto C8 largest size" },
  { designation: "C8-PCLNR-45085-12HP", manufacturer: "Sandvik", system: "capto", mountingSize: "C8", insertShape: "CNMG", hand: "R", approachAngle_deg: 95, overhang_mm: 85, insertIC_mm: 12.7, coolantThrough: true, notes: "Capto C8 HP coolant" },
];

// ---------------------------------------------------------------------------
// SANDVIK — CAPTO ID BORING BARS (C3/C4/C5/C6)
// ---------------------------------------------------------------------------

export const SANDVIK_CAPTO_BORING_BARS: LatheTurningHolder[] = [
  // C3 boring
  { designation: "C3-SCLCL-11065-09", manufacturer: "Sandvik", system: "capto", mountingSize: "C3", insertShape: "CCMT", hand: "L", approachAngle_deg: 95, boreDia_mm: 11, minBore_mm: 14, overhang_mm: 65, insertIC_mm: 9.525, coolantThrough: false, notes: "Capto C3 boring bar ID 11mm bore" },
  { designation: "C3-SCLCL-13075-09", manufacturer: "Sandvik", system: "capto", mountingSize: "C3", insertShape: "CCMT", hand: "L", approachAngle_deg: 95, boreDia_mm: 13, minBore_mm: 17, overhang_mm: 75, insertIC_mm: 9.525, coolantThrough: false, notes: "Capto C3 13mm bore" },
  { designation: "C3-SDUCL-11065-07", manufacturer: "Sandvik", system: "capto", mountingSize: "C3", insertShape: "DCMT", hand: "L", approachAngle_deg: 93, boreDia_mm: 11, minBore_mm: 14, overhang_mm: 65, insertIC_mm: 7.938, coolantThrough: false, notes: "Capto C3 D-insert boring IC07" },
  { designation: "C3-PCLNL-17090-12HP", manufacturer: "Sandvik", system: "capto", mountingSize: "C3", insertShape: "CNMG", hand: "L", approachAngle_deg: 95, boreDia_mm: 17, minBore_mm: 22, overhang_mm: 90, insertIC_mm: 12.7, coolantThrough: true, notes: "Capto C3 HP coolant large bore" },
  // C4 boring
  { designation: "C4-SCLCL-11070-09", manufacturer: "Sandvik", system: "capto", mountingSize: "C4", insertShape: "CCMT", hand: "L", approachAngle_deg: 95, boreDia_mm: 11, minBore_mm: 14, overhang_mm: 70, insertIC_mm: 9.525, coolantThrough: false, notes: "Capto C4 smallest ID" },
  { designation: "C4-SCLCL-17090-09", manufacturer: "Sandvik", system: "capto", mountingSize: "C4", insertShape: "CCMT", hand: "L", approachAngle_deg: 95, boreDia_mm: 17, minBore_mm: 22, overhang_mm: 90, insertIC_mm: 9.525, coolantThrough: false, notes: "Capto C4 17mm bore" },
  { designation: "C4-SDUCL-17090-11", manufacturer: "Sandvik", system: "capto", mountingSize: "C4", insertShape: "DCMT", hand: "L", approachAngle_deg: 93, boreDia_mm: 17, minBore_mm: 21, overhang_mm: 90, insertIC_mm: 11.0, coolantThrough: false, notes: "D-insert ID boring C4" },
  { designation: "C4-PCLNL-27080-12HP", manufacturer: "Sandvik", system: "capto", mountingSize: "C4", insertShape: "CNMG", hand: "L", approachAngle_deg: 95, boreDia_mm: 27, minBore_mm: 35, overhang_mm: 80, insertIC_mm: 12.7, coolantThrough: true, notes: "HP large bore C4" },
  // C5 boring
  { designation: "C5-SCLCL-13080-09", manufacturer: "Sandvik", system: "capto", mountingSize: "C5", insertShape: "CCMT", hand: "L", approachAngle_deg: 95, boreDia_mm: 13, minBore_mm: 17, overhang_mm: 80, insertIC_mm: 9.525, coolantThrough: false, notes: "Capto C5 13mm ID" },
  { designation: "C5-SDUCL-22110-11", manufacturer: "Sandvik", system: "capto", mountingSize: "C5", insertShape: "DCMT", hand: "L", approachAngle_deg: 93, boreDia_mm: 22, minBore_mm: 28, overhang_mm: 110, insertIC_mm: 11.0, coolantThrough: false, notes: "D-insert C5 ID" },
  { designation: "C5-PCLNL-35150-16HP", manufacturer: "Sandvik", system: "capto", mountingSize: "C5", insertShape: "CNMG", hand: "L", approachAngle_deg: 95, boreDia_mm: 35, minBore_mm: 44, overhang_mm: 150, insertIC_mm: 16.5, coolantThrough: true, notes: "Large bore HP C5" },
  // C6 boring
  { designation: "C6-PCLNL-35175-16HP", manufacturer: "Sandvik", system: "capto", mountingSize: "C6", insertShape: "CNMG", hand: "L", approachAngle_deg: 95, boreDia_mm: 35, minBore_mm: 44, overhang_mm: 175, insertIC_mm: 16.5, coolantThrough: true, notes: "C6 large bore HP" },
];

// ---------------------------------------------------------------------------
// SANDVIK — SMALL BORING BARS (A-shank series, from ID turn (321))
// ---------------------------------------------------------------------------

export const SANDVIK_SHANK_BORING_BARS: LatheTurningHolder[] = [
  { designation: "A04F-STFCR 1.2", manufacturer: "Sandvik", system: "boring_bar", mountingSize: "4mm round", insertShape: "TCMT", hand: "R", approachAngle_deg: 91, boreDia_mm: 4, minBore_mm: 5.5, overhang_mm: 25, insertIC_mm: 3.97, coolantThrough: false, notes: "Smallest CoroTurn boring bar 4mm" },
  { designation: "A05H-STFCR 1.2", manufacturer: "Sandvik", system: "boring_bar", mountingSize: "5mm hex", insertShape: "TCMT", hand: "R", approachAngle_deg: 91, boreDia_mm: 5, minBore_mm: 7, overhang_mm: 30, insertIC_mm: 3.97, coolantThrough: false, notes: "5mm hex shank boring bar" },
  { designation: "A06M-SCLCR 2", manufacturer: "Sandvik", system: "boring_bar", mountingSize: "6mm round", insertShape: "CCMT", hand: "R", approachAngle_deg: 95, boreDia_mm: 6, minBore_mm: 8, overhang_mm: 40, insertIC_mm: 5.56, coolantThrough: false, notes: "6mm boring bar screw-clamp" },
  { designation: "A06M-SDUCR 2", manufacturer: "Sandvik", system: "boring_bar", mountingSize: "6mm round", insertShape: "DCMT", hand: "R", approachAngle_deg: 93, boreDia_mm: 6, minBore_mm: 8, overhang_mm: 40, insertIC_mm: 5.56, coolantThrough: false, notes: "6mm D-insert boring" },
  { designation: "A08M-SCLCR 2", manufacturer: "Sandvik", system: "boring_bar", mountingSize: "8mm round", insertShape: "CCMT", hand: "R", approachAngle_deg: 95, boreDia_mm: 8, minBore_mm: 10, overhang_mm: 50, insertIC_mm: 5.56, coolantThrough: false, notes: "8mm boring bar" },
  { designation: "A10R-SCLCR 2", manufacturer: "Sandvik", system: "boring_bar", mountingSize: "10mm round", insertShape: "CCMT", hand: "R", approachAngle_deg: 95, boreDia_mm: 10, minBore_mm: 13, overhang_mm: 60, insertIC_mm: 5.56, coolantThrough: false, notes: "10mm boring bar IC05" },
  { designation: "A10R-SCLCR 3", manufacturer: "Sandvik", system: "boring_bar", mountingSize: "10mm round", insertShape: "CCMT", hand: "R", approachAngle_deg: 95, boreDia_mm: 10, minBore_mm: 13, overhang_mm: 60, insertIC_mm: 7.938, coolantThrough: false, notes: "10mm boring bar IC08" },
  { designation: "A10R-SDUCR 2", manufacturer: "Sandvik", system: "boring_bar", mountingSize: "10mm round", insertShape: "DCMT", hand: "R", approachAngle_deg: 93, boreDia_mm: 10, minBore_mm: 12, overhang_mm: 60, insertIC_mm: 5.56, coolantThrough: false, notes: "10mm D-insert boring" },
  { designation: "A12S-SCLCR 3", manufacturer: "Sandvik", system: "boring_bar", mountingSize: "12mm round", insertShape: "CCMT", hand: "R", approachAngle_deg: 95, boreDia_mm: 12, minBore_mm: 15, overhang_mm: 80, insertIC_mm: 7.938, coolantThrough: false, notes: "12mm boring bar" },
  { designation: "A12S-SDUCR 3", manufacturer: "Sandvik", system: "boring_bar", mountingSize: "12mm round", insertShape: "DCMT", hand: "R", approachAngle_deg: 93, boreDia_mm: 12, minBore_mm: 15, overhang_mm: 80, insertIC_mm: 7.938, coolantThrough: false, notes: "12mm D-insert boring bar" },
  { designation: "A16T-SCLCR 3", manufacturer: "Sandvik", system: "boring_bar", mountingSize: "16mm round", insertShape: "CCMT", hand: "R", approachAngle_deg: 95, boreDia_mm: 16, minBore_mm: 20, overhang_mm: 100, insertIC_mm: 7.938, coolantThrough: false, notes: "16mm boring bar" },
  { designation: "A16T-SDUCR 3", manufacturer: "Sandvik", system: "boring_bar", mountingSize: "16mm round", insertShape: "DCMT", hand: "R", approachAngle_deg: 93, boreDia_mm: 16, minBore_mm: 19, overhang_mm: 100, insertIC_mm: 7.938, coolantThrough: false, notes: "16mm D-insert boring" },
  { designation: "A16T-PCLNR4HP", manufacturer: "Sandvik", system: "boring_bar", mountingSize: "16mm round", insertShape: "CNMG", hand: "R", approachAngle_deg: 95, boreDia_mm: 16, minBore_mm: 20, overhang_mm: 100, insertIC_mm: 12.7, coolantThrough: true, notes: "16mm HP coolant boring bar" },
  { designation: "A20T-SCLCR 4", manufacturer: "Sandvik", system: "boring_bar", mountingSize: "20mm round", insertShape: "CCMT", hand: "R", approachAngle_deg: 95, boreDia_mm: 20, minBore_mm: 25, overhang_mm: 125, insertIC_mm: 9.525, coolantThrough: false, notes: "20mm boring bar IC09" },
  { designation: "A20T-SDUCR 3", manufacturer: "Sandvik", system: "boring_bar", mountingSize: "20mm round", insertShape: "DCMT", hand: "R", approachAngle_deg: 93, boreDia_mm: 20, minBore_mm: 24, overhang_mm: 125, insertIC_mm: 7.938, coolantThrough: false, notes: "20mm D-insert boring" },
  { designation: "A24T-SCLCR 4", manufacturer: "Sandvik", system: "boring_bar", mountingSize: "24mm round", insertShape: "CCMT", hand: "R", approachAngle_deg: 95, boreDia_mm: 24, minBore_mm: 30, overhang_mm: 150, insertIC_mm: 9.525, coolantThrough: false, notes: "24mm boring bar" },
  { designation: "A32U-DCLNL 5", manufacturer: "Sandvik", system: "boring_bar", mountingSize: "32mm round", insertShape: "CNMG", hand: "L", approachAngle_deg: 95, boreDia_mm: 32, minBore_mm: 40, overhang_mm: 200, insertIC_mm: 15.875, coolantThrough: false, notes: "32mm large boring bar" },
  { designation: "A40V-DCLNR 5", manufacturer: "Sandvik", system: "boring_bar", mountingSize: "40mm round", insertShape: "CNMG", hand: "R", approachAngle_deg: 95, boreDia_mm: 40, minBore_mm: 50, overhang_mm: 250, insertIC_mm: 15.875, coolantThrough: false, notes: "40mm largest boring bar" },
];

// ---------------------------------------------------------------------------
// SANDVIK — GROOVING/PARTING HOLDERS (CoroCut 266 series)
// ---------------------------------------------------------------------------

export const SANDVIK_GROOVING_HOLDERS: GroovingPartingHolder[] = [
  // Shank-mounted grooving (266 series, OD external)
  { designation: "266RFA-123B", manufacturer: "Sandvik", system: "shank", mountingSize: "12×12", hand: "R", width_mm: 3.0, maxDOC_mm: 12, insertSystem: "N123 CoroCut2", coolantThrough: false, notes: "External RH grooving 12mm shank" },
  { designation: "266LFA-123B", manufacturer: "Sandvik", system: "shank", mountingSize: "12×12", hand: "L", width_mm: 3.0, maxDOC_mm: 12, insertSystem: "N123 CoroCut2", coolantThrough: false, notes: "External LH grooving 12mm shank" },
  { designation: "266RFG-163D", manufacturer: "Sandvik", system: "shank", mountingSize: "16×16", hand: "R", width_mm: 3.0, maxDOC_mm: 16, insertSystem: "N123 CoroCut2", coolantThrough: false, notes: "External RH grooving 16mm" },
  { designation: "266RFG-203D", manufacturer: "Sandvik", system: "shank", mountingSize: "20×20", hand: "R", width_mm: 3.0, maxDOC_mm: 20, insertSystem: "N123 CoroCut2", coolantThrough: false, notes: "External RH grooving 20mm" },
  { designation: "266RFG-204D", manufacturer: "Sandvik", system: "shank", mountingSize: "20×20", hand: "R", width_mm: 4.0, maxDOC_mm: 20, insertSystem: "N123 CoroCut2", coolantThrough: false, notes: "External 4mm-wide grooving 20mm" },
  // ID grooving (266 KF series on boring bars)
  { designation: "266RKF-D10-3", manufacturer: "Sandvik", system: "boring_bar", mountingSize: "10mm bore", hand: "R", width_mm: 3.0, maxDOC_mm: 8, insertSystem: "N123 CoroCut2", coolantThrough: false, notes: "ID grooving 10mm min bore 3mm wide" },
  { designation: "266RKF-D12-3", manufacturer: "Sandvik", system: "boring_bar", mountingSize: "12mm bore", hand: "R", width_mm: 3.0, maxDOC_mm: 10, insertSystem: "N123 CoroCut2", coolantThrough: false, notes: "ID grooving 12mm bore 3mm" },
  { designation: "266RKF-D16-3", manufacturer: "Sandvik", system: "boring_bar", mountingSize: "16mm bore", hand: "R", width_mm: 3.0, maxDOC_mm: 13, insertSystem: "N123 CoroCut2", coolantThrough: false, notes: "ID grooving 16mm bore 3mm" },
  { designation: "266RKF-D20-4", manufacturer: "Sandvik", system: "boring_bar", mountingSize: "20mm bore", hand: "R", width_mm: 4.0, maxDOC_mm: 16, insertSystem: "N123 CoroCut2", coolantThrough: false, notes: "ID grooving 20mm bore 4mm" },
  { designation: "266RKF-D32-4", manufacturer: "Sandvik", system: "boring_bar", mountingSize: "32mm bore", hand: "R", width_mm: 4.0, maxDOC_mm: 26, insertSystem: "N123 CoroCut2", coolantThrough: false, notes: "Large ID grooving 32mm bore" },
  // Capto grooving
  { designation: "C3-266RFG-22040-16", manufacturer: "Sandvik", system: "capto", mountingSize: "C3", hand: "R", width_mm: 3.0, maxDOC_mm: 16, insertSystem: "N123 CoroCut2", coolantThrough: false, notes: "Capto C3 grooving" },
  { designation: "C4-266RFG-27050-16", manufacturer: "Sandvik", system: "capto", mountingSize: "C4", hand: "R", width_mm: 3.0, maxDOC_mm: 20, insertSystem: "N123 CoroCut2", coolantThrough: false, notes: "Capto C4 grooving 3mm" },
  { designation: "C4-266RFG-27050-22", manufacturer: "Sandvik", system: "capto", mountingSize: "C4", hand: "R", width_mm: 3.0, maxDOC_mm: 22, insertSystem: "N123 CoroCut2", coolantThrough: false, notes: "Capto C4 grooving 3mm wider insert" },
  { designation: "C5-266RFG-27050-16", manufacturer: "Sandvik", system: "capto", mountingSize: "C5", hand: "R", width_mm: 3.0, maxDOC_mm: 20, insertSystem: "N123 CoroCut2", coolantThrough: false, notes: "Capto C5 grooving" },
  // SL 570 grooving
  { designation: "SL-266RFG-202514-16", manufacturer: "Sandvik", system: "sl570", mountingSize: "SL-20×25", hand: "R", width_mm: 3.0, maxDOC_mm: 14, insertSystem: "N123 CoroCut2", coolantThrough: false, notes: "SL-570 grooving blade 20×25" },
  { designation: "SL-266RFG-252517-16", manufacturer: "Sandvik", system: "sl570", mountingSize: "SL-25×25", hand: "R", width_mm: 3.0, maxDOC_mm: 17, insertSystem: "N123 CoroCut2", coolantThrough: false, notes: "SL-570 grooving blade 25×25" },
  { designation: "SL-266RFG-323222-16", manufacturer: "Sandvik", system: "sl570", mountingSize: "SL-32×32", hand: "R", width_mm: 3.0, maxDOC_mm: 22, insertSystem: "N123 CoroCut2", coolantThrough: false, notes: "SL-570 grooving blade 32×32" },
  { designation: "SL-266RKF-202514-16", manufacturer: "Sandvik", system: "sl570", mountingSize: "SL-20×25", hand: "R", width_mm: 3.0, maxDOC_mm: 14, insertSystem: "N123 CoroCut2", coolantThrough: false, notes: "SL-570 ID grooving" },
  // CP parting blades
  { designation: "CP-25BL-16-11", manufacturer: "Sandvik", system: "shank", mountingSize: "16×16", hand: "L", width_mm: 2.5, maxDOC_mm: 25, insertSystem: "N151 CoroCut1", coolantThrough: false, notes: "Parting blade 2.5mm LH 16mm shank" },
  { designation: "CP-25BR-16-11", manufacturer: "Sandvik", system: "shank", mountingSize: "16×16", hand: "R", width_mm: 2.5, maxDOC_mm: 25, insertSystem: "N151 CoroCut1", coolantThrough: false, notes: "Parting blade 2.5mm RH 16mm shank" },
  { designation: "CP-30AL-12-11", manufacturer: "Sandvik", system: "shank", mountingSize: "12×12", hand: "L", width_mm: 3.0, maxDOC_mm: 30, insertSystem: "N151 CoroCut1", coolantThrough: false, notes: "Parting blade 3.0mm 12mm shank LH" },
  { designation: "CP-30AR-16-11", manufacturer: "Sandvik", system: "shank", mountingSize: "16×16", hand: "R", width_mm: 3.0, maxDOC_mm: 30, insertSystem: "N151 CoroCut1", coolantThrough: false, notes: "Parting blade 3.0mm 16mm shank RH" },
  { designation: "C4-CP-25BR-27060-11B", manufacturer: "Sandvik", system: "capto", mountingSize: "C4", hand: "R", width_mm: 2.5, maxDOC_mm: 27, insertSystem: "N151 CoroCut1", coolantThrough: false, notes: "Capto C4 parting 2.5mm" },
  { designation: "SL-CP-25BR-40-11B", manufacturer: "Sandvik", system: "sl570", mountingSize: "SL-40", hand: "R", width_mm: 2.5, maxDOC_mm: 40, insertSystem: "N151 CoroCut1", coolantThrough: false, notes: "SL-570 parting 2.5mm" },
];

// ---------------------------------------------------------------------------
// SANDVIK — LATHE BASES / TURRET ADAPTERS (Okuma Multus specific)
// ---------------------------------------------------------------------------

export interface LatheBase {
  designation: string;
  manufacturer: string;
  turretType: string;
  captoCoupling: string;
  hand?: "L" | "R" | "N";
  notes: string;
}

export const SANDVIK_LATHE_BASES: LatheBase[] = [
  // Turret type — Okuma Multus turret bases
  { designation: "C4-TRE-OK60A", manufacturer: "Sandvik", turretType: "Okuma Multus", captoCoupling: "C4", hand: "R", notes: "Capto C4 turret extension Okuma OK60A — external tool" },
  { designation: "C4-TRE-OK60A-180", manufacturer: "Sandvik", turretType: "Okuma Multus", captoCoupling: "C4", hand: "N", notes: "180° flip mount C4 Okuma" },
  { designation: "C4-TRI-OK60C", manufacturer: "Sandvik", turretType: "Okuma Multus", captoCoupling: "C4", hand: "L", notes: "C4 internal tool mount Okuma OK60C" },
  { designation: "C4-TRI-OK60C-180", manufacturer: "Sandvik", turretType: "Okuma Multus", captoCoupling: "C4", hand: "N", notes: "180° C4 internal Okuma" },
  { designation: "C4-DNE-OK60C-E", manufacturer: "Sandvik", turretType: "Okuma Multus", captoCoupling: "C4", notes: "C4 direct neutral extension OK60C external" },
  { designation: "C4-DNE-OK60C-I", manufacturer: "Sandvik", turretType: "Okuma Multus", captoCoupling: "C4", notes: "C4 direct neutral extension OK60C internal" },
  { designation: "APBL-OK60A-25-HP", manufacturer: "Sandvik", turretType: "Okuma Multus", captoCoupling: "Capto adapter", notes: "High-pressure coolant adapter for Okuma OK60A turret" },
  { designation: "APBL-OK60A-25-HP-180", manufacturer: "Sandvik", turretType: "Okuma Multus", captoCoupling: "Capto adapter", notes: "HP coolant adapter 180° orientation" },
  // LOC type bases
  { designation: "392.419-63-ASHA-25", manufacturer: "Sandvik", turretType: "LOC coupling", captoCoupling: "ASHA-25", notes: "LOC-style adapter 63mm coupling ASHA-25 connection" },
];

// ---------------------------------------------------------------------------
// KENNAMETAL — TURNING HOLDERS (from Kennametal/Turning folder)
// ---------------------------------------------------------------------------

export const KENNAMETAL_TURNING_HOLDERS: LatheTurningHolder[] = [
  {
    designation: "A2BNSN26J03 .125W",
    manufacturer: "Kennametal",
    system: "shank",
    mountingSize: "26×26mm",
    insertShape: "SNMG",
    hand: "N",
    approachAngle_deg: 90,
    shankH_mm: 26,
    shankB_mm: 26,
    insertIC_mm: 9.525,
    coolantThrough: false,
    notes: "Square shank neutral S-insert with 0.125\" (3.18mm) insert width",
  },
  {
    designation: "A4SMR120314 3mmW",
    manufacturer: "Kennametal",
    system: "shank",
    mountingSize: "12×12mm",
    insertShape: "SNMG",
    hand: "R",
    approachAngle_deg: 75,
    shankH_mm: 12,
    shankB_mm: 12,
    insertIC_mm: 9.525,
    coolantThrough: false,
    notes: "S-insert turning holder 3mm wide — Kennametal metric",
  },
  {
    designation: "DDQNR-124B",
    manufacturer: "Kennametal",
    system: "shank",
    mountingSize: "12×12mm",
    insertShape: "DNMG",
    hand: "R",
    approachAngle_deg: 93,
    shankH_mm: 12,
    shankB_mm: 12,
    insertIC_mm: 12.7,
    coolantThrough: false,
    notes: "D-insert 93° RH holder IC12",
  },
  {
    designation: "NSR-123A .062W",
    manufacturer: "Kennametal",
    system: "shank",
    mountingSize: "12×12mm",
    insertShape: "N",
    hand: "R",
    approachAngle_deg: 90,
    shankH_mm: 12,
    shankB_mm: 12,
    insertIC_mm: 9.525,
    coolantThrough: false,
    notes: "Neutral grooving 0.062\" (1.57mm) wide insert",
  },
  {
    designation: "NSR-123A .120W",
    manufacturer: "Kennametal",
    system: "shank",
    mountingSize: "12×12mm",
    insertShape: "N",
    hand: "R",
    approachAngle_deg: 90,
    shankH_mm: 12,
    shankB_mm: 12,
    insertIC_mm: 9.525,
    coolantThrough: false,
    notes: "Neutral grooving 0.120\" (3.05mm) wide insert",
  },
];

// ---------------------------------------------------------------------------
// ISCAR — HOLDERS (from Iscar folder)
// ---------------------------------------------------------------------------

export const ISCAR_TURNING_HOLDERS: LatheTurningHolder[] = [
  {
    designation: "SER 0750 K16",
    manufacturer: "Iscar",
    system: "shank",
    mountingSize: "19.05×19.05mm (0.750\"sq)",
    insertShape: "S",
    hand: "R",
    approachAngle_deg: 90,
    shankH_mm: 19.05,
    shankB_mm: 19.05,
    insertIC_mm: 16.0,
    coolantThrough: false,
    notes: "SER threading holder — S insert 0.750\" sq shank, 16mm IC threading insert",
  },
];

// ---------------------------------------------------------------------------
// CUTTING PARAMETERS TABLE (by material group)
// ---------------------------------------------------------------------------

export const SANDVIK_CUTTING_PARAMETERS: CuttingParameters[] = [
  // P — Carbon & alloy steel
  { material: "Low carbon steel (P1)", isoGroup: "P", operation: "roughing", vc_min: 200, vc_max: 350, fn_min: 0.3, fn_max: 0.6, ap_min: 2.0, ap_max: 8.0, notes: "GC4325/GC4435 recommended. Flood coolant or dry." },
  { material: "Low carbon steel (P1)", isoGroup: "P", operation: "semi_finishing", vc_min: 280, vc_max: 420, fn_min: 0.15, fn_max: 0.3, ap_min: 0.5, ap_max: 2.5, notes: "GC4325/GC4415. Dry preferred." },
  { material: "Low carbon steel (P1)", isoGroup: "P", operation: "finishing", vc_min: 300, vc_max: 500, fn_min: 0.05, fn_max: 0.15, ap_min: 0.2, ap_max: 0.8, notes: "GC4415/cermet. Wiper insert for Ra < 0.8." },
  { material: "Alloy steel 42CrMo4 (P2)", isoGroup: "P", operation: "roughing", vc_min: 180, vc_max: 300, fn_min: 0.25, fn_max: 0.5, ap_min: 2.0, ap_max: 6.0, notes: "GC4325/KC5025." },
  { material: "Alloy steel 42CrMo4 (P2)", isoGroup: "P", operation: "finishing", vc_min: 250, vc_max: 420, fn_min: 0.08, fn_max: 0.2, ap_min: 0.2, ap_max: 1.0, notes: "GC4415 preferred." },
  { material: "Tool steel M2/D2 (P3)", isoGroup: "P", operation: "roughing", vc_min: 100, vc_max: 200, fn_min: 0.2, fn_max: 0.4, ap_min: 1.0, ap_max: 4.0, notes: "JM Die primary. GC4325 with coolant. Reduce speed 15% vs plain steel." },
  { material: "Tool steel M2/D2 (P3)", isoGroup: "P", operation: "finishing", vc_min: 150, vc_max: 280, fn_min: 0.05, fn_max: 0.15, ap_min: 0.1, ap_max: 0.5, notes: "GC4415 or cermet. CBN if >55HRC." },
  // M — Stainless steel
  { material: "Austenitic SS 304/316 (M1)", isoGroup: "M", operation: "roughing", vc_min: 120, vc_max: 220, fn_min: 0.2, fn_max: 0.4, ap_min: 1.5, ap_max: 5.0, notes: "GC2135/KC5010. Coolant mandatory. Sharp edge critical." },
  { material: "Austenitic SS 304/316 (M1)", isoGroup: "M", operation: "finishing", vc_min: 160, vc_max: 300, fn_min: 0.08, fn_max: 0.2, ap_min: 0.2, ap_max: 1.0, notes: "GC2025/IC808. Watch BUE." },
  { material: "Duplex SS 2205 (M2)", isoGroup: "M", operation: "roughing", vc_min: 80, vc_max: 160, fn_min: 0.15, fn_max: 0.35, ap_min: 1.0, ap_max: 3.0, notes: "GC2135 tough grade. High coolant pressure." },
  // K — Cast iron
  { material: "Grey cast iron (K1)", isoGroup: "K", operation: "roughing", vc_min: 200, vc_max: 450, fn_min: 0.3, fn_max: 0.6, ap_min: 2.0, ap_max: 8.0, notes: "GC1125/KCK15. Dry preferred — avoid thermal shock." },
  { material: "Grey cast iron (K1)", isoGroup: "K", operation: "finishing", vc_min: 300, vc_max: 600, fn_min: 0.1, fn_max: 0.3, ap_min: 0.3, ap_max: 1.5, notes: "GC1125 high speed. Wiper for smooth surface." },
  { material: "Nodular cast iron (K2)", isoGroup: "K", operation: "roughing", vc_min: 150, vc_max: 350, fn_min: 0.2, fn_max: 0.5, ap_min: 1.5, ap_max: 5.0, notes: "Tougher than grey CI. Interrupted cuts common." },
  // N — Non-ferrous
  { material: "Aluminium 6061/7075 (N1)", isoGroup: "N", operation: "roughing", vc_min: 500, vc_max: 2000, fn_min: 0.2, fn_max: 0.5, ap_min: 1.5, ap_max: 8.0, notes: "H13A uncoated. Sharp geometry essential." },
  { material: "Aluminium 6061/7075 (N1)", isoGroup: "N", operation: "finishing", vc_min: 800, vc_max: 3000, fn_min: 0.05, fn_max: 0.2, ap_min: 0.2, ap_max: 1.5, notes: "PCD or H13A. Coolant recommended to prevent sticking." },
  // S — Superalloys / Titanium
  { material: "Titanium Ti-6Al-4V (S1)", isoGroup: "S", operation: "roughing", vc_min: 25, vc_max: 55, fn_min: 0.15, fn_max: 0.35, ap_min: 1.0, ap_max: 3.0, notes: "S30T grade. High-pressure coolant 70 bar+ mandatory. Low speed." },
  { material: "Titanium Ti-6Al-4V (S1)", isoGroup: "S", operation: "finishing", vc_min: 35, vc_max: 80, fn_min: 0.05, fn_max: 0.15, ap_min: 0.2, ap_max: 1.0, notes: "S05F grade. HP coolant. Watch chatter." },
  { material: "Inconel 718 (S2)", isoGroup: "S", operation: "roughing", vc_min: 20, vc_max: 45, fn_min: 0.1, fn_max: 0.25, ap_min: 0.5, ap_max: 2.0, notes: "Extreme heat — coolant critical. Monitor tool wear." },
  { material: "Inconel 718 (S2)", isoGroup: "S", operation: "finishing", vc_min: 25, vc_max: 60, fn_min: 0.05, fn_max: 0.12, ap_min: 0.1, ap_max: 0.5, notes: "Use ceramic inserts (SiAlON) for high speed." },
  // H — Hardened steel
  { material: "Hardened steel 45-55 HRC (H1)", isoGroup: "H", operation: "finishing", vc_min: 100, vc_max: 220, fn_min: 0.05, fn_max: 0.15, ap_min: 0.05, ap_max: 0.3, notes: "CBN CB7015/CB7025. Dry only. Rigid setup essential." },
  { material: "Hardened steel 55-65 HRC (H2)", isoGroup: "H", operation: "finishing", vc_min: 80, vc_max: 160, fn_min: 0.03, fn_max: 0.1, ap_min: 0.03, ap_max: 0.15, notes: "CBN CB7015 only. Extremely rigid — no vibration." },
];

export const KENNAMETAL_CUTTING_PARAMETERS: CuttingParameters[] = [
  { material: "Steel general (P1)", isoGroup: "P", operation: "roughing", vc_min: 180, vc_max: 380, fn_min: 0.25, fn_max: 0.6, ap_min: 2.0, ap_max: 7.0, notes: "KC5025/KCP25B. Flood coolant or dry." },
  { material: "Steel general (P1)", isoGroup: "P", operation: "finishing", vc_min: 260, vc_max: 500, fn_min: 0.08, fn_max: 0.2, ap_min: 0.2, ap_max: 1.0, notes: "KC5010/KC5510." },
  { material: "Stainless (M1)", isoGroup: "M", operation: "roughing", vc_min: 110, vc_max: 240, fn_min: 0.15, fn_max: 0.4, ap_min: 1.0, ap_max: 4.0, notes: "KCM15/KCU10. Coolant mandatory." },
  { material: "Cast iron (K1)", isoGroup: "K", operation: "roughing", vc_min: 180, vc_max: 420, fn_min: 0.25, fn_max: 0.55, ap_min: 1.5, ap_max: 7.0, notes: "KCK15 preferred. Dry." },
  { material: "Hardened steel H1", isoGroup: "H", operation: "finishing", vc_min: 80, vc_max: 200, fn_min: 0.04, fn_max: 0.14, ap_min: 0.04, ap_max: 0.25, notes: "KBH10 CBN. Dry only." },
];

export const ISCAR_CUTTING_PARAMETERS: CuttingParameters[] = [
  { material: "Steel general (P1)", isoGroup: "P", operation: "roughing", vc_min: 150, vc_max: 380, fn_min: 0.2, fn_max: 0.6, ap_min: 2.0, ap_max: 7.0, notes: "IC9150/IC930 CVD grades." },
  { material: "Steel general (P1)", isoGroup: "P", operation: "finishing", vc_min: 250, vc_max: 550, fn_min: 0.06, fn_max: 0.18, ap_min: 0.1, ap_max: 0.8, notes: "IC807/IC808 PVD grades." },
  { material: "Stainless (M1)", isoGroup: "M", operation: "semi_finishing", vc_min: 120, vc_max: 300, fn_min: 0.1, fn_max: 0.3, ap_min: 0.5, ap_max: 3.0, notes: "IC808 SUMO TEC. Coolant." },
  { material: "Cast iron (K1)", isoGroup: "K", operation: "roughing", vc_min: 180, vc_max: 500, fn_min: 0.2, fn_max: 0.5, ap_min: 1.5, ap_max: 6.0, notes: "IC328 CVD. Dry preferred." },
  { material: "Aluminium (N1)", isoGroup: "N", operation: "roughing", vc_min: 600, vc_max: 2500, fn_min: 0.15, fn_max: 0.45, ap_min: 1.0, ap_max: 6.0, notes: "IC20 uncoated. Very sharp geometry." },
];

// ---------------------------------------------------------------------------
// APPLICATION GUIDELINES
// ---------------------------------------------------------------------------

export const APPLICATION_GUIDELINES: ApplicationGuideline[] = [
  {
    scenario: "Heavy roughing steel (DOC > 5mm)",
    manufacturer: "Sandvik",
    recommendedGrades: ["GC4325", "GC4435"],
    avoidGrades: ["GC4415", "cermet"],
    holderNotes: "Use CNMG or SNMG inserts. Negative geometry. 95° approach angle to distribute forces. Minimum 25mm shank.",
    parameterAdjustment: "Start at mid-range Vc, increase feed to 0.5 mm/rev, DOC 3–6mm",
    coolant: "Flood coolant or dry. Avoid interrupted coolant.",
    warnings: ["Excessive vibration = reduce DOC first", "Flank wear > 0.3mm = change insert", "Chipping = reduce feed rate 20%"],
  },
  {
    scenario: "Tool steel turning (M2, D2, A2, S7, H13) — JM Die application",
    recommendedGrades: ["GC4325", "KC5010", "IC930"],
    holderNotes: "D-insert (DCMT/DNMG) preferred for profiling die forms. 55° approach allows undercutting. HP coolant holders recommended.",
    parameterAdjustment: "Reduce Vc 15–20% vs plain steel. Use wiper inserts for finishing to achieve Ra < 1.6.",
    coolant: "High-pressure coolant (70 bar) for finishing. Flood for roughing.",
    warnings: ["Tool steel work-hardens on interrupted cuts — use tougher grade", "Thermal shock from coolant interruption can crack inserts", "Annealed vs hardened stock requires different grades"],
  },
  {
    scenario: "Stainless steel turning (304, 316, 17-4PH)",
    manufacturer: "Sandvik",
    recommendedGrades: ["GC2135", "GC2025", "IC808"],
    avoidGrades: ["GC4325", "GC4435"],
    holderNotes: "Positive geometry inserts (CCMT, DCMT). Screw-clamp holders. Minimum clearance 7° to prevent rubbing.",
    parameterAdjustment: "Lower speed 20% vs steel, consistent feed to avoid work-hardening, no dwell.",
    coolant: "Flood coolant mandatory. High pressure for finishing. Never dry.",
    warnings: ["BUE risk — use PVD coated", "Work-hardening on dwell — maintain constant feed", "Gummy chips — verify chipbreaker geometry"],
  },
  {
    scenario: "Interrupted cuts / scale breaking",
    manufacturer: "Sandvik",
    recommendedGrades: ["GC4435", "GC2135", "KC5025", "IC9150"],
    avoidGrades: ["cermet", "CB7015", "GC4415"],
    holderNotes: "Tougher CBN or PVD grades. Chamfered or T-land edge prep. Negative geometry preferred.",
    parameterAdjustment: "Reduce Vc 20–30% vs continuous. Increase feed slightly. Max DOC first pass to break scale.",
    coolant: "Flood or dry. Avoid intermittent coolant flow — thermal cycling cracks inserts.",
    warnings: ["Never use cermet on interrupted cuts", "Ramp into cut to avoid direct impact", "Check clamp torque — impacts loosen tool"],
  },
  {
    scenario: "Hardened steel die turning (>45 HRC) — JM Die hardened tooling",
    recommendedGrades: ["CB7015", "CB7025", "KBH10"],
    avoidGrades: ["GC4325", "GC4415", "IC808"],
    holderNotes: "Rigid setup mandatory. Anti-vibration boring bars for ID. Minimum overhang. CBN must be supported — no interrupted cuts without CB7025.",
    parameterAdjustment: "Vc 100–180 m/min, fn 0.05–0.12 mm/rev, ap 0.05–0.25mm. Climb turning preferred.",
    coolant: "Dry machining preferred. Compressed air for chip evacuation. Never flood — thermal shock fractures CBN.",
    warnings: ["Part must be held rigidly — hard turning is sensitive to vibration", "Surface integrity critical — avoid BUE with proper speed", "Insert nose contact = failure — use correct approach geometry"],
  },
  {
    scenario: "Capto C6 deep boring (L/D > 5)",
    manufacturer: "Sandvik",
    recommendedGrades: ["GC2025", "GC4325"],
    holderNotes: "Use Capto C6 or C8 boring bars. Anti-vibration Silent Tools for L/D > 6. HP coolant through spindle.",
    parameterAdjustment: "Reduce Vc 20–30%, increase fn for chip evacuation, ap ≤ 0.5mm per pass for stability.",
    coolant: "High-pressure through-tool coolant (70–100 bar) for chip control in blind holes.",
    warnings: ["L/D > 6 = use anti-vibration bar", "Check resonance frequency before start", "Chip packing in blind bore is critical failure mode"],
  },
  {
    scenario: "Grooving and parting (CoroCut 266 / CP blades)",
    manufacturer: "Sandvik",
    recommendedGrades: ["GC1125", "GC2025", "GC4325"],
    holderNotes: "CoroCut 2 (N123) for external grooving. CoroCut 1 (N151/N123) for parting. Use through-coolant holders whenever possible.",
    parameterAdjustment: "Vc 80–200 m/min for steel, fn 0.05–0.15 mm/rev. Reduce feed at breakthrough by 30%.",
    coolant: "Flood or through-tool coolant. Direct jet at cutting edge.",
    warnings: ["Parting: support workpiece with tailstock or steady rest", "Grooving vibration = reduce overhang or use wider blade", "SL-570 system allows quick change without re-indicating"],
  },
  {
    scenario: "Titanium and superalloy turning (Okuma Multus live tooling)",
    manufacturer: "Sandvik",
    recommendedGrades: ["S05F", "S30T"],
    avoidGrades: ["GC4325", "GC4435"],
    holderNotes: "HP coolant Capto holders (P-series) mandatory. Wiper geometry for finishing. Short, rigid tool assemblies.",
    parameterAdjustment: "Ti: Vc 30–60 m/min, fn 0.1–0.2 mm/rev. Consistent chip load to prevent rubbing.",
    coolant: "High-pressure coolant (100+ bar) at cutting zone. Never dry.",
    warnings: ["Titanium fires possible without coolant", "Avoid work-hardening — maintain feed at all times", "Tool temperature is the primary failure mode"],
  },
  {
    scenario: "Aluminium die casting and alloys",
    recommendedGrades: ["H13A", "IC20"],
    holderNotes: "Positive, sharp geometry mandatory (CCMT, DCMT). High precision holders to minimize runout.",
    parameterAdjustment: "Very high Vc (500–3000 m/min), moderate feed 0.1–0.3 mm/rev. Light DOC for finish.",
    coolant: "Flood or mist. Prevents built-up edge and pitting on insert.",
    warnings: ["Si content above 13% (hypereutectic) needs PCD inserts", "BUE check after 10 minutes run time", "Never use coated inserts — TiN coating accelerates BUE on Al"],
  },
  {
    scenario: "Okuma Multus multi-task turning — second spindle / back working",
    manufacturer: "Sandvik",
    recommendedGrades: ["GC4325", "GC2025"],
    holderNotes: "Use neutral (N) or left-hand holders on second spindle. C6-DCMNN multi-task holder for simultaneous operations. TR (twin-clamping) series for high-feed rates.",
    parameterAdjustment: "Same parameters as primary spindle. Synchronize spindle speeds to ±1 RPM for pick-off.",
    coolant: "Both spindles — dedicated coolant circuits. HP coolant for back-working difficult alloys.",
    warnings: ["Verify tool clearance during C-axis indexing", "Multi-task holders must be zero-point referenced", "Part transfer gripping force limits max DOC on second op"],
  },
];

// ---------------------------------------------------------------------------
// CAPTO CONNECTION SPECIFICATIONS
// ---------------------------------------------------------------------------

export interface CaptoSpec {
  size: string;
  flangeOD_mm: number;
  nominalTorque_Nm: number;
  repeatability_um: number;
  coolantPressure_bar: number;
  typicalApplication: string;
}

export const CAPTO_CONNECTION_SPECS: CaptoSpec[] = [
  { size: "C3", flangeOD_mm: 31.75, nominalTorque_Nm: 50, repeatability_um: 2, coolantPressure_bar: 80, typicalApplication: "Small lathes, boring bars D<25mm" },
  { size: "C4", flangeOD_mm: 40.0, nominalTorque_Nm: 100, repeatability_um: 2, coolantPressure_bar: 80, typicalApplication: "Medium lathes, standard OD turning" },
  { size: "C5", flangeOD_mm: 50.0, nominalTorque_Nm: 200, repeatability_um: 2, coolantPressure_bar: 80, typicalApplication: "Medium-large lathes, standard turning" },
  { size: "C6", flangeOD_mm: 63.0, nominalTorque_Nm: 400, repeatability_um: 2, coolantPressure_bar: 100, typicalApplication: "Large lathes, Okuma Multus primary — roughing and finishing" },
  { size: "C8", flangeOD_mm: 80.0, nominalTorque_Nm: 800, repeatability_um: 2, coolantPressure_bar: 100, typicalApplication: "Largest lathes, heavy roughing, long overhang" },
];

// ---------------------------------------------------------------------------
// MASTER CATALOG EXPORT
// ---------------------------------------------------------------------------

export const LATHE_TOOLING_CATALOG = {
  iscar: {
    grades: ISCAR_INSERT_GRADES,
    holders: ISCAR_TURNING_HOLDERS,
    cuttingParameters: ISCAR_CUTTING_PARAMETERS,
  },
  kennametal: {
    grades: KENNAMETAL_INSERT_GRADES,
    holders: KENNAMETAL_TURNING_HOLDERS,
    cuttingParameters: KENNAMETAL_CUTTING_PARAMETERS,
  },
  sandvik: {
    grades: SANDVIK_INSERT_GRADES,
    insertGeometries: SANDVIK_INSERT_GEOMETRIES,
    odTurningHolders: SANDVIK_OD_TURNING_HOLDERS,
    captoOdHolders: SANDVIK_CAPTO_OD_HOLDERS,
    captoBoringBars: SANDVIK_CAPTO_BORING_BARS,
    shankBoringBars: SANDVIK_SHANK_BORING_BARS,
    groovingPartingHolders: SANDVIK_GROOVING_HOLDERS,
    latheBases: SANDVIK_LATHE_BASES,
    cuttingParameters: SANDVIK_CUTTING_PARAMETERS,
  },
  captoConnectionSpecs: CAPTO_CONNECTION_SPECS,
  applicationGuidelines: APPLICATION_GUIDELINES,
} as const;

// Convenience accessors
export function getGradesByManufacturer(manufacturer: "Sandvik" | "Kennametal" | "Iscar"): InsertGrade[] {
  const all = [...SANDVIK_INSERT_GRADES, ...KENNAMETAL_INSERT_GRADES, ...ISCAR_INSERT_GRADES];
  return all.filter((g) => g.manufacturer === manufacturer);
}

export function getGradesByMaterial(isoGroup: "P" | "M" | "K" | "N" | "S" | "H"): InsertGrade[] {
  const all = [...SANDVIK_INSERT_GRADES, ...KENNAMETAL_INSERT_GRADES, ...ISCAR_INSERT_GRADES];
  return all.filter((g) => g.isoGroups.includes(isoGroup));
}

export function getFinishingGrades(isoGroup: "P" | "M" | "K" | "N" | "S" | "H"): InsertGrade[] {
  return getGradesByMaterial(isoGroup).filter((g) => g.finishing === true);
}

export function getRoughingGrades(isoGroup: "P" | "M" | "K" | "N" | "S" | "H"): InsertGrade[] {
  return getGradesByMaterial(isoGroup).filter((g) => g.roughing === true);
}

export function getInterruptedCutGrades(): InsertGrade[] {
  const all = [...SANDVIK_INSERT_GRADES, ...KENNAMETAL_INSERT_GRADES, ...ISCAR_INSERT_GRADES];
  return all.filter((g) => g.interruptedCut === true);
}

export function getCaptoHoldersBySize(size: "C3" | "C4" | "C5" | "C6" | "C8"): LatheTurningHolder[] {
  return [...SANDVIK_CAPTO_OD_HOLDERS, ...SANDVIK_CAPTO_BORING_BARS].filter((h) => h.mountingSize === size);
}

export function getCuttingParams(isoGroup: "P" | "M" | "K" | "N" | "S" | "H", operation: "roughing" | "semi_finishing" | "finishing"): CuttingParameters[] {
  const all = [...SANDVIK_CUTTING_PARAMETERS, ...KENNAMETAL_CUTTING_PARAMETERS, ...ISCAR_CUTTING_PARAMETERS];
  return all.filter((p) => p.isoGroup === isoGroup && p.operation === operation);
}
