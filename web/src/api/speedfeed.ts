/**
 * Speed & Feed API — calls SpeedFeedOrchestratorEngine via /api/v1/speed-feed/*
 * Routes: orchestrate (full pipeline), quick (no stochastic), stochastic (full UQ)
 */
import type { PrismResponse } from './types';

const API_BASE = '/api/v1/speed-feed';
const TOOL_ROI_CACHE_TTL_MS = 30_000;
const toolRoiRequestCache = new Map<string, { expiresAt: number; promise: Promise<PrismResponse<ToolRoiAnalysisResult>> }>();

async function sfRequest<T>(path: string, body: unknown): Promise<PrismResponse<T>> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `Speed-feed request failed: ${res.status}`);
  }
  return res.json();
}

function shouldCacheSpeedFeedRequests() {
  const isVitestWorker = typeof globalThis !== 'undefined' && '__vitest_worker__' in globalThis;
  const isVitestProcess = typeof process !== 'undefined' && Boolean(process.env?.VITEST);
  return !(isVitestWorker || isVitestProcess);
}

export interface SpeedFeedMachinePackage {
  [key: string]: unknown;
  id?: string;
  canonical_id?: string;
  manufacturer?: string;
  model?: string;
  name?: string;
  confidence?: {
    [key: string]: number | undefined;
    overall?: number;
    spindle?: number;
    controller?: number;
    envelope?: number;
    axes?: number;
  };
  spindle?: {
    max_rpm?: number;
    power_kw?: number;
    power_continuous_kw?: number;
    power?: number;
    max_torque_nm?: number;
    taper?: string;
  };
  controller?: {
    id?: string;
    label?: string;
    model?: string;
  };
  envelope?: Record<string, string | number | undefined>;
  axes?: {
    count?: number;
    class?: string;
    description?: string;
  };
  provenance?: Record<string, unknown>;
}

export interface SpeedFeedParams {
  material: string;
  operation?: string;
  iso_group?: 'P' | 'M' | 'K' | 'N' | 'S' | 'H';
  hardness_hb?: number;
  hardness_hrc?: number;
  sigma_y_MPa?: number;
  machine_name?: string;
  machine_power_kw?: number;
  machine_max_rpm?: number;
  machine_max_torque_nm?: number;
  machinePackage?: SpeedFeedMachinePackage;
  machine_rigidity?: 'low' | 'medium' | 'high';
  machine_guideway?: 'box' | 'linear' | 'hydrostatic';
  machine_age_years?: number;
  natural_frequency_hz?: number;
  system_stiffness_n_m?: number;
  damping_ratio?: number;
  machine_axis_accel_m_s2?: number;
  machine_axis_jerk_m_s3?: number;
  machine_type?: 'vertical_mill' | 'horizontal_mill' | 'lathe' | '5axis' | 'router' | 'swiss';
  spindle_taper?: 'BT30' | 'BT40' | 'BT50' | 'CAT40' | 'CAT50' | 'HSK-A63' | 'HSK-A100' | 'HSK-E40';
  tool_diameter_mm?: number;
  flutes?: number;
  helix_angle_deg?: number;
  corner_radius_mm?: number;
  flute_length_mm?: number;
  overall_length_mm?: number;
  tool_stickout_mm?: number;
  edge_radius_mm?: number;
  doc_mm?: number;
  woc_mm?: number;
  num_flutes?: number;
  tool_material?: string;
  tool_coating?: string;
  tool_grade?: string;
  insert_grade?: string;
  tool_series?: string;
  holder_type?: 'shrink_fit' | 'hydraulic' | 'ER_collet' | 'Weldon' | 'milling_chuck';
  holder_gauge_length_mm?: number;
  holder_tir_mm?: number;
  holder_balanced_g?: number;
  cut_type?: 'roughing' | 'semi_finishing' | 'finishing';
  strategy?: 'conventional' | 'adaptive' | 'trochoidal' | 'hsm' | 'hpc' | 'plunge' | 'slot';
  cam_strategy?: string;
  axial_depth_mm?: number;
  radial_depth_mm?: number;
  radial_depth_pct?: number;
  workholding_type?: 'vise' | 'fixture' | 'vacuum' | 'magnetic' | 'collet' | 'chuck' | 'tombstone';
  workholding_stiffness?: 'low' | 'medium' | 'high';
  workpiece_length_mm?: number;
  workpiece_width_mm?: number;
  workpiece_height_mm?: number;
  workpiece_diameter_mm?: number;
  overhang_ratio?: number;
  coolant_type?: 'flood' | 'mist' | 'MQL' | 'dry' | 'cryogenic' | 'through_tool';
  optimize_for?: 'tool_life' | 'productivity' | 'surface_finish' | 'balanced' | 'cost';
  output_detail?: 'minimal' | 'standard' | 'full';
  machine?: string;
  toolpath_strategy?: string;
  cam_system?: string;
}

export interface ToolRoiAnalysisParams {
  feature: {
    type: 'hole' | 'pocket' | 'slot' | 'face' | 'contour' | 'thread' | 'bore' | 'drill' | 'chamfer';
    dimensions: {
      diameter_mm?: number;
      width_mm?: number;
      depth_mm?: number;
      length_mm?: number;
    };
    tolerance_mm: number;
    surface_finish_Ra?: number;
  };
  material: {
    iso_group: 'P' | 'M' | 'K' | 'N' | 'S' | 'H';
    name: string;
    kc1_1?: number;
    mc?: number;
  };
  machine: {
    max_rpm: number;
    max_power_kw: number;
    machine_rate_per_hour?: number;
  };
  current_tool?: {
    id: string;
    name: string;
    price: number;
    condition: 'new' | 'good' | 'worn' | 'needs_regrind';
  };
  user_inventory?: Array<{
    id: string;
    name: string;
    type: 'endmill' | 'drill' | 'tap' | 'reamer' | 'insert' | 'boring_bar' | 'face_mill';
    diameter_mm: number;
    flutes?: number;
    material: 'carbide' | 'hss' | 'cermet' | 'ceramic' | 'cbn' | 'pcd';
    coating?: string;
    max_depth_mm?: number;
    corner_radius_mm?: number;
    condition: 'new' | 'good' | 'worn' | 'needs_regrind' | 'retired';
    price: number;
  }>;
  optimization_goal: 'cost' | 'performance' | 'balanced';
}

export interface ToolRoiAtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export interface ToolRoiRecommendation {
  tool: {
    id: string;
    name: string;
    diameter_mm: number;
    material: string;
    coating: string;
    price: number;
  };
  cost_per_part: ToolRoiAtomicValue;
  rationale: string;
}

export interface ToolRoiComparison {
  savings_per_part: ToolRoiAtomicValue;
  roi_parts: ToolRoiAtomicValue;
  payback_description: string;
}

export interface ToolRoiAnalysisResult {
  crib_recommendation: ToolRoiRecommendation | null;
  budget_recommendation: ToolRoiRecommendation;
  standard_recommendation: ToolRoiRecommendation;
  premium_recommendation: ToolRoiRecommendation;
  roi_vs_current: ToolRoiComparison | null;
  total_cost_breakdown: {
    current_total_per_part: ToolRoiAtomicValue | null;
    best_total_per_part: ToolRoiAtomicValue;
    annual_savings: ToolRoiAtomicValue;
  };
  warnings: string[];
}

export interface SpeedFeedScenario {
  label: string;
  input: SpeedFeedParams;
}

/** Full pipeline: resolve → compute → stochastic → compare → optimize */
export async function sfOrchestrate(params: SpeedFeedParams) {
  return sfRequest('/orchestrate', params);
}

/** Quick mode: no stochastic/Monte Carlo — faster response */
export async function sfQuick(params: SpeedFeedParams) {
  return sfRequest('/quick', params);
}

/** Full uncertainty quantification with Monte Carlo */
export async function sfStochastic(params: SpeedFeedParams) {
  return sfRequest('/stochastic', params);
}

/** Resolve machine capability and limiting factors without a full page solve */
export async function sfResolveMachine(params: SpeedFeedParams) {
  return sfRequest('/resolve/machine', params);
}

/** Resolve tool capability and limiting factors without a full page solve */
export async function sfResolveTool(params: SpeedFeedParams) {
  return sfRequest('/resolve/tool', params);
}

/** Resolve material properties from name */
export async function sfResolveMaterial(name: string) {
  return sfRequest('/resolve/material', { material: name });
}

/** Compare multiple candidate setups using the same backend solve contract */
export async function sfCompare(scenarios: SpeedFeedScenario[]) {
  return sfRequest('/compare', { scenarios });
}

/** Run the backend multi-objective optimizer for a calculator setup */
export async function sfOptimize(params: SpeedFeedParams, objectives?: string[]) {
  return sfRequest('/optimize', { ...params, objectives });
}

export async function sfInventoryToolSelect(params: unknown) {
  return sfRequest('/inventory-select', params);
}

export async function sfToolRoiAnalysis(params: ToolRoiAnalysisParams) {
  if (!shouldCacheSpeedFeedRequests()) {
    return sfRequest('/tool-roi', params);
  }

  const now = Date.now();
  const key = JSON.stringify(params);
  const cached = toolRoiRequestCache.get(key);
  if (cached && cached.expiresAt > now) {
    return cached.promise;
  }

  const promise = sfRequest('/tool-roi', params).catch((error) => {
    toolRoiRequestCache.delete(key);
    throw error;
  });
  toolRoiRequestCache.set(key, {
    expiresAt: now + TOOL_ROI_CACHE_TTL_MS,
    promise,
  });
  return promise;
}
