/**
 * GpuStackHealthEngine — BLACKWELL-AI-MS0 / U-PYGPU-HEALTH (TS shim)
 *
 * The MCP-surfaced face of the fail-loud GPU readiness gate. It runs
 * `scripts/py/gpu_health.py` (the canonical verifier) and turns its JSON
 * contract into a typed result that every BLACKWELL-AI TRAINING consumer gates
 * on before it spawns a GPU job:
 *   - the GNN GATv2/H2GCN retrain (MS3) checks {@link GpuStackHealthResult.ready},
 *   - QLoRA fine-tunes (MS4) check {@link GpuStackHealthResult.qloraReady}
 *     (or call {@link GpuStackHealthEngine.assertReady} with `requireBnb`),
 *   - the GPU batch embedder + reward model (MS2/MS6) check `ready`.
 *
 * COMPANION, NOT DUPLICATE, OF OllamaCapabilityProbeEngine:
 *   `OllamaCapabilityProbeEngine` answers "which OLLAMA models fit free VRAM right
 *   now" (inference routing). THIS engine answers a different question — "is the
 *   PYTHON+CUDA TRAINING stack actually able to run a backward pass on this card"
 *   (torch cu128/sm_120 + a real GPU op + optional bitsandbytes 4-bit). Inference
 *   readiness != training readiness; they are deliberately separate gates.
 *
 * LAYERING NOTE (why this execFiles the script directly):
 *   The canonical Node->Python spawn primitive is `scripts/lib/py-subprocess-bridge.mjs`,
 *   used by the .mjs SCRIPT layer (retrain/embed/lora runners). An engine under
 *   `mcp-server/src` cannot import a `scripts/*.mjs` file (tsc `rootDir:"./src"`),
 *   so — exactly as `OllamaCapabilityProbeEngine` execFiles `nvidia-smi` directly
 *   rather than via a shared shell — this engine execFiles `gpu_health.py` with an
 *   injectable reader. The bridge and this engine share the SAME contract
 *   (NDJSON-on-stdout, fail-loud exit codes, CUDA_VISIBLE_DEVICES, the
 *   PRISM_PYTHON_GPU_PATH -> PRISM_PYTHON_PATH -> "python" resolution order); they
 *   are two consumers of one contract at two layers, not a re-implementation.
 *
 * FAIL-SOFT SNAPSHOT, FAIL-LOUD GATE:
 *   `check()` NEVER throws — a missing python, a crashed script, or malformed JSON
 *   degrade to `ready:false` + populated `errors` (so a probe failure cannot wedge
 *   a dispatcher). The LOUD refusal is the responsibility of the consumer: it
 *   gates on `ready`/`qloraReady`, or calls `assertReady()` which DOES throw. The
 *   engine's contract is only that it never silently reports `ready:true` when the
 *   stack is not genuinely training-capable (the whole point of gpu_health.py).
 *
 * @module engines/GpuStackHealthEngine
 * @milestone BLACKWELL-AI-MS0-U-PYGPU-HEALTH
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import * as path from "node:path";
import { resolveRepoRoot } from "../utils/resolve-repo-root.js";

const execFileAsync = promisify(execFile);

// ── Named constants ──────────────────────────────────────────────────────────
/** gpu_health.py runs a real GPU matmul (+ optional bnb op). 45s covers a COLD
 *  torch import + first-CUDA-context init (cuBLAS/cuDNN lazy load can approach
 *  20-25s on a cold host) without hanging a dispatcher. Per-call overridable. */
export const GPU_HEALTH_TIMEOUT_MS = 45_000;
/** Cache TTL for a READY result — stable until golf rebuilds the venv. */
export const HEALTH_CACHE_TTL_MS = 300_000;
/** Cache TTL for a NOT-ready / degraded result. Short, so the gate auto-lights-up
 *  within seconds of golf finishing the GPU-stack install instead of pinning RED
 *  for the full 5 min. (The whole milestone goal is "green the moment golf lands
 *  cu128/sm_120" — a long not-ready cache would defeat that.) */
export const HEALTH_NOT_READY_CACHE_TTL_MS = 15_000;
/** maxBuffer for the script's stdout (its JSON report is ~1KB; generous headroom). */
const HEALTH_MAX_BUFFER = 4_000_000;
/** Absolute path to the canonical health script (resolved via configured root so
 *  source-run (tsx) and built-run (dist) resolve the same file). Overridable. */
const DEFAULT_HEALTH_SCRIPT = path.join(resolveRepoRoot(), "scripts", "py", "gpu_health.py");

export type HealthSource = "live" | "cached" | "degraded";
export type PythonSource = "explicit" | "PRISM_PYTHON_GPU_PATH" | "PRISM_PYTHON_PATH" | "default";

/** The raw JSON contract emitted by gpu_health.py (subset we depend on; the
 *  script may add fields). All gate fields are read defensively. */
export interface GpuHealthRawReport {
  schemaVersion?: string;
  ready?: boolean;
  torch_ready?: boolean;
  qlora_ready?: boolean;
  torch_version?: string | null;
  cuda_available?: boolean;
  device_name?: string | null;
  capability?: [number, number] | null;
  sm_tag?: string | null;
  sm_supported?: boolean;
  gpu_matmul_ok?: boolean;
  bnb_4bit_ok?: boolean | null;
  bnb_detail?: string;
  errors?: string[];
  warnings?: string[];
  python_executable?: string | null;
  [k: string]: unknown;
}

/** Typed, defensively-defaulted health result. */
export interface GpuStackHealthResult {
  /** Foundational gate (== torch_ready): torch + cuda + device sm in arch_list + real matmul.
   *  GNN/embed/reward jobs gate on this. */
  ready: boolean;
  /** torch_ready (alias of `ready`, kept explicit for callers that read both). */
  torchReady: boolean;
  /** torch_ready AND a working bitsandbytes 4-bit GPU op. QLoRA gates on this. */
  qloraReady: boolean;
  torchVersion: string | null;
  cudaAvailable: boolean;
  deviceName: string | null;
  capability: [number, number] | null;
  smTag: string | null;
  smSupported: boolean;
  gpuMatmulOk: boolean;
  /** TRI-STATE: null = bitsandbytes not installed; false = present but broken; true = ok.
   *  Consumers MUST NOT coerce null->false for QLoRA decisions. */
  bnb4bitOk: boolean | null;
  bnbDetail: string;
  errors: string[];
  warnings: string[];
  /** Exit code of gpu_health.py (0 ready, 1 not-ready / error, null if it never ran). */
  exitCode: number | null;
  /** Interpreter actually used + its provenance (a "default" source means bare
   *  `python` — likely the CPU-only portable 3.14.5 — and a caller may refuse it). */
  pythonPath: string;
  pythonSource: PythonSource;
  pythonExecutable: string | null;
  scriptPath: string;
  source: HealthSource;
  checkedAt: string;
  /** The raw report (or null if the script produced no parseable JSON). */
  raw: GpuHealthRawReport | null;
}

export interface HealthCheckOpts {
  /** Require a working bitsandbytes 4-bit op for `ready` (QLoRA gate). Passes
   *  `--require-bnb` to gpu_health.py. */
  requireBnb?: boolean;
  /** Bypass the snapshot cache and re-run the script. */
  force?: boolean;
  /** Override the python interpreter path. */
  pythonPath?: string;
  /** Override the script timeout (ms); defaults to {@link GPU_HEALTH_TIMEOUT_MS}.
   *  Raise it for a genuinely cold host where first-CUDA-context init is slow. */
  timeoutMs?: number;
  /** Injected clock (ms) for deterministic cache tests; defaults to Date.now(). */
  nowMs?: number;
}

/** Injectable reader — defaulted to a real execFile; overridden in tests so the
 *  engine is hermetically testable without a Python interpreter. Returns the
 *  child's stdout AND exit code EVEN ON non-zero exit (gpu_health.py emits its
 *  JSON report on its failure paths — never swallow it). */
export interface HealthReader {
  runGpuHealth: (
    pythonPath: string,
    scriptPath: string,
    args: string[],
    timeoutMs: number,
  ) => Promise<{ stdout: string; stderr: string; exitCode: number }>;
}

/** Resolve the python interpreter + its provenance. Mirrors the canonical order
 *  in `scripts/lib/py-subprocess-bridge.mjs#resolvePythonPath` (re-stated here
 *  because an engine cannot import across the tsc rootDir — see LAYERING NOTE). */
function resolvePython(opts: HealthCheckOpts, env: NodeJS.ProcessEnv): { pythonPath: string; source: PythonSource } {
  if (opts.pythonPath && opts.pythonPath.length > 0) return { pythonPath: opts.pythonPath, source: "explicit" };
  if (env.PRISM_PYTHON_GPU_PATH && env.PRISM_PYTHON_GPU_PATH.length > 0)
    return { pythonPath: env.PRISM_PYTHON_GPU_PATH, source: "PRISM_PYTHON_GPU_PATH" };
  if (env.PRISM_PYTHON_PATH && env.PRISM_PYTHON_PATH.length > 0)
    return { pythonPath: env.PRISM_PYTHON_PATH, source: "PRISM_PYTHON_PATH" };
  return { pythonPath: "python", source: "default" };
}

/** Default real reader: execFile the script, capturing stdout + exit code even on
 *  a non-zero exit (execFile rejects on non-zero — we extract code+stdout from the
 *  error so the JSON report is never lost). */
const REAL_READER: HealthReader = {
  async runGpuHealth(pythonPath, scriptPath, args, timeoutMs) {
    try {
      const { stdout, stderr } = await execFileAsync(pythonPath, [scriptPath, ...args], {
        timeout: timeoutMs > 0 ? timeoutMs : GPU_HEALTH_TIMEOUT_MS,
        windowsHide: true,
        maxBuffer: HEALTH_MAX_BUFFER,
        env: { ...process.env, CUDA_VISIBLE_DEVICES: process.env.CUDA_VISIBLE_DEVICES ?? "0" },
      });
      return { stdout: stdout ?? "", stderr: stderr ?? "", exitCode: 0 };
    } catch (err) {
      // Non-zero exit (the normal not-ready path) OR spawn failure (ENOENT). Pull
      // stdout/stderr/code off the error object so the JSON report survives.
      const e = err as { stdout?: string; stderr?: string; code?: number | string; message?: string };
      const exitCode = typeof e.code === "number" ? e.code : 1;
      return {
        stdout: typeof e.stdout === "string" ? e.stdout : "",
        stderr: typeof e.stderr === "string" ? e.stderr : (e.message ?? ""),
        exitCode,
      };
    }
  },
};

/** Parse the LAST non-empty line of stdout as the JSON report (gpu_health.py
 *  emits exactly one JSON object; tolerate leading noise). */
function parseLastJson(stdout: string): GpuHealthRawReport | null {
  const lines = stdout.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
  for (let i = lines.length - 1; i >= 0; i--) {
    try {
      const obj = JSON.parse(lines[i]);
      if (obj && typeof obj === "object") return obj as GpuHealthRawReport;
    } catch {
      /* keep scanning upward */
    }
  }
  return null;
}

export class GpuStackHealthEngine {
  private reader: HealthReader;
  private scriptPath: string;
  private cache:
    | { result: GpuStackHealthResult; atMs: number; requireBnb: boolean; pythonPath: string }
    | null = null;

  constructor(reader: Partial<HealthReader> = {}, scriptPath: string = DEFAULT_HEALTH_SCRIPT) {
    this.reader = { ...REAL_READER, ...reader };
    this.scriptPath = scriptPath;
  }

  /**
   * Run the GPU readiness gate. Never throws — a failed/absent stack degrades to
   * `ready:false` with populated `errors`. Cached for {@link HEALTH_CACHE_TTL_MS}
   * (keyed by `requireBnb`) unless `force`.
   *
   * @param opts.requireBnb gate `ready` on a working bnb 4-bit op (QLoRA).
   * @param opts.force bypass the cache.
   * @returns the typed health result.
   */
  async check(opts: HealthCheckOpts = {}): Promise<GpuStackHealthResult> {
    const now = opts.nowMs ?? Date.now();
    const requireBnb = opts.requireBnb === true;
    const { pythonPath, source: pythonSource } = resolvePython(opts, process.env);
    if (
      !opts.force &&
      this.cache &&
      this.cache.requireBnb === requireBnb &&
      this.cache.pythonPath === pythonPath &&
      // READY results are stable (5 min); NOT-ready/degraded use a short TTL so the
      // gate auto-lights-up within seconds of golf finishing the GPU-stack install.
      now - this.cache.atMs < (this.cache.result.ready ? HEALTH_CACHE_TTL_MS : HEALTH_NOT_READY_CACHE_TTL_MS)
    ) {
      // Copy mutable arrays so a consumer mutating them can't poison the cache.
      const c = this.cache.result;
      return { ...c, errors: [...c.errors], warnings: [...c.warnings], source: "cached" };
    }

    const timeoutMs = opts.timeoutMs && opts.timeoutMs > 0 ? opts.timeoutMs : GPU_HEALTH_TIMEOUT_MS;
    const args = requireBnb ? ["--require-bnb"] : [];

    let stdout = "";
    let stderr = "";
    let exitCode: number | null = null;
    let readerError: string | null = null;
    try {
      const out = await this.reader.runGpuHealth(pythonPath, this.scriptPath, args, timeoutMs);
      stdout = out.stdout;
      stderr = out.stderr;
      exitCode = out.exitCode;
    } catch (err) {
      // The reader itself threw (should be rare — REAL_READER catches). Degrade.
      readerError = err instanceof Error ? err.message : String(err);
    }

    const raw = parseLastJson(stdout);
    const errors: string[] = raw && Array.isArray(raw.errors) ? [...raw.errors] : [];
    const warnings: string[] = raw && Array.isArray(raw.warnings) ? [...raw.warnings] : [];
    if (readerError) errors.push(`health_reader_failed: ${readerError}`);
    if (raw === null) {
      errors.push(
        `health_script_no_json: gpu_health.py produced no parseable JSON (exit ${exitCode}) ` +
          `via ${pythonPath}${stderr ? ` — stderr: ${stderr.slice(-300)}` : ""}`,
      );
    }
    if (pythonSource === "default") {
      warnings.push(
        "python interpreter resolved to bare 'python' (no PRISM_PYTHON_GPU_PATH) — " +
          "likely the CPU-only portable interpreter; set PRISM_PYTHON_GPU_PATH to golf's 3.13 GPU venv",
      );
    }

    // FAIL-SOFT: a parse miss / reader failure => ready:false (never silently true).
    const torchReady = raw?.torch_ready === true;
    const cap: number[] = raw && Array.isArray(raw.capability) ? raw.capability : [];
    const result: GpuStackHealthResult = {
      ready: torchReady,
      torchReady,
      qloraReady: raw?.qlora_ready === true,
      torchVersion: raw?.torch_version ?? null,
      cudaAvailable: raw?.cuda_available === true,
      deviceName: raw?.device_name ?? null,
      capability: cap.length === 2 ? [cap[0], cap[1]] : null,
      smTag: raw?.sm_tag ?? null,
      smSupported: raw?.sm_supported === true,
      gpuMatmulOk: raw?.gpu_matmul_ok === true,
      bnb4bitOk: raw?.bnb_4bit_ok === undefined ? null : raw!.bnb_4bit_ok,
      bnbDetail: typeof raw?.bnb_detail === "string" ? raw!.bnb_detail : "",
      errors,
      warnings,
      exitCode,
      pythonPath,
      pythonSource,
      pythonExecutable: raw?.python_executable ?? null,
      scriptPath: this.scriptPath,
      source: raw === null || readerError ? "degraded" : "live",
      checkedAt: new Date(now).toISOString(),
      raw,
    };

    this.cache = { result, atMs: now, requireBnb, pythonPath };
    return result;
  }

  /**
   * Hard gate: returns the result if ready, else THROWS with the structured
   * reasons. Use in a training runner that must abort rather than inspect.
   *
   * @param opts.requireBnb also require QLoRA (bnb) readiness.
   * @throws Error (with `.health` = the full result) when not ready.
   */
  async assertReady(opts: HealthCheckOpts = {}): Promise<GpuStackHealthResult> {
    const res = await this.check(opts);
    const ok = opts.requireBnb ? res.qloraReady : res.ready;
    if (!ok) {
      const err = new Error(
        `GPU stack not ${opts.requireBnb ? "QLoRA-" : ""}ready (exit ${res.exitCode}) via ${res.pythonPath}: ` +
          (res.errors[0] ?? "no detail"),
      ) as Error & { health?: GpuStackHealthResult };
      err.health = res;
      throw err;
    }
    return res;
  }

  /** Clear the cached result (forces the next check to re-run the script). */
  clearCache(): void {
    this.cache = null;
  }
}

/** Shared singleton — uses the real execFile reader + the canonical script path. */
export const gpuStackHealthEngine = new GpuStackHealthEngine();
