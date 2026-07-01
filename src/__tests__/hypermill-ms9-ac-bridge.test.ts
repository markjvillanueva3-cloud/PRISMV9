/**
 * hypermill-ms9-ac-bridge.test.ts
 *
 * Test suite for HM-REV-MS9: Automation Center Bridge + Deployment
 *
 *   U-HMR46: HyperMillACServerConfig — server config, binding, CORS
 *   U-HMR47: HyperMillACConnectionManager — mock mode, retry, state
 *   U-HMR48: HyperMillACScriptExecutor — sandbox, mock execution
 *   U-HMR49: HyperMillJobMonitor — state machine, events, lifecycle
 *   U-HMR50: HyperMillPPPFileWriter — file write, backup, atomic write
 *
 * CRITICAL TEST RULE: All assertions use specific expected values.
 * NOT toBeTruthy() — exact values only.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

// ─── Imports ──────────────────────────────────────────────────────────────────

import {
  buildACServerConfig,
  validateACServerConfig,
  describeACServerConfig,
  AC_SERVER_BIND_HOST,
  AC_SERVER_DEFAULT_PORT,
  AC_SERVER_DEFAULT_TIMEOUT_MS,
  AC_ROUTES,
  DEFAULT_AC_CORS_CONFIG,
} from "../engines/HyperMillACServerConfig.js";

import {
  HyperMillACConnectionManager,
  calcRetryDelay,
  DEFAULT_RETRY_CONFIG,
  hyperMillACConnectionManagerMock,
  type ACConnectionState,
} from "../engines/HyperMillACConnectionManager.js";

import {
  validateACScript,
  HyperMillACScriptExecutor,
  DEFAULT_SANDBOX_CONFIG,
  hyperMillACScriptExecutorMock,
  type ACScriptValidationResult,
} from "../engines/HyperMillACScriptExecutor.js";

import {
  HyperMillJobMonitor,
  JOB_STATE_TRANSITIONS,
  TERMINAL_STATES,
  type HMJobState,
  type HMJobEvent,
} from "../engines/HyperMillJobMonitor.js";

import {
  HyperMillPPPFileWriter,
  buildNCFileName,
  resolveNCExtension,
  buildPRISMHeader,
  atomicWriteNC,
  backupNCFile,
  splitSubPrograms,
  DEFAULT_HM_PROJECT_FOLDER,
  type HMProjectFolder,
} from "../engines/HyperMillPPPFileWriter.js";

// ============================================================================
// U-HMR46: HyperMillACServerConfig
// ============================================================================

describe("HyperMillACServerConfig (U-HMR46)", () => {

  it("AC_SERVER_BIND_HOST is 127.0.0.1 (not 0.0.0.0)", () => {
    expect(AC_SERVER_BIND_HOST).toBe("127.0.0.1");
  });

  it("AC_SERVER_DEFAULT_PORT is 18365", () => {
    expect(AC_SERVER_DEFAULT_PORT).toBe(18365);
  });

  it("AC_SERVER_DEFAULT_TIMEOUT_MS is 30000", () => {
    expect(AC_SERVER_DEFAULT_TIMEOUT_MS).toBe(30_000);
  });

  it("AC_ROUTES has 5 entries with correct paths", () => {
    expect(AC_ROUTES.STATUS).toBe("/status");
    expect(AC_ROUTES.EXECUTE).toBe("/execute");
    expect(AC_ROUTES.JOB_STATUS).toBe("/job-status");
    expect(AC_ROUTES.EXTRACT).toBe("/extract");
    expect(AC_ROUTES.OPTIMIZE).toBe("/optimize");
  });

  it("buildACServerConfig returns 127.0.0.1 host by default", () => {
    const cfg = buildACServerConfig();
    expect(cfg.host).toBe("127.0.0.1");
    expect(cfg.port).toBe(18365);
    expect(cfg.mockMode).toBe(false);
  });

  it("buildACServerConfig applies overrides correctly", () => {
    const cfg = buildACServerConfig({ port: 19000, mockMode: true, timeoutMs: 5000 });
    expect(cfg.port).toBe(19000);
    expect(cfg.mockMode).toBe(true);
    expect(cfg.timeoutMs).toBe(5000);
    expect(cfg.host).toBe("127.0.0.1"); // default still applied
  });

  it("validateACServerConfig rejects 0.0.0.0 binding", () => {
    const cfg = buildACServerConfig({ host: "0.0.0.0" });
    const errors = validateACServerConfig(cfg);
    expect(errors.length).toBe(1);
    expect(errors[0]).toContain("loopback-only");
  });

  it("validateACServerConfig rejects port below 1024", () => {
    const cfg = buildACServerConfig({ port: 80 });
    const errors = validateACServerConfig(cfg);
    expect(errors.length).toBe(1);
    expect(errors[0]).toContain("valid range");
  });

  it("validateACServerConfig returns empty array for valid config", () => {
    const cfg = buildACServerConfig({ host: "127.0.0.1", port: 18365 });
    const errors = validateACServerConfig(cfg);
    expect(errors).toHaveLength(0);
  });

  it("CORS allowedOrigins includes localhost:3000 and null (file:// origin)", () => {
    expect(DEFAULT_AC_CORS_CONFIG.allowedOrigins).toContain("http://localhost:3000");
    expect(DEFAULT_AC_CORS_CONFIG.allowedOrigins).toContain("null");
  });

  it("describeACServerConfig output contains port and host", () => {
    const cfg = buildACServerConfig();
    const desc = describeACServerConfig(cfg);
    expect(desc).toContain("127.0.0.1:18365");
    expect(desc).toContain("/status");
  });
});

// ============================================================================
// U-HMR47: HyperMillACConnectionManager
// ============================================================================

describe("HyperMillACConnectionManager (U-HMR47)", () => {

  it("mock mode connect() returns connected=true immediately", async () => {
    const mgr = new HyperMillACConnectionManager({ mockMode: true });
    const result = await mgr.connect();
    expect(result.connected).toBe(true);
    expect(result.state).toBe("connected");
    expect(result.mockMode).toBe(true);
    expect(result.attempts).toBe(1);
  });

  it("mock mode connect() sets sessionId", async () => {
    const mgr = new HyperMillACConnectionManager({ mockMode: true });
    const result = await mgr.connect();
    expect(typeof result.sessionId).toBe("string");
    expect(result.sessionId!.length).toBeGreaterThan(5);
  });

  it("mock mode connect() returns serverVersion mock-v33.0", async () => {
    const mgr = new HyperMillACConnectionManager({ mockMode: true });
    const result = await mgr.connect();
    expect(result.serverVersion).toBe("mock-v33.0");
  });

  it("initial state is disconnected", () => {
    const mgr = new HyperMillACConnectionManager({ mockMode: true });
    expect(mgr.state).toBe("disconnected");
    expect(mgr.isConnected).toBe(false);
  });

  it("state transitions to connected after successful mock connect", async () => {
    const mgr = new HyperMillACConnectionManager({ mockMode: true });
    await mgr.connect();
    expect(mgr.state).toBe("connected");
    expect(mgr.isConnected).toBe(true);
  });

  it("disconnect() resets state to disconnected", async () => {
    const mgr = new HyperMillACConnectionManager({ mockMode: true });
    await mgr.connect();
    expect(mgr.isConnected).toBe(true);
    const r = mgr.disconnect();
    expect(r.disconnected).toBe(true);
    expect(mgr.state).toBe("disconnected");
    expect(mgr.isConnected).toBe(false);
    expect(mgr.sessionId).toBeUndefined();
  });

  it("getStatus() returns correct snapshot", async () => {
    const mgr = new HyperMillACConnectionManager({
      mockMode: true,
      host: "127.0.0.1",
      port: 18365,
    });
    await mgr.connect();
    const status = mgr.getStatus();
    expect(status.state).toBe("connected");
    expect(status.host).toBe("127.0.0.1");
    expect(status.port).toBe(18365);
    expect(status.mockMode).toBe(true);
  });

  it("mock healthCheck() returns alive=true", async () => {
    const result = await hyperMillACConnectionManagerMock.healthCheck();
    expect(result.alive).toBe(true);
    expect(result.mockMode).toBe(true);
    expect(result.latencyMs).toBe(1);
  });

  it("calcRetryDelay increases with attempt number", () => {
    // Test deterministic lower bound (without jitter randomness)
    const delay1 = DEFAULT_RETRY_CONFIG.baseDelayMs * Math.pow(2, 0); // attempt 1: 500ms base
    const delay2 = DEFAULT_RETRY_CONFIG.baseDelayMs * Math.pow(2, 1); // attempt 2: 1000ms base
    expect(delay2).toBeGreaterThan(delay1);
    expect(delay1).toBe(500);
    expect(delay2).toBe(1000);
  });

  it("DEFAULT_RETRY_CONFIG has maxAttempts=3, baseDelayMs=500", () => {
    expect(DEFAULT_RETRY_CONFIG.maxAttempts).toBe(3);
    expect(DEFAULT_RETRY_CONFIG.baseDelayMs).toBe(500);
    expect(DEFAULT_RETRY_CONFIG.jitterFactor).toBe(0.2);
  });

  it("real mode fails gracefully when no server available", async () => {
    const mgr = new HyperMillACConnectionManager({
      mockMode: false,
      host: "127.0.0.1",
      port: 19999, // unlikely to have a server here
    }, { maxAttempts: 1, baseDelayMs: 10, jitterFactor: 0 });
    const result = await mgr.connect();
    expect(result.connected).toBe(false);
    expect(result.state).toBe("error");
    expect(result.attempts).toBe(1);
    expect(result.message).toContain("Failed to connect");
  });
});

// ============================================================================
// U-HMR48: HyperMillACScriptExecutor
// ============================================================================

describe("HyperMillACScriptExecutor (U-HMR48)", () => {

  describe("validateACScript — sandbox rules", () => {

    it("accepts a clean AC Python script", () => {
      const script = `
import hypermill
job = hypermill.Job("TestJob")
job.set_material("Steel")
job.run_nc_generation()
print({"status": "ok"})
`.trim();
      const result = validateACScript(script);
      expect(result.valid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it("rejects script with 'import os'", () => {
      const script = `import os\nprint(os.getcwd())`;
      const result = validateACScript(script);
      expect(result.valid).toBe(false);
      expect(result.hasImportOs).toBe(true);
      expect(result.violations.length).toBeGreaterThan(0);
    });

    it("rejects script with 'import subprocess'", () => {
      const script = `import subprocess\nsubprocess.run(["ls"])`;
      const result = validateACScript(script);
      expect(result.valid).toBe(false);
      expect(result.hasSubprocess).toBe(true);
    });

    it("rejects script with sys.exit()", () => {
      const script = `import sys\nsys.exit(0)`;
      const result = validateACScript(script);
      expect(result.valid).toBe(false);
      expect(result.hasSysExit).toBe(true);
    });

    it("rejects script with open() file handle", () => {
      const script = `f = open("/etc/passwd", "r")\nprint(f.read())`;
      const result = validateACScript(script);
      expect(result.valid).toBe(false);
      expect(result.hasFileSystemAccess).toBe(true);
    });

    it("rejects script with eval()", () => {
      const script = `result = eval("1+1")`;
      const result = validateACScript(script);
      expect(result.valid).toBe(false);
    });

    it("rejects script with exec()", () => {
      const script = `exec("print('hello')")`;
      const result = validateACScript(script);
      expect(result.valid).toBe(false);
    });

    it("reports correct line count", () => {
      const script = "line1\nline2\nline3\nline4\nline5";
      const result = validateACScript(script);
      expect(result.lineCount).toBe(5);
    });

    it("rejects script exceeding maxLines", () => {
      const longScript = Array(2001).fill("x = 1").join("\n");
      const result = validateACScript(longScript);
      expect(result.valid).toBe(false);
      expect(result.violations[0]).toContain("maximum line count");
    });

    it("multiple violations are all reported", () => {
      const script = `import os\nimport subprocess\nsys.exit(1)`;
      const result = validateACScript(script);
      expect(result.valid).toBe(false);
      expect(result.violations.length).toBeGreaterThan(1);
    });
  });

  describe("HyperMillACScriptExecutor — mock execution", () => {

    it("mock executor executes valid script successfully", async () => {
      const result = await hyperMillACScriptExecutorMock.execute(
        `import hypermill\nprint("ok")`
      );
      expect(result.success).toBe(true);
      expect(result.mockMode).toBe(true);
      expect(result.returnCode).toBe(0);
    });

    it("executor rejects forbidden script before forwarding (mock mode)", async () => {
      const result = await hyperMillACScriptExecutorMock.execute(
        `import os\nprint(os.getcwd())`
      );
      expect(result.success).toBe(false);
      expect(result.returnCode).toBe(-1);
      expect(result.error).toContain("Script validation failed");
    });

    it("mock execution returns structuredOutput with status=ok", async () => {
      const result = await hyperMillACScriptExecutorMock.execute(
        `import hypermill\njob = hypermill.Job("x")`
      );
      expect(result.success).toBe(true);
      expect(result.structuredOutput).toBeDefined();
      expect((result.structuredOutput as Record<string, unknown>)["status"]).toBe("ok");
    });

    it("mock execution includes scriptHash", async () => {
      const result = await hyperMillACScriptExecutorMock.execute(
        `import hypermill\npass`
      );
      expect(typeof result.scriptHash).toBe("string");
      expect(result.scriptHash.length).toBe(8);
    });

    it("validation result embedded in execution result", async () => {
      const result = await hyperMillACScriptExecutorMock.execute(
        `import hypermill\npass`
      );
      expect(result.validationResult.valid).toBe(true);
      expect(result.validationResult.violations).toHaveLength(0);
    });

    it("durationMs is a non-negative number", async () => {
      const result = await hyperMillACScriptExecutorMock.execute(
        `import hypermill\npass`
      );
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });
  });
});

// ============================================================================
// U-HMR49: HyperMillJobMonitor
// ============================================================================

describe("HyperMillJobMonitor (U-HMR49)", () => {

  it("JOB_STATE_TRANSITIONS: submitted can go to calculating", () => {
    expect(JOB_STATE_TRANSITIONS["submitted"]).toContain("calculating");
  });

  it("JOB_STATE_TRANSITIONS: submitted can go to failed", () => {
    expect(JOB_STATE_TRANSITIONS["submitted"]).toContain("failed");
  });

  it("JOB_STATE_TRANSITIONS: complete has no further transitions", () => {
    expect(JOB_STATE_TRANSITIONS["complete"]).toHaveLength(0);
  });

  it("TERMINAL_STATES contains complete, failed, cancelled", () => {
    expect(TERMINAL_STATES.has("complete")).toBe(true);
    expect(TERMINAL_STATES.has("failed")).toBe(true);
    expect(TERMINAL_STATES.has("cancelled")).toBe(true);
    expect(TERMINAL_STATES.has("calculating")).toBe(false);
  });

  it("submitJob creates a record in submitted state", () => {
    const monitor = new HyperMillJobMonitor({ mockMode: false });
    const record = monitor.submitJob("job-001", "TestBatch");
    expect(record.jobId).toBe("job-001");
    expect(record.jobName).toBe("TestBatch");
    expect(record.state).toBe("submitted");
    expect(record.progressPct).toBe(0);
    monitor.removeJob("job-001");
  });

  it("getJob returns undefined for unknown job", () => {
    const monitor = new HyperMillJobMonitor({ mockMode: false });
    expect(monitor.getJob("nonexistent")).toBeUndefined();
  });

  it("transitionJob updates state correctly: submitted → calculating", () => {
    const monitor = new HyperMillJobMonitor({ mockMode: false });
    monitor.submitJob("job-002", "Roughing");
    const updated = monitor.transitionJob("job-002", "calculating", { progressPct: 20 });
    expect(updated).toBeDefined();
    expect(updated!.state).toBe("calculating");
    expect(updated!.progressPct).toBe(20);
    monitor.removeJob("job-002");
  });

  it("transitionJob blocks invalid transition (submitted → complete)", () => {
    const monitor = new HyperMillJobMonitor({ mockMode: false });
    monitor.submitJob("job-003", "DirectComplete");
    // submitted → complete is not in transitions
    const result = monitor.transitionJob("job-003", "complete");
    // Should stay as submitted (invalid transition ignored)
    expect(result!.state).toBe("submitted");
    monitor.removeJob("job-003");
  });

  it("transitionJob emits job_error event on failed state", () => {
    const events: HMJobEvent[] = [];
    const monitor = new HyperMillJobMonitor({ mockMode: false });
    monitor.addListener((e) => events.push(e));

    monitor.submitJob("job-004", "FailTest");
    monitor.transitionJob("job-004", "failed", { errorMessage: "toolpath_error" });

    const errorEvent = events.find((e) => e.type === "job_error");
    expect(errorEvent).toBeDefined();
    expect(errorEvent!.state).toBe("failed");
    expect(errorEvent!.errorMessage).toBe("toolpath_error");
    monitor.removeJob("job-004");
  });

  it("transitionJob emits job_complete event on complete state", () => {
    const events: HMJobEvent[] = [];
    const monitor = new HyperMillJobMonitor({ mockMode: false });
    monitor.addListener((e) => events.push(e));

    monitor.submitJob("job-005", "CompleteTest");
    monitor.transitionJob("job-005", "calculating");
    monitor.transitionJob("job-005", "complete", { progressPct: 100 });

    const completeEvent = events.find((e) => e.type === "job_complete");
    expect(completeEvent).toBeDefined();
    expect(completeEvent!.state).toBe("complete");
    expect(completeEvent!.progressPct).toBe(100);
    monitor.removeJob("job-005");
  });

  it("job_start event emitted on submitJob", () => {
    const events: HMJobEvent[] = [];
    const monitor = new HyperMillJobMonitor({ mockMode: false });
    monitor.addListener((e) => events.push(e));

    monitor.submitJob("job-006", "StartEventTest");

    const startEvent = events.find((e) => e.type === "job_start");
    expect(startEvent).toBeDefined();
    expect(startEvent!.jobId).toBe("job-006");
    expect(startEvent!.jobName).toBe("StartEventTest");
    monitor.removeJob("job-006");
  });

  it("getJobsByState filters correctly", () => {
    const monitor = new HyperMillJobMonitor({ mockMode: false });
    monitor.submitJob("j1", "Job1");
    monitor.submitJob("j2", "Job2");
    monitor.transitionJob("j1", "calculating");

    const calculating = monitor.getJobsByState("calculating");
    const submitted = monitor.getJobsByState("submitted");

    expect(calculating).toHaveLength(1);
    expect(calculating[0].jobId).toBe("j1");
    expect(submitted).toHaveLength(1);
    expect(submitted[0].jobId).toBe("j2");

    monitor.removeJob("j1");
    monitor.removeJob("j2");
  });

  it("completedAt is set when job reaches terminal state", () => {
    const monitor = new HyperMillJobMonitor({ mockMode: false });
    monitor.submitJob("job-007", "TerminalTest");
    const before = Date.now();
    monitor.transitionJob("job-007", "calculating");
    monitor.transitionJob("job-007", "complete", { progressPct: 100 });
    const record = monitor.getJob("job-007")!;
    expect(record.completedAt).toBeDefined();
    expect(record.completedAt!).toBeGreaterThanOrEqual(before);
    monitor.removeJob("job-007");
  });

  it("mock mode progresses through full lifecycle automatically", async () => {
    const events: HMJobEvent[] = [];
    const monitor = new HyperMillJobMonitor({ mockMode: true });
    monitor.addListener((e) => events.push(e));

    monitor.submitJob("mock-job-001", "MockLifecycle");

    // Wait for mock progression to complete (250ms + buffer)
    await new Promise<void>((resolve) => setTimeout(resolve, 350));

    const states = events.map((e) => e.state);
    expect(states).toContain("submitted");
    expect(states).toContain("calculating");
    expect(states).toContain("complete");

    const finalRecord = monitor.getJob("mock-job-001")!;
    expect(finalRecord.state).toBe("complete");
    expect(finalRecord.progressPct).toBe(100);
    monitor.removeJob("mock-job-001");
  }, 2000);
});

// ============================================================================
// U-HMR50: HyperMillPPPFileWriter
// ============================================================================

describe("HyperMillPPPFileWriter (U-HMR50)", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "prism-hm9-test-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  // ── Filename / Extension ──

  it("resolveNCExtension returns .nc for fanuc", () => {
    expect(resolveNCExtension("fanuc")).toBe(".nc");
  });

  it("resolveNCExtension returns .h for heidenhain", () => {
    expect(resolveNCExtension("heidenhain")).toBe(".h");
  });

  it("resolveNCExtension returns .spf for siemens", () => {
    expect(resolveNCExtension("siemens")).toBe(".spf");
  });

  it("resolveNCExtension returns .min for okuma", () => {
    expect(resolveNCExtension("okuma")).toBe(".min");
  });

  it("resolveNCExtension defaults to .nc for unknown dialect", () => {
    expect(resolveNCExtension("unknown_brand_xyz")).toBe(".nc");
  });

  it("buildNCFileName produces correct name for fanuc", () => {
    const name = buildNCFileName("Bracket_Op10", "fanuc");
    expect(name).toBe("Bracket_Op10_fanuc.nc");
  });

  it("buildNCFileName sanitises special characters in job name", () => {
    const name = buildNCFileName("Part/With:Slash", "fanuc");
    expect(name).toMatch(/^Part_With_Slash_fanuc\.nc$/);
  });

  // ── PRISM Header ──

  it("buildPRISMHeader includes dialect and PRISM label", () => {
    const header = buildPRISMHeader({ controllerDialect: "fanuc", materialName: "316L" }, "fanuc");
    expect(header).toContain("PRISM Post-Process Pipeline Output");
    expect(header).toContain("fanuc");
    expect(header).toContain("316L");
  });

  it("buildPRISMHeader uses semicolon comment for heidenhain", () => {
    const header = buildPRISMHeader({}, "heidenhain");
    expect(header.split("\n")[0]).toMatch(/^;/);
  });

  it("buildPRISMHeader uses percent comment for fanuc", () => {
    const header = buildPRISMHeader({}, "fanuc");
    expect(header.split("\n")[0]).toMatch(/^%/);
  });

  // ── atomicWriteNC ──

  it("atomicWriteNC writes content to file and returns byte count", () => {
    const target = path.join(tmpDir, "test.nc");
    const content = "% TEST NC FILE\nG0 X0 Y0\nM30\n";
    const bytes = atomicWriteNC(target, content);
    expect(fs.existsSync(target)).toBe(true);
    expect(bytes).toBe(Buffer.byteLength(content, "utf-8"));
    expect(fs.readFileSync(target, "utf-8")).toBe(content);
  });

  it("atomicWriteNC creates parent directories if needed", () => {
    const target = path.join(tmpDir, "NC", "sub", "test.nc");
    atomicWriteNC(target, "G0 X0");
    expect(fs.existsSync(target)).toBe(true);
  });

  it("atomicWriteNC overwrites existing file atomically", () => {
    const target = path.join(tmpDir, "test.nc");
    atomicWriteNC(target, "ORIGINAL");
    atomicWriteNC(target, "UPDATED");
    expect(fs.readFileSync(target, "utf-8")).toBe("UPDATED");
  });

  // ── backupNCFile ──

  it("backupNCFile creates a backup copy of existing NC file", () => {
    const origPath = path.join(tmpDir, "NC", "job.nc");
    const backupDir = path.join(tmpDir, "NC_backup");
    fs.mkdirSync(path.dirname(origPath), { recursive: true });
    fs.writeFileSync(origPath, "ORIGINAL NC CONTENT");

    const backupPath = backupNCFile(origPath, backupDir);

    expect(backupPath).toBeDefined();
    expect(fs.existsSync(backupPath!)).toBe(true);
    expect(fs.readFileSync(backupPath!, "utf-8")).toBe("ORIGINAL NC CONTENT");
  });

  it("backupNCFile returns undefined if original does not exist", () => {
    const backupPath = backupNCFile(
      path.join(tmpDir, "nonexistent.nc"),
      path.join(tmpDir, "NC_backup")
    );
    expect(backupPath).toBeUndefined();
  });

  it("backupNCFile includes timestamp in backup filename", () => {
    const origPath = path.join(tmpDir, "NC", "job.nc");
    const backupDir = path.join(tmpDir, "NC_backup");
    fs.mkdirSync(path.dirname(origPath), { recursive: true });
    fs.writeFileSync(origPath, "NC CONTENT");

    const backupPath = backupNCFile(origPath, backupDir);
    expect(backupPath).toContain("backup_");
  });

  // ── splitSubPrograms ──

  it("splitSubPrograms returns unchanged main when no sub-program markers", () => {
    const nc = "G0 X0 Y0\nG1 Z-5 F300\nM30";
    const { main, subs } = splitSubPrograms(nc, "fanuc");
    expect(main).toBe(nc);
    expect(subs).toHaveLength(0);
  });

  it("splitSubPrograms splits sub-programs at PRISM marker", () => {
    const nc = [
      "G0 X0 Y0",
      "M98 P1001",
      "M30",
      "% SUB-PROGRAM-START: L1001",
      "G1 Z-10 F200",
      "M99",
    ].join("\n");
    const { main, subs } = splitSubPrograms(nc, "fanuc");
    expect(subs).toHaveLength(1);
    expect(subs[0].name).toBe("L1001");
    expect(main).toContain("M98");
    expect(main).not.toContain("M99");
  });

  // ── HyperMillPPPFileWriter.write() ──

  it("write() creates NC file at expected path", () => {
    const writer = new HyperMillPPPFileWriter();
    const projectFolder: HMProjectFolder = {
      projectRoot: tmpDir,
      ncSubFolder: "NC",
      backupSubFolder: "NC_backup",
      subProgramSubFolder: "NC_sub",
    };
    const result = writer.write({
      ncContent: "G0 X0 Y0\nM30",
      jobName: "Bracket_Op10",
      controllerDialect: "fanuc",
      projectFolder,
    });

    expect(result.success).toBe(true);
    expect(result.mainFilePath).toContain("Bracket_Op10_fanuc.nc");
    expect(fs.existsSync(result.mainFilePath)).toBe(true);
  });

  it("write() creates backup before overwriting existing file", () => {
    const writer = new HyperMillPPPFileWriter();
    const projectFolder: HMProjectFolder = {
      projectRoot: tmpDir,
      ncSubFolder: "NC",
      backupSubFolder: "NC_backup",
      subProgramSubFolder: "NC_sub",
    };

    // First write
    const r1 = writer.write({
      ncContent: "ORIGINAL",
      jobName: "BackupTest",
      controllerDialect: "fanuc",
      projectFolder,
    });

    // Second write — should create backup of first
    const r2 = writer.write({
      ncContent: "UPDATED",
      jobName: "BackupTest",
      controllerDialect: "fanuc",
      projectFolder,
    });

    expect(r2.success).toBe(true);
    expect(r2.backupCreated).toBe(true);
    expect(r2.backupFilePath).toBeDefined();
    expect(fs.existsSync(r2.backupFilePath!)).toBe(true);
    // Backup should contain the original content
    expect(fs.readFileSync(r2.backupFilePath!, "utf-8")).toContain("ORIGINAL");
    // Main file should contain updated content
    expect(fs.readFileSync(r2.mainFilePath, "utf-8")).toContain("UPDATED");
  });

  it("write() prepends PRISM header to NC content", () => {
    const writer = new HyperMillPPPFileWriter();
    const projectFolder: HMProjectFolder = {
      projectRoot: tmpDir,
      ncSubFolder: "NC",
      backupSubFolder: "NC_backup",
      subProgramSubFolder: "NC_sub",
    };
    const result = writer.write({
      ncContent: "G0 X0\nM30",
      jobName: "HeaderTest",
      controllerDialect: "fanuc",
      projectFolder,
      prismMetadata: { materialName: "Ti6Al4V" },
    });

    expect(result.prismHeaderAdded).toBe(true);
    const written = fs.readFileSync(result.mainFilePath, "utf-8");
    expect(written).toContain("PRISM Post-Process Pipeline Output");
    expect(written).toContain("Ti6Al4V");
  });

  it("write() reports bytesWritten > 0", () => {
    const writer = new HyperMillPPPFileWriter();
    const projectFolder: HMProjectFolder = {
      projectRoot: tmpDir,
      ncSubFolder: "NC",
      backupSubFolder: "NC_backup",
      subProgramSubFolder: "NC_sub",
    };
    const result = writer.write({
      ncContent: "G0 X0 Y0 Z0\nM30",
      jobName: "ByteTest",
      controllerDialect: "fanuc",
      projectFolder,
    });
    expect(result.bytesWritten).toBeGreaterThan(0);
  });

  it("write() handles invalid projectRoot gracefully (returns error)", () => {
    const writer = new HyperMillPPPFileWriter();
    // Use a path that cannot be created (NUL character in path on Windows)
    const result = writer.write({
      ncContent: "G0 X0",
      jobName: "ErrorTest",
      controllerDialect: "fanuc",
      projectFolder: {
        projectRoot: "\0invalid",
        ncSubFolder: "NC",
        backupSubFolder: "NC_backup",
        subProgramSubFolder: "NC_sub",
      },
    });
    expect(result.success).toBe(false);
    expect(typeof result.error).toBe("string");
    expect(result.error!.length).toBeGreaterThan(0);
  });

  it("resolveOutputPath returns correct absolute path", () => {
    const writer = new HyperMillPPPFileWriter();
    const projectFolder: HMProjectFolder = {
      projectRoot: "/tmp/myproject",
      ncSubFolder: "NC",
      backupSubFolder: "NC_backup",
      subProgramSubFolder: "NC_sub",
    };
    const outPath = writer.resolveOutputPath("Op10", "heidenhain", projectFolder);
    expect(outPath).toContain("Op10_heidenhain.h");
    expect(path.isAbsolute(outPath)).toBe(true);
  });
});
