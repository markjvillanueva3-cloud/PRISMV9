/**
 * freecadExecutor.contract.test.ts — U-CADC06 (CAD-COMPLETE-MS0 PHASE-1)
 *
 * Drives scripts/freecad-executor.py through real subprocess invocations
 * in --mock mode so the engine ↔ executor JSON contract is exercised
 * without requiring FreeCAD installed on the test runner.
 *
 * The Node-side FreeCADCodeGeneratorEngine.runScriptBody() returns a
 * payload of the same shape (volumeMm3, boundingBoxMm, faceCount,
 * edgeCount, vertexCount) and the mock fixture in this executor is
 * intentionally byte-identical to the engine's mock fixture — drift on
 * either side is caught by these tests.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { spawnSync } from "node:child_process";

const REPO_ROOT = path.resolve(__dirname, "..", "..");
const EXECUTOR = path.join(REPO_ROOT, "scripts", "freecad-executor.py");
const PORTABLE_PY = "H:/Tools/python/python.exe";

function pythonBin(): string {
  if (fs.existsSync(PORTABLE_PY)) return PORTABLE_PY;
  // Fall back to PATH `python` — Vitest sandbox honors PATH on Windows.
  return "python";
}

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
  outputs: { fcstd: string | null; step: string | null };
  log: string;
}

function runExecutor(extraArgs: string[]): {
  exitCode: number;
  stdout: string;
  stderr: string;
} {
  const r = spawnSync(pythonBin(), [EXECUTOR, ...extraArgs], {
    encoding: "utf8",
    cwd: REPO_ROOT,
  });
  return {
    exitCode: r.status ?? -1,
    stdout: r.stdout ?? "",
    stderr: r.stderr ?? "",
  };
}

let tmpRoot: string;

beforeEach(() => {
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "prism-cadc06-"));
});

afterEach(() => {
  try {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  } catch {
    // ignore
  }
});

describe("freecad-executor.py — contract surface", () => {
  it("file exists at the canonical path", () => {
    expect(fs.existsSync(EXECUTOR)).toBe(true);
    const head = fs.readFileSync(EXECUTOR, "utf8").slice(0, 256);
    // Pure pure: shebang + module docstring + module name in docstring
    expect(head.startsWith("#!/usr/bin/env python3")).toBe(true);
    expect(head).toContain("U-CADC06");
  });

  it("--mock prints a single-line JSON payload to stdout with exit 0", () => {
    const r = runExecutor(["--mock"]);
    expect(r.exitCode).toBe(0);
    const lines = r.stdout.trim().split("\n").filter(Boolean);
    expect(lines.length).toBe(1);
    const payload = JSON.parse(lines[0]!) as ExecutorPayload;
    expect(payload.ok).toBe(true);
    expect(payload.error).toBeNull();
    expect(typeof payload.durationMs).toBe("number");
  });

  it("--mock metrics match the engine's mock fixture exactly", () => {
    const r = runExecutor(["--mock"]);
    const payload = JSON.parse(r.stdout.trim()) as ExecutorPayload;
    // FreeCADCodeGeneratorEngine.runScriptBody() mock returns the same
    // shape: volumeMm3=1000, bbox=[10,10,10], faces=6, edges=12, verts=8.
    expect(payload.metrics.volumeMm3).toBeCloseTo(1000, 5);
    expect(payload.metrics.boundingBoxMm).toEqual([10, 10, 10]);
    expect(payload.metrics.faceCount).toBe(6);
    expect(payload.metrics.edgeCount).toBe(12);
    expect(payload.metrics.vertexCount).toBe(8);
  });

  it("--metrics-json writes the same payload to disk", () => {
    const target = path.join(tmpRoot, "metrics.json");
    const r = runExecutor(["--mock", "--metrics-json", target]);
    expect(r.exitCode).toBe(0);
    expect(fs.existsSync(target)).toBe(true);
    const fromDisk = JSON.parse(
      fs.readFileSync(target, "utf8").trim(),
    ) as ExecutorPayload;
    const fromStdout = JSON.parse(r.stdout.trim()) as ExecutorPayload;
    expect(fromDisk.ok).toBe(fromStdout.ok);
    expect(fromDisk.metrics).toEqual(fromStdout.metrics);
  });

  it("--no-emit-stdout suppresses stdout JSON but file is still written", () => {
    const target = path.join(tmpRoot, "metrics-only.json");
    const r = runExecutor([
      "--mock",
      "--metrics-json",
      target,
      "--no-emit-stdout",
    ]);
    expect(r.exitCode).toBe(0);
    expect(r.stdout.trim()).toBe("");
    expect(fs.existsSync(target)).toBe(true);
    const payload = JSON.parse(
      fs.readFileSync(target, "utf8").trim(),
    ) as ExecutorPayload;
    expect(payload.ok).toBe(true);
  });

  it("--mock --output-fcstd / --output-step populate the outputs fields with absolute paths", () => {
    const fcstdPath = path.join(tmpRoot, "out.FCStd");
    const stepPath = path.join(tmpRoot, "out.step");
    const r = runExecutor([
      "--mock",
      "--output-fcstd",
      fcstdPath,
      "--output-step",
      stepPath,
    ]);
    const payload = JSON.parse(r.stdout.trim()) as ExecutorPayload;
    expect(payload.outputs.fcstd).toBe(path.resolve(fcstdPath));
    expect(payload.outputs.step).toBe(path.resolve(stepPath));
  });

  it("real-mode without --script-path returns ok=false with structured error", () => {
    const r = runExecutor([]);
    expect(r.exitCode).toBe(1);
    const payload = JSON.parse(r.stdout.trim()) as ExecutorPayload;
    expect(payload.ok).toBe(false);
    expect(payload.error).toContain("script-path is required");
  });

  it("real-mode with non-existent --script-path returns 'script not found' error", () => {
    const r = runExecutor([
      "--script-path",
      path.join(tmpRoot, "does-not-exist.py"),
    ]);
    expect(r.exitCode).toBe(1);
    const payload = JSON.parse(r.stdout.trim()) as ExecutorPayload;
    expect(payload.ok).toBe(false);
    expect(payload.error).toContain("script not found");
  });

  it("real-mode with present script but no FreeCAD module returns import-failed error", () => {
    // The test runner doesn't have FreeCAD installed, so a real-mode
    // invocation with a valid script file should fail at the import step
    // — that's the contract we're exercising here.
    const scriptPath = path.join(tmpRoot, "noop.py");
    fs.writeFileSync(scriptPath, "x = 1\n", "utf8");
    const r = runExecutor(["--script-path", scriptPath]);
    expect(r.exitCode).toBe(1);
    const payload = JSON.parse(r.stdout.trim()) as ExecutorPayload;
    expect(payload.ok).toBe(false);
    expect(payload.error).toContain("FreeCAD");
  });

  it("PRISM_CAD_MOCK=1 env-var triggers mock mode without explicit flag", () => {
    const r = spawnSync(pythonBin(), [EXECUTOR], {
      encoding: "utf8",
      cwd: REPO_ROOT,
      env: { ...process.env, PRISM_CAD_MOCK: "1" },
    });
    expect(r.status).toBe(0);
    const payload = JSON.parse((r.stdout ?? "").trim()) as ExecutorPayload;
    expect(payload.ok).toBe(true);
    expect(payload.metrics.volumeMm3).toBeCloseTo(1000, 5);
  });

  it("payload JSON is single-line (deterministic for downstream parsers)", () => {
    const r = runExecutor(["--mock"]);
    const lines = r.stdout.split("\n").filter((s) => s.trim().length > 0);
    expect(lines.length).toBe(1);
    // No literal newlines inside the payload itself
    expect(lines[0]!.includes("\n")).toBe(false);
  });

  it("schema is forward-stable: required keys present even on failure", () => {
    const r = runExecutor([]);
    const payload = JSON.parse(r.stdout.trim()) as ExecutorPayload;
    // Every consumer-visible key MUST exist regardless of ok/fail —
    // this is the engine ↔ executor schema contract.
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
    expect("fcstd" in payload.outputs).toBe(true);
    expect("step" in payload.outputs).toBe(true);
  });
});
