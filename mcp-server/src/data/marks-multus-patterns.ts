/**
 * Mark's MULTUS Pattern Library — MS5 U-LAT40-U-LAT41
 *
 * Curated programming patterns extracted from JM Die's lathe macro programs.
 * These patterns represent 30+ years of production machining expertise.
 *
 * Source files: H:/PRISM/resources/MACRO PROGRAMS/*.MIN
 * Additional: H:/PRISM/JM DIE/CNC LATHE/.../*.MIN (16,558 production files)
 *
 * @see LatheJMDieKnowledgeEngine for runtime pattern injection
 */

export interface LathePattern {
  id: string;
  name: string;
  category: "macro_structure" | "cycle_sequence" | "cutoff_technique" | "bar_handling" | "parametric" | "safety" | "optimization";
  description: string;
  use_case: string;
  machine_type: "lathe" | "mill_turn" | "swiss" | "any";
  controller: "okuma_osp" | "fanuc" | "mazatrol" | "any";

  // Pattern structure
  variables?: Array<{
    name: string;
    purpose: string;
    typical_value?: string;
    unit?: string;
  }>;

  // Code template (with placeholders)
  template?: string;

  // Source reference
  source_file?: string;
  line_range?: string;

  // Applicability
  part_types: string[];
  material_groups: ("P" | "M" | "K" | "N" | "S" | "H")[];

  // Safety considerations
  safety_notes?: string[];
}

export const MARKS_MULTUS_PATTERNS: LathePattern[] = [
  // ============================================================================
  // Macro Structure Patterns
  // ============================================================================
  {
    id: "PAT-001",
    name: "Parametric Casing Macro",
    category: "macro_structure",
    description: "Full parametric casing macro with V-variable architecture for one-shot programming of round casing parts",
    use_case: "Fast programming of cold heading die casings with consistent quality",
    machine_type: "lathe",
    controller: "okuma_osp",
    variables: [
      { name: "V1", purpose: "Stock diameter", unit: "in" },
      { name: "V2", purpose: "Finish OD", unit: "in" },
      { name: "V3", purpose: "Drill/start hole diameter", unit: "in" },
      { name: "V4", purpose: "Finish ID", unit: "in" },
      { name: "V5", purpose: "Part length", unit: "in" },
      { name: "V6", purpose: "OD chamfer/radius size", unit: "in" },
      { name: "V7", purpose: "OD feature type (1=chamfer, 2=radius)" },
      { name: "V35-V39", purpose: "Stock allowances (radial/axial)", unit: "in" },
      { name: "V40-V42", purpose: "Depth of cut (OD/ID/face)", unit: "in" },
      { name: "V45-V48", purpose: "Surface speeds (SFM)", unit: "sfm" },
      { name: "V50-V56", purpose: "Feed rates (IPR)", unit: "ipr" },
      { name: "V65-V69", purpose: "Max RPM limits", unit: "rpm" },
    ],
    template: `O1001
(T010101 - FACE/OD ROUGH)
(T020202 - FACE/OD FINISH)
(==========================================================)
(============= ADJUSTABLE PARAMETERS ======================)
V1 = [STOCK_DIA]     (STOCK DIAMETER)
V2 = [FINISH_OD]     (FINISH OD)
V3 = [DRILL_DIA]     (DRILL SIZE)
V4 = [FINISH_ID]     (FINISH ID)
V5 = [PART_LEN]      (PART LENGTH)
...
(============= AUTO-CALCULATIONS ==========================)
V70 = [V21 * 3.82] / V20    (SPOT DRILL RPM)
V71 = [V26 * 3.82] / V25    (DRILL 1 RPM)`,
    source_file: "CASING_MACRO.MIN",
    part_types: ["casing", "round_die", "insert"],
    material_groups: ["P", "H"],
    safety_notes: [
      "Max RPM limits prevent tool/workpiece damage at small diameters",
      "Stock allowance ensures consistent finish quality",
      "Auto-calculations ensure correct speeds from SFM",
    ],
  },

  {
    id: "PAT-002",
    name: "Tool Section Header",
    category: "macro_structure",
    description: "Standardized tool listing at program start with T-address comments",
    use_case: "Setup documentation and tool tracking",
    machine_type: "any",
    controller: "any",
    template: `(T010101 - FACE/OD ROUGH)
(T020202 - FACE/OD FINISH)
(T030303 - SPOT DRILL)
(T050505 - DRILL 1)
(T060606 - DRILL 2 - OPTIONAL)
(T070707 - ID ROUGH - OPTIONAL)
(T080808 - ID FINISH)
(T111111 - CUTOFF)`,
    part_types: ["any"],
    material_groups: ["P", "M", "K", "N", "S", "H"],
    safety_notes: ["Verify tool offsets before running new program"],
  },

  // ============================================================================
  // Cycle Sequence Patterns
  // ============================================================================
  {
    id: "PAT-003",
    name: "Standard OD Cycle Sequence",
    category: "cycle_sequence",
    description: "Face → OD rough → OD chamfer/radius → OD finish sequence",
    use_case: "Most external turning operations",
    machine_type: "lathe",
    controller: "any",
    template: `(=== FACE ===)
G50 S[MAX_RPM]
G96 S[SFM]
G0 X[STOCK_DIA + CLEARANCE] Z[CLEARANCE]
G71 U[DOC] R0.03
G71 P100 Q200 U[FINISH_STOCK] W[AXIAL_STOCK] F[FEED]

(=== OD FINISH ===)
G50 S[MAX_RPM_FINISH]
G96 S[SFM_FINISH]
G70 P100 Q200`,
    part_types: ["shaft", "casing", "plug", "insert"],
    material_groups: ["P", "M", "K", "N", "S", "H"],
  },

  {
    id: "PAT-004",
    name: "ID Drilling & Boring Sequence",
    category: "cycle_sequence",
    description: "Spot drill → Peck drill → ID rough → ID finish sequence",
    use_case: "Internal hole creation and finishing",
    machine_type: "lathe",
    controller: "any",
    template: `(=== SPOT DRILL ===)
T030303
G50 S[MAX_RPM]
G97 S[V70]    (CALC FROM SFM)
G0 X0 Z[CLEARANCE]
G83 Z-[SPOT_DEPTH] Q[PECK] F[FEED]
G80

(=== PECK DRILL ===)
T050505
G50 S[MAX_RPM]
G97 S[V71]
G0 X0 Z[CLEARANCE]
G83 Z-[DRILL_DEPTH] Q[PECK] R[CLEARANCE] F[FEED]
G80

(=== ID ROUGH ===)
T070707
G50 S[MAX_RPM]
G96 S[SFM]
G71 U[DOC] R0.03
G71 P300 Q400 U-[FINISH_STOCK] W[AXIAL_STOCK] F[FEED]`,
    part_types: ["casing", "bushing", "sleeve"],
    material_groups: ["P", "M", "K", "N", "S", "H"],
  },

  // ============================================================================
  // Cutoff Technique Patterns
  // ============================================================================
  {
    id: "PAT-005",
    name: "S1/S2 Cutoff with Grab",
    category: "cutoff_technique",
    description: "Mark's signature cutoff technique: rough cut to center, grab with sub-spindle, finish part-off",
    use_case: "Bar work with sub-spindle for clean cutoff without witness mark",
    machine_type: "mill_turn",
    controller: "okuma_osp",
    template: `(=== S1 ROUGH CUTOFF TO PINCH DIA ===)
T111111 M51   (CUTOFF TOOL)
G50 S[MAX_RPM] T11
G97 S[RPM]
G0 X[STOCK_DIA + 0.1] Z-[PART_LEN - INSERT_WIDTH/2]
G1 X[PINCH_DIA] F[CUTOFF_FEED]
G0 X[STOCK_DIA + 0.1]

(=== S2 GRAB AND PULL ===)
M68             (COLLET CLOSE S2)
M51             (S1 STOP)
G28 W0          (S2 RETRACT)

(=== S1 FINAL CUTOFF ===)
M03 S[RPM]
G0 X[PINCH_DIA + 0.02]
G1 X-0.02 F[FINISH_FEED]
G0 X[STOCK_DIA + 0.1]`,
    part_types: ["bar_work", "screw", "pin"],
    material_groups: ["P", "M"],
    safety_notes: [
      "Pinch diameter must allow secure sub-spindle grip",
      "Verify collet size matches part diameter",
      "Check sub-spindle stroke limits",
    ],
  },

  {
    id: "PAT-006",
    name: "Simple Cutoff with Chamfer",
    category: "cutoff_technique",
    description: "Standard cutoff with optional chamfer/radius on cutoff side",
    use_case: "Single-spindle bar work or chuck work cutoff",
    machine_type: "lathe",
    controller: "any",
    variables: [
      { name: "V13", purpose: "Cutoff feature type (0=none, 1=chamfer, 2=radius)" },
      { name: "V14", purpose: "Chamfer/radius size", unit: "in" },
      { name: "V15", purpose: "Chamfer angle", unit: "deg" },
      { name: "V17", purpose: "Insert width", unit: "in" },
    ],
    template: `(=== CUTOFF WITH CHAMFER ===)
T111111
G50 S[V172]     (MAX RPM)
G96 S[V48]      (CUTOFF SFM)
G0 X[V1 + V61] Z-[[V5 + V17/2]]

IF [V13 EQ 1] THEN GOTO 500    (CHAMFER)
IF [V13 EQ 2] THEN GOTO 510    (RADIUS)
GOTO 520                        (STRAIGHT CUTOFF)

N500 (CHAMFER)
G1 X[V2 + V14*2] Z-[[V5 + V17/2 - V14]] F[V16]
GOTO 520

N510 (RADIUS)
G3 X[V2 + V14*2] Z-[[V5 + V17/2 - V14]] R[V14] F[V16]

N520 (CUTOFF)
G1 X-0.02 F[V56]`,
    part_types: ["bar_work", "casing"],
    material_groups: ["P", "M", "K"],
    safety_notes: [
      "Reduce feed rate at center for clean break",
      "Consider dwell at center for chip clearing",
    ],
  },

  // ============================================================================
  // Bar Handling Patterns
  // ============================================================================
  {
    id: "PAT-007",
    name: "Bar Pull with Part Counter",
    category: "bar_handling",
    description: "Bar puller cycle with part counter and bar-end detection",
    use_case: "Production bar feeding with automatic stock management",
    machine_type: "lathe",
    controller: "okuma_osp",
    variables: [
      { name: "VC90", purpose: "Part counter" },
      { name: "VC91", purpose: "Parts per bar" },
      { name: "V5", purpose: "Part length", unit: "in" },
      { name: "V17", purpose: "Cutoff insert width", unit: "in" },
    ],
    template: `(=== BAR PULL ===)
VC90 = VC90 + 1       (INCREMENT COUNTER)
IF [VC90 GE VC91] THEN GOTO 900  (BAR END)

G0 Z[BAR_PULL_POS]
M69                    (COLLET OPEN)
G4 U0.5               (DWELL)
G0 Z-[V5 + V17 + 0.1]  (PULL BAR)
M68                    (COLLET CLOSE)
G4 U0.3
G28 U0 W0             (HOME)

GOTO 10               (NEXT PART)

N900 (BAR END)
M00 (OPERATOR: LOAD NEW BAR)
VC90 = 0              (RESET COUNTER)
GOTO 10`,
    part_types: ["bar_work"],
    material_groups: ["P", "M", "K", "N", "S", "H"],
    safety_notes: [
      "Verify bar puller stroke covers part length + cutoff width",
      "Ensure collet grip is secure before pulling",
      "Check bar remnant length for safe machining",
    ],
  },

  {
    id: "PAT-008",
    name: "Sub-Spindle Grab and Transfer",
    category: "bar_handling",
    description: "Transfer part from main spindle to sub-spindle for back-working",
    use_case: "Complete parts in one setup with back-end features",
    machine_type: "mill_turn",
    controller: "okuma_osp",
    template: `(=== SUB-SPINDLE APPROACH ===)
G0 W[CLEARANCE]     (SUB TO APPROACH)
M102                (S2 FORWARD)
G31 W-[TRAVEL] F[APPROACH_FEED]  (APPROACH WITH SKIP)

(=== SYNCHRONIZE AND GRAB ===)
M111                (SYNC S1/S2)
M68                 (S2 COLLET CLOSE)
G4 U0.5             (CONFIRM GRIP)
M69 M51             (S1 OPEN, S1 STOP)

(=== PART-OFF AND RETRACT ===)
T111111
G0 X[OD + 0.1]
G1 X-0.02 F[CUTOFF_FEED]
M51                 (S1 STOP)
G0 W[RETRACT]       (S2 RETRACT)`,
    part_types: ["bar_work", "screw", "shaft"],
    material_groups: ["P", "M", "K"],
    safety_notes: [
      "Verify spindle sync before grab",
      "Check S2 collet pressure adequate",
      "Confirm part-off complete before S2 retract",
    ],
  },

  // ============================================================================
  // Parametric Patterns
  // ============================================================================
  {
    id: "PAT-009",
    name: "SFM to RPM Auto-Calculation",
    category: "parametric",
    description: "Automatic RPM calculation from surface feet per minute and diameter",
    use_case: "Consistent cutting speeds across different diameters",
    machine_type: "any",
    controller: "okuma_osp",
    variables: [
      { name: "SFM", purpose: "Surface feet per minute" },
      { name: "DIA", purpose: "Cutting diameter", unit: "in" },
    ],
    template: `(=== RPM FROM SFM ===)
(Formula: RPM = SFM × 3.82 / DIA)

V70 = [V21 * 3.82] / V20    (SPOT DRILL: V21=SFM, V20=DIA)
V71 = [V26 * 3.82] / V25    (DRILL 1)
V158 = [V33 * 3.82] / V32   (DRILL 2)

(Usage in G97)
G97 S[V70]    (CONSTANT RPM MODE)`,
    part_types: ["any"],
    material_groups: ["P", "M", "K", "N", "S", "H"],
    safety_notes: [
      "Always apply G50 S[MAX_RPM] before G96 for CSS limiting",
    ],
  },

  {
    id: "PAT-010",
    name: "Drill Point Depth Compensation",
    category: "parametric",
    description: "Automatic depth adjustment for drill point geometry",
    use_case: "Accurate hole depth considering drill point angle",
    machine_type: "any",
    controller: "any",
    variables: [
      { name: "DIA", purpose: "Drill diameter", unit: "in" },
      { name: "POINT_ANGLE", purpose: "Drill point angle", unit: "deg" },
    ],
    template: `(=== DRILL POINT DEPTH ===)
(Formula: Point_Depth = DIA / 2 / TAN(POINT_ANGLE/2))

(For 118° point: Point_Depth ≈ DIA × 0.3)
(For 135° point: Point_Depth ≈ DIA × 0.207)
(For 90° point:  Point_Depth = DIA × 0.5)

V130 = V25 / [2 * TAN[V29 / 2]]   (DRILL 1 POINT DEPTH)
V131 = V32 / [2 * TAN[V156 / 2]]  (DRILL 2 POINT DEPTH)

(Full depth = Hole_Depth + Point_Depth)
V135 = [V5 - V100] + V130         (TOTAL DRILL DEPTH)`,
    part_types: ["any"],
    material_groups: ["P", "M", "K", "N", "S", "H"],
  },

  // ============================================================================
  // Safety Patterns
  // ============================================================================
  {
    id: "PAT-011",
    name: "Safe Start Block",
    category: "safety",
    description: "Standard program start with safe modal states",
    use_case: "Every program should start with safe defaults",
    machine_type: "any",
    controller: "okuma_osp",
    template: `(=== SAFE START ===)
G10             (DATA SETTING CANCEL)
G40             (CUTTER COMP CANCEL)
G80             (CANNED CYCLE CANCEL)
G97 S0          (SPINDLE STOP)
G99             (FEED PER REV)
M09             (COOLANT OFF)
M05             (SPINDLE STOP)
G28 U0 W0       (MACHINE HOME)`,
    part_types: ["any"],
    material_groups: ["P", "M", "K", "N", "S", "H"],
    safety_notes: [
      "Always include at program start",
      "Cancel all modal states before new operations",
    ],
  },

  {
    id: "PAT-012",
    name: "Tool Change Safety Block",
    category: "safety",
    description: "Safe tool change sequence with position verification",
    use_case: "Every tool change",
    machine_type: "lathe",
    controller: "okuma_osp",
    template: `(=== SAFE TOOL CHANGE ===)
G0 X[SAFE_X] Z[SAFE_Z]  (CLEAR WORKPIECE)
M05                      (SPINDLE STOP)
G28 U0 W0               (MACHINE HOME)
T[TOOL_NO]              (INDEX TURRET)
M01                     (OPTIONAL STOP)`,
    part_types: ["any"],
    material_groups: ["P", "M", "K", "N", "S", "H"],
    safety_notes: [
      "Always retract before tool change",
      "Verify tool indexed before cutting",
    ],
  },

  // ============================================================================
  // Optimization Patterns
  // ============================================================================
  {
    id: "PAT-013",
    name: "Constant Surface Speed Limiting",
    category: "optimization",
    description: "CSS with max RPM limit to prevent overspeeding at small diameters",
    use_case: "Any G96 turning operation",
    machine_type: "lathe",
    controller: "any",
    template: `(=== CSS WITH LIMIT ===)
G50 S[MAX_RPM]     (SET RPM LIMIT FIRST!)
G96 S[SFM]         (THEN ENABLE CSS)

(Common limits by operation)
(OD Rough:  2000-2500 RPM)
(OD Finish: 2500-3000 RPM)
(ID Ops:    1500-2000 RPM - lower due to tool rigidity)
(Cutoff:    1500-2000 RPM)`,
    part_types: ["any"],
    material_groups: ["P", "M", "K", "N", "S", "H"],
    safety_notes: [
      "G50 MUST come BEFORE G96",
      "Higher limits for finishing (light cuts)",
      "Lower limits for ID operations (tool rigidity)",
    ],
  },

  {
    id: "PAT-014",
    name: "Chip Breaking Peck Cycle",
    category: "optimization",
    description: "Optimized peck depth and retract for chip management",
    use_case: "Deep hole drilling in chip-prone materials",
    machine_type: "any",
    controller: "any",
    variables: [
      { name: "Q", purpose: "Peck depth", unit: "in" },
      { name: "R", purpose: "Retract plane", unit: "in" },
    ],
    template: `(=== PECK DRILLING GUIDELINES ===)
(Peck depth by material)
(Steel P-group:     Q = 0.5 × DIA)
(Stainless M-group: Q = 0.3 × DIA)
(Cast iron K-group: Q = 1.0 × DIA)
(Aluminum N-group:  Q = 1.0-2.0 × DIA)
(Titanium S-group:  Q = 0.2-0.3 × DIA)

G83 Z-[DEPTH] Q[PECK] R[CLEARANCE] F[FEED]

(For stringy chips: use high-pressure coolant through spindle)
(For long chips: reduce Q, increase dwell)`,
    part_types: ["any"],
    material_groups: ["P", "M", "K", "N", "S", "H"],
    safety_notes: [
      "Smaller pecks in titanium/stainless to manage heat",
      "Check chip evacuation regularly",
    ],
  },
];

/**
 * Get all patterns.
 */
export function getMarksMultusPatterns(): LathePattern[] {
  return MARKS_MULTUS_PATTERNS;
}

/**
 * Find pattern by ID.
 */
export function findPatternById(id: string): LathePattern | undefined {
  return MARKS_MULTUS_PATTERNS.find(p => p.id === id);
}

/**
 * Get patterns by category.
 */
export function getPatternsByCategory(category: LathePattern["category"]): LathePattern[] {
  return MARKS_MULTUS_PATTERNS.filter(p => p.category === category);
}

/**
 * Search patterns by keyword.
 */
export function searchPatterns(keyword: string): LathePattern[] {
  const kw = keyword.toLowerCase();
  return MARKS_MULTUS_PATTERNS.filter(p =>
    p.name.toLowerCase().includes(kw) ||
    p.description.toLowerCase().includes(kw) ||
    p.use_case.toLowerCase().includes(kw)
  );
}

/**
 * Get patterns for specific part type.
 */
export function getPatternsForPartType(partType: string): LathePattern[] {
  return MARKS_MULTUS_PATTERNS.filter(p =>
    p.part_types.includes(partType) || p.part_types.includes("any")
  );
}

/**
 * Get patterns for specific material group.
 */
export function getPatternsForMaterial(isoGroup: "P" | "M" | "K" | "N" | "S" | "H"): LathePattern[] {
  return MARKS_MULTUS_PATTERNS.filter(p => p.material_groups.includes(isoGroup));
}

/**
 * Get pattern statistics.
 */
export function getPatternStats(): {
  total: number;
  by_category: Record<string, number>;
  by_machine_type: Record<string, number>;
  by_controller: Record<string, number>;
} {
  const byCategory: Record<string, number> = {};
  const byMachineType: Record<string, number> = {};
  const byController: Record<string, number> = {};

  for (const p of MARKS_MULTUS_PATTERNS) {
    byCategory[p.category] = (byCategory[p.category] || 0) + 1;
    byMachineType[p.machine_type] = (byMachineType[p.machine_type] || 0) + 1;
    byController[p.controller] = (byController[p.controller] || 0) + 1;
  }

  return {
    total: MARKS_MULTUS_PATTERNS.length,
    by_category: byCategory,
    by_machine_type: byMachineType,
    by_controller: byController,
  };
}
