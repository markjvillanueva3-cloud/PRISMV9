import { getRequestHeaders } from './client';
import { fetchJson } from './requestCore';
import type { PrismResponse } from './types';

const LATHE_API_BASE = '/api/v1/lathe';
const TURNING_API_BASE = '/api/v1/turning';

export type LatheUploadRoute = 'photo' | 'cad' | 'pdf' | 'unknown';
export type TurningIsoGroup = 'P' | 'M' | 'K' | 'N' | 'S' | 'H';
export type TurningOptimizationTarget =
  | 'balanced'
  | 'max_speed'
  | 'max_tool_life'
  | 'min_cost'
  | 'surface_quality';

export interface TurningProgramMaterial {
  material_name: string;
  iso_group: TurningIsoGroup;
  hardness_hrc?: number;
}

export interface TurningProgramFeaturePoint {
  X: number;
  Z: number;
  type?: 'rapid' | 'linear' | 'arc_cw' | 'arc_ccw';
  R?: number;
  I?: number;
  K?: number;
  feed?: number;
}

export interface TurningProgramFeature {
  id: string;
  type: string;
  od_mm?: number;
  id_mm?: number;
  length_mm: number;
  depth_mm?: number;
  width_mm?: number;
  taper_angle_deg?: number;
  thread_pitch_mm?: number;
  thread_class?: string;
  thread_starts?: number;
  tolerance_mm?: number;
  surface_finish_Ra_um?: number;
  groove_width_mm?: number;
  groove_depth_mm?: number;
  diameter_mm?: number;
  position_z_mm?: number;
  required_operations?: string[];
  priority?: number;
  profile_points?: TurningProgramFeaturePoint[];
}

export interface TurningProgramInput {
  part_number?: string;
  material: TurningProgramMaterial;
  bar_stock_od_mm: number;
  finished_od_mm?: number;
  part_length_mm: number;
  chuck_type?: '3_jaw' | 'collet' | '4_jaw' | 'face_plate';
  max_spindle_rpm?: number;
  max_power_kW?: number;
  machine_brand?: string;
  machine_model?: string;
  features: TurningProgramFeature[];
  optimization_target?: TurningOptimizationTarget;
  tailstock?: boolean;
  sub_spindle?: boolean;
  controller?: 'fanuc' | 'haas' | 'mazak' | 'okuma' | 'siemens';
  dual_spindle_cutoff?: boolean;
  dual_spindle_sync_rpm?: number;
}

export interface TurningProgramWarning {
  stage: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
}

export interface TurningProgramOperation {
  op_number?: number;
  feature_id?: string;
  operation_type?: string;
  tool?: {
    tool_number?: number;
    insert_type?: string;
    nose_radius_mm?: number;
    holder_style?: string;
  };
  cycle_time_sec?: number;
  passes?: number;
  notes?: string[];
}

export interface TurningProgramResult {
  success: boolean;
  part_number: string;
  material: string;
  bar_stock_od_mm: number;
  part_length_mm: number;
  operations: TurningProgramOperation[];
  total_operations: number;
  total_tool_changes: number;
  estimated_cycle_time_sec: number;
  program_text: string;
  program_line_count: number;
  setup_notes: string[];
  confidence_score: number;
  warnings: TurningProgramWarning[];
}

export interface TurningIntakeAmbiguity {
  type: string;
  message: string;
  can_proceed_with_default: boolean;
  default_value?: string;
  affected_feature_ids: string[];
}

export interface TurningIntakeWarning {
  stage: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
}

export interface TurningIntakeResult {
  success: boolean;
  turning_input: TurningProgramInput;
  features: TurningProgramFeature[];
  material: TurningProgramMaterial;
  unmapped_dimensions?: Array<{
    raw_text?: string;
    nominal?: number;
    type?: string;
  }>;
  ambiguities: TurningIntakeAmbiguity[];
  warnings: TurningIntakeWarning[];
  stats?: {
    total_dimensions: number;
    mapped_features: number;
    unmapped_dimensions: number;
    gdt_applied: number;
    default_tolerances_applied: number;
    profiles_converted: number;
    confidence_avg: number;
  };
}

export interface TurningCadEnvelope {
  max_od_mm: number;
  min_id_mm: number | null;
  total_length_mm: number;
}

export interface TurningCadImportResult {
  success: boolean;
  features: TurningProgramFeature[];
  warnings: string[];
  envelope: TurningCadEnvelope;
  axis_confidence?: number;
  non_axi_features?: Array<{
    type: string;
    description: string;
    suggested_op?: string;
  }>;
}

export interface LatheUploadResponse {
  ok: boolean;
  detectedRoute: LatheUploadRoute;
  extractedData: TurningIntakeResult | TurningCadImportResult | Record<string, unknown>;
}

export function inferLatheUploadRoute(fileName: string): LatheUploadRoute {
  const extension = fileName.split('.').pop()?.toLowerCase() ?? '';
  if (extension === 'pdf') return 'pdf';
  if (['step', 'stp', 'iges', 'igs', 'dxf', 'sat', 'x_t', 'x_b'].includes(extension)) return 'cad';
  if (['png', 'jpg', 'jpeg', 'bmp', 'tiff', 'tif', 'webp', 'heic'].includes(extension)) return 'photo';
  return 'unknown';
}

export async function latheUploadFile(params: {
  fileName: string;
  fileData: string;
  fileType?: Exclude<LatheUploadRoute, 'unknown'>;
}) {
  return fetchJson<LatheUploadResponse>(`${LATHE_API_BASE}/upload`, {
    method: 'POST',
    headers: getRequestHeaders(),
    body: JSON.stringify(params),
    fallbackMessage: 'Lathe print or CAD upload failed',
  });
}

export async function turningProgramGenerate(input: TurningProgramInput) {
  return fetchJson<PrismResponse<TurningProgramResult>>(`${TURNING_API_BASE}/program`, {
    method: 'POST',
    headers: getRequestHeaders(),
    body: JSON.stringify(input),
    fallbackMessage: 'Lathe auto-program generation failed',
  });
}

export function normalizeTurningController(controllerId: string | null | undefined): TurningProgramInput['controller'] {
  const value = (controllerId ?? '').toLowerCase();
  if (value.includes('haas')) return 'haas';
  if (value.includes('mazak') || value.includes('smooth')) return 'mazak';
  if (value.includes('okuma') || value.includes('osp')) return 'okuma';
  if (value.includes('siemens') || value.includes('sinumerik')) return 'siemens';
  return 'fanuc';
}

