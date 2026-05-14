/**
 * LEARN-MS5: Knowledge Pipeline API Client
 *
 * Typed API functions for content ingestion, knowledge browsing,
 * auto-generated courses, and fleet learning endpoints.
 */
import { fetchJson } from './requestCore';

const API_BASE = '/api/v1/knowledge';

async function post<T>(path: string, body: Record<string, unknown> = {}): Promise<T> {
  const json = await fetchJson<T | { data?: T }>(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    fallbackMessage: 'Knowledge API request failed',
  });
  return (typeof json === 'object' && json !== null && 'data' in json ? json.data : json) as T;
}

// === Content Ingestion ===

export interface IngestionResult {
  id: string;
  content_type: string;
  items_created: number;
  tags: { materials: string[]; operations: string[]; machines: string[]; tools: string[] };
  confidence: number;
  message: string;
}

export async function ingestText(params: {
  content: string;
  source?: string;
  metadata?: Record<string, unknown>;
}): Promise<IngestionResult> {
  return post<IngestionResult>('/ingest', { content_type: 'text', ...params });
}

export async function ingestUrl(params: {
  url: string;
  source?: string;
}): Promise<IngestionResult> {
  return post<IngestionResult>('/ingest', { content_type: 'url', ...params });
}

export async function ingestDocument(params: {
  file_name: string;
  content_base64: string;
  source?: string;
}): Promise<IngestionResult> {
  return post<IngestionResult>('/ingest', { content_type: 'document', ...params });
}

export async function autoTag(params: {
  text: string;
}): Promise<{
  materials: Array<{ name: string; iso_group: string; confidence: number }>;
  operations: Array<{ name: string; confidence: number }>;
  machines: Array<{ name: string; confidence: number }>;
  tools: Array<{ name: string; confidence: number }>;
}> {
  return post('/auto-tag', params);
}

// === Knowledge Search & Browse ===

export interface KnowledgeEntry {
  id: string;
  content: string;
  source: string;
  content_type: string;
  tags: { materials: string[]; operations: string[]; machines: string[] };
  confidence: number;
  created_at: string;
  related_count: number;
}

export interface KnowledgeStats {
  total_items: number;
  by_source: Record<string, number>;
  by_material: Record<string, number>;
  by_operation: Record<string, number>;
  coverage_gaps: string[];
}

export async function searchKnowledge(params: {
  query: string;
  material?: string;
  operation?: string;
  machine?: string;
  source?: string;
  confidence_min?: number;
  limit?: number;
}): Promise<{ results: KnowledgeEntry[]; total: number; facets: Record<string, Record<string, number>> }> {
  return post('/search', params);
}

export async function getKnowledgeStats(): Promise<KnowledgeStats> {
  return post('/stats');
}

// === Auto-Generated Courses ===

export interface GeneratedCourse {
  courseId: string;
  title: string;
  level: string;
  modules: Array<{
    title: string;
    tips: Array<{ text: string; source: string }>;
    estimatedMinutes: number;
  }>;
  tipCount: number;
  estimatedMinutes: number;
}

export interface QuizQuestion {
  text: string;
  choices: string[];
  correct: number;
  explanation: string;
  difficulty: string;
}

export interface CoursePricingTier {
  name: string;
  price: string;
  features: string[];
  courseAccess: string;
}

export async function getCourseCatalog(): Promise<{
  courses: Array<{ id: string; title: string; level: string; modules: number; tips: number }>;
}> {
  return post('/courses/catalog');
}

export async function buildCourse(params: {
  cam_system?: string;
  level?: string;
  material_iso_group?: string;
  operation_type?: string;
}): Promise<GeneratedCourse> {
  return post('/courses/build', params);
}

export async function getCourseQuiz(params: {
  count?: number;
  difficulty?: string;
  topic?: string;
}): Promise<{ questions: QuizQuestion[] }> {
  return post('/courses/quiz', params);
}

export async function getCoursePricing(): Promise<{ tiers: CoursePricingTier[] }> {
  return post('/courses/pricing');
}

export async function exportCourse(params: {
  cam_system?: string;
  level?: string;
  format: 'json' | 'markdown' | 'scorm';
}): Promise<{ format: string; content: string; courseId: string; metadata: { title: string } }> {
  return post('/courses/export', params);
}

// === Fleet Learning ===

export interface FleetMachine {
  serial: string;
  name: string;
  model: string;
  measurements: number;
  calibration_status: 'calibrated' | 'needs_recalibration' | 'uncalibrated';
  last_calibration?: string;
  drift_percent?: number;
  kc1_1_current?: number;
  kc1_1_canonical?: number;
}

export interface FleetStatus {
  machines: FleetMachine[];
  summary: { total: number; calibrated: number; drifting: number; uncalibrated: number };
  programs_registered: number;
  standards_active: number;
}

export interface TransferSuggestion {
  source: string;
  target: string;
  similarity: number;
  confidence: string;
  transferable_params: string[];
  risk_factors: string[];
}

export async function getFleetStatus(): Promise<FleetStatus> {
  return post('/fleet/status');
}

export async function getFleetSummary(): Promise<{
  fleet: { total_machines: number; calibrated: number; drifting: number };
  programs: { total: number; active: number };
  quality: { mean_accuracy: number; worst_machine: string };
  top_issues: string[];
  recommendations: string[];
}> {
  return post('/fleet/summary');
}

export async function getMachineSimilarity(params: {
  source: { name: string; power_kw: number; max_rpm: number; rigidity_n_per_um: number; accuracy_mm: number; axes: number };
  target: { name: string; power_kw: number; max_rpm: number; rigidity_n_per_um: number; accuracy_mm: number; axes: number };
}): Promise<TransferSuggestion> {
  return post('/fleet/similarity', params);
}

export async function recordMeasurement(params: {
  machine_id: string;
  measurement_type: string;
  measured: number;
  predicted: number;
  unit: string;
  material?: string;
  operation?: string;
}): Promise<{ id: string; residual: number; message: string }> {
  return post('/fleet/record', params);
}

export async function ingestFleetFeedback(params: {
  machine_serial: string;
  program_id?: string;
  feedback_type: string;
  predicted_value?: number;
  actual_value?: number;
  operator_notes?: string;
}): Promise<{ accepted: boolean; message: string }> {
  return post('/fleet/feedback', params);
}
