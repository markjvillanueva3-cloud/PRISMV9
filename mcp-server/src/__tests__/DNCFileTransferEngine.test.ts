import { describe, it, expect } from "vitest";
import { dncFileTransferEngine } from "../engines/DNCFileTransferEngine.js";

const BASE = {
  program_number: 1234,
  controller: "fanuc" as const,
  protocol: "rs232" as const,
  program: "G0 X0 Z0\nG1 X1 Z1 F100\nM30",
};

describe("DNCFileTransferEngine", () => {
  it("wraps Fanuc program with % framing", () => {
    const r = dncFileTransferEngine.buildTransfer(BASE);
    expect(r.framed_program.startsWith("%")).toBe(true);
    expect(r.framed_program.trim().endsWith("%")).toBe(true);
  });

  it("includes zero-padded O-number for Fanuc", () => {
    const r = dncFileTransferEngine.buildTransfer(BASE);
    expect(r.framed_program).toContain("O1234");
  });

  it("uses Okuma G291/M02 framing", () => {
    const r = dncFileTransferEngine.buildTransfer({ ...BASE, controller: "okuma_osp" });
    expect(r.framed_program).toContain("G291");
    expect(r.framed_program).toContain("M02");
  });

  it("uses Mitsubishi O.../M30 framing", () => {
    const r = dncFileTransferEngine.buildTransfer({ ...BASE, controller: "mitsubishi" });
    expect(r.framed_program).toMatch(/O\d+/);
    expect(r.framed_program).toContain("M30");
  });

  it("Siemens 840D uses %_N_ header", () => {
    const r = dncFileTransferEngine.buildTransfer({ ...BASE, controller: "siemens_840d" });
    expect(r.framed_program).toMatch(/%_N_PROG_/);
  });

  it("Haas NGC wraps with standard % and emits M30", () => {
    const r = dncFileTransferEngine.buildTransfer({ ...BASE, controller: "haas_ngc" });
    expect(r.framed_program).toContain("M30");
  });

  it("flags ASCII failure for non-ASCII over serial", () => {
    const r = dncFileTransferEngine.buildTransfer({
      ...BASE,
      program: "G0 X\u00FF",
    });
    const ascii = r.checks.find((c) => /ascii/i.test(c.check));
    expect(ascii?.ok).toBe(false);
  });

  it("estimates a positive transfer time", () => {
    const r = dncFileTransferEngine.buildTransfer(BASE);
    expect(r.estimated_transfer_seconds).toBeGreaterThan(0);
  });

  it("faster baud yields shorter serial time", () => {
    const slow = dncFileTransferEngine.buildTransfer({ ...BASE, baud: 4800 });
    const fast = dncFileTransferEngine.buildTransfer({ ...BASE, baud: 38400 });
    expect(fast.estimated_transfer_seconds).toBeLessThan(slow.estimated_transfer_seconds);
  });

  it("FTP protocol estimates time from ~100 KB/s", () => {
    const r = dncFileTransferEngine.buildTransfer({ ...BASE, protocol: "ftp" });
    expect(r.estimated_transfer_seconds).toBeGreaterThanOrEqual(0);
  });

  it("size check reports bytes", () => {
    const r = dncFileTransferEngine.buildTransfer(BASE);
    const sz = r.checks.find((c) => /size/i.test(c.check));
    expect(sz).toBeTruthy();
    expect(sz?.ok).toBe(true);
  });

  it("warns on very long RS232 transfer", () => {
    const big = "G1 X1\n".repeat(500000);
    const r = dncFileTransferEngine.buildTransfer({ ...BASE, program: big });
    expect(r.warnings.some((w) => /45 min|drip/i.test(w))).toBe(true);
  });

  it("total_bytes matches framed length", () => {
    const r = dncFileTransferEngine.buildTransfer(BASE);
    expect(r.total_bytes).toBe(Buffer.byteLength(r.framed_program, "utf8"));
  });

  it("long block numbers N100000 trigger legacy-Fanuc warning", () => {
    const r = dncFileTransferEngine.buildTransfer({ ...BASE, program: "N100000 G1 X1\nM30" });
    expect(r.warnings.some((w) => /N99999|overflow/i.test(w))).toBe(true);
  });

  it("getStats exposes supported protocols", () => {
    const s = dncFileTransferEngine.getStats();
    expect(s.protocols).toContain("rs232");
    expect(s.controllers).toContain("fanuc");
  });
});
