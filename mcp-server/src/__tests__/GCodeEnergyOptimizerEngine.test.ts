/**
 * GCodeEnergyOptimizerEngine -- companion contract tests (U-PP-MISSING-ENGINE-TESTS, slot:echo)
 *
 * Green-manufacturing energy model: parses raw G-code, estimates per-phase power
 * draw (spindle / rapid / idle / coolant / conveyor), and rewrites the program to
 * cut kWh without changing the machining result. PURE + deterministic -- energy
 * comes from machine-CONFIG data inputs (no Kienzle/Taylor physics constants), so
 * every assertion below is a HAND-TRACED reference value (R9): it fails if the
 * power formula, classification, rounding, or an optimization strategy changes.
 *
 * Reference config (used unless noted): machine_power_kw=15, spindle_efficiency=0.85,
 *   rapid_power_pct=0.15, idle_power_pct=0.08, coolant_pump_kw=2.2, chip_conveyor_kw=0.75
 *   => rapidPower=2.25 kW, idlePower=1.20 kW; cost default $0.12/kWh, CO2 default 0.4 kg/kWh.
 *
 * Coverage: analyze (cut / rapid / spindle-on-vs-off rapid / dwell / tool-change+per_tool
 *   / phase pct / 3-machine config variability), optimize (5 strategies + savings direction),
 *   report (rating A / rating F / markdown), failure modes (empty / comment-only / unparseable),
 *   adversarial (NaN config / negative coord / zero feed).
 */

import { describe, it, expect } from "vitest";
import {
  gcodeEnergyOptimizerEngine,
  GCodeEnergyOptimizerEngine,
  type EnergyMachineConfig,
} from "../engines/GCodeEnergyOptimizerEngine.js";

const CONFIG: EnergyMachineConfig = {
  machine_power_kw: 15,
  spindle_efficiency: 0.85,
  rapid_power_pct: 0.15,
  idle_power_pct: 0.08,
  coolant_pump_kw: 2.2,
  chip_conveyor_kw: 0.75,
};

// 10-min cut @ S12000 (loadFactor=1.0): spindlePower=15*1.0*0.85=12.75 kW over 600s.
// spindleKwh=12.75*(600/3600)=2.125 ; coolantKwh=2.2*(600/3600)=0.366667 ; conveyorKwh=0.75*(600/3600)=0.125.
const CUT_PROGRAM = "G90\nM3 S12000\nM8\nG1 X1000 F100\nM9\nM5\nM30";

describe("GCodeEnergyOptimizerEngine", () => {
  describe("analyzeEnergyConsumption() -- per-phase power model", () => {
    it("computes a full cutting program: spindle+coolant+conveyor kWh, cost, CO2, time", () => {
      const r = gcodeEnergyOptimizerEngine.analyzeEnergyConsumption(CUT_PROGRAM, CONFIG);
      // hand-traced (rounded to 3 dp by the engine):
      expect(r.spindle_kwh).toBe(2.125); // 12.75 kW * 600/3600 h, loadFactor=1.0 at S12000
      expect(r.coolant_kwh).toBe(0.367); // 2.2 kW * 600/3600 h = 0.366667 -> 0.367
      expect(r.conveyor_kwh).toBe(0.125); // 0.75 kW * 600/3600 h
      expect(r.rapid_kwh).toBe(0); // no G0 moves
      expect(r.idle_kwh).toBe(0); // no dwell / tool change
      expect(r.total_kwh).toBe(2.617); // 2.125 + 0.366667 + 0.125 = 2.616667 -> 2.617
      expect(r.total_time_s).toBe(600); // single 600s cut
      expect(r.cost_estimate).toBe(0.31); // 2.616667 * $0.12 = $0.31400 -> 0.31
      expect(r.co2_kg).toBe(1.047); // 2.616667 * 0.4 = 1.046667 -> 1.047
      expect(r.per_tool).toEqual([]); // no T word -> no per-tool attribution
    });

    it("normalizes phase_breakdown percentages to the canonical 5 phases summing ~100", () => {
      const r = gcodeEnergyOptimizerEngine.analyzeEnergyConsumption(CUT_PROGRAM, CONFIG);
      expect(r.phase_breakdown.map((p) => p.phase)).toEqual([
        "Spindle (cutting)", "Rapid traverse", "Idle/dwell", "Coolant pump", "Chip conveyor",
      ]);
      expect(r.phase_breakdown[0].pct).toBe(81.2); // 2.125 / 2.616667 = 81.2%
      expect(r.phase_breakdown[3].pct).toBe(14.0); // coolant 0.366667 / 2.616667 = 14.0%
      expect(r.phase_breakdown[4].pct).toBe(4.8); // conveyor 0.125 / 2.616667 = 4.8%
      const sum = r.phase_breakdown.reduce((a, p) => a + p.pct, 0);
      expect(sum).toBeCloseTo(100, 1);
      // LATENT QUIRK (pinned to surface, not to bless): the Coolant-pump phase row reports
      // kWh>0 but time_s=0 here -- the engine keys phase time on coolantOn at program END, and
      // M9 precedes M30 so coolant ends OFF. An internally inconsistent row (energy without time).
      // phase rows carry the RAW accumulator (only the top-level coolant_kwh field is 3-dp rounded)
      expect(r.phase_breakdown[3].kwh).toBeCloseTo(0.366667, 5);
      expect(r.phase_breakdown[3].time_s).toBe(0);
    });

    it("treats a G2/G3 arc as a cutting move using STRAIGHT-CHORD distance (I/J/K ignored)", () => {
      // G2 X30 Y40 I10 J0 from origin: chord = sqrt(30^2+40^2)=50mm (NOT true arc length).
      // @ F100 -> 30s ; arc is a cutting move (loadFactor 1.0 at S12000) -> spindle energy, no rapid.
      const r = gcodeEnergyOptimizerEngine.analyzeEnergyConsumption("G90\nM3 S12000\nG2 X30 Y40 I10 J0 F100", CONFIG);
      expect(r.total_time_s).toBe(30); // chord 50mm / 100 * 60 ; true arc-length would differ -> pins chord approximation
      expect(r.spindle_kwh).toBe(0.106); // 12.75 kW * 30/3600 = 0.10625 -> 0.106
      expect(r.rapid_kwh).toBe(0); // arc is cutting, never rapid
    });

    it("classifies a G0 move as rapid using rapid_power_pct (not spindle power)", () => {
      // G0 X3000 from origin = 3000mm @ 30000mm/min rapid = 6s ; spindle OFF -> movePower=rapidPower=2.25
      const r = gcodeEnergyOptimizerEngine.analyzeEnergyConsumption("G90\nG0 X3000", CONFIG);
      expect(r.rapid_kwh).toBe(0.004); // 2.25 * 6/3600 = 0.00375 -> 0.004
      expect(r.spindle_kwh).toBe(0);
      expect(r.idle_kwh).toBe(0);
      expect(r.total_time_s).toBe(6);
    });

    it("charges idle-spindle overhead on a rapid when the spindle is running (M3 before G0)", () => {
      // spindle ON during rapid -> movePower = rapidPower + idlePower*0.5 = 2.25 + 0.6 = 2.85
      const spindleOn = gcodeEnergyOptimizerEngine.analyzeEnergyConsumption("G90\nM3 S6000\nG0 X3000\nM30", CONFIG);
      const spindleOff = gcodeEnergyOptimizerEngine.analyzeEnergyConsumption("G90\nG0 X3000", CONFIG);
      expect(spindleOn.rapid_kwh).toBe(0.005); // 2.85 * 6/3600 = 0.00475 -> 0.005
      expect(spindleOn.rapid_kwh).toBeGreaterThan(spindleOff.rapid_kwh); // idle-spindle penalty is real
    });

    it("accounts a G4 dwell as idle energy (P seconds, P>100 read as milliseconds)", () => {
      const sec = gcodeEnergyOptimizerEngine.analyzeEnergyConsumption("G4 P2.5", CONFIG);
      expect(sec.idle_kwh).toBe(0.001); // idlePower 1.2 * 2.5/3600 = 0.000833 -> 0.001
      expect(sec.total_time_s).toBe(2.5);
      expect(sec.spindle_kwh).toBe(0);
      // P>100 heuristic: 2500 ms == 2.5 s -> identical time
      const ms = gcodeEnergyOptimizerEngine.analyzeEnergyConsumption("G4 P2500", CONFIG);
      expect(ms.total_time_s).toBe(2.5);
    });

    it("pins the dwell ms/s classification cliff at the strict P>100 boundary", () => {
      // P100 is NOT > 100 -> read as 100 seconds ; P101 IS > 100 -> read as 101ms = 0.101s (->0.1 rounded).
      // Locks the strict '>' so an off-by-one (>=) regression is caught.
      expect(gcodeEnergyOptimizerEngine.analyzeEnergyConsumption("G4 P100", CONFIG).total_time_s).toBe(100);
      expect(gcodeEnergyOptimizerEngine.analyzeEnergyConsumption("G4 P101", CONFIG).total_time_s).toBe(0.1);
    });

    it("attributes per-tool energy across a tool change (M6 T2) into the cut that follows", () => {
      const r = gcodeEnergyOptimizerEngine.analyzeEnergyConsumption("M3 S6000\nM6 T2\nG1 X100 F100\nM30", CONFIG);
      // T2 owns: the 6s ATC idle (1.2 kW) + the 60s cut (8.2875 kW @ loadFactor 0.65)
      // kwh = 1.2*6/3600 + 8.2875*60/3600 = 0.002 + 0.138125 = 0.140125 -> 0.14 ; time = 66s
      expect(r.per_tool).toEqual([{ tool_number: 2, kwh: 0.14, time_s: 66 }]);
    });

    it("partitions per-tool energy across TWO tool changes, sorted by tool number", () => {
      // T1 then T2, each = 6s ATC idle + a 100mm cut @ F100 (60s) -> identical 0.14 kWh / 66s split.
      const r = gcodeEnergyOptimizerEngine.analyzeEnergyConsumption(
        "M3 S6000\nM6 T1\nG1 X100 F100\nM6 T2\nG1 X200 F100\nM30", CONFIG,
      );
      expect(r.per_tool).toEqual([
        { tool_number: 1, kwh: 0.14, time_s: 66 },
        { tool_number: 2, kwh: 0.14, time_s: 66 }, // .sort() keeps ascending tool order
      ]);
    });

    it("scales spindle energy linearly with machine_power_kw (>=3 machine configs)", () => {
      const spindleKwhFor = (kw: number) =>
        gcodeEnergyOptimizerEngine.analyzeEnergyConsumption(CUT_PROGRAM, { ...CONFIG, machine_power_kw: kw }).spindle_kwh;
      // spindleKwh = machine_power * 1.0(loadFactor) * 0.85(eff) * 600/3600
      expect(spindleKwhFor(15)).toBe(2.125);
      expect(spindleKwhFor(30)).toBe(4.25); // 2x power -> 2x spindle energy
      expect(spindleKwhFor(7.5)).toBe(1.063); // 1.0625 -> 1.063
    });
  });

  describe("optimizeForEnergy() -- energy-reduction strategies (machining result preserved)", () => {
    it("inserts M5/M3 around a long spindle-on rapid sequence and reduces total kWh", () => {
      // 5000mm rapid @30000 = 10s > SPINDLE_OFF_THRESHOLD (8s) -> insert spindle stop/restart
      const r = gcodeEnergyOptimizerEngine.optimizeForEnergy("M3 S6000\nG0 X5000\nG1 X5001 F100", CONFIG);
      expect(r.changes_made).toContain(
        "Inserted spindle stop/restart around rapid sequence at line 2 (10.0s idle saved)",
      );
      expect(r.optimized_gcode).toContain("M5 (Energy: spindle off during rapid)");
      expect(r.optimized_kwh).toBeLessThan(r.original_kwh); // genuine saving, not cosmetic
      expect(r.energy_savings_pct).toBeGreaterThan(0);
    });

    it("turns coolant off during a long rapid traverse (>5s)", () => {
      const r = gcodeEnergyOptimizerEngine.optimizeForEnergy("M8\nG0 X5000\nG1 X5001 F100", CONFIG);
      expect(r.changes_made).toContain("Inserted coolant off/on around rapid at line 2 (10.0s pump savings)");
      expect(r.optimized_gcode).toContain("M9 (Energy: coolant off during rapid)");
    });

    it("strips a redundant S word that repeats the active RPM without an M3/M4/M5", () => {
      const r = gcodeEnergyOptimizerEngine.optimizeForEnergy("M3 S8000\nG1 X10 F100\nS8000", CONFIG);
      expect(r.changes_made).toContain("Removed 1 redundant spindle speed commands");
      expect(r.optimized_gcode).toContain("(Energy: redundant S8000 removed)");
    });

    it("consolidates adjacent G4 dwells into a single dwell", () => {
      const r = gcodeEnergyOptimizerEngine.optimizeForEnergy("G4 P1.0\nG4 P2.0\nM30", CONFIG);
      expect(r.changes_made).toContain("Consolidated 2 adjacent dwells into one (3.00s)");
      expect(r.optimized_gcode).toContain("G4 P3.000 (Energy: consolidated 2 dwells)");
    });

    it("returns a clean no-op for an empty program (no changes, zero savings)", () => {
      const r = gcodeEnergyOptimizerEngine.optimizeForEnergy("", CONFIG);
      expect(r.energy_savings_pct).toBe(0);
      expect(r.changes_made).toEqual([]);
      expect(r.optimized_gcode).toBe("");
    });
  });

  describe("generateEnergyReport() -- efficiency rating + markdown", () => {
    it("rates a spindle-dominated cut 'A' and mirrors the analyze totals in the summary", () => {
      const r = gcodeEnergyOptimizerEngine.generateEnergyReport(CUT_PROGRAM, CONFIG);
      expect(r.summary.efficiency_rating).toBe("A"); // spindleRatio 2.125/2.617 = 0.812 >= 0.65
      expect(r.summary.total_kwh).toBe(2.617);
      expect(r.summary.cost).toBe(0.31);
      expect(r.summary.co2_kg).toBe(1.047);
      expect(r.summary.cycle_time_s).toBe(600);
      expect(r.markdown).toContain("# G-Code Energy Consumption Report");
      expect(r.markdown).toContain("**Efficiency Rating: A**");
      expect(r.markdown).toContain("2.617 kWh"); // report table ties back to the analyzed energy
    });

    it("rates a rapid-only program 'F' (zero spindle utilization)", () => {
      const r = gcodeEnergyOptimizerEngine.generateEnergyReport("G90\nG0 X3000\nG0 X0\nM30", CONFIG);
      expect(r.summary.efficiency_rating).toBe("F"); // spindleRatio = 0
      expect(r.markdown).toContain("**Efficiency Rating: F**");
    });
  });

  describe("FAILURE MODES -- empty / comment-only / unparseable input", () => {
    it("returns a zeroed result for an empty program (no throw)", () => {
      const r = gcodeEnergyOptimizerEngine.analyzeEnergyConsumption("", CONFIG);
      expect(r.total_kwh).toBe(0);
      expect(r.total_time_s).toBe(0);
      expect(r.per_tool).toEqual([]);
      expect(r.phase_breakdown.every((p) => p.pct === 0)).toBe(true);
    });

    it("treats comment / program-marker lines as zero-energy (no throw)", () => {
      const r = gcodeEnergyOptimizerEngine.analyzeEnergyConsumption("(HEADER)\n; setup note\n%", CONFIG);
      expect(r.total_kwh).toBe(0);
      expect(r.total_time_s).toBe(0);
    });

    it("ignores an unparseable non-G-code line without throwing or fabricating energy", () => {
      const r = gcodeEnergyOptimizerEngine.analyzeEnergyConsumption("THIS IS NOT GCODE", CONFIG);
      expect(r.total_kwh).toBe(0);
      expect(r.total_time_s).toBe(0);
    });
  });

  describe("ADVERSARIAL -- NaN config / negative coords / zero feed", () => {
    it("propagates NaN from a NaN machine_power_kw (documents the absence of config guards)", () => {
      // The engine does NOT validate config (unlike GCodeRuntimePredictorEngine which throws).
      // R12: assert the REAL behavior -- NaN in -> NaN out, never silently coerced to 0.
      const r = gcodeEnergyOptimizerEngine.analyzeEnergyConsumption(CUT_PROGRAM, { ...CONFIG, machine_power_kw: NaN });
      expect(Number.isNaN(r.total_kwh)).toBe(true);
    });

    it("handles negative coordinates as positive travel distance", () => {
      // G0 X-3000 from origin = |−3000| = 3000mm -> identical energy/time to +3000
      const neg = gcodeEnergyOptimizerEngine.analyzeEnergyConsumption("G90\nG0 X-3000", CONFIG);
      expect(neg.total_time_s).toBe(6);
      expect(neg.rapid_kwh).toBe(0.004);
    });

    it("falls back to a default feed when F0 is given (no divide-by-zero / Infinity time)", () => {
      const r = gcodeEnergyOptimizerEngine.analyzeEnergyConsumption("G90\nM3 S6000\nG1 X100 F0\nM30", CONFIG);
      expect(r.total_time_s).toBe(6); // 100mm / 1000(default feed) * 60 = 6s
      expect(Number.isFinite(r.spindle_kwh)).toBe(true);
      expect(r.spindle_kwh).toBeGreaterThan(0);
    });
  });

  describe("class + singleton parity", () => {
    it("a fresh instance analyzes identically to the exported singleton", () => {
      const fresh = new GCodeEnergyOptimizerEngine();
      expect(fresh.analyzeEnergyConsumption(CUT_PROGRAM, CONFIG).total_kwh).toBe(
        gcodeEnergyOptimizerEngine.analyzeEnergyConsumption(CUT_PROGRAM, CONFIG).total_kwh,
      );
    });
  });
});
