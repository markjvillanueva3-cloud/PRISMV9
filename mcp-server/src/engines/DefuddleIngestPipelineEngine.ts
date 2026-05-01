/**
 * DefuddleIngestPipelineEngine — Sandboxed HTML → clean-text ingest pipeline
 *
 * Wraps a `worker_threads` worker that strips boilerplate, redacts prompt-
 * injection probes, and enforces hard size caps on raw HTML before downstream
 * embedding. Used by `/pdf-learn` (HTML / URL inputs) and `/url-ingest`.
 *
 * Hard guarantees the engine enforces on every output:
 *   1. ZERO `<script>` content, inline event handlers, `javascript:` URIs, or
 *      `<iframe>` tags reach the caller. Worker pre-strips them; engine scans
 *      the result and FAILS the call rather than returning residue.
 *   2. ZERO known prompt-injection override phrases survive in the body. The
 *      worker redacts them in place; the engine returns `overrideRedactions`
 *      so callers can audit.
 *   3. Bounded length: input ≤ 4 MiB ingested, output ≤ 256 KiB. Anything past
 *      the input cap is silently truncated and `inputTruncated: true` is set.
 *   4. Sandbox: the worker only has the standard `worker_threads` runtime; its
 *      `require` is replaced by an allow-listed wrapper. `fs`, `net`,
 *      `child_process`, `http`, `https`, `dns`, `tls`, `crypto`, `os` etc. are
 *      denied. Test 4 (sandbox-capability) asserts the deny path.
 *
 * The engine is a singleton — lazy-spawning a single worker per process. Call
 * `dispose()` from test teardown to terminate.
 *
 * P3-U04, INTEL-OLLAMA-OBSIDIAN-MS1.
 */

import { Worker } from "node:worker_threads";
import { fileURLToPath } from "node:url";
import { dirname, resolve as pathResolve } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// In TS source the worker sits at `engines/defuddle-worker.mjs`. After
// build/transpile the path is the same relative to the engine .js, so this
// resolves correctly under both vitest (TS) and prod (JS).
const WORKER_PATH = pathResolve(__dirname, "defuddle-worker.mjs");

export interface CleanOptions {
  /** Source URL. Forwarded to defuddle when the lib is present, otherwise informational. */
  url?: string;
  /** Hard timeout in ms. Default 8000. */
  timeoutMs?: number;
}

export interface CleanResult {
  /** Which extractor produced the body — "defuddle" if the optional lib was loaded, else "builtin". */
  extractor: "defuddle" | "builtin";
  title: string;
  content: string;
  wordCount: number;
  inputBytes: number;
  inputTruncated: boolean;
  outputTruncated: boolean;
  /** Number of prompt-injection overrides redacted from the body. */
  overrideRedactions: number;
  /** Names of any residue patterns the engine refused to leave in the output. Empty array = clean. */
  scriptResidue: string[];
}

export interface ProbeResult {
  allowed: boolean;
  message?: string;
}

interface PendingCall {
  resolve: (value: unknown) => void;
  reject: (err: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

const DEFAULT_TIMEOUT_MS = 8_000;
const HEALTH_PING_ID = 0;

export class DefuddleIngestPipelineEngine {
  private worker: Worker | null = null;
  private workerReady: Promise<void> | null = null;
  private nextId = 1;
  private pending = new Map<number, PendingCall>();

  private async ensureWorker(): Promise<Worker> {
    if (this.worker) return this.worker;
    const w = new Worker(WORKER_PATH, { stderr: true, stdout: true });
    this.worker = w;

    this.workerReady = new Promise<void>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error("defuddle worker did not signal ready in 5s")),
        5_000
      );
      const onMsg = (msg: { id: number; ok: boolean; result?: { ready?: boolean }; error?: string }) => {
        if (msg && msg.id === HEALTH_PING_ID && msg.ok && msg.result?.ready) {
          clearTimeout(timer);
          w.off("message", onMsg);
          resolve();
        }
      };
      w.on("message", onMsg);
    });

    w.on("message", (msg) => this.dispatchResponse(msg));
    w.on("error", (err) => this.failAll(err));
    w.on("exit", (code) => {
      if (code !== 0 && this.pending.size > 0) {
        this.failAll(new Error(`defuddle worker exited with code ${code}`));
      }
      this.worker = null;
      this.workerReady = null;
    });

    await this.workerReady;
    return w;
  }

  private dispatchResponse(msg: unknown): void {
    if (!msg || typeof msg !== "object") return;
    const m = msg as { id: number; ok: boolean; result?: unknown; error?: string };
    if (m.id === HEALTH_PING_ID) return;
    const pending = this.pending.get(m.id);
    if (!pending) return;
    this.pending.delete(m.id);
    clearTimeout(pending.timer);
    if (m.ok) pending.resolve(m.result);
    else pending.reject(new Error(m.error || "worker call failed"));
  }

  private failAll(err: Error): void {
    for (const [, pending] of this.pending) {
      clearTimeout(pending.timer);
      pending.reject(err);
    }
    this.pending.clear();
  }

  private async send<T>(payload: Record<string, unknown>, timeoutMs: number): Promise<T> {
    const w = await this.ensureWorker();
    const id = this.nextId++;
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`defuddle worker timed out after ${timeoutMs}ms`));
      }, timeoutMs);
      this.pending.set(id, {
        resolve: resolve as (value: unknown) => void,
        reject,
        timer,
      });
      w.postMessage({ id, ...payload });
    });
  }

  /**
   * Strip boilerplate, redact instruction overrides, and enforce the size caps
   * on `html`. Returns a `CleanResult`. Throws if the worker reports script
   * residue (defence against the cleaner being bypassed).
   */
  async cleanHtml(html: string, options: CleanOptions = {}): Promise<CleanResult> {
    if (typeof html !== "string") throw new Error("html must be a string");
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const result = await this.send<CleanResult>(
      { op: "clean", html, options: { url: options.url } },
      timeoutMs
    );
    if (Array.isArray(result.scriptResidue) && result.scriptResidue.length > 0) {
      throw new Error(
        `defuddle pipeline refused output — script residue detected: ${result.scriptResidue.join(", ")}`
      );
    }
    return result;
  }

  /**
   * Test-facing helper: ask the worker to attempt to load `spec` via its
   * locked require. Returns `{ allowed, message? }`. Used to assert the
   * sandbox capability allow-list.
   */
  async probeCapability(spec: string, timeoutMs = 2_000): Promise<ProbeResult> {
    if (typeof spec !== "string") throw new Error("spec must be a string");
    return this.send<ProbeResult>({ op: "probe", spec }, timeoutMs);
  }

  /** Tear down the worker. Safe to call multiple times. */
  async dispose(): Promise<void> {
    const w = this.worker;
    this.worker = null;
    this.workerReady = null;
    this.failAll(new Error("DefuddleIngestPipelineEngine disposed"));
    if (w) await w.terminate();
  }
}

export const defuddleIngestPipelineEngine = new DefuddleIngestPipelineEngine();
