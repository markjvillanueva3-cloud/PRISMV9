export interface SafetyValidateRequest {
  material: string;
  operation: string;
  speed_rpm?: number;
  feed_mmrev?: number;
  depth_mm?: number;
  coolant?: string;
}

export interface SafetyWarning {
  code: string;
  message: string;
  severity: "info" | "warning" | "critical" | "blocked";
}

export interface SafetyResult {
  status: "APPROVED" | "BLOCKED";
  warnings: SafetyWarning[];
  limits?: Record<string, { min: number; max: number; current: number }>;
}

export interface SafetyLimitsRequest {
  material: string;
  operation: string;
  machine?: string;
  tool_diameter?: number;
}

export interface SafetyLimitsResult {
  speed_rpm: { min: number; max: number };
  feed_mmrev: { min: number; max: number };
  depth_mm: { min: number; max: number };
  power_kw: { max: number };
}

export interface CollisionCheckRequest {
  gcode: string;
  fixture?: unknown;
  tool?: unknown;
}

export interface CollisionCheckResult {
  safe: boolean;
  collisions: Array<{
    line: number;
    type: string;
    description: string;
  }>;
}

export interface KnowledgeSearchRequest {
  query: string;
  limit?: number;
}

export interface KnowledgeSearchResult {
  results: Array<{
    id: string;
    content: string;
    relevance: number;
    source: string;
  }>;
}

export interface ApiError {
  message: string;
  code?: string;
}
