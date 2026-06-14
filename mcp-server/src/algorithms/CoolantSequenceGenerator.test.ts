import { describe, it, expect } from "vitest";
import { generateSequence, CoolantSequenceGenerator, type CoolantSequenceInput } from "./CoolantSequenceGenerator.js";

describe("CoolantSequenceGenerator", () => {
  describe("controller dialects (≥3 variability)", () => {
    it("Fanuc flood: M3 → G04 → M8 startup; M9 → M5 shutdown", () => {
      const r = generateSequence({ controller: "fanuc", coolant_mode: "flood", spindle_direction: "M3", spindle_rpm: 5000 });
      expect(r.startup_blocks[0]).toContain("M3 S5000");
      expect(r.startup_blocks[1]).toContain("G04 P");
      expect(r.coolant_on_code).toBe("M8");
      expect(r.shutdown_blocks[0]).toContain("M9");
      expect(r.shutdown_blocks[1]).toContain("M5");
    });
    it("Okuma thru-spindle: M50 not M88", () => {
      const r = generateSequence({ controller: "okuma", coolant_mode: "thru_spindle", spindle_direction: "M3", spindle_rpm: 8000 });
      expect(r.coolant_on_code).toBe("M50");
      expect(r.coolant_off_code).toBe("M51");
    });
    it("Mazak thru-spindle: M52 not M50/M88", () => {
      const r = generateSequence({ controller: "mazak", coolant_mode: "thru_spindle", spindle_direction: "M3", spindle_rpm: 8000 });
      expect(r.coolant_on_code).toBe("M52");
      expect(r.coolant_off_code).toBe("M53");
    });
    it("Siemens high-pressure: M91/M92 (siemens-specific)", () => {
      const r = generateSequence({ controller: "siemens", coolant_mode: "high_pressure", spindle_direction: "M3", spindle_rpm: 8000 });
      expect(r.coolant_on_code).toBe("M91");
      expect(r.coolant_off_code).toBe("M92");
    });
    it("Heidenhain has no thru-spindle code → falls back to M8 with diagnostic", () => {
      const r = generateSequence({ controller: "heidenhain", coolant_mode: "thru_spindle", spindle_direction: "M3", spindle_rpm: 8000 });
      expect(r.coolant_on_code).toBe("M8");
      expect(r.notes.join("|")).toContain("no native thru-spindle");
    });
  });

  describe("mode: off (no coolant)", () => {
    it("off mode emits no coolant-ON block, no coolant-OFF before spindle stop", () => {
      const r = generateSequence({ controller: "fanuc", coolant_mode: "off", spindle_direction: "M3", spindle_rpm: 5000 });
      expect(r.coolant_on_code).toBe(null);
      // Startup is just spindle + dwell, no coolant
      expect(r.startup_blocks.find(b => b.includes("M7") || b.includes("M8"))).toBeUndefined();
      // Shutdown is just M5
      expect(r.shutdown_blocks).toEqual(["M5 (spindle stop)"]);
    });
  });

  describe("spindle direction variability", () => {
    it("M3 (CW) preserved in startup", () => {
      const r = generateSequence({ controller: "fanuc", coolant_mode: "flood", spindle_direction: "M3", spindle_rpm: 3000 });
      expect(r.startup_blocks[0]).toContain("M3");
    });
    it("M4 (CCW) preserved in startup", () => {
      const r = generateSequence({ controller: "fanuc", coolant_mode: "flood", spindle_direction: "M4", spindle_rpm: 3000 });
      expect(r.startup_blocks[0]).toContain("M4");
    });
  });

  describe("spindle settle configurability", () => {
    it("default settle = 0.5 sec when omitted", () => {
      const r = generateSequence({ controller: "fanuc", coolant_mode: "flood", spindle_direction: "M3", spindle_rpm: 5000 });
      expect(r.spindle_settle_block).toContain("0.50");
    });
    it("zero settle suppresses G04 block", () => {
      const r = generateSequence({ controller: "fanuc", coolant_mode: "flood", spindle_direction: "M3", spindle_rpm: 5000, spindle_settle_sec: 0 });
      expect(r.spindle_settle_block).toBe(null);
    });
    it("clamps settle to 10 sec max", () => {
      const r = generateSequence({ controller: "fanuc", coolant_mode: "flood", spindle_direction: "M3", spindle_rpm: 5000, spindle_settle_sec: 100 });
      expect(r.spindle_settle_block).toContain("10.00");
    });
  });

  describe("thru-spindle / HPC notes (safety surfacing)", () => {
    it("thru_spindle emits 'verify settle' note", () => {
      const r = generateSequence({ controller: "fanuc", coolant_mode: "thru_spindle", spindle_direction: "M3", spindle_rpm: 12000 });
      expect(r.notes.join("|")).toContain("verify settle");
    });
    it("high_pressure emits same note", () => {
      const r = generateSequence({ controller: "mazak", coolant_mode: "high_pressure", spindle_direction: "M3", spindle_rpm: 12000 });
      expect(r.notes.join("|")).toContain("verify settle");
    });
  });

  describe("R12 fail-loud invalid input", () => {
    it("unknown controller → diagnostic", () => {
      const r = generateSequence({ controller: "spaceship" as CoolantSequenceInput["controller"], coolant_mode: "flood", spindle_direction: "M3", spindle_rpm: 5000 });
      expect(r.notes.join("|")).toContain("unknown controller");
    });
    it("unknown coolant_mode → diagnostic", () => {
      const r = generateSequence({ controller: "fanuc", coolant_mode: "fire" as CoolantSequenceInput["coolant_mode"], spindle_direction: "M3", spindle_rpm: 5000 });
      expect(r.notes.join("|")).toContain("unknown coolant_mode");
    });
    it("invalid spindle direction → diagnostic", () => {
      const r = generateSequence({ controller: "fanuc", coolant_mode: "flood", spindle_direction: "M5" as CoolantSequenceInput["spindle_direction"], spindle_rpm: 5000 });
      expect(r.notes.join("|")).toContain("M3 or M4");
    });
    it("NaN RPM → diagnostic", () => {
      const r = generateSequence({ controller: "fanuc", coolant_mode: "flood", spindle_direction: "M3", spindle_rpm: NaN });
      expect(r.notes.join("|")).toContain("not finite");
    });
    it("RPM out of range → diagnostic", () => {
      const r = generateSequence({ controller: "fanuc", coolant_mode: "flood", spindle_direction: "M3", spindle_rpm: 200000 });
      expect(r.notes.join("|")).toContain("outside");
    });
    it("missing input → diagnostic", () => {
      const r = generateSequence(null as unknown as CoolantSequenceInput);
      expect(r.notes.join("|")).toContain("missing");
    });
  });

  it("CoolantSequenceGenerator.version is 1.0.0", () => {
    expect(CoolantSequenceGenerator.version).toBe("1.0.0");
  });
});
