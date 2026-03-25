/**
 * CLI Configuration — reads defaults from ~/.prism/config.json
 *
 * Example config:
 * {
 *   "default_material": "aluminum_6061",
 *   "default_machine": "Haas VF-2",
 *   "default_controller": "haas",
 *   "default_format": "table",
 *   "default_optimize": "balanced"
 * }
 */

import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";

export interface CLIConfig {
  default_material?: string;
  default_machine?: string;
  default_controller?: string;
  default_format?: string;
  default_optimize?: string;
  [key: string]: unknown;
}

const DEFAULT_CONFIG_PATH = join(homedir(), ".prism", "config.json");

export async function loadConfig(customPath?: string): Promise<CLIConfig> {
  const configPath = customPath || DEFAULT_CONFIG_PATH;
  try {
    if (existsSync(configPath)) {
      const raw = readFileSync(configPath, "utf-8");
      return JSON.parse(raw) as CLIConfig;
    }
  } catch {
    // Config file missing or invalid — use empty defaults
  }
  return {};
}

// ============================================================================
// CCM CONFIG HELPERS
// ============================================================================

const PRISM_DIR = join(homedir(), ".prism");

/**
 * Load cache configuration from ~/.prism/cache-config.json.
 * Returns parsed JSON or null if file is missing/invalid.
 */
export function loadCacheConfig(): Record<string, any> | null {
  try {
    const p = join(PRISM_DIR, "cache-config.json");
    if (existsSync(p)) {
      return JSON.parse(readFileSync(p, "utf-8"));
    }
  } catch {
    // missing or invalid — return null
  }
  return null;
}

/**
 * Load optimizer configuration from ~/.prism/optimizer-config.json.
 * Returns parsed JSON or null if file is missing/invalid.
 */
export function loadOptimizerConfig(): Record<string, any> | null {
  try {
    const p = join(PRISM_DIR, "optimizer-config.json");
    if (existsSync(p)) {
      return JSON.parse(readFileSync(p, "utf-8"));
    }
  } catch {
    // missing or invalid — return null
  }
  return null;
}

/**
 * Load coordination stats from ~/.prism/coordination-stats.json (read-only).
 * Returns parsed JSON or null if file is missing/invalid.
 */
export function loadCoordinationStats(): Record<string, any> | null {
  try {
    const p = join(PRISM_DIR, "coordination-stats.json");
    if (existsSync(p)) {
      return JSON.parse(readFileSync(p, "utf-8"));
    }
  } catch {
    // missing or invalid — return null
  }
  return null;
}
