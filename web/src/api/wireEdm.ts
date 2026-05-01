/**
 * Wire EDM Calculator API — calls edmDispatcher (prism_edm) via /api/v1/edm/*
 *
 * Routes:
 *   /calculator-solve  — 6-engine orchestration (settings→multipass→cutting→corners→surface→cost)
 *   /wire              — legacy quick wire settings
 *   /multipass          — full multi-pass strategy
 *   /cost               — cost estimation
 *   /machines           — wire EDM machine catalog
 *   /wire-catalog       — wire electrode catalog
 *
 * AUTH: All EDM routes require Bearer token via verifyToken middleware.
 *       Uses getRequestHeaders() from client.ts — NOT the bare speedfeed.ts pattern.
 */
import { getRequestHeaders } from './client';
import { fetchJson } from './requestCore';
import type { PrismResponse, DataResponse } from './types';

// ── Constants ────────────────────────────────────────────────────────────

const EDM_API_BASE = '/api/v1/edm';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes for static catalog data
const DEBOUNCE_MS = 500;

// ── Cache (follows speedfeed.ts toolRoiRequestCache pattern) ─────────────

type CacheEntry<T> = { expiresAt: number; promise: Promise<T> };

const catalogCache = new Map<string, CacheEntry<unknown>>();

function getCached<T>(key: string): Promise<T> | null {
  const entry = catalogCache.get(key);
  if (!entry || entry.expiresAt < Date.now()) {
    catalogCache.delete(key);
    return null;
  }
  return entry.promise as Promise<T>;
}

function setCached<T>(key: string, promise: Promise<T>): Promise<T> {
  catalogCache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, promise });
  return promise;
}

function shouldCache(): boolean {
  const isVitest = typeof globalThis !== 'undefined' && '__vitest_worker__' in globalThis;
  const isVitestProcess = typeof process !== 'undefined' && Boolean(process.env?.VITEST);
  return !(isVitest || isVitestProcess);
}

// ── Debounce ─────────────────────────────────────────────────────────────

let solveTimer: ReturnType<typeof setTimeout> | null = null;
let solvePending: { resolve: (v: PrismResponse<WireEdmCalcResult>) => void; reject: (e: unknown) => void } | null = null;

// ── Request helpers ──────────────────────────────────────────────────────

async function wePost<T>(path: string, body: unknown): Promise<PrismResponse<T>> {
  return fetchJson<PrismResponse<T>>(`${EDM_API_BASE}${path}`, {
    method: 'POST',
    headers: getRequestHeaders(),
    body: JSON.stringify(body),
    fallbackMessage: 'Wire EDM request failed',
  });
}

async function weGet<T>(path: string): Promise<DataResponse<T>> {
  return fetchJson<DataResponse<T>>(`${EDM_API_BASE}${path}`, {
    method: 'GET',
    headers: getRequestHeaders(),
    fallbackMessage: 'Wire EDM catalog request failed',
  });
}

// ── Interfaces ───────────────────────────────────────────────────────────

export type WireType = 'brass' | 'zinc_coated' | 'molybdenum' | 'tungsten';
export type CutType = 'profile' | 'skim_only';
export type OptimizationGoal = 'tool_life' | 'productivity' | 'surface_finish' | 'balanced' | 'cost';
export type WedmController = 'fanuc' | 'sodick' | 'makino' | 'mitsubishi' | 'agiecharmilles' | 'generic';

export interface WireEdmCalcParams {
  material: string;
  thickness_mm: number;
  profile_length_mm: number;
  target_Ra_um?: number;
  tolerance_mm?: number;
  wire_type?: WireType;
  wire_diameter_mm?: number;
  cut_type?: CutType;
  taper_deg?: number;
  machine_controller?: WedmController;
  machine_id?: string;
  optimization_goal?: OptimizationGoal;
  workpiece_material_category?: string;
  workpiece_hardness_HRC?: number;
  is_submerged?: boolean;
  workholding_type?: string;
}

export interface WireEdmPassDetail {
  type: string;
  offset_mm: number;
  energy_pct: number;
  speed_mm_min: number;
  time_min: number;
  wire_m: number;
  predicted_Ra_um: number;
  predicted_recast_um: number;
  t_on_us: number;
  t_off_us: number;
  peak_current_A: number;
  servo_voltage_V: number;
  wire_speed_m_min: number;
  power_pct: number;
}

export interface WireEdmCostBreakdown {
  machine_usd: number;
  wire_usd: number;
  consumables_usd: number;
  post_process_usd: number;
  total_usd: number;
  breakdown: Array<{ category: string; amount: number; pct_of_total: number }>;
  qty_breaks?: Array<{ quantity: number; unit_cost: number }>;
}

export interface WireEdmWireBreakRisk {
  probability: number;
  severity: 'low' | 'medium' | 'high';
  factors: string[];
  mitigations: string[];
  confidence_interval?: [number, number];
}

export interface WireEdmSurfaceIntegrity {
  recast_um: number;
  haz_um: number;
  residual_stress_MPa: number;
  fatigue_reduction_pct: number;
  spec_compliance: Array<{
    standard: string;
    pass: boolean;
    violations: string[];
  }>;
}

export interface WireEdmCornerCompensation {
  overtravel_mm: number;
  dwell_s: number;
  angle_deg?: number;
}

export interface WireEdmTaperResult {
  uv_offset_mm: number;
  error_um: number;
  max_capable_deg: number;
}

export interface WireEdmCalcResult {
  first_cut_speed_mm_min: number;
  skim_speeds: number[];
  wire_tension_N: number;
  flushing_pressure_bar: number;
  power_pct: number;
  passes: WireEdmPassDetail[];
  total_time_min: number;
  total_wire_m: number;
  estimated_cost: WireEdmCostBreakdown;
  wire_break_risk: WireEdmWireBreakRisk;
  corner_compensation: WireEdmCornerCompensation[];
  surface_integrity: WireEdmSurfaceIntegrity;
  taper?: WireEdmTaperResult;
  recommendations: string[];
  safety_score: number;
}

export interface WireEdmMachine {
  id: string;
  manufacturer: string;
  model: string;
  travel_x_mm: number;
  travel_y_mm: number;
  travel_z_mm: number;
  travel_u_mm?: number;
  travel_v_mm?: number;
  max_taper_deg: number;
  auto_thread: boolean;
  controller: WedmController;
  wire_dia_range: string;
  submerge_depth_mm?: number;
  max_thickness_mm: number;
}

export interface WireElectrode {
  id: string;
  material: WireType;
  diameter_mm: number;
  tensile_MPa: number;
  conductivity_pct_IACS: number;
  best_for: string;
  cost_per_m: number;
  max_speed_m_min: number;
}

// ── API Functions ────────────────────────────────────────────────────────

/**
 * Full calculator solve — 6-engine orchestration.
 * Returns debounced to prevent rapid-fire on repeated clicks.
 */
export function weCalculatorSolve(params: WireEdmCalcParams): Promise<PrismResponse<WireEdmCalcResult>> {
  return new Promise((resolve, reject) => {
    if (solveTimer) clearTimeout(solveTimer);
    if (solvePending) solvePending.reject(new Error('Superseded by newer solve request'));
    solvePending = { resolve, reject };

    solveTimer = setTimeout(async () => {
      const current = solvePending;
      solvePending = null;
      solveTimer = null;
      try {
        const result = await wePost<WireEdmCalcResult>('/calculator-solve', params);
        current?.resolve(result);
      } catch (err) {
        current?.reject(err);
      }
    }, DEBOUNCE_MS);
  });
}

/** Quick wire settings — legacy fast path, fallback if orchestrator fails. */
export function weQuickSettings(params: WireEdmCalcParams): Promise<PrismResponse<WireEdmCalcResult>> {
  return wePost<WireEdmCalcResult>('/wire', params);
}

/** Full multi-pass strategy (standalone, not through orchestrator). */
export function weMultipass(params: Record<string, unknown>): Promise<PrismResponse<unknown>> {
  return wePost('/multipass', params);
}

/** Cost estimation (standalone). */
export function weCostEstimate(params: Record<string, unknown>): Promise<PrismResponse<unknown>> {
  return wePost('/cost', params);
}

/** Wire EDM machine catalog — cached 5 minutes. */
export function weGetMachines(): Promise<DataResponse<WireEdmMachine[]>> {
  if (shouldCache()) {
    const cached = getCached<DataResponse<WireEdmMachine[]>>('machines');
    if (cached) return cached;
    return setCached('machines', weGet<WireEdmMachine[]>('/machines'));
  }
  return weGet<WireEdmMachine[]>('/machines');
}

/** Wire electrode catalog — cached 5 minutes. */
export function weGetWireCatalog(): Promise<DataResponse<WireElectrode[]>> {
  if (shouldCache()) {
    const cached = getCached<DataResponse<WireElectrode[]>>('wire-catalog');
    if (cached) return cached;
    return setCached('wire-catalog', weGet<WireElectrode[]>('/wire-catalog'));
  }
  return weGet<WireElectrode[]>('/wire-catalog');
}

/** Invalidate all cached catalog data (call on tab switch or force refresh). */
export function weInvalidateCache(): void {
  catalogCache.clear();
}

// ── Photo-to-Program Pipeline ───────────────────────────────────────

export interface WedmProgramParams {
  dxf_content?: string;
  contours?: unknown[];
  image_base64?: string;
  material: string;
  thickness_mm: number;
  target_ra_um?: number;
  target_accuracy_mm?: number;
  controller?: WedmController;
  wire_type?: string;
  program_number?: number;
  part_name?: string;
  part_number?: string;
  expected_units?: 'mm' | 'inch';
}

export interface WedmProgramResult {
  success: boolean;
  program_text: string;
  line_count: number;
  controller: string;
  profiles_cut: number;
  passes_per_profile: number;
  estimated_time_min: number;
  predicted_ra_um: number;
  predicted_accuracy_mm: number;
  pass_details: Array<{
    pass_number: number;
    type: string;
    offset_mm: number;
    feed_mm_min: number;
    e_pack_code: string;
    wire_speed_m_min: number;
    tension_N: number;
    predicted_ra_um: number;
  }>;
  wire_consumption_m: number;
  setup_sheet: {
    part_name: string;
    part_number: string;
    material: string;
    thickness_mm: number;
    wire_type: string;
    wire_diameter_mm: number;
    controller: string;
    program_number: number;
    num_profiles: number;
    num_passes: number;
    total_time_min: number;
    wire_needed_m: number;
    flush_pressure_bar: number;
    submerged: boolean;
    notes: string[];
  };
  warnings: string[];
  stages_completed: string[];
}

export interface WedmPhotoToProgramResponse {
  ok: boolean;
  data: WedmProgramResult;
  ocr?: {
    dimensions_found: number;
    material_detected: string;
    thickness_detected: number;
    profiles_detected: number;
    tokens_used: number;
  } | null;
}

export interface WedmOcrResult {
  dimensions: Array<{ type: string; nominal: number; unit: string; raw_text: string }>;
  title_block: { material?: string; part_number?: string; title?: string };
  profiles: Array<{ name: string; type: string; points: Array<{ x: number; y: number }> }>;
  thickness_mm?: number;
  tokens_used: number;
  summary: {
    total_dimensions: number;
    material: string;
    tightest_tolerance_mm: number;
  };
}

/** Map frontend wire type names to backend WireType enum values */
const WIRE_TYPE_MAP: Record<string, string> = {
  brass: 'brass_0.25',
  zinc_coated: 'coated_0.25',
  molybdenum: 'moly_0.10',
  tungsten: 'tungsten_0.05',
};

/**
 * Photo-to-program — end-to-end pipeline.
 * Accepts DXF content, pre-parsed contours, or image_base64.
 * Returns complete NC program + setup sheet.
 */
export async function wePhotoToProgram(params: WedmProgramParams): Promise<WedmPhotoToProgramResponse> {
  // FIX C8: map frontend wire type to backend enum
  const mapped = { ...params };
  if (mapped.wire_type && WIRE_TYPE_MAP[mapped.wire_type]) {
    mapped.wire_type = WIRE_TYPE_MAP[mapped.wire_type];
  }
  // FIX H1: properly parse the response shape (route returns { ok, data, ocr })
  const raw = await fetchJson<WedmPhotoToProgramResponse>(`${EDM_API_BASE}/photo-to-program`, {
    method: 'POST',
    headers: getRequestHeaders(),
    body: JSON.stringify(mapped),
    fallbackMessage: 'Photo-to-program request failed',
  });
  return raw;
}

/**
 * Blueprint OCR — extract dimensions, material, geometry from image.
 */
export function weOcrBlueprint(params: {
  image: { type: 'base64'; data: string; media_type?: string };
  blueprint_type?: string;
  extract_geometry?: boolean;
  expected_units?: string;
}): Promise<PrismResponse<WedmOcrResult>> {
  return wePost<WedmOcrResult>('/ocr', params);
}

/**
 * G-code export — download NC file from program text.
 */
export function weExportGcode(programText: string, filename?: string): void {
  const blob = new Blob([programText], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `PRISM_WEDM_${new Date().toISOString().split('T')[0]}.NC`;
  a.click();
  URL.revokeObjectURL(url);
}
