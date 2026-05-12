/**
 * WEDMRLPolicyPersistence — load / save helper for WEDM_RL_POLICY.json.
 *
 * Phase 3 / P3-MS3 / U-P3-13 of the WEDM AGI Intelligence Roadmap.
 *
 * Serialises the `WEDMRLControllerEngine` policy to disk so that the
 * LinUCB bandit can survive across MCP sessions. The file lives at
 * `data/state/WEDM_RL_POLICY.json` and follows PRISM's schemaVersion +
 * generatedAt envelope convention.
 *
 * File schema (v1):
 * {
 *   "schemaVersion": 1,
 *   "generatedAt": "2026-04-16T...Z",
 *   "description": "Serialised WEDM RL (LinUCB) controller policy",
 *   "policy": RLSnapshot
 * }
 *
 * Composes with:
 *   - `WEDMRLControllerEngine` — source of RLSnapshot via snapshot(), target of load()
 *   - `utils/atomicWrite` — crash-safe atomic write
 *
 * @module engines/WEDMRLPolicyPersistence
 */

import * as fs from "fs";
import * as path from "path";
import { atomicWrite } from "../utils/atomicWrite.js";
import {
  WEDMRLControllerEngine,
  wedmRLControllerEngine,
  type RLSnapshot,
} from "./WEDMRLControllerEngine.js";

// ============================================================================
// TYPES & CONSTANTS
// ============================================================================

export interface WEDMRLPolicyFile {
  schemaVersion: number;
  generatedAt: string;
  description: string;
  policy: RLSnapshot;
}

export const WEDM_RL_POLICY_SCHEMA_VERSION = 1;
export const WEDM_RL_POLICY_FILENAME = "WEDM_RL_POLICY.json";

// ============================================================================
// PATHS
// ============================================================================

/**
 * Default path to the policy state file. Resolves to
 * `<mcp-server>/data/state/WEDM_RL_POLICY.json`.
 */
export function defaultPolicyPath(): string {
  // The compiled module sits at dist/... — walk up until we find data/state.
  // In tests, this runs from src/engines/, so step up 2 levels.
  const candidates = [
    path.resolve(process.cwd(), "data", "state", WEDM_RL_POLICY_FILENAME),
    path.resolve(process.cwd(), "mcp-server", "data", "state", WEDM_RL_POLICY_FILENAME),
  ];
  for (const c of candidates) {
    const dir = path.dirname(c);
    if (fs.existsSync(dir)) return c;
  }
  return candidates[0];
}

// ============================================================================
// READ / WRITE
// ============================================================================

/** Save the engine's current snapshot to disk (atomic write). */
export async function saveWEDMRLPolicy(
  engine: WEDMRLControllerEngine = wedmRLControllerEngine,
  filePath: string = defaultPolicyPath(),
): Promise<string> {
  const file: WEDMRLPolicyFile = {
    schemaVersion: WEDM_RL_POLICY_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    description: "Serialised WEDM RL (LinUCB) controller policy",
    policy: engine.snapshot(),
  };
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  await atomicWrite(filePath, JSON.stringify(file, null, 2));
  return filePath;
}

/**
 * Load a policy file into the supplied engine. Returns the envelope or null
 * if the file is missing (caller decides whether to cold-start).
 */
export function loadWEDMRLPolicy(
  engine: WEDMRLControllerEngine = wedmRLControllerEngine,
  filePath: string = defaultPolicyPath(),
): WEDMRLPolicyFile | null {
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, "utf-8");
  const parsed = JSON.parse(raw) as WEDMRLPolicyFile;
  validatePolicyFile(parsed);
  engine.load(parsed.policy);
  return parsed;
}

/** Read the envelope without mutating an engine. Useful for introspection. */
export function readWEDMRLPolicyFile(
  filePath: string = defaultPolicyPath(),
): WEDMRLPolicyFile | null {
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, "utf-8");
  const parsed = JSON.parse(raw) as WEDMRLPolicyFile;
  validatePolicyFile(parsed);
  return parsed;
}

// ============================================================================
// VALIDATION
// ============================================================================

function validatePolicyFile(f: unknown): asserts f is WEDMRLPolicyFile {
  if (typeof f !== "object" || f === null) {
    throw new Error("WEDM_RL_POLICY file is not a JSON object");
  }
  const obj = f as Record<string, unknown>;
  if (typeof obj.schemaVersion !== "number") {
    throw new Error("WEDM_RL_POLICY: schemaVersion must be a number");
  }
  if (obj.schemaVersion !== WEDM_RL_POLICY_SCHEMA_VERSION) {
    throw new Error(
      `WEDM_RL_POLICY: unsupported schemaVersion ${obj.schemaVersion} (expected ${WEDM_RL_POLICY_SCHEMA_VERSION})`,
    );
  }
  if (typeof obj.generatedAt !== "string") {
    throw new Error("WEDM_RL_POLICY: generatedAt must be an ISO string");
  }
  if (typeof obj.policy !== "object" || obj.policy === null) {
    throw new Error("WEDM_RL_POLICY: policy must be an RLSnapshot object");
  }
  const p = obj.policy as Record<string, unknown>;
  if (typeof p.dim !== "number" || typeof p.version !== "number") {
    throw new Error("WEDM_RL_POLICY: policy is missing dim or version");
  }
  if (typeof p.theta !== "object" || p.theta === null) {
    throw new Error("WEDM_RL_POLICY: policy.theta is missing");
  }
}
