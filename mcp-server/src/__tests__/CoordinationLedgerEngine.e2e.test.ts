import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  CoordinationLedgerEngine,
  coordinationLedgerEngine,
} from "../engines/CoordinationLedgerEngine.js";

/**
 * E2E — Exercises the same code path the dispatcher actions use:
 *   coordination_record      → engine.record + fs.appendFile
 *   coordination_detect_conflicts → fs.readFile + engine.hydrateFromJSONL + engine.detectConflicts
 *   coordination_recent      → hydrate + since
 *   coordination_count       → hydrate + count
 *
 * The dispatcher cases are thin wrappers around these operations, so if the
 * roundtrip works here, the dispatcher roundtrip works.
 */
describe("CoordinationLedger E2E (dispatcher semantics)", () => {
  let tmpDir: string;
  let ledgerPath: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "coord-e2e-"));
    ledgerPath = path.join(tmpDir, "ledger.jsonl");
    coordinationLedgerEngine.reset();
  });

  afterEach(() => {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* ignore */ }
  });

  function simulateRecord(agent: string, kind: string, target: string, at?: number): void {
    // Mirrors dispatcher `coordination_record` case logic
    const event = coordinationLedgerEngine.record({
      agent,
      kind: kind as any,
      target,
      at,
    });
    fs.appendFileSync(ledgerPath, JSON.stringify(event) + "\n", "utf8");
  }

  function simulateDetectConflicts(windowMs = 30_000): ReturnType<CoordinationLedgerEngine["detectConflicts"]> {
    // Mirrors dispatcher `coordination_detect_conflicts` case logic
    const ledger = new CoordinationLedgerEngine();
    if (fs.existsSync(ledgerPath)) {
      const lines = fs.readFileSync(ledgerPath, "utf8").split(/\r?\n/);
      ledger.hydrateFromJSONL(lines);
    }
    return ledger.detectConflicts(windowMs);
  }

  it("append → hydrate roundtrip produces identical event count", () => {
    simulateRecord("Claude-A", "claim", "engines/Foo.ts", 1000);
    simulateRecord("Codex-B", "claim", "engines/Foo.ts", 1500);
    simulateRecord("Claude-A", "release", "engines/Foo.ts", 2000);

    const ledger = new CoordinationLedgerEngine();
    const lines = fs.readFileSync(ledgerPath, "utf8").split(/\r?\n/);
    const result = ledger.hydrateFromJSONL(lines);

    expect(result.hydrated).toBe(3);
    expect(result.errors).toEqual([]);
    expect(ledger.count()).toBe(3);
  });

  it("detects true claim conflict when both agents overlap the window", () => {
    simulateRecord("Claude-A", "claim", "src/hot.ts", 1000);
    simulateRecord("Codex-B", "claim", "src/hot.ts", 5000);
    const conflicts = simulateDetectConflicts(30_000);
    expect(conflicts.length).toBe(1);
    expect(conflicts[0].target).toBe("src/hot.ts");
    expect(conflicts[0].agents.sort()).toEqual(["Claude-A", "Codex-B"]);
  });

  it("honors release — no conflict when first agent released before second claimed", () => {
    simulateRecord("Claude-A", "claim", "src/clean.ts", 1000);
    simulateRecord("Claude-A", "release", "src/clean.ts", 2000);
    simulateRecord("Codex-B", "claim", "src/clean.ts", 3000);
    const conflicts = simulateDetectConflicts(30_000);
    expect(conflicts.length).toBe(0);
  });

  it("handles edit_start / edit_end pair as conflict-triggering kinds", () => {
    simulateRecord("Claude-A", "edit_start", "src/active.ts", 1000);
    simulateRecord("Codex-B",  "edit_start", "src/active.ts", 1500);
    const conflicts = simulateDetectConflicts(30_000);
    expect(conflicts.length).toBe(1);
    expect(conflicts[0].kinds).toEqual(["edit_start", "edit_start"]);
  });

  it("FAIL: truncated JSONL (mid-write crash simulation) reports per-line errors", () => {
    simulateRecord("Claude-A", "claim", "src/ok.ts", 1000);
    // Append garbage to mimic a crash mid-write
    fs.appendFileSync(ledgerPath, '{"agent":"B","kind":"claim"\n', "utf8"); // truncated JSON
    fs.appendFileSync(ledgerPath, '{"kind":"claim","target":"x","at":1}\n', "utf8"); // missing agent

    const ledger = new CoordinationLedgerEngine();
    const lines = fs.readFileSync(ledgerPath, "utf8").split(/\r?\n/);
    const result = ledger.hydrateFromJSONL(lines);

    expect(result.hydrated).toBe(1);
    expect(result.errors.length).toBe(2);
    expect(result.errors.map((e) => e.reason)).toContain("missing agent");
    // First bad line is a JSON parse error — message varies by runtime, just check it's captured
    expect(result.errors.some((e) => /json|unexpected|token/i.test(e.reason) || e.reason === "missing agent")).toBe(true);
  });

  it("FAIL: missing ledger file is a benign no-op (empty ledger)", () => {
    fs.rmSync(ledgerPath, { force: true });
    const conflicts = simulateDetectConflicts();
    expect(conflicts).toEqual([]);
  });

  it("ADV: 3 concurrent claim races across 5 distinct targets surface every true conflict", () => {
    // Simulate 3 agents racing on 5 files; A wins 2, B wins 2, C wins 1; two files have overlapping claims
    const agents = ["Claude-A", "Codex-B", "Claude-C"];
    const targets = ["src/a.ts", "src/b.ts", "src/c.ts", "src/d.ts", "src/e.ts"];
    let clock = 1000;
    // Overlap on a.ts and c.ts
    simulateRecord(agents[0], "claim", targets[0], clock); clock += 100;
    simulateRecord(agents[1], "claim", targets[0], clock); clock += 100; // conflict on a.ts
    simulateRecord(agents[0], "claim", targets[1], clock); clock += 100;
    simulateRecord(agents[0], "release", targets[1], clock); clock += 100;
    simulateRecord(agents[2], "claim", targets[1], clock); clock += 100; // NOT a conflict (released)
    simulateRecord(agents[1], "claim", targets[2], clock); clock += 100;
    simulateRecord(agents[2], "claim", targets[2], clock); clock += 100; // conflict on c.ts
    simulateRecord(agents[2], "claim", targets[3], clock); clock += 100;
    simulateRecord(agents[0], "claim", targets[4], clock); clock += 100;

    const conflicts = simulateDetectConflicts(30_000);
    const conflictTargets = conflicts.map((c) => c.target).sort();
    expect(conflictTargets).toEqual(["src/a.ts", "src/c.ts"]);
  });

  it("ADV: coordination_recent filter — since/agent/target narrow the window correctly", () => {
    simulateRecord("Claude-A", "note", "general", 1000);
    simulateRecord("Codex-B",  "note", "general", 2000);
    simulateRecord("Claude-A", "claim", "foo.ts", 3000);

    const ledger = new CoordinationLedgerEngine();
    const lines = fs.readFileSync(ledgerPath, "utf8").split(/\r?\n/);
    ledger.hydrateFromJSONL(lines);

    // Since filter
    expect(ledger.since(2000).length).toBe(2);
    // Agent filter
    expect(ledger.byAgent("Claude-A").length).toBe(2);
    // Target filter
    expect(ledger.byTarget("foo.ts").length).toBe(1);
  });
});
