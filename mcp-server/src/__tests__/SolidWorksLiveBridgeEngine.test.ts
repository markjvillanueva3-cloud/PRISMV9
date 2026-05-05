/**
 * Tests for SolidWorksLiveBridgeEngine — HTTP/COM/mock execution
 * (CAD-COMPLETE-MS0/U-CADC-PRINT-LIVE-WIRE01)
 *
 * Stubs HttpClient, ProcessRunner, TempFileSink via the engine's DI seam
 * so we can exercise every wire without a real SOLIDWORKS install.
 */

import { describe, it, expect } from "vitest";
import { SolidWorksLiveBridgeEngine } from "../engines/SolidWorksLiveBridgeEngine.js";
import type {
  HttpClient,
  HttpResponseLike,
  ProcessRunner,
  ProcessExecResult,
  TempFileSink,
} from "../engines/cadLiveDispatch.js";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

const BRIDGE_VERSION = "1.1.0";
const SAMPLE_SCRIPT = 'Sub Main\n    MsgBox "hello"\nEnd Sub\n';
const HTTP_ENDPOINT = "http://localhost:8081/sw/exec";

// ── Stubs ───────────────────────────────────────────────────────────────────

interface HttpStubLog {
  calls: number;
  lastUrl?: string;
  lastBody?: string;
  lastHeaders?: Record<string, string>;
}

function stubHttpClient(
  behavior: {
    status?: number;
    statusText?: string;
    json?: unknown;
    text?: string;
    throwError?: Error;
    parseError?: boolean;
    abort?: boolean;
  },
  log: HttpStubLog,
): HttpClient {
  return {
    async post(url, body, opts) {
      log.calls += 1;
      log.lastUrl = url;
      log.lastBody = body;
      log.lastHeaders = opts.headers;

      if (behavior.abort) {
        // Synthesize abort by waiting + throwing AbortError when signal fires
        await new Promise<void>((resolve, reject) => {
          opts.signal.addEventListener("abort", () => {
            reject(Object.assign(new Error("aborted"), { name: "AbortError" }));
          });
          // never resolves on its own
          setTimeout(resolve, 60_000);
        });
      }
      if (behavior.throwError) throw behavior.throwError;

      const status = behavior.status ?? 200;
      const ok = status >= 200 && status < 300;
      const res: HttpResponseLike = {
        ok,
        status,
        statusText: behavior.statusText ?? (ok ? "OK" : "Error"),
        async text() {
          return behavior.text ?? "";
        },
        async json<T = unknown>(): Promise<T> {
          if (behavior.parseError) throw new Error("Unexpected token < in JSON at position 0");
          return behavior.json as T;
        },
      };
      return res;
    },
  };
}

interface RunnerLog {
  calls: number;
  lastCmd?: string;
  lastArgs?: string[];
  lastTimeoutMs?: number;
}

function stubRunner(
  result: Partial<ProcessExecResult> & { throwError?: Error },
  log: RunnerLog,
): ProcessRunner {
  return {
    async run(command, args, opts) {
      log.calls += 1;
      log.lastCmd = command;
      log.lastArgs = args;
      log.lastTimeoutMs = opts.timeoutMs;
      if (result.throwError) throw result.throwError;
      return {
        exitCode: result.exitCode ?? 0,
        stdout: result.stdout ?? "",
        stderr: result.stderr ?? "",
        killed: result.killed ?? false,
      };
    },
  };
}

interface TempSinkLog {
  writes: number;
  removes: number;
  lastPath?: string;
  lastBody?: string;
}

function stubTempSink(log: TempSinkLog): TempFileSink {
  return {
    async write(prefix, ext, body) {
      log.writes += 1;
      log.lastBody = body;
      const p = path.join(os.tmpdir(), `${prefix}-stub-${Date.now()}.${ext}`);
      log.lastPath = p;
      // Don't actually create file — runner is stubbed too
      return p;
    },
    async remove(_p) {
      log.removes += 1;
    },
  };
}

// A real on-disk shim file for tests that exercise the existence check
function writeRealShim(): string {
  const p = path.join(os.tmpdir(), `prism-test-shim-${Date.now()}-${Math.random().toString(36).slice(2)}.vbs`);
  fs.writeFileSync(p, "WScript.Echo \"{}\"\n", "utf8");
  return p;
}

// ─────────────────────────────────────────────────────────────────────────────
// Identity + capabilities
// ─────────────────────────────────────────────────────────────────────────────

describe("SolidWorksLiveBridgeEngine — identity + capabilities", () => {
  it("singleton reports v1.1.0 and supports 3 modes", () => {
    const e = new SolidWorksLiveBridgeEngine();
    expect(e.version).toBe(BRIDGE_VERSION);
    expect([...e.supportedModes()].sort()).toEqual(["com", "http", "mock"]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// validate()
// ─────────────────────────────────────────────────────────────────────────────

describe("SolidWorksLiveBridgeEngine — validate()", () => {
  const e = new SolidWorksLiveBridgeEngine();

  it("rejects null config", () => {
    expect(e.validate(null as never).ok).toBe(false);
  });

  it("rejects unknown mode", () => {
    expect(e.validate({ mode: "ftp" as never }).ok).toBe(false);
  });

  it("rejects http without endpoint", () => {
    const r = e.validate({ mode: "http" });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/endpoint required/);
  });

  it("rejects com without comShimPath", () => {
    const r = e.validate({ mode: "com" });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/comShimPath required/);
  });

  it.each([
    [-1, "negative"],
    [50, "below min"],
    [Number.NaN, "NaN"],
    [Number.POSITIVE_INFINITY, "Infinity"],
    [10_000_000, "above max"],
  ])("rejects timeoutMs=%s (%s)", (t) => {
    expect(e.validate({ mode: "mock", timeoutMs: t }).ok).toBe(false);
  });

  it("accepts valid mock config", () => {
    expect(e.validate({ mode: "mock" }).ok).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// mock mode
// ─────────────────────────────────────────────────────────────────────────────

describe("SolidWorksLiveBridgeEngine — mock mode", () => {
  it("returns ok:true with synthetic metrics", async () => {
    const e = new SolidWorksLiveBridgeEngine();
    const r = await e.execute({
      script: SAMPLE_SCRIPT,
      config: { mode: "mock" },
    });
    expect(r.ok).toBe(true);
    expect(r.metrics?.volumeMm3).toBe(15_000);
    expect(r.metrics?.faceCount).toBe(6);
    expect(r.log).toMatch(/SolidWorks script accepted/);
  });

  it("accepts CADScript<string> shape (script.body)", async () => {
    const e = new SolidWorksLiveBridgeEngine();
    const r = await e.execute({
      script: { body: SAMPLE_SCRIPT, imports: [], language: "vba", filename: "x.bas", version: "1" } as unknown as { body: string },
      config: { mode: "mock" },
    } as Parameters<SolidWorksLiveBridgeEngine["execute"]>[0]);
    expect(r.ok).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// HTTP mode — happy + 3 failure modes
// ─────────────────────────────────────────────────────────────────────────────

describe("SolidWorksLiveBridgeEngine — http mode", () => {
  it("happy path: POSTs body, parses JSON, returns ok=true with metrics", async () => {
    const log: HttpStubLog = { calls: 0 };
    const http = stubHttpClient(
      {
        status: 200,
        json: {
          ok: true,
          metrics: { volumeMm3: 1234, boundingBoxMm: [10, 20, 5], faceCount: 8, bodyCount: 1 },
          log: "remote-success",
          durationMs: 42,
        },
      },
      log,
    );
    const e = new SolidWorksLiveBridgeEngine({ http });
    const r = await e.execute({
      script: SAMPLE_SCRIPT,
      config: { mode: "http", endpoint: HTTP_ENDPOINT },
    });
    expect(r.ok).toBe(true);
    expect(r.metrics?.volumeMm3).toBe(1234);
    expect(r.log).toBe("remote-success");
    expect(r.durationMs).toBe(42);

    expect(log.calls).toBe(1);
    expect(log.lastUrl).toBe(HTTP_ENDPOINT);
    expect(log.lastBody).toBe(SAMPLE_SCRIPT);
    expect(log.lastHeaders?.["Content-Type"]).toMatch(/text\/plain/);
  });

  it("FAILURE: HTTP 500 surfaces as ok:false with status text + body tail", async () => {
    const log: HttpStubLog = { calls: 0 };
    const http = stubHttpClient(
      { status: 500, statusText: "Internal Server Error", text: "stack overflow at line 42" },
      log,
    );
    const e = new SolidWorksLiveBridgeEngine({ http });
    const r = await e.execute({
      script: SAMPLE_SCRIPT,
      config: { mode: "http", endpoint: HTTP_ENDPOINT },
    });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/HTTP 500/);
    expect(r.error).toMatch(/Internal Server Error/);
    expect(r.error).toMatch(/stack overflow/);
  });

  it("FAILURE: malformed JSON surfaces parse error", async () => {
    const log: HttpStubLog = { calls: 0 };
    const http = stubHttpClient({ status: 200, parseError: true }, log);
    const e = new SolidWorksLiveBridgeEngine({ http });
    const r = await e.execute({
      script: SAMPLE_SCRIPT,
      config: { mode: "http", endpoint: HTTP_ENDPOINT },
    });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/not parseable JSON/);
  });

  it("FAILURE: transport error (e.g. ECONNREFUSED) surfaces as transport error", async () => {
    const log: HttpStubLog = { calls: 0 };
    const http = stubHttpClient({ throwError: new Error("ECONNREFUSED 127.0.0.1:8081") }, log);
    const e = new SolidWorksLiveBridgeEngine({ http });
    const r = await e.execute({
      script: SAMPLE_SCRIPT,
      config: { mode: "http", endpoint: HTTP_ENDPOINT },
    });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/transport error/);
    expect(r.error).toMatch(/ECONNREFUSED/);
  });

  it("FAILURE: timeout — abort controller fires after timeoutMs", async () => {
    const log: HttpStubLog = { calls: 0 };
    const http = stubHttpClient({ abort: true }, log);
    const e = new SolidWorksLiveBridgeEngine({ http });
    const r = await e.execute({
      script: SAMPLE_SCRIPT,
      config: { mode: "http", endpoint: HTTP_ENDPOINT, timeoutMs: 100 },
    });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/aborted after 100ms/);
  }, 5_000);

  it("FAILURE: remote returns ok:false — surfaces remote error message", async () => {
    const log: HttpStubLog = { calls: 0 };
    const http = stubHttpClient(
      { status: 200, json: { ok: false, error: "macro compile failed: undeclared variable foo" } },
      log,
    );
    const e = new SolidWorksLiveBridgeEngine({ http });
    const r = await e.execute({
      script: SAMPLE_SCRIPT,
      config: { mode: "http", endpoint: HTTP_ENDPOINT },
    });
    expect(r.ok).toBe(false);
    expect(r.error).toBe("macro compile failed: undeclared variable foo");
  });

  it("FAILURE: response is not a JSON object — surfaces shape error", async () => {
    const log: HttpStubLog = { calls: 0 };
    const http = stubHttpClient({ status: 200, json: "just a string" }, log);
    const e = new SolidWorksLiveBridgeEngine({ http });
    const r = await e.execute({
      script: SAMPLE_SCRIPT,
      config: { mode: "http", endpoint: HTTP_ENDPOINT },
    });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/not a JSON object/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// COM mode — happy + 3 failure modes
// ─────────────────────────────────────────────────────────────────────────────

describe("SolidWorksLiveBridgeEngine — com mode", () => {
  it("happy path: writes temp file, runs cscript with shim+temp args, parses last JSON line", async () => {
    const shim = writeRealShim();
    const runnerLog: RunnerLog = { calls: 0 };
    const sinkLog: TempSinkLog = { writes: 0, removes: 0 };
    const runner = stubRunner(
      {
        exitCode: 0,
        stdout: 'starting...\nopening solidworks\n{"ok": true, "metrics": {"volumeMm3": 9999, "boundingBoxMm": [5,5,5], "faceCount": 4, "bodyCount": 1}}\n',
      },
      runnerLog,
    );
    const tempSink = stubTempSink(sinkLog);

    try {
      const e = new SolidWorksLiveBridgeEngine({ runner, tempSink });
      const r = await e.execute({
        script: SAMPLE_SCRIPT,
        config: { mode: "com", comShimPath: shim, timeoutMs: 5_000 },
      });
      expect(r.ok).toBe(true);
      expect(r.metrics?.volumeMm3).toBe(9999);

      // cscript called with the right args
      expect(runnerLog.lastCmd).toBe("cscript.exe");
      expect(runnerLog.lastArgs?.[0]).toBe("//nologo");
      expect(runnerLog.lastArgs?.[1]).toBe("//B");
      expect(runnerLog.lastArgs?.[2]).toMatch(/^\/\/T:\d+$/);
      expect(runnerLog.lastArgs?.[3]).toBe(shim);
      expect(runnerLog.lastArgs?.[4]).toBe(sinkLog.lastPath);

      // Temp file body = the script body, and cleanup ran
      expect(sinkLog.lastBody).toBe(SAMPLE_SCRIPT);
      expect(sinkLog.removes).toBe(1);
    } finally {
      try { fs.unlinkSync(shim); } catch { /* ignore */ }
    }
  });

  it("FAILURE: nonexistent comShimPath rejected before spawn", async () => {
    const runnerLog: RunnerLog = { calls: 0 };
    const sinkLog: TempSinkLog = { writes: 0, removes: 0 };
    const e = new SolidWorksLiveBridgeEngine({
      runner: stubRunner({ exitCode: 0 }, runnerLog),
      tempSink: stubTempSink(sinkLog),
    });
    const r = await e.execute({
      script: SAMPLE_SCRIPT,
      config: { mode: "com", comShimPath: "C:\\definitely\\does\\not\\exist.vbs" },
    });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/does not exist/);
    expect(runnerLog.calls).toBe(0); // never spawned
    expect(sinkLog.writes).toBe(0);  // never wrote temp
  });

  it("FAILURE: cscript exits non-zero — surfaces stderr tail", async () => {
    const shim = writeRealShim();
    const runnerLog: RunnerLog = { calls: 0 };
    const sinkLog: TempSinkLog = { writes: 0, removes: 0 };
    const runner = stubRunner(
      { exitCode: 1, stderr: "Microsoft VBScript compilation error: Expected statement at line 3" },
      runnerLog,
    );
    try {
      const e = new SolidWorksLiveBridgeEngine({ runner, tempSink: stubTempSink(sinkLog) });
      const r = await e.execute({
        script: SAMPLE_SCRIPT,
        config: { mode: "com", comShimPath: shim },
      });
      expect(r.ok).toBe(false);
      expect(r.error).toMatch(/exited 1/);
      expect(r.error).toMatch(/VBScript compilation error/);
      expect(sinkLog.removes).toBe(1); // cleanup still ran
    } finally {
      try { fs.unlinkSync(shim); } catch { /* ignore */ }
    }
  });

  it("FAILURE: stdout has no JSON line — surfaces shim contract violation", async () => {
    const shim = writeRealShim();
    const runnerLog: RunnerLog = { calls: 0 };
    const sinkLog: TempSinkLog = { writes: 0, removes: 0 };
    const runner = stubRunner(
      { exitCode: 0, stdout: "starting...\nworking...\ndone (no JSON for you)\n" },
      runnerLog,
    );
    try {
      const e = new SolidWorksLiveBridgeEngine({ runner, tempSink: stubTempSink(sinkLog) });
      const r = await e.execute({
        script: SAMPLE_SCRIPT,
        config: { mode: "com", comShimPath: shim },
      });
      expect(r.ok).toBe(false);
      expect(r.error).toMatch(/no JSON line on stdout/);
    } finally {
      try { fs.unlinkSync(shim); } catch { /* ignore */ }
    }
  });

  it("FAILURE: runner reports killed — surfaces timeout", async () => {
    const shim = writeRealShim();
    const runnerLog: RunnerLog = { calls: 0 };
    const sinkLog: TempSinkLog = { writes: 0, removes: 0 };
    const runner = stubRunner(
      { exitCode: 137, killed: true, stdout: "", stderr: "" },
      runnerLog,
    );
    try {
      const e = new SolidWorksLiveBridgeEngine({ runner, tempSink: stubTempSink(sinkLog) });
      const r = await e.execute({
        script: SAMPLE_SCRIPT,
        config: { mode: "com", comShimPath: shim, timeoutMs: 200 },
      });
      expect(r.ok).toBe(false);
      expect(r.error).toMatch(/killed after 200ms/);
    } finally {
      try { fs.unlinkSync(shim); } catch { /* ignore */ }
    }
  });

  it("ADVERSARIAL: spawn throws (ENOENT) — caught + cleanup runs", async () => {
    const shim = writeRealShim();
    const runnerLog: RunnerLog = { calls: 0 };
    const sinkLog: TempSinkLog = { writes: 0, removes: 0 };
    const runner = stubRunner(
      { throwError: Object.assign(new Error("spawn cscript.exe ENOENT"), { code: "ENOENT" }) },
      runnerLog,
    );
    try {
      const e = new SolidWorksLiveBridgeEngine({ runner, tempSink: stubTempSink(sinkLog) });
      const r = await e.execute({
        script: SAMPLE_SCRIPT,
        config: { mode: "com", comShimPath: shim },
      });
      expect(r.ok).toBe(false);
      expect(r.error).toMatch(/COM dispatch failed/);
      expect(r.error).toMatch(/ENOENT/);
      expect(sinkLog.removes).toBe(1); // cleanup ran in finally
    } finally {
      try { fs.unlinkSync(shim); } catch { /* ignore */ }
    }
  });

  it("ADVERSARIAL: stdout has multiple JSON lines — picks the LAST one", async () => {
    const shim = writeRealShim();
    const runnerLog: RunnerLog = { calls: 0 };
    const sinkLog: TempSinkLog = { writes: 0, removes: 0 };
    const runner = stubRunner(
      {
        exitCode: 0,
        stdout: '{"ok":false,"error":"first attempt"}\n{"ok":true,"metrics":{"volumeMm3":777}}\n',
      },
      runnerLog,
    );
    try {
      const e = new SolidWorksLiveBridgeEngine({ runner, tempSink: stubTempSink(sinkLog) });
      const r = await e.execute({
        script: SAMPLE_SCRIPT,
        config: { mode: "com", comShimPath: shim },
      });
      expect(r.ok).toBe(true);
      expect(r.metrics?.volumeMm3).toBe(777);
    } finally {
      try { fs.unlinkSync(shim); } catch { /* ignore */ }
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Adversarial inputs (cross-mode)
// ─────────────────────────────────────────────────────────────────────────────

describe("SolidWorksLiveBridgeEngine — adversarial inputs", () => {
  it("empty script body rejected before transport", async () => {
    const log: HttpStubLog = { calls: 0 };
    const http = stubHttpClient({ status: 200, json: { ok: true } }, log);
    const e = new SolidWorksLiveBridgeEngine({ http });
    const r = await e.execute({
      script: "",
      config: { mode: "http", endpoint: HTTP_ENDPOINT },
    });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/script body is empty/);
    expect(log.calls).toBe(0);
  });

  it("oversize script body rejected (>16MB cap)", async () => {
    const log: HttpStubLog = { calls: 0 };
    const http = stubHttpClient({ status: 200, json: { ok: true } }, log);
    const e = new SolidWorksLiveBridgeEngine({ http });
    const huge = "x".repeat(17 * 1024 * 1024);
    const r = await e.execute({
      script: huge,
      config: { mode: "http", endpoint: HTTP_ENDPOINT },
    });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/too large/);
    expect(log.calls).toBe(0);
  });

  it("non-string non-CADScript script throws TypeError-style", async () => {
    const e = new SolidWorksLiveBridgeEngine();
    await expect(
      e.execute({
        // @ts-expect-error — testing runtime behavior on bad input
        script: 12345,
        config: { mode: "mock" },
      }),
    ).rejects.toThrow(/script must be a string or CADScript/);
  });

  it("invalid config (mode='ftp') returns ok:false without throwing", async () => {
    const e = new SolidWorksLiveBridgeEngine();
    const r = await e.execute({
      script: SAMPLE_SCRIPT,
      // @ts-expect-error — testing runtime behavior on bad input
      config: { mode: "ftp" },
    });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/unknown execution mode/);
  });
});
