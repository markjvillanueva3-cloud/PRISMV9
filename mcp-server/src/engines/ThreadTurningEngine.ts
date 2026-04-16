/**
 * ThreadTurningEngine — Single-Point Thread Turning Calculations
 *
 * Calculates parameters for thread turning on a lathe:
 * - Infeed method (radial, flank, modified flank, alternating)
 * - Number of passes and depth-of-cut schedule
 * - Cutting speed adjusted for thread pitch
 * - Thread profile geometry (60° metric, 55° BSP/UN)
 * - Spring passes for finish
 *
 * Key physics: Thread turning uses progressively decreasing
 * depth of cut per pass (constant area method) to maintain
 * consistent chip load and avoid insert overload.
 *
 * Reference: Sandvik threading guide (C-2920:52),
 *            ISO 261 (metric threads),
 *            Machinery's Handbook Ch.20 "Threading"
 *
 * Actions: thread_turn_calc, thread_infeed, thread_profile
 */

import { machiningPlaybookEngine } from "./MachiningPlaybookEngine.js";

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export type InfeedMethod =
  | "radial" | "flank" | "modified_flank" | "alternating";

export type ThreadForm =
  | "metric_60" | "un_60" | "bsp_55" | "acme_29" | "trapezoidal_30";

export interface ThreadTurnInput {
  pitch_mm: number;
  major_diameter_mm: number;
  thread_form?: ThreadForm;
  is_external?: boolean;
  infeed_method?: InfeedMethod;
  material_iso_group?: "P" | "M" | "K" | "N" | "S" | "H";
  insert_nose_radius_mm?: number;
  num_spring_passes?: number;
}

export interface ThreadTurnResult {
  thread_depth: AtomicValue;
  number_of_passes: AtomicValue;
  pass_schedule: Array<{
    pass: number;
    depth_mm: number;
    cumulative_mm: number;
  }>;
  cutting_speed: AtomicValue;
  spindle_rpm: AtomicValue;
  infeed_method: InfeedMethod;
  infeed_angle: AtomicValue;
  spring_passes: AtomicValue;
  thread_height: AtomicValue;
  minor_diameter: AtomicValue;
  warnings: string[];
}

// ── Reference Data ────────────────────────────────────────────────

/** Thread profile: [included_angle_deg, height_factor (H/P)] */
const THREAD_PROFILES: Record<ThreadForm, [number, number]> = {
  metric_60: [60, 0.6134],
  un_60: [60, 0.6134],
  bsp_55: [55, 0.6403],
  acme_29: [29, 0.5000],
  trapezoidal_30: [30, 0.5000],
};

/** Infeed angle by method (degrees) */
const INFEED_ANGLES: Record<InfeedMethod, number> = {
  radial: 0,
  flank: 30,           // along thread flank
  modified_flank: 29.5, // slight offset for chip control
  alternating: 0,       // alternates left-right
};

/** Threading speed (m/min) by ISO group */
const THREAD_SPEEDS: Record<string, number> = {
  P: 120, M: 80, K: 150, N: 250, S: 40, H: 50,
};

// ── Engine ─────────────────────────────────────────────────────────

export class ThreadTurningEngine {
  /**
   * Calculate thread turning parameters and pass schedule.
   */
  calculate(input: ThreadTurnInput): ThreadTurnResult {
    const warnings: string[] = [];
    const iso = input.material_iso_group ?? "P";
    const pitch = input.pitch_mm;
    const majorDia = input.major_diameter_mm;
    const form = input.thread_form ?? "metric_60";
    const isExternal = input.is_external ?? true;
    const noseR = input.insert_nose_radius_mm ?? 0.3;
    const springPasses = input.num_spring_passes ?? 2;

    const [includedAngle, hFactor] = THREAD_PROFILES[form];

    // Thread height (depth)
    const threadHeight = pitch * hFactor;
    // Actual cutting depth (5/8 of height for 60° external)
    const threadDepth = form === "acme_29" ||
      form === "trapezoidal_30"
      ? threadHeight
      : threadHeight * (5 / 8) * 2; // total depth both sides

    // Minor diameter
    const minorDia = isExternal
      ? majorDia - 2 * threadHeight * 0.625
      : majorDia + 2 * threadHeight * 0.625;

    // Infeed method
    const infeed = input.infeed_method ?? (
      pitch > 3 ? "modified_flank"
        : pitch > 1.5 ? "flank"
          : "radial"
    );
    const infeedAngle = INFEED_ANGLES[infeed];

    // Pass schedule (constant area method)
    // Total area ∝ depth². For n passes with constant area:
    // d_i = total_depth × sqrt(i/n) - sqrt((i-1)/n)
    const totalDepth = threadHeight * 0.625;
    const numPasses = calculatePasses(totalDepth, pitch);
    const schedule: Array<{
      pass: number;
      depth_mm: number;
      cumulative_mm: number;
    }> = [];

    let cumulative = 0;
    for (let i = 1; i <= numPasses; i++) {
      const targetCum = totalDepth * Math.sqrt(i / numPasses);
      const passDepth = targetCum - cumulative;
      cumulative = targetCum;
      schedule.push({
        pass: i,
        depth_mm: r3(passDepth),
        cumulative_mm: r3(cumulative),
      });
    }

    // Cutting speed (reduce for coarse pitch)
    const baseVc = THREAD_SPEEDS[iso] ?? 120;
    const pitchFactor = pitch > 3 ? 0.7
      : pitch > 2 ? 0.8
        : pitch > 1.5 ? 0.9
          : 1.0;
    const vc = baseVc * pitchFactor;
    const rpm = (vc * 1000) / (Math.PI * majorDia);

    // Warnings
    if (pitch > 6) {
      warnings.push(
        "Very coarse pitch — consider modified flank infeed"
      );
    }
    if (noseR > pitch * 0.3) {
      warnings.push(
        "Insert nose radius > 30% of pitch — " +
        "may interfere with thread form"
      );
    }
    if (majorDia < 6 && pitch > 1) {
      warnings.push(
        "Small diameter with coarse pitch — " +
        "high relative thread depth"
      );
    }
    if (infeed === "radial" && pitch > 2) {
      warnings.push(
        "Radial infeed not recommended for pitch > 2mm — " +
        "use flank or modified flank"
      );
    }

    const pbResult = machiningPlaybookEngine.advise({
      categories: ["threading", "turning"],
      operation_type: "turning",
      material_iso: iso,
    });
    for (const rule of pbResult.rules) {
      if (rule.severity === "critical" || rule.severity === "important") {
        warnings.push(`[Playbook ${rule.id}] ${rule.title}`);
      }
    }

    return {
      thread_depth: av(r3(totalDepth), "mm", 0.05,
        `P × ${hFactor} × 0.625`),
      number_of_passes: av(numPasses, "passes", 0,
        "Constant area method"),
      pass_schedule: schedule,
      cutting_speed: av(r1(vc), "m/min", 0.1,
        "Base Vc × pitch factor"),
      spindle_rpm: av(Math.round(rpm), "rev/min", 0.05,
        "Vc × 1000 / (π × D_major)"),
      infeed_method: infeed,
      infeed_angle: av(infeedAngle, "deg", 0,
        `${infeed} method`),
      spring_passes: av(springPasses, "passes", 0,
        "Zero-depth finish passes"),
      thread_height: av(r3(threadHeight), "mm", 0.02,
        `P × ${hFactor} (${form})`),
      minor_diameter: av(r2(minorDia), "mm", 0.05,
        isExternal
          ? "D_major - 2 × 0.625H"
          : "D_major + 2 × 0.625H"),
      warnings,
    };
  }
}

// ── Helpers ───────────────────────────────────────────────────────

/**
 * Calculate number of threading passes based on depth and pitch.
 * Rougher threads need more passes.
 */
function calculatePasses(
  totalDepth: number, pitch: number
): number {
  // Approximate: sqrt(total_area) drives pass count
  // First pass ≈ 0.15mm, decreasing
  if (totalDepth < 0.3) return 3;
  if (totalDepth < 0.5) return 4;
  if (totalDepth < 0.8) return 6;
  if (totalDepth < 1.2) return 8;
  if (totalDepth < 2.0) return 10;
  return Math.ceil(totalDepth * 6);
}

function av(
  value: number, unit: string,
  uncertainty: number, source: string
): AtomicValue {
  return { value, unit, uncertainty, source };
}

// ── G76 Threading Cycle Dialect Knowledge Base ─────────────────────
// Source: PDF-LEARN from "G76 Threading Cycle for CNC Lathes (Fanuc)"

export type G76Dialect = "fanuc_double" | "fanuc_single" | "haas" | "linuxcnc" | "mach3" | "okuma" | "mazak";

export interface G76Parameter {
  letter: string;
  name: string;
  description: string;
  required: boolean;
}

export interface G76DialectSyntax {
  dialect: G76Dialect;
  controller_names: string[];
  syntax: string;
  parameters: G76Parameter[];
  notes: string[];
  spring_pass_method: string;
}

/**
 * G76 Threading Cycle Syntax per Controller Dialect
 * Extracted from CNCCookbook G76 Threading Guide
 */
export const G76_DIALECTS: G76DialectSyntax[] = [
  {
    dialect: "fanuc_double",
    controller_names: ["Fanuc 0i-TF", "Fanuc 16/18/21", "Fanuc 30i/31i/32i"],
    syntax: "G76 P(m)(r)(a) Q(dmin) R(d)\nG76 X(U) Z(W) R(i) P(k) Q(d) F(L)",
    parameters: [
      { letter: "P", name: "Combined word (line 1)", description: "6 digits: mm=spring passes (01-99), rr=chamfer amount (01-99), aa=tool nose angle (80,60,55,30,29,0)", required: true },
      { letter: "Q", name: "Min cutting depth (line 1)", description: "Minimum depth per pass — clamped if pass depth falls below", required: true },
      { letter: "R", name: "Finish allowance (line 1)", description: "Material left for finish pass", required: true },
      { letter: "X/U", name: "End X position (line 2)", description: "Thread end X (absolute or incremental)", required: true },
      { letter: "Z/W", name: "End Z position (line 2)", description: "Thread end Z (absolute or incremental)", required: true },
      { letter: "R", name: "Taper amount (line 2)", description: "Taper for pipe threads (radius value)", required: false },
      { letter: "P", name: "Thread height (line 2)", description: "Thread depth as radius value", required: true },
      { letter: "Q", name: "First cut depth (line 2)", description: "Depth of first threading pass", required: true },
      { letter: "F", name: "Lead/Pitch", description: "Thread lead (feedrate = pitch)", required: true },
    ],
    notes: [
      "P-word first line: 6 digits as 3 two-digit clusters (mm,rr,aa)",
      "Example P-word: P021029 = 2 spring passes, 10 chamfer units, 29° tool angle",
      "A58 for 60° thread = 29° infeed; A60 = 30° infeed",
      "Min cutting depth > finish allowance may truncate finish pass",
    ],
    spring_pass_method: "Built-in via P-word digits 1-2 (01-99 spring passes)",
  },
  {
    dialect: "fanuc_single",
    controller_names: ["Fanuc (older)", "Some Fanuc-compatible"],
    syntax: "G76 X.. Z.. I.. K.. D.. F.. A.. P..",
    parameters: [
      { letter: "X", name: "End X diameter", description: "Diameter of last threading pass", required: true },
      { letter: "Z", name: "End Z position", description: "Thread end position", required: true },
      { letter: "I", name: "Taper", description: "Taper over total length", required: false },
      { letter: "K", name: "Thread depth", description: "Single depth of thread (positive)", required: true },
      { letter: "D", name: "First pass depth", description: "Depth of first threading pass (positive)", required: true },
      { letter: "A", name: "Tool angle", description: "Included angle of insert (positive)", required: false },
      { letter: "P", name: "Infeed method", description: "1-4: infeed strategy selection", required: false },
      { letter: "F", name: "Pitch", description: "Thread pitch/lead", required: true },
    ],
    notes: [
      "Simpler single-line format for older controls",
      "P infeed methods: 1=radial, 2=flank, 3=alternating, 4=modified flank",
    ],
    spring_pass_method: "Use G92 threading cycle after G76 for spring passes",
  },
  {
    dialect: "haas",
    controller_names: ["Haas ST-10/15/20/25/30", "Haas TL-1/2", "Haas NGC"],
    syntax: "G76 D.. K.. X.. Z.. U.. W.. I.. P.. F.. A..",
    parameters: [
      { letter: "D", name: "Initial cut depth", description: "Depth of first pass", required: true },
      { letter: "K", name: "Thread height", description: "Total thread depth", required: true },
      { letter: "X", name: "End X absolute", description: "X-axis absolute ending location", required: true },
      { letter: "Z", name: "End Z absolute", description: "Z-axis absolute ending (thread length)", required: true },
      { letter: "U", name: "End X incremental", description: "X-axis incremental (alternative to X)", required: false },
      { letter: "W", name: "End Z incremental", description: "Z-axis incremental (alternative to Z)", required: false },
      { letter: "I", name: "Thread taper", description: "Taper amount (radius measure)", required: false },
      { letter: "P", name: "Infeed method", description: "1-4: positioning method selection", required: false },
      { letter: "Q", name: "Start angle", description: "Thread start angle (no decimal point)", required: false },
      { letter: "F", name: "Feedrate", description: "Thread pitch as feedrate", required: true },
      { letter: "A", name: "Tool nose angle", description: "0-120 degrees (0 if not specified)", required: false },
    ],
    notes: [
      "Haas uses D for first cut depth (not Q like Fanuc)",
      "Q is thread start angle on Haas, not depth",
      "Tool nose angle defaults to 0° (radial) if not specified",
    ],
    spring_pass_method: "Use G92 threading cycle after G76 for spring passes",
  },
  {
    dialect: "linuxcnc",
    controller_names: ["LinuxCNC", "PathPilot", "Tormach"],
    syntax: "G76 P.. Z.. I.. J.. R.. K.. Q.. H.. E.. L..",
    parameters: [
      { letter: "P", name: "Pitch", description: "Thread pitch in distance per revolution", required: true },
      { letter: "Z", name: "End Z", description: "Final position of threads", required: true },
      { letter: "I", name: "Peak offset", description: "Negative=external, Positive=internal", required: true },
      { letter: "J", name: "Initial cut depth", description: "Depth of first cut", required: true },
      { letter: "K", name: "Full thread depth", description: "Total thread depth", required: true },
      { letter: "R", name: "Depth regression", description: "R=1 constant depth, R=2 constant area (default)", required: false },
      { letter: "Q", name: "Compound angle", description: "Compound slide angle (optional)", required: false },
      { letter: "H", name: "Spring passes", description: "Number of spring passes", required: false },
      { letter: "E", name: "Taper distance", description: "Distance along drive line for taper", required: false },
      { letter: "L", name: "Taper end", description: "L0=none, L1=entry, L2=exit, L3=both", required: false },
    ],
    notes: [
      "R parameter controls depth regression: R=1 constant depth per pass, R=2 constant area (chip load)",
      "H parameter provides native spring pass support",
      "I sign determines internal vs external thread",
      "L parameter provides sophisticated taper control",
    ],
    spring_pass_method: "Built-in via H parameter (number of spring passes)",
  },
  {
    dialect: "mach3",
    controller_names: ["Mach3", "Mach4"],
    syntax: "G76 X.. Z.. Q.. P.. H.. I.. R.. K.. L.. C.. B.. T.. J..",
    parameters: [
      { letter: "X", name: "End X", description: "X end position", required: true },
      { letter: "Z", name: "End Z", description: "Z end position", required: true },
      { letter: "Q", name: "Spring passes", description: "Number of spring passes", required: false },
      { letter: "P", name: "Pitch", description: "Thread pitch", required: true },
      { letter: "H", name: "First pass depth", description: "Depth of first pass", required: true },
      { letter: "I", name: "Infeed angle", description: "Compound slide infeed angle", required: false },
      { letter: "R", name: "X Start", description: "Starting X position (optional)", required: false },
      { letter: "K", name: "Z Start", description: "Starting Z position (optional)", required: false },
      { letter: "L", name: "Chamfer", description: "Chamfer amount at thread end", required: false },
      { letter: "C", name: "X Clearance", description: "X clearance for retract", required: true },
      { letter: "B", name: "Last pass depth", description: "Depth of finish pass", required: false },
      { letter: "T", name: "Taper", description: "Taper amount", required: false },
      { letter: "J", name: "Min depth per pass", description: "Minimum depth per pass", required: false },
    ],
    notes: [
      "Mach3 has the most parameters of any G76 dialect",
      "Q provides native spring pass support",
      "L provides chamfer at thread shoulder",
      "J clamps minimum pass depth (like Fanuc Q on line 1)",
    ],
    spring_pass_method: "Built-in via Q parameter (number of spring passes)",
  },
  {
    dialect: "okuma",
    controller_names: ["Okuma OSP-P200L", "Okuma OSP-P300", "Okuma OSP-U100L", "Okuma MULTUS"],
    syntax: "G71 X.. Z.. {I.. | A..} B.. D.. U.. H.. L.. E.. F.. J.. M.. Q..",
    parameters: [
      { letter: "X", name: "Final thread diameter", description: "Diameter of finished thread", required: true },
      { letter: "Z", name: "Thread end Z", description: "Z coordinate of thread end point", required: true },
      { letter: "I", name: "Taper radius", description: "Difference in radius for taper (OR use A for angle)", required: false },
      { letter: "A", name: "Taper angle", description: "Taper angle in degrees (alternative to I)", required: false },
      { letter: "B", name: "Infeed angle", description: "Infeed angle (0-180°, typically equals cutter tip angle)", required: false },
      { letter: "D", name: "First cut depth", description: "Depth of cut in first pass (diameter value)", required: true },
      { letter: "U", name: "Finish allowance", description: "Finishing allowance (diameter value)", required: false },
      { letter: "H", name: "Thread height", description: "Total thread height (diameter value)", required: true },
      { letter: "L", name: "Chamfer distance", description: "Chamfering distance (effective with M23)", required: false },
      { letter: "F", name: "Thread lead", description: "Thread lead/pitch", required: true },
      { letter: "J", name: "Threads per lead", description: "Number of threads per F distance (multi-start)", required: false },
      { letter: "E", name: "Start shift", description: "Z-axis shift of thread start point", required: false },
      { letter: "Q", name: "Cutting passes", description: "Number of cutting passes", required: false },
    ],
    notes: [
      "CRITICAL: Okuma G71 is THREADING — NOT roughing like Fanuc G71",
      "Okuma G72 is face/transverse threading — NOT facing like Fanuc G72",
      "Use M22/M23 for chamfering OFF/ON, M26/M27 for lead direction Z/X",
      "Infeed patterns: M32 (straight), M33 (zigzag), M34 (straight reversed)",
      "Thread cutting patterns: M73/M74/M75",
      "Cannot execute in G96 (CSS) mode — use G97 with explicit RPM",
    ],
    spring_pass_method: "Use G31/G33 fixed cycles after G71 for spring passes, or set Q with extra passes",
  },
  {
    dialect: "mazak",
    controller_names: ["Mazak Mazatrol", "Mazak Matrix", "Mazak INTEGREX", "Mazak QT", "Mazak QUICK TURN"],
    syntax: "MAZATROL: THREAD unit with PAT/PITCH/No./WIDTH or G324 Three-Digit",
    parameters: [
      { letter: "UNo", name: "Unit number", description: "THREAD unit sequence number", required: true },
      { letter: "PART", name: "Part location", description: "OUT (external) or IN (internal)", required: true },
      { letter: "PAT", name: "Pattern", description: "Thread pattern selection", required: false },
      { letter: "No.", name: "Thread count", description: "Number of thread starts", required: false },
      { letter: "PITCH", name: "Thread pitch", description: "Thread pitch/lead", required: true },
      { letter: "WIDTH", name: "Thread width", description: "Width of thread feature", required: false },
      { letter: "SNo", name: "Sequence number", description: "Tool sequence within unit", required: true },
      { letter: "C-SP", name: "Cutting speed", description: "Surface speed (auto-calculated from material)", required: false },
      { letter: "FR", name: "Feed rate", description: "Feed per revolution", required: false },
    ],
    notes: [
      "Mazatrol uses conversational THREAD units, not G-code cycles",
      "G324 Three-Digit format for CAM post-processor output",
      "Auto-develops tool sequences from unit data (threading insert + chamfer)",
      "Cutting conditions auto-calculated from material + tool library",
      "Program header must include (MG3-251:ProgramName) identifier for Matrix",
      "Use G420-G425 markers for shape/tool sequence data in Three-Digit format",
    ],
    spring_pass_method: "MAZATROL auto-calculates based on thread parameters and material",
  },
];

/**
 * Get G76 dialect syntax for a specific controller
 */
export function getG76Dialect(controllerName: string): G76DialectSyntax | undefined {
  const lowerName = controllerName.toLowerCase();

  // Direct dialect name match
  const directMatch = G76_DIALECTS.find(d => d.dialect === lowerName);
  if (directMatch) return directMatch;

  // Brand-based matching (check if brand name appears in user input)
  const brandPatterns: Record<G76Dialect, string[]> = {
    fanuc_double: ["fanuc", "fanuc 0i", "fanuc 30i", "fanuc 31i", "fanuc 32i", "fanuc 16", "fanuc 18", "fanuc 21"],
    fanuc_single: ["fanuc single", "fanuc old"],
    haas: ["haas", "haas st", "haas tl", "haas ngc"],
    linuxcnc: ["linuxcnc", "linux cnc", "pathpilot", "tormach"],
    mach3: ["mach3", "mach4", "mach 3", "mach 4"],
    okuma: ["okuma", "osp-p", "osp-u", "multus"],
    mazak: ["mazak", "mazatrol", "integrex", "quick turn", "qt"],
  };

  for (const [dialect, patterns] of Object.entries(brandPatterns)) {
    if (patterns.some(p => lowerName.includes(p))) {
      return G76_DIALECTS.find(d => d.dialect === dialect);
    }
  }

  // Fallback: check if any controller_name partially matches
  return G76_DIALECTS.find(d =>
    d.controller_names.some(n => {
      const lowerN = n.toLowerCase();
      return lowerName.includes(lowerN) || lowerN.includes(lowerName);
    })
  );
}

/**
 * Generate G76 code for a given dialect and parameters
 */
export function generateG76Code(
  dialect: G76Dialect,
  params: {
    end_x_mm: number;
    end_z_mm: number;
    thread_depth_mm: number;
    first_cut_mm: number;
    pitch_mm: number;
    spring_passes?: number;
    infeed_angle?: number;
    taper_mm?: number;
  }
): string {
  const {
    end_x_mm, end_z_mm, thread_depth_mm, first_cut_mm,
    pitch_mm, spring_passes = 2, infeed_angle = 29, taper_mm = 0
  } = params;

  switch (dialect) {
    case "fanuc_double": {
      // P-word: 2 digits spring passes, 2 digits chamfer (10), 2 digits angle
      const pWord = `P${String(spring_passes).padStart(2, "0")}10${String(infeed_angle).padStart(2, "0")}`;
      const qMin = (first_cut_mm * 0.1).toFixed(3);  // Min cut 10% of first
      const rFinish = (thread_depth_mm * 0.05).toFixed(3);  // 5% finish allowance
      const line1 = `G76 ${pWord} Q${qMin} R${rFinish}`;
      const line2 = `G76 X${end_x_mm.toFixed(3)} Z${end_z_mm.toFixed(3)} ${taper_mm ? `R${taper_mm.toFixed(3)} ` : ""}P${(thread_depth_mm * 1000).toFixed(0)} Q${(first_cut_mm * 1000).toFixed(0)} F${pitch_mm.toFixed(3)}`;
      return `${line1}\n${line2}`;
    }
    case "haas":
      return `G76 D${first_cut_mm.toFixed(4)} K${thread_depth_mm.toFixed(4)} X${end_x_mm.toFixed(4)} Z${end_z_mm.toFixed(4)} ${taper_mm ? `I${taper_mm.toFixed(4)} ` : ""}A${infeed_angle} F${pitch_mm.toFixed(4)}`;
    case "linuxcnc":
      return `G76 P${pitch_mm.toFixed(4)} Z${end_z_mm.toFixed(4)} I${(-thread_depth_mm).toFixed(4)} J${first_cut_mm.toFixed(4)} K${thread_depth_mm.toFixed(4)} R2 H${spring_passes}`;
    case "mach3":
      return `G76 X${end_x_mm.toFixed(4)} Z${end_z_mm.toFixed(4)} P${pitch_mm.toFixed(4)} H${first_cut_mm.toFixed(4)} I${infeed_angle} Q${spring_passes} C${(end_x_mm + 2).toFixed(4)}`;
    case "okuma": {
      // Okuma G71 threading cycle (NOT roughing like Fanuc!)
      // M23 chamfering ON, M26 Z-axis lead, M32 straight infeed
      const chamferDist = (pitch_mm * 1.5).toFixed(3);  // 1.5× pitch chamfer
      return `M23 M26 M32 (Threading setup: chamfer ON, Z-lead, straight infeed)\n` +
        `G71 X${end_x_mm.toFixed(3)} Z${end_z_mm.toFixed(3)} B${infeed_angle} ` +
        `D${first_cut_mm.toFixed(3)} H${thread_depth_mm.toFixed(3)} ` +
        `L${chamferDist} F${pitch_mm.toFixed(3)}`;
    }
    case "mazak":
      // Mazatrol Three-Digit G324 format for threading
      return `(MAZATROL THREAD Unit - Three-Digit Format)\n` +
        `G324 P1 Q${end_x_mm > 0 ? 65 : 66} (THREAD unit, OUT/IN)\n` +
        `G424 T1 D${thread_depth_mm.toFixed(3)} F${pitch_mm.toFixed(3)} (Tool sequence)\n` +
        `G425\n` +
        `G420 X${end_x_mm.toFixed(3)} Z${end_z_mm.toFixed(3)} (Shape data)\n` +
        `G421`;
    default:
      return `; G76 dialect "${dialect}" not implemented`;
  }
}

function r1(n: number): number { return Math.round(n * 10) / 10; }
function r2(n: number): number { return Math.round(n * 100) / 100; }
function r3(n: number): number { return Math.round(n * 1000) / 1000; }

export const threadTurningEngine = new ThreadTurningEngine();
