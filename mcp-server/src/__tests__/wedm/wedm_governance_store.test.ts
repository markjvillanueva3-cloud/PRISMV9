/**
 * WEDMGovernanceStore tests — WEDM AGI Phase 4 / P4-MS1 / U-P4-10.
 *
 * Covers:
 *  - Envelope schema (schemaVersion, generatedAt, description, state)
 *  - Save / load round-trip (level + history survive across instances)
 *  - Validation rejects malformed files (bad schemaVersion, missing state,
 *    wrong level type, bad history)
 *  - Seed file integrity at data/state/WEDM_AUTONOMY_STATE.json
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import {
  WEDM_AUTONOMY_STATE_FILENAME,
  WEDM_AUTONOMY_STATE_SCHEMA_VERSION,
  WEDMAutonomyStateFile,
  defaultGovernancePath,
  loadGovernanceState,
  readGovernanceFile,
  saveGovernanceState,
  snapshotFromFile,
} from "../../engines/WEDMGovernanceStore.js";
import { WEDMAutonomyEngine } from "../../engines/WEDMAutonomyEngine.js";

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

function tmpFile(): string {
  return path.join(
    os.tmpdir(),
    `wedm-autonomy-state-${Date.now()}-${Math.random().toString(36).slice(2)}.json`,
  );
}

// ----------------------------------------------------------------------------
// Constants
// ----------------------------------------------------------------------------

describe("WEDMGovernanceStore — constants", () => {
  it("schema version is 1", () => {
    expect(WEDM_AUTONOMY_STATE_SCHEMA_VERSION).toBe(1);
  });

  it("filename matches the roadmap convention", () => {
    expect(WEDM_AUTONOMY_STATE_FILENAME).toBe("WEDM_AUTONOMY_STATE.json");
  });

  it("defaultGovernancePath() resolves into data/state/", () => {
    const p = defaultGovernancePath();
    expect(p).toMatch(/WEDM_AUTONOMY_STATE\.json$/);
    expect(p).toMatch(/state/);
  });
});

// ----------------------------------------------------------------------------
// Seed file
// ----------------------------------------------------------------------------

describe("WEDMGovernanceStore — seed file at data/state/", () => {
  const SEED = path.join(process.cwd(), "data", "state", "WEDM_AUTONOMY_STATE.json");

  it("seed file exists and is valid JSON", () => {
    expect(fs.existsSync(SEED)).toBe(true);
    const raw = fs.readFileSync(SEED, "utf-8");
    expect(() => JSON.parse(raw)).not.toThrow();
  });

  it("seed envelope matches v1 shape", () => {
    const file = readGovernanceFile(SEED)!;
    expect(file.schemaVersion).toBe(1);
    expect(typeof file.generatedAt).toBe("string");
    expect(file.description).toMatch(/WEDM|autonomy/i);
    expect(file.state.level).toBe(0);
    expect(file.state.version).toBe(0);
    expect(file.state.history).toEqual([]);
  });

  it("seed file cold-starts at L0 (safest)", () => {
    const file = readGovernanceFile(SEED)!;
    expect(file.state.level).toBe(0);
  });
});

// ----------------------------------------------------------------------------
// Save / load round-trip
// ----------------------------------------------------------------------------

describe("WEDMGovernanceStore — save / load round-trip", () => {
  let tmp: string;

  beforeEach(() => {
    tmp = tmpFile();
  });

  afterEach(() => {
    try {
      if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
    } catch {
      // ignore
    }
  });

  it("save() writes a valid envelope to disk", async () => {
    const engine = new WEDMAutonomyEngine(0);
    await saveGovernanceState(engine, tmp);
    const raw = fs.readFileSync(tmp, "utf-8");
    const parsed = JSON.parse(raw) as WEDMAutonomyStateFile;
    expect(parsed.schemaVersion).toBe(1);
    expect(parsed.state.level).toBe(0);
    expect(parsed.state.history).toEqual([]);
  });

  it("generatedAt is an ISO timestamp close to now", async () => {
    const engine = new WEDMAutonomyEngine(0);
    const before = Date.now();
    await saveGovernanceState(engine, tmp);
    const file = JSON.parse(fs.readFileSync(tmp, "utf-8")) as WEDMAutonomyStateFile;
    const parsed = Date.parse(file.generatedAt);
    const after = Date.now();
    expect(parsed).toBeGreaterThanOrEqual(before - 1);
    expect(parsed).toBeLessThanOrEqual(after + 1);
  });

  it("round-trip preserves level and history across engine instances", async () => {
    const a = new WEDMAutonomyEngine(0);
    a.promote({ actor: "op", reason: "shift_start" });
    a.promote({ actor: "op", reason: "params_stable" });
    await saveGovernanceState(a, tmp);

    const b = new WEDMAutonomyEngine(0);
    loadGovernanceState(b, tmp);
    expect(b.getLevel()).toBe(2);
    expect(b.snapshot().history).toHaveLength(2);
    expect(b.snapshot().history[0].reason).toBe("shift_start");
  });

  it("load() returns null when the file does not exist", () => {
    const engine = new WEDMAutonomyEngine(0);
    const absent = path.join(os.tmpdir(), "does-not-exist-WEDM_AUTONOMY_STATE.json");
    expect(loadGovernanceState(engine, absent)).toBeNull();
  });

  it("readGovernanceFile() returns null when the file does not exist", () => {
    const absent = path.join(os.tmpdir(), "does-not-exist-WEDM_AUTONOMY_STATE.json");
    expect(readGovernanceFile(absent)).toBeNull();
  });

  it("save() creates parent directory if missing", async () => {
    const nested = path.join(
      os.tmpdir(),
      `wedm-gov-${Date.now()}`,
      "nested",
      "WEDM_AUTONOMY_STATE.json",
    );
    const engine = new WEDMAutonomyEngine(2);
    await saveGovernanceState(engine, nested);
    expect(fs.existsSync(nested)).toBe(true);
    fs.unlinkSync(nested);
    fs.rmdirSync(path.dirname(nested));
    fs.rmdirSync(path.dirname(path.dirname(nested)));
  });

  it("save() returns the path it wrote to", async () => {
    const engine = new WEDMAutonomyEngine(0);
    const out = await saveGovernanceState(engine, tmp);
    expect(out).toBe(tmp);
  });
});

// ----------------------------------------------------------------------------
// Validation
// ----------------------------------------------------------------------------

describe("WEDMGovernanceStore — validation", () => {
  let tmp: string;

  beforeEach(() => {
    tmp = tmpFile();
  });

  afterEach(() => {
    try {
      if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
    } catch {
      // ignore
    }
  });

  it("rejects non-object (null) JSON", () => {
    fs.writeFileSync(tmp, "null", "utf-8");
    const e = new WEDMAutonomyEngine(0);
    expect(() => loadGovernanceState(e, tmp)).toThrow();
  });

  it("rejects wrong schemaVersion", () => {
    fs.writeFileSync(
      tmp,
      JSON.stringify({
        schemaVersion: 999,
        generatedAt: new Date().toISOString(),
        description: "bogus",
        state: { level: 0, version: 0, history: [] },
      }),
      "utf-8",
    );
    const e = new WEDMAutonomyEngine(0);
    expect(() => loadGovernanceState(e, tmp)).toThrow(/schemaVersion/i);
  });

  it("rejects missing generatedAt", () => {
    fs.writeFileSync(
      tmp,
      JSON.stringify({
        schemaVersion: 1,
        description: "no ts",
        state: { level: 0, version: 0, history: [] },
      }),
      "utf-8",
    );
    const e = new WEDMAutonomyEngine(0);
    expect(() => loadGovernanceState(e, tmp)).toThrow(/generatedAt/i);
  });

  it("rejects missing state object", () => {
    fs.writeFileSync(
      tmp,
      JSON.stringify({
        schemaVersion: 1,
        generatedAt: new Date().toISOString(),
        description: "no state",
      }),
      "utf-8",
    );
    const e = new WEDMAutonomyEngine(0);
    expect(() => loadGovernanceState(e, tmp)).toThrow(/state/i);
  });

  it("rejects out-of-range level", () => {
    fs.writeFileSync(
      tmp,
      JSON.stringify({
        schemaVersion: 1,
        generatedAt: new Date().toISOString(),
        description: "bad level",
        state: { level: 99, version: 0, history: [] },
      }),
      "utf-8",
    );
    const e = new WEDMAutonomyEngine(0);
    expect(() => loadGovernanceState(e, tmp)).toThrow(/level/i);
  });

  it("rejects non-array history", () => {
    fs.writeFileSync(
      tmp,
      JSON.stringify({
        schemaVersion: 1,
        generatedAt: new Date().toISOString(),
        description: "bad history",
        state: { level: 0, version: 0, history: "nope" },
      }),
      "utf-8",
    );
    const e = new WEDMAutonomyEngine(0);
    expect(() => loadGovernanceState(e, tmp)).toThrow(/history/i);
  });
});

// ----------------------------------------------------------------------------
// Introspection helper
// ----------------------------------------------------------------------------

describe("WEDMGovernanceStore — snapshotFromFile()", () => {
  it("builds a snapshot-like object without an engine", () => {
    const file: WEDMAutonomyStateFile = {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      description: "test",
      state: {
        level: 3,
        version: 1,
        history: [
          {
            from: 2,
            to: 3,
            at: "2026-04-16T00:00:00.000Z",
            actor: "op",
            reason: "r",
            forced: false,
          },
        ],
      },
    };
    const snap = snapshotFromFile(file);
    expect(snap.level).toBe(3);
    expect(snap.version).toBe(1);
    expect(snap.history).toHaveLength(1);
    expect(snap.last!.from).toBe(2);
  });

  it("empty history → snap.last is undefined", () => {
    const file: WEDMAutonomyStateFile = {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      description: "t",
      state: { level: 0, version: 0, history: [] },
    };
    const snap = snapshotFromFile(file);
    expect(snap.last).toBeUndefined();
  });
});
