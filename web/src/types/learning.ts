// ============================================================================
// Learning & Knowledge Types
// Matches backend LearningEngine, KnowledgeEngine, DigitalTwin endpoints
// ============================================================================

// ---------------------------------------------------------------------------
// POST /learning/assess — Skill assessment
// ---------------------------------------------------------------------------

export type LearningDomain = "cad" | "cam" | "shop_practice" | "machine_operation";

export interface AssessRequest {
  operator_id?: string;
  domains?: LearningDomain[];
  experience_years?: number;
  certifications?: string[];
  answers?: Record<string, string | number>;
}

export interface SkillScore {
  domain: LearningDomain;
  score: number;
  level: "beginner" | "intermediate" | "advanced" | "expert";
  strengths: string[];
  weaknesses: string[];
}

export interface AssessResult {
  operator_id: string;
  overall_level: string;
  scores: SkillScore[];
  recommended_focus: LearningDomain[];
  summary: string;
}

// ---------------------------------------------------------------------------
// POST /learning/plan — Personalized learning plan
// ---------------------------------------------------------------------------

export interface PlanRequest {
  operator_id?: string;
  skills?: SkillScore[];
  target_level?: string;
  available_hours_per_week?: number;
  focus_domains?: LearningDomain[];
}

export interface LearningModule {
  id: string;
  title: string;
  domain: LearningDomain;
  difficulty: "beginner" | "intermediate" | "advanced" | "expert";
  duration_minutes: number;
  prerequisites: string[];
  description: string;
  topics: string[];
}

export interface PlanResult {
  plan_id: string;
  operator_id: string;
  modules: LearningModule[];
  estimated_weeks: number;
  total_hours: number;
  milestones: { week: number; description: string }[];
}

// ---------------------------------------------------------------------------
// POST /learning/progress — Track progress
// ---------------------------------------------------------------------------

export interface ProgressRequest {
  operator_id?: string;
  plan_id?: string;
  module_id?: string;
  action?: "get" | "update" | "complete";
  score?: number;
  time_spent_minutes?: number;
}

export interface ModuleProgress {
  module_id: string;
  title: string;
  domain: LearningDomain;
  status: "not_started" | "in_progress" | "completed";
  completion_pct: number;
  score?: number;
  time_spent_minutes: number;
  completed_at?: string;
}

export interface ProgressResult {
  operator_id: string;
  plan_id: string;
  overall_completion_pct: number;
  modules: ModuleProgress[];
  streak_days: number;
  total_time_hours: number;
  achievements: Achievement[];
  domain_progress: Record<LearningDomain, number>;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  earned_at: string;
  icon?: string;
}

// ---------------------------------------------------------------------------
// POST /learning/recommend — Next module recommendations
// ---------------------------------------------------------------------------

export interface RecommendRequest {
  operator_id?: string;
  plan_id?: string;
  limit?: number;
}

export interface RecommendResult {
  recommendations: RecommendedModule[];
}

export interface RecommendedModule {
  module: LearningModule;
  reason: string;
  priority: "high" | "medium" | "low";
  match_score: number;
}

// ---------------------------------------------------------------------------
// POST /learning/knowledge/search — Knowledge base search
// ---------------------------------------------------------------------------

export interface KnowledgeSearchRequest {
  query: string;
  domain?: LearningDomain;
  source?: "documentation" | "standards" | "best_practices" | "tribal";
  limit?: number;
}

export interface KnowledgeEntry {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  domain: LearningDomain;
  source: string;
  relevance_score: number;
  tags: string[];
  updated_at?: string;
}

export interface KnowledgeSearchResult {
  query: string;
  total: number;
  results: KnowledgeEntry[];
}

// ---------------------------------------------------------------------------
// POST /learning/tribal — Tribal/shop floor knowledge
// ---------------------------------------------------------------------------

export interface TribalSearchRequest {
  query: string;
  category?: string;
  machine_type?: string;
  material?: string;
  limit?: number;
}

export interface TribalEntry {
  id: string;
  title: string;
  content: string;
  category: string;
  source_operator?: string;
  machine_type?: string;
  material?: string;
  verified: boolean;
  upvotes: number;
  tags: string[];
}

export interface TribalSearchResult {
  query: string;
  total: number;
  results: TribalEntry[];
}

// ---------------------------------------------------------------------------
// POST /learning/select/material — Material selection wizard
// ---------------------------------------------------------------------------

export interface MaterialSelectRequest {
  application?: string;
  properties?: {
    hardness_min?: number;
    hardness_max?: number;
    tensile_strength_min?: number;
    corrosion_resistance?: boolean;
    heat_resistance?: boolean;
    machinability_min?: number;
  };
  material_family?: string;
  budget?: "low" | "medium" | "high";
}

export interface MaterialRecommendation {
  material_id: string;
  name: string;
  family: string;
  grade: string;
  match_score: number;
  properties: Record<string, number | string>;
  pros: string[];
  cons: string[];
  typical_applications: string[];
}

export interface MaterialSelectResult {
  recommendations: MaterialRecommendation[];
  comparison_properties: string[];
}

// ---------------------------------------------------------------------------
// POST /learning/select/tool — Tool selection wizard
// ---------------------------------------------------------------------------

export interface ToolSelectRequest {
  operation: string;
  material?: string;
  material_hardness?: number;
  depth_of_cut?: number;
  surface_finish_required?: number;
  machine_spindle_max_rpm?: number;
}

export interface ToolRecommendation {
  tool_id: string;
  name: string;
  type: string;
  diameter_mm: number;
  flute_count: number;
  helix_angle_deg: number;
  coating: string;
  match_score: number;
  recommended_params: {
    rpm: number;
    feed_per_tooth: number;
    depth_of_cut: number;
    width_of_cut: number;
  };
  pros: string[];
  cons: string[];
}

export interface ToolSelectResult {
  recommendations: ToolRecommendation[];
  operation: string;
  material?: string;
}

// ---------------------------------------------------------------------------
// POST /learning/select/machine — Machine selection wizard
// ---------------------------------------------------------------------------

export interface MachineSelectRequest {
  part_size?: { x: number; y: number; z: number };
  operations?: string[];
  material?: string;
  accuracy_required_mm?: number;
  production_volume?: "prototype" | "low" | "medium" | "high";
  budget_range?: string;
}

export interface MachineRecommendation {
  machine_id: string;
  name: string;
  manufacturer: string;
  type: string;
  axes: number;
  table_size: { x: number; y: number };
  spindle_max_rpm: number;
  power_kw: number;
  accuracy_mm: number;
  match_score: number;
  pros: string[];
  cons: string[];
}

export interface MachineSelectResult {
  recommendations: MachineRecommendation[];
  requirements_met: boolean;
}

// ---------------------------------------------------------------------------
// POST /learning/twin — Digital twin operations
// ---------------------------------------------------------------------------

export interface TwinRequest {
  machine_id?: string;
  action?: "status" | "simulate" | "history";
  parameters?: Record<string, number | string>;
  time_range?: { start: string; end: string };
}

export interface TwinStatus {
  machine_id: string;
  machine_name: string;
  state: "idle" | "running" | "alarm" | "maintenance";
  spindle_rpm: number;
  feed_rate: number;
  position: { x: number; y: number; z: number };
  tool_number: number;
  program_name?: string;
  uptime_hours: number;
  alerts: TwinAlert[];
}

export interface TwinAlert {
  id: string;
  severity: "info" | "warning" | "critical";
  message: string;
  parameter: string;
  value: number;
  threshold: number;
  timestamp: string;
}

export interface TwinHistoryPoint {
  timestamp: string;
  spindle_rpm: number;
  feed_rate: number;
  spindle_load_pct: number;
  temperature_c: number;
}

export interface TwinResult {
  status?: TwinStatus;
  history?: TwinHistoryPoint[];
  simulation?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// API response wrapper (matches backend { ok, data } shape)
// ---------------------------------------------------------------------------

export interface LearningApiResponse<T> {
  ok: boolean;
  data: T;
  error?: string;
}
