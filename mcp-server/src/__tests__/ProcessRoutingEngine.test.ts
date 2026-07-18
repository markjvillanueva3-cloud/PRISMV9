/**
 * ProcessRoutingEngine tests -- QUOTE-GROUNDING-MS0/U1.
 *
 * Verifies INTENT (R9), not shape: the engine must route each operation to the
 * SAME JM machine + rate that ShopConfigurationEngine.selectCapableMachines
 * would pick, auto-inject heat-treat for hardened parts as an OUTSOURCE step,
 * sequence ops in canonical build order, and flag (never fabricate) ungrounded
 * machining time. Fixture = the C-033626 flattening-die-set Base component.
 */

import { describe, it, expect } from "vitest";
import {
  processRoutingEngine,
  type ProcessRoutingInput,
  type RoutedOperation,
} from "../engines/ProcessRoutingEngine.js";
import { shopConfigurationEngine } from "../engines/ShopConfigurationEngine.js";

const PROFILE = "jm-die";

/** Cheapest capable JM machine for a capability tag (the engine's expected pick). */
function expectedMachine(tag: string) {
  return shopConfigurationEngine
    .selectCapableMachines({ capabilities: [tag] }, PROFILE)
    .filter((m) => m.rejection_reasons.length === 0)[0];
}

function baseInput(overrides: Partial<ProcessRoutingInput> = {}): ProcessRoutingInput {
  return {
    part_name: "C-033626 Base",
    material_iso_group: "H", // hardened tool steel (D2)
    material_name: "AISI D2",
    hardness_hrc: 57, // Rc 56-58 -> hardened
    envelope_mm: { x: 135, y: 51, z: 38 }, // ~5.3 x 2.0 x 1.5 in
    tightest_tolerance_mm: 0.013, // ~.0005"
    features: [
      { id: "h1", type: "hole", dimensions: { diameter_mm: 12.7, depth_mm: 38 }, count: 2, tolerance_mm: 0.012 },
      { id: "t1", type: "thread", dimensions: { diameter_mm: 6.35, depth_mm: 21 }, count: 4 },
    ],
    extra_steps: [
      { kind: "saw", description: "Saw D2 blank" },
      { kind: "surface_grind", description: "Surface grind 6 faces + datum A .0005", tolerance_mm: 0.013, provisional_time_min: 60 },
      { kind: "wire_edm", description: "Wire EDM 3-ear TSC form", geometry: { cut_length_mm: 200, height_mm: 38, passes: 3 } },
      { kind: "jig_bore", description: "Jig bore 2x .4995 to tenths", tolerance_mm: 0.012, geometry: { bores: 2 } },
      { kind: "assembly", description: "Press-fit 2 alignment pins + grind flush", provisional_time_min: 30 },
      { kind: "inspect", description: "CMM FAI", provisional_time_min: 45 },
    ],
    ...overrides,
  };
}

const find = (ops: RoutedOperation[], kind: string) => ops.find((o) => o.kind === kind);
const idx = (ops: RoutedOperation[], kind: string) => ops.findIndex((o) => o.kind === kind);
const kinds = (ops: RoutedOperation[]) => ops.map((o) => o.kind);

describe("ProcessRoutingEngine.route -- happy path (C-033626 Base)", () => {
  const result = processRoutingEngine.route(baseInput());

  it("flags the hardened part and auto-injects heat-treat as an OUTSOURCE step", () => {
    expect(result.hardened).toBe(true);
    expect(kinds(result.operations)).toContain("heat_treat");
    const ht = find(result.operations, "heat_treat")!;
    expect(ht.outsource).toBe(true);
    expect(ht.machine_id).toBe(null);
    expect(ht.rate_basis).toBe("outsource");
    expect(ht.hourly_rate).toBe(0);
    expect(result.total_outsource_ops).toBeGreaterThanOrEqual(1);
  });

  it("routes wire-EDM to the SAME machine + rate selectCapableMachines picks (intent)", () => {
    const expWedm = expectedMachine("wire_edm");
    expect(typeof expWedm.machine_id).toBe("string"); // JM roster has a wire EDM
    const op = find(result.operations, "wire_edm")!;
    expect(op.machine_id).toBe(expWedm.machine_id);
    expect(op.hourly_rate).toBe(expWedm.effective_rate);
    expect(op.outsource).toBe(false);
    expect(op.rate_basis).toBe("machine");
    // the chosen machine genuinely has the wire_edm capability
    const machine = shopConfigurationEngine.getMachines(PROFILE).find((m) => m.id === op.machine_id)!;
    expect(machine.capabilities.map((c) => c.toLowerCase())).toContain("wire_edm");
  });

  it("routes surface-grind, saw, and inspect to capability-correct machines", () => {
    const sg = find(result.operations, "surface_grind")!;
    expect(sg.machine_id).toBe(expectedMachine("surface_grinding").machine_id);
    expect(sg.hourly_rate).toBe(expectedMachine("surface_grinding").effective_rate);

    const saw = find(result.operations, "saw")!;
    expect(saw.machine_id).toBe(expectedMachine("cutoff").machine_id);

    const insp = find(result.operations, "inspect")!;
    expect(insp.machine_id).toBe(expectedMachine("inspection").machine_id);
    expect(insp.rate_basis).toBe("inspection");
  });

  it("prices assembly as bench labor at the shop labor rate (no machine)", () => {
    const rates = shopConfigurationEngine.getRates(PROFILE);
    const asm = find(result.operations, "assembly")!;
    expect(asm.machine_id).toBe(null);
    expect(asm.rate_basis).toBe("bench_labor");
    expect(asm.hourly_rate).toBe(rates.labor_per_hr);
    expect(asm.time_min).toBe(30); // operator hint passes through
    expect(asm.time_source).toBe("operator-hint");
  });

  it("sequences operations in canonical build order (soft -> HT -> grind -> EDM -> bore -> assembly -> inspect)", () => {
    const ops = result.operations;
    expect(idx(ops, "drill")).toBeGreaterThanOrEqual(0); // milling decomposed the holes
    expect(idx(ops, "drill")).toBeLessThan(idx(ops, "heat_treat"));
    expect(idx(ops, "heat_treat")).toBeLessThan(idx(ops, "surface_grind"));
    expect(idx(ops, "surface_grind")).toBeLessThan(idx(ops, "wire_edm"));
    expect(idx(ops, "wire_edm")).toBeLessThan(idx(ops, "jig_bore"));
    expect(idx(ops, "jig_bore")).toBeLessThan(idx(ops, "assembly"));
    expect(idx(ops, "assembly")).toBeLessThan(idx(ops, "inspect"));
    // seq is 1..N contiguous
    ops.forEach((o, i) => expect(o.seq).toBe(i + 1));
  });

  it("flags ungrounded machining time as pending-physics (never fabricates a minute)", () => {
    const wedm = find(result.operations, "wire_edm")!;
    expect(wedm.time_source).toBe("pending-physics");
    expect(wedm.time_min).toBe(0);
    const jb = find(result.operations, "jig_bore")!;
    expect(jb.time_source).toBe("pending-physics");
    expect(result.warnings.some((w) => /pending-physics/i.test(w))).toBe(true);
    // milling features carry ProcessPlanEngine parametric time (> 0)
    const drill = find(result.operations, "drill")!;
    expect(drill.time_source).toBe("process-plan-parametric");
    expect(drill.time_min).toBeGreaterThan(0);
  });

  it("counts setups as machine transitions (>=1) and machine minutes exclude outsource/bench", () => {
    expect(result.total_setups).toBeGreaterThanOrEqual(1);
    // surface_grind (60) + inspect (45) are the only machine/inspection ops with provisional time here
    expect(result.total_machine_minutes).toBeGreaterThanOrEqual(105);
  });
});

describe("ProcessRoutingEngine.route -- failure modes (R12 fail-loud)", () => {
  it("throws on missing input object", () => {
    // @ts-expect-error intentional bad input
    expect(() => processRoutingEngine.route(undefined)).toThrow();
  });
  it("throws on missing part_name", () => {
    expect(() => processRoutingEngine.route(baseInput({ part_name: "  " }))).toThrow(/part_name/);
  });
  it("throws on missing material_iso_group", () => {
    // @ts-expect-error intentional bad input
    expect(() => processRoutingEngine.route(baseInput({ material_iso_group: undefined }))).toThrow(/material_iso_group/);
  });
  it("throws on non-positive envelope", () => {
    expect(() => processRoutingEngine.route(baseInput({ envelope_mm: { x: -1, y: 10, z: 10 } }))).toThrow(/envelope/);
  });
  it("throws when no features AND no extra_steps", () => {
    expect(() =>
      processRoutingEngine.route(baseInput({ features: [], extra_steps: [], hardness_hrc: 0 })),
    ).toThrow(/no operations/);
  });
});

describe("ProcessRoutingEngine.route -- adversarial", () => {
  it("ignores an unknown extra_step kind with a warning (no crash)", () => {
    const r = processRoutingEngine.route(
      baseInput({
        // @ts-expect-error intentional unknown kind
        extra_steps: [{ kind: "frobnicate", description: "bogus" }, { kind: "saw" }],
        features: [],
      }),
    );
    expect(r.warnings.some((w) => /unknown kind/i.test(w))).toBe(true);
    expect(r.operations.some((o) => (o.kind as string) === "frobnicate")).toBe(false);
    expect(kinds(r.operations)).toContain("saw");
  });

  it("does NOT double-inject heat-treat when caller already supplied it", () => {
    const r = processRoutingEngine.route(
      baseInput({
        features: [],
        extra_steps: [
          { kind: "heat_treat", description: "vac harden Rc 60", provisional_time_min: 0 },
          { kind: "surface_grind", provisional_time_min: 30 },
        ],
      }),
    );
    expect(r.operations.filter((o) => o.kind === "heat_treat").length).toBe(1);
  });

  it("routes turn to a real lathe (turning capability) -- no silent cheapest-machine pick", () => {
    const r = processRoutingEngine.route(
      baseInput({ features: [], extra_steps: [{ kind: "turn", description: "OD turn", provisional_time_min: 10 }] }),
    );
    const turn = find(r.operations, "turn")!;
    expect(turn.machine_id).toBe(expectedMachine("turning").machine_id);
    const machine = shopConfigurationEngine.getMachines(PROFILE).find((m) => m.id === turn.machine_id)!;
    expect(machine.capabilities.map((c) => c.toLowerCase())).toContain("turning");
  });
});
