/**
 * Tests for JMDieScanLedgerEngine — JM-DIE-FLEET-SCAN-MS0 / U-FS01.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { JMDieScanLedgerEngine, canonScanPath } from "../engines/JMDieScanLedgerEngine.js";

let tmpDir: string;
let ledgerPath: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "jmdie-ledger-"));
  ledgerPath = path.join(tmpDir, "ledger.jsonl");
});
afterEach(() => { try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {} });

describe("JMDieScanLedgerEngine.appendBatch — write path", () => {
  it("creates parent directory on first append", () => {
    const nested = path.join(tmpDir, "deep", "nest", "ledger.jsonl");
    const eng = new JMDieScanLedgerEngine(nested);
    const r = eng.appendBatch([{ abs_path: "/x/y/z.nc", source: "fleet-scan-batch" }]);
    expect(r.appended).toBe(1);
    expect(fs.existsSync(nested)).toBe(true);
  });

  it("appends N rows for N inputs", () => {
    const eng = new JMDieScanLedgerEngine(ledgerPath);
    const inputs = Array.from({ length: 7 }, (_, i) => ({
      abs_path: `/jm/lathe/p${i}.nc`,
      size_bytes: 100 + i,
      source: "fleet-scan-batch" as const,
    }));
    const r = eng.appendBatch(inputs);
    expect(r.appended).toBe(7);
    const content = fs.readFileSync(ledgerPath, "utf8").trim().split("\n");
    expect(content.length).toBe(7);
  });

  it("empty input returns appended=0 and writes no file", () => {
    const eng = new JMDieScanLedgerEngine(ledgerPath);
    const r = eng.appendBatch([]);
    expect(r.appended).toBe(0);
    expect(fs.existsSync(ledgerPath)).toBe(false);
  });

  it("skips rows with missing/empty abs_path (R12 fail-loud — no silent acceptance)", () => {
    const eng = new JMDieScanLedgerEngine(ledgerPath);
    const r = eng.appendBatch([
      { abs_path: "", source: "fleet-scan-batch" },
      { abs_path: "/good.nc", source: "fleet-scan-batch" },
      // @ts-expect-error — intentionally bad input
      { source: "fleet-scan-batch" },
    ]);
    expect(r.appended).toBe(1);
  });

  it("computes sha_short as first 8 hex of sha256(abs_path) — deterministic", () => {
    const eng = new JMDieScanLedgerEngine(ledgerPath);
    eng.appendBatch([{ abs_path: "/jm/lathe/A.nc", source: "fleet-scan-batch" }]);
    eng.appendBatch([{ abs_path: "/jm/lathe/A.nc", source: "fleet-scan-batch" }]);
    const lines = fs.readFileSync(ledgerPath, "utf8").trim().split("\n");
    const row1 = JSON.parse(lines[0]);
    const row2 = JSON.parse(lines[1]);
    expect(row1.sha_short).toBe(row2.sha_short);
    expect(row1.sha_short).toMatch(/^[0-9a-f]{8}$/);
  });
});

describe("JMDieScanLedgerEngine.loadScanned — read path", () => {
  it("non-existent ledger → empty Set, zero parse errors", () => {
    const eng = new JMDieScanLedgerEngine(ledgerPath);
    const r = eng.loadScanned();
    expect(r.paths.size).toBe(0);
    expect(r.parse_errors).toBe(0);
  });

  it("de-duplicates abs_paths across multiple appendBatch calls", () => {
    const eng = new JMDieScanLedgerEngine(ledgerPath);
    eng.appendBatch([{ abs_path: "/a.nc", source: "fleet-scan-batch" }]);
    eng.appendBatch([{ abs_path: "/a.nc", source: "seed" }]);
    eng.appendBatch([{ abs_path: "/b.nc", source: "fleet-scan-batch" }]);
    const r = eng.loadScanned();
    expect(r.paths.size).toBe(2);
    expect(r.paths.has("/a.nc")).toBe(true);
    expect(r.paths.has("/b.nc")).toBe(true);
  });

  it("counts parse errors on corrupt JSON lines (R12 — surface, never swallow)", () => {
    fs.writeFileSync(ledgerPath, '{"abs_path":"/ok.nc","source":"seed"}\n{garbage\n{"abs_path":"/ok2.nc","source":"seed"}\n', "utf8");
    const eng = new JMDieScanLedgerEngine(ledgerPath);
    const r = eng.loadScanned();
    expect(r.paths.size).toBe(2);
    expect(r.parse_errors).toBe(1);
  });
});

describe("JMDieScanLedgerEngine.stats — aggregate", () => {
  it("empty ledger → zero totals", () => {
    const eng = new JMDieScanLedgerEngine(ledgerPath);
    const s = eng.stats();
    expect(s.total_rows).toBe(0);
    expect(s.unique_paths).toBe(0);
    expect(s.by_source).toEqual({});
  });

  it("by_source and by_kind tallies match input", () => {
    const eng = new JMDieScanLedgerEngine(ledgerPath);
    eng.appendBatch([
      { abs_path: "/p1.nc", source: "program-analysis", kind: "cnc-program" },
      { abs_path: "/p2.nc", source: "program-analysis", kind: "cnc-program" },
      { abs_path: "/doc1.pdf", source: "financial-baseline", kind: "docustrata" },
    ]);
    const s = eng.stats();
    expect(s.total_rows).toBe(3);
    expect(s.unique_paths).toBe(3);
    expect(s.by_source["program-analysis"]).toBe(2);
    expect(s.by_source["financial-baseline"]).toBe(1);
    expect(s.by_kind["cnc-program"]).toBe(2);
    expect(s.by_kind["docustrata"]).toBe(1);
  });
});

describe("canonScanPath — cross-format comparison key (2026-07-02 planner bug)", () => {
  // Production ledger rows read "H:/prism/JM DIE/..." while the walker emits
  // "H:\PRISM\JM DIE\..." -- raw compare matched ZERO of 301,948 scanned rows.
  it("backslash and forward-slash forms of the same path canonicalize equal", () => {
    expect(canonScanPath(String.raw`H:\PRISM\JM DIE\CNC LATHE\12345.mcx-8`))
      .toBe(canonScanPath("H:/prism/JM DIE/CNC LATHE/12345.mcx-8"));
  });

  it("case differences fold (NTFS is case-insensitive)", () => {
    expect(canonScanPath("H:/PRISM/JM DIE/A.MIN")).toBe(canonScanPath("h:/prism/jm die/a.min"));
  });

  it("distinct files stay distinct", () => {
    expect(canonScanPath("H:/prism/JM DIE/a.min")).not.toBe(canonScanPath("H:/prism/JM DIE/b.min"));
  });

  it("stats() unique_paths counts canon-unique, not per-format", () => {
    const eng = new JMDieScanLedgerEngine(ledgerPath);
    eng.appendBatch([
      { abs_path: "H:/prism/JM DIE/CNC LATHE/prog0.min", source: "seed" },
      { abs_path: String.raw`H:\PRISM\JM DIE\CNC LATHE\PROG0.MIN`, source: "fleet-scan-batch" },
      { abs_path: "H:/prism/JM DIE/CNC LATHE/prog1.min", source: "seed" },
    ]);
    const s = eng.stats();
    expect(s.total_rows).toBe(3);
    expect(s.unique_paths).toBe(2); // prog0 in two formats = ONE file
  });
});
