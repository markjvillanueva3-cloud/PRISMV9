/**
 * inventorExecutor.contract.test.ts — U-CADC09 (CAD-COMPLETE-MS0 PHASE-2)
 *
 * Drives scripts/inventor-executor.ps1 through PowerShell subprocess
 * invocations in -Mock mode so the engine ↔ executor JSON contract is
 * exercised on test runners without Autodesk Inventor installed.
 *
 * The mock fixture is byte-identical to the FreeCAD executor (U-CADC06)
 * and the InventorCADCodeGeneratorEngine's internal mock — drift on any
 * side surfaces here.
 *
 * Skipped gracefully when no PowerShell interpreter is available
 * (non-Windows CI). On Windows, the canonical
 * C:/Windows/System32/WindowsPowerShell/v1.0/powershell.exe is used.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { spawnSync } from "node:child_process";

const REPO_ROOT = path.resolve(__dirname, "..", "..");
const EXECUTOR = path.join(REPO_ROOT, "scripts", "inventor-executor.ps1");

// Engine ↔ executor mock fixture contract — same numbers as FreeCAD.
const MOCK_VOLUME_MM3 = 1000;
const MOCK_BBOX_MM: [number, number, number] = [10, 10, 10];
const MOCK_FACE_COUNT = 6;
const MOCK_EDGE_COUNT = 12;
const MOCK_VERTEX_COUNT = 8;

const POWERSHELL_CANDIDATES = [
  "C:/Windows/System32/WindowsPowerShell/v1.0/powershell.exe",
  "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe",
  "pwsh",
  "powershell",
];

function findPowerShell(): string | null {
  for (const c of POWERSHELL_CANDIDATES) {
    if (c.includes("/") || c.includes("\\")) {
      if (fs.existsSync(c)) return c;
    } else {
      // Probe via subprocess; spawnSync of a command not on PATH returns
      // status null and ENOENT in error.
      const r = spawnSync(c, ["-NoProfile", "-Command", "exit 0"], {
        stdio: "ignore",
      });
      if (r.status === 0) return c;
    }
  }
  return null;
}

const POWERSHELL = findPowerShell();
const skipUnlessPS = POWERSHELL ? describe : describe.skip;

interface ExecutorPayload {
  ok: boolean;
  error: string | null;
  durationMs: number;
  metrics: {
    volumeMm3: number | null;
    boundingBoxMm: [number, number, number] | null;
    faceCount: number | null;
    edgeCount: number | null;
    vertexCount: number | null;
  };
  outputs: { ipt: string | null; step: string | null };
  log: string;
}

function runExecutor(args: string[], extraEnv: Record<string, string> = {}): {
  exitCode: number;
  stdout: string;
  stderr: string;
} {
  const r = spawnSync(
    POWERSHELL!,
    ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", EXECUTOR, ...args],
    {
      encoding: "utf8",
      cwd: REPO_ROOT,
      env: { ...process.env, ...extraEnv },
    },
  );
  return {
    exitCode: r.status ?? -1,
    stdout: r.stdout ?? "",
    stderr: r.stderr ?? "",
  };
}

let tmpRoot: string;

beforeEach(() => {
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "prism-cadc09-"));
});

afterEach(() => {
  try {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  } catch {
    // best-effort cleanup
  }
});

describe("inventor-executor.ps1 — file presence", () => {
  it("file exists at the canonical scripts/ path", () => {
    expect(fs.existsSync(EXECUTOR)).toBe(true);
    const head = fs.readFileSync(EXECUTOR, "utf8").slice(0, 512);
    expect(head).toContain("U-CADC09");
    expect(head).toContain("CAD-COMPLETE-MS0");
  });

  it("declares the same fixture contract as freecad-executor.py", () => {
    const body = fs.readFileSync(EXECUTOR, "utf8");
    // Identifying constants — proves both executors agree on the wire shape.
    expect(body).toMatch(/MOCK_VOLUME_MM3\s*=\s*1000/);
    expect(body).toMatch(/MOCK_FACE_COUNT\s*=\s*6/);
    expect(body).toMatch(/MOCK_EDGE_COUNT\s*=\s*12/);
    expect(body).toMatch(/MOCK_VERTEX_COUNT\s*=\s*8/);
  });
});

skipUnlessPS("inventor-executor.ps1 — runtime contract (PowerShell-gated)", () => {
  it("-Mock prints a single-line JSON payload with exit 0", () => {
    const r = runExecutor(["-Mock"]);
    expect(r.exitCode).toBe(0);
    const lines = r.stdout.trim().split(/\r?\n/).filter(Boolean);
    expect(lines.length).toBe(1);
    const payload = JSON.parse(lines[0]!) as ExecutorPayload;
    expect(payload.ok).toBe(true);
    expect(payload.error).toBeNull();
    expect(typeof payload.durationMs).toBe("number");
  });

  it("-Mock metrics match the engine's mock fixture exactly", () => {
    const r = runExecutor(["-Mock"]);
    const payload = JSON.parse(r.stdout.trim()) as ExecutorPayload;
    expect(payload.metrics.volumeMm3).toBeCloseTo(MOCK_VOLUME_MM3, 5);
    expect(payload.metrics.boundingBoxMm).toEqual(MOCK_BBOX_MM);
    expect(payload.metrics.faceCount).toBe(MOCK_FACE_COUNT);
    expect(payload.metrics.edgeCount).toBe(MOCK_EDGE_COUNT);
    expect(payload.metrics.vertexCount).toBe(MOCK_VERTEX_COUNT);
  });

  it("-MetricsJson writes the same payload to disk", () => {
    const target = path.join(tmpRoot, "metrics.json");
    const r = runExecutor(["-Mock", "-MetricsJson", target]);
    expect(r.exitCode).toBe(0);
    expect(fs.existsSync(target)).toBe(true);
    const fromDisk = JSON.parse(
      fs.readFileSync(target, "utf8").trim(),
    ) as ExecutorPayload;
    const fromStdout = JSON.parse(r.stdout.trim()) as ExecutorPayload;
    expect(fromDisk.ok).toBe(fromStdout.ok);
    expect(fromDisk.metrics).toEqual(fromStdout.metrics);
  });

  it("-NoEmitStdout suppresses stdout JSON but file is still written", () => {
    const target = path.join(tmpRoot, "metrics-only.json");
    const r = runExecutor([
      "-Mock",
      "-MetricsJson",
      target,
      "-NoEmitStdout",
    ]);
    expect(r.exitCode).toBe(0);
    expect(r.stdout.trim()).toBe("");
    expect(fs.existsSync(target)).toBe(true);
    const payload = JSON.parse(
      fs.readFileSync(target, "utf8").trim(),
    ) as ExecutorPayload;
    expect(payload.ok).toBe(true);
  });

  it("-Mock -OutputIpt / -OutputStep populate outputs with absolute paths", () => {
    const iptPath = path.join(tmpRoot, "out.ipt");
    const stepPath = path.join(tmpRoot, "out.step");
    const r = runExecutor([
      "-Mock",
      "-OutputIpt",
      iptPath,
      "-OutputStep",
      stepPath,
    ]);
    const payload = JSON.parse(r.stdout.trim()) as ExecutorPayload;
    // PowerShell GetFullPath normalizes separators differently per OS;
    // assert the basename round-trips to be tolerant of that.
    expect(payload.outputs.ipt).not.toBeNull();
    expect(payload.outputs.step).not.toBeNull();
    expect(path.basename(payload.outputs.ipt!)).toBe("out.ipt");
    expect(path.basename(payload.outputs.step!)).toBe("out.step");
  });

  it("real-mode without -ScriptPath returns ok=false with structured error", () => {
    const r = runExecutor([]);
    expect(r.exitCode).toBe(1);
    const payload = JSON.parse(r.stdout.trim()) as ExecutorPayload;
    expect(payload.ok).toBe(false);
    expect(payload.error).toContain("ScriptPath");
  });

  it("real-mode with non-existent -ScriptPath returns 'script not found'", () => {
    const r = runExecutor([
      "-ScriptPath",
      path.join(tmpRoot, "does-not-exist.iLogicVb"),
    ]);
    expect(r.exitCode).toBe(1);
    const payload = JSON.parse(r.stdout.trim()) as ExecutorPayload;
    expect(payload.ok).toBe(false);
    expect(payload.error).toContain("script not found");
  });

  it("real-mode without Inventor COM returns 'Inventor COM' import-failed error", () => {
    const scriptPath = path.join(tmpRoot, "noop.iLogicVb");
    fs.writeFileSync(scriptPath, "' iLogic noop\n", "utf8");
    const r = runExecutor(["-ScriptPath", scriptPath]);
    // On a runner without Inventor licensed, COM creation fails — that's
    // exactly the contract surface we exercise here.
    expect(r.exitCode).toBe(1);
    const payload = JSON.parse(r.stdout.trim()) as ExecutorPayload;
    expect(payload.ok).toBe(false);
    expect(payload.error).toMatch(/Inventor COM|Inventor\.Application/);
  }, 180_000);

  it("PRISM_CAD_MOCK=1 env-var triggers mock mode without -Mock flag", () => {
    const r = runExecutor([], { PRISM_CAD_MOCK: "1" });
    expect(r.exitCode).toBe(0);
    const payload = JSON.parse(r.stdout.trim()) as ExecutorPayload;
    expect(payload.ok).toBe(true);
    expect(payload.metrics.volumeMm3).toBeCloseTo(MOCK_VOLUME_MM3, 5);
  });

  it("payload JSON is single-line (deterministic for downstream parsers)", () => {
    const r = runExecutor(["-Mock"]);
    const lines = r.stdout
      .split(/\r?\n/)
      .filter((s) => s.trim().length > 0);
    expect(lines.length).toBe(1);
    expect(lines[0]!.includes("\n")).toBe(false);
  });

  it("schema is forward-stable: required keys present even on failure", () => {
    const r = runExecutor([]);
    const payload = JSON.parse(r.stdout.trim()) as ExecutorPayload;
    expect("ok" in payload).toBe(true);
    expect("error" in payload).toBe(true);
    expect("durationMs" in payload).toBe(true);
    expect("metrics" in payload).toBe(true);
    expect("outputs" in payload).toBe(true);
    expect("log" in payload).toBe(true);
    expect("volumeMm3" in payload.metrics).toBe(true);
    expect("boundingBoxMm" in payload.metrics).toBe(true);
    expect("faceCount" in payload.metrics).toBe(true);
    expect("edgeCount" in payload.metrics).toBe(true);
    expect("vertexCount" in payload.metrics).toBe(true);
    expect("ipt" in payload.outputs).toBe(true);
    expect("step" in payload.outputs).toBe(true);
  });

  it("contract symmetry: mock fixture matches FreeCAD-executor's contract", () => {
    const r = runExecutor(["-Mock"]);
    const payload = JSON.parse(r.stdout.trim()) as ExecutorPayload;
    // These are the SAME numbers freecadExecutor.contract.test.ts asserts.
    // If either side drifts, both tests fail symmetrically — wired contract.
    expect(payload.metrics.volumeMm3).toBeCloseTo(1000, 5);
    expect(payload.metrics.boundingBoxMm).toEqual([10, 10, 10]);
    expect(payload.metrics.faceCount).toBe(6);
    expect(payload.metrics.edgeCount).toBe(12);
    expect(payload.metrics.vertexCount).toBe(8);
  });
});
