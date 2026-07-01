/**
 * GpuStackHealthEngine tests — BLACKWELL-AI-MS0 / U-PYGPU-HEALTH.
 *
 * Hermetic via an injected HealthReader (no Python needed) for every gate
 * scenario, plus a skip-soft REAL-PYTHON E2E against the live gpu_health.py so
 * the default execFile path is proven against real bytes (RGS-MS1 lesson).
 */
import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import * as path from "node:path";
import {
  GpuStackHealthEngine,
  GPU_HEALTH_TIMEOUT_MS,
  HEALTH_CACHE_TTL_MS,
  HEALTH_NOT_READY_CACHE_TTL_MS,
  type HealthReader,
  type GpuHealthRawReport,
} from "../engines/GpuStackHealthEngine.js";
import { PATHS } from "../constants.js";

/** Build an engine whose reader returns a canned gpu_health.py report. */
function engineWith(report: Partial<GpuHealthRawReport> | null, exitCode = 0, stderr = "") {
  const reader: HealthReader = {
    runGpuHealth: async () => ({
      stdout: report === null ? "not json at all\n" : JSON.stringify(report) + "\n",
      stderr,
      exitCode,
    }),
  };
  return new GpuStackHealthEngine(reader);
}

const READY_REPORT: GpuHealthRawReport = {
  schemaVersion: "1.0.0",
  ready: true,
  torch_ready: true,
  qlora_ready: true,
  torch_version: "2.11.0+cu129",
  cuda_available: true,
  device_name: "NVIDIA RTX PRO 6000 Blackwell Workstation Edition",
  capability: [12, 0],
  sm_tag: "sm_120",
  sm_supported: true,
  gpu_matmul_ok: true,
  bnb_4bit_ok: true,
  bnb_detail: "bitsandbytes 0.48 NF4 ok",
  errors: [],
  warnings: [],
  python_executable: "H:/Tools/python-gpu/python.exe",
};

const NO_TORCH_REPORT: GpuHealthRawReport = {
  schemaVersion: "1.0.0",
  ready: false,
  torch_ready: false,
  qlora_ready: false,
  cuda_available: false,
  capability: null,
  sm_supported: false,
  gpu_matmul_ok: false,
  bnb_4bit_ok: null,
  errors: ["torch_not_importable: No module named 'torch'"],
  warnings: [],
  python_executable: "H:/Tools/python/python.exe",
};

describe("GpuStackHealthEngine", () => {
  it("ready stack → ready + qloraReady true, source live, capability parsed", async () => {
    const e = engineWith(READY_REPORT, 0);
    const r = await e.check({ pythonPath: "py" });
    expect(r.ready).toBe(true);
    expect(r.torchReady).toBe(true);
    expect(r.qloraReady).toBe(true);
    expect(r.capability).toEqual([12, 0]);
    expect(r.smTag).toBe("sm_120");
    expect(r.bnb4bitOk).toBe(true);
    expect(r.source).toBe("live");
    expect(r.exitCode).toBe(0);
    expect(r.pythonSource).toBe("explicit");
  });

  it("no-torch stack → ready false, exitCode surfaced, errors populated (never silently true)", async () => {
    const e = engineWith(NO_TORCH_REPORT, 1);
    const r = await e.check({ pythonPath: "py" });
    expect(r.ready).toBe(false);
    expect(r.qloraReady).toBe(false);
    expect(r.exitCode).toBe(1);
    expect(r.errors[0]).toContain("torch_not_importable");
    expect(r.source).toBe("live"); // JSON parsed even on exit 1
  });

  it("bnb tri-state: undefined → null (NOT coerced to false)", async () => {
    const e = engineWith({ ...READY_REPORT, bnb_4bit_ok: undefined }, 0);
    const r = await e.check({ pythonPath: "py" });
    expect(r.bnb4bitOk).toBeNull();
    expect(r.ready).toBe(true); // foundational gate unaffected by missing bnb
  });

  it("requireBnb gate: bnb broken → qloraReady false, assert(requireBnb) throws", async () => {
    const e = engineWith({ ...READY_REPORT, qlora_ready: false, bnb_4bit_ok: false }, 0);
    const r = await e.check({ pythonPath: "py", requireBnb: true });
    expect(r.ready).toBe(true);      // torch foundational still ready
    expect(r.qloraReady).toBe(false);
    await expect(e.assertReady({ pythonPath: "py", requireBnb: true })).rejects.toThrow(/QLoRA-ready/);
  });

  it("assertReady throws on not-ready and carries .health", async () => {
    const e = engineWith(NO_TORCH_REPORT, 1);
    await expect(e.assertReady({ pythonPath: "py" })).rejects.toMatchObject({
      health: { ready: false, exitCode: 1 },
    });
  });

  it("assertReady resolves on ready", async () => {
    const e = engineWith(READY_REPORT, 0);
    const r = await e.assertReady({ pythonPath: "py" });
    expect(r.ready).toBe(true);
  });

  it("no-JSON stdout → degraded, ready false, health_script_no_json error", async () => {
    const e = engineWith(null, 1, "Traceback (most recent call last): ...");
    const r = await e.check({ pythonPath: "py" });
    expect(r.ready).toBe(false);
    expect(r.source).toBe("degraded");
    expect(r.raw).toBeNull();
    expect(r.errors.some((x) => x.startsWith("health_script_no_json"))).toBe(true);
  });

  it("reader throw → degraded with health_reader_failed (never wedges)", async () => {
    const reader: HealthReader = { runGpuHealth: async () => { throw new Error("spawn exploded"); } };
    const e = new GpuStackHealthEngine(reader);
    const r = await e.check({ pythonPath: "py" });
    expect(r.ready).toBe(false);
    expect(r.source).toBe("degraded");
    expect(r.errors.some((x) => x.includes("health_reader_failed"))).toBe(true);
  });

  it("default python source adds a wrong-interpreter warning", async () => {
    const prevGpu = process.env.PRISM_PYTHON_GPU_PATH;
    const prevPy = process.env.PRISM_PYTHON_PATH;
    delete process.env.PRISM_PYTHON_GPU_PATH;
    delete process.env.PRISM_PYTHON_PATH;
    try {
      const e = engineWith(READY_REPORT, 0);
      const r = await e.check();
      expect(r.pythonSource).toBe("default");
      expect(r.warnings.some((w) => w.includes("CPU-only"))).toBe(true);
    } finally {
      if (prevGpu !== undefined) process.env.PRISM_PYTHON_GPU_PATH = prevGpu;
      if (prevPy !== undefined) process.env.PRISM_PYTHON_PATH = prevPy;
    }
  });

  it("caches within TTL, force re-runs, requireBnb change busts cache, TTL expiry re-runs", async () => {
    let calls = 0;
    const reader: HealthReader = {
      runGpuHealth: async () => { calls += 1; return { stdout: JSON.stringify(READY_REPORT) + "\n", stderr: "", exitCode: 0 }; },
    };
    const e = new GpuStackHealthEngine(reader);
    const t0 = 1_000_000;
    await e.check({ pythonPath: "py", nowMs: t0 });
    expect(calls).toBe(1);
    const cached = await e.check({ pythonPath: "py", nowMs: t0 + 1000 });
    expect(cached.source).toBe("cached");
    expect(calls).toBe(1);
    await e.check({ pythonPath: "py", nowMs: t0 + 2000, force: true });
    expect(calls).toBe(2);
    await e.check({ pythonPath: "py", nowMs: t0 + 2500, requireBnb: true });
    expect(calls).toBe(3);
    await e.check({ pythonPath: "py", nowMs: t0 + HEALTH_CACHE_TTL_MS + 3000 });
    expect(calls).toBe(4);
  });

  it("requireBnb passes --require-bnb to the script", async () => {
    let seenArgs: string[] = [];
    const reader: HealthReader = {
      runGpuHealth: async (_py, _script, args) => { seenArgs = args; return { stdout: JSON.stringify(READY_REPORT) + "\n", stderr: "", exitCode: 0 }; },
    };
    const e = new GpuStackHealthEngine(reader);
    await e.check({ pythonPath: "py", requireBnb: true });
    expect(seenArgs).toContain("--require-bnb");
  });

  it("constants are sane", () => {
    expect(GPU_HEALTH_TIMEOUT_MS).toBeGreaterThanOrEqual(5000);
    expect(HEALTH_CACHE_TTL_MS).toBeGreaterThanOrEqual(60_000);
  });

  it("INVARIANT: a buggy script reporting ready:true but torch_ready:false → ready FALSE", async () => {
    // The gate derives ready ONLY from torch_ready, never from the script's own
    // `ready` field, so a script bug can never produce a false GO.
    const e = engineWith({ ready: true, torch_ready: false, cuda_available: true }, 0);
    const r = await e.check({ pythonPath: "py" });
    expect(r.ready).toBe(false);
    expect(r.torchReady).toBe(false);
  });

  it("DEFAULT reader: a missing python interpreter degrades (no crash, ready:false)", async () => {
    // Most-likely real failure while golf is mid-install: no GPU venv yet. Exercises
    // REAL_READER's ENOENT path (err.code is a string, no stdout) deterministically.
    const e = new GpuStackHealthEngine(); // default execFile reader
    const r = await e.check({ pythonPath: "definitely-not-a-real-python-xyz-abc", force: true });
    expect(r.ready).toBe(false);
    expect(r.source).toBe("degraded");
    expect(r.errors.length).toBeGreaterThan(0);
  });

  it("not-ready results use the short TTL (auto-light-up after golf install)", async () => {
    let calls = 0;
    const reader: HealthReader = {
      runGpuHealth: async () => { calls += 1; return { stdout: JSON.stringify(NO_TORCH_REPORT) + "\n", stderr: "", exitCode: 1 }; },
    };
    const e = new GpuStackHealthEngine(reader);
    const t0 = 5_000_000;
    await e.check({ pythonPath: "py", nowMs: t0 });
    expect(calls).toBe(1);
    // Within the SHORT not-ready TTL → still cached.
    const cached = await e.check({ pythonPath: "py", nowMs: t0 + 5_000 });
    expect(cached.source).toBe("cached");
    expect(calls).toBe(1);
    // Past the short TTL (but well within the 5-min ready TTL) → re-checks.
    await e.check({ pythonPath: "py", nowMs: t0 + HEALTH_NOT_READY_CACHE_TTL_MS + 1_000 });
    expect(calls).toBe(2);
  });

  it("different pythonPath busts the cache (interpreter-keyed)", async () => {
    let calls = 0;
    const reader: HealthReader = {
      runGpuHealth: async () => { calls += 1; return { stdout: JSON.stringify(READY_REPORT) + "\n", stderr: "", exitCode: 0 }; },
    };
    const e = new GpuStackHealthEngine(reader);
    const t0 = 6_000_000;
    await e.check({ pythonPath: "pyA", nowMs: t0 });
    await e.check({ pythonPath: "pyB", nowMs: t0 + 100 });
    expect(calls).toBe(2);
  });

  // REAL E2E (skip-soft): exercise the default execFile reader against the live
  // gpu_health.py. On this host (portable 3.14.5, no torch) → ready:false/exit 1.
  it("REAL: default reader runs live gpu_health.py (skip-soft)", async (context) => {
    const py = [process.env.PRISM_PYTHON_GPU_PATH, process.env.PRISM_PYTHON_PATH, "H:/Tools/python/python.exe"]
      .filter((p): p is string => typeof p === "string" && p.length > 0)
      .find((p) => existsSync(p));
    const script = path.join(PATHS.PRISM_ROOT, "scripts", "py", "gpu_health.py");
    if (!py || !existsSync(script)) {
      context.skip(); // environment lacks python/script
      return;
    }
    const e = new GpuStackHealthEngine();
    const r = await e.check({ pythonPath: py, force: true });
    expect(r.raw).not.toBeNull();
    expect(typeof r.ready).toBe("boolean");
    if (!r.torchReady) {
      expect(r.ready).toBe(false);
      expect(r.exitCode).toBe(1);
      expect(r.errors.length).toBeGreaterThan(0);
    } else {
      expect(r.ready).toBe(true);
      expect(r.exitCode).toBe(0);
    }
  });
});
