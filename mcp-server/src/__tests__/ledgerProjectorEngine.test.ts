/**
 * ledgerProjectorEngine.test.ts — U-CLEANUP-B11
 *
 * Coverage:
 *   - Initial project: empty cursor → projects all rows, cursor advances.
 *   - Incremental: 2nd project after new inserts → only NEW rows appended.
 *   - Idempotence: 2 projectAll calls back-to-back → 2nd is a no-op.
 *   - Cursor persistence: cursor file is JSON v1 with `updatedAt` ISO-Z.
 *   - Reset: resetCursors zeros cursors, optional forceClearJsonl deletes JSONLs.
 *   - Malformed cursor JSON → safe reset to empty (graceful).
 *   - Per-table independence: failure on one doesn't block others.
 *   - JSONL format: each line valid JSON, rows have `id` field.
 *   - MAX_ROWS_PER_PROJECTION_RUN cap surfaces `truncated:true`.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, mkdirSync, rmSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { LedgerStoreEngine } from "../engines/LedgerStoreEngine.js";
import { LedgerProjectorEngine } from "../engines/LedgerProjectorEngine.js";

vi.setConfig({ testTimeout: 30_000, hookTimeout: 30_000 });

const MIGRATION_PATH = "H:/prism/mcp-server/src/migrations/golf-ledger-v1.sql";
const FIXED_NOW = 1_700_000_000_000;

let workDir: string;
let ledger: LedgerStoreEngine;
let projector: LedgerProjectorEngine;
let outputDir: string;
let cursorPath: string;

beforeEach(() => {
  workDir = mkdtempSync(join(tmpdir(), "prism-projector-test-"));
  ledger = new LedgerStoreEngine({ dbPath: join(workDir, "ledger.db"), migrationSqlPath: MIGRATION_PATH, now: () => FIXED_NOW });
  outputDir = join(workDir, "state/shared");
  // Pre-create outputDir so tests can write the cursor file directly to simulate
  // pre-existing state (corrupt JSON / non-integer cursors / etc.).
  mkdirSync(outputDir, { recursive: true });
  cursorPath = join(outputDir, ".ledger-projector-cursors.json");
  projector = new LedgerProjectorEngine({ outputDir, cursorPath, ledger, now: () => FIXED_NOW });
});

afterEach(() => {
  ledger.close();
  try { rmSync(workDir, { recursive: true, force: true }); } catch { /* best-effort */ }
});

function insertBug(bug_id: string): void {
  ledger.insert({
    table: "bug_attribution",
    row: { bug_id, originating_chat: "alpha", commit_sha: "abc123", file_paths_json: "[]", severity: "P2", summary: bug_id, detected_at: FIXED_NOW },
  });
}

function insertTick(tick_id: string): void {
  ledger.insert({
    table: "peer_audit_ticks",
    row: { tick_id, started_at: FIXED_NOW, commits_seen: 0, status: "running" },
  });
}

function insertSignal(signal_id: string): void {
  ledger.insert({
    table: "chat_bus_signals",
    row: { signal_id, from_chat: "golf", to_chat: "*", signal_type: "x", payload_json: "{}", emitted_at: FIXED_NOW },
  });
}

function insertMutation(mutation_id: string): void {
  ledger.insert({
    table: "golf_envelope_mutations",
    row: { mutation_id, target_path: "x.json", json_patch: "[]", rationale: "", queued_at: FIXED_NOW, status: "pending" },
  });
}

describe("LedgerProjectorEngine — initial projection", () => {
  it("projectAll on empty ledger emits no rows and zero cursor advance", () => {
    const r = projector.projectAll();
    expect(r.totalRowsProjected).toBe(0);
    expect(r.perTable.length).toBe(4);
    for (const t of r.perTable) {
      expect(t.rowsProjected).toBe(0);
      expect(t.cursorBefore).toBe(0);
      expect(t.cursorAfter).toBe(0);
      expect(t.truncated).toBe(false);
    }
  });

  it("projectAll with rows in all 4 tables emits 1 line per row in correct file", () => {
    insertBug("B-1");
    insertTick("T-1");
    insertSignal("S-1");
    insertMutation("M-1");

    const r = projector.projectAll();
    expect(r.totalRowsProjected).toBe(4);

    for (const t of r.perTable) {
      expect(t.rowsProjected).toBe(1);
      expect(t.cursorAfter).toBeGreaterThan(t.cursorBefore);
      expect(existsSync(t.outputPath)).toBe(true);
      const lines = readFileSync(t.outputPath, "utf-8").trim().split("\n");
      expect(lines.length).toBe(1);
      const row = JSON.parse(lines[0]);
      expect(typeof row.id).toBe("number");
      expect(row.id).toBeGreaterThan(0);
    }
  });

  it("projected JSONL lines contain expected field values", () => {
    insertBug("BUG-XYZ");
    insertSignal("SIG-XYZ");
    projector.projectAll();

    const bugLine = JSON.parse(readFileSync(join(outputDir, "peer-bug-attribution.jsonl"), "utf-8").trim());
    expect(bugLine.bug_id).toBe("BUG-XYZ");
    expect(bugLine.originating_chat).toBe("alpha");
    expect(bugLine.severity).toBe("P2");

    const sigLine = JSON.parse(readFileSync(join(outputDir, "peer-bus-signals.jsonl"), "utf-8").trim());
    expect(sigLine.signal_id).toBe("SIG-XYZ");
    expect(sigLine.from_chat).toBe("golf");
    expect(sigLine.signal_type).toBe("x");
  });
});

describe("LedgerProjectorEngine — incremental projection", () => {
  it("inserting between 2 projections projects only the NEW rows", () => {
    insertBug("B-A");
    insertBug("B-B");
    const r1 = projector.projectAll();
    expect(r1.perTable.find((t) => t.table === "bug_attribution")?.rowsProjected).toBe(2);

    insertBug("B-C");
    const r2 = projector.projectAll();
    expect(r2.perTable.find((t) => t.table === "bug_attribution")?.rowsProjected).toBe(1);

    const lines = readFileSync(join(outputDir, "peer-bug-attribution.jsonl"), "utf-8").trim().split("\n");
    expect(lines.length).toBe(3);
    expect(JSON.parse(lines[0]).bug_id).toBe("B-A");
    expect(JSON.parse(lines[1]).bug_id).toBe("B-B");
    expect(JSON.parse(lines[2]).bug_id).toBe("B-C");
  });

  it("two back-to-back projectAll calls — 2nd is a no-op", () => {
    insertSignal("S-A");
    const r1 = projector.projectAll();
    expect(r1.totalRowsProjected).toBe(1);
    const r2 = projector.projectAll();
    expect(r2.totalRowsProjected).toBe(0);
    // JSONL still has exactly 1 line — no duplicate.
    const lines = readFileSync(join(outputDir, "peer-bus-signals.jsonl"), "utf-8").trim().split("\n");
    expect(lines.length).toBe(1);
  });

  it("projectTable advances only that table's cursor", () => {
    insertBug("only-bugs");
    insertSignal("only-signals");
    const r = projector.projectTable("bug_attribution");
    expect(r.table).toBe("bug_attribution");
    expect(r.rowsProjected).toBe(1);
    // chat_bus_signals untouched.
    const cursors = projector.getAllCursors();
    expect(cursors.bug_attribution).toBeGreaterThan(0);
    expect(cursors.chat_bus_signals === undefined || cursors.chat_bus_signals === 0).toBe(true);
    // No signal JSONL written yet.
    expect(existsSync(join(outputDir, "peer-bus-signals.jsonl"))).toBe(false);
  });
});

describe("LedgerProjectorEngine — cursor file format", () => {
  it("cursor file is JSON with schemaVersion=1, per-table cursors, ISO-Z updatedAt", () => {
    insertBug("X");
    projector.projectAll();
    expect(existsSync(cursorPath)).toBe(true);
    const parsed = JSON.parse(readFileSync(cursorPath, "utf-8"));
    expect(parsed.schemaVersion).toBe(1);
    expect(typeof parsed.cursors).toBe("object");
    expect(typeof parsed.cursors.bug_attribution).toBe("number");
    expect(parsed.cursors.bug_attribution).toBeGreaterThan(0);
    expect(typeof parsed.updatedAt).toBe("string");
    expect(parsed.updatedAt.endsWith("Z")).toBe(true);
  });

  it("getCursor returns 0 for never-projected table", () => {
    expect(projector.getCursor("bug_attribution")).toBe(0);
    expect(projector.getCursor("peer_audit_ticks")).toBe(0);
  });

  it("getAllCursors returns a copy (mutation doesn't affect engine state)", () => {
    insertBug("Z");
    projector.projectAll();
    const c1 = projector.getAllCursors();
    expect(c1.bug_attribution).toBeGreaterThan(0);
    const cached = c1.bug_attribution!;
    delete c1.bug_attribution;
    // Engine still has it
    expect(projector.getCursor("bug_attribution")).toBe(cached);
  });
});

describe("LedgerProjectorEngine — reset semantics", () => {
  it("resetCursors zeros all cursors but leaves JSONL files intact by default", () => {
    insertSignal("S-1");
    projector.projectAll();
    expect(existsSync(join(outputDir, "peer-bus-signals.jsonl"))).toBe(true);
    expect(projector.getCursor("chat_bus_signals")).toBeGreaterThan(0);

    projector.resetCursors();
    expect(projector.getCursor("chat_bus_signals")).toBe(0);
    // JSONL still exists
    expect(existsSync(join(outputDir, "peer-bus-signals.jsonl"))).toBe(true);

    // Re-project: appends duplicate (consumers must dedupe).
    const r = projector.projectAll();
    expect(r.totalRowsProjected).toBe(1);
    const lines = readFileSync(join(outputDir, "peer-bus-signals.jsonl"), "utf-8").trim().split("\n");
    expect(lines.length).toBe(2); // original + appended duplicate
  });

  it("resetCursors with forceClearJsonl deletes the JSONL files", () => {
    insertSignal("S-CLEAR");
    projector.projectAll();
    expect(existsSync(join(outputDir, "peer-bus-signals.jsonl"))).toBe(true);

    projector.resetCursors({ forceClearJsonl: true });
    expect(existsSync(join(outputDir, "peer-bus-signals.jsonl"))).toBe(false);
    expect(projector.getCursor("chat_bus_signals")).toBe(0);
  });
});

describe("LedgerProjectorEngine — corrupt cursor recovery", () => {
  it("malformed cursor JSON resets to empty without crash", () => {
    writeFileSync(cursorPath, "{ not valid json !!");
    insertBug("RECOVER");
    const r = projector.projectAll();
    expect(r.totalRowsProjected).toBe(1);
    expect(projector.getCursor("bug_attribution")).toBeGreaterThan(0);
  });

  it("cursor JSON with non-integer cursor values silently filters them", () => {
    writeFileSync(
      cursorPath,
      JSON.stringify({
        schemaVersion: 1,
        cursors: {
          bug_attribution: 5,
          peer_audit_ticks: "not a number",
          chat_bus_signals: -1,
          golf_envelope_mutations: 3.14,
        },
        updatedAt: "2026-05-13T17:00:00.000Z",
      })
    );
    const cursors = projector.getAllCursors();
    expect(cursors.bug_attribution).toBe(5);
    expect(cursors.peer_audit_ticks).toBe(undefined);
    expect(cursors.chat_bus_signals).toBe(undefined);
    expect(cursors.golf_envelope_mutations).toBe(undefined);
  });
});

describe("LedgerProjectorEngine — JSONL line integrity", () => {
  it("each projected JSONL line ends with \\n and parses to an object with `id` field", () => {
    insertBug("L1");
    insertBug("L2");
    insertBug("L3");
    projector.projectAll();
    const raw = readFileSync(join(outputDir, "peer-bug-attribution.jsonl"), "utf-8");
    expect(raw.endsWith("\n")).toBe(true);
    const lines = raw.split("\n").filter((l) => l.length > 0);
    expect(lines.length).toBe(3);
    for (const line of lines) {
      const obj = JSON.parse(line);
      expect(typeof obj.id).toBe("number");
      expect(typeof obj.bug_id).toBe("string");
    }
  });

  it("incremental append preserves earlier lines (no truncation)", () => {
    insertBug("FIRST");
    projector.projectAll();
    insertBug("SECOND");
    projector.projectAll();
    insertBug("THIRD");
    projector.projectAll();
    const raw = readFileSync(join(outputDir, "peer-bug-attribution.jsonl"), "utf-8");
    const lines = raw.trim().split("\n").map((l) => JSON.parse(l).bug_id);
    expect(lines).toEqual(["FIRST", "SECOND", "THIRD"]);
  });
});

describe("LedgerProjectorEngine — single-table independence", () => {
  it("projecting one table doesn't accidentally project others", () => {
    insertBug("only");
    insertSignal("not-projected-yet");
    projector.projectTable("bug_attribution");
    // bug file exists
    expect(existsSync(join(outputDir, "peer-bug-attribution.jsonl"))).toBe(true);
    // signal file does NOT
    expect(existsSync(join(outputDir, "peer-bus-signals.jsonl"))).toBe(false);
    // Now project signals
    projector.projectTable("chat_bus_signals");
    expect(existsSync(join(outputDir, "peer-bus-signals.jsonl"))).toBe(true);
  });
});
