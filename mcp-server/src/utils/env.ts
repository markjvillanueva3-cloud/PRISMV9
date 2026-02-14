/**
 * PRISM MCP Server - Environment Variable Parsing
 * Centralized env parsing to prevent inconsistent boolean/int handling.
 * 
 * @module utils/env
 */

/**
 * Parse a boolean environment variable.
 * Recognizes: 'true', '1', 'yes' (case-insensitive) as true.
 * Everything else (including undefined) returns the fallback.
 */
export function envBool(key: string, fallback: boolean = false): boolean {
  const val = process.env[key]?.toLowerCase().trim();
  if (val === undefined) return fallback;
  return ['true', '1', 'yes'].includes(val);
}

/**
 * Parse a string environment variable with fallback.
 * Returns trimmed value or fallback if undefined/empty.
 */
export function envString(key: string, fallback: string): string {
  return process.env[key]?.trim() || fallback;
}

/**
 * Parse an integer environment variable with fallback.
 * Returns parsed integer or fallback if undefined/NaN.
 */
export function envInt(key: string, fallback: number): number {
  const val = parseInt(process.env[key] ?? '', 10);
  return Number.isNaN(val) ? fallback : val;
}
