/**
 * SystemVariabilityIndexEngine — compute and persist SVI.
 */
import { describe, it, expect } from "vitest";
import * as fs from "fs";

const SVI_PATH = "C:/PRISM/state/shared/SVI.json";

describe("SystemVariabilityIndexEngine", () => {
  it("compute: produces valid SVI report with all subsystems", async () => {
    const { systemVariabilityIndexEngine } = await import("../engines/SystemVariabilityIndexEngine.js");
    const report = await systemVariabilityIndexEngine.compute();

    expect(report.svi_log10).toBeGreaterThan(10);  // at least 10^10 state space
    expect(report.psi_reachability).toBeGreaterThan(0);
    expect(report.psi_reachability).toBeLessThanOrEqual(1);
    expect(report.subsystems.length).toBeGreaterThanOrEqual(10);
    expect(report.pipelines.length).toBe(9);
    expect(report.total_entities).toBeGreaterThan(50000);
    expect(report.svi_display).toContain("×");
    expect(report.counts.materials).toBeGreaterThan(0);
    expect(report.counts.engines).toBeGreaterThan(100);
    expect(report.counts.dispatchers).toBeGreaterThan(10);
    expect(report.trend).toMatch(/growing|stable|shrinking/);

    console.log("\n=== PRISM SVI REPORT ===");
    console.log(`SVI: ${report.svi_display}`);
    console.log(`Ψ Reachability: ${report.psi_display}`);
    console.log(`Total Entities: ${report.total_entities.toLocaleString()}`);
    console.log(`Total Reachable: ${report.total_reachable.toLocaleString()}`);
    console.log(`Trend: ${report.trend} (Δ=${report.svi_delta})`);
    console.log("========================\n");
  });

  it("read: returns persisted report after compute", async () => {
    const { systemVariabilityIndexEngine } = await import("../engines/SystemVariabilityIndexEngine.js");
    const saved = systemVariabilityIndexEngine.read();
    expect(saved).not.toBeNull();
    expect(saved!.svi_log10).toBeGreaterThan(0);
  });

  it("summary: returns compact text string", async () => {
    const { systemVariabilityIndexEngine } = await import("../engines/SystemVariabilityIndexEngine.js");
    const text = systemVariabilityIndexEngine.summary();
    expect(text).toContain("SVI:");
    expect(text).toContain("Ψ=");
    expect(text).toContain("materials");
    expect(text).toContain("engines");
  });

  it("pipeline reachability scores are between 0 and 1", async () => {
    const { systemVariabilityIndexEngine } = await import("../engines/SystemVariabilityIndexEngine.js");
    const report = systemVariabilityIndexEngine.read()!;
    for (const p of report.pipelines) {
      expect(p.reachability_score).toBeGreaterThanOrEqual(0);
      expect(p.reachability_score).toBeLessThanOrEqual(1);
      expect(p.stages).toBeGreaterThan(0);
    }
  });

  it("growth tracking: second compute shows stable trend", async () => {
    const { systemVariabilityIndexEngine } = await import("../engines/SystemVariabilityIndexEngine.js");
    const r2 = await systemVariabilityIndexEngine.compute();
    expect(r2.trend).toBe("stable");
    expect(Math.abs(r2.svi_delta)).toBe(0);
  });

  it("autoRefreshIfStale: recomputes when watched feature surfaces drift", async () => {
    const { systemVariabilityIndexEngine } = await import("../engines/SystemVariabilityIndexEngine.js");

    const baseline = await systemVariabilityIndexEngine.compute();
    expect(baseline.watch_areas.length).toBeGreaterThan(0);

    const persisted = JSON.parse(fs.readFileSync(SVI_PATH, "utf-8"));
    persisted.watch_areas[0].fingerprint = `${persisted.watch_areas[0].fingerprint}-tampered`;
    fs.writeFileSync(SVI_PATH, JSON.stringify(persisted, null, 2));

    const refreshed = await systemVariabilityIndexEngine.autoRefreshIfStale();

    expect(refreshed.recomputed).toBe(true);
    expect(refreshed.drift.stale).toBe(true);
    expect(refreshed.drift.changed_areas.length).toBeGreaterThan(0);
    expect(refreshed.report.watch_areas.length).toBeGreaterThan(0);
    expect(refreshed.report.drift_status.stale).toBe(false);
  });

  it("startAutoWatch: exposes persistent watcher status for Claude/Codex boot surfaces", async () => {
    const { systemVariabilityIndexEngine } = await import("../engines/SystemVariabilityIndexEngine.js");

    const status = await systemVariabilityIndexEngine.startAutoWatch({
      use_fs_watch: false,
      poll_interval_ms: 0,
      run_initial_refresh: false,
    });

    expect(status.active).toBe(true);
    expect(status.watch_targets).toBeGreaterThan(0);
    expect(systemVariabilityIndexEngine.getAutoWatchStatus().active).toBe(true);

    systemVariabilityIndexEngine.stopAutoWatch();
    expect(systemVariabilityIndexEngine.getAutoWatchStatus().active).toBe(false);
  });
});
