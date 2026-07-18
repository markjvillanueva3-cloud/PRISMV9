import { describe, it, expect } from "vitest";
import type { FluidDeliveryOutput } from "../engines/CoolantOptimizationPhysicsEngine.js";
import { coolantOptimizationPhysicsEngine } from "../engines/CoolantOptimizationPhysicsEngine.js";
import { evaluateCoolantSupplyAdequacyGate } from "../tools/dispatchers/safetyDispatcher.js";
import { ACTION_SAFETY_SCHEMAS } from "../schemas/safetyActionSchemas.js";

/**
 * MS-CRITWIRE/U-CW-04 wiring verification (oscar iter26, 2026-05-24).
 *
 * Wires CoolantOptimizationPhysicsEngine.fluidDelivery() (Darcy-Weisbach +
 * jet-coherence) onto prism_safety via coolant_supply_adequacy_gate action.
 * The gate verdict logic is exported as evaluateCoolantSupplyAdequacyGate()
 * so the algorithm is testable in isolation; the dispatcher case validates
 * params, runs the engine, and delegates.
 *
 * Coverage: gate verdict logic on synthetic FluidDeliveryOutput fixtures +
 * integration via real engine output + wiring contract (dispatcher source +
 * ALL_ACTIONS enum + schema map).
 */

function mkFluidOutput(overrides: Partial<FluidDeliveryOutput> = {}): FluidDeliveryOutput {
  return {
    pressure_drop_bar: 0.2,
    friction_factor: 0.025,
    reynolds_number: 50000,
    flow_regime: "turbulent",
    pipe_velocity_m_s: 3.5,
    jet_coherence_length_mm: 150,
    coherence_K: 100,
    nozzle_velocity_m_s: 28,
    effective_nozzle_pressure_bar: 12,
    warnings: [],
    ...overrides,
  };
}

describe("MS-CRITWIRE/U-CW-04 — coolant_supply_adequacy_gate on prism_safety", () => {
  describe("evaluateCoolantSupplyAdequacyGate() — verdict logic", () => {
    it("safe verdict — all four conditions met (pressure ≥ floor, coherence ≥ distance, turbulent, no warnings)", () => {
      const v = evaluateCoolantSupplyAdequacyGate(mkFluidOutput(), 100, 8);
      expect(v.safe).toBe(true);
      expect(v.reason).toContain("coolant supply adequate");
      expect(v.reason).toContain("12.00 bar ≥ 8.00 bar floor");
      expect(v.reason).toContain("turbulent flow");
      expect(v.recommendations).toEqual([]);
    });

    it("unsafe — effective nozzle pressure below operator floor → reason names the gap + remediation", () => {
      const v = evaluateCoolantSupplyAdequacyGate(mkFluidOutput({ effective_nozzle_pressure_bar: 5 }), 100, 8);
      expect(v.safe).toBe(false);
      expect(v.reason).toContain("effective nozzle pressure 5.00 bar < required floor 8.00 bar");
      expect(v.recommendations[0]).toMatch(/Increase supply pressure or shorten pipe/);
    });

    it("unsafe — jet coherence shorter than nozzle-to-cut distance → reason cites break-up", () => {
      const v = evaluateCoolantSupplyAdequacyGate(mkFluidOutput({ jet_coherence_length_mm: 50 }), 100, 8);
      expect(v.safe).toBe(false);
      expect(v.reason).toContain("jet coherence 50.0 mm < nozzle-to-cut distance 100.0 mm");
      expect(v.reason).toContain("break-up before reaching cut zone");
      expect(v.recommendations.some((r) => r.includes("Reduce nozzle stickout"))).toBe(true);
    });

    it("unsafe — laminar flow regime fails LOUD (jet coherence collapses at the nozzle)", () => {
      const v = evaluateCoolantSupplyAdequacyGate(mkFluidOutput({ flow_regime: "laminar", reynolds_number: 1500 }), 100, 8);
      expect(v.safe).toBe(false);
      expect(v.reason).toContain("flow regime is laminar");
      expect(v.reason).toContain("need turbulent");
      expect(v.recommendations.some((r) => r.includes("Re=1500"))).toBe(true);
    });

    it("unsafe — transition flow regime is rejected (only turbulent passes)", () => {
      const v = evaluateCoolantSupplyAdequacyGate(mkFluidOutput({ flow_regime: "transition", reynolds_number: 3000 }), 100, 8);
      expect(v.safe).toBe(false);
      expect(v.reason).toContain("flow regime is transition");
    });

    it("unsafe — engine warnings array surfaces in reason + propagates to recommendations", () => {
      const v = evaluateCoolantSupplyAdequacyGate(
        mkFluidOutput({ warnings: ["concentration low (4%, target 8%)", "pH drift +1.2"] }),
        100,
        8,
      );
      expect(v.safe).toBe(false);
      expect(v.reason).toContain("engine reported 2 warning(s)");
      expect(v.reason).toContain("concentration low");
      expect(v.recommendations).toContain("concentration low (4%, target 8%)");
      expect(v.recommendations).toContain("pH drift +1.2");
    });

    it("unsafe — multiple simultaneous failures all appear in reason + recommendations", () => {
      const v = evaluateCoolantSupplyAdequacyGate(
        mkFluidOutput({
          effective_nozzle_pressure_bar: 2,
          jet_coherence_length_mm: 30,
          flow_regime: "laminar",
          reynolds_number: 800,
          warnings: ["tramp oil 25%"],
        }),
        100,
        8,
      );
      expect(v.safe).toBe(false);
      expect(v.reason).toContain("effective nozzle pressure");
      expect(v.reason).toContain("jet coherence");
      expect(v.reason).toContain("flow regime is laminar");
      expect(v.reason).toContain("engine reported 1 warning(s)");
      expect(v.recommendations.length).toBeGreaterThanOrEqual(4);
    });

    it("output shape — safe verdict carries the full envelope (4 engine fields + 2 input fields)", () => {
      const v = evaluateCoolantSupplyAdequacyGate(mkFluidOutput(), 100, 8);
      expect(v.effective_nozzle_pressure_bar).toBe(12);
      expect(v.jet_coherence_length_mm).toBe(150);
      expect(v.flow_regime).toBe("turbulent");
      expect(v.reynolds_number).toBe(50000);
      expect(v.engine_warnings).toEqual([]);
      expect(v.nozzle_to_cut_distance_mm).toBe(100);
      expect(v.min_required_pressure_bar).toBe(8);
    });

    it("boundary — effective_pressure exactly equal to floor is safe (≥ not >)", () => {
      const v = evaluateCoolantSupplyAdequacyGate(mkFluidOutput({ effective_nozzle_pressure_bar: 8 }), 100, 8);
      expect(v.safe).toBe(true);
    });

    it("boundary — jet_coherence exactly equal to nozzle_to_cut_distance is safe (≥ not >)", () => {
      const v = evaluateCoolantSupplyAdequacyGate(mkFluidOutput({ jet_coherence_length_mm: 100 }), 100, 8);
      expect(v.safe).toBe(true);
    });

    it("P1 hardening — engine NaN on effective_nozzle_pressure_bar fails LOUD (no silent fail-open)", () => {
      const v = evaluateCoolantSupplyAdequacyGate(
        mkFluidOutput({ effective_nozzle_pressure_bar: Number.NaN }),
        100,
        8,
      );
      expect(v.safe).toBe(false);
      expect(v.reason).toContain("non-finite effective_nozzle_pressure_bar");
    });

    it("P1 hardening — engine NaN on jet_coherence_length_mm fails LOUD", () => {
      const v = evaluateCoolantSupplyAdequacyGate(
        mkFluidOutput({ jet_coherence_length_mm: Number.NaN }),
        100,
        8,
      );
      expect(v.safe).toBe(false);
      expect(v.reason).toContain("non-finite jet_coherence_length_mm");
    });

    it("P1 hardening — engine NaN on reynolds_number fails LOUD", () => {
      const v = evaluateCoolantSupplyAdequacyGate(
        mkFluidOutput({ reynolds_number: Number.NaN }),
        100,
        8,
      );
      expect(v.safe).toBe(false);
      expect(v.reason).toContain("non-finite reynolds_number");
    });

    it("P1 hardening — engine missing/undefined warnings field doesn't crash, treated as empty", () => {
      const corrupt = mkFluidOutput();
      // Simulate a regressed engine that forgot to populate `warnings` — TypeScript
      // says it must be present but defensive runtime treats undefined as []
      (corrupt as any).warnings = undefined;
      const v = evaluateCoolantSupplyAdequacyGate(corrupt, 100, 8);
      expect(v.safe).toBe(true);
      expect(v.engine_warnings).toEqual([]);
    });

    it("boundary — effective_pressure one epsilon below floor is unsafe", () => {
      const v = evaluateCoolantSupplyAdequacyGate(mkFluidOutput({ effective_nozzle_pressure_bar: 8 - 1e-9 }), 100, 8);
      expect(v.safe).toBe(false);
    });
  });

  describe("Engine integration — fluidDelivery() output feeds the gate end-to-end", () => {
    it("realistic flood-coolant scenario — moderate pressure, short pipe, large nozzle → turbulent + safe", () => {
      const fd = coolantOptimizationPhysicsEngine.fluidDelivery({
        pipe_diameter_mm: 10,
        pipe_length_mm: 1500,
        flow_rate_lpm: 30,
        nozzle_diameter_mm: 5,
        supply_pressure_bar: 8,
      });
      const v = evaluateCoolantSupplyAdequacyGate(fd, 50, 2);
      expect(v.flow_regime).toBe("turbulent");
      expect(v.effective_nozzle_pressure_bar).toBeGreaterThan(0);
    });

    it("realistic HPC scenario — high supply pressure produces long jet coherence", () => {
      const fd = coolantOptimizationPhysicsEngine.fluidDelivery({
        pipe_diameter_mm: 12,
        pipe_length_mm: 2000,
        flow_rate_lpm: 60,
        nozzle_diameter_mm: 2,
        supply_pressure_bar: 70,
      });
      expect(fd.jet_coherence_length_mm).toBeGreaterThan(0);
      expect(fd.effective_nozzle_pressure_bar).toBeGreaterThan(0);
    });
  });

  describe("Wiring contract — safetyDispatcher source + schema map + ALL_ACTIONS enum", () => {
    it("dispatcher source contains COOLANT_SUPPLY_ADEQUACY_ACTIONS + action + engine import + spread + exported pure function", async () => {
      const fs = await import("node:fs");
      const path = await import("node:path");
      const { fileURLToPath } = await import("node:url");
      const here = path.dirname(fileURLToPath(import.meta.url));
      const src = fs.readFileSync(path.resolve(here, "../tools/dispatchers/safetyDispatcher.ts"), "utf8");
      expect(src).toContain("COOLANT_SUPPLY_ADEQUACY_ACTIONS");
      expect(src).toContain('"coolant_supply_adequacy_gate"');
      expect(src).toContain("CoolantOptimizationPhysicsEngine.js");
      expect(src).toContain("coolantOptimizationPhysicsEngine.fluidDelivery");
      expect(src).toContain("...COOLANT_SUPPLY_ADEQUACY_ACTIONS");
      expect(src).toContain("export function evaluateCoolantSupplyAdequacyGate");
    });

    it("schema map exposes coolant_supply_adequacy_gate and accepts a known-good payload", () => {
      const schema = ACTION_SAFETY_SCHEMAS.coolant_supply_adequacy_gate;
      expect(typeof schema?.safeParse).toBe("function");
      const good = {
        pipe_diameter_mm: 10,
        pipe_length_mm: 1500,
        flow_rate_lpm: 30,
        nozzle_diameter_mm: 5,
        supply_pressure_bar: 8,
        nozzle_to_cut_distance_mm: 50,
        min_required_pressure_bar: 2,
      };
      const r = schema!.safeParse(good);
      expect(r.success).toBe(true);
    });

    it("schema map — missing nozzle_to_cut_distance_mm → safeParse failure (REQUIRED, gate-specific)", () => {
      const bad = {
        pipe_diameter_mm: 10,
        pipe_length_mm: 1500,
        flow_rate_lpm: 30,
        nozzle_diameter_mm: 5,
        supply_pressure_bar: 8,
        min_required_pressure_bar: 2,
      };
      const r = ACTION_SAFETY_SCHEMAS.coolant_supply_adequacy_gate!.safeParse(bad);
      expect(r.success).toBe(false);
    });

    it("schema map — missing min_required_pressure_bar → safeParse failure (REQUIRED, gate-specific)", () => {
      const bad = {
        pipe_diameter_mm: 10,
        pipe_length_mm: 1500,
        flow_rate_lpm: 30,
        nozzle_diameter_mm: 5,
        supply_pressure_bar: 8,
        nozzle_to_cut_distance_mm: 50,
      };
      const r = ACTION_SAFETY_SCHEMAS.coolant_supply_adequacy_gate!.safeParse(bad);
      expect(r.success).toBe(false);
    });

    it("schema map — Infinity supply_pressure_bar rejected (.finite() guard)", () => {
      const bad = {
        pipe_diameter_mm: 10,
        pipe_length_mm: 1500,
        flow_rate_lpm: 30,
        nozzle_diameter_mm: 5,
        supply_pressure_bar: Number.POSITIVE_INFINITY,
        nozzle_to_cut_distance_mm: 50,
        min_required_pressure_bar: 2,
      };
      const r = ACTION_SAFETY_SCHEMAS.coolant_supply_adequacy_gate!.safeParse(bad);
      expect(r.success).toBe(false);
    });

    it("schema map — nozzle_Cv > 1 rejected (physical bound 0 < Cv ≤ 1)", () => {
      const bad = {
        pipe_diameter_mm: 10,
        pipe_length_mm: 1500,
        flow_rate_lpm: 30,
        nozzle_diameter_mm: 5,
        supply_pressure_bar: 8,
        nozzle_Cv: 1.5,
        nozzle_to_cut_distance_mm: 50,
        min_required_pressure_bar: 2,
      };
      const r = ACTION_SAFETY_SCHEMAS.coolant_supply_adequacy_gate!.safeParse(bad);
      expect(r.success).toBe(false);
    });
  });
});
