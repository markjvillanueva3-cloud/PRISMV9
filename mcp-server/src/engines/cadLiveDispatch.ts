// WIRE-EXEMPT: shared helper module consumed by SolidWorksLiveBridgeEngine
// + EspritLiveBridgeEngine (the live-bridge engines are the user-facing
// surface — those ARE wired). Tagged 2026-05-26 (slot:victor) per CLAUDE.md
// §ENGINE WIRING "WIRE-EXEMPT: <reason>" to suppress the audit
// false-positive (helper module, not an engine).
/**
 * cadLiveDispatch — shared HTTP + COM execution helpers for Live CAD bridges
 * (CAD-COMPLETE-MS0/U-CADC-PRINT-LIVE-WIRE01)
 *
 * SolidWorksLiveBridgeEngine and EspritLiveBridgeEngine both need to push a
 * generated VBA/VB script body out of the Node process and into the host CAD
 * application. The wire is identical for both — only branding differs — so
 * the actual transport lives here, with DI seams that let tests stub HTTP
 * + child_process without mocking globals.
 *
 * HTTP transport contract:
 *   POST <endpoint>
 *   Content-Type: text/plain;charset=utf-8
 *   Body: <script body>
 *
 *   Response (200 OK):
 *     application/json with shape:
 *       { ok: true,  metrics?: {...}, log?: string, durationMs?: number }
 *     OR
 *       { ok: false, error: string,   log?: string, durationMs?: number }
 *
 * COM transport contract:
 *   1. Script body is written to a temp .bas / .vbs file
 *   2. cscript.exe //nologo //B //T:<sec> <comShimPath> <tempFile>
 *   3. Shim's last stdout line MUST be a single JSON object matching the
 *      same shape as the HTTP response
 *
 * Both transports surface non-2xx, non-zero exit, malformed JSON, abort, and
 * thrown errors as a structured CADExecutionResult — the engine never throws
 * for transport failures, only for caller bugs (bad input shape).
 *
 * @module engines/cadLiveDispatch
 * @milestone CAD-COMPLETE-MS0 / U-CADC-PRINT-LIVE-WIRE01
 */

import { execFile } from "child_process";
import * as fsSync from "fs";
import * as fsPromises from "fs/promises";
import * as os from "os";
import * as path from "path";
import * as crypto from "crypto";
import type { CADExecutionResult } from "../interfaces/ICADCodeGenerator.js";

// ── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_HTTP_TIMEOUT_MS = 30_000;
const DEFAULT_COM_TIMEOUT_MS = 30_000;
const COM_TIMEOUT_PADDING_MS = 5_000;
const HTTP_DEFAULT_HEADERS: Record<string, string> = {
  "Content-Type": "text/plain;charset=utf-8",
  Accept: "application/json",
};
const MAX_SCRIPT_BYTES = 16 * 1024 * 1024; // 16 MB hard cap on transport
const MAX_COM_STDOUT_BYTES = 4 * 1024 * 1024;

// ── Public DI surfaces ───────────────────────────────────────────────────────

export interface HttpResponseLike {
  ok: boolean;
  status: number;
  statusText: string;
  text(): Promise<string>;
  json<T = unknown>(): Promise<T>;
}

export interface HttpClient {
  /**
   * POST `body` to `url`. MUST honor `signal` for abort/timeout.
   * Throws on transport-level errors (network, DNS, TLS, abort).
   */
  post(
    url: string,
    body: string,
    opts: { signal: AbortSignal; headers: Record<string, string> },
  ): Promise<HttpResponseLike>;
}

export interface ProcessExecResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  /** True only when the runner aborted/killed the process (timeout or signal) */
  killed: boolean;
}

export interface ProcessRunner {
  /**
   * Run `command` with `args`. MUST kill the process if `timeoutMs` is exceeded
   * and report `killed: true`. Throws only for spawn failure (ENOENT, EACCES).
   */
  run(
    command: string,
    args: string[],
    opts: { timeoutMs: number; cwd?: string },
  ): Promise<ProcessExecResult>;
}

export interface TempFileSink {
  /** Write `body` to a fresh temp file with `.{ext}` and return its absolute path */
  write(prefix: string, ext: string, body: string): Promise<string>;
  /** Best-effort delete; never throws */
  remove(filePath: string): Promise<void>;
}

// ── Default implementations ──────────────────────────────────────────────────

export const defaultHttpClient: HttpClient = {
  async post(url, body, opts) {
    const res = await fetch(url, {
      method: "POST",
      headers: opts.headers,
      body,
      signal: opts.signal,
    });
    return {
      ok: res.ok,
      status: res.status,
      statusText: res.statusText,
      text: () => res.text(),
      json: <T>() => res.json() as Promise<T>,
    };
  },
};

export const defaultProcessRunner: ProcessRunner = {
  run(command, args, opts) {
    return new Promise((resolve) => {
      let killed = false;
      const child = execFile(
        command,
        args,
        {
          timeout: opts.timeoutMs + COM_TIMEOUT_PADDING_MS,
          cwd: opts.cwd,
          maxBuffer: MAX_COM_STDOUT_BYTES,
          windowsHide: true,
        },
        (err, stdout, stderr) => {
          const exitCode = child.exitCode ?? (err ? 1 : 0);
          resolve({
            exitCode,
            stdout: String(stdout ?? ""),
            stderr: String(stderr ?? ""),
            killed,
          });
        },
      );
      const hardKill = setTimeout(() => {
        killed = true;
        child.kill("SIGKILL");
      }, opts.timeoutMs);
      child.on("exit", () => clearTimeout(hardKill));
    });
  },
};

export const defaultTempFileSink: TempFileSink = {
  async write(prefix, ext, body) {
    const safePrefix = prefix.replace(/[^a-zA-Z0-9_-]/g, "_");
    const safeExt = ext.replace(/^\./, "").replace(/[^a-zA-Z0-9]/g, "");
    const rand = crypto.randomBytes(6).toString("hex");
    const fileName = `${safePrefix}-${Date.now()}-${rand}.${safeExt}`;
    const fullPath = path.join(os.tmpdir(), fileName);
    await fsPromises.writeFile(fullPath, body, { encoding: "utf8" });
    return fullPath;
  },
  async remove(filePath) {
    try {
      await fsPromises.rm(filePath, { force: true });
    } catch {
      /* best-effort */
    }
  },
};

// ── Common payload validation ────────────────────────────────────────────────

function validatePayload(body: string): { ok: true } | { ok: false; error: string } {
  if (typeof body !== "string") {
    return { ok: false, error: "script body must be a string" };
  }
  if (body.length === 0) {
    return { ok: false, error: "script body is empty" };
  }
  const bytes = Buffer.byteLength(body, "utf8");
  if (bytes > MAX_SCRIPT_BYTES) {
    return {
      ok: false,
      error: `script body too large (${bytes} bytes > ${MAX_SCRIPT_BYTES} cap)`,
    };
  }
  return { ok: true };
}

interface RemoteResultShape {
  ok?: unknown;
  error?: unknown;
  log?: unknown;
  durationMs?: unknown;
  metrics?: unknown;
}

function shapeFromRemote(
  raw: unknown,
  fallbackDurationMs: number,
  brand: string,
): CADExecutionResult {
  if (!raw || typeof raw !== "object") {
    return {
      ok: false,
      error: `${brand}: response was not a JSON object`,
      durationMs: fallbackDurationMs,
    };
  }
  const obj = raw as RemoteResultShape;
  const ok = obj.ok === true;
  const log = typeof obj.log === "string" ? obj.log : undefined;
  const dur =
    typeof obj.durationMs === "number" && Number.isFinite(obj.durationMs) && obj.durationMs >= 0
      ? obj.durationMs
      : fallbackDurationMs;

  if (!ok) {
    const err =
      typeof obj.error === "string" && obj.error.length > 0
        ? obj.error
        : `${brand}: remote reported failure with no error message`;
    return { ok: false, error: err, durationMs: dur, ...(log ? { log } : {}) };
  }

  // ok=true — surface metrics if present and shaped right
  const metrics =
    obj.metrics && typeof obj.metrics === "object"
      ? (obj.metrics as CADExecutionResult["metrics"])
      : undefined;
  return {
    ok: true,
    durationMs: dur,
    ...(metrics ? { metrics } : {}),
    ...(log ? { log } : {}),
  };
}

function extractTrailingJson(stdout: string): unknown | null {
  const lines = stdout.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  // Walk from end; first line that parses as JSON wins
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    if (!line.startsWith("{") && !line.startsWith("[")) continue;
    try {
      return JSON.parse(line);
    } catch {
      /* keep scanning */
    }
  }
  return null;
}

// ── HTTP dispatch ────────────────────────────────────────────────────────────

export interface HttpDispatchOptions {
  endpoint: string;
  timeoutMs?: number;
  body: string;
  brand: string;
  http?: HttpClient;
}

export async function dispatchViaHttp(opts: HttpDispatchOptions): Promise<CADExecutionResult> {
  const v = validatePayload(opts.body);
  if (!v.ok) {
    return { ok: false, error: `${opts.brand}: ${v.error}`, durationMs: 0 };
  }
  const http = opts.http ?? defaultHttpClient;
  const timeout = opts.timeoutMs ?? DEFAULT_HTTP_TIMEOUT_MS;
  const start = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await http.post(opts.endpoint, opts.body, {
      signal: controller.signal,
      headers: { ...HTTP_DEFAULT_HEADERS },
    });
    const durationMs = Date.now() - start;
    if (!res.ok) {
      // Try to surface server-supplied text error if present
      let serverText = "";
      try {
        serverText = await res.text();
      } catch {
        /* ignore */
      }
      const trimmed = serverText.length > 200 ? `${serverText.slice(0, 200)}...` : serverText;
      const tail = trimmed ? ` body=${trimmed}` : "";
      return {
        ok: false,
        error: `${opts.brand}: HTTP ${res.status} ${res.statusText}${tail}`,
        durationMs,
      };
    }
    let parsed: unknown;
    try {
      parsed = await res.json();
    } catch (jsonErr) {
      const msg = jsonErr instanceof Error ? jsonErr.message : String(jsonErr);
      return {
        ok: false,
        error: `${opts.brand}: response was not parseable JSON (${msg})`,
        durationMs,
      };
    }
    return shapeFromRemote(parsed, durationMs, opts.brand);
  } catch (err) {
    const durationMs = Date.now() - start;
    if (controller.signal.aborted) {
      return {
        ok: false,
        error: `${opts.brand}: HTTP request aborted after ${timeout}ms`,
        durationMs,
      };
    }
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      error: `${opts.brand}: HTTP transport error: ${msg}`,
      durationMs,
    };
  } finally {
    clearTimeout(timer);
  }
}

// ── COM dispatch (Windows cscript.exe) ───────────────────────────────────────

export interface ComDispatchOptions {
  comShimPath: string;
  body: string;
  brand: string;
  scriptExt: string; // e.g. "bas" for SolidWorks, "vb" for Esprit
  timeoutMs?: number;
  cscriptCommand?: string; // override (default: "cscript.exe")
  runner?: ProcessRunner;
  tempSink?: TempFileSink;
}

export async function dispatchViaCom(opts: ComDispatchOptions): Promise<CADExecutionResult> {
  const v = validatePayload(opts.body);
  if (!v.ok) {
    return { ok: false, error: `${opts.brand}: ${v.error}`, durationMs: 0 };
  }
  // Resolve shim — must exist before we spawn anything
  if (!fsSync.existsSync(opts.comShimPath)) {
    return {
      ok: false,
      error: `${opts.brand}: comShimPath does not exist: ${opts.comShimPath}`,
      durationMs: 0,
    };
  }

  const runner = opts.runner ?? defaultProcessRunner;
  const sink = opts.tempSink ?? defaultTempFileSink;
  const timeoutMs = opts.timeoutMs ?? DEFAULT_COM_TIMEOUT_MS;
  const cscript = opts.cscriptCommand ?? "cscript.exe";
  const start = Date.now();

  let tempPath: string | null = null;
  try {
    tempPath = await sink.write(`prism-${opts.brand.toLowerCase()}`, opts.scriptExt, opts.body);

    const timeoutSeconds = Math.max(1, Math.ceil(timeoutMs / 1000));
    const args = [
      "//nologo",
      "//B",
      `//T:${timeoutSeconds}`,
      opts.comShimPath,
      tempPath,
    ];
    const result = await runner.run(cscript, args, { timeoutMs });
    const durationMs = Date.now() - start;

    if (result.killed) {
      return {
        ok: false,
        error: `${opts.brand}: COM process killed after ${timeoutMs}ms`,
        durationMs,
      };
    }
    if (result.exitCode !== 0) {
      const stderrTail = result.stderr.length > 200 ? `${result.stderr.slice(0, 200)}...` : result.stderr;
      return {
        ok: false,
        error: `${opts.brand}: cscript exited ${result.exitCode}${stderrTail ? ` stderr=${stderrTail}` : ""}`,
        durationMs,
      };
    }
    const parsed = extractTrailingJson(result.stdout);
    if (parsed === null) {
      return {
        ok: false,
        error: `${opts.brand}: COM shim produced no JSON line on stdout`,
        durationMs,
      };
    }
    return shapeFromRemote(parsed, durationMs, opts.brand);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      error: `${opts.brand}: COM dispatch failed: ${msg}`,
      durationMs: Date.now() - start,
    };
  } finally {
    if (tempPath) {
      await sink.remove(tempPath);
    }
  }
}

// ── Constants exported for tests/clients ─────────────────────────────────────

export const CAD_LIVE_DISPATCH = {
  DEFAULT_HTTP_TIMEOUT_MS,
  DEFAULT_COM_TIMEOUT_MS,
  MAX_SCRIPT_BYTES,
  MAX_COM_STDOUT_BYTES,
} as const;
