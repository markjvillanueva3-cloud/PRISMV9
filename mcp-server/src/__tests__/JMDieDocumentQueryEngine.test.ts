/**
 * Tests for JMDieDocumentQueryEngine — JM-DIE-FLEET-SCAN-MS0 / U-FS08.
 *
 * Hermetic: builds a synthetic ledger jsonl in tmpdir per test.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { JMDieDocumentQueryEngine } from "../engines/JMDieDocumentQueryEngine.js";

let tmpDir: string;
let ledgerPath: string;
let engine: JMDieDocumentQueryEngine;

function writeLedger(rows: Array<Record<string, unknown>>): void {
  fs.writeFileSync(ledgerPath, rows.map((r) => JSON.stringify(r)).join("\n") + "\n", "utf8");
}

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "jmdie-query-"));
  ledgerPath = path.join(tmpDir, "ledger.jsonl");
  writeLedger([
    { abs_path: "H:/jm/_PART LIBRARY/ACCURATE/778/setup.pdf", sha_short: "a1", size_bytes: 100, mtime_iso: "2024-06-15T10:00:00.000Z", scanned_at: "2026-05-24T00:00:00Z", source: "financial-baseline", machine_family: "mixed", kind: "docustrata" },
    { abs_path: "H:/jm/_PART LIBRARY/ACCURATE/778/blueprint.pdf", sha_short: "a2", size_bytes: 200, mtime_iso: "2024-07-01T10:00:00.000Z", scanned_at: "2026-05-24T00:00:00Z", source: "financial-baseline", machine_family: "mixed", kind: "docustrata" },
    { abs_path: "H:/jm/CNC LATHE/ACCURATE/778-rev2.MIN", sha_short: "a3", size_bytes: 1500, mtime_iso: "2024-08-12T10:00:00.000Z", scanned_at: "2026-05-24T00:00:00Z", source: "program-analysis", machine_family: "lathe", kind: "cnc-program" },
    { abs_path: "H:/jm/CNC MILL HAAS/ITW/9095-CNMG120408.nc", sha_short: "b1", size_bytes: 2500, mtime_iso: "2024-09-20T10:00:00.000Z", scanned_at: "2026-05-24T00:00:00Z", source: "fleet-scan-batch", machine_family: "mill", kind: "cnc-program" },
    { abs_path: "H:/jm/WIRE EDM/CUSTOM/cnmg120408-fixture.iso", sha_short: "b2", size_bytes: 800, mtime_iso: "2024-10-05T10:00:00.000Z", scanned_at: "2026-05-24T00:00:00Z", source: "fleet-scan-batch", machine_family: "wedm", kind: "cnc-program" },
    { abs_path: "H:/jm/_PART LIBRARY/ITW/9095/quote.pdf", sha_short: "c1", size_bytes: 50, mtime_iso: "2024-11-11T10:00:00.000Z", scanned_at: "2026-05-24T00:00:00Z", source: "financial-baseline", machine_family: "mixed", kind: "docustrata" },
  ]);
  engine = new JMDieDocumentQueryEngine(ledgerPath);
});
afterEach(() => { try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {} });

describe("findByCustomer", () => {
  it("returns ACCURATE customer's 3 docs sorted by mtime desc", () => {
    const r = engine.findByCustomer("ACCURATE");
    expect(r.total_matched).toBe(3);
    expect(r.results[0].abs_path).toContain("778-rev2.MIN"); // newest (2024-08-12)
    expect(r.results[2].abs_path).toContain("setup.pdf"); // oldest (2024-06-15)
  });
  it("kindFilter=docustrata excludes the .MIN program", () => {
    const r = engine.findByCustomer("ACCURATE", 50, "docustrata");
    expect(r.total_matched).toBe(2);
    for (const row of r.results) expect(row.kind).toBe("docustrata");
  });
  it("case-insensitive match — 'accurate' === 'ACCURATE'", () => {
    expect(engine.findByCustomer("accurate").total_matched).toBe(3);
  });
  it("empty customer → R12 reason='empty-customer'", () => {
    const r = engine.findByCustomer("");
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("empty-customer");
  });
});

describe("findByPart", () => {
  it("part '778' returns the 3 ACCURATE-778 files", () => {
    const r = engine.findByPart("778");
    expect(r.total_matched).toBe(3);
  });
  it("part '9095' returns the ITW-9095 docs and program", () => {
    const r = engine.findByPart("9095");
    expect(r.total_matched).toBe(2);
  });
});

describe("findByMachineFamily", () => {
  it("family=lathe returns only the .MIN program", () => {
    const r = engine.findByMachineFamily("lathe");
    expect(r.total_matched).toBe(1);
    expect(r.results[0].abs_path).toContain("778-rev2.MIN");
  });
  it("family=mill returns only the .nc program", () => {
    const r = engine.findByMachineFamily("mill");
    expect(r.total_matched).toBe(1);
  });
  it("family=wedm returns only the .iso fixture", () => {
    const r = engine.findByMachineFamily("wedm");
    expect(r.total_matched).toBe(1);
  });
  it("family=mixed returns all 3 docustrata pdfs", () => {
    const r = engine.findByMachineFamily("mixed");
    expect(r.total_matched).toBe(3);
  });
});

describe("findByExtension", () => {
  it("ext='pdf' returns 3 pdfs", () => {
    const r = engine.findByExtension("pdf");
    expect(r.total_matched).toBe(3);
  });
  it("ext='.MIN' (with leading dot) normalizes to .min match", () => {
    const r = engine.findByExtension(".MIN");
    expect(r.total_matched).toBe(1);
  });
  it("ext='xyz' returns 0 with ok=true", () => {
    const r = engine.findByExtension("xyz");
    expect(r.ok).toBe(true);
    expect(r.total_matched).toBe(0);
  });
});

describe("findByTokens — engineer tool/program search", () => {
  it("token 'cnmg120408' finds both mill .nc and wedm .iso (2 files)", () => {
    const r = engine.findByTokens(["cnmg120408"]);
    expect(r.total_matched).toBe(2);
  });
  it("multi-token OR — ['cnmg120408','778'] finds 5 files (3 ACCURATE + 2 cnmg)", () => {
    const r = engine.findByTokens(["cnmg120408", "778"]);
    expect(r.total_matched).toBe(5);
  });
  it("score ranking — files matching BOTH tokens rank above single-token matches", () => {
    // 3 files. Two match BOTH tokens (score=2), one matches single (score=1).
    // Recency tiebreak: newer file wins among same-score.
    writeLedger([
      { abs_path: "H:/jm/_PART LIBRARY/ITW/9095/cnmg120408-traveler.pdf", sha_short: "x1", size_bytes: 10, mtime_iso: "2026-01-01T00:00:00.000Z", scanned_at: "2026-05-24T00:00:00Z", source: "fleet-scan-batch", machine_family: "mixed", kind: "docustrata" },
      { abs_path: "H:/jm/_PART LIBRARY/ITW/9095/quote.pdf", sha_short: "c1", size_bytes: 50, mtime_iso: "2024-11-11T10:00:00.000Z", scanned_at: "2026-05-24T00:00:00Z", source: "financial-baseline", machine_family: "mixed", kind: "docustrata" },
      { abs_path: "H:/jm/CNC MILL HAAS/ITW/9095-CNMG120408.nc", sha_short: "b1", size_bytes: 2500, mtime_iso: "2024-09-20T10:00:00.000Z", scanned_at: "2026-05-24T00:00:00Z", source: "fleet-scan-batch", machine_family: "mill", kind: "cnc-program" },
    ]);
    const fresh = new JMDieDocumentQueryEngine(ledgerPath);
    const r = fresh.findByTokens(["9095", "cnmg120408"]);
    // 3 matched: 2 score=2 (traveler.pdf 2026 + .nc 2024-09) ordered by recency, 1 score=1 (quote.pdf)
    expect(r.total_matched).toBe(3);
    expect(r.results[0].abs_path).toContain("cnmg120408-traveler.pdf"); // score=2, newest
    expect(r.results[1].abs_path).toContain("9095-CNMG120408.nc");      // score=2, older
    expect(r.results[2].abs_path).toContain("quote.pdf");               // score=1
  });
  it("empty tokens → R12 reason", () => {
    const r = engine.findByTokens([]);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("empty-tokens");
  });
});

describe("customerRollup — SALES/QUOTER overview", () => {
  it("returns top customers ranked by doc count", () => {
    const r = engine.customerRollup();
    expect(r.ok).toBe(true);
    expect(r.total_customers).toBe(2); // ACCURATE + ITW (only _PART LIBRARY entries count)
    expect(r.top_customers[0].customer).toBe("ACCURATE");
    expect(r.top_customers[0].doc_count).toBe(2);
  });
});

describe("R12 fail-loud", () => {
  it("missing ledger → reason='ledger-not-found', ok=false", () => {
    const missingEngine = new JMDieDocumentQueryEngine("/nonexistent/path/ledger.jsonl");
    const r = missingEngine.findByCustomer("ACCURATE");
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("ledger-not-found");
  });
  it("corrupt JSONL line → parse_errors counted, not silenced", () => {
    fs.writeFileSync(ledgerPath, '{"abs_path":"/ok.nc","mtime_iso":"2024-01-01T00:00:00.000Z","source":"seed"}\n{garbage line\n', "utf8");
    const fresh = new JMDieDocumentQueryEngine(ledgerPath);
    const r = fresh.findByCustomer("ok");
    expect(r.parse_errors).toBeGreaterThan(0);
  });
});

describe("mtime cache invalidation", () => {
  it("re-reads ledger when file mtime changes", () => {
    expect(engine.findByCustomer("ACCURATE").total_matched).toBe(3);
    // Sleep to ensure mtime changes (Windows FS has ~10ms resolution)
    const newMtime = new Date(Date.now() + 1000);
    writeLedger([
      { abs_path: "H:/jm/_PART LIBRARY/NEWCO/X/x.pdf", sha_short: "z1", size_bytes: 1, mtime_iso: "2026-01-01T00:00:00.000Z", scanned_at: "2026-05-24T00:00:00Z", source: "seed", machine_family: "mixed", kind: "docustrata" },
    ]);
    fs.utimesSync(ledgerPath, newMtime, newMtime);
    const r = engine.findByCustomer("ACCURATE");
    expect(r.total_matched).toBe(0); // cache invalidated, new ledger has no ACCURATE
    const r2 = engine.findByCustomer("NEWCO");
    expect(r2.total_matched).toBe(1);
  });
});
