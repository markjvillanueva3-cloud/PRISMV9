/**
 * HyperMillACScriptExecutor — Sandboxed Python script execution for
 * OPEN MIND AutomationCenter (AC).
 *
 * Used by HyperMILLAutomationBridge to run small scripts that drive AC via
 * its `prism_ac` Python module. In mock mode the executor returns
 * deterministic success with fixture stdout so the AC bridge and its tests
 * run without a live hyperMILL installation.
 *
 * Real-mode execution spawns Python with a strict timeout and captures
 * stdout/stderr. No file-system writes beyond the script argv payload.
 *
 * @module engines/HyperMillACScriptExecutor
 * @shortcode E1306
 */
import { log } from "../utils/Logger.js";
import * as cp from "node:child_process";

export interface ACExecuteOptions {
  mockMode?: boolean;
  acHost?: string;
  acPort?: number;
  pythonBinary?: string;
  timeout_ms?: number;
}

export interface ACExecuteResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
  durationMs: number;
  error?: string;
}

export interface ACExecutePerCall {
  filePath?: string;
  outputPath?: string;
  env?: Record<string, string>;
  timeout_ms?: number;
}

const DEFAULT_TIMEOUT_MS = 60_000;
const DEFAULT_PYTHON = "python";

const MOCK_GEOMETRY_JSON = JSON.stringify({
  curves: [], surfaces: [], solids: [], points: [], totalEntities: 0,
});

const MOCK_OPERATION_TREE_JSON = JSON.stringify({
  jobs: [], totalOperations: 0,
});

export class HyperMillACScriptExecutor {
  private readonly mockMode: boolean;
  private readonly acHost: string;
  private readonly acPort: number;
  private readonly pythonBinary: string;
  private readonly timeout_ms: number;

  constructor(opts: ACExecuteOptions = {}) {
    this.mockMode = opts.mockMode ?? process.env.PRISM_CAD_MOCK === "1";
    this.acHost = opts.acHost ?? "127.0.0.1";
    this.acPort = opts.acPort ?? 18365;
    this.pythonBinary = opts.pythonBinary ?? DEFAULT_PYTHON;
    this.timeout_ms = opts.timeout_ms ?? DEFAULT_TIMEOUT_MS;
  }

  /**
   * Execute a Python script against AC and return stdout/stderr/exitCode.
   *
   * @param script Python source to run.
   * @param perCall Optional per-call overrides (env, filePath hint, etc).
   */
  async execute(script: string, perCall: ACExecutePerCall = {}): Promise<ACExecuteResult> {
    if (this.mockMode) {
      return this.mockExecute(script, perCall);
    }

    const start = Date.now();
    return new Promise((resolvePromise) => {
      const proc = cp.spawn(this.pythonBinary, ["-c", script], {
        env: {
          ...process.env,
          PRISM_AC_HOST: this.acHost,
          PRISM_AC_PORT: String(this.acPort),
          ...(perCall.env ?? {}),
        },
      });

      const stdoutChunks: string[] = [];
      const stderrChunks: string[] = [];
      let killed = false;
      const timeout = perCall.timeout_ms ?? this.timeout_ms;

      const timer = setTimeout(() => {
        killed = true;
        proc.kill("SIGTERM");
      }, timeout);

      proc.stdout?.on("data", (d: Buffer) => stdoutChunks.push(d.toString("utf8")));
      proc.stderr?.on("data", (d: Buffer) => stderrChunks.push(d.toString("utf8")));

      proc.on("error", (err) => {
        clearTimeout(timer);
        resolvePromise({
          success: false,
          stdout: stdoutChunks.join(""),
          stderr: stderrChunks.join(""),
          exitCode: -1,
          durationMs: Date.now() - start,
          error: err.message,
        });
      });

      proc.on("close", (code) => {
        clearTimeout(timer);
        const exitCode = code ?? -1;
        const success = !killed && exitCode === 0;
        resolvePromise({
          success,
          stdout: stdoutChunks.join(""),
          stderr: stderrChunks.join(""),
          exitCode,
          durationMs: Date.now() - start,
          error: killed ? "timeout" : undefined,
        });
      });
    });
  }

  private async mockExecute(script: string, perCall: ACExecutePerCall): Promise<ACExecuteResult> {
    const start = Date.now();
    let mockStdout = "";
    if (script.includes("geometry_json")) mockStdout = MOCK_GEOMETRY_JSON;
    else if (script.includes("operation_tree_json")) mockStdout = MOCK_OPERATION_TREE_JSON;
    else if (script.includes("open_project")) mockStdout = JSON.stringify({ opened: perCall.filePath ?? null });
    else if (script.includes("export_step")) mockStdout = JSON.stringify({ exported: perCall.outputPath ?? null });
    else if (script.includes("close_project")) mockStdout = JSON.stringify({ closed: true });

    log.info(`[HyperMillACScriptExecutor] MOCK execute (${script.split("\n")[0]})`);
    return {
      success: true,
      stdout: mockStdout,
      stderr: "",
      exitCode: 0,
      durationMs: Date.now() - start,
    };
  }
}

export const hyperMillACScriptExecutor = new HyperMillACScriptExecutor({
  mockMode: process.env.PRISM_CAD_MOCK === "1",
});
