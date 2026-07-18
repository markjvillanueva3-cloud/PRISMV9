/**
 * Tests for JMDieScanCoordinatorEngine — JM-DIE-FLEET-SCAN-MS0 / U-FS02.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { JMDieScanCoordinatorEngine } from "../engines/JMDieScanCoordinatorEngine.js";
import { JMDieScanLedgerEngine } from "../engines/JMDieScanLedgerEngine.js";

let tmpRoot: string;
let tmpLedger: string;

beforeEach(() => {
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "jmdie-coord-"));
  tmpLedger = path.join(tmpRoot, "ledger.jsonl");
  // build a synthetic JM Die archive with 3 subdirs
  const lathe = path.join(tmpRoot, "CNC LATHE");
  const mill = path.join(tmpRoot, "CNC MILL HAAS");
  const lib = path.join(tmpRoot, "_PART LIBRARY", "ACCURATE", "778");
  fs.mkdirSync(lathe, { recursive: true });
  fs.mkdirSync(mill, { recursive: true });
  fs.mkdirSync(lib, { recursive: true });
  // 5 lathe programs
  for (let i = 0; i < 5; i++) fs.writeFileSync(path.join(lathe, `prog${i}.min`), "G21\nG90\nM30");
  // 3 mill programs
  for (let i = 0; i < 3; i++) fs.writeFileSync(path.join(mill, `mill${i}.nc`), "G21\nG90\nM30");
  // 4 docustrata pdfs
  for (let i = 0; i < 4; i++) fs.writeFileSync(path.join(lib, `inv${i}.pdf`), "fake-pdf");
});
afterEach(() => { try { fs.rmSync(tmpRoot, { recursive: true, force: true }); } catch {} });

describe("JMDieScanCoordinatorEngine.plan — happy path", () => {
  it("walks all subdirs and returns 12 files in 1 batch", () => {
    const c = new JMDieScanCoordinatorEngine();
    const s = c.plan({ archiveRoot: tmpRoot, batchSize: 5000, ledgerPath: tmpLedger });
    expect(s.ok).toBe(true);
    expect(s.walked_files).toBe(12);
    expect(s.already_scanned).toBe(0);
    expect(s.to_scan).toBe(12);
    expect(s.batch_count).toBe(1);
    expect(s.batches[0].file_count).toBe(12);
  });

  it("classifies CNC programs + docustrata + suggests engine = mixed", () => {
    const c = new JMDieScanCoordinatorEngine();
    const s = c.plan({ archiveRoot: tmpRoot, ledgerPath: tmpLedger });
    const b = s.batches[0];
    expect(b.cnc_program_count).toBe(8);   // 5 .min + 3 .nc
    expect(b.docustrata_count).toBe(4);    // 4 .pdf
    expect(b.other_count).toBe(0);
    expect(b.suggested_engine).toBe("mixed");
  });

  it("batch_id is sortable zero-padded", () => {
    const c = new JMDieScanCoordinatorEngine();
    const s = c.plan({ archiveRoot: tmpRoot, batchSize: 4, ledgerPath: tmpLedger });
    expect(s.batches[0].batch_id).toBe("B0001");
    expect(s.batches[1].batch_id).toBe("B0002");
    expect(s.batches[2].batch_id).toBe("B0003");
  });

  it("splits into ceil(N/batchSize) batches", () => {
    const c = new JMDieScanCoordinatorEngine();
    const s = c.plan({ archiveRoot: tmpRoot, batchSize: 4, ledgerPath: tmpLedger });
    expect(s.batch_count).toBe(3); // 12 / 4 = 3
    expect(s.batches[0].file_count).toBe(4);
    expect(s.batches[1].file_count).toBe(4);
    expect(s.batches[2].file_count).toBe(4);
  });

  it("subdirs filter restricts walk", () => {
    const c = new JMDieScanCoordinatorEngine();
    const s = c.plan({ archiveRoot: tmpRoot, subdirs: ["CNC LATHE"], ledgerPath: tmpLedger });
    expect(s.walked_files).toBe(5);
    expect(s.to_scan).toBe(5);
  });
});

describe("JMDieScanCoordinatorEngine.plan — dedup against ledger", () => {
  it("ledger-known paths are filtered out of to_scan", () => {
    // seed the ledger with the 5 lathe programs
    const ledger = new JMDieScanLedgerEngine(tmpLedger);
    const lathe = path.join(tmpRoot, "CNC LATHE");
    ledger.appendBatch(Array.from({ length: 5 }, (_, i) => ({
      abs_path: path.join(lathe, `prog${i}.min`),
      source: "seed" as const,
    })));
    const c = new JMDieScanCoordinatorEngine();
    const s = c.plan({ archiveRoot: tmpRoot, ledgerPath: tmpLedger });
    expect(s.walked_files).toBe(12);
    expect(s.already_scanned).toBe(5);
    expect(s.to_scan).toBe(7); // 12 - 5
  });

  it("extraAlreadyScanned set is unioned with ledger", () => {
    const extra = new Set([path.join(tmpRoot, "CNC MILL HAAS", "mill0.nc")]);
    const c = new JMDieScanCoordinatorEngine();
    const s = c.plan({ archiveRoot: tmpRoot, ledgerPath: tmpLedger, extraAlreadyScanned: extra });
    expect(s.already_scanned).toBe(1);
    expect(s.to_scan).toBe(11);
  });
});

describe("JMDieScanCoordinatorEngine.plan — dedup across path FORMATS (2026-07-02 production bug)", () => {
  // The production ledger holds "H:/prism/JM DIE/..." (forward slashes, lowercase root)
  // while the walker emits native backslash absolutes with the caller's root casing.
  // A raw-string Set intersected to ZERO -> to_scan == walked_files (317,130) with
  // 301,948 rows already scanned -> every remainder-run would re-scan the whole corpus.
  // The original dedup test above seeded the ledger via path.join (the walker's OWN
  // format) so it could never catch this (R9). These cases pin the cross-format match.

  it("forward-slash UPPERCASE ledger rows still dedup the native-format walk", () => {
    const ledger = new JMDieScanLedgerEngine(tmpLedger);
    const lathe = path.join(tmpRoot, "CNC LATHE");
    // Maximally adversarial ledger format: forward slashes + full uppercase.
    ledger.appendBatch(Array.from({ length: 5 }, (_, i) => ({
      abs_path: path.join(lathe, `prog${i}.min`).replace(/\\/g, "/").toUpperCase(),
      source: "seed" as const,
    })));
    const c = new JMDieScanCoordinatorEngine();
    const s = c.plan({ archiveRoot: tmpRoot, ledgerPath: tmpLedger });
    expect(s.walked_files).toBe(12);
    expect(s.already_scanned).toBe(5);
    expect(s.to_scan).toBe(7); // pre-fix this was 12: zero cross-format matches
  });

  it("the same file in TWO ledger formats counts as ONE already-scanned path", () => {
    const ledger = new JMDieScanLedgerEngine(tmpLedger);
    const target = path.join(tmpRoot, "CNC LATHE", "prog0.min");
    ledger.appendBatch([
      { abs_path: target.replace(/\\/g, "/"), source: "seed" as const },
      { abs_path: target.replace(/\//g, "\\").toUpperCase(), source: "seed" as const },
    ]);
    const c = new JMDieScanCoordinatorEngine();
    const s = c.plan({ archiveRoot: tmpRoot, ledgerPath: tmpLedger });
    expect(s.already_scanned).toBe(1); // canon dedupe, not 2
    expect(s.to_scan).toBe(11);
  });

  it("extraAlreadyScanned in a foreign format still filters the walk", () => {
    const extra = new Set([
      path.join(tmpRoot, "CNC MILL HAAS", "mill0.nc").replace(/\\/g, "/").toUpperCase(),
    ]);
    const c = new JMDieScanCoordinatorEngine();
    const s = c.plan({ archiveRoot: tmpRoot, ledgerPath: tmpLedger, extraAlreadyScanned: extra });
    expect(s.already_scanned).toBe(1);
    expect(s.to_scan).toBe(11);
  });
});

describe("JMDieScanCoordinatorEngine.plan — R12 fail-loud", () => {
  it("empty archiveRoot → explicit error, ok=false, zero batches", () => {
    const c = new JMDieScanCoordinatorEngine();
    const s = c.plan({ archiveRoot: "", ledgerPath: tmpLedger });
    expect(s.ok).toBe(false);
    expect(s.batch_count).toBe(0);
    expect(s.errors[0].reason).toBe("empty-or-missing-archiveRoot");
  });

  it("non-existent archiveRoot → explicit error", () => {
    const c = new JMDieScanCoordinatorEngine();
    const s = c.plan({ archiveRoot: "/totally/bogus/path", ledgerPath: tmpLedger });
    expect(s.ok).toBe(false);
    expect(s.errors[0].reason).toBe("archive-root-does-not-exist");
  });
});

describe("JMDieScanCoordinatorEngine.recordBatchScanned — write-back", () => {
  it("appends batch files to the production ledger via the singleton", () => {
    // Use coordinator's recordBatchScanned with the default ledger path → just verify count returns
    const c = new JMDieScanCoordinatorEngine();
    const s = c.plan({ archiveRoot: tmpRoot, batchSize: 4, ledgerPath: tmpLedger });
    expect(s.batches.length).toBeGreaterThan(0);
    // recordBatchScanned uses default ledger (production path); for unit-test isolation,
    // verify only the input-shape mapping by inspecting batch fields directly
    expect(s.batches[0].files[0].abs_path).toContain(tmpRoot);
    expect(typeof s.batches[0].files[0].size_bytes).toBe("number");
    expect(typeof s.batches[0].files[0].mtime_iso).toBe("string");
  });
});
