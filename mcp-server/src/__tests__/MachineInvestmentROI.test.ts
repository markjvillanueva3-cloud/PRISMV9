/**
 * MachineInvestmentROIEngine tests
 * @milestone QUOTING-SYNERGY-MS0/U-MACHINE-INVEST-FROM-FLEET (charlie /goal-20 iter18)
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { machineInvestmentROIEngine, MachineInvestmentROIEngine } from "../engines/MachineInvestmentROIEngine.js";

describe("MachineInvestmentROIEngine.evaluate — U-MACHINE-INVEST-FROM-FLEET", () => {
  let tmpDir: string;
  let ledgerPath: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(join(tmpdir(), "mach-invest-test-"));
    ledgerPath = join(tmpDir, "ledger.jsonl");
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  function writeLedger(rows: Array<{ machine_family: string; abs_path?: string }>) {
    const lines = rows.map((r, i) => JSON.stringify({
      abs_path: r.abs_path ?? `H:/prism/JM DIE/X/CUST/p${i}.MIN`,
      sha_short: "d3adb33f",
      size_bytes: 100,
      mtime_iso: "2026-05-25T00:00:00.000Z",
      scanned_at: "2026-05-25T00:00:00.000Z",
      source: "fleet-scan-batch",
      machine_family: r.machine_family,
    }));
    return fs.writeFile(ledgerPath, lines.join("\n") + "\n", "utf-8");
  }

  it("rejects negative cost_usd", async () => {
    const r = await machineInvestmentROIEngine.evaluate({
      candidate_family: "haas_vf3", candidate_domain: "mill", cost_usd: -1,
      candidate_rate_usd_per_hr: 60, candidate_power_kw: 22, candidate_utilization_pct: 0.78,
      incumbent_family: "haas_vf2", migration_fraction: 0.5,
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/cost_usd/);
  });

  it("rejects migration_fraction outside [0,1]", async () => {
    const r = await machineInvestmentROIEngine.evaluate({
      candidate_family: "haas_vf3", candidate_domain: "mill", cost_usd: 100000,
      candidate_rate_usd_per_hr: 60, candidate_power_kw: 22, candidate_utilization_pct: 0.78,
      incumbent_family: "haas_vf2", migration_fraction: 1.5,
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/migration_fraction/);
  });

  it("buy recommendation: cheap candidate + high migration + low cost", async () => {
    await writeLedger([
      { machine_family: "mill" }, { machine_family: "mill" }, { machine_family: "mill" },
      { machine_family: "mill" }, { machine_family: "mill" },
    ]);
    const r = await machineInvestmentROIEngine.evaluate({
      candidate_family: "haas_vf3", candidate_domain: "mill", cost_usd: 50000,
      candidate_rate_usd_per_hr: 50, candidate_power_kw: 22, candidate_utilization_pct: 0.85,
      incumbent_family: "haas_vf2", migration_fraction: 0.8,
      monthly_target_hours: 200,
    }, { ledgerPath });
    expect(r.ok).toBe(true);
    // Incumbent jm-die haas_vf2 = $85/hr; candidate = $50/hr; savings $35/hr × 200 × 0.8 = $5,600/mo.
    expect(r.per_hour_savings_usd).toBe(35);
    expect(r.migrated_hours_per_month).toBe(160);
    expect(r.monthly_migration_savings_usd).toBe(5600);
    expect(r.annual_migration_savings_usd).toBe(67200);
    // Payback = 50000 / 5600 = 8.93 months → buy.
    expect(r.payback_months ?? 0).toBeLessThan(12);
    expect(r.recommendation).toBe("buy");
    expect(r.eligible_fleet_rows).toBe(5);
  });

  it("skip recommendation: candidate rate ≥ incumbent rate (no per-hour savings)", async () => {
    const r = await machineInvestmentROIEngine.evaluate({
      candidate_family: "haas_vf3", candidate_domain: "mill", cost_usd: 100000,
      candidate_rate_usd_per_hr: 90, candidate_power_kw: 22, candidate_utilization_pct: 0.78,
      incumbent_family: "haas_vf2", migration_fraction: 0.5,
    });
    expect(r.ok).toBe(true);
    expect(r.per_hour_savings_usd).toBe(-5); // candidate is MORE expensive
    expect(r.payback_months).toBeNull();
    expect(r.recommendation).toBe("skip");
    expect(r.rationale).toMatch(/no per-hour savings/);
  });

  it("consider recommendation: payback in 12-24mo band", async () => {
    const r = await machineInvestmentROIEngine.evaluate({
      candidate_family: "haas_vf3", candidate_domain: "mill", cost_usd: 100000,
      candidate_rate_usd_per_hr: 50, candidate_power_kw: 22, candidate_utilization_pct: 0.78,
      incumbent_family: "haas_vf2", migration_fraction: 0.3,
      monthly_target_hours: 160,
    });
    // savings = (85-50) × 48 = $1,680/mo; payback = 100000/1680 = 59.5mo → skip
    // Adjust to land in band: migration 0.4 × 160 = 64 × 35 = 2240/mo; 100000/2240 = 44.6mo → still skip
    // Try migration 0.7: 112 × 35 = 3920/mo; 100000/3920 = 25.5mo → still skip
    // Try migration 0.85: 136 × 35 = 4760; 100000/4760 = 21.0mo → consider
    const r2 = await machineInvestmentROIEngine.evaluate({
      candidate_family: "haas_vf3", candidate_domain: "mill", cost_usd: 100000,
      candidate_rate_usd_per_hr: 50, candidate_power_kw: 22, candidate_utilization_pct: 0.78,
      incumbent_family: "haas_vf2", migration_fraction: 0.85,
    });
    expect(r2.recommendation).toBe("consider");
    expect(r2.payback_months ?? 0).toBeGreaterThan(12);
    expect(r2.payback_months ?? 0).toBeLessThanOrEqual(24);
    // Also exercise r at low migration → skip path
    expect(r.recommendation).toBe("skip");
  });

  it("eligible_fleet_rows counts only matching-domain ledger entries", async () => {
    await writeLedger([
      { machine_family: "mill" }, { machine_family: "mill" },     // 2 mill
      { machine_family: "lathe" }, { machine_family: "lathe" }, { machine_family: "lathe" }, // 3 lathe
      { machine_family: "wedm" },                                  // 1 wedm
    ]);
    const r = await machineInvestmentROIEngine.evaluate({
      candidate_family: "okuma_lb5000", candidate_domain: "lathe", cost_usd: 250000,
      candidate_rate_usd_per_hr: 70, candidate_power_kw: 35, candidate_utilization_pct: 0.85,
      incumbent_family: "okuma_lb3000", migration_fraction: 0.6,
    }, { ledgerPath });
    expect(r.eligible_fleet_rows).toBe(3); // only lathe rows
  });

  it("warns when incumbent_family not in profile (uses default rate)", async () => {
    const r = await machineInvestmentROIEngine.evaluate({
      candidate_family: "unknown_brand_x", candidate_domain: "mill", cost_usd: 80000,
      candidate_rate_usd_per_hr: 70, candidate_power_kw: 22, candidate_utilization_pct: 0.78,
      incumbent_family: "definitely_not_in_profile_xyz", migration_fraction: 0.5,
    });
    expect(r.ok).toBe(true);
    expect(r.warnings.some(w => w.includes("not in profile"))).toBe(true);
    // jm-die default_machine_rate_usd_per_hr = 95 → savings = 25/hr
    expect(r.per_hour_savings_usd).toBe(25);
  });

  it("warns when ledger has zero rows in candidate's domain", async () => {
    await writeLedger([
      { machine_family: "mill" }, { machine_family: "mill" },
    ]);
    const r = await machineInvestmentROIEngine.evaluate({
      candidate_family: "ag_charm_form25", candidate_domain: "sinker_edm", cost_usd: 120000,
      candidate_rate_usd_per_hr: 70, candidate_power_kw: 18, candidate_utilization_pct: 0.65,
      incumbent_family: "ag_charm_form20", migration_fraction: 0.5,
    }, { ledgerPath });
    expect(r.ok).toBe(true);
    expect(r.eligible_fleet_rows).toBe(0);
    expect(r.warnings.some(w => w.includes("no sinker_edm rows"))).toBe(true);
  });

  it("zero migration_fraction → zero migrated hours, zero savings, skip", async () => {
    const r = await machineInvestmentROIEngine.evaluate({
      candidate_family: "haas_vf3", candidate_domain: "mill", cost_usd: 100000,
      candidate_rate_usd_per_hr: 50, candidate_power_kw: 22, candidate_utilization_pct: 0.78,
      incumbent_family: "haas_vf2", migration_fraction: 0,
    });
    expect(r.ok).toBe(true);
    expect(r.migrated_hours_per_month).toBe(0);
    expect(r.monthly_migration_savings_usd).toBe(0);
    expect(r.recommendation).toBe("skip");
  });

  it("custom monthly_target_hours overrides 160-hr default", async () => {
    const r = await machineInvestmentROIEngine.evaluate({
      candidate_family: "haas_vf3", candidate_domain: "mill", cost_usd: 50000,
      candidate_rate_usd_per_hr: 50, candidate_power_kw: 22, candidate_utilization_pct: 0.78,
      incumbent_family: "haas_vf2", migration_fraction: 0.5,
      monthly_target_hours: 320, // 2-shift operation
    });
    // 320 × 0.5 = 160 migrated × $35 = $5,600/mo
    expect(r.migrated_hours_per_month).toBe(160);
    expect(r.monthly_migration_savings_usd).toBe(5600);
  });

  it("listIncumbentsByDomain returns expected JM Die families", async () => {
    const { shopProfileTemplateEngine } = await import("../engines/ShopProfileTemplateEngine.js");
    const profile = await shopProfileTemplateEngine.getProfile("jm-die");
    const engine = new MachineInvestmentROIEngine();
    const mills = engine.listIncumbentsByDomain(profile, "mill");
    const lathes = engine.listIncumbentsByDomain(profile, "lathe");
    expect(mills).toContain("haas_vf2");
    expect(lathes).toContain("okuma_lb3000");
  });
});
