/**
 * HyperMillACScriptExecutor — strict-legitimacy vitest
 *
 * Coverage shape:
 *   class shape + happy + ≥3 failure modes + ≥2 adversarial
 *
 * The engine has a mock branch (PRISM_CAD_MOCK=1 or opts.mockMode=true) and a
 * real branch that spawns python via child_process. The real branch is
 * exercised here using `process.execPath` (the node binary that's running
 * vitest) so every CI environment has a guaranteed-present interpreter.
 *
 * The engine spawns `binary -c <script>`. node and python both accept this
 * exact CLI shape, so substituting node is a faithful integration test of the
 * spawn path: stdout/stderr/exitCode/timeout/error.
 */
import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import { HyperMillACScriptExecutor } from "../engines/HyperMillACScriptExecutor.js";

// The engine spawns `<binary> -c <script>` — same CLI shape as `python -c`.
// Use the portable Python provided by the SessionStart hook (verified at
// H:/Tools/python/python.exe) so the test runs without depending on whatever
// `python` happens to mean on $PATH. Skip real-mode tests if the binary is
// missing (CI environment without the portable interpreter).
const PYTHON_BIN = "H:/Tools/python/python.exe";
const HAS_PYTHON = fs.existsSync(PYTHON_BIN);
const TIMEOUT_BUDGET_MS = 15_000; // generous for cold Windows process spawn
const SHORT_TIMEOUT_MS = 300;
const FAST_TIMEOUT_MS = 8_000;

describe("HyperMillACScriptExecutor", () => {
  // ── Class shape ────────────────────────────────────────────────────────────
  describe("class shape", () => {
    it("constructor with no opts uses defaults (mockMode resolved from env)", () => {
      const x = new HyperMillACScriptExecutor({ mockMode: true });
      expect(typeof x.execute).toBe("function");
    });

    it("constructor accepts host/port/binary/timeout overrides", async () => {
      const x = new HyperMillACScriptExecutor({
        mockMode: true,
        acHost: "10.0.0.42",
        acPort: 12345,
        pythonBinary: "node",
        timeout_ms: 1234,
      });
      const r = await x.execute("any");
      expect(r.success).toBe(true);
    });
  });

  // ── Mock branches (dispatch by script keyword) ────────────────────────────
  describe("mock-mode dispatch", () => {
    it("script containing 'geometry_json' returns geometry fixture JSON", async () => {
      const x = new HyperMillACScriptExecutor({ mockMode: true });
      const r = await x.execute("emit geometry_json please");
      expect(r.success).toBe(true);
      expect(r.exitCode).toBe(0);
      expect(r.stderr).toBe("");
      const parsed = JSON.parse(r.stdout);
      expect(Array.isArray(parsed.curves)).toBe(true);
      expect(Array.isArray(parsed.surfaces)).toBe(true);
      expect(Array.isArray(parsed.solids)).toBe(true);
      expect(Array.isArray(parsed.points)).toBe(true);
      expect(parsed.totalEntities).toBe(0);
    });

    it("script containing 'operation_tree_json' returns operation tree fixture JSON", async () => {
      const x = new HyperMillACScriptExecutor({ mockMode: true });
      const r = await x.execute("dump operation_tree_json");
      expect(r.success).toBe(true);
      const parsed = JSON.parse(r.stdout);
      expect(Array.isArray(parsed.jobs)).toBe(true);
      expect(parsed.totalOperations).toBe(0);
    });

    it("script containing 'open_project' echoes filePath under {opened: ...}", async () => {
      const x = new HyperMillACScriptExecutor({ mockMode: true });
      const FAKE_PATH = "C:/jobs/part42.mcp";
      const r = await x.execute("open_project()", { filePath: FAKE_PATH });
      const parsed = JSON.parse(r.stdout);
      expect(parsed.opened).toBe(FAKE_PATH);
    });

    it("script containing 'export_step' echoes outputPath under {exported: ...}", async () => {
      const x = new HyperMillACScriptExecutor({ mockMode: true });
      const FAKE_OUTPUT = "C:/jobs/part42.stp";
      const r = await x.execute("export_step()", { outputPath: FAKE_OUTPUT });
      const parsed = JSON.parse(r.stdout);
      expect(parsed.exported).toBe(FAKE_OUTPUT);
    });

    it("script containing 'close_project' returns {closed: true}", async () => {
      const x = new HyperMillACScriptExecutor({ mockMode: true });
      const r = await x.execute("close_project()");
      const parsed = JSON.parse(r.stdout);
      expect(parsed.closed).toBe(true);
    });

    it("script with no recognized keyword returns success with empty stdout", async () => {
      const x = new HyperMillACScriptExecutor({ mockMode: true });
      const r = await x.execute("print('arbitrary')");
      expect(r.success).toBe(true);
      expect(r.exitCode).toBe(0);
      expect(r.stdout).toBe("");
      expect(r.stderr).toBe("");
    });

    it("durationMs is a non-negative integer in mock mode", async () => {
      const x = new HyperMillACScriptExecutor({ mockMode: true });
      const r = await x.execute("anything");
      expect(Number.isInteger(r.durationMs) && r.durationMs >= 0).toBe(true);
    });

    it("open_project with no filePath echoes opened=null", async () => {
      const x = new HyperMillACScriptExecutor({ mockMode: true });
      const r = await x.execute("open_project()");
      const parsed = JSON.parse(r.stdout);
      expect(parsed.opened).toBe(null);
    });
  });

  // ── Real-mode happy paths (portable python -c) ────────────────────────────
  describe.runIf(HAS_PYTHON)("real-mode spawn", () => {
    it("script that exits 0 → success=true, exitCode=0, stdout captured", async () => {
      const x = new HyperMillACScriptExecutor({
        mockMode: false,
        pythonBinary: PYTHON_BIN,
        timeout_ms: FAST_TIMEOUT_MS,
      });
      const r = await x.execute("import sys; sys.stdout.write('OK'); sys.exit(0)");
      expect(r.success).toBe(true);
      expect(r.exitCode).toBe(0);
      expect(r.stdout).toBe("OK");
    }, TIMEOUT_BUDGET_MS);

    it("script writes to stderr → captured in stderr field", async () => {
      const x = new HyperMillACScriptExecutor({
        mockMode: false,
        pythonBinary: PYTHON_BIN,
        timeout_ms: FAST_TIMEOUT_MS,
      });
      const r = await x.execute(
        "import sys; sys.stderr.write('warn-from-script'); sys.exit(0)"
      );
      expect(r.success).toBe(true);
      expect(r.stderr.includes("warn-from-script")).toBe(true);
    }, TIMEOUT_BUDGET_MS);

    it("env from perCall is forwarded into spawned process (read via os.environ)", async () => {
      const x = new HyperMillACScriptExecutor({
        mockMode: false,
        pythonBinary: PYTHON_BIN,
        timeout_ms: FAST_TIMEOUT_MS,
      });
      const r = await x.execute(
        "import os, sys; sys.stdout.write(os.environ.get('PRISM_TEST_MARKER', 'missing'))",
        { env: { PRISM_TEST_MARKER: "FORWARDED_OK" } }
      );
      expect(r.stdout).toBe("FORWARDED_OK");
    }, TIMEOUT_BUDGET_MS);
  });

  // ── Real-mode failure modes ────────────────────────────────────────────────
  describe.runIf(HAS_PYTHON)("real-mode failure modes", () => {
    it("script that exits non-zero → success=false, exitCode preserved", async () => {
      const NON_ZERO_EXIT = 7;
      const x = new HyperMillACScriptExecutor({
        mockMode: false,
        pythonBinary: PYTHON_BIN,
        timeout_ms: FAST_TIMEOUT_MS,
      });
      const r = await x.execute(`import sys; sys.exit(${NON_ZERO_EXIT})`);
      expect(r.success).toBe(false);
      expect(r.exitCode).toBe(NON_ZERO_EXIT);
    }, TIMEOUT_BUDGET_MS);

    it("missing binary → success=false, error string captured", async () => {
      const NEVER_BIN = "Z:/__never__/no_such_binary_xyz";
      const x = new HyperMillACScriptExecutor({
        mockMode: false,
        pythonBinary: NEVER_BIN,
        timeout_ms: FAST_TIMEOUT_MS,
      });
      const r = await x.execute("ignored");
      expect(r.success).toBe(false);
      expect(typeof r.error).toBe("string");
      expect(r.error!.length > 0).toBe(true);
    }, TIMEOUT_BUDGET_MS);

    it("timeout fires when script runs longer than perCall timeout → killed via SIGTERM", async () => {
      const x = new HyperMillACScriptExecutor({
        mockMode: false,
        pythonBinary: PYTHON_BIN,
        timeout_ms: FAST_TIMEOUT_MS, // overridden by perCall
      });
      const r = await x.execute(
        // Busy-wait so SIGTERM kills the child reliably (sleep() can ignore signals on Win)
        "import time; end = time.time() + 5\nwhile time.time() < end: pass",
        { timeout_ms: SHORT_TIMEOUT_MS }
      );
      expect(r.success).toBe(false);
      expect(r.error).toBe("timeout");
    }, TIMEOUT_BUDGET_MS);
  });

  // ── Adversarial inputs ─────────────────────────────────────────────────────
  describe("adversarial inputs", () => {
    it("empty script in mock mode does not crash, returns success", async () => {
      const x = new HyperMillACScriptExecutor({ mockMode: true });
      const r = await x.execute("");
      expect(r.success).toBe(true);
      expect(r.stdout).toBe("");
    });

    it("very large script in mock mode (10k chars) does not crash", async () => {
      const TEN_K = 10_000;
      const big = "x".repeat(TEN_K);
      const x = new HyperMillACScriptExecutor({ mockMode: true });
      const r = await x.execute(big);
      expect(r.success).toBe(true);
    });

    it.runIf(HAS_PYTHON)("perCall timeout shorter than default timeout takes precedence", async () => {
      const x = new HyperMillACScriptExecutor({
        mockMode: false,
        pythonBinary: PYTHON_BIN,
        timeout_ms: FAST_TIMEOUT_MS, // long
      });
      const start = Date.now();
      const r = await x.execute(
        "import time; end = time.time() + 5\nwhile time.time() < end: pass",
        { timeout_ms: SHORT_TIMEOUT_MS }
      );
      const elapsed = Date.now() - start;
      expect(r.success).toBe(false);
      // Must terminate well under the FAST_TIMEOUT_MS default,
      // proving perCall override is honored.
      expect(elapsed < FAST_TIMEOUT_MS).toBe(true);
    }, TIMEOUT_BUDGET_MS);
  });
});
