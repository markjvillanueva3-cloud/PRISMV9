export interface ProgramAssemblyInput {
  action: string;
  material?: string;
  operation_type?: string;
  tool_diameter_mm?: number;
  depth_of_cut_mm?: number;
  stepover_mm?: number;
  stock_dimensions?: { x: number; y: number; z: number };
  controller?: string;
  coordinate_system?: string;
  coolant_mode?: string;
  [key: string]: unknown;
}

export interface ProgramAssemblyResult {
  gcode: string;
  line_count: number;
  estimated_cycle_time_s: number;
  tool_changes: number;
  warnings?: string[];
}

export interface MotionProfile {
  axis: string;
  profile_type: "trapezoidal" | "s-curve";
  max_velocity_mm_s: number;
  max_acceleration_mm_s2: number;
  jerk_mm_s3?: number;
  segments: { time_s: number; position_mm: number; velocity_mm_s: number; acceleration_mm_s2: number }[];
  total_time_s: number;
}

export interface ToolMagazineLayout {
  pockets: { pocket_number: number; tool_id: string; tool_type: string; diameter_mm: number; length_mm: number; life_remaining_pct: number }[];
  total_pockets: number;
  occupied: number;
  optimization_suggestions?: string[];
}

export interface SetupSheet {
  part_name: string;
  material: string;
  fixture: string;
  datum_offsets: { id: string; x: number; y: number; z: number }[];
  operations: { seq: number; description: string; tool: string; speed_rpm: number; feed_mm_min: number }[];
  notes?: string[];
  estimated_cycle_time_s: number;
}

export interface ApiError {
  message: string;
  code?: string;
}
