/**
 * Tests for JMDieFleetWideIngestEngine — JM-DIE-PROGRAM-ANALYSIS-MS0 / U-JP04.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { JMDieFleetWideIngestEngine } from "../engines/JMDieFleetWideIngestEngine.js";

const eng = new JMDieFleetWideIngestEngine();

let tmpRoot: string;
beforeEach(() => {
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "jmdie-fleet-"));
  // Lathe dir
  const lathe = path.join(tmpRoot, "CNC LATHE", "ACCURATE", "778");
  fs.mkdirSync(lathe, { recursive: true });
  fs.writeFileSync(path.join(lathe, "778.nc"), "G21 G90\nG01 X10 F500\nM30");
  // Mill dir
  const mill = path.join(tmpRoot, "CNC MILL HAAS", "ITW", "999");
  fs.mkdirSync(mill, { recursive: true });
  fs.writeFileSync(path.join(mill, "999.min"), "G21 G90\nG01 X20 F1000\nM30");
  // WEDM dir
  const wedm = path.join(tmpRoot, "WIRE EDM", "5050");
  fs.mkdirSync(wedm, { recursive: true });
  fs.writeFileSync(path.join(wedm, "wire-program.iso"), "G21\nG01 X5 F100\nM30");
  fs.writeFileSync(path.join(wedm, "notes.pdf"), "fake");
  // Unknown / unmapped dir
  const unknown = path.join(tmpRoot, "RANDOM_NEW_DIR");
  fs.mkdirSync(unknown, { recursive: true });
  fs.writeFileSync(path.join(unknown, "x.txt"), "hello");
});
afterEach(() => { try { fs.rmSync(tmpRoot, { recursive: true, force: true }); } catch {} });

describe("JMDieFleetWideIngestEngine.ingest — happy path", () => {
  it("walks all 4 subdirs and returns 5 file records (excluding any nested dir walk skips)", () => {
    const s = eng.ingest(tmpRoot, { limit: 100 });
    expect(s.records.length).toBe(5);
    expect(s.subdirs_walked.length).toBe(4);
  });

  it("classifies machine_family correctly per subdir", () => {
    const s = eng.ingest(tmpRoot, { limit: 100 });
    const lathe = s.records.find((r) => r.archive_subdir === "CNC LATHE");
    const mill = s.records.find((r) => r.archive_subdir === "CNC MILL HAAS");
    const wedm = s.records.find((r) => r.archive_subdir === "WIRE EDM");
    const unk = s.records.find((r) => r.archive_subdir === "RANDOM_NEW_DIR");
    expect(lathe?.machine_family).toBe("lathe");
    expect(mill?.machine_family).toBe("mill");
    expect(wedm?.machine_family).toBe("wedm");
    expect(unk?.machine_family).toBe("unknown");
  });

  it("by_family rollup matches per-record classification", () => {
    const s = eng.ingest(tmpRoot, { limit: 100 });
    expect(s.by_family.lathe).toBe(1);
    expect(s.by_family.mill).toBe(1);
    expect(s.by_family.wedm).toBe(2);  // .iso + .pdf both under WIRE EDM
    expect(s.by_family.unknown).toBe(1);
  });

  it("is_cnc_program true for .nc/.min/.iso, false for .pdf/.txt", () => {
    const s = eng.ingest(tmpRoot, { limit: 100 });
    expect(s.records.find((r) => r.extension === "nc")?.is_cnc_program).toBe(true);
    expect(s.records.find((r) => r.extension === "min")?.is_cnc_program).toBe(true);
    expect(s.records.find((r) => r.extension === "iso")?.is_cnc_program).toBe(true);
    expect(s.records.find((r) => r.extension === "pdf")?.is_cnc_program).toBe(false);
    expect(s.records.find((r) => r.extension === "txt")?.is_cnc_program).toBe(false);
  });

  it("subdirs filter restricts walk", () => {
    const s = eng.ingest(tmpRoot, { limit: 100, subdirs: ["CNC LATHE", "CNC MILL HAAS"] });
    expect(s.records.length).toBe(2);
    expect(s.subdirs_walked.length).toBe(2);
  });

  it("limit honored across subdirs", () => {
    const s = eng.ingest(tmpRoot, { limit: 2 });
    expect(s.records.length).toBe(2);
  });
});

describe("JMDieFleetWideIngestEngine.ingest — failure modes (R12 fail-loud)", () => {
  it("empty archiveRoot → no records + explicit error", () => {
    const s = eng.ingest("");
    expect(s.records.length).toBe(0);
    expect(s.errors[0].reason).toBe("empty-or-missing-archiveRoot");
  });

  it("non-existent archiveRoot → explicit error", () => {
    const s = eng.ingest("/totally/bogus/path");
    expect(s.errors[0].reason).toBe("archive-root-does-not-exist");
  });
});

describe("JMDieFleetWideIngestEngine.ingest — file metadata", () => {
  it("rel_path is forward-slash-normalized", () => {
    const s = eng.ingest(tmpRoot, { limit: 100 });
    for (const r of s.records) {
      expect(r.rel_path.includes("\\")).toBe(false);
    }
  });

  it("size_bytes and mtime_iso populated for every record", () => {
    const s = eng.ingest(tmpRoot, { limit: 100 });
    for (const r of s.records) {
      expect(r.size_bytes).toBeGreaterThan(0);
      expect(r.mtime_iso).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    }
  });
});
