/**
 * L8-P1-MS2: Learning Platform Types
 * TypeScript interfaces for Learning API responses and shared state.
 */

// === Assessment ===

export type LearningDomain = 'CAD' | 'CAM' | 'ShopPractice' | 'MachineOperation';

export interface SkillLevel {
  domain: LearningDomain;
  score: number; // 0-100
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  strengths: string[];
  weaknesses: string[];
}

export interface AssessmentResult {
  overall_score: number;
  skills: SkillLevel[];
  recommended_path: string;
  assessment_date: string;
}

// === Learning Path ===

export interface LearningModule {
  id: string;
  title: string;
  domain: LearningDomain;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  duration_min: number;
  prerequisites: string[];
  description: string;
  status: 'locked' | 'available' | 'in_progress' | 'completed';
  completion_pct: number;
}

export interface LearningPlan {
  path_id: string;
  title: string;
  modules: LearningModule[];
  estimated_hours: number;
  current_module_id: string | null;
}

// === Progress ===

export interface ProgressEntry {
  date: string;
  domain: LearningDomain;
  minutes_spent: number;
  modules_completed: number;
}

export interface ProgressSummary {
  total_hours: number;
  modules_completed: number;
  modules_total: number;
  current_streak_days: number;
  domain_progress: Record<LearningDomain, number>; // 0-100
  daily_history: ProgressEntry[];
  badges: Badge[];
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  earned_at: string | null;
  icon: string;
}

// === Knowledge Search ===

export interface KnowledgeResult {
  id: string;
  title: string;
  excerpt: string;
  domain: LearningDomain;
  source: 'textbook' | 'tribal' | 'standard' | 'manual';
  relevance_score: number;
  content: string;
  tags: string[];
}

// === Selection Wizards ===

export interface MaterialRecommendation {
  id: string;
  name: string;
  iso_group: string;
  match_score: number;
  properties: Record<string, number | string>;
  pros: string[];
  cons: string[];
}

export interface ToolRecommendation {
  id: string;
  name: string;
  type: string;
  manufacturer: string;
  match_score: number;
  specs: {
    diameter_mm: number;
    flutes: number;
    helix_angle_deg: number;
    coating: string;
    max_doc_mm: number;
    max_woc_mm: number;
  };
  recommended_params: {
    speed_rpm: number;
    feed_mmrev: number;
    doc_mm: number;
  };
}

export interface MachineRecommendation {
  id: string;
  name: string;
  type: string;
  manufacturer: string;
  match_score: number;
  specs: {
    axes: number;
    table_mm: { x: number; y: number };
    spindle_rpm_max: number;
    power_kw: number;
    accuracy_mm: number;
    weight_kg: number;
  };
  capabilities: string[];
}

// === Digital Twin ===

export interface TwinStatus {
  machine_id: string;
  machine_name: string;
  status: 'idle' | 'running' | 'alarm' | 'maintenance';
  spindle_rpm: number;
  feed_rate_mmmin: number;
  position: { x: number; y: number; z: number };
  temperature_c: number;
  vibration_mms: number;
  tool_wear_pct: number;
  current_program: string | null;
  uptime_hours: number;
  alerts: TwinAlert[];
}

export interface TwinAlert {
  level: 'info' | 'warning' | 'critical';
  message: string;
  timestamp: string;
  parameter: string;
  value: number;
  threshold: number;
}

export interface TwinHistory {
  timestamps: string[];
  spindle_rpm: number[];
  feed_rate: number[];
  temperature: number[];
  vibration: number[];
  tool_wear: number[];
}
