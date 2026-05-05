/**
 * Tests for EspritLiveBridgeEngine — HTTP/COM/mock execution
 * (CAD-COMPLETE-MS0/U-CADC-PRINT-LIVE-WIRE01)
 *
 * Uses DI seam to stub HttpClient + ProcessRunner + TempFileSink — exercises
 * the full transport without a real Esprit install.
 */

import { describe, it, expect } from "vitest";
import { EspritLiveBridgeEngine } from "../engines/EspritLiveBridgeEngine.js";
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
const SAMPLE_SCRIPT = 'Imports Esprit\nModule M\n  Sub Main()\n  End Sub\nEnd Module\n';
const HTTP_ENDPOINT = "http://localhost:8082/esprit/exec";

// ── Stubs ───────────────────────────────────────────────────────────────────

interface HttpStubLog {
  calls: number;
  lastUrl?: string;
  lastBody?: string;
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
      if (behavior.abort) {
        await new Promise<void>((resolve, reject) => {
          opts.signal.addEventListener("abort", () => {
            reject(Object.assign(new Error("aborted"), { name: "AbortError" }));
          });
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
          if (behavior.parseError) throw new Error("Unexpected token < at position 0");
          return behavior.json as T;
        },
      };
      return res;
    },
  };
}

interface RunnerLog {
  calls: number;
  lastArgs?: string[];
}

function stubRunner(
  result: Partial<ProcessExecResult> & { throwError?: Error },
  log: RunnerLog,
): ProcessRunner {
  return {
    async run(_command, args, _opts) {
      log.calls += 1;
      log.lastArgs = args;
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
  lastExt?: string;
}

function stubTempSink(log: TempSinkLog): TempFileSink {
  return {
    async write(prefix, ext, body) {
      log.writes += 1;
      log.lastBody = body;
      log.lastExt = ext;
      const p = path.join(os.tmpdir(), `${prefix}-stub-${Date.now()}.${ext}`);
      log.lastPath = p;
      return p;
    },
    async remove(_p) {
      log.removes += 1;
    },
  };
}

function writeRealShim(): string {
  const p = path.join(os.tmpdir(), `prism-test-shim-${Date.now()}-${Math.random().toString(36).slice(2)}.vbs`);
  fs.writeFileSync(p, "WScript.Echo \"{}\"\n", "utf8");
  return p;
}

// ─────────────────────────────────────────────────────────────────────────────

describe("EspritLiveBridgeEngine — identity + capabilities", () => {
  it("singleton reports v1.1.0 and supports 3 modes", () => {
    const e = new EspritLiveBridgeEngine();
    expect(e.version).toBe(BRIDGE_VERSION);
    expect([...e.supportedModes()].sort()).toEqual(["com", "http", "mock"]);
  });
});

describe("EspritLiveBridgeEngine — validate()", () => {
  const e = new EspritLiveBridgeEngine();

  it("rejects null config", () => {
    expect(e.validate(null as never).ok).toBe(false);
  });

  it("rejects unknown mode", () => {
    expect(e.validate({ mode: "ftp" as never }).ok).toBe(false);
  });

  it("rejects http without endpoint", () => {
    expect(e.validate({ mode: "http" }).ok).toBe(false);
  });

  it("rejects com without comShimPath", () => {
    expect(e.validate({ mode: "com" }).ok).toBe(false);
  });

  it.each([
    [-1, "negative"],
    [50, "below min"],
    [Number.NaN, "NaN"],
    [Number.POSITIVE_INFINITY, "Infinity"],
  ])("rejects timeoutMs=%s (%s)", (t) => {
    expect(e.validate({ mode: "mock", timeoutMs: t }).ok).toBe(false);
  });

  it("accepts valid mock config", () => {
    expect(e.validate({ mode: "mock" }).ok).toBe(true);
  });
});

describe("EspritLiveBridgeEngine — mock mode", () => {
  it("returns ok:true with synthetic metrics (Esprit-branded volume)", async () => {
    const e = new EspritLiveBridgeEngine();
    const r = await e.execute({
      script: SAMPLE_SCRIPT,
      config: { mode: "mock" },
    });
    expect(r.ok).toBe(true);
    expect(r.metrics?.volumeMm3).toBe(8_000); // Esprit-specific mock volume
    expect(r.log).toMatch(/Esprit script accepted/);
  });
});

describe("EspritLiveBridgeEngine — http mode", () => {
  it("happy path: POST + parse JSON + return metrics", async () => {
    const log: HttpStubLog = { calls: 0 };
    const http = stubHttpClient(
      {
        status: 200,
        json: {
          ok: true,
          metrics: { volumeMm3: 555, boundingBoxMm: [3, 4, 5], faceCount: 6, bodyCount: 1 },
          durationMs: 17,
        },
      },
      log,
    );
    const e = new EspritLiveBridgeEngine({ http });
    const r = await e.execute({
      script: SAMPLE_SCRIPT,
      config: { mode: "http", endpoint: HTTP_ENDPOINT },
    });
    expect(r.ok).toBe(true);
    expect(r.metrics?.volumeMm3).toBe(555);
    expect(log.lastUrl).toBe(HTTP_ENDPOINT);
    expect(log.lastBody).toBe(SAMPLE_SCRIPT);
  });

  it("FAILURE: HTTP 503 surfaces", async () => {
    const log: HttpStubLog = { calls: 0 };
    const http = stubHttpClient(
      { status: 503, statusText: "Service Unavailable", text: "esprit busy" },
      log,
    );
    const e = new EspritLiveBridgeEngine({ http });
    const r = await e.execute({
      script: SAMPLE_SCRIPT,
      config: { mode: "http", endpoint: HTTP_ENDPOINT },
    });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/HTTP 503/);
    expect(r.error).toMatch(/EspritLiveBridge/);
    expect(r.error).toMatch(/esprit busy/);
  });

  it("FAILURE: malformed JSON", async () => {
    const log: HttpStubLog = { calls: 0 };
    const http = stubHttpClient({ status: 200, parseError: true }, log);
    const e = new EspritLiveBridgeEngine({ http });
    const r = await e.execute({
      script: SAMPLE_SCRIPT,
      config: { mode: "http", endpoint: HTTP_ENDPOINT },
    });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/not parseable JSON/);
  });

  it("FAILURE: transport error (DNS)", async () => {
    const log: HttpStubLog = { calls: 0 };
    const http = stubHttpClient({ throwError: new Error("EAI_AGAIN getaddrinfo") }, log);
    const e = new EspritLiveBridgeEngine({ http });
    const r = await e.execute({
      script: SAMPLE_SCRIPT,
      config: { mode: "http", endpoint: HTTP_ENDPOINT },
    });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/transport error/);
    expect(r.error).toMatch(/EAI_AGAIN/);
  });

  it("FAILURE: timeout aborts request", async () => {
    const log: HttpStubLog = { calls: 0 };
    const http = stubHttpClient({ abort: true }, log);
    const e = new EspritLiveBridgeEngine({ http });
    const r = await e.execute({
      script: SAMPLE_SCRIPT,
      config: { mode: "http", endpoint: HTTP_ENDPOINT, timeoutMs: 100 },
    });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/aborted after 100ms/);
  }, 5_000);

  it("FAILURE: remote ok:false surfaces remote error", async () => {
    const log: HttpStubLog = { calls: 0 };
    const http = stubHttpClient(
      { status: 200, json: { ok: false, error: "Esprit COM init: -2147023174" } },
      log,
    );
    const e = new EspritLiveBridgeEngine({ http });
    const r = await e.execute({
      script: SAMPLE_SCRIPT,
      config: { mode: "http", endpoint: HTTP_ENDPOINT },
    });
    expect(r.ok).toBe(false);
    expect(r.error).toBe("Esprit COM init: -2147023174");
  });
});

describe("EspritLiveBridgeEngine — com mode", () => {
  it("happy path: writes .vb temp file, parses last JSON line", async () => {
    const shim = writeRealShim();
    const runnerLog: RunnerLog = { calls: 0 };
    const sinkLog: TempSinkLog = { writes: 0, removes: 0 };
    const runner = stubRunner(
      {
        exitCode: 0,
        stdout: 'init...\nopened\n{"ok":true,"metrics":{"volumeMm3":3001,"boundingBoxMm":[2,3,4],"faceCount":5,"bodyCount":1}}\n',
      },
      runnerLog,
    );

    try {
      const e = new EspritLiveBridgeEngine({ runner, tempSink: stubTempSink(sinkLog) });
      const r = await e.execute({
        script: SAMPLE_SCRIPT,
        config: { mode: "com", comShimPath: shim, timeoutMs: 5_000 },
      });
      expect(r.ok).toBe(true);
      expect(r.metrics?.volumeMm3).toBe(3001);

      // Esprit uses .vb extension (vs SW's .bas)
      expect(sinkLog.lastExt).toBe("vb");
      expect(sinkLog.lastBody).toBe(SAMPLE_SCRIPT);
      expect(sinkLog.removes).toBe(1);
    } finally {
      try { fs.unlinkSync(shim); } catch { /* ignore */ }
    }
  });

  it("FAILURE: nonexistent shim rejected before spawn", async () => {
    const runnerLog: RunnerLog = { calls: 0 };
    const sinkLog: TempSinkLog = { writes: 0, removes: 0 };
    const e = new EspritLiveBridgeEngine({
      runner: stubRunner({}, runnerLog),
      tempSink: stubTempSink(sinkLog),
    });
    const r = await e.execute({
      script: SAMPLE_SCRIPT,
      config: { mode: "com", comShimPath: "/nope/nope/missing.vbs" },
    });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/does not exist/);
    expect(runnerLog.calls).toBe(0);
  });

  it("FAILURE: cscript exits non-zero", async () => {
    const shim = writeRealShim();
    const runnerLog: RunnerLog = { calls: 0 };
    const sinkLog: TempSinkLog = { writes: 0, removes: 0 };
    const runner = stubRunner({ exitCode: 2, stderr: "Esprit license check failed" }, runnerLog);
    try {
      const e = new EspritLiveBridgeEngine({ runner, tempSink: stubTempSink(sinkLog) });
      const r = await e.execute({
        script: SAMPLE_SCRIPT,
        config: { mode: "com", comShimPath: shim },
      });
      expect(r.ok).toBe(false);
      expect(r.error).toMatch(/exited 2/);
      expect(r.error).toMatch(/license check failed/);
    } finally {
      try { fs.unlinkSync(shim); } catch { /* ignore */ }
    }
  });

  it("FAILURE: stdout empty (no JSON line)", async () => {
    const shim = writeRealShim();
    const runnerLog: RunnerLog = { calls: 0 };
    const sinkLog: TempSinkLog = { writes: 0, removes: 0 };
    const runner = stubRunner({ exitCode: 0, stdout: "" }, runnerLog);
    try {
      const e = new EspritLiveBridgeEngine({ runner, tempSink: stubTempSink(sinkLog) });
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

  it("FAILURE: killed by timeout", async () => {
    const shim = writeRealShim();
    const runnerLog: RunnerLog = { calls: 0 };
    const sinkLog: TempSinkLog = { writes: 0, removes: 0 };
    const runner = stubRunner({ exitCode: 137, killed: true }, runnerLog);
    try {
      const e = new EspritLiveBridgeEngine({ runner, tempSink: stubTempSink(sinkLog) });
      const r = await e.execute({
        script: SAMPLE_SCRIPT,
        config: { mode: "com", comShimPath: shim, timeoutMs: 250 },
      });
      expect(r.ok).toBe(false);
      expect(r.error).toMatch(/killed after 250ms/);
    } finally {
      try { fs.unlinkSync(shim); } catch { /* ignore */ }
    }
  });

  it("ADVERSARIAL: spawn ENOENT — caught + cleanup", async () => {
    const shim = writeRealShim();
    const runnerLog: RunnerLog = { calls: 0 };
    const sinkLog: TempSinkLog = { writes: 0, removes: 0 };
    const runner = stubRunner(
      { throwError: Object.assign(new Error("spawn cscript.exe ENOENT"), { code: "ENOENT" }) },
      runnerLog,
    );
    try {
      const e = new EspritLiveBridgeEngine({ runner, tempSink: stubTempSink(sinkLog) });
      const r = await e.execute({
        script: SAMPLE_SCRIPT,
        config: { mode: "com", comShimPath: shim },
      });
      expect(r.ok).toBe(false);
      expect(r.error).toMatch(/COM dispatch failed/);
      expect(sinkLog.removes).toBe(1);
    } finally {
      try { fs.unlinkSync(shim); } catch { /* ignore */ }
    }
  });

  it("ADVERSARIAL: stdout has noise + JSON in middle — picks last JSON line", async () => {
    const shim = writeRealShim();
    const runnerLog: RunnerLog = { calls: 0 };
    const sinkLog: TempSinkLog = { writes: 0, removes: 0 };
    const runner = stubRunner(
      {
        exitCode: 0,
        stdout: 'noise\n{"ok":false,"error":"first"}\nmore noise\n{"ok":true,"metrics":{"volumeMm3":42}}\nfooter\n',
      },
      runnerLog,
    );
    try {
      const e = new EspritLiveBridgeEngine({ runner, tempSink: stubTempSink(sinkLog) });
      const r = await e.execute({
        script: SAMPLE_SCRIPT,
        config: { mode: "com", comShimPath: shim },
      });
      expect(r.ok).toBe(true);
      expect(r.metrics?.volumeMm3).toBe(42);
    } finally {
      try { fs.unlinkSync(shim); } catch { /* ignore */ }
    }
  });
});

describe("EspritLiveBridgeEngine — adversarial inputs", () => {
  it("empty body rejected", async () => {
    const log: HttpStubLog = { calls: 0 };
    const http = stubHttpClient({ status: 200, json: { ok: true } }, log);
    const e = new EspritLiveBridgeEngine({ http });
    const r = await e.execute({
      script: "",
      config: { mode: "http", endpoint: HTTP_ENDPOINT },
    });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/script body is empty/);
    expect(log.calls).toBe(0);
  });

  it("oversize body rejected (>16MB)", async () => {
    const log: HttpStubLog = { calls: 0 };
    const http = stubHttpClient({ status: 200, json: { ok: true } }, log);
    const e = new EspritLiveBridgeEngine({ http });
    const huge = "y".repeat(17 * 1024 * 1024);
    const r = await e.execute({
      script: huge,
      config: { mode: "http", endpoint: HTTP_ENDPOINT },
    });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/too large/);
    expect(log.calls).toBe(0);
  });

  it("non-string non-CADScript script throws", async () => {
    const e = new EspritLiveBridgeEngine();
    await expect(
      e.execute({
        // @ts-expect-error — testing runtime behavior on bad input
        script: 999,
        config: { mode: "mock" },
      }),
    ).rejects.toThrow(/script must be a string or CADScript/);
  });

  it("bad mode returns ok:false without throwing", async () => {
    const e = new EspritLiveBridgeEngine();
    const r = await e.execute({
      script: SAMPLE_SCRIPT,
      // @ts-expect-error — runtime behavior on bad input
      config: { mode: "smtp" },
    });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/unknown execution mode/);
  });
});
