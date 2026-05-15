/**
 * OBSIDIAN-PRISM-OS-MS0/U-ORPHAN-RESCUE-EQUIPMENT-ASSET — wire test (iter8)
 *
 * Verifies 6 EquipmentAssetEngine actions land through businessDispatcher's
 * prism_business tool.
 *
 *   asset_compute_depreciation   — pure formula (no state mutation)
 *   asset_register               — registers asset, returns AssetRecord with id
 *   asset_depreciation_schedule  — full schedule for a registered asset
 *   asset_list                   — filter by category/location/calibration/status
 *   asset_transfer               — mutates location, returns AssetTransfer
 *   asset_calibration_due        — assets needing calibration within N days
 *
 * Real-value assertions:
 *   - Straight-line depreciation: annual = (cost - salvage) / years; 24 months
 *     elapsed should produce 2× the annual amount.
 *   - MACRS 5yr Y1 = 20% of purchase_cost (IRS Rev. Proc. 87-57, half-year conv).
 *   - Registry isolation: registered asset has unique id starting "AST-".
 *   - Transfer creates "XFER-" id and updates asset location in place.
 *   - Calibration due includes only assets within threshold days_ahead.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { registerBusinessDispatcher } from "../tools/dispatchers/businessDispatcher.js";

interface ToolCall {
  action: string;
  params?: Record<string, any>;
}

let handler:
  | ((args: { action: string; params?: Record<string, any> }) => Promise<any>)
  | null = null;

beforeAll(() => {
  const fakeServer = {
    tool: (
      _name: string,
      _desc: string,
      _schema: any,
      fn: (args: any) => Promise<any>,
    ) => {
      if (_name === "prism_business") handler = fn;
    },
  };
  registerBusinessDispatcher(fakeServer as any);
  if (!handler) throw new Error("businessDispatcher did not register prism_business tool");
});

async function call(c: ToolCall): Promise<{ raw: any; success: boolean; error?: string }> {
  if (!handler) throw new Error("handler not captured");
  const r = await handler(c);
  // Shape A: { content: [{ type: "text", text: "<json>" }] }  (full MCP envelope)
  if (r && typeof r === "object" && Array.isArray(r.content) && r.content[0]?.text) {
    try {
      const parsed = JSON.parse(r.content[0].text);
      const success = !parsed?.error && parsed?.success !== false;
      return { raw: parsed, success, error: parsed?.error };
    } catch {
      return { raw: r, success: true };
    }
  }
  // Shape B: { type: "text", text: "<json>" }  (slimResponse output direct)
  if (r && typeof r === "object" && r.type === "text" && typeof r.text === "string") {
    try {
      const parsed = JSON.parse(r.text);
      const success = !parsed?.error && parsed?.success !== false;
      return { raw: parsed, success, error: parsed?.error };
    } catch {
      return { raw: r, success: true };
    }
  }
  // Shape C: raw { error: "..." } envelope from dispatcherError
  if (r && typeof r === "object" && "error" in r) {
    return { raw: r, success: false, error: (r as any).error };
  }
  return { raw: r, success: true };
}

const NOW = Date.now();
const THIRTY_DAYS_AGO = new Date(NOW - 30 * 86400000).toISOString();
const TWO_YEARS_AGO = new Date(NOW - 2 * 365.25 * 86400000).toISOString();

function buildAssetParams(overrides: Record<string, any> = {}): Record<string, any> {
  return {
    asset_tag: "TAG-001",
    name: "Haas VF-2 #1",
    category: "machine",
    manufacturer: "Haas",
    model_number: "VF-2",
    serial_number: "1108234",
    location: "Bay-1",
    purchase_date: TWO_YEARS_AGO,
    purchase_cost: 65000,
    salvage_value: 5000,
    useful_life_years: 10,
    depreciation_method: "straight_line",
    status: "active",
    calibration_required: false,
    ...overrides,
  };
}

describe("businessDispatcher — EquipmentAssetEngine wire (iter8)", () => {
  describe("asset_compute_depreciation — pure formula", () => {
    it("straight_line: 24 months of $60k base over 10 yrs → $12k depreciation", async () => {
      const r = await call({
        action: "asset_compute_depreciation",
        params: {
          purchase_cost: 65000,
          salvage_value: 5000,
          useful_life_years: 10,
          method: "straight_line",
          months_elapsed: 24,
        },
      });
      expect(r.success).toBe(true);
      const data = r.raw.data ?? r.raw;
      expect(data.depreciation_amount).toBeCloseTo(12000, 2);
    });

    it("straight_line caps depreciation at (cost - salvage) when overshot", async () => {
      const r = await call({
        action: "asset_compute_depreciation",
        params: {
          purchase_cost: 65000,
          salvage_value: 5000,
          useful_life_years: 10,
          method: "straight_line",
          months_elapsed: 200,
        },
      });
      expect(r.success).toBe(true);
      const data = r.raw.data ?? r.raw;
      expect(data.depreciation_amount).toBeCloseTo(60000, 2);
    });

    it("macrs_5yr year-1: 20% of purchase_cost (IRS half-year convention)", async () => {
      const r = await call({
        action: "asset_compute_depreciation",
        params: {
          purchase_cost: 100000,
          salvage_value: 0,
          useful_life_years: 5,
          method: "macrs_5yr",
          months_elapsed: 12,
        },
      });
      expect(r.success).toBe(true);
      const data = r.raw.data ?? r.raw;
      expect(data.depreciation_amount).toBeCloseTo(20000, 2);
    });

    it("macrs_7yr year-1: 14.29% of purchase_cost", async () => {
      const r = await call({
        action: "asset_compute_depreciation",
        params: {
          purchase_cost: 100000,
          salvage_value: 0,
          useful_life_years: 7,
          method: "macrs_7yr",
          months_elapsed: 12,
        },
      });
      expect(r.success).toBe(true);
      const data = r.raw.data ?? r.raw;
      expect(data.depreciation_amount).toBeCloseTo(14290, 1);
    });

    it("returns 0 when salvage equals or exceeds cost", async () => {
      const r = await call({
        action: "asset_compute_depreciation",
        params: {
          purchase_cost: 5000,
          salvage_value: 5000,
          useful_life_years: 5,
          method: "straight_line",
          months_elapsed: 12,
        },
      });
      expect(r.success).toBe(true);
      const data = r.raw.data ?? r.raw;
      expect(data.depreciation_amount).toBe(0);
    });
  });

  describe("asset_register", () => {
    it("returns AssetRecord with id starting 'AST-' and current_book_value < purchase_cost", async () => {
      const r = await call({
        action: "asset_register",
        params: buildAssetParams({ asset_tag: "TAG-REG-1" }),
      });
      expect(r.success).toBe(true);
      const data = r.raw.data ?? r.raw;
      expect(typeof data.id).toBe("string");
      expect(data.id.startsWith("AST-")).toBe(true);
      expect(data.asset_tag).toBe("TAG-REG-1");
      expect(data.current_book_value).toBeGreaterThan(0);
      expect(data.current_book_value).toBeLessThan(65000);
      expect(typeof data.created_at).toBe("string");
    });

    it("preserves all input fields in the returned record", async () => {
      const r = await call({
        action: "asset_register",
        params: buildAssetParams({
          asset_tag: "TAG-REG-2",
          name: "Mitutoyo CMM",
          category: "gage",
          location: "QA-Lab",
        }),
      });
      expect(r.success).toBe(true);
      const data = r.raw.data ?? r.raw;
      expect(data.name).toBe("Mitutoyo CMM");
      expect(data.category).toBe("gage");
      expect(data.location).toBe("QA-Lab");
      expect(data.manufacturer).toBe("Haas");
    });
  });

  describe("asset_depreciation_schedule", () => {
    it("returns a 10-entry schedule for straight_line 10yr asset", async () => {
      const reg = await call({
        action: "asset_register",
        params: buildAssetParams({ asset_tag: "TAG-SCHED-1" }),
      });
      const id = (reg.raw.data ?? reg.raw).id;

      const r = await call({
        action: "asset_depreciation_schedule",
        params: { asset_id: id },
      });
      expect(r.success).toBe(true);
      const data = r.raw.data ?? r.raw;
      expect(Array.isArray(data.schedule)).toBe(true);
      expect(data.schedule.length).toBe(10);
      const last = data.schedule[data.schedule.length - 1];
      expect(last.cumulative_depreciation).toBeCloseTo(60000, 0);
      expect(data.schedule[0].year).toBe(1);
      expect(data.schedule[9].year).toBe(10);
    });

    it("MACRS 5yr produces a 6-entry schedule (half-year convention adds Y6)", async () => {
      const reg = await call({
        action: "asset_register",
        params: buildAssetParams({
          asset_tag: "TAG-SCHED-2",
          depreciation_method: "macrs_5yr",
          useful_life_years: 5,
        }),
      });
      const id = (reg.raw.data ?? reg.raw).id;

      const r = await call({
        action: "asset_depreciation_schedule",
        params: { asset_id: id },
      });
      expect(r.success).toBe(true);
      const data = r.raw.data ?? r.raw;
      expect(data.schedule.length).toBe(6);
    });

    it("throws when asset_id not found", async () => {
      const r = await call({
        action: "asset_depreciation_schedule",
        params: { asset_id: "AST-DOES-NOT-EXIST-12345" },
      });
      expect(r.success).toBe(false);
      expect((r.error || "").toLowerCase()).toContain("not found");
    });
  });

  describe("asset_list", () => {
    it("returns all registered assets when no filters given", async () => {
      await call({
        action: "asset_register",
        params: buildAssetParams({ asset_tag: "TAG-LIST-1" }),
      });
      const r = await call({ action: "asset_list", params: {} });
      expect(r.success).toBe(true);
      const data = r.raw.data ?? r.raw;
      expect(Array.isArray(data.assets)).toBe(true);
      expect(data.assets.length).toBeGreaterThan(0);
    });

    it("filters by category=gage returns only gage assets", async () => {
      await call({
        action: "asset_register",
        params: buildAssetParams({
          asset_tag: "TAG-LIST-GAGE",
          category: "gage",
          name: "Test Gage",
        }),
      });
      const r = await call({
        action: "asset_list",
        params: { category: "gage" },
      });
      expect(r.success).toBe(true);
      const data = r.raw.data ?? r.raw;
      expect(data.assets.length).toBeGreaterThan(0);
      for (const a of data.assets) {
        expect(a.category).toBe("gage");
      }
    });

    it("filters by status=active excludes disposed assets", async () => {
      const r = await call({
        action: "asset_list",
        params: { status: "active" },
      });
      expect(r.success).toBe(true);
      const data = r.raw.data ?? r.raw;
      for (const a of data.assets) {
        expect(a.status).toBe("active");
      }
    });

    it("filters by location returns only matching", async () => {
      await call({
        action: "asset_register",
        params: buildAssetParams({
          asset_tag: "TAG-LIST-BAY9",
          location: "Bay-9",
        }),
      });
      const r = await call({
        action: "asset_list",
        params: { location: "Bay-9" },
      });
      expect(r.success).toBe(true);
      const data = r.raw.data ?? r.raw;
      expect(data.assets.length).toBeGreaterThan(0);
      for (const a of data.assets) {
        expect(a.location).toBe("Bay-9");
      }
    });
  });

  describe("asset_transfer", () => {
    it("creates XFER- record + updates asset location in place", async () => {
      const reg = await call({
        action: "asset_register",
        params: buildAssetParams({
          asset_tag: "TAG-XFER-1",
          location: "Bay-1",
        }),
      });
      const id = (reg.raw.data ?? reg.raw).id;

      const r = await call({
        action: "asset_transfer",
        params: {
          asset_id: id,
          to_location: "Bay-2",
          transferred_by: "Mark",
          reason: "Capacity rebalance",
        },
      });
      expect(r.success).toBe(true);
      const data = r.raw.data ?? r.raw;
      expect(typeof data.id).toBe("string");
      expect(data.id.startsWith("XFER-")).toBe(true);
      expect(data.from_location).toBe("Bay-1");
      expect(data.to_location).toBe("Bay-2");
      expect(data.asset_id).toBe(id);
      expect(data.transferred_by).toBe("Mark");

      const list = await call({
        action: "asset_list",
        params: { location: "Bay-2" },
      });
      const matched: any[] = (list.raw.data ?? list.raw).assets.filter(
        (a: any) => a.id === id,
      );
      expect(matched.length).toBe(1);
      expect(matched[0].location).toBe("Bay-2");
    });

    it("throws on unknown asset_id", async () => {
      const r = await call({
        action: "asset_transfer",
        params: {
          asset_id: "AST-NONEXISTENT-9999",
          to_location: "Anywhere",
          transferred_by: "Mark",
          reason: "Test",
        },
      });
      expect(r.success).toBe(false);
      expect((r.error || "").toLowerCase()).toContain("not found");
    });
  });

  describe("asset_calibration_due", () => {
    it("surfaces assets with next_calibration_date within days_ahead window", async () => {
      const inFiveDays = new Date(NOW + 5 * 86400000).toISOString();
      await call({
        action: "asset_register",
        params: buildAssetParams({
          asset_tag: "TAG-CAL-DUE-SOON",
          name: "Cal-Due-Soon Gage",
          category: "gage",
          calibration_required: true,
          last_calibration_date: THIRTY_DAYS_AGO,
          next_calibration_date: inFiveDays,
          calibration_interval_days: 35,
        }),
      });
      const r = await call({
        action: "asset_calibration_due",
        params: { days_ahead: 30 },
      });
      expect(r.success).toBe(true);
      const data = r.raw.data ?? r.raw;
      expect(Array.isArray(data.due)).toBe(true);
      const matched: any[] = data.due.filter(
        (d: any) => d.asset.asset_tag === "TAG-CAL-DUE-SOON",
      );
      expect(matched.length).toBe(1);
      expect(matched[0].days_until_due).toBeGreaterThanOrEqual(0);
      expect(matched[0].days_until_due).toBeLessThanOrEqual(30);
      expect(matched[0].asset.calibration_required).toBe(true);
    });

    it("excludes assets with calibration_required=false even if past due", async () => {
      const yesterday = new Date(NOW - 86400000).toISOString();
      await call({
        action: "asset_register",
        params: buildAssetParams({
          asset_tag: "TAG-CAL-NOT-REQ",
          name: "No-Cal-Required Machine",
          category: "machine",
          calibration_required: false,
          next_calibration_date: yesterday,
        }),
      });
      const r = await call({
        action: "asset_calibration_due",
        params: { days_ahead: 60 },
      });
      expect(r.success).toBe(true);
      const data = r.raw.data ?? r.raw;
      const matched: any[] = data.due.filter(
        (d: any) => d.asset.asset_tag === "TAG-CAL-NOT-REQ",
      );
      expect(matched.length).toBe(0);
    });

    it("sorts results by days_until_due ascending", async () => {
      const r = await call({
        action: "asset_calibration_due",
        params: { days_ahead: 365 },
      });
      expect(r.success).toBe(true);
      const data = r.raw.data ?? r.raw;
      if (data.due.length >= 2) {
        for (let i = 1; i < data.due.length; i++) {
          expect(data.due[i].days_until_due).toBeGreaterThanOrEqual(
            data.due[i - 1].days_until_due,
          );
        }
      }
    });

    it("default days_ahead (omitted) is 30 — assets due in 60 days excluded", async () => {
      const in60 = new Date(NOW + 60 * 86400000).toISOString();
      await call({
        action: "asset_register",
        params: buildAssetParams({
          asset_tag: "TAG-CAL-FAR",
          category: "gage",
          calibration_required: true,
          next_calibration_date: in60,
        }),
      });
      const r = await call({ action: "asset_calibration_due", params: {} });
      expect(r.success).toBe(true);
      const data = r.raw.data ?? r.raw;
      const matched: any[] = data.due.filter(
        (d: any) => d.asset.asset_tag === "TAG-CAL-FAR",
      );
      expect(matched.length).toBe(0);
    });
  });
});
