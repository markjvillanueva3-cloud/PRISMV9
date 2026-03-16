export interface ToolpathRequest {
  material: string;
  operation: string;
  tool_diameter?: number;
  depth_of_cut?: number;
  width_of_cut?: number;
  strategy?: string;
}

export interface ToolpathResult {
  toolpath: unknown;
  strategy_used: string;
  estimated_cycle_time_min?: number;
  warnings?: string[];
}

export interface SimulateRequest {
  gcode: string;
  stock?: { x: number; y: number; z: number };
}

export interface SimulateResult {
  frames: unknown[];
  final_stock: unknown;
  collisions: unknown[];
}

export interface PostProcessRequest {
  toolpath: unknown;
  controller: string;
  options?: Record<string, unknown>;
}

export interface PostProcessResult {
  gcode: string;
  line_count: number;
  warnings?: string[];
}

export interface CollisionCheckRequest {
  gcode: string;
  fixture?: unknown;
  tool?: unknown;
}

export interface CollisionCheckResult {
  collisions: Array<{
    line: number;
    type: string;
    severity: string;
    description: string;
  }>;
  safe: boolean;
}

export interface ApiError {
  message: string;
  code?: string;
}
