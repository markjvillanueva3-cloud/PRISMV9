import { describe, it, expect } from "vitest";
import {
  WEDMInvoiceLineEngine,
  type JobActuals,
  type CreateInvoiceOptions,
} from "../engines/WEDMInvoiceLineEngine.js";
import type { WEDMJobPacket } from "../engines/WEDMJobCreatorEngine.js";

function makePacket(overrides: Partial<WEDMJobPacket> = {}): WEDMJobPacket {
  return {
    jobId: "WEDM-TEST-123",
    jobName: "Die Insert",
    customer: "JM Die",
    partNumber: "DI-9001",
    quantity: 2,
    dueDate: "",
    material: "D2",
    priority: "standard",
    qrPayload: "{}",
    stickerLabel: "label",
    departments: [],
    operations: [],
    packetNotes: [],
    programText: "G21",
    programMeta: {
      controller: "mitsubishi-mv",
      line_count: 100,
      profiles_cut: 1,
      passes_per_profile: 3,
      estimated_time_min: 120,
      predicted_ra_um: 1.8,
      wire_consumption_m: 500,
    },
    setupSheet: {} as any,
    quoteRef: {
      quote_number: "Q-9001",
      unit_price: 500,
      estimated_cost_usd: 1000, // 2 × 500
    },
    jobType: "wedm",
    ...overrides,
  };
}

function makeActuals(overrides: Partial<JobActuals> = {}): JobActuals {
  return {
    actual_cutting_time_min: 120,
    actual_wire_m: 500,
    actual_passes: 3,
    actual_cost_usd: 1000,
    ...overrides,
  };
}

describe("WEDMInvoiceLineEngine", () => {
  describe("createInvoice", () => {
    it("produces an invoice with base quote line", () => {
      const draft = WEDMInvoiceLineEngine.createInvoice(makePacket(), makeActuals());
      expect(draft.invoice_number).toMatch(/^INV-/);
      expect(draft.job_id).toBe("WEDM-TEST-123");
      const base = draft.lines.find((l) => l.category === "base_quote");
      expect(base).toBeDefined();
      expect(base?.quantity).toBe(2);
      expect(base?.amount_usd).toBeCloseTo(1000, 2);
    });

    it("charges only base quote when actuals match estimate", () => {
      const draft = WEDMInvoiceLineEngine.createInvoice(makePacket(), makeActuals());
      expect(draft.requires_overage_approval).toBe(false);
      expect(draft.total_usd).toBeCloseTo(1000, 2);
      expect(draft.lines.length).toBe(1); // base_quote only
      expect(draft.cost_variance_pct).toBe(0);
    });

    it("auto-approves small overages (<15% variance)", () => {
      const actuals = makeActuals({
        actual_cost_usd: 1100, // 10% over
        actual_cutting_time_min: 132,
      });
      const draft = WEDMInvoiceLineEngine.createInvoice(makePacket(), actuals);
      expect(draft.requires_overage_approval).toBe(false);
      expect(draft.overage_approval?.status).toBe("auto_approved");
      expect(draft.cost_variance_pct).toBeCloseTo(10, 1);
      // Time overage line included because auto-approved
      const timeOverage = draft.lines.find((l) => l.category === "time_overage");
      expect(timeOverage).toBeDefined();
    });

    it("gates large overages (>=15% variance) for customer approval", () => {
      const actuals = makeActuals({
        actual_cost_usd: 1250, // 25% over
        actual_cutting_time_min: 150,
      });
      const draft = WEDMInvoiceLineEngine.createInvoice(makePacket(), actuals);
      expect(draft.requires_overage_approval).toBe(true);
      expect(draft.overage_approval?.status).toBe("pending");
      // Overage lines are NOT included yet
      expect(draft.lines.filter((l) => l.category.includes("overage")).length).toBe(0);
      // Total equals base quote only
      expect(draft.total_usd).toBeCloseTo(1000, 2);
    });

    it("computes time overage using machine hour rate", () => {
      const actuals = makeActuals({
        actual_cutting_time_min: 132, // +12 min overage
        actual_cost_usd: 1100,
      });
      const opts: CreateInvoiceOptions = { machine_rate_usd_per_hr: 100 };
      const draft = WEDMInvoiceLineEngine.createInvoice(makePacket(), actuals, opts);
      const timeLine = draft.lines.find((l) => l.category === "time_overage");
      // 12min / 60 * $100/hr = $20
      expect(timeLine?.amount_usd).toBeCloseTo(20, 2);
    });

    it("computes wire overage using per-meter rate", () => {
      const actuals = makeActuals({
        actual_wire_m: 550, // +50m overage
        actual_cost_usd: 1100,
      });
      const opts: CreateInvoiceOptions = { wire_cost_usd_per_m: 0.03 };
      const draft = WEDMInvoiceLineEngine.createInvoice(makePacket(), actuals, opts);
      const wireLine = draft.lines.find((l) => l.category === "wire_overage");
      // 50m * $0.03/m = $1.50
      expect(wireLine?.amount_usd).toBeCloseTo(1.5, 2);
    });

    it("creates pass overage when more passes run than planned", () => {
      const actuals = makeActuals({
        actual_passes: 4, // +1 pass
        actual_cost_usd: 1100,
      });
      const draft = WEDMInvoiceLineEngine.createInvoice(makePacket(), actuals);
      const passLine = draft.lines.find((l) => l.category === "pass_overage");
      expect(passLine).toBeDefined();
      expect(passLine?.quantity).toBe(1);
    });

    it("computes variance per metric with correct signs and units", () => {
      const actuals = makeActuals({
        actual_cutting_time_min: 150, // +25%
        actual_wire_m: 450, // -10%
        actual_passes: 3,
        actual_cost_usd: 1250,
      });
      const draft = WEDMInvoiceLineEngine.createInvoice(makePacket(), actuals);
      const timeVar = draft.variances.find((v) => v.metric === "time")!;
      const wireVar = draft.variances.find((v) => v.metric === "wire")!;
      expect(timeVar.variance_pct).toBeCloseTo(25, 1);
      expect(wireVar.variance_pct).toBeCloseTo(-10, 1);
      expect(timeVar.unit).toBe("min");
      expect(wireVar.unit).toBe("m");
    });

    it("adds tax line when tax_rate_pct provided", () => {
      const opts: CreateInvoiceOptions = { tax_rate_pct: 8.5 };
      const draft = WEDMInvoiceLineEngine.createInvoice(makePacket(), makeActuals(), opts);
      const taxLine = draft.lines.find((l) => l.category === "tax");
      expect(taxLine).toBeDefined();
      // 1000 * 0.085 = 85
      expect(taxLine?.amount_usd).toBeCloseTo(85, 2);
      expect(draft.total_usd).toBeCloseTo(1085, 2);
    });

    it("under-billing adds note but does not refund", () => {
      const actuals = makeActuals({
        actual_cost_usd: 800, // 20% under
        actual_cutting_time_min: 96,
      });
      const draft = WEDMInvoiceLineEngine.createInvoice(makePacket(), actuals);
      expect(draft.total_usd).toBeCloseTo(1000, 2); // still billed at quote
      expect(draft.cost_variance_pct).toBeCloseTo(-20, 1);
      expect(draft.notes.some((n) => n.includes("Under quote"))).toBe(true);
    });

    it("custom overage threshold overrides default", () => {
      const actuals = makeActuals({
        actual_cost_usd: 1100, // 10% over
        actual_cutting_time_min: 132,
      });
      const opts: CreateInvoiceOptions = { overage_threshold_pct: 5 };
      const draft = WEDMInvoiceLineEngine.createInvoice(makePacket(), actuals, opts);
      // 10% > 5% → pending
      expect(draft.requires_overage_approval).toBe(true);
    });

    it("sumCategory totals by line category", () => {
      const actuals = makeActuals({
        actual_cost_usd: 1100,
        actual_cutting_time_min: 132,
      });
      const draft = WEDMInvoiceLineEngine.createInvoice(makePacket(), actuals);
      const base = WEDMInvoiceLineEngine.sumCategory(draft, "base_quote");
      expect(base).toBeCloseTo(1000, 2);
      const tax = WEDMInvoiceLineEngine.sumCategory(draft, "tax");
      expect(tax).toBe(0);
    });

    it("finalizeAfterApproval unlocks previously pending overages", () => {
      const actuals = makeActuals({
        actual_cost_usd: 1250,
        actual_cutting_time_min: 150,
      });
      const draft = WEDMInvoiceLineEngine.createInvoice(makePacket(), actuals);
      expect(draft.requires_overage_approval).toBe(true);

      const approved = {
        ...draft.overage_approval!,
        status: "approved" as const,
        decided_by: "customer@example.com",
        decision_at: "2026-04-18T12:00:00Z",
      };
      const final = WEDMInvoiceLineEngine.finalizeAfterApproval(draft, approved);
      expect(final.requires_overage_approval).toBe(false);
      expect(final.notes.some((n) => n.includes("Overage approved"))).toBe(true);
    });

    it("finalizeAfterApproval throws on non-approved records", () => {
      const draft = WEDMInvoiceLineEngine.createInvoice(makePacket(), makeActuals({
        actual_cost_usd: 1250,
        actual_cutting_time_min: 150,
      }));
      const pending = { ...draft.overage_approval!, status: "pending" as const };
      expect(() => WEDMInvoiceLineEngine.finalizeAfterApproval(draft, pending)).toThrow();
    });

    it("throws on missing packet or actuals", () => {
      expect(() => WEDMInvoiceLineEngine.createInvoice(null as any, makeActuals())).toThrow();
      expect(() => WEDMInvoiceLineEngine.createInvoice(makePacket(), null as any)).toThrow();
    });

    it("handles zero-quote packets gracefully", () => {
      const packet = makePacket({ quoteRef: undefined });
      const draft = WEDMInvoiceLineEngine.createInvoice(packet, makeActuals({ actual_cost_usd: 0 }));
      expect(draft.total_usd).toBeCloseTo(0, 2);
      expect(draft.cost_variance_pct).toBe(0);
    });

    it("invoice_number and line_ids are unique per invoice", () => {
      const d1 = WEDMInvoiceLineEngine.createInvoice(makePacket(), makeActuals());
      const d2 = WEDMInvoiceLineEngine.createInvoice(makePacket(), makeActuals());
      expect(d1.invoice_number).not.toBe(d2.invoice_number);
      const ids = d1.lines.map((l) => l.line_id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it("overage metadata links back to approval request id", () => {
      const actuals = makeActuals({
        actual_cost_usd: 1100,
        actual_cutting_time_min: 132,
      });
      const draft = WEDMInvoiceLineEngine.createInvoice(makePacket(), actuals);
      const timeLine = draft.lines.find((l) => l.category === "time_overage");
      expect(timeLine?.metadata.overage_request_id).toBe(draft.overage_approval?.request_id);
    });

    it("subtotal + tax = total", () => {
      const opts: CreateInvoiceOptions = { tax_rate_pct: 10 };
      const draft = WEDMInvoiceLineEngine.createInvoice(makePacket(), makeActuals(), opts);
      // subtotal excludes tax
      const nonTaxSum = draft.lines
        .filter((l) => l.category !== "tax")
        .reduce((s, l) => s + l.amount_usd, 0);
      expect(draft.subtotal_usd).toBeCloseTo(nonTaxSum, 2);
      const taxSum = draft.lines
        .filter((l) => l.category === "tax")
        .reduce((s, l) => s + l.amount_usd, 0);
      expect(draft.total_usd).toBeCloseTo(nonTaxSum + taxSum, 2);
    });
  });
});
