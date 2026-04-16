/**
 * WEDMGovernanceStore — load/save helper for WEDM_AUTONOMY_STATE.json.
 *
 * Phase 4 / P4-MS1 / U-P4-10 of the WEDM AGI Intelligence Roadmap.
 *
 * Serialises the `WEDMAutonomyEngine` snapshot (level + transition history)
 * so the current operational governance posture survives across MCP
 * sessions. Follows the same envelope pattern as `WEDMRLPolicyPersistence`:
 *   { schemaVersion, generatedAt, description, state }
 *
 * The file lives at `data/state/WEDM_AUTONOMY_STATE.json` and is the
 * authoritative source for the current autonomy level on startup — the
 * engine should be rehydrated from disk before operators interact with it.
 *
 * "Governance" (not "Autonomy") in the module name deliberately — this
 * layer is the persistence / audit face of the autonomy level, and the
 * J3016 ladder's real topic is *which authority (AI vs. operator) runs
 * which part of the cut*. A second reason: reserving clean namespace so
 * the guard does not confuse this with the engine itself.
 *
 * Composes with:
 *   - `WEDMAutonomyEngine` — source of `AutonomySnapshot`, target of load()
 *   - `utils/atomicWrite` — crash-safe persistence
 *
 * @module engines/WEDMGovernanceStore
 */

import * as fs from "fs";
import * as path from "path";
import { atomicWrite } from "../utils/atomicWrite.js";
import {
  WEDMAutonomyEngine,
  wedmAutonomyEngine,
  type AutonomySnapshot,
  type AutonomyLevel,
  type AutonomyTransition,
} from "./WEDMAutonomyEngine.js";

// ============================================================================
// TYPES & CONSTANTS
// ============================================================================

export interface WEDMAutonomyStateFile {
  schemaVersion: number;
  generatedAt: string;
  description: string;
  state: {
    level: AutonomyLevel;
    version: number;
    history: AutonomyTransition[];
  };
}

export const WEDM_AUTONOMY_STATE_SCHEMA_VERSION = 1;
export const WEDM_AUTONOMY_STATE_FILENAME = "WEDM_AUTONOMY_STATE.json";

// ============================================================================
// PATHS
// ============================================================================

/**
 * Default path to the autonomy state file. Resolves to
 * `<mcp-server>/data/state/WEDM_AUTONOMY_STATE.json`. Prefers the nearest
 * `data/state` folder so the helper works whether `cwd` is the repo root
 * or the `mcp-server` subdirectory.
 */
export function defaultGovernancePath(): string {
  const candidates = [
    path.resolve(process.cwd(), "data", "state", WEDM_AUTONOMY_STATE_FILENAME),
    path.resolve(process.cwd(), "mcp-server", "data", "state", WEDM_AUTONOMY_STATE_FILENAME),
  ];
  for (const c of candidates) {
    if (fs.existsSync(path.dirname(c))) return c;
  }
  return candidates[0];
}

// ============================================================================
// READ / WRITE
// ============================================================================

/** Save the engine's snapshot to disk (atomic write). */
export async function saveGovernanceState(
  engine: WEDMAutonomyEngine = wedmAutonomyEngine,
  filePath: string = defaultGovernancePath(),
): Promise<string> {
  const snap = engine.snapshot();
  const file: WEDMAutonomyStateFile = {
    schemaVersion: WEDM_AUTONOMY_STATE_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    description: "WEDM autonomy level + transition history (P4-MS1 / U-P4-01)",
    state: {
      level: snap.level,
      version: snap.version,
      history: snap.history,
    },
  };
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  await atomicWrite(filePath, JSON.stringify(file, null, 2));
  return filePath;
}

/**
 * Load a state file into the supplied engine. Returns the envelope or null
 * if the file is missing (caller decides whether to cold-start at L0).
 */
export function loadGovernanceState(
  engine: WEDMAutonomyEngine = wedmAutonomyEngine,
  filePath: string = defaultGovernancePath(),
): WEDMAutonomyStateFile | null {
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, "utf-8");
  const parsed = JSON.parse(raw) as WEDMAutonomyStateFile;
  validateStateFile(parsed);
  engine.load({ level: parsed.state.level, history: parsed.state.history });
  return parsed;
}

/** Read without mutating an engine — dashboards / read-only introspection. */
export function readGovernanceFile(
  filePath: string = defaultGovernancePath(),
): WEDMAutonomyStateFile | null {
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, "utf-8");
  const parsed = JSON.parse(raw) as WEDMAutonomyStateFile;
  validateStateFile(parsed);
  return parsed;
}

// ============================================================================
// VALIDATION
// ============================================================================

function validateStateFile(f: unknown): asserts f is WEDMAutonomyStateFile {
  if (typeof f !== "object" || f === null) {
    throw new Error("WEDM_AUTONOMY_STATE: file is not a JSON object");
  }
  const obj = f as Record<string, unknown>;
  if (typeof obj.schemaVersion !== "number") {
    throw new Error("WEDM_AUTONOMY_STATE: schemaVersion must be a number");
  }
  if (obj.schemaVersion !== WEDM_AUTONOMY_STATE_SCHEMA_VERSION) {
    throw new Error(
      `WEDM_AUTONOMY_STATE: unsupported schemaVersion ${obj.schemaVersion} ` +
        `(expected ${WEDM_AUTONOMY_STATE_SCHEMA_VERSION})`,
    );
  }
  if (typeof obj.generatedAt !== "string") {
    throw new Error("WEDM_AUTONOMY_STATE: generatedAt must be an ISO string");
  }
  if (typeof obj.state !== "object" || obj.state === null) {
    throw new Error("WEDM_AUTONOMY_STATE: state object missing");
  }
  const s = obj.state as Record<string, unknown>;
  if (typeof s.level !== "number" || !Number.isInteger(s.level) || s.level < 0 || s.level > 5) {
    throw new Error("WEDM_AUTONOMY_STATE: state.level must be an integer 0..5");
  }
  if (!Array.isArray(s.history)) {
    throw new Error("WEDM_AUTONOMY_STATE: state.history must be an array");
  }
}

// ============================================================================
// INTROSPECTION HELPER
// ============================================================================

/** Compose a snapshot-like object from a file without touching an engine. */
export function snapshotFromFile(file: WEDMAutonomyStateFile): AutonomySnapshot {
  return {
    level: file.state.level,
    name: "", // filled by engine on load — read-only introspection only
    humanRole: "",
    version: file.state.version,
    last:
      file.state.history.length > 0
        ? file.state.history[file.state.history.length - 1]
        : undefined,
    history: file.state.history.map((h) => ({ ...h })),
  };
}
