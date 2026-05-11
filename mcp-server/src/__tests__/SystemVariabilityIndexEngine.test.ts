/**
 * Engine-direct test for SystemVariabilityIndexEngine.
 *
 * The SVI engine quantifies PRISM's total manufacturing-intelligence state space:
 * each subsystem contributes variability = entities × dimensions, and the
 * reachability ratio Ψ = Σreachable / Σvariability where reachable =
 * variability × wired_pct/100.
 *
 * As of U-VIZ-SVI-MAXOUT (2026-05-11) every subsystem's wired_pct is 100 — the
 * system-viz layer-saturation pass atomised the entire H: drive into the graph
 * with ≥1 edge per node — so Ψ = 1.0 (the variability of what physically exists
 * on H: is fully represented and reachable). This test pins that invariant plus
 * the algebraic relations the engine must hold, and the scientific-notation
 * formatting of the combinatorial SVI.
 *
 * `compute()` reads the live registries (absolute H:/prism/... paths in the
 * engine) and persists SVI.json — the same recompute the svi_compute action runs.
 */
import { describe, it, expect } from "vitest";
import {
  systemVariabilityIndexEngine,
  type SVIReport,
  type SubsystemSVI,
} from "../engines/SystemVariabilityIndexEngine.js";

const SCI_NOTATION = /^\d+(?:\.\d+)? × 10\^-?\d+$/;
const EXPECTED_SUBSYSTEMS = [
  "Materials", "Tools", "Machines", "Tribal Tips", "Handbooks",
  "Formulas", "Algorithms", "Strategies",
  "Engines", "Dispatchers", "Actions",
  "Pipelines", "Dialects", "Tests",
];
const VALID_CATEGORIES = new Set(["data", "physics", "pipeline", "output", "intelligence"]);

/** Re-derive Ψ from the subsystem rows so the test doesn't just trust the field. */
function derivePsi(subs: SubsystemSVI[]): number {
  const tv = subs.reduce((s, x) => s + x.variability, 0);
  const tr = subs.reduce((s, x) => s + x.reachable, 0);
  return tv > 0 ? tr / tv : 0;
}

describe("SystemVariabilityIndexEngine", () => {
  let report: SVIReport;

  it("compute() returns a structurally complete SVI report", async () => {
    report = await systemVariabilityIndexEngine.compute();
    expect(Array.isArray(report.subsystems)).toBe(true);
    expect(report.subsystems.length).toBeGreaterThanOrEqual(14);
    expect(Array.isArray(report.pipelines)).toBe(true);
    expect(report.pipelines.length).toBeGreaterThan(0);
    expect(typeof report.svi_display).toBe("string");
    expect(typeof report.psi_display).toBe("string");
    // counts must carry the headline integers, not be an empty object
    expect(Number.isInteger(report.counts.engines)).toBe(true);
    expect(report.counts.engines).toBeGreaterThan(0);
    expect(Number.isInteger(report.counts.dispatchers)).toBe(true);
    expect(report.counts.dispatchers).toBeGreaterThan(0);
    expect(Number.isInteger(report.counts.actions)).toBe(true);
    expect(report.counts.actions).toBeGreaterThan(0);
    // ISO-8601-ish timestamp
    expect(report.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it("Ψ (psi_reachability) is exactly 1.0 and matches the value re-derived from the subsystem rows", () => {
    expect(report.psi_reachability).toBe(1);
    expect(derivePsi(report.subsystems)).toBe(1);
  });

  it("psi_display renders the ratio as 100.0%", () => {
    expect(report.psi_display).toBe("100.0%");
    expect((report.psi_reachability * 100).toFixed(1) + "%").toBe(report.psi_display);
  });

  it("every subsystem is 100% wired (post-MAXOUT)", () => {
    for (const s of report.subsystems) {
      expect(s.wired_pct, `${s.name} wired_pct`).toBe(100);
    }
  });

  it("reachable === variability for every subsystem (algebraic consequence of wired_pct=100)", () => {
    for (const s of report.subsystems) {
      expect(s.reachable, `${s.name} reachable`).toBe(s.variability);
      expect(s.reachable).toBe(s.variability * (s.wired_pct / 100));
    }
  });

  it("total_reachable === total_variability === Σ(subsystem variability)", () => {
    const sumVar = report.subsystems.reduce((a, s) => a + s.variability, 0);
    expect(report.total_variability).toBe(sumVar);
    expect(report.total_reachable).toBe(sumVar);
  });

  it("variability = entities × dimensions for every subsystem", () => {
    for (const s of report.subsystems) {
      expect(s.variability, `${s.name} variability`).toBe(s.entities * s.dimensions);
      expect(s.entities).toBeGreaterThanOrEqual(0);
      expect(s.dimensions).toBeGreaterThan(0);
    }
  });

  it("the combinatorial SVI (log10 of ∏variability) equals Σlog10(variability) over non-zero subsystems and is a huge finite number", () => {
    const recomputed = report.subsystems
      .filter((s) => s.variability > 0)
      .reduce((a, s) => a + Math.log10(s.variability), 0);
    expect(Number.isFinite(report.svi_log10)).toBe(true);
    expect(report.svi_log10).toBeCloseTo(recomputed, 1);
    expect(report.svi_log10).toBeGreaterThan(10);   // state space is astronomically large
  });

  it("svi_display is the scientific-notation rendering of svi_log10 (mantissa × 10^exponent)", () => {
    expect(report.svi_display).toMatch(SCI_NOTATION);
    const exponent = Math.floor(report.svi_log10);
    expect(report.svi_display).toContain(`× 10^${exponent}`);
  });

  it("includes every expected named subsystem with a valid category", () => {
    const byName = new Map(report.subsystems.map((s) => [s.name, s]));
    for (const expected of EXPECTED_SUBSYSTEMS) {
      const s = byName.get(expected);
      expect(s?.name, `subsystem "${expected}" present`).toBe(expected);
      expect(VALID_CATEGORIES.has(s!.category), `${expected} category "${s!.category}"`).toBe(true);
    }
  });

  it("Tests/Dispatchers/Actions/Engines subsystems reflect the real counts and are wired", () => {
    const byName = new Map(report.subsystems.map((s) => [s.name, s]));
    expect(byName.get("Dispatchers")!.entities).toBe(report.counts.dispatchers);
    expect(byName.get("Actions")!.entities).toBe(report.counts.actions);
    expect(byName.get("Engines")!.entities).toBe(report.counts.engines);
    expect(byName.get("Tests")!.entities).toBe(report.counts.tests);
    expect(byName.get("Dispatchers")!.wired_pct).toBe(100);
  });

  it("each pipeline reports stages and a reachability_score in [0, 1]", () => {
    for (const p of report.pipelines) {
      expect(p.reachability_score).toBeGreaterThanOrEqual(0);
      expect(p.reachability_score).toBeLessThanOrEqual(1);
      expect(p.stages).toBeGreaterThan(0);
      expect(typeof p.name).toBe("string");
    }
  });

  it("trend is one of growing | shrinking | stable and consistent with svi_delta", () => {
    expect(["growing", "shrinking", "stable"]).toContain(report.trend);
    if (report.svi_delta > 0.01) expect(report.trend).toBe("growing");
    else if (report.svi_delta < -0.01) expect(report.trend).toBe("shrinking");
    else expect(report.trend).toBe("stable");
  });

  it("read() returns the persisted report; it equals what compute() just produced", () => {
    const persisted = systemVariabilityIndexEngine.read();
    // SVI.json must exist after compute() — a null here means persistence broke.
    expect(persisted === null).toBe(false);
    expect(persisted!.psi_reachability).toBe(1);
    expect(persisted!.subsystems.length).toBe(report.subsystems.length);
    expect(persisted!.svi_display).toBe(report.svi_display);
    expect(persisted!.total_variability).toBe(report.total_variability);
  });

  it("_computeSubsystems(synthetic counts) honours wired_pct=100 and variability=entities×dimensions for every row", () => {
    const synthetic: SVIReport["counts"] = {
      materials: 100, tools: 200, machines: 50,
      formulas: 30, algorithms: 20, strategies: 15,
      engines: 300, dispatchers: 10, actions: 500,
      pipelines: 9, dialects: 20, tests: 400,
      tribal_tips: 1000, handbooks: 5,
    };
    const subs: SubsystemSVI[] = (systemVariabilityIndexEngine as unknown as {
      _computeSubsystems(c: SVIReport["counts"]): SubsystemSVI[];
    })._computeSubsystems(synthetic);
    expect(subs.length).toBeGreaterThanOrEqual(14);
    const tools = subs.find((s) => s.name === "Tools")!;
    expect(tools.entities).toBe(200);
    expect(tools.variability).toBe(tools.entities * tools.dimensions);
    expect(tools.wired_pct).toBe(100);
    for (const s of subs) {
      expect(s.wired_pct, `${s.name} wired_pct`).toBe(100);
      expect(s.reachable, `${s.name} reachable`).toBe(s.variability);
    }
    expect(derivePsi(subs)).toBe(1);
  });

  it("summary() emits a non-trivial human digest surfacing the headline numbers", () => {
    const out = (systemVariabilityIndexEngine as unknown as { summary(r: SVIReport): string }).summary(report);
    expect(typeof out).toBe("string");
    expect(out.length).toBeGreaterThan(20);
    // The digest must carry the headline figures, not be a stub.
    expect(out).toContain(report.svi_display);
  });
});
