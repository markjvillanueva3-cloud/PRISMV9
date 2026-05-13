/**
 * telemetry-close-out.test.ts — CLEANUP-MS0 / U-CLEANUP-TELEMETRY-CLOSE
 *
 * Pure tests for the wrapper around pipeline-telemetry + adaptive-thresholds +
 * auto-build-compounding-proposals. Spawn is fully injected (no real child
 * processes); telemetry read is also injected via `readTelemetryFn`.
 * Every assertion checks a concrete observable value.
 */

import { describe, it, expect } from "vitest";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  parseArgs,
  readTelemetry,
  computeStageCoverage,
  shouldAutoBuild,
  runChildScript,
  closeOut,
  CANONICAL_STAGES,
} from "../../../scripts/telemetry-close-out.mjs";

describe("CANONICAL_STAGES", () => {
  it("exposes all 18 canonical rgs/forge stages, frozen", () => {
    expect(Array.isArray(CANONICAL_STAGES)).toBe(true);
    expect(CANONICAL_STAGES.length).toBe(18);
    expect(Object.isFrozen(CANONICAL_STAGES)).toBe(true);
    // Spot-check a few critical anchors.
    expect(CANONICAL_STAGES).toContain("S0");
    expect(CANONICAL_STAGES).toContain("S11.5");
    expect(CANONICAL_STAGES).toContain("S11.6");
    expect(CANONICAL_STAGES).toContain("phase4_loop");
    expect(CANONICAL_STAGES).toContain("phase6_handoff");
  });
});

describe("parseArgs", () => {
  it("returns documented defaults on empty argv", () => {
    const a = parseArgs([]);
    expect(a.milestone).toBe(null);
    expect(a.dryRun).toBe(false);
    expect(a.skipAutoBuild).toBe(false);
    expect(a.json).toBe(false);
  });

  it("parses every flag and captures a milestone id", () => {
    const a = parseArgs([
      "--milestone", "CLEANUP-MS0",
      "--dry-run",
      "--skip-auto-build",
      "--json",
    ]);
    expect(a.milestone).toBe("CLEANUP-MS0");
    expect(a.dryRun).toBe(true);
    expect(a.skipAutoBuild).toBe(true);
    expect(a.json).toBe(true);
  });

  it("ignores unrecognized flags without crashing", () => {
    const a = parseArgs(["--unknown", "value", "--milestone", "X"]);
    expect(a.milestone).toBe("X");
  });
});

describe("readTelemetry", () => {
  let dir: string;
  function makeDir() { dir = mkdtempSync(join(tmpdir(), "tco-")); return dir; }
  function cleanup() { try { rmSync(dir, { recursive: true, force: true }); } catch { /* tolerate */ } }

  it("returns readError='telemetry-missing' for an absent path", () => {
    makeDir();
    try {
      const r = readTelemetry(join(dir, "no.jsonl"));
      expect(r.readError).toBe("telemetry-missing");
      expect(r.records).toHaveLength(0);
    } finally { cleanup(); }
  });

  it("returns empty + null readError for an empty file", () => {
    makeDir();
    const p = join(dir, "empty.jsonl");
    writeFileSync(p, "", "utf-8");
    try {
      const r = readTelemetry(p);
      expect(r.readError).toBe(null);
      expect(r.records).toHaveLength(0);
    } finally { cleanup(); }
  });

  it("parses every valid line and skips malformed JSON", () => {
    makeDir();
    const p = join(dir, "mixed.jsonl");
    writeFileSync(p,
      '{"stage":"S0","event":"stage_entry","milestone":"M1"}\n' +
      'NOT JSON\n' +
      '{"stage":"S11.6","event":"violation","milestone":"M1","payload":{"severity":"BLOCK"}}\n' +
      '\n',
      "utf-8");
    try {
      const r = readTelemetry(p);
      expect(r.readError).toBe(null);
      expect(r.records).toHaveLength(2);
      expect(r.records[0].stage).toBe("S0");
      expect(r.records[1].stage).toBe("S11.6");
      expect(r.records[1].payload.severity).toBe("BLOCK");
    } finally { cleanup(); }
  });
});

describe("computeStageCoverage", () => {
  it("returns 0 covered for an empty record list", () => {
    const c = computeStageCoverage([]);
    expect(c.covered).toHaveLength(0);
    expect(c.missing).toEqual(CANONICAL_STAGES as unknown as string[]);
    expect(c.totalRecords).toBe(0);
  });

  it("returns the exact subset of stages seen in records, in canonical order", () => {
    const records = [
      { stage: "S11.6" },
      { stage: "S0" },
      { stage: "S0" },        // dedup
      { stage: "phase4_loop" },
      { stage: "not-a-stage" }, // ignored — not in CANONICAL_STAGES
    ];
    const c = computeStageCoverage(records);
    expect(c.covered).toEqual(["S0", "S11.6", "phase4_loop"]);
    expect(c.missing.length).toBe(CANONICAL_STAGES.length - 3);
    expect(c.missing).toContain("S11.5");
    expect(c.missing).not.toContain("S0");
    expect(c.totalRecords).toBe(5);
  });

  it("ignores records without a stage field or with non-string stages", () => {
    const records = [
      { event: "stage_entry" },     // no stage
      { stage: null },              // bad type
      { stage: 42 },                // bad type
      { stage: "S1" },              // valid
    ];
    const c = computeStageCoverage(records);
    expect(c.covered).toEqual(["S1"]);
    expect(c.totalRecords).toBe(4);
  });
});

describe("shouldAutoBuild", () => {
  it("returns false when milestone is missing", () => {
    const records = [{ milestone: "M1", stage: "S11.6", event: "violation", payload: { severity: "BLOCK" } }];
    expect(shouldAutoBuild(records, null as any)).toBe(false);
    expect(shouldAutoBuild(records, "")).toBe(false);
  });

  it("returns false when no S11.6 BLOCK exists for the target milestone", () => {
    const records = [
      { milestone: "OTHER", stage: "S11.6", event: "violation", payload: { severity: "BLOCK" } },
      { milestone: "M1",     stage: "S11.6", event: "outcome",   payload: { severity: "PASS" } },
      { milestone: "M1",     stage: "S0",    event: "stage_entry" },
    ];
    expect(shouldAutoBuild(records, "M1")).toBe(false);
  });

  it("returns true on payload.severity === 'BLOCK'", () => {
    const records = [
      { milestone: "M1", stage: "S11.6", event: "violation", payload: { severity: "BLOCK" } },
    ];
    expect(shouldAutoBuild(records, "M1")).toBe(true);
  });

  it("returns true on payload.kind === 'compounding-gains-block'", () => {
    const records = [
      { milestone: "M1", stage: "S11.6", event: "violation", payload: { kind: "compounding-gains-block" } },
    ];
    expect(shouldAutoBuild(records, "M1")).toBe(true);
  });

  it("does NOT trigger on the wrong stage or wrong event", () => {
    const records = [
      { milestone: "M1", stage: "S11.5", event: "violation", payload: { severity: "BLOCK" } },
      { milestone: "M1", stage: "S11.6", event: "stage_entry" },
    ];
    expect(shouldAutoBuild(records, "M1")).toBe(false);
  });
});

describe("runChildScript", () => {
  it("returns script-missing when the path does not exist (no spawn attempted)", () => {
    let spawnCalls = 0;
    const r = runChildScript("/definitely/not/here.mjs", [], {
      spawnFn: () => { spawnCalls += 1; return { status: 0, stdout: "", stderr: "" } as any; },
    });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/script-missing/);
    expect(spawnCalls).toBe(0);
  });

  it("forwards args and reports exitCode + stdout/stderr from spawnFn", () => {
    // Use a guaranteed-existing file as the "script" (we override spawn).
    const fakeScript = "H:/prism/package.json";
    let capturedArgs: string[] = [];
    const r = runChildScript(fakeScript, ["--dry-run", "--milestone", "M1"], {
      spawnFn: (_node: string, args: string[]) => {
        capturedArgs = args;
        return { status: 0, stdout: "OK\n", stderr: "" } as any;
      },
    });
    expect(r.ok).toBe(true);
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toBe("OK\n");
    // First arg is the script path itself.
    expect(capturedArgs[0]).toBe(fakeScript);
    expect(capturedArgs.slice(1)).toEqual(["--dry-run", "--milestone", "M1"]);
  });

  it("reports a non-zero exit as ok=false and surfaces stderr", () => {
    const fakeScript = "H:/prism/package.json";
    const r = runChildScript(fakeScript, [], {
      spawnFn: () => ({ status: 2, stdout: "", stderr: "boom\n" } as any),
    });
    expect(r.ok).toBe(false);
    expect(r.exitCode).toBe(2);
    expect(r.stderr).toBe("boom\n");
  });

  it("surfaces spawn errors without throwing", () => {
    const fakeScript = "H:/prism/package.json";
    const r = runChildScript(fakeScript, [], {
      spawnFn: () => { throw new Error("ENOENT bad spawn"); },
    });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/spawn-threw.*ENOENT/);
  });
});

describe("closeOut — orchestration", () => {
  function fakeRead(records: any[], readError: string | null = null) {
    return () => ({ records, readError });
  }

  it("calls adaptive-thresholds and reports success when all child scripts return 0", () => {
    const spawnCalls: string[] = [];
    const r = closeOut(
      { milestone: null, dryRun: false, skipAutoBuild: false, json: false },
      {
        readTelemetryFn: fakeRead([{ stage: "S0" }, { stage: "S11.6" }]),
        spawnFn: (_node: string, args: string[]) => {
          spawnCalls.push(args[0]);
          return { status: 0, stdout: "ok\n", stderr: "" } as any;
        },
      },
    );
    expect(r.ok).toBe(true);
    expect(r.adaptiveThresholds?.ok).toBe(true);
    expect(r.telemetry.totalRecords).toBe(2);
    expect(r.telemetry.covered).toEqual(["S0", "S11.6"]);
    // 2 of 18 stages covered → 16 missing
    expect(r.telemetry.missing.length).toBe(16);
    // No milestone → no auto-build attempt
    expect(r.autoBuild.ran).toBe(false);
    expect(r.autoBuild.reason).toMatch(/no milestone/);
  });

  it("forwards --dry-run to adaptive-thresholds and marks dryRun in summary", () => {
    let captured: string[] = [];
    closeOut(
      { milestone: null, dryRun: true, skipAutoBuild: false, json: false },
      {
        readTelemetryFn: fakeRead([]),
        spawnFn: (_node: string, args: string[]) => {
          if (args[0].endsWith("adaptive-thresholds.mjs")) captured = args.slice(1);
          return { status: 0, stdout: "", stderr: "" } as any;
        },
      },
    );
    expect(captured).toEqual(["--dry-run"]);
  });

  it("skips auto-build when --skip-auto-build is set, even with S11.6 BLOCK present", () => {
    const records = [
      { milestone: "M1", stage: "S11.6", event: "violation", payload: { severity: "BLOCK" } },
    ];
    let autoBuildSpawned = false;
    const r = closeOut(
      { milestone: "M1", dryRun: false, skipAutoBuild: true, json: false },
      {
        readTelemetryFn: fakeRead(records),
        spawnFn: (_node: string, args: string[]) => {
          if (args[0].endsWith("auto-build-compounding-proposals.mjs")) autoBuildSpawned = true;
          return { status: 0, stdout: "", stderr: "" } as any;
        },
      },
    );
    expect(autoBuildSpawned).toBe(false);
    expect(r.autoBuild.ran).toBe(false);
    expect(r.autoBuild.reason).toMatch(/skip-auto-build/);
  });

  it("triggers auto-build when milestone has S11.6 BLOCK and skip flag is off", () => {
    const records = [
      { milestone: "M1", stage: "S11.6", event: "violation", payload: { severity: "BLOCK" } },
    ];
    const spawnedScripts: string[] = [];
    const r = closeOut(
      { milestone: "M1", dryRun: false, skipAutoBuild: false, json: false },
      {
        readTelemetryFn: fakeRead(records),
        spawnFn: (_node: string, args: string[]) => {
          spawnedScripts.push(args[0]);
          return { status: 0, stdout: "", stderr: "" } as any;
        },
      },
    );
    expect(r.autoBuild.ran).toBe(true);
    expect((r.autoBuild as any).ok).toBe(true);
    expect(spawnedScripts.some((s) => s.endsWith("auto-build-compounding-proposals.mjs"))).toBe(true);
  });

  it("marks the run as failed when adaptive-thresholds returns non-zero", () => {
    const r = closeOut(
      { milestone: null, dryRun: false, skipAutoBuild: false, json: false },
      {
        readTelemetryFn: fakeRead([]),
        spawnFn: () => ({ status: 3, stdout: "", stderr: "boom\n" } as any),
      },
    );
    expect(r.ok).toBe(false);
    expect(r.errors.length).toBeGreaterThanOrEqual(1);
    expect(r.errors[0]).toMatch(/adaptive-thresholds/);
    expect(r.errors[0]).toMatch(/exit 3/);
  });

  it("does not crash when the telemetry ledger is missing", () => {
    const r = closeOut(
      { milestone: null, dryRun: false, skipAutoBuild: false, json: false },
      {
        readTelemetryFn: () => ({ records: [], readError: "telemetry-missing" }),
        spawnFn: () => ({ status: 0, stdout: "", stderr: "" } as any),
      },
    );
    expect(r.telemetry.readError).toBe("telemetry-missing");
    expect(r.telemetry.totalRecords).toBe(0);
    expect(r.telemetry.covered).toHaveLength(0);
    expect(r.telemetry.missing.length).toBe(CANONICAL_STAGES.length);
    expect(r.ok).toBe(true); // missing telemetry is not fatal
  });

  it("records the milestone name and dryRun flag in the summary", () => {
    const r = closeOut(
      { milestone: "CLEANUP-MS0", dryRun: true, skipAutoBuild: true, json: true },
      {
        readTelemetryFn: fakeRead([]),
        spawnFn: () => ({ status: 0, stdout: "", stderr: "" } as any),
      },
    );
    expect(r.milestone).toBe("CLEANUP-MS0");
    expect(r.dryRun).toBe(true);
    expect(r.skipAutoBuild).toBe(true);
    expect(r.schemaVersion).toBe(1);
  });
});
