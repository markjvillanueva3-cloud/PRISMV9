/**
 * Tests for StreamVsBatchReconciliationEngine (U-LEARN-02).
 */

import { describe, it, expect, beforeEach, afterAll } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { FeatureStoreEngine } from "../engines/FeatureStoreEngine.js";
import { StreamVsBatchReconciliationEngine } from "../engines/StreamVsBatchReconciliationEngine.js";

function tmpRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "prism-recon-"));
}

describe("StreamVsBatchReconciliationEngine — U-LEARN-02", () => {
  let storeRoot: string;
  let reconRoot: string;
  let store: FeatureStoreEngine;
  let recon: StreamVsBatchReconciliationEngine;
  const cleanups: string[] = [];

  beforeEach(() => {
    storeRoot = tmpRoot();
    reconRoot = tmpRoot();
    store = new FeatureStoreEngine(storeRoot);
    recon = new StreamVsBatchReconciliationEngine(reconRoot, store);
    cleanups.push(storeRoot, reconRoot);
    store.put({
      domain: "mill",
      feature_group: "sf_recommendation",
      feature_group_version: "v1",
      entity_id: "op-1",
      event_ts: "2026-04-24T10:00:00Z",
      feature_values: {
        rpm: 8000,
        sfm: 300,
        material_code: "AL-6061",
        flutes: 4,
        note: "baseline",
      },
    });
  });

  afterAll(() => {
    for (const r of cleanups) {
      try { fs.rmSync(r, { recursive: true, force: true }); } catch { /* ignore */ }
    }
  });

  // ────────────────────────────────────────────────────────────────────
  // reconcile — happy path + drift
  // ────────────────────────────────────────────────────────────────────

  describe("reconcile", () => {
    it("returns verdict=aligned when online matches offline exactly", () => {
      const res = recon.reconcile({
        domain: "mill",
        feature_group: "sf_recommendation",
        entity_id: "op-1",
        as_of_ts: "2026-04-24T11:00:00Z",
        online_values: {
          rpm: 8000,
          sfm: 300,
          material_code: "AL-6061",
          flutes: 4,
          note: "baseline",
        },
      });
      expect(res.ok).toBe(true);
      expect(res.overall_verdict).toBe("aligned");
      expect(res.comparisons.every((c) => c.verdict === "aligned")).toBe(true);
    });

    it("detects drift when a numeric value differs beyond rel_tolerance", () => {
      const res = recon.reconcile({
        domain: "mill",
        feature_group: "sf_recommendation",
        entity_id: "op-1",
        as_of_ts: "2026-04-24T11:00:00Z",
        online_values: {
          rpm: 9000,   // 12.5% drift vs offline 8000
          sfm: 300,
          material_code: "AL-6061",
          flutes: 4,
          note: "baseline",
        },
      });
      expect(res.overall_verdict).toBe("drift");
      const rpmComp = res.comparisons.find((c) => c.key === "rpm");
      expect(rpmComp?.verdict).toBe("drift");
      expect(rpmComp?.abs_delta).toBe(1000);
      expect(rpmComp?.rel_delta).toBe(0.125);
    });

    it("honours per-key rel_tolerance to suppress noise", () => {
      const res = recon.reconcile({
        domain: "mill",
        feature_group: "sf_recommendation",
        entity_id: "op-1",
        as_of_ts: "2026-04-24T11:00:00Z",
        online_values: {
          rpm: 8080,   // 1% drift
          sfm: 300,
          material_code: "AL-6061",
          flutes: 4,
          note: "baseline",
        },
        tolerances: { rpm: { rel: 0.02 } },  // 2% allowed — should pass
      });
      expect(res.overall_verdict).toBe("aligned");
      const rpmComp = res.comparisons.find((c) => c.key === "rpm");
      expect(rpmComp?.verdict).toBe("aligned");
    });

    it("honours per-key abs_tolerance for near-zero baselines", () => {
      // Override the seed to include a feature near zero
      store.put({
        domain: "mill",
        feature_group: "sf_recommendation",
        feature_group_version: "v1",
        entity_id: "op-2",
        event_ts: "2026-04-24T10:00:00Z",
        feature_values: { rpm: 8000, sfm: 300, material_code: "AL", flutes: 4, runout_mm: 0.0001 },
      });
      const res = recon.reconcile({
        domain: "mill",
        feature_group: "sf_recommendation",
        entity_id: "op-2",
        as_of_ts: "2026-04-24T11:00:00Z",
        online_values: { rpm: 8000, sfm: 300, material_code: "AL", flutes: 4, runout_mm: 0.0003 },
        tolerances: { runout_mm: { abs: 0.001 } },
      });
      const runoutComp = res.comparisons.find((c) => c.key === "runout_mm");
      expect(runoutComp?.verdict).toBe("aligned");
      expect(res.overall_verdict).toBe("aligned");
    });

    it("detects string drift via deep equality", () => {
      const res = recon.reconcile({
        domain: "mill",
        feature_group: "sf_recommendation",
        entity_id: "op-1",
        as_of_ts: "2026-04-24T11:00:00Z",
        online_values: {
          rpm: 8000,
          sfm: 300,
          material_code: "AL-7075",  // was AL-6061
          flutes: 4,
          note: "baseline",
        },
      });
      expect(res.overall_verdict).toBe("drift");
      const matComp = res.comparisons.find((c) => c.key === "material_code");
      expect(matComp?.verdict).toBe("drift");
    });

    it("reports missing_online when online omits a key that offline has", () => {
      const res = recon.reconcile({
        domain: "mill",
        feature_group: "sf_recommendation",
        entity_id: "op-1",
        as_of_ts: "2026-04-24T11:00:00Z",
        online_values: {
          rpm: 8000,
          sfm: 300,
          material_code: "AL-6061",
          // flutes + note omitted
        },
      });
      expect(res.overall_verdict).toBe("missing_online");
      const flutesComp = res.comparisons.find((c) => c.key === "flutes");
      expect(flutesComp?.verdict).toBe("missing_online");
    });

    it("reports missing_offline when the entity_id has no offline row", () => {
      const res = recon.reconcile({
        domain: "mill",
        feature_group: "sf_recommendation",
        entity_id: "op-never-observed",
        as_of_ts: "2026-04-24T11:00:00Z",
        online_values: { rpm: 8000, sfm: 300 },
      });
      expect(res.overall_verdict).toBe("missing_offline");
    });

    it("ignore_keys excludes a key from both comparison and verdict rollup", () => {
      // `note` drifts but should be ignored
      const res = recon.reconcile({
        domain: "mill",
        feature_group: "sf_recommendation",
        entity_id: "op-1",
        as_of_ts: "2026-04-24T11:00:00Z",
        online_values: {
          rpm: 8000,
          sfm: 300,
          material_code: "AL-6061",
          flutes: 4,
          note: "drifted-but-ignored",
        },
        ignore_keys: ["note"],
      });
      expect(res.overall_verdict).toBe("aligned");
      expect(res.comparisons.some((c) => c.key === "note")).toBe(false);
    });
  });

  // ────────────────────────────────────────────────────────────────────
  // Persistence + query
  // ────────────────────────────────────────────────────────────────────

  describe("persistence", () => {
    it("appends report to <domain>/<group>.jsonl by default", () => {
      recon.reconcile({
        domain: "mill",
        feature_group: "sf_recommendation",
        entity_id: "op-1",
        as_of_ts: "2026-04-24T11:00:00Z",
        online_values: { rpm: 8000, sfm: 300, material_code: "AL-6061", flutes: 4, note: "baseline" },
      });
      const p = path.join(reconRoot, "mill", "sf_recommendation.jsonl");
      expect(fs.existsSync(p)).toBe(true);
      const lines = fs.readFileSync(p, "utf8").split(/\r?\n/).filter(Boolean);
      expect(lines).toHaveLength(1);
      const parsed = JSON.parse(lines[0]);
      expect(parsed.entity_id).toBe("op-1");
      expect(parsed.overall_verdict).toBe("aligned");
    });

    it("persist: false skips the log append", () => {
      const res = recon.reconcile({
        domain: "mill",
        feature_group: "sf_recommendation",
        entity_id: "op-1",
        as_of_ts: "2026-04-24T11:00:00Z",
        online_values: { rpm: 8000, sfm: 300, material_code: "AL-6061", flutes: 4, note: "baseline" },
        persist: false,
      });
      expect(res.ok).toBe(true);
      const p = path.join(reconRoot, "mill", "sf_recommendation.jsonl");
      expect(fs.existsSync(p)).toBe(false);
    });

    it("query returns reports newest-first bounded by limit", () => {
      for (let i = 0; i < 5; i++) {
        recon.reconcile({
          domain: "mill",
          feature_group: "sf_recommendation",
          entity_id: "op-1",
          as_of_ts: `2026-04-24T1${i}:00:00Z`,
          online_values: { rpm: 8000, sfm: 300, material_code: "AL-6061", flutes: 4, note: "baseline" },
        });
      }
      const last3 = recon.query("mill", "sf_recommendation", 3);
      expect(last3).toHaveLength(3);
      expect(last3[0].as_of_ts).toBe("2026-04-24T14:00:00Z");
      expect(last3[2].as_of_ts).toBe("2026-04-24T12:00:00Z");
    });
  });

  // ────────────────────────────────────────────────────────────────────
  // Stats across multiple domains
  // ────────────────────────────────────────────────────────────────────

  it("stats roll up by verdict and by domain across multiple feature groups", () => {
    // Seed a lathe feature
    store.put({
      domain: "lathe",
      feature_group: "turning_sf",
      feature_group_version: "v1",
      entity_id: "t-1",
      event_ts: "2026-04-24T10:00:00Z",
      feature_values: { sfm: 400, ipr: 0.012 },
    });

    recon.reconcile({
      domain: "mill",
      feature_group: "sf_recommendation",
      entity_id: "op-1",
      as_of_ts: "2026-04-24T11:00:00Z",
      online_values: { rpm: 8000, sfm: 300, material_code: "AL-6061", flutes: 4, note: "baseline" },
    });
    recon.reconcile({
      domain: "mill",
      feature_group: "sf_recommendation",
      entity_id: "op-1",
      as_of_ts: "2026-04-24T11:05:00Z",
      online_values: { rpm: 9500, sfm: 300, material_code: "AL-6061", flutes: 4, note: "baseline" },  // drift
    });
    recon.reconcile({
      domain: "lathe",
      feature_group: "turning_sf",
      entity_id: "t-1",
      as_of_ts: "2026-04-24T11:00:00Z",
      online_values: { sfm: 400, ipr: 0.012 },
    });
    recon.reconcile({
      domain: "lathe",
      feature_group: "turning_sf",
      entity_id: "t-missing",
      as_of_ts: "2026-04-24T11:00:00Z",
      online_values: { sfm: 400 },
    });

    const s = recon.stats();
    expect(s.total_reports).toBe(4);
    expect(s.by_verdict.aligned).toBe(2);
    expect(s.by_verdict.drift).toBe(1);
    expect(s.by_verdict.missing_offline).toBe(1);
    expect(s.domains.mill).toBe(2);
    expect(s.domains.lathe).toBe(2);
  });

  // ────────────────────────────────────────────────────────────────────
  // Failure modes — never-throw
  // ────────────────────────────────────────────────────────────────────

  describe("failure modes (never-throw)", () => {
    it("handles empty online_values gracefully", () => {
      const res = recon.reconcile({
        domain: "mill",
        feature_group: "sf_recommendation",
        entity_id: "op-1",
        as_of_ts: "2026-04-24T11:00:00Z",
        online_values: {},
      });
      expect(res.ok).toBe(true);
      expect(res.overall_verdict).toBe("missing_online");
    });

    it("handles NaN numerics by rolling up to drift (abs_delta NaN fails tolerance)", () => {
      const res = recon.reconcile({
        domain: "mill",
        feature_group: "sf_recommendation",
        entity_id: "op-1",
        as_of_ts: "2026-04-24T11:00:00Z",
        online_values: { rpm: NaN, sfm: 300, material_code: "AL-6061", flutes: 4, note: "baseline" },
      });
      expect(res.overall_verdict).toBe("drift");
      const rpmComp = res.comparisons.find((c) => c.key === "rpm");
      expect(rpmComp?.verdict).toBe("drift");
    });
  });

  // ────────────────────────────────────────────────────────────────────
  // Self-awareness
  // ────────────────────────────────────────────────────────────────────

  it("getSelfAwareness() reports capabilities and dependencies", () => {
    const sa = StreamVsBatchReconciliationEngine.getSelfAwareness();
    expect(sa.name).toBe("StreamVsBatchReconciliationEngine");
    expect(sa.capabilities).toContain("reconcile");
    expect(sa.capabilities).toContain("query");
    expect(sa.dependencies).toContain("FeatureStoreEngine");
  });
});
