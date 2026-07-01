/** Core speed & feed calculation request */
export interface SfcCalculateRequest {
  material: string;
  operation: string;
  material_hardness?: number;
  tool_material?: string;
  tool_diameter?: number;
  number_of_teeth?: number;
  depth?: number;
  width?: number;
  coolant?: string;
  /** Tool coating (TiAlN / AlTiN / AlCrN / DLC / diamond|PCD). Drives the engine's material-specific
   *  coating cutting-speed/tool-life derate + the diamond-on-ferrous incompatibility warning. Omit /
   *  empty = uncoated (engine treats as neutral 1.0 -- no derate). */
  coating?: string;
  /** Selected machine's spindle ceiling -- the engine clamps rpm (and rescales Vc) to it so the
   *  page never recommends an unreachable speed (the aluminum-RPM-cap accuracy gap). Omit = unclamped. */
  machine_max_rpm?: number;
  /** Selected machine's spindle power (kW) -- feeds the over-power / stall safety score. */
  machine_power_kw?: number;
  /** Goal selector for the recommended operating point (the cost / balanced / productivity
   *  slider). Trades tool life vs MRR within the canonical band; balanced (or omitted) yields
   *  the engine's default recommendation. */
  optimize_for?: "cost" | "balanced" | "productivity";
}

/** Speed & feed result */
export interface SfcCalculateResult {
  cutting_speed: number;
  feed_per_tooth: number;
  spindle_speed: number;
  feed_rate: number;
  safety?: { score: number; status: string; factors?: Record<string, number> };
  meta?: Record<string, unknown>;
}

/** Cycle time request */
export interface CycleTimeRequest {
  feed_rate: number;
  cut_length: number;
  approach_distance?: number;
  overtravel?: number;
  rapid_rate?: number;
  num_passes?: number;
}

export interface CycleTimeResult {
  cycle_time_seconds: number;
  cutting_time: number;
  rapid_time: number;
}

/** Tool engagement request */
export interface EngagementRequest {
  tool_diameter: number;
  radial_depth: number;
  strategy?: string;
}

export interface EngagementResult {
  engagement_angle: number;
  arc_length: number;
  max_engagement_deg?: number;
}

/** Deflection request */
export interface DeflectionRequest {
  tool_diameter: number;
  stickout: number;
  cutting_force: number;
  tool_material?: string;
}

export interface DeflectionResult {
  static_deflection: number;
  safe: boolean;
}

/** Power & torque request */
export interface PowerTorqueRequest {
  cutting_speed: number;
  feed_rate: number;
  depth: number;
  width: number;
  specific_cutting_force?: number;
  material?: string;
}

export interface PowerTorqueResult {
  power: number;
  torque: number;
  safe: boolean;
}

/** Surface finish request */
export interface SurfaceFinishRequest {
  feed: number;
  nose_radius: number;
  is_milling?: boolean;
  radial_depth?: number;
  tool_diameter?: number;
  operation?: string;
}

export interface SurfaceFinishResult {
  Ra: number;
  Rz: number;
}

/** Tool life request */
export interface ToolLifeRequest {
  cutting_speed: number;
  feed: number;
  depth: number;
  material?: string;
  tool_material?: string;
}

export interface ToolLifeResult {
  tool_life_minutes: number;
  wear_rate: number;
}

/** Generic API error */
export interface ApiError {
  message: string;
  code?: string;
  status?: number;
}
