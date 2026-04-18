/**
 * LatheAutoQuoteFromPrintEngine Tests
 *
 * U-LTH48: Auto-quote from print-to-program output
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  latheAutoQuoteFromPrintEngine,
  type PrintToProgramOutput,
  type QuoteResult,
} from "../engines/LatheAutoQuoteFromPrintEngine.js";

describe("LatheAutoQuoteFromPrintEngine", () => {
  const sampleP2POutput: PrintToProgramOutput = {
    program_number: 1001,
    program_name: "SHAFT ASSY",
    part_number: "JMD-SH-001",
    customer: "ALCOA",
    gcode_lines: ["G21", "G28 U0 W0", "T0101", "G96 S200 M3", "G00 X30 Z2"],
    tool_calls: [
      { tool_number: 1, tool_type: "CNMG", description: "80° Turning", operation: "rough_turn" },
      { tool_number: 2, tool_type: "DNMG", description: "55° Finishing", operation: "finish_turn" },
      { tool_number: 3, tool_type: "T-Thread", description: "Threading", operation: "external_thread" },
    ],
    cycle_time_sec: 180,
    features: [
      { id: "f1", type: "od_turn", parameters: { diameter: 25, length: 50 } },
      { id: "f2", type: "thread", parameters: { major_dia: 20, pitch: 2.5 } },
    ],
    material: "4140",
    stock_diameter: 30,
    stock_length: 60,
  };

  describe("generateQuote()", () => {
    it("generates valid quote from P2P output", () => {
      const quote = latheAutoQuoteFromPrintEngine.generateQuote(sampleP2POutput, 1);

      expect(quote.quote_id).toMatch(/^Q-JMD-SH-/);
      expect(quote.part_number).toBe("JMD-SH-001");
      expect(quote.customer).toBe("ALCOA");
      expect(quote.program_number).toBe(1001);
      expect(quote.quantity).toBe(1);
    });

    it("includes complete cost breakdown", () => {
      const quote = latheAutoQuoteFromPrintEngine.generateQuote(sampleP2POutput, 1);

      expect(quote.cost_breakdown.material_cost).toBeGreaterThan(0);
      expect(quote.cost_breakdown.tool_wear_cost).toBeGreaterThan(0);
      expect(quote.cost_breakdown.cycle_time_cost).toBeGreaterThan(0);
      expect(quote.cost_breakdown.setup_cost).toBeGreaterThan(0);
      expect(quote.cost_breakdown.subtotal).toBeGreaterThan(0);
      expect(quote.cost_breakdown.overhead).toBeGreaterThan(0);
      expect(quote.cost_breakdown.margin).toBeGreaterThan(0);
      expect(quote.cost_breakdown.total_per_part).toBeGreaterThan(0);
    });

    it("calculates correct subtotal from components", () => {
      const quote = latheAutoQuoteFromPrintEngine.generateQuote(sampleP2POutput, 1);
      const { material_cost, tool_wear_cost, cycle_time_cost, setup_cost, subtotal } =
        quote.cost_breakdown;

      const expectedSubtotal = material_cost + tool_wear_cost + cycle_time_cost + setup_cost;
      expect(Math.abs(subtotal - expectedSubtotal)).toBeLessThan(0.01);
    });

    it("applies overhead percentage correctly", () => {
      const quote = latheAutoQuoteFromPrintEngine.generateQuote(sampleP2POutput, 1);
      const { subtotal, overhead } = quote.cost_breakdown;

      const expectedOverhead = subtotal * 0.15;
      expect(Math.abs(overhead - expectedOverhead)).toBeLessThan(0.01);
    });

    it("applies margin percentage correctly", () => {
      const quote = latheAutoQuoteFromPrintEngine.generateQuote(sampleP2POutput, 1);
      const { subtotal, overhead, margin } = quote.cost_breakdown;

      const expectedMargin = (subtotal + overhead) * 0.25;
      expect(Math.abs(margin - expectedMargin)).toBeLessThan(0.01);
    });

    it("reduces per-part setup cost with higher quantity", () => {
      const quote1 = latheAutoQuoteFromPrintEngine.generateQuote(sampleP2POutput, 1);
      const quote10 = latheAutoQuoteFromPrintEngine.generateQuote(sampleP2POutput, 10);
      const quote100 = latheAutoQuoteFromPrintEngine.generateQuote(sampleP2POutput, 100);

      expect(quote10.unit_price).toBeLessThan(quote1.unit_price);
      expect(quote100.unit_price).toBeLessThan(quote10.unit_price);
    });

    it("calculates total price from unit price and quantity", () => {
      const quantity = 25;
      const quote = latheAutoQuoteFromPrintEngine.generateQuote(sampleP2POutput, quantity);

      expect(Math.abs(quote.total_price - quote.unit_price * quantity)).toBeLessThan(1);
    });

    it("includes lead time in days", () => {
      const quote = latheAutoQuoteFromPrintEngine.generateQuote(sampleP2POutput, 1);

      expect(quote.lead_time_days).toBeGreaterThan(0);
      expect(Number.isInteger(quote.lead_time_days)).toBe(true);
    });

    it("increases lead time for larger quantities", () => {
      const quote1 = latheAutoQuoteFromPrintEngine.generateQuote(sampleP2POutput, 1);
      const quote1000 = latheAutoQuoteFromPrintEngine.generateQuote(sampleP2POutput, 1000);

      expect(quote1000.lead_time_days).toBeGreaterThan(quote1.lead_time_days);
    });

    it("reduces lead time for rush orders", () => {
      const normalQuote = latheAutoQuoteFromPrintEngine.generateQuote(sampleP2POutput, 10, false);
      const rushQuote = latheAutoQuoteFromPrintEngine.generateQuote(sampleP2POutput, 10, true);

      expect(rushQuote.lead_time_days).toBeLessThan(normalQuote.lead_time_days);
      expect(rushQuote.warnings).toContain("Rush order: lead time reduced but premium pricing may apply");
    });

    it("includes confidence score", () => {
      const quote = latheAutoQuoteFromPrintEngine.generateQuote(sampleP2POutput, 1);

      expect(quote.confidence).toBeGreaterThanOrEqual(0.5);
      expect(quote.confidence).toBeLessThanOrEqual(1.0);
    });

    it("has higher confidence with complete data", () => {
      const completeQuote = latheAutoQuoteFromPrintEngine.generateQuote(sampleP2POutput, 1);

      const incompleteOutput: PrintToProgramOutput = {
        ...sampleP2POutput,
        material: undefined,
        stock_diameter: undefined,
        tool_calls: [],
      };
      const incompleteQuote = latheAutoQuoteFromPrintEngine.generateQuote(incompleteOutput, 1);

      expect(completeQuote.confidence).toBeGreaterThan(incompleteQuote.confidence);
    });

    it("includes assumptions for missing data", () => {
      const incompleteOutput: PrintToProgramOutput = {
        ...sampleP2POutput,
        material: undefined,
      };
      const quote = latheAutoQuoteFromPrintEngine.generateQuote(incompleteOutput, 1);

      expect(quote.assumptions.length).toBeGreaterThan(0);
      expect(quote.assumptions.some(a => a.includes("Material not specified"))).toBe(true);
    });

    it("warns when confidence is low", () => {
      const incompleteOutput: PrintToProgramOutput = {
        ...sampleP2POutput,
        material: undefined,
        stock_diameter: undefined,
        stock_length: undefined,
        tool_calls: [],
        cycle_time_sec: 0,
      };
      const quote = latheAutoQuoteFromPrintEngine.generateQuote(incompleteOutput, 1);

      expect(quote.warnings).toContain("Quote confidence below 80% - manual review recommended");
    });

    it("includes valid_until date 30 days out", () => {
      const quote = latheAutoQuoteFromPrintEngine.generateQuote(sampleP2POutput, 1);
      const validUntil = new Date(quote.valid_until);
      const now = new Date();

      const daysDiff = (validUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      expect(daysDiff).toBeGreaterThan(29);
      expect(daysDiff).toBeLessThan(31);
    });

    it("generates quote within 90 seconds (requirement)", () => {
      const quote = latheAutoQuoteFromPrintEngine.generateQuote(sampleP2POutput, 1);

      expect(quote.generated_in_ms).toBeLessThan(90000);
      expect(quote.generated_in_ms).toBeLessThan(100);
    });

    it("handles unknown material gracefully", () => {
      const unknownMaterialOutput: PrintToProgramOutput = {
        ...sampleP2POutput,
        material: "UNOBTANIUM-XYZ",
      };
      const quote = latheAutoQuoteFromPrintEngine.generateQuote(unknownMaterialOutput, 1);

      expect(quote.assumptions.some(a => a.includes("Unknown material"))).toBe(true);
      expect(quote.cost_breakdown.material_cost).toBeGreaterThan(0);
    });

    it("handles missing part number", () => {
      const noPartNumber: PrintToProgramOutput = {
        ...sampleP2POutput,
        part_number: undefined,
      };
      const quote = latheAutoQuoteFromPrintEngine.generateQuote(noPartNumber, 1);

      expect(quote.part_number).toBe("UNKNOWN");
    });

    it("handles missing customer", () => {
      const noCustomer: PrintToProgramOutput = {
        ...sampleP2POutput,
        customer: undefined,
      };
      const quote = latheAutoQuoteFromPrintEngine.generateQuote(noCustomer, 1);

      expect(quote.customer).toBe("WALK-IN");
    });
  });

  describe("generateBatchQuotes()", () => {
    it("generates quotes for multiple quantities", () => {
      const quantities = [1, 10, 25, 50, 100];
      const quotes = latheAutoQuoteFromPrintEngine.generateBatchQuotes(sampleP2POutput, quantities);

      expect(quotes.length).toBe(5);
      expect(quotes[0].quantity).toBe(1);
      expect(quotes[1].quantity).toBe(10);
      expect(quotes[2].quantity).toBe(25);
      expect(quotes[3].quantity).toBe(50);
      expect(quotes[4].quantity).toBe(100);
    });

    it("shows decreasing unit price with volume", () => {
      const quantities = [1, 10, 100];
      const quotes = latheAutoQuoteFromPrintEngine.generateBatchQuotes(sampleP2POutput, quantities);

      expect(quotes[1].unit_price).toBeLessThan(quotes[0].unit_price);
      expect(quotes[2].unit_price).toBeLessThan(quotes[1].unit_price);
    });
  });

  describe("calculateQuoteVariance()", () => {
    it("calculates variance against manual quote", () => {
      const quote = latheAutoQuoteFromPrintEngine.generateQuote(sampleP2POutput, 10);
      const manualQuote = { unit_price: quote.unit_price * 1.05, total_price: quote.total_price * 1.05 };

      const variance = latheAutoQuoteFromPrintEngine.calculateQuoteVariance(quote, manualQuote);

      expect(variance.unit_price_variance_pct).toBeCloseTo(-4.8, 0);
      expect(variance.total_price_variance_pct).toBeCloseTo(-4.8, 0);
      expect(variance.within_tolerance).toBe(true);
    });

    it("flags when variance exceeds 10%", () => {
      const quote = latheAutoQuoteFromPrintEngine.generateQuote(sampleP2POutput, 10);
      const manualQuote = { unit_price: quote.unit_price * 1.15, total_price: quote.total_price * 1.15 };

      const variance = latheAutoQuoteFromPrintEngine.calculateQuoteVariance(quote, manualQuote);

      expect(variance.within_tolerance).toBe(false);
    });

    it("handles auto-quote being higher than manual", () => {
      const quote = latheAutoQuoteFromPrintEngine.generateQuote(sampleP2POutput, 10);
      const manualQuote = { unit_price: quote.unit_price * 0.9, total_price: quote.total_price * 0.9 };

      const variance = latheAutoQuoteFromPrintEngine.calculateQuoteVariance(quote, manualQuote);

      expect(variance.unit_price_variance_pct).toBeGreaterThan(0);
    });
  });

  describe("material rate handling", () => {
    it("uses correct rate for 4140 steel", () => {
      const output4140: PrintToProgramOutput = { ...sampleP2POutput, material: "4140" };
      const quote = latheAutoQuoteFromPrintEngine.generateQuote(output4140, 1);

      expect(quote.cost_breakdown.material_cost).toBeGreaterThan(0);
    });

    it("uses correct rate for titanium (high cost)", () => {
      const outputTi: PrintToProgramOutput = { ...sampleP2POutput, material: "Ti-6Al-4V" };
      const output4140: PrintToProgramOutput = { ...sampleP2POutput, material: "4140" };

      const quoteTi = latheAutoQuoteFromPrintEngine.generateQuote(outputTi, 1);
      const quote4140 = latheAutoQuoteFromPrintEngine.generateQuote(output4140, 1);

      expect(quoteTi.cost_breakdown.material_cost).toBeGreaterThan(
        quote4140.cost_breakdown.material_cost * 5
      );
    });

    it("uses correct rate for Inconel (highest cost)", () => {
      const outputInconel: PrintToProgramOutput = { ...sampleP2POutput, material: "Inconel 718" };
      const quoteTi: PrintToProgramOutput = { ...sampleP2POutput, material: "Ti-6Al-4V" };

      const quoteInconel = latheAutoQuoteFromPrintEngine.generateQuote(outputInconel, 1);
      const quoteT = latheAutoQuoteFromPrintEngine.generateQuote(quoteTi, 1);

      expect(quoteInconel.cost_breakdown.material_cost).toBeGreaterThan(
        quoteT.cost_breakdown.material_cost
      );
    });
  });

  describe("tool wear cost calculation", () => {
    it("increases with more tool operations", () => {
      const fewTools: PrintToProgramOutput = {
        ...sampleP2POutput,
        tool_calls: [
          { tool_number: 1, tool_type: "CNMG", description: "Turning", operation: "rough_turn" },
        ],
      };
      const manyTools: PrintToProgramOutput = {
        ...sampleP2POutput,
        tool_calls: [
          { tool_number: 1, tool_type: "CNMG", description: "Turning", operation: "rough_turn" },
          { tool_number: 2, tool_type: "DNMG", description: "Finishing", operation: "finish_turn" },
          { tool_number: 3, tool_type: "Thread", description: "Threading", operation: "threading" },
          { tool_number: 4, tool_type: "Groove", description: "Grooving", operation: "grooving" },
          { tool_number: 5, tool_type: "Drill", description: "Drilling", operation: "drilling" },
        ],
      };

      const quoteFew = latheAutoQuoteFromPrintEngine.generateQuote(fewTools, 1);
      const quoteMany = latheAutoQuoteFromPrintEngine.generateQuote(manyTools, 1);

      expect(quoteMany.cost_breakdown.tool_wear_cost).toBeGreaterThan(
        quoteFew.cost_breakdown.tool_wear_cost
      );
    });

    it("applies higher wear rate for threading", () => {
      const turningOnly: PrintToProgramOutput = {
        ...sampleP2POutput,
        tool_calls: [
          { tool_number: 1, tool_type: "CNMG", description: "Turning", operation: "rough_turn" },
        ],
      };
      const threadingOnly: PrintToProgramOutput = {
        ...sampleP2POutput,
        tool_calls: [
          { tool_number: 1, tool_type: "Thread", description: "Threading", operation: "threading" },
        ],
      };

      const quoteTurning = latheAutoQuoteFromPrintEngine.generateQuote(turningOnly, 1);
      const quoteThreading = latheAutoQuoteFromPrintEngine.generateQuote(threadingOnly, 1);

      expect(quoteThreading.cost_breakdown.tool_wear_cost).toBeGreaterThan(
        quoteTurning.cost_breakdown.tool_wear_cost
      );
    });
  });

  describe("config management", () => {
    it("allows updating configuration", () => {
      const originalConfig = latheAutoQuoteFromPrintEngine.getConfig();
      const originalRate = originalConfig.machine_hourly_rate;

      latheAutoQuoteFromPrintEngine.updateConfig({ machine_hourly_rate: 100 });
      const updatedConfig = latheAutoQuoteFromPrintEngine.getConfig();

      expect(updatedConfig.machine_hourly_rate).toBe(100);

      latheAutoQuoteFromPrintEngine.updateConfig({ machine_hourly_rate: originalRate });
    });

    it("returns copy of config (immutable)", () => {
      const config1 = latheAutoQuoteFromPrintEngine.getConfig();
      const config2 = latheAutoQuoteFromPrintEngine.getConfig();

      config1.machine_hourly_rate = 999;
      expect(config2.machine_hourly_rate).not.toBe(999);
    });
  });

  describe("quote ID generation", () => {
    it("generates unique IDs", () => {
      const quote1 = latheAutoQuoteFromPrintEngine.generateQuote(sampleP2POutput, 1);
      const quote2 = latheAutoQuoteFromPrintEngine.generateQuote(sampleP2POutput, 1);

      expect(quote1.quote_id).not.toBe(quote2.quote_id);
    });

    it("includes part reference in ID", () => {
      const quote = latheAutoQuoteFromPrintEngine.generateQuote(sampleP2POutput, 1);

      expect(quote.quote_id).toContain("JMD-SH");
    });
  });
});
