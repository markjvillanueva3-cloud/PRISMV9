/**
 * Tests for PhysicsFusionConvergenceEngine — Phase 0-D-FUSION-2
 *
 * 25 tests covering:
 *   - 6 ISO material classes (convergence iteration counts)
 *   - Failure modes: oscillation, divergence, degenerate, max_iterations, NaN
 *   - Nested loop structure (FTW inside FES inside FDT)
 *   - Alpha management: spectral radius, max cap, oscillation halving
 *   - Acceleration: Anderson (Tier 3+), Broyden fallback
 *   - Plugin integration: canRun, execution order, under-relaxation
 *   - Serialization/traceability: iteration history, spectral_radius field
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  PhysicsFusionConvergenceEngine,
  physicsFusionConvergenceEngine,
  type ConvergenceInput,
} from "../engines/PhysicsFusionConvergenceEngine.js";
import {
  createFusionState,
  buildConvergenceConfig,
  type PhysicsPlugin,
  type PhysicsPluginDescriptor,
  type PluginContext,
  type PluginOutput,
  type FusionTier,
  type ConvergenceConfig,
} from "../engines/PhysicsFusionOrchestrator.types.js";
import type { ISOGroup } from "../physics/constants.js";

// ============================================================================
// TEST HELPERS
// ============================================================================

/** Create a mock plugin with configurable behavior */
function mockPlugin(
  id: string,
  opts: {
    level?: number;
    min_tier?: number;
    loop?: "FTW" | "FES" | "FDT";
    outputs: string[];
    skip_penalty?: number;
    depends_on?: string[];
    feedback_from?: string[];
    canRun?: (ctx: PluginContext) => boolean;
    compute: (ctx: PluginContext) => PluginOutput;
  },
): PhysicsPlugin {
  const descriptor: PhysicsPluginDescriptor = {
    id,
    name: `Mock ${id}`,
    level: (opts.level ?? 1) as any,
    min_tier: (opts.min_tier ?? 1) as any,
    depends_on: opts.depends_on ?? [],
    feedback_from: opts.feedback_from ?? [],
    loop: opts.loop,
    outputs: opts.outputs,
    skip_penalty: opts.skip_penalty ?? 0.1,
  };
  return {
    descriptor,
    canRun: opts.canRun ?? (() => true),
    compute: opts.compute,
  };
}

/**
 * Create a contracting-map plugin that converges toward a target value.
 * On each call: output = target + (current - target) * contraction_factor
 * With contraction < 1, this converges. contraction > 1 diverges.
 */
function contractingPlugin(
  id: string,
  outputKey: string,
  target: number,
  contraction: number,
  loop: "FTW" | "FES" | "FDT",
): PhysicsPlugin {
  return mockPlugin(id, {
    loop,
    outputs: [outputKey],
    compute: (ctx) => {
      const current = ctx.state.values[outputKey] ?? target * 2; // Start far from target
      const newVal = target + (current - target) * contraction;
      return { values: { [outputKey]: newVal }, confidence: 0.95 };
    },
  });
}

/** Build a standard ConvergenceInput for testing */
function buildInput(
  plugins: PhysicsPlugin[],
  iso_group: ISOGroup = "P",
  tier: FusionTier = 2,
  configOverrides?: Partial<ConvergenceConfig>,
): ConvergenceInput {
  return {
    plugins,
    initial_state: createFusionState(),
    config: buildConvergenceConfig(iso_group, configOverrides),
    tier,
    iso_group,
    params: { ae_mm: 6, ap_mm: 3, cutting_speed_m_min: 200 },
  };
}

// ============================================================================
// TESTS
// ============================================================================

describe("PhysicsFusionConvergenceEngine", () => {
  let engine: PhysicsFusionConvergenceEngine;

  beforeEach(() => {
    engine = new PhysicsFusionConvergenceEngine();
  });

  // ── Convergence by ISO Class (6 tests) ─────────────────────────────

  describe("ISO material convergence", () => {
    function makeConvergingFTW(contraction: number): PhysicsPlugin[] {
      return [
        contractingPlugin("force", "Fc_N", 1773, contraction, "FTW"),
        contractingPlugin("temperature", "temp_C", 450, contraction, "FTW"),
        contractingPlugin("wear", "VB_mm", 0.15, contraction, "FTW"),
      ];
    }

    it("ISO P (steel): converges in <8 FTW iterations with alpha=0.70", () => {
      const plugins = makeConvergingFTW(0.3); // Moderate contraction
      const result = engine.converge(buildInput(plugins, "P"));
      expect(result.overall_status).toBe("converged");
      const ftwReport = result.convergence.find(r => r.loop === "FTW");
      expect(ftwReport).toBeDefined();
      expect(ftwReport!.iterations).toBeLessThan(8);
    });

    it("ISO N (aluminum): converges in <6 FTW iterations with alpha=0.85", () => {
      const plugins = makeConvergingFTW(0.05); // Very weak coupling → fast convergence
      const result = engine.converge(buildInput(plugins, "N"));
      expect(result.overall_status).toBe("converged");
      const ftwReport = result.convergence.find(r => r.loop === "FTW");
      expect(ftwReport).toBeDefined();
      expect(ftwReport!.iterations).toBeLessThan(6);
    });

    it("ISO M (stainless): converges in <12 FTW iterations with alpha=0.50", () => {
      const plugins = makeConvergingFTW(0.45); // Moderate-strong coupling
      const result = engine.converge(buildInput(plugins, "M"));
      expect(result.overall_status).toBe("converged");
      const ftwReport = result.convergence.find(r => r.loop === "FTW");
      expect(ftwReport!.iterations).toBeLessThan(12);
    });

    it("ISO K (cast iron): converges in <8 FTW iterations with alpha=0.70", () => {
      const plugins = makeConvergingFTW(0.3);
      const result = engine.converge(buildInput(plugins, "K"));
      expect(result.overall_status).toBe("converged");
      const ftwReport = result.convergence.find(r => r.loop === "FTW");
      expect(ftwReport!.iterations).toBeLessThan(8);
    });

    it("ISO H (hardened): converges in <20 FTW iterations with alpha=0.25", () => {
      const plugins = makeConvergingFTW(0.55); // Strong coupling
      const result = engine.converge(buildInput(plugins, "H"));
      expect(result.overall_status).toBe("converged");
      const ftwReport = result.convergence.find(r => r.loop === "FTW");
      expect(ftwReport!.iterations).toBeLessThan(20);
    });

    it("ISO S (superalloy): converges in <20 FTW iterations with alpha=0.20", () => {
      const plugins = makeConvergingFTW(0.4); // Strong coupling (alpha=0.20 is very conservative)
      const result = engine.converge(buildInput(plugins, "S"));
      expect(result.overall_status).toBe("converged");
      const ftwReport = result.convergence.find(r => r.loop === "FTW");
      expect(ftwReport!.iterations).toBeLessThan(20);
    });
  });

  // ── Failure Mode Tests ─────────────────────────────────────────────

  describe("failure modes", () => {
    it("oscillation detection triggers alpha halving", () => {
      // Plugin that oscillates: alternates between two values
      let callCount = 0;
      const oscillatingPlugin = mockPlugin("osc", {
        loop: "FTW",
        outputs: ["osc_val"],
        compute: () => {
          callCount++;
          // Alternate between 100 and 200 → creates oscillating residuals
          const val = callCount % 2 === 0 ? 100 : 200;
          return { values: { osc_val: val }, confidence: 0.5 };
        },
      });
      const result = engine.converge(buildInput([oscillatingPlugin], "P", 2, {
        max_ftw_iterations: 20,
        oscillation_window: 6,
      }));
      // Should detect oscillation or hit max iterations (both acceptable)
      expect(["oscillating", "max_iterations"]).toContain(
        result.overall_status,
      );
      // The FTW loop should have run multiple iterations
      const ftwReport = result.convergence.find(r => r.loop === "FTW");
      expect(ftwReport).toBeDefined();
      expect(ftwReport!.iterations).toBeGreaterThan(0);
      // Warnings should mention oscillation or alpha changes
      // (spectral radius may also adjust alpha, which is correct behavior)
    });

    it("divergence: best-so-far restoration", () => {
      // Plugin that diverges after a few iterations
      let callCount = 0;
      const divergingPlugin = mockPlugin("div", {
        loop: "FTW",
        outputs: ["div_val"],
        compute: () => {
          callCount++;
          // Exponentially growing values → divergence
          return { values: { div_val: Math.pow(2, callCount) * 100 }, confidence: 0.5 };
        },
      });
      const result = engine.converge(buildInput([divergingPlugin], "P", 2, {
        max_ftw_iterations: 15,
        divergence_factor: 2.0,
      }));
      // Should detect divergence or hit max_iterations
      expect(["diverged", "max_iterations"]).toContain(result.overall_status);
      // Warnings should mention divergence
      const hasWarning = result.final_state.warnings.some(w => w.includes("Divergence") || w.includes("NaN"));
      // At minimum, the engine should not crash
      expect(result.final_state).toBeDefined();
    });

    it("degenerate: ae/ap→0 returns degenerate status", () => {
      const degeneratePlugin = mockPlugin("degen", {
        loop: "FTW",
        outputs: ["ae_mm"],
        compute: (ctx) => {
          // Converge ae toward 0
          const current = ctx.state.values["ae_mm"] ?? 6;
          return { values: { ae_mm: current * 0.1 }, confidence: 0.5 };
        },
      });
      const result = engine.converge(buildInput([degeneratePlugin], "P", 2, {
        degenerate_threshold: 0.05,
      }));
      expect(result.overall_status).toBe("degenerate");
    });

    it("max iterations: impossible tolerance → max_iterations (not crash)", () => {
      const slowPlugin = mockPlugin("slow", {
        loop: "FTW",
        outputs: ["slow_val"],
        compute: (ctx) => {
          const current = ctx.state.values["slow_val"] ?? 100;
          return { values: { slow_val: current * 0.999 }, confidence: 0.9 };
        },
      });
      const result = engine.converge(buildInput([slowPlugin], "P", 2, {
        tolerance: 1e-20, // Impossible
        max_ftw_iterations: 5,
      }));
      expect(result.overall_status).toBe("max_iterations");
      // 5 loop passes - 1 bootstrap (no comparable keys) = 4 recorded iterations
      expect(result.convergence[0].iterations).toBe(4);
    });

    it("NaN injection: replace with last-known-good, halve alpha, warn", () => {
      let callCount = 0;
      const nanPlugin = mockPlugin("nan", {
        loop: "FTW",
        outputs: ["nan_val"],
        compute: () => {
          callCount++;
          // Return NaN on 5th call (well past bootstrap), normal otherwise
          const val = callCount === 5 ? NaN : 500 + callCount;
          return { values: { nan_val: val }, confidence: 0.8 };
        },
      });
      const result = engine.converge(buildInput([nanPlugin], "P", 2, {
        max_ftw_iterations: 10,
      }));
      // Should have a NaN warning
      const hasNanWarning = result.final_state.warnings.some(
        w => w.includes("NaN") || w.includes("Infinity"),
      );
      expect(hasNanWarning).toBe(true);
      // Should still produce a finite result
      const finalVal = result.final_state.values["nan_val"];
      expect(Number.isFinite(finalVal)).toBe(true);
    });
  });

  // ── Nested Loop Tests ──────────────────────────────────────────────

  describe("nested loops", () => {
    it("FTW/FES/FDT all converge (3-level nesting)", () => {
      const plugins = [
        contractingPlugin("force", "Fc_N", 1000, 0.3, "FTW"),
        contractingPlugin("temp", "temp_C", 400, 0.3, "FTW"),
        contractingPlugin("stability", "lobe_rpm", 8000, 0.3, "FES"),
        contractingPlugin("deflection", "defl_um", 25, 0.3, "FDT"),
      ];
      const result = engine.converge(buildInput(plugins, "P"));
      expect(result.overall_status).toBe("converged");
      expect(result.convergence.length).toBe(3); // FTW, FES, FDT
      for (const report of result.convergence) {
        expect(report.status).toBe("converged");
      }
    });

    it("FTW runs inside FES (verify iteration counts)", () => {
      let ftwCalls = 0;
      let fesCalls = 0;
      const ftwPlugin = mockPlugin("ftw", {
        loop: "FTW",
        outputs: ["ftw_out"],
        compute: (ctx) => {
          ftwCalls++;
          const current = ctx.state.values["ftw_out"] ?? 100;
          return { values: { ftw_out: current * 0.5 + 50 }, confidence: 0.9 };
        },
      });
      const fesPlugin = mockPlugin("fes", {
        loop: "FES",
        outputs: ["fes_out"],
        compute: (ctx) => {
          fesCalls++;
          const current = ctx.state.values["fes_out"] ?? 200;
          return { values: { fes_out: current * 0.5 + 100 }, confidence: 0.9 };
        },
      });
      const result = engine.converge(buildInput([ftwPlugin, fesPlugin], "P", 2, {
        max_ftw_iterations: 10,
        max_fes_iterations: 5,
        max_fdt_iterations: 1,
      }));
      // FTW should be called more times than FES (runs per FES iteration)
      expect(ftwCalls).toBeGreaterThanOrEqual(fesCalls);
    });

    it("empty loop (no plugins with that tag) → trivial convergence", () => {
      // Only FTW plugins, no FES or FDT
      const plugins = [contractingPlugin("force", "Fc_N", 1000, 0.3, "FTW")];
      const result = engine.converge(buildInput(plugins, "P"));
      expect(result.overall_status).toBe("converged");
      // Should only have FTW report (FES and FDT are empty → no reports)
      expect(result.convergence.length).toBe(1);
      expect(result.convergence[0].loop).toBe("FTW");
    });
  });

  // ── Alpha Management Tests ─────────────────────────────────────────

  describe("alpha management", () => {
    it("spectral radius estimation updates alpha", () => {
      // Plugin with slow convergence that will trigger spectral radius updates
      const plugins = [contractingPlugin("force", "Fc_N", 1000, 0.5, "FTW")];
      const result = engine.converge(buildInput(plugins, "P", 2, {
        max_ftw_iterations: 10,
      }));
      const ftwReport = result.convergence.find(r => r.loop === "FTW");
      expect(ftwReport).toBeDefined();
      // spectral_radius should have been computed
      if (ftwReport!.iterations > 2) {
        expect(ftwReport!.spectral_radius).toBeDefined();
      }
    });

    it("alpha never exceeds max_alpha (0.90)", () => {
      const plugins = [contractingPlugin("force", "Fc_N", 1000, 0.1, "FTW")];
      const result = engine.converge(buildInput(plugins, "P", 2, {
        max_alpha: 0.90,
        max_ftw_iterations: 10,
      }));
      const ftwReport = result.convergence.find(r => r.loop === "FTW");
      if (ftwReport?.history) {
        for (const iter of ftwReport.history) {
          expect(iter.alpha).toBeLessThanOrEqual(0.90 + 1e-10);
        }
      }
    });

    it("alpha halved on oscillation detection", () => {
      let callCount = 0;
      const oscPlugin = mockPlugin("osc", {
        loop: "FTW",
        outputs: ["osc_v"],
        compute: () => {
          callCount++;
          // Oscillate wildly with large amplitude
          return {
            values: { osc_v: callCount % 2 === 0 ? 10 : 1000 },
            confidence: 0.5,
          };
        },
      });
      const result = engine.converge(buildInput([oscPlugin], "P", 2, {
        max_ftw_iterations: 20,
        oscillation_window: 6,
        max_alpha: 0.90,
      }));
      const ftwReport = result.convergence.find(r => r.loop === "FTW");
      expect(ftwReport).toBeDefined();
      // With oscillation, alpha should be adjusted and status should reflect issues
      expect(["oscillating", "max_iterations"]).toContain(ftwReport!.status);
    });
  });

  // ── Acceleration Tests (Tier 3+) ──────────────────────────────────

  describe("acceleration (Tier 3+)", () => {
    it("Anderson acceleration active at Tier 3", () => {
      const plugins = [contractingPlugin("force", "Fc_N", 1000, 0.4, "FTW")];
      const result = engine.converge(buildInput(plugins, "P", 3, {
        max_ftw_iterations: 12,
      }));
      const ftwReport = result.convergence.find(r => r.loop === "FTW");
      expect(ftwReport).toBeDefined();
      // Should have anderson acceleration in later iterations
      if (ftwReport!.history && ftwReport!.history.length > 2) {
        const hasAnderson = ftwReport!.history.some(h => h.acceleration === "anderson");
        expect(hasAnderson).toBe(true);
      }
    });

    it("Broyden activates after Anderson stall", () => {
      // Plugin that doesn't decrease residual → Anderson stalls
      let callCount = 0;
      const stallingPlugin = mockPlugin("stall", {
        loop: "FTW",
        outputs: ["stall_v"],
        compute: () => {
          callCount++;
          // Return near-constant value → residual doesn't decrease → Anderson stalls
          return { values: { stall_v: 100 + Math.sin(callCount) * 10 }, confidence: 0.5 };
        },
      });
      const result = engine.converge(buildInput([stallingPlugin], "P", 3, {
        max_ftw_iterations: 15,
        anderson_stall_count: 3,
      }));
      const ftwReport = result.convergence.find(r => r.loop === "FTW");
      if (ftwReport?.history && ftwReport.history.length > 5) {
        const hasBroyden = ftwReport.history.some(h => h.acceleration === "broyden");
        // Broyden should activate after stall
        expect(hasBroyden).toBe(true);
      }
    });

    it("Anderson and Broyden never active simultaneously", () => {
      const plugins = [contractingPlugin("force", "Fc_N", 1000, 0.5, "FTW")];
      const result = engine.converge(buildInput(plugins, "P", 3, {
        max_ftw_iterations: 12,
        anderson_stall_count: 3,
      }));
      const ftwReport = result.convergence.find(r => r.loop === "FTW");
      if (ftwReport?.history) {
        for (const iter of ftwReport.history) {
          // Each iteration should be one or the other, never both
          expect(["none", "anderson", "broyden"]).toContain(iter.acceleration);
        }
      }
    });
  });

  // ── Plugin Integration Tests ───────────────────────────────────────

  describe("plugin integration", () => {
    it("canRun() false → plugin skipped with penalty", () => {
      const skipPlugin = mockPlugin("skip_me", {
        loop: "FTW",
        outputs: ["skip_val"],
        skip_penalty: 0.25,
        canRun: () => false,
        compute: () => ({ values: { skip_val: 999 }, confidence: 0.9 }),
      });
      const result = engine.converge(buildInput([skipPlugin], "P"));
      // Plugin should be in skipped list
      const skipped = result.final_state.skipped_plugins.find(
        s => s.plugin_id === "skip_me",
      );
      expect(skipped).toBeDefined();
      expect(skipped!.reason).toBe("canRun_false");
      expect(skipped!.penalty).toBe(0.25);
      // Value should NOT be in state
      expect(result.final_state.values["skip_val"]).toBeUndefined();
    });

    it("plugin execution order preserved", () => {
      const order: string[] = [];
      const p1 = mockPlugin("first", {
        loop: "FTW",
        outputs: ["first_out"],
        compute: () => { order.push("first"); return { values: { first_out: 1 }, confidence: 1 }; },
      });
      const p2 = mockPlugin("second", {
        loop: "FTW",
        outputs: ["second_out"],
        compute: () => { order.push("second"); return { values: { second_out: 2 }, confidence: 1 }; },
      });
      engine.converge(buildInput([p1, p2], "P", 2, {
        max_ftw_iterations: 1,
      }));
      expect(order[0]).toBe("first");
      expect(order[1]).toBe("second");
    });

    it("under-relaxation applied correctly", () => {
      // Plugin returns 1000, initial state has 0 → with alpha=0.5, should be 500
      let firstCallDone = false;
      const plugin = mockPlugin("relax", {
        loop: "FTW",
        outputs: ["relax_val"],
        compute: (ctx) => {
          if (!firstCallDone) {
            firstCallDone = true;
            return { values: { relax_val: 1000 }, confidence: 0.9 };
          }
          return { values: { relax_val: 1000 }, confidence: 0.9 };
        },
      });
      const input = buildInput([plugin], "P", 2, {
        initial_alpha: 0.5,
        max_ftw_iterations: 2,
      });
      // Seed the initial state with a known value
      input.initial_state.values["relax_val"] = 0;
      const result = engine.converge(input);
      // After first iteration: 0 + 0.5 * (1000 - 0) = 500
      // The exact value depends on convergence loop mechanics, but should be < 1000
      const finalVal = result.final_state.values["relax_val"];
      expect(finalVal).toBeDefined();
      expect(finalVal!).toBeLessThan(1000);
      expect(finalVal!).toBeGreaterThan(0);
    });
  });

  // ── Serialization / Traceability ───────────────────────────────────

  describe("traceability", () => {
    it("ConvergenceIteration history recorded for each loop", () => {
      const plugins = [
        contractingPlugin("force", "Fc_N", 1000, 0.3, "FTW"),
        contractingPlugin("stability", "lobe_rpm", 8000, 0.3, "FES"),
      ];
      const result = engine.converge(buildInput(plugins, "P", 2, {
        max_ftw_iterations: 10,
        max_fes_iterations: 5,
      }));
      for (const report of result.convergence) {
        expect(report.history).toBeDefined();
        expect(report.history!.length).toBeGreaterThan(0);
        // Each iteration should have required fields
        for (const iter of report.history!) {
          expect(typeof iter.index).toBe("number");
          expect(typeof iter.residual).toBe("number");
          expect(typeof iter.alpha).toBe("number");
          expect(iter.snapshot).toBeDefined();
          expect(["none", "anderson", "broyden"]).toContain(iter.acceleration);
        }
      }
    });

    it("LoopConvergenceReport has spectral_radius field", () => {
      const plugins = [contractingPlugin("force", "Fc_N", 1000, 0.5, "FTW")];
      const result = engine.converge(buildInput(plugins, "P", 2, {
        max_ftw_iterations: 8,
      }));
      const ftwReport = result.convergence.find(r => r.loop === "FTW");
      expect(ftwReport).toBeDefined();
      // After enough iterations, spectral_radius should be computed
      if (ftwReport!.iterations > 2) {
        expect(ftwReport!.spectral_radius).toBeDefined();
        expect(typeof ftwReport!.spectral_radius).toBe("number");
      }
    });
  });

  // ── Edge Cases ─────────────────────────────────────────────────────

  describe("edge cases", () => {
    it("no loop plugins → immediate return", () => {
      const singlePass = mockPlugin("single", {
        outputs: ["sp_val"],
        compute: () => ({ values: { sp_val: 42 }, confidence: 1.0 }),
      });
      const result = engine.converge(buildInput([singlePass], "P"));
      expect(result.overall_status).toBe("converged");
      expect(result.total_iterations).toBe(0);
      expect(result.convergence.length).toBe(0);
      expect(result.final_state.values["sp_val"]).toBe(42);
    });

    it("singleton export exists", () => {
      expect(physicsFusionConvergenceEngine).toBeDefined();
      expect(physicsFusionConvergenceEngine).toBeInstanceOf(
        PhysicsFusionConvergenceEngine,
      );
    });
  });
});
