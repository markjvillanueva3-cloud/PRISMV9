/**
 * PRISM Dashboard API Types
 * Maps to bridge endpoint response format:
 *   { result: {...}, safety: { score, warnings }, meta: { formula_used, uncertainty } }
 */

export interface PrismResponse<T = Record<string, unknown>> {
  result: T;
  safety: {
    score: number;
    warnings: string[];
  };
  meta: {
    formula_used: string;
    uncertainty: number;
    correlation_id?: string;
  };
}

export interface SpeedFeedResult {
  speed_rpm: number;
  feed_mmrev: number;
  doc_mm: number;
  material: string;
  tool: string;
  Vc_mmin: number;
  Fc_N: number;
  Pc_kW: number;
  tool_life_min: number;
  safety_score: number;
}

export interface MaterialResult {
  id: string;
  name: string;
  iso_group: string;
  hardness_hrc?: number;
  tensile_mpa?: number;
  density_kgm3?: number;
  machinability_index?: number;
}

export interface ToolResult {
  id: string;
  name: string;
  category: string;
  manufacturer: string;
  diameter_mm?: number;
  coating?: string;
  flutes?: number;
}

export interface AlarmDecodeResult {
  code: string;
  controller: string;
  description: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  causes: string[];
  remediation: string[];
}

export interface JobPlanResult {
  operations: {
    sequence: number;
    type: string;
    tool: string;
    speed_rpm: number;
    feed_mmrev: number;
    doc_mm: number;
    time_min: number;
  }[];
  total_time_min: number;
  safety_score: number;
  gcode_preview?: string;
}

/** Status indicator levels (color-blind accessible: use shape + color) */
export type SafetyLevel = 'pass' | 'warn' | 'fail' | 'info';

export function safetyLevel(score: number): SafetyLevel {
  if (score >= 0.85) return 'pass';
  if (score >= 0.70) return 'warn';
  return 'fail';
}

/** Shape indicators for color-blind accessibility */
export const SAFETY_SHAPES: Record<SafetyLevel, string> = {
  pass: '\u25CF',  // filled circle
  warn: '\u25B2',  // triangle
  fail: '\u25A0',  // filled square
  info: '\u25C6',  // diamond
};
