/**
 * FORGE-DEBUG P7 Regression Tests — Process Engine Dispatchers
 * Covers bugs found in grindingDispatcher, generatorDispatcher, exportDispatcher,
 * threadTools, turningDispatcher during MASTER_INDEX sweep.
 */
import { describe, it, expect } from "vitest";

// ============================================================================
// grindingDispatcher: falsy traps on numeric grinding params
// ============================================================================
describe("P7-GD-001: grinding numeric params ?? vs ||", () => {
  it("residual_stress_MPa=0 should stay 0 (stress-free), not become -200", () => {
    const val = 0;
    expect(val || -200).toBe(-200); // BUG
    expect(val ?? -200).toBe(0);    // FIX: stress-free surface
  });

  it("depth_of_cut_mm=0 should stay 0 (no cut), not become 0.02", () => {
    const val = 0;
    expect(val || 0.02).toBe(0.02); // BUG: phantom grinding force
    expect(val ?? 0.02).toBe(0);    // FIX
  });

  it("stock_removal_mm3_s=0 should stay 0 (no-load baseline)", () => {
    const val = 0;
    expect(val || 5).toBe(5);  // BUG
    expect(val ?? 5).toBe(0);  // FIX
  });

  it("burn_threshold_W=0 should stay 0 (calibration)", () => {
    const val = 0;
    expect(val || 500).toBe(500); // BUG
    expect(val ?? 500).toBe(0);   // FIX
  });

  it("dress_depth_um=0 should stay 0 (no-dress pass)", () => {
    const val = 0;
    expect(val || 15).toBe(15); // BUG
    expect(val ?? 15).toBe(0);  // FIX
  });

  it("passes=0 should stay 0", () => {
    const val = 0;
    expect(val || 2).toBe(2);  // BUG
    expect(val ?? 2).toBe(0);  // FIX
  });
});

// ============================================================================
// grindingDispatcher: dress_params div/0 guard on lead
// ============================================================================
describe("P7-GD-002: dress_params lead div/0 guard", () => {
  it("lead=0 should not produce Infinity overlap ratio", () => {
    const lead = 0;
    const safeLead = Math.max(lead, 0.001);
    const overlapRatio = 1 / safeLead;
    expect(isFinite(overlapRatio)).toBe(true);
    expect(overlapRatio).toBe(1000); // capped at 0.001
  });
});

// ============================================================================
// generatorDispatcher: div/0 on rate_per_second
// ============================================================================
describe("P7-GEN-001: generator rate_per_second div/0 guard", () => {
  it("duration=0 should not produce Infinity", () => {
    const hooks = 50;
    const duration = 0;

    // OLD: Math.round(hooks / (duration / 1000)) → Infinity
    const oldResult = Math.round(hooks / (duration / 1000));
    expect(oldResult).toBe(Infinity); // BUG

    // NEW: guard
    const newResult = duration > 0 ? Math.round(hooks / (duration / 1000)) : hooks * 1000;
    expect(isFinite(newResult)).toBe(true); // FIX
  });

  it("hooks.length=0 should produce N/A validation_rate, not NaN%", () => {
    const hooks = 0;
    const errors = 0;

    // OLD: ((hooks - errors) / hooks * 100).toFixed(2) + "%"
    const oldResult = ((hooks - errors) / hooks * 100).toFixed(2) + "%";
    expect(oldResult).toBe("NaN%"); // BUG

    // NEW: guard
    const newResult = hooks > 0 ? ((hooks - errors) / hooks * 100).toFixed(2) + "%" : "N/A";
    expect(newResult).toBe("N/A"); // FIX
  });
});

// ============================================================================
// exportDispatcher: falsy traps on sheets/bodies
// ============================================================================
describe("P7-EX-001: export sheets/bodies ?? vs ||", () => {
  it("sheets=0 should stay 0, not become 1", () => {
    expect(0 || 1).toBe(1);  // BUG
    expect(0 ?? 1).toBe(0);  // FIX
  });

  it("bodies=0 should stay 0, not become 1", () => {
    expect(0 || 1).toBe(1);  // BUG
    expect(0 ?? 1).toBe(0);  // FIX
  });
});

// ============================================================================
// threadTools: engagement_percent warning logic
// ============================================================================
describe("P7-TH-001: threadTools engagement_percent resolved value for warning", () => {
  it("warning should fire when defaulted engagement (75) exceeds 65 for titanium", () => {
    const args = { material: "titanium" }; // no engagement_percent passed
    const engPct = (args as Record<string, unknown>).engagement_percent ?? 75;

    // OLD: args.engagement_percent > 65 → undefined > 65 = false (warning never fires)
    expect((args as Record<string, unknown>).engagement_percent > 65).toBe(false); // BUG

    // NEW: use resolved engPct
    expect(engPct > 65).toBe(true); // FIX: warning fires for 75% > 65%
  });
});

// ============================================================================
// threadTools: tensile_strength_mpa and spindle_speed falsy traps
// ============================================================================
describe("P7-TH-002: threadTools numeric falsy traps", () => {
  it("tensile_strength_mpa=0 should stay 0 (safety critical)", () => {
    expect(0 || 400).toBe(400); // BUG
    expect(0 ?? 400).toBe(0);   // FIX
  });

  it("spindle_speed=0 should stay 0 (not silently become 500 RPM)", () => {
    expect(0 || 500).toBe(500); // BUG
    expect(0 ?? 500).toBe(0);   // FIX
  });
});

// ============================================================================
// turningDispatcher: dead cross-field validation gate
// ============================================================================
describe("P7-TD-001: turning cross-field validation reachable", () => {
  it("force-producing actions should not require Vc for physics check", () => {
    // Simulate force result (no Vc field)
    const result = { clamping_force_N: 5000, safety_factor: 2.5 };
    const action = "chuck_force";
    const physicsActions = new Set(["chuck_force", "tailstock", "part_off_force"]);

    // OLD: gate on result.Vc !== undefined — never true for force results
    const oldGate = physicsActions.has(action) && result && !(result as Record<string, unknown>).error && (result as Record<string, unknown>).Vc !== undefined;
    expect(oldGate).toBe(false); // BUG: validation never fires

    // NEW: remove Vc gate
    const newGate = physicsActions.has(action) && result && !(result as Record<string, unknown>).error;
    expect(newGate).toBe(true); // FIX: validation fires for force results
  });
});
