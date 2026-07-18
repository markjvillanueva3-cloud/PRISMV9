/**
 * turning-spine-reports.test.ts -- slot:whiskey (Lathe Wizard, U-LW-SPINE-REPORTS)
 * ============================================================================
 * Three late spine stages (PHYSICS_REPORT / SETUP_SHEET / COST_REPORT) were empty stubs. They run
 * AFTER GCODE_GENERATE (which stores the verified runPipeline result on state.pipeline_result), so this
 * de-stubs them to emit REAL reports from that result -- per-op Kienzle cutting force, the operation
 * sequence + tool list, and the cycle-time / tool-change cost drivers. The head (generateProgram) now
 * surfaces all three so its output is a complete program package.
 *
 * Intent (R9): the reports reflect the ACTUAL pipeline_result numbers (peak force == max op force; op
 * count == operations.length; tool-change count surfaced); per-part $ is honestly DEFERRED to the ERP
 * galaxy (no fabricated rate); and on a fail-close NO report is fabricated.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { latheOrchestrationEngine } from "../engines/LatheOrchestrationEngine.js";
import { latheAIOrchestrationEngine } from "../engines/LatheAIOrchestrationEngine.js";
import { turningPrintToProgramEngine } from "../engines/TurningPrintToProgramEngine.js";

const okumaPart = () =>
  ({
    part_number: "SPINE-REPORTS",
    material: { material_name: "1018", iso_group: "P" as const },
    bar_stock_od_mm: 40,
    part_length_mm: 80,
    features: [
      { id: "f1", type: "od_turn" as const, od_mm: 30, length_mm: 60, position_z_mm: 0,
        x_start_mm: 40, x_end_mm: 30, z_start_mm: 0, z_end_mm: -60 },
    ],
    controller: "okuma",
    machine_model: "Okuma LB3000",
  }) as unknown as Parameters<typeof latheOrchestrationEngine.calculate>[1];

describe("U-LW-SPINE-REPORTS -- spine de-stubbed reports + head surfacing", () => {
  afterEach(() => vi.restoreAllMocks());

  it("physics_report surfaces per-op Kienzle force with the peak matching the max op force", () => {
    const r = latheOrchestrationEngine.calculate("x", okumaPart());
    const rep = r.physics_report;
    expect(rep).toBeTruthy();
    expect(rep).toContain("PHYSICS TRACEABILITY REPORT");
    expect(r.operations.length).toBeGreaterThan(0);
    const peak = Math.max(
      ...r.operations.map((op) => (op as { physics?: { cutting_force_N?: number } }).physics?.cutting_force_N ?? 0),
    );
    expect(peak).toBeGreaterThan(0); // real Kienzle force from op.physics, not zero
    expect(rep as string).toContain(`Peak cutting force: ${Math.round(peak)} N`);
  });

  it("setup_sheet_text lists the operation sequence + tools + stock from the real result", () => {
    const r = latheOrchestrationEngine.calculate("x", okumaPart());
    const s = r.setup_sheet_text;
    expect(s).toBeTruthy();
    expect(s).toContain("LATHE SETUP SHEET");
    expect(s).toContain("Tools required");
    expect(s as string).toContain(`Operations: ${r.total_operations}`);
    expect(s).toContain("1018"); // material surfaced
  });

  it("cost_report surfaces cycle time + tool changes and DEFERS per-part $ to ERP (no fabricated rate)", () => {
    const r = latheOrchestrationEngine.calculate("x", okumaPart());
    const c = r.cost_report;
    expect(c).toBeTruthy();
    expect(c).toContain("COST DRIVERS REPORT");
    expect(c as string).toContain(`Tool changes: ${r.total_tool_changes}`);
    // honest deferral -- the report must NOT invent a $ figure
    expect(c).toMatch(/per-part \$.*ERP\/quoting galaxy/);
    expect(c).not.toMatch(/\$\d/); // no fabricated dollar amount
  });

  it("the head's generateProgram surfaces all 3 reports identical to the spine's", () => {
    const spine = latheOrchestrationEngine.calculate("x", okumaPart());
    const head = latheAIOrchestrationEngine.generateProgram(okumaPart());
    // reports carry no timestamp, so two runs on identical input are byte-identical
    expect(head.physics_report).toBe(spine.physics_report);
    expect(head.setup_sheet_text).toBe(spine.setup_sheet_text);
    expect(head.cost_report).toBe(spine.cost_report);
    expect(head.physics_report).toContain("PHYSICS TRACEABILITY");
    expect(head.cost_report).toContain("COST DRIVERS");
  });

  it("HONEST fail-close: no fabricated reports when the program is not emitted", () => {
    vi.spyOn(
      turningPrintToProgramEngine as unknown as { emitViaOkumaPost: () => unknown },
      "emitViaOkumaPost",
    ).mockReturnValue(null);
    const r = latheOrchestrationEngine.calculate("x", okumaPart());
    expect(r.success).toBe(false);
    expect(r.physics_report).toBeUndefined();
    expect(r.cost_report).toBeUndefined();
    expect(r.setup_sheet_text).toBeUndefined();
    expect(r.setup_notes.some((n) => /not generated/.test(n))).toBe(true);
  });
});
