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
