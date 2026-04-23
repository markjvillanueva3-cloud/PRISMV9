import { describe, it, expect } from "vitest";
import { WEDMJobCreatorEngine } from "../engines/WEDMJobCreatorEngine.js";
import type { WEDMProgramResult } from "../engines/WEDMPrintToProgramEngine.js";
import type { Quote } from "../engines/QuoteEngine.js";

function makeProgram(overrides: Partial<WEDMProgramResult> = {}): WEDMProgramResult {
  return {
    success: true,
    program_text: "G21\nG90\nG00 X0 Y0\nM02",
    line_count: 4,
    controller: "mitsubishi-mv",
    profiles_cut: 1,
    passes_per_profile: 3,
    estimated_time_min: 48,
    predicted_ra_um: 1.8,
    predicted_accuracy_mm: 0.005,
    wire_consumption_m: 620,
    pass_details: [
      {
        pass_number: 1, type: "rough", offset_mm: 0.15, feed_mm_min: 3.2,
        e_pack_code: "E240", wire_speed_m_min: 7.5, tension_N: 10,
        predicted_ra_um: 3.2, predicted_recast_um: 15,
      },
      {
        pass_number: 2, type: "skim", offset_mm: 0.09, feed_mm_min: 6.0,
        e_pack_code: "E520", wire_speed_m_min: 6.0, tension_N: 12,
        predicted_ra_um: 2.4, predicted_recast_um: 8,
      },
      {
        pass_number: 3, type: "skim", offset_mm: 0.04, feed_mm_min: 9.0,
        e_pack_code: "E830", wire_speed_m_min: 4.5, tension_N: 14,
        predicted_ra_um: 1.8, predicted_recast_um: 3,
      },
    ],
    setup_sheet: {
      part_name: "Die Insert",
      part_number: "DI-1234",
      material: "D2",
      thickness_mm: 32,
      wire_type: "brass",
      wire_diameter_mm: 0.25,
    } as any,
    geometry_summary: {} as any,
    warnings: [],
    stages_completed: [],
    cycle_time_breakdown: {} as any,
    confidence_score: {} as any,
    ...overrides,
  };
}

describe("WEDMJobCreatorEngine", () => {
  describe("createJob", () => {
    it("produces a WEDM job packet with jobType='wedm'", () => {
      const prog = makeProgram();
      const packet = WEDMJobCreatorEngine.createJob(prog);
      expect(packet.jobType).toBe("wedm");
      expect(packet.jobId).toMatch(/^WEDM-/);
    });

    it("attaches NC program text", () => {
      const prog = makeProgram();
      const packet = WEDMJobCreatorEngine.createJob(prog);
      expect(packet.programText).toContain("G21");
      expect(packet.programText.length).toBeGreaterThan(0);
    });

    it("creates 10 WEDM departments", () => {
      const prog = makeProgram();
      const packet = WEDMJobCreatorEngine.createJob(prog);
      expect(packet.departments.length).toBe(10);
      const ids = packet.departments.map((d) => d.id);
      expect(ids).toContain("intake");
      expect(ids).toContain("setup");
      expect(ids).toContain("rough");
      expect(ids).toContain("skim1");
      expect(ids).toContain("qc");
      expect(ids).toContain("ship");
    });

    it("first department is 'current', rest are 'pending'", () => {
      const prog = makeProgram();
      const packet = WEDMJobCreatorEngine.createJob(prog);
      expect(packet.departments[0].status).toBe("current");
      expect(packet.departments.slice(1).every((d) => d.status === "pending")).toBe(true);
    });

    it("one operation per pass + setup + QC + ship", () => {
      const prog = makeProgram({ passes_per_profile: 3 });
      const packet = WEDMJobCreatorEngine.createJob(prog);
      // 3 passes + setup + qc + ship = 6
      expect(packet.operations.length).toBe(6);
      const codes = packet.operations.map((o) => o.code);
      expect(codes).toContain("OP00-SETUP");
      expect(codes).toContain("OP10-ROUGH");
      expect(codes).toContain("OP90-QC");
      expect(codes).toContain("OP99-SHIP");
    });

    it("QR payload contains job/material/thickness/machine", () => {
      const prog = makeProgram();
      const packet = WEDMJobCreatorEngine.createJob(prog, { machine_id: "MV1200R" });
      const parsed = JSON.parse(packet.qrPayload);
      expect(parsed.job).toBe(packet.jobId);
      expect(parsed.material).toBe("D2");
      expect(parsed.thick).toBe(32);
      expect(parsed.machine).toBe("MV1200R");
      expect(parsed.t).toBe("wedm");
    });

    it("quote reference is attached when quote provided", () => {
      const prog = makeProgram();
      const quote: Quote = {
        quote_number: "Q-9001",
        customer: "JM Die",
        part_name: "Die Insert",
        quantity: 2,
        unit_price: 666.14,
        total_price: 1332.28,
        lead_time_days: 7,
        markup_pct: 25,
        margin_pct: 20,
        line_items: [],
        terms: [],
        valid_days: 30,
        notes: [],
      };
      const packet = WEDMJobCreatorEngine.createJob(prog, { quantity: 2 }, quote);
      expect(packet.quoteRef?.quote_number).toBe("Q-9001");
      expect(packet.quoteRef?.estimated_cost_usd).toBe(1332.28);
    });

    it("quantity defaults to 1 and clamps negatives", () => {
      const prog = makeProgram();
      const p1 = WEDMJobCreatorEngine.createJob(prog);
      expect(p1.quantity).toBe(1);
      const p2 = WEDMJobCreatorEngine.createJob(prog, { quantity: -5 });
      expect(p2.quantity).toBe(1);
    });

    it("sticker label encodes key details", () => {
      const prog = makeProgram();
      const packet = WEDMJobCreatorEngine.createJob(prog, { machine_id: "MV1200R" });
      expect(packet.stickerLabel).toContain("D2");
      expect(packet.stickerLabel).toContain("32mm");
      expect(packet.stickerLabel).toContain("MV1200R");
    });

    it("packet notes summarize program metadata + flag warnings", () => {
      const prog = makeProgram({ warnings: ["Flushing impaired", "Thick section"] });
      const packet = WEDMJobCreatorEngine.createJob(prog);
      const joined = packet.packetNotes.join(" ");
      expect(joined).toContain("mitsubishi-mv");
      expect(joined).toContain("48.0"); // estimated time
      expect(joined).toContain("warnings");
    });

    it("operations carry pass metadata (offset, E-code, Ra)", () => {
      const prog = makeProgram();
      const packet = WEDMJobCreatorEngine.createJob(prog);
      const roughOp = packet.operations.find((o) => o.code === "OP10-ROUGH");
      expect(roughOp?.note).toContain("E240");
      expect(roughOp?.note).toContain("0.150");
      expect(roughOp?.note).toContain("3.20");
    });

    it("throws on missing program", () => {
      expect(() => WEDMJobCreatorEngine.createJob(null as any)).toThrow();
    });

    it("handles failed programs without crashing (for triage)", () => {
      const prog = makeProgram({ success: false, warnings: ["Geometry invalid"] });
      const packet = WEDMJobCreatorEngine.createJob(prog);
      expect(packet.jobType).toBe("wedm");
      expect(packet.packetNotes.join(" ")).toContain("warnings");
    });
  });

  describe("static helpers", () => {
    it("departments() lists all WEDM department ids", () => {
      const depts = WEDMJobCreatorEngine.departments();
      expect(depts).toContain("intake");
      expect(depts).toContain("rough");
      expect(depts).toContain("ship");
      expect(depts.length).toBe(10);
    });

    it("totalEstimatedMinutes sums all operations", () => {
      const prog = makeProgram();
      const packet = WEDMJobCreatorEngine.createJob(prog);
      const total = WEDMJobCreatorEngine.totalEstimatedMinutes(packet);
      expect(total).toBeGreaterThan(0);
      const sum = packet.operations.reduce((s, o) => s + o.estimatedMinutes, 0);
      expect(total).toBe(sum);
    });
  });
});
