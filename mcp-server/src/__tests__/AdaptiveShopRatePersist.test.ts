/**
 * U-QP-ADAPTIVE-PERSIST (charlie 2026-06-12) -- the Bayesian shop-rate learning
 * loop now SURVIVES a restart (posteriors + outcome ledger persisted) and the
 * quote path reads the learned rate when one exists.
 *
 * Before: AdaptiveShopRateEngine held posteriors in-memory only -> they vanished
 * on restart (G5), and InstantQuoteEngine never read them. This wires durable
 * persistence + a quote-time consumer.
 *
 * HONEST SCOPE (R12): the quote-time read keys on the ShopConfig machine id
 * (e.g. "VMC-01"), but adaptShopRate bootstraps priors from MachineRateDatabase
 * ids (e.g. "vmc_tier2"). So for a ShopConfig machine the read is DORMANT until
 * outcomes are recorded against the ShopConfig id + the engine can seed a prior
 * for a non-DB id (a hotel-domain follow-up). The persistence + consumer are
 * proven here; the active-rate path activates once that namespace reconciles.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { adaptiveShopRateEngine, type JobEconomicsOutcome } from "../engines/AdaptiveShopRateEngine.js";
import { instantQuoteEngine, type InstantQuoteInput } from "../engines/InstantQuoteEngine.js";

function outcome(machineId: string, jobId: string, actualCost: number): JobEconomicsOutcome {
  return {
    job_id: jobId, machine_id: machineId, recorded_at: "2026-06-12T00:00:00.000Z",
    predicted_cost: 1000, actual_cost: actualCost, predicted_hours: 10, actual_hours: 11,
    quoted_revenue: 1500, actual_revenue: 1450,
  };
}

let dir: string;
let statePath: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "adaptive-persist-"));
  statePath = join(dir, "adaptive-state.json");
  adaptiveShopRateEngine.configureStatePath(statePath); // isolate from the real state file
});
afterEach(() => {
  try { rmSync(dir, { recursive: true, force: true }); } catch { /* best effort */ }
});

describe("U-QP-ADAPTIVE-PERSIST -- durable posteriors + outcome ledger", () => {
  it("recorded outcomes survive a 'restart' (persist -> reload)", () => {
    adaptiveShopRateEngine.recordOutcome(outcome("vmc_tier2", "J1", 1100));
    adaptiveShopRateEngine.recordOutcome(outcome("vmc_tier2", "J2", 1050));
    expect(existsSync(statePath)).toBe(true); // auto-persisted on recordOutcome

    // Simulate a process restart: same path, fresh in-memory state.
    adaptiveShopRateEngine.configureStatePath(statePath);
    const reloaded = adaptiveShopRateEngine.listOutcomes("vmc_tier2");
    expect(reloaded.length).toBe(2);
    expect(reloaded.map(o => o.job_id).sort()).toEqual(["J1", "J2"]);
  });

  it("an adapted posterior (mu/sigma/n) survives a restart", () => {
    adaptiveShopRateEngine.recordOutcome(outcome("vmc_tier2", "J1", 1100));
    adaptiveShopRateEngine.recordOutcome(outcome("vmc_tier2", "J2", 1200));
    const updated = adaptiveShopRateEngine.adaptShopRate("vmc_tier2");
    expect(updated.prior_after.n).toBeGreaterThan(0);
    const muAfter = updated.prior_after.mu;

    // Restart -> the learned posterior must reload, not reset to the bootstrap prior.
    adaptiveShopRateEngine.configureStatePath(statePath);
    const prior = adaptiveShopRateEngine.getPrior("vmc_tier2");
    expect(prior).not.toBeNull();
    expect(prior!.n_observations).toBeGreaterThan(0);
    expect(prior!.mu).toBeCloseTo(muAfter, 2);
  });

  it("corrupt state file -> fresh start (fail-soft, never throws)", () => {
    writeFileSync(statePath, "{ this is not valid json", "utf-8");
    adaptiveShopRateEngine.configureStatePath(statePath);
    // Must not throw; starts empty.
    expect(adaptiveShopRateEngine.listOutcomes("vmc_tier2").length).toBe(0);
  });

  it("persist write-failure is fail-soft: recordOutcome returns normally, never throws", () => {
    // Make the state path un-writable: its PARENT is a regular file, so mkdir/write
    // throw. The persist catch must swallow it so a quote/record never breaks.
    const blocker = join(dir, "iam-a-file");
    writeFileSync(blocker, "x", "utf-8");
    adaptiveShopRateEngine.configureStatePath(join(blocker, "sub", "state.json"));
    let returned: JobEconomicsOutcome | null = null;
    expect(() => { returned = adaptiveShopRateEngine.recordOutcome(outcome("vmc_tier2", "J1", 1100)); }).not.toThrow();
    expect(returned).not.toBeNull(); // outcome still applied in-memory despite the write failure
    expect(adaptiveShopRateEngine.listOutcomes("vmc_tier2").length).toBe(1);
  });

  it("schema-version mismatch -> ignored (N-1 starts fresh, no crash)", () => {
    writeFileSync(statePath, JSON.stringify({ schemaVersion: "0.0.1", outcomes: { vmc_tier2: [outcome("vmc_tier2", "OLD", 999)] } }), "utf-8");
    adaptiveShopRateEngine.configureStatePath(statePath);
    expect(adaptiveShopRateEngine.listOutcomes("vmc_tier2").length).toBe(0); // stale schema not loaded
  });
});

describe("U-QP-ADAPTIVE-PERSIST -- InstantQuoteEngine quote-time consumer", () => {
  const IQ_MILL: InstantQuoteInput = {
    part_name: "adaptive-mill", material: "4140", quantity: 10,
    stock_dimensions_mm: { length: 100, width: 50, height: 25 }, part_volume_cm3: 80,
    iso_group: "P", machine_type: "cnc_mill_3axis",
  };

  it("DORMANT today: no learned prior for the ShopConfig machine -> NOT AdaptiveShopRateEngine, uses catalog rate", () => {
    // No outcomes recorded against the ShopConfig id (VMC-01) -> getPrior null ->
    // the quote correctly falls back to the ShopConfigurationEngine catalog rate.
    const r = instantQuoteEngine.quote(IQ_MILL);
    expect(r.physics_engines_used).not.toContain("AdaptiveShopRateEngine");
    expect(r.physics_engines_used).toContain("ShopConfigurationEngine");
    expect(r.cost_breakdown.machining.machine_rate_hr).toBeGreaterThan(0);
  });
});
