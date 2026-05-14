/**
 * L8-P1-MS2 P0-U01: Learning API Client
 *
 * Typed API functions for all 10 learning endpoints.
 * Uses the shared request client from api/client.ts pattern.
 */
import { fetchJson } from './requestCore';

const API_BASE = '/api/v1/learning';

async function post<T>(path: string, body: Record<string, unknown> = {}): Promise<T> {
  const json = await fetchJson<T | { data?: T }>(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    fallbackMessage: 'Learning API request failed',
  });
  return (typeof json === 'object' && json !== null && 'data' in json ? json.data : json) as T;
}

// === Learning Paths ===

import type {
  AssessmentResult,
  LearningPlan,
  ProgressSummary,
  LearningModule,
  KnowledgeResult,
  MaterialRecommendation,
  ToolRecommendation,
  MachineRecommendation,
  TwinStatus,
} from '../types/learning';

/** POST /learning/assess — Assess operator skill levels */
export async function assess(params: {
  operator_id?: string;
  domains?: string[];
  answers?: Record<string, unknown>;
}): Promise<AssessmentResult> {
  return post<AssessmentResult>('/assess', params);
}

/** POST /learning/plan — Generate personalized learning plan */
export async function plan(params: {
  operator_id?: string;
  target_level?: string;
  focus_domains?: string[];
  available_hours_per_week?: number;
}): Promise<LearningPlan> {
  return post<LearningPlan>('/plan', params);
}

/** POST /learning/progress — Track learning progress */
export async function progress(params: {
  operator_id?: string;
  module_id?: string;
  action?: 'get' | 'update';
  completion_pct?: number;
}): Promise<ProgressSummary> {
  return post<ProgressSummary>('/progress', params);
}

/** POST /learning/recommend — Recommend next learning modules */
export async function recommend(params: {
  operator_id?: string;
  count?: number;
}): Promise<LearningModule[]> {
  return post<LearningModule[]>('/recommend', params);
}

// === Knowledge ===

/** POST /learning/knowledge/search — Search manufacturing knowledge base */
export async function searchKnowledge(params: {
  query: string;
  domain?: string;
  source?: string;
  limit?: number;
}): Promise<KnowledgeResult[]> {
  return post<KnowledgeResult[]>('/knowledge/search', params);
}

/** POST /learning/tribal — Search tribal/shop floor knowledge */
export async function searchTribal(params: {
  query: string;
  category?: string;
  limit?: number;
}): Promise<KnowledgeResult[]> {
  return post<KnowledgeResult[]>('/tribal', params);
}

// === Selection Guides ===

/** POST /learning/select/material — Material selection wizard */
export async function selectMaterial(params: {
  requirements: {
    application?: string;
    hardness_range?: [number, number];
    tensile_min_mpa?: number;
    corrosion_resistant?: boolean;
    weldable?: boolean;
    machinable?: boolean;
  };
  count?: number;
}): Promise<MaterialRecommendation[]> {
  return post<MaterialRecommendation[]>('/select/material', params);
}

/** POST /learning/select/tool — Tool selection wizard */
export async function selectTool(params: {
  operation: string;
  material: string;
  requirements?: {
    diameter_mm?: number;
    max_doc_mm?: number;
    finish_required?: boolean;
  };
  count?: number;
}): Promise<ToolRecommendation[]> {
  return post<ToolRecommendation[]>('/select/tool', params);
}

/** POST /learning/select/machine — Machine selection wizard */
export async function selectMachine(params: {
  part_requirements: {
    max_dimension_mm?: { x: number; y: number; z: number };
    material?: string;
    tolerance_mm?: number;
    operations?: string[];
    axes_required?: number;
  };
  count?: number;
}): Promise<MachineRecommendation[]> {
  return post<MachineRecommendation[]>('/select/machine', params);
}

// === Digital Twin ===

/** POST /learning/twin — Digital twin operations */
export async function twin(params: {
  machine_id?: string;
  action?: 'status' | 'history' | 'list';
  time_range?: { start: string; end: string };
}): Promise<TwinStatus> {
  return post<TwinStatus>('/twin', params);
}
