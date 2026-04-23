/**
 * LatheLoRAProgramMinerEngine Tests — LATHE-LORA-MS0 U-LLR37
 */

import { describe, it, expect, beforeEach } from "vitest";
import { latheLoRAProgramMinerEngine } from "../engines/LatheLoRAProgramMinerEngine.js";

describe("LatheLoRAProgramMinerEngine", () => {
  beforeEach(() => {
    latheLoRAProgramMinerEngine.reset();
  });

  describe("configuration", () => {
    it("has default config", () => {
      const cfg = latheLoRAProgramMinerEngine.getConfig();
      expect(cfg.default_dialect).toBe("okuma");
      expect(cfg.enable_cycle_detection).toBe(true);
    });

    it("merges partial config", () => {
      latheLoRAProgramMinerEngine.setConfig({ max_programs_in_memory: 50 });
      expect(latheLoRAProgramMinerEngine.getConfig().max_programs_in_memory).toBe(50);
    });
  });

  describe("dialect detection", () => {
    it("detects okuma", () => {
      expect(latheLoRAProgramMinerEngine.detectDialect("OKUMA OSP-P200L\nG00 X0")).toBe("okuma");
    });

    it("detects fanuc", () => {
      expect(latheLoRAProgramMinerEngine.detectDialect("FANUC 0i-TD\nO0001")).toBe("fanuc");
    });

    it("detects haas", () => {
      expect(latheLoRAProgramMinerEngine.detectDialect("HAAS CNC LATHE\nG00")).toBe("haas");
    });

    it("detects mazak", () => {
      expect(latheLoRAProgramMinerEngine.detectDialect("MAZAK MAZATROL T-PLUS")).toBe("mazak");
    });

    it("falls back to default dialect", () => {
      expect(latheLoRAProgramMinerEngine.detectDialect("G00 X0\nG01 Z-10")).toBe("okuma");
    });
  });

  describe("operation categorization", () => {
    it("categorizes G01 as turning", () => {
      expect(latheLoRAProgramMinerEngine.categorizeOperation("G01")).toBe("turning");
    });

    it("categorizes G76 as threading", () => {
      expect(latheLoRAProgramMinerEngine.categorizeOperation("G76")).toBe("threading");
    });

    it("categorizes G83 as drilling", () => {
      expect(latheLoRAProgramMinerEngine.categorizeOperation("G83")).toBe("drilling");
    });

    it("returns unknown for unrecognized code", () => {
      expect(latheLoRAProgramMinerEngine.categorizeOperation("G999")).toBe("unknown");
    });
  });

  describe("mining", () => {
    const sampleProgram = `%
O0001
G28 U0 W0
T0101
M03 S1500
G00 X50 Z5
G01 Z-20 F0.15
G00 X100
G76 P020060 Q50 R50
T0303
M30
%`;

    it("mines a program and returns result", () => {
      const r = latheLoRAProgramMinerEngine.mineProgram("prog-1", sampleProgram);
      expect(r.id).toMatch(/^mine-/);
      expect(r.program_id).toBe("prog-1");
      expect(r.total_lines).toBeGreaterThan(0);
    });

    it("extracts feed rates", () => {
      const r = latheLoRAProgramMinerEngine.mineProgram("p", sampleProgram);
      expect(r.feed_rates).toContain(0.15);
    });

    it("extracts spindle speeds", () => {
      const r = latheLoRAProgramMinerEngine.mineProgram("p", sampleProgram);
      expect(r.spindle_speeds).toContain(1500);
    });

    it("extracts tools", () => {
      const r = latheLoRAProgramMinerEngine.mineProgram("p", sampleProgram);
      expect(r.tools_used.length).toBeGreaterThan(0);
    });

    it("extracts operations", () => {
      const r = latheLoRAProgramMinerEngine.mineProgram("p", sampleProgram);
      expect(r.operations).toContain("turning");
      expect(r.operations).toContain("threading");
    });

    it("detects cycles", () => {
      const r = latheLoRAProgramMinerEngine.mineProgram("p", sampleProgram);
      expect(r.cycles.length).toBeGreaterThan(0);
    });

    it("trims results when over capacity", () => {
      latheLoRAProgramMinerEngine.setConfig({ max_programs_in_memory: 3 });
      for (let i = 0; i < 5; i++) {
        latheLoRAProgramMinerEngine.mineProgram(`p${i}`, "G00 X0\nG01 Z-1 F0.1");
      }
      expect(latheLoRAProgramMinerEngine.getResults()).toHaveLength(3);
    });
  });

  describe("queries", () => {
    beforeEach(() => {
      latheLoRAProgramMinerEngine.mineProgram("p1", "G01 Z-10 F0.1 S1000");
      latheLoRAProgramMinerEngine.mineProgram("p2", "G76 threading");
    });

    it("returns results with limit", () => {
      expect(latheLoRAProgramMinerEngine.getResults(1)).toHaveLength(1);
    });

    it("finds results by operation", () => {
      const threading = latheLoRAProgramMinerEngine.findByOperation("threading");
      expect(threading.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("aggregate stats", () => {
    it("returns zero stats with no programs", () => {
      const s = latheLoRAProgramMinerEngine.getAggregateStats();
      expect(s.total_programs).toBe(0);
      expect(s.avg_lines_per_program).toBe(0);
    });

    it("computes stats across multiple programs", () => {
      latheLoRAProgramMinerEngine.mineProgram("p1", "G01 F0.1 S1000 T0101");
      latheLoRAProgramMinerEngine.mineProgram("p2", "G01 F0.2 S2000 T0202");
      const s = latheLoRAProgramMinerEngine.getAggregateStats();
      expect(s.total_programs).toBe(2);
      expect(s.avg_feed_rate).toBeCloseTo(0.15);
      expect(s.avg_spindle_speed).toBeCloseTo(1500);
      expect(s.unique_tools_count).toBeGreaterThanOrEqual(2);
    });
  });

  describe("training example generation", () => {
    it("generates prompt/completion pair", () => {
      const r = latheLoRAProgramMinerEngine.mineProgram("p", "G01 F0.1 S1000 T0101");
      const ex = latheLoRAProgramMinerEngine.toTrainingExample(r);
      expect(ex.prompt).toContain("lathe");
      expect(ex.completion).toContain("lines");
    });
  });

  describe("summary and lifecycle", () => {
    it("generates summary text", () => {
      latheLoRAProgramMinerEngine.mineProgram("p", "G01 F0.1 S1000");
      const s = latheLoRAProgramMinerEngine.getSummary();
      expect(s).toContain("Program Miner Summary");
    });

    it("clears results", () => {
      latheLoRAProgramMinerEngine.mineProgram("p", "G01");
      latheLoRAProgramMinerEngine.clear();
      expect(latheLoRAProgramMinerEngine.getResults()).toHaveLength(0);
    });
  });
});
