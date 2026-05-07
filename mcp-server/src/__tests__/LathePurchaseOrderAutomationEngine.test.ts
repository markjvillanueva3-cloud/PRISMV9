/**
 * LathePurchaseOrderAutomationEngine tests — U-LTH52
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { LathePurchaseOrderAutomationEngine } from "../engines/LathePurchaseOrderAutomationEngine.js";
import type { QuotePackage } from "../engines/LatheAutoQuoteFromPrintEngine.js";

function makeQuote(overrides: { iso?: "P" | "M" | "K" | "N" | "S" | "H"; mass?: number; qty?: number; cycle?: number } = {}): QuotePackage {
  return {
    quote_id: "Q-PO",
    generated_at: new Date().toISOString(),
    generation_ms: 10,
    customer: "ALCOA",
    part_number: "AL-DIE-PIN",
    quantity: overrides.qty ?? 10,
    cost: {} as any,
    tool_wear_lines: [],
    evidence: {
      material_name: "1018",
      iso_group: overrides.iso ?? "P",
      stock_od_mm: 40,
      stock_id_mm: 0,
      stock_length_mm: 80,
      stock_volume_cm3: 100,
      stock_mass_kg: overrides.mass ?? 0.79,
      total_cycle_min: overrides.cycle ?? 7,
      total_rapid_min: 0.03,
      setup_count: 1,
      operation_count: 3,
      material_price_usd_per_kg: 2.5,
      machine_rate_usd_hr: 85,
      setup_rate_usd_hr: 95,
      overhead_rate: 0.15,
      margin_rate: 0.35,
      scrap_factor: 0.2,
    },
    variance_band: {} as any,
    meets_sla: true,
    sla_limit_sec: 90,
  };
}

describe("LathePurchaseOrderAutomationEngine — base build", () => {
  it("generates material + insert lines when no inventory on hand", () => {
    const engine = new LathePurchaseOrderAutomationEngine();
    const result = engine.build({ job_id: "J1", quote: makeQuote() });
    expect(result.pos.length).toBeGreaterThanOrEqual(1);
    const allLines = result.pos.flatMap((po) => po.lines.map((l) => l.category));
    expect(allLines).toContain("material");
    expect(allLines).toContain("insert_carbide");
  });

  it("inventory covers material → no material line emitted", () => {
    const engine = new LathePurchaseOrderAutomationEngine();
    // quote requires 0.79kg × 10 × (1+0.20) = 9.48 kg
    const result = engine.build({
      job_id: "J1",
      quote: makeQuote(),
      on_hand: { material_kg: 100, inserts_by_iso: {}, coolant_gallons: 0 },
    });
    const materialLines = result.pos.flatMap((p) => p.lines).filter((l) => l.category === "material");
    expect(materialLines).toHaveLength(0);
    expect(result.inventory_shortage.material_kg).toBe(0);
  });

  it("inventory covers inserts → no insert line", () => {
    const engine = new LathePurchaseOrderAutomationEngine();
    const result = engine.build({
      job_id: "J1",
      quote: makeQuote(),
      on_hand: { material_kg: 0, inserts_by_iso: { P: 100 }, coolant_gallons: 0 },
    });
    const insertLines = result.pos.flatMap((p) => p.lines).filter((l) => l.category === "insert_carbide");
    expect(insertLines).toHaveLength(0);
  });

  it("ISO group S routes to ceramic insert category", () => {
    const engine = new LathePurchaseOrderAutomationEngine();
    const result = engine.build({ job_id: "J-INCO", quote: makeQuote({ iso: "S" }) });
    const ceramicLines = result.pos.flatMap((p) => p.lines).filter((l) => l.category === "insert_ceramic");
    expect(ceramicLines.length).toBeGreaterThan(0);
  });

  it("splits PO per vendor (material Ryerson, inserts Kennametal)", () => {
    const engine = new LathePurchaseOrderAutomationEngine();
    const result = engine.build({ job_id: "J-SPLIT", quote: makeQuote() });
    const vendors = result.pos.map((p) => p.vendor).sort();
    expect(vendors).toContain("Ryerson");
    expect(vendors).toContain("Kennametal");
  });

  it("aggregate totals and lead times computed correctly", () => {
    const engine = new LathePurchaseOrderAutomationEngine();
    const result = engine.build({ job_id: "J-AGG", quote: makeQuote() });
    const sum = result.pos.reduce((s, p) => s + p.total_usd, 0);
    expect(result.aggregate_total_usd).toBeCloseTo(sum, 2);
    const maxLead = result.pos.reduce((m, p) => Math.max(m, p.lead_time_days), 0);
    expect(result.aggregate_lead_time_days).toBe(maxLead);
  });
});

describe("LathePurchaseOrderAutomationEngine — ISO variability", () => {
  it("P / N / S materials all succeed with distinct unit costs", () => {
    const engine = new LathePurchaseOrderAutomationEngine();
    const p = engine.build({ job_id: "JP", quote: makeQuote({ iso: "P" }) });
    const n = engine.build({ job_id: "JN", quote: makeQuote({ iso: "N" }) });
    const s = engine.build({ job_id: "JS", quote: makeQuote({ iso: "S" }) });

    const pMat = p.pos.flatMap((x) => x.lines).find((l) => l.category === "material")!;
    const nMat = n.pos.flatMap((x) => x.lines).find((l) => l.category === "material")!;
    const sMat = s.pos.flatMap((x) => x.lines).find((l) => l.category === "material")!;
    expect(pMat.unit_cost_usd).toBe(2.5);
    expect(nMat.unit_cost_usd).toBe(3.5);
    expect(sMat.unit_cost_usd).toBe(45.0);
  });
});

describe("LathePurchaseOrderAutomationEngine — failure modes", () => {
  it("rejects missing quote", () => {
    const engine = new LathePurchaseOrderAutomationEngine();
    expect(() => engine.build({ job_id: "X", quote: null } as any)).toThrow(/quote missing/);
  });

  it("rejects quote without evidence", () => {
    const engine = new LathePurchaseOrderAutomationEngine();
    expect(() => engine.build({ job_id: "X", quote: { evidence: undefined } as any })).toThrow(/evidence missing/);
  });

  it("rejects invalid iso_group", () => {
    const engine = new LathePurchaseOrderAutomationEngine();
    const bad = makeQuote();
    (bad.evidence as any).iso_group = "Z";
    expect(() => engine.build({ job_id: "X", quote: bad })).toThrow(/invalid iso_group/);
  });

  it("rejects non-finite stock_mass_kg", () => {
    const engine = new LathePurchaseOrderAutomationEngine();
    const bad = makeQuote();
    (bad.evidence as any).stock_mass_kg = Number.POSITIVE_INFINITY;
    expect(() => engine.build({ job_id: "X", quote: bad })).toThrow(/stock_mass_kg/);
  });

  it("rejects zero stock_mass_kg", () => {
    const engine = new LathePurchaseOrderAutomationEngine();
    expect(() => engine.build({ job_id: "X", quote: makeQuote({ mass: 0 }) })).toThrow(/stock_mass_kg/);
  });

  it("rejects NaN stock_mass_kg", () => {
    const engine = new LathePurchaseOrderAutomationEngine();
    const bad = makeQuote();
    (bad.evidence as any).stock_mass_kg = Number.NaN;
    expect(() => engine.build({ job_id: "X", quote: bad })).toThrow(/stock_mass_kg/);
  });
});

describe("LathePurchaseOrderAutomationEngine — EOQ suggestion", () => {
  it("suggest_eoq is positive integer when demand and cost are positive", () => {
    const engine = new LathePurchaseOrderAutomationEngine();
    const result = engine.build({ job_id: "J", quote: makeQuote() });
    const matLine = result.pos.flatMap((p) => p.lines).find((l) => l.category === "material")!;
    expect(matLine.suggest_eoq).toBeGreaterThan(0);
    expect(Number.isInteger(matLine.suggest_eoq)).toBe(true);
  });
});

describe("LathePurchaseOrderAutomationEngine — dispatcher wiring", () => {
  it("lathe_po_build action wired with handler + lazy import", () => {
    const src = readFileSync(
      "H:/prism/mcp-server/src/tools/dispatchers/businessDispatcher.ts",
      "utf-8",
    );
    expect(src).toContain('"lathe_po_build"');
    expect(src).toMatch(/case "lathe_po_build"/);
    expect(src).toContain('"../../engines/LathePurchaseOrderAutomationEngine.js"');
    expect(src).toContain('case "lathePOAutomation"');
  });
});
