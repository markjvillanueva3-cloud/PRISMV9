/**
 * TravelerGenerationOrchestratorEngine tests -- QUOTING-TRAVELER/U-TRAVGEN.
 *
 * Verifies the auto-generated print->shipping traveler: department spine order,
 * data-driven dept inclusion (grind/finish), per-step checklists, role/dept
 * tagging, and the RoutingSheetGeneratorEngine compose-mapping. Real
 * reference-value asserts across >=3 spanning part configs (R9).
 */
import { describe, it, expect } from "vitest";
import {
  travelerGenerationOrchestratorEngine as eng,
  type TravelerGenerationInput,
} from "../engines/TravelerGenerationOrchestratorEngine.js";
import { routingSheetGeneratorEngine } from "../engines/RoutingSheetGeneratorEngine.js";

// A milled prismatic part with a tight-tolerance bore (-> grinding) + plated finish.
const MILL_GROUND_PLATED: TravelerGenerationInput = {
  job_id: "JOB-1001",
  part_number: "ALCOA-55-A",
  customer: "ALCOA",
  material_iso_group: "P",
  material_name: "4140 steel",
  features: [
    { id: "p1", type: "pocket", dimensions: { width_mm: 40, length_mm: 60, depth_mm: 12 } },
    { id: "h1", type: "hole", dimensions: { diameter_mm: 8, depth_mm: 20 }, count: 4 },
    { id: "b1", type: "bore", dimensions: { diameter_mm: 25, depth_mm: 30 }, tolerance_mm: 0.008 }, // ground
  ],
  stock: { x_mm: 100, y_mm: 80, z_mm: 25 },
  batch_size: 50,
  quoted_finish: "black_oxide",
};

// A simple milled part: NO ground bore, NO finish -> grinding + finishing OMITTED.
const MILL_SIMPLE: TravelerGenerationInput = {
  job_id: "JOB-1002",
  part_number: "ITW-12-B",
  customer: "ITW",
  material_iso_group: "N",
  features: [
    { id: "p1", type: "pocket", dimensions: { width_mm: 30, length_mm: 30, depth_mm: 5 } },
  ],
  stock: { x_mm: 50, y_mm: 50, z_mm: 10 },
  batch_size: 1,
};

// A turned part (only turn-type features) -> Turning department, not Machining.
const TURNED_PART: TravelerGenerationInput = {
  job_id: "JOB-1003",
  part_number: "SFS-77-C",
  customer: "SFS",
  material_iso_group: "M",
  features: [
    { id: "g1", type: "groove", dimensions: { width_mm: 3, diameter_mm: 20 } },
    { id: "t1", type: "thread", dimensions: { diameter_mm: 12, depth_mm: 18 } },
  ],
  stock: { x_mm: 25, y_mm: 25, z_mm: 60 },
  batch_size: 10,
};

describe("TravelerGenerationOrchestratorEngine -- spine generation", () => {
  it("generates the FULL print->shipping spine in order for a mill+ground+plated part", () => {
    const t = eng.generate(MILL_GROUND_PLATED);
    const depts = t.steps.map((s) => s.department);

    // The leading + trailing spine is fixed:
    expect(depts[0]).toBe("programming");
    expect(depts[1]).toBe("saw");
    expect(t.steps[t.steps.length - 1].department).toBe("shipping");

    // Required departments are present for this part:
    for (const d of ["programming", "saw", "machining", "grinding", "deburr", "finishing", "inspection", "shipping"]) {
      expect(t.departments).toContain(d as never);
    }

    // Ordering invariants: grinding after machining, finishing after deburr,
    // inspection before shipping.
    const idx = (d: string) => depts.indexOf(d as never);
    expect(idx("machining")).toBeLessThan(idx("grinding"));
    expect(idx("grinding")).toBeLessThan(idx("deburr"));
    expect(idx("deburr")).toBeLessThan(idx("finishing"));
    expect(idx("finishing")).toBeLessThan(idx("inspection"));
    expect(idx("inspection")).toBeLessThan(idx("shipping"));

    // seq is 1-based contiguous; op_num is seq*10.
    t.steps.forEach((s, i) => {
      expect(s.seq).toBe(i + 1);
      expect(s.op_num).toBe((i + 1) * 10);
    });

    // batch_size 50 (>1) -> BOTH first-article AND final inspection gates.
    const gates = t.steps.filter((s) => s.is_inspection_gate);
    expect(gates.length).toBe(2);
    expect(gates[0].operation).toMatch(/first-article/i);
    expect(gates[1].operation).toMatch(/final/i);

    // The finishing step is an outside service.
    const fin = t.steps.find((s) => s.department === "finishing");
    expect(fin?.is_outside_service).toBe(true);
    expect(fin?.operation).toContain("black_oxide");
  });

  it("OMITS grinding + finishing for a simple part with no ground bore / no finish (data-driven)", () => {
    const t = eng.generate(MILL_SIMPLE);
    expect(t.departments).not.toContain("grinding" as never);
    expect(t.departments).not.toContain("finishing" as never);
    expect(t.departments).not.toContain("edm" as never);
    // Still has the core spine.
    expect(t.departments).toContain("machining" as never);
    expect(t.departments).toContain("inspection" as never);
    expect(t.departments).toContain("shipping" as never);
    // batch_size 1 -> only ONE inspection gate (first-article), no final.
    expect(t.steps.filter((s) => s.is_inspection_gate).length).toBe(1);
    // The omit reasons are surfaced (R12, not silent).
    expect(t.notes.some((n) => /grinding omitted/i.test(n))).toBe(true);
    expect(t.notes.some((n) => /finishing omitted/i.test(n))).toBe(true);
  });

  it("routes a turn-only part to the Turning department (not Machining)", () => {
    const t = eng.generate(TURNED_PART);
    expect(t.departments).toContain("turning" as never);
    expect(t.departments).not.toContain("machining" as never);
    const turnStep = t.steps.find((s) => s.department === "turning");
    expect(turnStep?.machine_domain).toBe("lathe");
  });
});

describe("TravelerGenerationOrchestratorEngine -- checklists, roles, safety", () => {
  it("attaches a non-empty checklist to EVERY step with stable unique ids", () => {
    const t = eng.generate(MILL_GROUND_PLATED);
    const allIds = new Set<string>();
    for (const s of t.steps) {
      expect(s.checklist.length).toBeGreaterThan(0);
      for (const item of s.checklist) {
        expect(item.id).toMatch(new RegExp(`^${s.department}-${s.seq}-\\d+$`));
        expect(allIds.has(item.id)).toBe(false); // globally unique
        allIds.add(item.id);
        expect(item.label.length).toBeGreaterThan(0);
      }
    }
  });

  it("prepends SAFETY items to machine steps but NOT to programming/QC/shipping", () => {
    const t = eng.generate(MILL_GROUND_PLATED);
    const safety = /safety glasses/i;
    const machine = t.steps.find((s) => s.department === "machining");
    const prog = t.steps.find((s) => s.department === "programming");
    const ship = t.steps.find((s) => s.department === "shipping");
    expect(machine!.checklist.some((c) => safety.test(c.label))).toBe(true);
    expect(prog!.checklist.some((c) => safety.test(c.label))).toBe(false);
    expect(ship!.checklist.some((c) => safety.test(c.label))).toBe(false);
  });

  it("assigns the right role per department (programmer/inspector/operator/planner)", () => {
    const t = eng.generate(MILL_GROUND_PLATED);
    expect(t.steps.find((s) => s.department === "programming")!.role).toBe("programmer");
    expect(t.steps.find((s) => s.department === "inspection")!.role).toBe("inspector");
    expect(t.steps.find((s) => s.department === "finishing")!.role).toBe("planner");
    // The first machining op is setup-bearing -> setup_tech.
    const firstMachine = t.steps.find((s) => s.department === "machining");
    expect(firstMachine!.role).toBe("setup_tech");
  });

  it("inspection-gate checklists require a signed-off FAI item", () => {
    const t = eng.generate(MILL_GROUND_PLATED);
    const gate = t.steps.find((s) => s.is_inspection_gate)!;
    expect(gate.checklist.some((c) => c.signoff && /FAI|inspection report/i.test(c.label))).toBe(true);
  });

  it("est_total_min accounts for cycle time x batch (not just per-part)", () => {
    const t1 = eng.generate({ ...MILL_SIMPLE, batch_size: 1 });
    const t100 = eng.generate({ ...MILL_SIMPLE, batch_size: 100 });
    // More parts -> more total minutes (cycle scales with batch; setup does not).
    expect(t100.est_total_min).toBeGreaterThan(t1.est_total_min);
  });
});

describe("TravelerGenerationOrchestratorEngine -- skip flags + compose mapping", () => {
  it("omits Programming when has_proven_program, omits Saw when stock_precut", () => {
    const t = eng.generate({ ...MILL_SIMPLE, has_proven_program: true, stock_precut: true });
    expect(t.departments).not.toContain("programming" as never);
    expect(t.departments).not.toContain("saw" as never);
    expect(t.notes.some((n) => /Programming step omitted/i.test(n))).toBe(true);
    expect(t.notes.some((n) => /Saw step omitted/i.test(n))).toBe(true);
  });

  it("toRoutingInput maps to a valid RoutingSheetGeneratorEngine input with totals", () => {
    routingSheetGeneratorEngine.reset();
    const t = eng.generate(MILL_GROUND_PLATED);
    const routingInput = eng.toRoutingInput(t, t.steps.length > 0 ? 50 : 1);
    expect(routingInput.operations.length).toBe(t.steps.length);
    // op_num monotonic (no warnings about non-monotonic sequence).
    const sheet = routingSheetGeneratorEngine.generate(routingInput);
    expect(sheet.totals.op_count).toBe(t.steps.length);
    expect(sheet.totals.total_min).toBeGreaterThan(0);
    expect(sheet.warnings.filter((w) => /not monotonic/i.test(w)).length).toBe(0);
    // machine_type round-trips: a machining step maps to "mill".
    const millRow = sheet.rows.find((r) => /pocket|face|rough|drill/i.test(r.op_name));
    if (millRow) expect(millRow.machine_type).toBe("mill");
    // inspection gate carries the "Quality gate" note.
    expect(sheet.rows.some((r) => r.notes === "Quality gate")).toBe(true);
  });
});

describe("TravelerGenerationOrchestratorEngine -- validation / adversarial", () => {
  it("throws on missing job_id", () => {
    expect(() => eng.generate({ ...MILL_SIMPLE, job_id: "" })).toThrow(/job_id is required/);
  });

  it("throws on missing part_number", () => {
    expect(() => eng.generate({ ...MILL_SIMPLE, part_number: "  " })).toThrow(/part_number is required/);
  });

  it("throws on invalid material ISO group", () => {
    expect(() => eng.generate({ ...MILL_SIMPLE, material_iso_group: "Z" })).toThrow(/P\/M\/K\/N\/S\/H/);
  });

  it("handles empty features (no cuttable geometry) without crashing", () => {
    const t = eng.generate({ ...MILL_SIMPLE, features: [] });
    // Still a valid traveler. NOTE: ProcessPlanEngine auto-faces the stock top
    // even with no features, so a machining (face) op is still generated -- the
    // traveler is never op-empty. The spine + gates + shipping must be intact.
    expect(t.departments).toContain("programming" as never);
    expect(t.departments).toContain("machining" as never); // the auto-face op
    expect(t.departments).toContain("inspection" as never);
    expect(t.departments).toContain("shipping" as never);
    expect(t.steps[t.steps.length - 1].department).toBe("shipping");
    // Grinding/EDM/finishing still correctly omitted (no driving features).
    expect(t.departments).not.toContain("grinding" as never);
    expect(t.departments).not.toContain("finishing" as never);
  });

  it("clamps a non-finite / negative batch_size to 1", () => {
    const tNaN = eng.generate({ ...MILL_SIMPLE, batch_size: Number.NaN });
    const tNeg = eng.generate({ ...MILL_SIMPLE, batch_size: -5 });
    // batch clamped to 1 -> single inspection gate (no final).
    expect(tNaN.steps.filter((s) => s.is_inspection_gate).length).toBe(1);
    expect(tNeg.steps.filter((s) => s.is_inspection_gate).length).toBe(1);
  });
});
