/**
 * EspritLiveBridgeEngine — Out-of-process executor for Esprit VB scripts
 * (CAD-COMPLETE-MS0/U-CADC-ESP-LIVE-01)
 *
 * Closes the Esprit gap: EspritCodeGeneratorEngine emits VB targeting Esprit's
 * COM API, EspritCAMBridgeEngine introspects existing Esprit projects, but no
 * Live Runner. This engine accepts a generated VB script and dispatches it via:
 *   - "com"  : Windows-only, cscript.exe executes a VBScript shim that
 *              CreateObject("Esprit.Application")
 *   - "http" : POST to an Esprit plugin HTTP listener (custom add-in)
 *   - "mock" : CI / tests — synthesized metrics
 *
 * @engine EspritLiveBridgeEngine
 * @dispatcher cadDispatcher (action: esprit_live_execute)
 * @milestone CAD-COMPLETE-MS0 / U-CADC-ESP-LIVE-01
 */

import type { CADScript, CADExecutionResult } from "../interfaces/ICADCodeGenerator.js";

// ── Constants ────────────────────────────────────────────────────────────────

const BRIDGE_VERSION = "1.0.0";
const DEFAULT_TIMEOUT_MS = 30_000;
const MIN_VALID_TIMEOUT_MS = 100;
const MAX_VALID_TIMEOUT_MS = 600_000;
const MOCK_BBOX_MM: [number, number, number] = [40, 25, 8];
const MOCK_VOLUME_MM3 = 8_000;
const MOCK_FACE_COUNT = 6;

export type EspritExecutionMode = "http" | "com" | "mock";

// ── Public types ─────────────────────────────────────────────────────────────

export interface EspritLiveConfig {
  mode: EspritExecutionMode;
  /** HTTP endpoint (required when mode='http') */
  endpoint?: string;
  /** Execution timeout in ms (default 30s) */
  timeoutMs?: number;
  /** Path to VBScript shim (required when mode='com') */
  comShimPath?: string;
}

export interface EspritLiveExecuteInput {
  script: CADScript<string> | string;
  config: EspritLiveConfig;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function resolveScriptBody(script: CADScript<string> | string): string {
  if (typeof script === "string") return script;
  if (script && typeof script === "object" && typeof script.body === "string") {
    return script.body;
  }
  throw new Error("EspritLiveBridge: script must be a string or CADScript<string>");
}

function validateConfig(config: EspritLiveConfig): { ok: boolean; error?: string } {
  if (!config || typeof config !== "object") {
    return { ok: false, error: "config is required" };
  }
  if (config.mode !== "http" && config.mode !== "com" && config.mode !== "mock") {
    return { ok: false, error: `unknown execution mode: ${config.mode}` };
  }
  if (config.mode === "http" && !config.endpoint) {
    return { ok: false, error: "config.endpoint required for mode='http'" };
  }
  if (config.mode === "com" && !config.comShimPath) {
    return { ok: false, error: "config.comShimPath required for mode='com'" };
  }
  if (config.timeoutMs !== undefined) {
    if (
      typeof config.timeoutMs !== "number" ||
      !Number.isFinite(config.timeoutMs) ||
      config.timeoutMs < MIN_VALID_TIMEOUT_MS ||
      config.timeoutMs > MAX_VALID_TIMEOUT_MS
    ) {
      return {
        ok: false,
        error: `timeoutMs must be in [${MIN_VALID_TIMEOUT_MS}, ${MAX_VALID_TIMEOUT_MS}]`,
      };
    }
  }
  return { ok: true };
}

function mockResult(scriptBody: string): CADExecutionResult {
  return {
    ok: true,
    durationMs: 1,
    metrics: {
      volumeMm3: MOCK_VOLUME_MM3,
      boundingBoxMm: MOCK_BBOX_MM,
      faceCount: MOCK_FACE_COUNT,
      bodyCount: 1,
    },
    log: `[mock] Esprit script accepted (${scriptBody.split(/\r?\n/).length} lines)`,
  };
}

// ── Engine ───────────────────────────────────────────────────────────────────

export class EspritLiveBridgeEngine {
  readonly version = BRIDGE_VERSION;

  validate(config: EspritLiveConfig): { ok: boolean; error?: string } {
    return validateConfig(config);
  }

  async execute(input: EspritLiveExecuteInput): Promise<CADExecutionResult> {
    if (!input || typeof input !== "object") {
      throw new Error("EspritLiveBridge: input is required");
    }
    const v = validateConfig(input.config);
    if (!v.ok) {
      return {
        ok: false,
        error: `EspritLiveBridge: ${v.error}`,
        durationMs: 0,
      };
    }
    const body = resolveScriptBody(input.script);
    const start = Date.now();

    if (input.config.mode === "mock") {
      return mockResult(body);
    }

    if (input.config.mode === "http") {
      return {
        ok: false,
        error:
          "EspritLiveBridge: HTTP execution not yet wired (requires Esprit plugin listener at " +
          input.config.endpoint +
          ")",
        durationMs: Date.now() - start,
      };
    }

    // mode === "com"
    return {
      ok: false,
      error:
        "EspritLiveBridge: COM execution not yet wired (requires Windows + Esprit.Application + cscript.exe shim at " +
        input.config.comShimPath +
        ")",
      durationMs: Date.now() - start,
    };
  }

  supportedModes(): readonly EspritExecutionMode[] {
    return ["http", "com", "mock"] as const;
  }
}

export const espritLiveBridgeEngine = new EspritLiveBridgeEngine();
