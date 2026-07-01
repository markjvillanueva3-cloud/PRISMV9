/**
 * CrossCAMPostEngine — POST-ULT-MS14 Cross-CAM Unification + Multi-Channel
 *
 * Consolidates MS14 U01-U06:
 *   U01 — CamNeutralInterface: normalize any CAM format to a common toolpath
 *   U02 — CamSpecificEnhancer: inject CAM-specific metadata/insights
 *   U03 — SubprogramOptimizer: detect repeated patterns → M98/CALL/L subprograms
 *   U04 — MultiChannelPostGenerator: mill-turn sync codes (Mazak/Siemens/Fanuc/Okuma)
 *   U05 — MillTurnPhysicsIntegration: CSS, part deflection, bar-whip critical speed
 *   U06 — ProductionAutomationIntegration: bar feeder, pallet changer, part counter
 *
 * Actions: normalize_input, enhance_cam_specific, detect_subprograms,
 *          generate_multichannel, integrate_mill_turn, integrate_automation
 */

// ============================================================================
// TYPES — U01 CamNeutralInterface
// ============================================================================

export interface CamNeutralInput {
  source_cam?: "fusion360" | "hypermill" | "mastercam" | "solidcam" | "nx" | "catia" | "esprit" | "gibbscam" | "generic";
  format: "gcode" | "cl_data" | "apt" | "json" | "csv";
  data: string;
  cam_metadata?: Record<string, any>;
}

export interface NormalizedToolpath {
  source_cam: string;
  source_format: string;
  moves: ToolpathMove[];
  tool_changes: ToolChange[];
  total_move_count: number;
  bounding_box: BoundingBox;
  warnings: string[];
  cam_metadata: Record<string, any>;
}

export interface ToolpathMove {
  seq: number;
  type: "rapid" | "feed" | "arc_cw" | "arc_ccw" | "dwell" | "probe";
  x?: number;
  y?: number;
  z?: number;
  a?: number;
  b?: number;
  c?: number;
  i?: number;
  j?: number;
  k?: number;
  feed_rate?: number;
  spindle?: number;
  raw_line: string;
}

export interface ToolChange {
  seq: number;
  tool_number: number;
  tool_offset?: number;
  description?: string;
}

export interface BoundingBox {
  x_min: number; x_max: number;
  y_min: number; y_max: number;
  z_min: number; z_max: number;
}

// ============================================================================
// TYPES — U02 CamSpecificEnhancer
// ============================================================================

export interface CamSpecificEnhancement {
  source_cam: string;
  insights: CamInsight[];
  metadata_injected: Record<string, any>;
}

export interface CamInsight {
  category: string;
  key: string;
  value: number | string | boolean;
  unit?: string;
  description: string;
}

// ============================================================================
// TYPES — U03 SubprogramOptimizer
// ============================================================================

export interface SubprogramAnalysis {
  patterns_found: number;
  patterns: Array<{
    pattern_lines: string[];
    occurrences: number;
    line_count: number;
    savings_lines: number;
    subprogram_call: string; // e.g. "M98 P1001"
  }>;
  total_savings_lines: number;
  total_savings_percent: number;
}

export interface SubprogramResult {
  analysis: SubprogramAnalysis;
  optimized_main: string;
  subprograms: Array<{ id: number; label: string; body: string }>;
  original_line_count: number;
  final_line_count: number;
}

// ============================================================================
// TYPES — U04 MultiChannelPostGenerator
// ============================================================================

export interface MultiChannelInput {
  operations: ChannelOperation[];
  controller: "mazak" | "siemens" | "fanuc" | "okuma";
  sync_strategy: "sequential" | "parallel" | "overlap";
}

export interface ChannelOperation {
  channel: number;
  name: string;
  gcode_lines: string[];
  sync_after?: number; // sync point id to emit after this block
  waits_for?: number;  // sync point id to wait for before starting
}

export interface MultiChannelProgram {
  channels: Array<{
    channel_number: number;
    gcode: string;
    sync_points: Array<{ line: number; code: string; waits_for: number }>;
  }>;
  controller_format: string;
}

// ============================================================================
// TYPES — U05 MillTurnPhysicsIntegration
// ============================================================================

export interface MillTurnPhysicsInput {
  material_hardness_hrc?: number;
  material_tensile_mpa?: number;
  bar_diameter_mm: number;
  bar_length_mm: number;
  bar_material?: "steel" | "aluminum" | "stainless" | "titanium" | "brass";
  turning_doc_mm: number;   // depth of cut
  turning_woc_mm?: number;  // width of cut (for facing)
  target_surface_speed_mpm?: number;
  max_rpm: number;
  min_rpm?: number;
  chuck_grip_length_mm?: number;
}

export interface MillTurnPhysicsResult {
  css_block: string;         // G96/G97 G-code block
  critical_speed_rpm: number;
  safe_max_rpm: number;
  deflection_at_tip_mm: number;
  deflection_warning: boolean;
  turning_force_n: number;
  recommended_css_mpm: number;
  physics_notes: string[];
}

// ============================================================================
// TYPES — U06 ProductionAutomationIntegration
// ============================================================================

export interface AutomationConfig {
  bar_feeder?: {
    enabled: boolean;
    bar_length_mm: number;
    part_length_mm: number;
    remnant_min_mm: number;
    feed_code?: string; // default M105
    advance_code?: string; // default M106
  };
  pallet_changer?: {
    enabled: boolean;
    pallet_count: number;
    change_code?: string; // default M60
  };
  part_counter?: {
    enabled: boolean;
    target_quantity: number;
    counter_variable?: string; // e.g. "#500"
  };
  program_name?: string;
}

export interface AutomationResult {
  header: string;
  footer: string;
  bar_feed_calls: number;
  parts_per_bar: number;
  remnant_warning: boolean;
  automation_notes: string[];
}

// ============================================================================
// HELPERS
// ============================================================================

function parseCoord(line: string, axis: string): number | undefined {
  const m = line.match(new RegExp(`${axis}(-?[\\d.]+)`, "i"));
  return m ? parseFloat(m[1]) : undefined;
}

function parseFeed(line: string): number | undefined {
  const m = line.match(/F(-?[\d.]+)/i);
  return m ? parseFloat(m[1]) : undefined;
}

function parseSpindle(line: string): number | undefined {
  const m = line.match(/S(\d+)/i);
  return m ? parseInt(m[1]) : undefined;
}

function parseTool(line: string): number | undefined {
  const m = line.match(/T0*(\d+)/i);
  return m ? parseInt(m[1]) : undefined;
}

function lineType(raw: string): ToolpathMove["type"] {
  if (/G0?0[^-\d]|G00/.test(raw)) return "rapid";
  if (/G0?2[^-\d]|G02/.test(raw)) return "arc_cw";
  if (/G0?3[^-\d]|G03/.test(raw)) return "arc_ccw";
  if (/G0?4[^-\d]|G04/.test(raw)) return "dwell";
  if (/G0?38/.test(raw)) return "probe";
  return "feed";
}

function isComment(line: string): boolean {
  const t = line.trim();
  return t.startsWith("(") || t.startsWith(";") || t.startsWith("%") || t.startsWith("!");
}

function updateBB(bb: BoundingBox, x?: number, y?: number, z?: number): void {
  if (x !== undefined) { bb.x_min = Math.min(bb.x_min, x); bb.x_max = Math.max(bb.x_max, x); }
  if (y !== undefined) { bb.y_min = Math.min(bb.y_min, y); bb.y_max = Math.max(bb.y_max, y); }
  if (z !== undefined) { bb.z_min = Math.min(bb.z_min, z); bb.z_max = Math.max(bb.z_max, z); }
}

// ============================================================================
// U01 — CamNeutralInterface
// ============================================================================

/**
 * Parse G-code text into normalized toolpath moves.
 */
function parseGCode(data: string, warnings: string[]): { moves: ToolpathMove[]; toolChanges: ToolChange[] } {
  const moves: ToolpathMove[] = [];
  const toolChanges: ToolChange[] = [];
  let seq = 0;

  for (const rawLine of data.split("\n")) {
    const line = rawLine.trim();
    if (!line || isComment(line)) continue;
    seq++;

    const x = parseCoord(line, "X");
    const y = parseCoord(line, "Y");
    const z = parseCoord(line, "Z");
    const a = parseCoord(line, "A");
    const b = parseCoord(line, "B");
    const c = parseCoord(line, "C");
    const i = parseCoord(line, "I");
    const j = parseCoord(line, "J");
    const k = parseCoord(line, "K");
    const feed_rate = parseFeed(line);
    const spindle = parseSpindle(line);

    if (/M0?6/.test(line)) {
      const tn = parseTool(line) ?? 0;
      toolChanges.push({ seq, tool_number: tn });
    }

    if (x !== undefined || y !== undefined || z !== undefined ||
        a !== undefined || b !== undefined || c !== undefined) {
      moves.push({ seq, type: lineType(line), x, y, z, a, b, c, i, j, k, feed_rate, spindle, raw_line: rawLine });
    }
  }

  return { moves, toolChanges };
}

/**
 * Parse CL/APT data into moves. Supports GOTO, RAPID, FEDRAT, SPINDL, TOOLNO.
 */
function parseCLData(data: string, warnings: string[]): { moves: ToolpathMove[]; toolChanges: ToolChange[] } {
  const moves: ToolpathMove[] = [];
  const toolChanges: ToolChange[] = [];
  let seq = 0;
  let currentFeed: number | undefined;
  let currentSpindle: number | undefined;
  let isRapid = false;

  for (const rawLine of data.split("\n")) {
    const line = rawLine.trim().toUpperCase();
    if (!line || line.startsWith("$$")) continue;
    seq++;

    if (line.startsWith("RAPID")) { isRapid = true; continue; }
    if (line.startsWith("FEDRAT/")) {
      const m = line.match(/FEDRAT\/(-?[\d.]+)/);
      if (m) currentFeed = parseFloat(m[1]);
      isRapid = false;
      continue;
    }
    if (line.startsWith("SPINDL/")) {
      const m = line.match(/SPINDL\/(\d+)/);
      if (m) currentSpindle = parseInt(m[1]);
      continue;
    }
    if (line.startsWith("TOOLNO/")) {
      const m = line.match(/TOOLNO\/(\d+)/);
      if (m) toolChanges.push({ seq, tool_number: parseInt(m[1]) });
      continue;
    }
    if (line.startsWith("GOTO/")) {
      const coords = line.replace("GOTO/", "").split(",").map(s => parseFloat(s.trim()));
      const [x, y, z] = coords;
      moves.push({
        seq, type: isRapid ? "rapid" : "feed",
        x: isNaN(x) ? undefined : x,
        y: isNaN(y) ? undefined : y,
        z: isNaN(z) ? undefined : z,
        feed_rate: currentFeed, spindle: currentSpindle,
        raw_line: rawLine
      });
      isRapid = false;
    }
  }

  return { moves, toolChanges };
}

/**
 * Parse Fusion 360 toolpath JSON (simplified cloud NC JSON schema).
 * Expected: { operations: [{ name, moves: [{ type, x, y, z, feedrate }] }] }
 */
function parseJSON(data: string, warnings: string[]): { moves: ToolpathMove[]; toolChanges: ToolChange[] } {
  const moves: ToolpathMove[] = [];
  const toolChanges: ToolChange[] = [];
  let seq = 0;

  let parsed: any;
  try {
    parsed = JSON.parse(data);
  } catch {
    warnings.push("JSON parse failed — treating as raw G-code");
    return parseGCode(data, warnings);
  }

  const ops = Array.isArray(parsed) ? parsed : (parsed.operations ?? parsed.moves ?? [parsed]);

  for (const op of ops) {
    if (op.tool_number !== undefined) {
      toolChanges.push({ seq, tool_number: op.tool_number, description: op.name ?? "" });
    }
    const moveSrc = Array.isArray(op.moves) ? op.moves : Array.isArray(op) ? op : [];
    for (const m of moveSrc) {
      seq++;
      moves.push({
        seq,
        type: (m.type === "rapid" ? "rapid" : m.type === "arc_cw" ? "arc_cw" : m.type === "arc_ccw" ? "arc_ccw" : "feed"),
        x: m.x, y: m.y, z: m.z,
        a: m.a, b: m.b, c: m.c,
        i: m.i, j: m.j, k: m.k,
        feed_rate: m.feedrate ?? m.feed_rate,
        spindle: m.spindle,
        raw_line: JSON.stringify(m),
      });
    }
  }

  return { moves, toolChanges };
}

/**
 * Parse CSV toolpath: x,y,z[,a,b,c][,feed][,type]
 * Accepts header row; type field: rapid|feed|arc_cw|arc_ccw
 */
function parseCSV(data: string, warnings: string[]): { moves: ToolpathMove[]; toolChanges: ToolChange[] } {
  const moves: ToolpathMove[] = [];
  const toolChanges: ToolChange[] = [];
  const lines = data.split("\n").map(l => l.trim()).filter(Boolean);
  if (!lines.length) return { moves, toolChanges };

  // Detect header
  let start = 0;
  let headers: string[] = [];
  if (/[a-df-wyz]/i.test(lines[0])) {
    headers = lines[0].toLowerCase().split(",").map(h => h.trim());
    start = 1;
  } else {
    headers = ["x", "y", "z", "a", "b", "c", "feed", "type"];
  }

  const idx = (name: string) => headers.indexOf(name);

  for (let i = start; i < lines.length; i++) {
    const parts = lines[i].split(",").map(p => p.trim());
    const get = (name: string): number | undefined => {
      const col = idx(name);
      if (col < 0 || col >= parts.length) return undefined;
      const v = parseFloat(parts[col]);
      return isNaN(v) ? undefined : v;
    };
    const typeStr = idx("type") >= 0 ? parts[idx("type")]?.toLowerCase() : undefined;
    const moveType: ToolpathMove["type"] = typeStr === "rapid" ? "rapid" : typeStr === "arc_cw" ? "arc_cw" : typeStr === "arc_ccw" ? "arc_ccw" : "feed";

    moves.push({
      seq: i - start + 1,
      type: moveType,
      x: get("x"), y: get("y"), z: get("z"),
      a: get("a"), b: get("b"), c: get("c"),
      feed_rate: get("feed") ?? get("feedrate") ?? get("feed_rate"),
      raw_line: lines[i],
    });
  }

  return { moves, toolChanges };
}

function normalizeInput(input: CamNeutralInput): NormalizedToolpath {
  const warnings: string[] = [];
  const cam = input.source_cam ?? "generic";

  let parsed: { moves: ToolpathMove[]; toolChanges: ToolChange[] };

  switch (input.format) {
    case "gcode":
      parsed = parseGCode(input.data, warnings);
      break;
    case "cl_data":
    case "apt":
      parsed = parseCLData(input.data, warnings);
      break;
    case "json":
      parsed = parseJSON(input.data, warnings);
      break;
    case "csv":
      parsed = parseCSV(input.data, warnings);
      break;
    default:
      warnings.push(`Unknown format '${input.format}' — attempting G-code parse`);
      parsed = parseGCode(input.data, warnings);
  }

  const bb: BoundingBox = { x_min: Infinity, x_max: -Infinity, y_min: Infinity, y_max: -Infinity, z_min: Infinity, z_max: -Infinity };
  for (const m of parsed.moves) updateBB(bb, m.x, m.y, m.z);

  // Clamp infinities
  if (!isFinite(bb.x_min)) bb.x_min = bb.x_max = 0;
  if (!isFinite(bb.y_min)) bb.y_min = bb.y_max = 0;
  if (!isFinite(bb.z_min)) bb.z_min = bb.z_max = 0;

  return {
    source_cam: cam,
    source_format: input.format,
    moves: parsed.moves,
    tool_changes: parsed.toolChanges,
    total_move_count: parsed.moves.length,
    bounding_box: bb,
    warnings,
    cam_metadata: input.cam_metadata ?? {},
  };
}

// ============================================================================
// U02 — CamSpecificEnhancer
// ============================================================================

function enhanceFusion360(tp: NormalizedToolpath, meta: Record<string, any>): CamInsight[] {
  const insights: CamInsight[] = [];

  // Adaptive clearing engagement angle — Fusion stores as "optimalLoad" in degrees
  const optLoad = meta["optimalLoad"] ?? meta["optimal_load"] ?? meta["engagement_angle"];
  const engAngle = typeof optLoad === "number" ? optLoad : 70; // Fusion default ~70%
  insights.push({
    category: "adaptive_clearing",
    key: "engagement_angle_deg",
    value: engAngle,
    unit: "deg",
    description: "Fusion 360 adaptive clearing optimal engagement angle",
  });

  // Stepover from bounding box + move density
  const xRange = tp.bounding_box.x_max - tp.bounding_box.x_min;
  const yRange = tp.bounding_box.y_max - tp.bounding_box.y_min;
  const area = xRange * yRange;
  const moveDensity = area > 0 ? tp.total_move_count / area : 0;
  insights.push({
    category: "adaptive_clearing",
    key: "move_density_per_mm2",
    value: parseFloat(moveDensity.toFixed(4)),
    unit: "moves/mm²",
    description: "Toolpath move density — higher = finer adaptive pass",
  });

  // Morphing/rest machining flag from meta
  const restMach = meta["restMachining"] ?? meta["rest_machining"] ?? false;
  insights.push({
    category: "strategy",
    key: "rest_machining",
    value: Boolean(restMach),
    description: "Rest machining enabled in Fusion 360 operation",
  });

  // Smoothing tolerance
  const smoothTol = meta["smoothingTolerance"] ?? meta["tolerance"] ?? 0.01;
  insights.push({
    category: "quality",
    key: "smoothing_tolerance_mm",
    value: smoothTol,
    unit: "mm",
    description: "Fusion 360 smoothing/tolerance setting",
  });

  return insights;
}

function enhanceHyperMill(tp: NormalizedToolpath, meta: Record<string, any>): CamInsight[] {
  const insights: CamInsight[] = [];

  // 5X auto-tilt vector from meta
  const tiltVec = meta["auto_tilt_vector"] ?? meta["tiltVector"] ?? { x: 0, y: 0, z: 1 };
  insights.push({
    category: "5axis",
    key: "auto_tilt_vector",
    value: `[${tiltVec.x ?? 0},${tiltVec.y ?? 0},${tiltVec.z ?? 1}]`,
    description: "hyperMILL auto-tilt axis vector for collision avoidance",
  });

  const tiltAngleMin = meta["tilt_angle_min"] ?? 5;
  const tiltAngleMax = meta["tilt_angle_max"] ?? 30;
  insights.push({
    category: "5axis",
    key: "tilt_angle_range_deg",
    value: `${tiltAngleMin}–${tiltAngleMax}`,
    unit: "deg",
    description: "hyperMILL auto-tilt angle range",
  });

  // Detect C-axis moves from normalized toolpath (B or C axis usage)
  const has5Axis = tp.moves.some(m => m.b !== undefined || m.c !== undefined);
  insights.push({
    category: "5axis",
    key: "five_axis_detected",
    value: has5Axis,
    description: "Simultaneous 5-axis motion detected in normalized moves",
  });

  // hyperMILL rest material detection radius
  const restRadius = meta["rest_material_radius"] ?? meta["restRadius"] ?? 0.0;
  insights.push({
    category: "rest_machining",
    key: "rest_material_radius_mm",
    value: restRadius,
    unit: "mm",
    description: "hyperMILL rest material detection radius",
  });

  return insights;
}

function enhanceMastercam(tp: NormalizedToolpath, meta: Record<string, any>): CamInsight[] {
  const insights: CamInsight[] = [];

  // Dynamic motion chip load target
  const chipLoad = meta["chip_load"] ?? meta["chipLoad"] ?? meta["chip_load_target"];
  const chipLoadVal = typeof chipLoad === "number" ? chipLoad : 0.05; // mm/tooth default
  insights.push({
    category: "dynamic_motion",
    key: "chip_load_target_mm_tooth",
    value: chipLoadVal,
    unit: "mm/tooth",
    description: "Mastercam Dynamic Motion target chip load per tooth",
  });

  const maxEngagement = meta["max_engagement_pct"] ?? meta["maxEngagement"] ?? 75;
  insights.push({
    category: "dynamic_motion",
    key: "max_engagement_pct",
    value: maxEngagement,
    unit: "%",
    description: "Mastercam Dynamic Motion maximum radial engagement percentage",
  });

  // Feed rate consistency — std dev of feed rates in moves
  const feeds = tp.moves.filter(m => m.feed_rate !== undefined).map(m => m.feed_rate!);
  if (feeds.length > 1) {
    const mean = feeds.reduce((a, b) => a + b, 0) / feeds.length;
    const variance = feeds.reduce((s, f) => s + (f - mean) ** 2, 0) / feeds.length;
    const stdDev = Math.sqrt(variance);
    insights.push({
      category: "dynamic_motion",
      key: "feed_rate_std_dev",
      value: parseFloat(stdDev.toFixed(2)),
      unit: "mm/min",
      description: "Feed rate standard deviation — lower = more consistent Dynamic Motion",
    });
  }

  const smoothingPasses = meta["smoothing_passes"] ?? 3;
  insights.push({
    category: "quality",
    key: "smoothing_passes",
    value: smoothingPasses,
    description: "Mastercam high-speed smoothing pass count",
  });

  return insights;
}

function enhanceSolidCAM(tp: NormalizedToolpath, meta: Record<string, any>): CamInsight[] {
  const insights: CamInsight[] = [];

  // iMachining chip thinning factor = actual_chipload / programmed_feed_chipload
  const nominalCL = meta["nominal_chip_load"] ?? meta["nominalChipLoad"] ?? 0.05;
  const radiusRatio = meta["radial_ratio"] ?? meta["radialRatio"] ?? 0.5; // ae/D
  // Chip thinning factor = sqrt(ae/D) when ae < D/2
  const chipThinFactor = radiusRatio < 0.5 ? Math.sqrt(radiusRatio * 2) : 1.0;
  const effectiveCL = nominalCL * chipThinFactor;

  insights.push({
    category: "imachining",
    key: "chip_thinning_factor",
    value: parseFloat(chipThinFactor.toFixed(4)),
    description: "SolidCAM iMachining chip thinning factor (sqrt(2*ae/D) when ae<D/2)",
  });
  insights.push({
    category: "imachining",
    key: "effective_chip_load_mm_tooth",
    value: parseFloat(effectiveCL.toFixed(5)),
    unit: "mm/tooth",
    description: "Effective chip load accounting for chip thinning",
  });

  const morphFactor = meta["morph_factor"] ?? meta["morphFactor"] ?? 0.8;
  insights.push({
    category: "imachining",
    key: "morph_factor",
    value: morphFactor,
    description: "SolidCAM iMachining morph spiral factor (0=pure offset, 1=pure radial)",
  });

  const stepoverPct = meta["stepover_pct"] ?? 50;
  insights.push({
    category: "imachining",
    key: "stepover_pct",
    value: stepoverPct,
    unit: "%",
    description: "SolidCAM iMachining radial stepover percentage",
  });

  return insights;
}

function enhanceNX(tp: NormalizedToolpath, meta: Record<string, any>): CamInsight[] {
  const insights: CamInsight[] = [];

  // RTCP (Rotary Tool Center Point) mode flags
  const rtcpMode = meta["rtcp_mode"] ?? meta["rtcpMode"] ?? "TCPM"; // or RPCP
  insights.push({
    category: "5axis_rtcp",
    key: "rtcp_mode",
    value: String(rtcpMode),
    description: "NX advanced RTCP mode (TCPM=Tool Center Point Management, RPCP=Rotating Part)",
  });

  const rtcpActive = meta["rtcp_active"] ?? meta["rtcpActive"] ?? true;
  insights.push({
    category: "5axis_rtcp",
    key: "rtcp_active",
    value: Boolean(rtcpActive),
    description: "NX RTCP compensation active flag",
  });

  const positioningTol = meta["positioning_tolerance"] ?? meta["positioningTolerance"] ?? 0.005;
  insights.push({
    category: "5axis_rtcp",
    key: "positioning_tolerance_mm",
    value: positioningTol,
    unit: "mm",
    description: "NX 5-axis positioning tolerance",
  });

  // Variable axis profile — detect multi-axis from B-axis presence
  const hasVariableAxis = tp.moves.some(m => m.b !== undefined || m.a !== undefined);
  insights.push({
    category: "5axis_rtcp",
    key: "variable_axis_detected",
    value: hasVariableAxis,
    description: "Variable axis (4/5-axis simultaneous) detected in NX toolpath",
  });

  const forwardVector = meta["forward_vector"] ?? { x: 0, y: 0, z: 1 };
  insights.push({
    category: "5axis_rtcp",
    key: "tool_forward_vector",
    value: `[${forwardVector.x ?? 0},${forwardVector.y ?? 0},${forwardVector.z ?? 1}]`,
    description: "NX tool forward axis vector for RTCP computation",
  });

  return insights;
}

function enhanceCamSpecific(input: CamNeutralInput, tp: NormalizedToolpath): CamSpecificEnhancement {
  const meta = input.cam_metadata ?? {};
  let insights: CamInsight[] = [];

  switch (input.source_cam) {
    case "fusion360":
      insights = enhanceFusion360(tp, meta);
      break;
    case "hypermill":
      insights = enhanceHyperMill(tp, meta);
      break;
    case "mastercam":
      insights = enhanceMastercam(tp, meta);
      break;
    case "solidcam":
      insights = enhanceSolidCAM(tp, meta);
      break;
    case "nx":
      insights = enhanceNX(tp, meta);
      break;
    default:
      insights = [{
        category: "generic",
        key: "cam_system",
        value: input.source_cam ?? "unknown",
        description: "No CAM-specific enhancements available for this system",
      }];
  }

  const metadataInjected: Record<string, any> = {};
  for (const ins of insights) {
    metadataInjected[ins.key] = ins.value;
  }

  return { source_cam: input.source_cam ?? "generic", insights, metadata_injected: metadataInjected };
}

// ============================================================================
// U03 — SubprogramOptimizer
// ============================================================================

/**
 * Rolling-hash based pattern detection.
 * Finds repeated blocks of consecutive lines that appear >= 2 times.
 * Min pattern length: 3 lines, Max: 50 lines.
 */
function detectSubprograms(gcode: string, controllerFormat: "fanuc" | "siemens" | "mazak" | "okuma" | "generic" = "fanuc"): SubprogramResult {
  const rawLines = gcode.split("\n");
  const codeLines = rawLines.map(l => l.trim()).filter(l => l.length > 0 && !isComment(l));
  const originalLineCount = rawLines.length;

  const patterns: SubprogramAnalysis["patterns"] = [];
  const seen = new Map<string, number[]>(); // key -> list of start indices

  const MIN_LEN = 3;
  const MAX_LEN = Math.min(50, Math.floor(codeLines.length / 2));

  // Sliding window for all pattern lengths
  for (let len = MIN_LEN; len <= MAX_LEN; len++) {
    for (let start = 0; start <= codeLines.length - len; start++) {
      const block = codeLines.slice(start, start + len);
      const key = block.join("\n");
      if (!seen.has(key)) seen.set(key, []);
      seen.get(key)!.push(start);
    }
  }

  // Filter to patterns appearing >= 2 times, pick non-overlapping maximal coverage
  const candidates: Array<{ key: string; starts: number[]; len: number }> = [];
  for (const [key, starts] of seen.entries()) {
    if (starts.length < 2) continue;
    const len = key.split("\n").length;
    candidates.push({ key, starts, len });
  }

  // Sort by savings descending: (occurrences-1)*len
  candidates.sort((a, b) => (b.starts.length - 1) * b.len - (a.starts.length - 1) * a.len);

  const coveredIndices = new Set<number>();
  let subprogId = 1000;

  for (const cand of candidates) {
    // Check if any occurrence is non-overlapping
    const nonOverlapping: number[] = [];
    for (const start of cand.starts) {
      const indices = Array.from({ length: cand.len }, (_, i) => start + i);
      if (indices.every(idx => !coveredIndices.has(idx))) {
        nonOverlapping.push(start);
      }
    }
    if (nonOverlapping.length < 2) continue;

    // Mark all occurrences as covered
    for (const start of nonOverlapping) {
      for (let i = 0; i < cand.len; i++) coveredIndices.add(start + i);
    }

    subprogId++;
    const occurrences = nonOverlapping.length;
    const lineCount = cand.len;
    const savingsLines = (occurrences - 1) * lineCount;

    let subprogramCall: string;
    switch (controllerFormat) {
      case "siemens":
        subprogramCall = `L${subprogId}`;
        break;
      case "mazak":
        subprogramCall = `CALL O${subprogId}`;
        break;
      case "okuma":
        subprogramCall = `CALL O${subprogId}`;
        break;
      default: // fanuc
        subprogramCall = `M98 P${subprogId}`;
    }

    patterns.push({
      pattern_lines: cand.key.split("\n"),
      occurrences,
      line_count: lineCount,
      savings_lines: savingsLines,
      subprogram_call: subprogramCall,
    });

    if (patterns.length >= 20) break; // cap at 20 subprograms
  }

  const totalSavings = patterns.reduce((s, p) => s + p.savings_lines, 0);
  const totalSavingsPct = codeLines.length > 0 ? parseFloat(((totalSavings / codeLines.length) * 100).toFixed(1)) : 0;

  const analysis: SubprogramAnalysis = {
    patterns_found: patterns.length,
    patterns,
    total_savings_lines: totalSavings,
    total_savings_percent: totalSavingsPct,
  };

  // Build optimized main program + subprograms
  const subprogramBodies: Array<{ id: number; label: string; body: string }> = [];
  const patternKeyToId = new Map<string, number>();
  let idCounter = 1001;

  for (const pat of patterns) {
    const key = pat.pattern_lines.join("\n");
    const id = idCounter++;
    patternKeyToId.set(key, id);
    let body: string;
    switch (controllerFormat) {
      case "siemens":
        body = `; SUBPROGRAM L${id}\nPROC L${id}\n${pat.pattern_lines.join("\n")}\nRET`;
        break;
      case "mazak":
      case "okuma":
        body = `O${id}\n${pat.pattern_lines.join("\n")}\nM99`;
        break;
      default: // fanuc
        body = `O${id}\n${pat.pattern_lines.join("\n")}\nM99`;
    }
    subprogramBodies.push({ id, label: `O${id}`, body });
  }

  // Rebuild main: replace repeated blocks with calls
  // Use simple text substitution pass on codeLines
  let mainLines = [...codeLines];
  let i = 0;
  const resultMain: string[] = [];
  const usedBlocks = new Set<string>();

  while (i < mainLines.length) {
    let replaced = false;
    for (const pat of patterns) {
      const key = pat.pattern_lines.join("\n");
      const id = patternKeyToId.get(key);
      if (!id) continue;
      const len = pat.pattern_lines.length;
      if (i + len > mainLines.length) continue;
      const slice = mainLines.slice(i, i + len).join("\n");
      if (slice === key) {
        // First occurrence: emit the call
        if (!usedBlocks.has(key)) {
          resultMain.push(pat.subprogram_call);
          usedBlocks.add(key);
        } else {
          resultMain.push(pat.subprogram_call);
        }
        i += len;
        replaced = true;
        break;
      }
    }
    if (!replaced) {
      resultMain.push(mainLines[i]);
      i++;
    }
  }

  const finalLineCount = resultMain.length + subprogramBodies.reduce((s, sp) => s + sp.body.split("\n").length, 0);

  return {
    analysis,
    optimized_main: resultMain.join("\n"),
    subprograms: subprogramBodies,
    original_line_count: originalLineCount,
    final_line_count: finalLineCount,
  };
}

// ============================================================================
// U04 — MultiChannelPostGenerator
// ============================================================================

function generateMazakMultiChannel(input: MultiChannelInput): MultiChannelProgram {
  // Mazak: $1/$2 channel markers, M200-series sync, !Cn wait
  // M200 = wait for channel sync, M201+ = barrier sync points
  const channels: MultiChannelProgram["channels"] = [];

  for (const op of input.operations) {
    const lines: string[] = [];
    const syncPoints: MultiChannelProgram["channels"][0]["sync_points"] = [];

    lines.push(`$${op.channel}`); // channel select
    lines.push(`(CHANNEL ${op.channel}: ${op.name})`);

    if (op.waits_for !== undefined) {
      const syncCode = `!C${op.waits_for}`;
      syncPoints.push({ line: lines.length, code: syncCode, waits_for: op.waits_for });
      lines.push(syncCode);
    }

    lines.push(...op.gcode_lines);

    if (op.sync_after !== undefined) {
      const syncMCode = `M${200 + op.sync_after}`;
      syncPoints.push({ line: lines.length, code: syncMCode, waits_for: op.sync_after });
      lines.push(syncMCode);
    }

    // Find existing channel or create new
    const existing = channels.find(c => c.channel_number === op.channel);
    if (existing) {
      const offset = existing.gcode.split("\n").length;
      existing.gcode += "\n" + lines.join("\n");
      for (const sp of syncPoints) {
        existing.sync_points.push({ ...sp, line: sp.line + offset });
      }
    } else {
      channels.push({
        channel_number: op.channel,
        gcode: lines.join("\n"),
        sync_points: syncPoints,
      });
    }
  }

  // Append M30 to each channel
  for (const ch of channels) ch.gcode += "\nM30";

  return { channels, controller_format: "mazak" };
}

function generateSiemensMultiChannel(input: MultiChannelInput): MultiChannelProgram {
  // Siemens: CHANNEL 1/2, WAITM(mark, ch1, ch2), INIT, START
  const channels: MultiChannelProgram["channels"] = [];
  const channelMap = new Map<number, string[]>();
  const channelSyncs = new Map<number, MultiChannelProgram["channels"][0]["sync_points"]>();

  for (const op of input.operations) {
    if (!channelMap.has(op.channel)) {
      channelMap.set(op.channel, [`; CHANNEL ${op.channel}: ${op.name}`]);
      channelSyncs.set(op.channel, []);
    }
    const lines = channelMap.get(op.channel)!;
    const syncs = channelSyncs.get(op.channel)!;

    if (op.waits_for !== undefined) {
      const waitCode = `WAITM(${op.waits_for},1,2)`;
      syncs.push({ line: lines.length, code: waitCode, waits_for: op.waits_for });
      lines.push(waitCode);
    }

    lines.push(...op.gcode_lines);

    if (op.sync_after !== undefined) {
      const waitCode = `WAITM(${op.sync_after},1,2)`;
      syncs.push({ line: lines.length, code: waitCode, waits_for: op.sync_after });
      lines.push(waitCode);
    }
  }

  for (const [chNum, lines] of channelMap.entries()) {
    lines.push("M30");
    channels.push({
      channel_number: chNum,
      gcode: lines.join("\n"),
      sync_points: channelSyncs.get(chNum) ?? [],
    });
  }

  return { channels, controller_format: "siemens" };
}

function generateFanucMultiChannel(input: MultiChannelInput): MultiChannelProgram {
  // Fanuc multi-path: G500 Pn (path select), MWAIT for sync
  // Path addressed as G1.1 / G1.2 or via dedicated O-program per path
  const channels: MultiChannelProgram["channels"] = [];
  const channelMap = new Map<number, string[]>();
  const channelSyncs = new Map<number, MultiChannelProgram["channels"][0]["sync_points"]>();

  for (const op of input.operations) {
    if (!channelMap.has(op.channel)) {
      channelMap.set(op.channel, [`(PATH ${op.channel}: ${op.name})`]);
      channelSyncs.set(op.channel, []);
    }
    const lines = channelMap.get(op.channel)!;
    const syncs = channelSyncs.get(op.channel)!;

    if (op.waits_for !== undefined) {
      // Fanuc MWAIT with ID
      const waitCode = `MWAIT${op.waits_for.toString().padStart(4, "0")}`;
      syncs.push({ line: lines.length, code: waitCode, waits_for: op.waits_for });
      lines.push(waitCode);
    }

    lines.push(...op.gcode_lines);

    if (op.sync_after !== undefined) {
      const waitCode = `MWAIT${op.sync_after.toString().padStart(4, "0")}`;
      syncs.push({ line: lines.length, code: waitCode, waits_for: op.sync_after });
      lines.push(waitCode);
    }
  }

  for (const [chNum, lines] of channelMap.entries()) {
    lines.push("M30");
    channels.push({
      channel_number: chNum,
      gcode: lines.join("\n"),
      sync_points: channelSyncs.get(chNum) ?? [],
    });
  }

  return { channels, controller_format: "fanuc" };
}

function generateOkumaMultiChannel(input: MultiChannelInput): MultiChannelProgram {
  // Okuma: $n channel select, MWAIT for sync
  const channels: MultiChannelProgram["channels"] = [];
  const channelMap = new Map<number, string[]>();
  const channelSyncs = new Map<number, MultiChannelProgram["channels"][0]["sync_points"]>();

  for (const op of input.operations) {
    if (!channelMap.has(op.channel)) {
      channelMap.set(op.channel, [`$${op.channel}`, `(${op.name})`]);
      channelSyncs.set(op.channel, []);
    }
    const lines = channelMap.get(op.channel)!;
    const syncs = channelSyncs.get(op.channel)!;

    if (op.waits_for !== undefined) {
      const waitCode = `MWAIT${op.waits_for}`;
      syncs.push({ line: lines.length, code: waitCode, waits_for: op.waits_for });
      lines.push(waitCode);
    }

    lines.push(...op.gcode_lines);

    if (op.sync_after !== undefined) {
      const waitCode = `MWAIT${op.sync_after}`;
      syncs.push({ line: lines.length, code: waitCode, waits_for: op.sync_after });
      lines.push(waitCode);
    }
  }

  for (const [chNum, lines] of channelMap.entries()) {
    lines.push("M30");
    channels.push({
      channel_number: chNum,
      gcode: lines.join("\n"),
      sync_points: channelSyncs.get(chNum) ?? [],
    });
  }

  return { channels, controller_format: "okuma" };
}

function generateMultiChannel(input: MultiChannelInput): MultiChannelProgram {
  switch (input.controller) {
    case "mazak":    return generateMazakMultiChannel(input);
    case "siemens":  return generateSiemensMultiChannel(input);
    case "fanuc":    return generateFanucMultiChannel(input);
    case "okuma":    return generateOkumaMultiChannel(input);
    default:         return generateFanucMultiChannel(input);
  }
}

// ============================================================================
// U05 — MillTurnPhysicsIntegration
// ============================================================================

// Material density table (kg/m³) for mass calculation
const MATERIAL_DENSITY: Record<string, number> = {
  steel: 7850,
  aluminum: 2700,
  stainless: 8000,
  titanium: 4500,
  brass: 8500,
};

// Material yield strength (MPa) for cutting force estimation
const MATERIAL_YIELD_MPA: Record<string, number> = {
  steel: 350,
  aluminum: 270,
  stainless: 500,
  titanium: 900,
  brass: 200,
};

// Recommended CSS ranges (m/min) per material
const CSS_RANGE: Record<string, { min: number; max: number }> = {
  steel:     { min: 150, max: 280 },
  aluminum:  { min: 300, max: 800 },
  stainless: { min: 100, max: 180 },
  titanium:  { min: 40,  max: 80  },
  brass:     { min: 200, max: 400 },
};

/**
 * Compute Dunkerley bar whip critical speed (rpm):
 * Nc = (30/π) * sqrt(g/δ)  where δ = static deflection under self-weight
 * For a cantilever: δ = (m*g*L³) / (3*E*I)
 * E = Young's modulus, I = π*d⁴/64, L = unsupported length
 */
function computeCriticalSpeed(
  barDiamMm: number,
  barLengthMm: number,
  material: string = "steel"
): number {
  const D = barDiamMm / 1000; // m
  const L = barLengthMm / 1000; // m
  const density = MATERIAL_DENSITY[material] ?? 7850;

  // Young's modulus (Pa)
  const E_MAP: Record<string, number> = {
    steel: 200e9, aluminum: 69e9, stainless: 193e9, titanium: 116e9, brass: 100e9,
  };
  const E = E_MAP[material] ?? 200e9;

  const I = Math.PI * D ** 4 / 64; // second moment of area (m⁴)
  const A = Math.PI * D ** 2 / 4;   // cross-sectional area (m²)
  const mass = density * A * L;      // kg
  const g = 9.81;

  // Static deflection at tip under self-weight (cantilever)
  const delta = (mass * g * L ** 3) / (3 * E * I);
  if (delta <= 0) return 999999;

  const omega_n = Math.sqrt(g / delta); // rad/s
  const nc = (omega_n * 30) / Math.PI;  // rpm
  return Math.round(nc);
}

/**
 * Estimate turning cutting force (N) using specific cutting force approach:
 * Fc = kc * b * h  where kc = specific force (N/mm²), b = DOC, h = feed/rev approximation
 */
function computeTurningForce(
  docMm: number,
  wocMm: number,
  materialTensile: number
): number {
  // kc ≈ 2.8 * Rm for ferrous (N/mm²), empirical
  const kc = 2.8 * (materialTensile / 1000) * 1000; // N/mm²
  const b = docMm;
  const h = wocMm > 0 ? wocMm : 0.2; // use woc as uncut chip thickness approx
  return Math.round(kc * b * h);
}

/**
 * Estimate tip deflection under turning force using cantilever beam model:
 * δ = F * L³ / (3 * E * I)
 */
function computeDeflection(
  forcN: number,
  barDiamMm: number,
  barLengthMm: number,
  material: string = "steel"
): number {
  const D = barDiamMm / 1000;
  const L = barLengthMm / 1000;
  const E_MAP: Record<string, number> = {
    steel: 200e9, aluminum: 69e9, stainless: 193e9, titanium: 116e9, brass: 100e9,
  };
  const E = E_MAP[material] ?? 200e9;
  const I = Math.PI * D ** 4 / 64;
  const delta = (forcN * L ** 3) / (3 * E * I);
  return parseFloat((delta * 1000).toFixed(4)); // convert to mm
}

function integrateMillTurnPhysics(input: MillTurnPhysicsInput): MillTurnPhysicsResult {
  const mat = input.bar_material ?? "steel";
  const tensile = input.material_tensile_mpa ?? MATERIAL_YIELD_MPA[mat] ?? 350;
  const cssRange = CSS_RANGE[mat] ?? CSS_RANGE.steel;
  const recommendedCSS = input.target_surface_speed_mpm ?? Math.round((cssRange.min + cssRange.max) / 2);

  // Critical bar whip speed — apply 75% safety factor
  const criticalRpm = computeCriticalSpeed(input.bar_diameter_mm, input.bar_length_mm, mat);
  const safeMaxRpm = Math.min(input.max_rpm, Math.round(criticalRpm * 0.75));

  // Cutting force
  const turningForce = computeTurningForce(input.turning_doc_mm, input.turning_woc_mm ?? 0.2, tensile);

  // Tip deflection
  const deflection = computeDeflection(turningForce, input.bar_diameter_mm, input.bar_length_mm, mat);
  const deflectionWarning = deflection > 0.05; // 50 µm threshold

  // CSS G-code block
  // G96 = constant surface speed, S = surface speed in m/min (or ft/min)
  // G92 = spindle speed limit (Fanuc) / LIMS= (Siemens)
  const cssBlock = [
    `(MILL-TURN PHYSICS — ${mat.toUpperCase()})`,
    `(Critical Speed: ${criticalRpm} RPM, Safe Max: ${safeMaxRpm} RPM)`,
    `(Deflection: ${deflection}mm at ${turningForce}N cutting force)`,
    `G50 S${safeMaxRpm}`,            // spindle speed clamp (Fanuc)
    `G96 S${recommendedCSS} M03`,   // CSS mode, recommended speed
    `(G97 S${Math.min(safeMaxRpm, Math.round(recommendedCSS * 1000 / (Math.PI * input.bar_diameter_mm)))} M03)`,  // fallback fixed RPM comment
  ].join("\n");

  const physicsNotes: string[] = [
    `Bar L/D ratio: ${(input.bar_length_mm / input.bar_diameter_mm).toFixed(1)} (>${input.bar_length_mm / input.bar_diameter_mm > 4 ? " ⚠ supports recommended" : " OK"})`,
    `Critical whip speed: ${criticalRpm} RPM — running at ${Math.round(criticalRpm * 0.75)} RPM (75% limit)`,
    `Turning force at DOC ${input.turning_doc_mm}mm: ${turningForce}N`,
    `Tip deflection: ${deflection}mm${deflectionWarning ? " — EXCEEDS 0.05mm tolerance threshold" : ""}`,
    `Recommended CSS: ${recommendedCSS} m/min for ${mat}`,
  ];

  if (input.chuck_grip_length_mm !== undefined) {
    const effectiveL = input.bar_length_mm - input.chuck_grip_length_mm;
    const ldRatio = effectiveL / input.bar_diameter_mm;
    physicsNotes.push(`Effective stick-out L/D: ${ldRatio.toFixed(1)} (grip length: ${input.chuck_grip_length_mm}mm)`);
    if (ldRatio > 3) physicsNotes.push("WARNING: L/D > 3 — steady rest or tailstock strongly recommended");
  }

  return {
    css_block: cssBlock,
    critical_speed_rpm: criticalRpm,
    safe_max_rpm: safeMaxRpm,
    deflection_at_tip_mm: deflection,
    deflection_warning: deflectionWarning,
    turning_force_n: turningForce,
    recommended_css_mpm: recommendedCSS,
    physics_notes: physicsNotes,
  };
}

// ============================================================================
// U06 — ProductionAutomationIntegration
// ============================================================================

function integrateAutomation(config: AutomationConfig): AutomationResult {
  const headerLines: string[] = [];
  const footerLines: string[] = [];
  const notes: string[] = [];
  let barFeedCalls = 0;
  let partsPerBar = 0;
  let remnantWarning = false;

  const progName = config.program_name ?? "O0001";

  // Program header
  headerLines.push(`%`);
  headerLines.push(`${progName}`);
  headerLines.push(`(PRISM AUTO-GENERATED — ${new Date().toISOString().slice(0, 10)})`);

  // Bar feeder integration
  if (config.bar_feeder?.enabled) {
    const bf = config.bar_feeder;
    const feedCode = bf.feed_code ?? "M105";
    const advanceCode = bf.advance_code ?? "M106";

    partsPerBar = bf.part_length_mm > 0
      ? Math.floor((bf.bar_length_mm - bf.remnant_min_mm) / bf.part_length_mm)
      : 0;

    remnantWarning = (bf.bar_length_mm - partsPerBar * bf.part_length_mm) < bf.remnant_min_mm * 1.1;

    headerLines.push(`(BAR FEEDER: ${bf.bar_length_mm}mm bar, ${partsPerBar} parts per bar)`);
    headerLines.push(`(Part length: ${bf.part_length_mm}mm, Remnant min: ${bf.remnant_min_mm}mm)`);
    headerLines.push(`#100=0 (PART COUNTER)`);
    headerLines.push(`#101=${partsPerBar} (PARTS PER BAR)`);
    headerLines.push(`#102=${bf.bar_length_mm} (BAR LENGTH)`);

    // Bar feed macro loop
    footerLines.push(`(BAR FEED SEQUENCE)`);
    footerLines.push(`#100=#100+1`);
    footerLines.push(`IF [#100 GE #101] GOTO 999 (REMNANT CHECK)`);
    footerLines.push(`${feedCode} (RETRACT STOCK PUSHER)`);
    footerLines.push(`${advanceCode} (ADVANCE BAR)`);
    footerLines.push(`M0 (CONFIRM BAR FEED)`);
    footerLines.push(`GOTO 1 (REPEAT)`);
    footerLines.push(`N999 (REMNANT — LOAD NEW BAR)`);
    footerLines.push(`M0`);
    footerLines.push(`#100=0`);
    footerLines.push(`GOTO 1`);

    barFeedCalls = partsPerBar;
    notes.push(`Bar feeder: ${partsPerBar} parts from ${bf.bar_length_mm}mm bar`);
    if (remnantWarning) notes.push(`WARNING: remnant margin tight (< ${(bf.remnant_min_mm * 1.1).toFixed(0)}mm)`);
  }

  // Pallet changer integration
  if (config.pallet_changer?.enabled) {
    const pc = config.pallet_changer;
    const changeCode = pc.change_code ?? "M60";

    headerLines.push(`(PALLET CHANGER: ${pc.pallet_count} pallets, code=${changeCode})`);
    headerLines.push(`#200=1 (ACTIVE PALLET)`);

    footerLines.push(`(PALLET CHANGE SEQUENCE)`);
    footerLines.push(`${changeCode} (EXCHANGE PALLET)`);
    footerLines.push(`#200=#200+1`);
    footerLines.push(`IF [#200 GT ${pc.pallet_count}] THEN #200=1`);
    footerLines.push(`(PALLET #[#200] LOADED)`);

    notes.push(`Pallet changer: ${pc.pallet_count} pallets, M60 exchange`);
  }

  // Part counter integration
  if (config.part_counter?.enabled) {
    const cnt = config.part_counter;
    const counterVar = cnt.counter_variable ?? "#500";

    headerLines.push(`(PART COUNTER: target=${cnt.target_quantity})`);
    headerLines.push(`${counterVar}=0 (RESET COUNTER)`);

    footerLines.push(`(PART COUNTER UPDATE)`);
    footerLines.push(`${counterVar}=${counterVar}+1`);
    footerLines.push(`IF [${counterVar} GE ${cnt.target_quantity}] GOTO 9998`);
    footerLines.push(`N9998 (TARGET QUANTITY REACHED)`);
    footerLines.push(`M0 (OPERATOR ALERT: RUN COMPLETE)`);
    footerLines.push(`M30`);

    notes.push(`Part counter: target ${cnt.target_quantity} parts, variable ${counterVar}`);
  } else {
    footerLines.push(`M30`);
    footerLines.push(`%`);
  }

  footerLines.push(`%`);

  return {
    header: headerLines.join("\n"),
    footer: footerLines.join("\n"),
    bar_feed_calls: barFeedCalls,
    parts_per_bar: partsPerBar,
    remnant_warning: remnantWarning,
    automation_notes: notes,
  };
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

/** Cross-CAM Post Engine — unifies toolpath ingestion, CAM-specific metadata
 *  injection, subprogram optimization, multi-channel mill-turn generation,
 *  physics-based mill-turn parameters, and production automation codes.
 */
export class CrossCAMPostEngine {
  /**
   * U01: Normalize any CAM toolpath input (G-code, CL/APT, JSON, CSV)
   * into a common NormalizedToolpath structure.
   */
  normalizeInput(input: CamNeutralInput): NormalizedToolpath {
    return normalizeInput(input);
  }

  /**
   * U02: Inject CAM-specific insights as metadata for:
   * Fusion (adaptive engagement), hyperMILL (5X tilt), Mastercam (dynamic chip load),
   * SolidCAM (iMachining thinning), NX (RTCP flags).
   */
  enhanceCamSpecific(input: CamNeutralInput, tp?: NormalizedToolpath): CamSpecificEnhancement {
    const normalized = tp ?? normalizeInput(input);
    return enhanceCamSpecific(input, normalized);
  }

  /**
   * U03: Detect repeated geometry patterns and generate subprogram calls.
   * Savings = (N-1)*M lines for a pattern of M lines repeated N times.
   */
  detectSubprograms(
    gcode: string,
    controllerFormat: "fanuc" | "siemens" | "mazak" | "okuma" | "generic" = "fanuc"
  ): SubprogramResult {
    return detectSubprograms(gcode, controllerFormat);
  }

  /**
   * U04: Generate mill-turn multi-channel sync programs for
   * Mazak ($1/$2, M200, !Cn), Siemens (WAITM), Fanuc (MWAITxxxx), Okuma ($n, MWAIT).
   */
  generateMultiChannel(input: MultiChannelInput): MultiChannelProgram {
    return generateMultiChannel(input);
  }

  /**
   * U05: Compute CSS G-code block, critical bar-whip speed, tip deflection
   * under turning forces, and part deflection warnings.
   */
  integrateMillTurnPhysics(input: MillTurnPhysicsInput): MillTurnPhysicsResult {
    return integrateMillTurnPhysics(input);
  }

  /**
   * U06: Build header/footer G-code for bar feeder, pallet changer M60,
   * part counter, and remnant management.
   */
  integrateAutomation(config: AutomationConfig): AutomationResult {
    return integrateAutomation(config);
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

/** Cross CAM Post Engine singleton. */
export const crossCAMPostEngine = new CrossCAMPostEngine();
