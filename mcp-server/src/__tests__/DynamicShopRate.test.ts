/**
 * DynamicShopRateEngine tests
 * @milestone QUOTING-SYNERGY-MS0/U-DYNAMIC-SHOP-RATE (charlie /goal-20 iter19)
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DynamicShopRateEngine, dynamicShopRateEngine } from "../engines/DynamicShopRateEngine.js";

describe("DynamicShopRateEngine.adjust — U-DYNAMIC-SHOP-RATE", () => {
  it("rejects machine_family missing", async () => {
    const r = await dynamicShopRateEngine.adjust({
      machine_family: "", current_loading_pct: 0.5,
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/machine_family/);
  });

  it("rejects loading outside [0, 1]", async () => {
    const r1 = await dynamicShopRateEngine.adjust({ machine_family: "haas_vf2", current_loading_pct: -0.1 });
    expect(r1.ok).toBe(false);
    const r2 = await dynamicShopRateEngine.adjust({ machine_family: "haas_vf2", current_loading_pct: 1.5 });
    expect(r2.ok).toBe(false);
  });

  it("baseline band (loading 0.5-0.7): no adjustment", async () => {
    const r = await dynamicShopRateEngine.adjust({
      machine_family: "haas_vf2", current_loading_pct: 0.6,
    });
    expect(r.ok).toBe(true);
    expect(r.band).toBe("baseline");
    expect(r.applied_multiplier).toBe(1.0);
    expect(r.base_rate_usd_per_hr).toBe(85); // JM jm-die haas_vf2 = $85/hr
    expect(r.adjusted_rate_usd_per_hr).toBe(85);
    expect(r.delta_usd_per_hr).toBe(0);
  });

  it("busy band (0.70-0.85): +5% uplift", async () => {
    const r = await dynamicShopRateEngine.adjust({
      machine_family: "haas_vf2", current_loading_pct: 0.75,
    });
    expect(r.band).toBe("busy");
    expect(r.applied_multiplier).toBe(1.05);
    expect(r.adjusted_rate_usd_per_hr).toBe(89.25); // 85 × 1.05
    expect(r.delta_usd_per_hr).toBe(4.25);
  });

  it("rush band (≥0.85): +20% uplift", async () => {
    const r = await dynamicShopRateEngine.adjust({
      machine_family: "haas_vf2", current_loading_pct: 0.90,
    });
    expect(r.band).toBe("rush");
    expect(r.applied_multiplier).toBe(1.20);
    expect(r.adjusted_rate_usd_per_hr).toBe(102); // 85 × 1.20
  });

  it("capture band (0.25-0.50): -8% discount", async () => {
    const r = await dynamicShopRateEngine.adjust({
      machine_family: "haas_vf2", current_loading_pct: 0.40,
    });
    expect(r.band).toBe("capture");
    expect(r.applied_multiplier).toBe(0.92);
    expect(r.adjusted_rate_usd_per_hr).toBe(78.2); // 85 × 0.92
  });

  it("deep_discount band (<0.25): -15% discount", async () => {
    const r = await dynamicShopRateEngine.adjust({
      machine_family: "haas_vf2", current_loading_pct: 0.10,
    });
    expect(r.band).toBe("deep_discount");
    expect(r.applied_multiplier).toBe(0.85);
    expect(r.adjusted_rate_usd_per_hr).toBe(72.25);
  });

  it("rush_lead uplift applies on top of capacity band when delivery < 7 days", async () => {
    // baseline capacity × rush-lead = 1.0 × 1.10 = 1.10 → 85 × 1.10 = 93.5
    const r = await dynamicShopRateEngine.adjust({
      machine_family: "haas_vf2", current_loading_pct: 0.60,
      hours_until_delivery: 48, // 2 days
    });
    expect(r.rush_lead_active).toBe(true);
    expect(r.applied_multiplier).toBe(1.10);
    expect(r.adjusted_rate_usd_per_hr).toBe(93.5);
  });

  it("rush_lead does NOT apply when delivery ≥ 7 days", async () => {
    const r = await dynamicShopRateEngine.adjust({
      machine_family: "haas_vf2", current_loading_pct: 0.60,
      hours_until_delivery: 24 * 14, // 14 days
    });
    expect(r.rush_lead_active).toBe(false);
    expect(r.applied_multiplier).toBe(1.0);
  });

  it("clamps total adjustment to ±50% from baseline", async () => {
    // Engine with aggressive bands: 200% rush + 50% rush-lead = 300%, should clamp to 150%.
    const aggressive = new DynamicShopRateEngine({
      bands: [
        { loading_min: 0.85, multiplier: 2.0, label: "extreme_rush" },
        { loading_min: 0.0, multiplier: 1.0, label: "baseline" },
      ],
      rushLeadUpliftPct: 0.50,
    });
    const r = await aggressive.adjust({
      machine_family: "haas_vf2", current_loading_pct: 0.95,
      hours_until_delivery: 24, // 1 day, triggers rush
    });
    expect(r.ok).toBe(true);
    // 2.0 × 1.5 = 3.0 → clamped to 1.5 (max 50% uplift)
    expect(r.applied_multiplier).toBe(1.50);
    expect(r.adjusted_rate_usd_per_hr).toBe(127.5); // 85 × 1.5
  });

  it("warns when machine not in profile but still returns rate via default fallback", async () => {
    const r = await dynamicShopRateEngine.adjust({
      machine_family: "unknown_brand_zzz", current_loading_pct: 0.60,
    });
    expect(r.ok).toBe(true);
    expect(r.warnings.some(w => w.includes("not in profile"))).toBe(true);
    expect(r.base_rate_usd_per_hr).toBe(95); // jm-die default_machine_rate_usd_per_hr
  });

  it("custom bands override defaults", async () => {
    const customBands = new DynamicShopRateEngine({
      bands: [
        { loading_min: 0.50, multiplier: 1.30, label: "always_rush" },
        { loading_min: 0.00, multiplier: 1.00, label: "baseline" },
      ],
    });
    const r = await customBands.adjust({
      machine_family: "haas_vf2", current_loading_pct: 0.55,
    });
    expect(r.band).toBe("always_rush");
    expect(r.applied_multiplier).toBe(1.30);
  });

  it("getBands returns the configured bands list", () => {
    const bands = dynamicShopRateEngine.getBands();
    expect(bands.length).toBeGreaterThan(0);
    // Verify the rush band exists.
    const rush = bands.find(b => b.label === "rush");
    expect(rush?.multiplier).toBe(1.20);
  });

  it("delta sign is consistent with band direction across all 5 bands", async () => {
    const loadings = [0.10, 0.40, 0.60, 0.75, 0.90];
    const expectedSigns = ["negative", "negative", "zero", "positive", "positive"];
    for (let i = 0; i < loadings.length; i++) {
      const r = await dynamicShopRateEngine.adjust({
        machine_family: "haas_vf2", current_loading_pct: loadings[i],
      });
      const sign = r.delta_usd_per_hr > 0 ? "positive" : r.delta_usd_per_hr < 0 ? "negative" : "zero";
      expect(sign).toBe(expectedSigns[i]);
    }
  });
});

// ── U-DYNAMIC-RATE-LOADING-SOURCE (yolo-iter2) ──
describe("DynamicShopRateEngine.resolveLoading + auto-source — U-DYNAMIC-RATE-LOADING-SOURCE", () => {
  let tmpDir: string;
  let statePath: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(join(tmpdir(), "loading-src-test-"));
    statePath = join(tmpDir, "current-loading.json");
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("caller's value always wins (source=caller)", async () => {
    const r = await dynamicShopRateEngine.resolveLoading("haas_vf2", 0.42, { stateFilePath: statePath });
    expect(r.source).toBe("caller");
    expect(r.loading_pct).toBe(0.42);
  });

  it("invalid caller value falls through to state file / baseline", async () => {
    const r = await dynamicShopRateEngine.resolveLoading("haas_vf2", -0.5, { stateFilePath: statePath });
    expect(r.source).toBe("fallback_baseline"); // file doesn't exist
    expect(r.loading_pct).toBe(0.50);
  });

  it("reads per-machine-family value from state file (source=state_file_machine_specific)", async () => {
    const state = {
      by_machine_family: { haas_vf2: 0.88, okuma_lb3000: 0.65 },
      default_pct: 0.55,
      updated_iso: new Date().toISOString(),
    };
    await fs.writeFile(statePath, JSON.stringify(state), "utf-8");
    const r = await dynamicShopRateEngine.resolveLoading("haas_vf2", undefined, { stateFilePath: statePath });
    expect(r.source).toBe("state_file_machine_specific");
    expect(r.loading_pct).toBe(0.88);
    expect(r.is_stale).toBe(false);
  });

  it("falls back to state_file_default when machine_family not in by_machine_family map", async () => {
    const state = {
      by_machine_family: { okuma_lb3000: 0.65 },
      default_pct: 0.55,
      updated_iso: new Date().toISOString(),
    };
    await fs.writeFile(statePath, JSON.stringify(state), "utf-8");
    const r = await dynamicShopRateEngine.resolveLoading("haas_vf2", undefined, { stateFilePath: statePath });
    expect(r.source).toBe("state_file_default");
    expect(r.loading_pct).toBe(0.55);
  });

  it("stale state file (>24h) → still reads value but flags stale + warning", async () => {
    const staleDate = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    const state = {
      by_machine_family: { haas_vf2: 0.80 },
      default_pct: 0.50,
      updated_iso: staleDate,
    };
    await fs.writeFile(statePath, JSON.stringify(state), "utf-8");
    const r = await dynamicShopRateEngine.resolveLoading("haas_vf2", undefined, { stateFilePath: statePath });
    expect(r.source).toBe("state_file_machine_specific");
    expect(r.loading_pct).toBe(0.80);
    expect(r.is_stale).toBe(true);
    expect(r.warnings.some(w => w.includes("staleness"))).toBe(true);
  });

  it("missing state file → fallback_baseline (no warning since cold-shop is normal)", async () => {
    const r = await dynamicShopRateEngine.resolveLoading("haas_vf2", undefined, { stateFilePath: join(tmpDir, "does-not-exist.json") });
    expect(r.source).toBe("fallback_baseline");
    expect(r.loading_pct).toBe(0.50);
    expect(r.warnings).toHaveLength(0);
  });

  it("malformed JSON → warns + fallback_baseline", async () => {
    await fs.writeFile(statePath, "{not valid json", "utf-8");
    const r = await dynamicShopRateEngine.resolveLoading("haas_vf2", undefined, { stateFilePath: statePath });
    expect(r.source).toBe("fallback_baseline");
    expect(r.loading_pct).toBe(0.50);
    expect(r.warnings.some(w => w.includes("read failed"))).toBe(true);
  });

  it("adjust() auto-sources loading when current_loading_pct omitted", async () => {
    const state = {
      by_machine_family: { haas_vf2: 0.92 }, // rush band
      default_pct: 0.50,
      updated_iso: new Date().toISOString(),
    };
    await fs.writeFile(statePath, JSON.stringify(state), "utf-8");
    const r = await dynamicShopRateEngine.adjust(
      { machine_family: "haas_vf2" }, // no current_loading_pct
      { loadingStateFilePath: statePath }
    );
    expect(r.ok).toBe(true);
    expect(r.band).toBe("rush"); // 0.92 lands in rush band
    expect(r.applied_multiplier).toBe(1.20);
    expect(r.loading_source).toBe("state_file_machine_specific");
    expect(r.adjusted_rate_usd_per_hr).toBe(102); // 85 × 1.20
  });

  it("adjust() with caller-supplied loading overrides state file", async () => {
    const state = {
      by_machine_family: { haas_vf2: 0.92 }, // rush
      default_pct: 0.50,
      updated_iso: new Date().toISOString(),
    };
    await fs.writeFile(statePath, JSON.stringify(state), "utf-8");
    const r = await dynamicShopRateEngine.adjust(
      { machine_family: "haas_vf2", current_loading_pct: 0.10 }, // operator overrides
      { loadingStateFilePath: statePath }
    );
    expect(r.band).toBe("deep_discount");
    expect(r.loading_source).toBe("caller");
  });
});
