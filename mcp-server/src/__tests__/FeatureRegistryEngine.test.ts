/**
 * Tests for FeatureRegistryEngine (U-LEARN-02).
 */

import { describe, it, expect, beforeEach, afterAll } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { FeatureRegistryEngine } from "../engines/FeatureRegistryEngine.js";
import type { RegisterContractInput } from "../schemas/featureRegistrySchema.js";

function tmpRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "prism-fregistry-"));
}

function minimalContract(overrides: Partial<RegisterContractInput> = {}): RegisterContractInput {
  return {
    domain: "mill",
    feature_group: "cut_recommendation_v1",
    feature_group_version: "v1",
    owner: "sf-calibration",
    description: "Speed/feed recommendation features for mill domain",
    required_keys: ["rpm", "sfm"],
    features: [
      { name: "rpm", type: "number", nullable: false, range: [1, 24000] },
      { name: "sfm", type: "number", nullable: false, range: [1, 5000] },
      { name: "material_code", type: "string", nullable: false, regex: "^[A-Z0-9-]{2,16}$" },
      { name: "machine_class", type: "categorical", nullable: false, categories: ["vmc", "hmc", "swiss"] },
    ],
    tags: ["mill", "sfc"],
    sealed: false,
    ...overrides,
  };
}

describe("FeatureRegistryEngine — U-LEARN-02", () => {
  let root: string;
  let engine: FeatureRegistryEngine;
  const cleanups: string[] = [];

  beforeEach(() => {
    root = tmpRoot();
    engine = new FeatureRegistryEngine(root);
    cleanups.push(root);
  });

  afterAll(() => {
    for (const r of cleanups) {
      try { fs.rmSync(r, { recursive: true, force: true }); } catch { /* ignore */ }
    }
  });

  // ────────────────────────────────────────────────────────────────────
  // register() — happy path + persistence
  // ────────────────────────────────────────────────────────────────────

  describe("register", () => {
    it("registers a new contract and writes it to disk under <domain>/<group>.json", () => {
      const res = engine.register(minimalContract());
      expect(res.ok).toBe(true);
      expect(res.path).toBe(path.join(root, "mill", "cut_recommendation_v1.json"));
      expect(fs.existsSync(res.path!)).toBe(true);
      const disk = JSON.parse(fs.readFileSync(res.path!, "utf8"));
      expect(disk.feature_group).toBe("cut_recommendation_v1");
      expect(disk.schemaVersion).toBe("1.0.0");
      expect(typeof disk.created_at).toBe("string");
      expect(typeof disk.updated_at).toBe("string");
    });

    it("preserves created_at when updating an unsealed contract", () => {
      engine.register(minimalContract());
      const first = engine.get("mill", "cut_recommendation_v1").contract!;
      const res2 = engine.register(minimalContract({ description: "updated" }));
      expect(res2.ok).toBe(true);
      const second = engine.get("mill", "cut_recommendation_v1").contract!;
      expect(second.created_at).toBe(first.created_at);
      expect(second.description).toBe("updated");
    });

    it("rejects duplicate feature names in the features array", () => {
      const bad = minimalContract({
        features: [
          { name: "rpm", type: "number", nullable: false },
          { name: "rpm", type: "number", nullable: false },
        ],
        required_keys: ["rpm"],
      });
      const res = engine.register(bad);
      expect(res.ok).toBe(false);
      expect(res.warning).toMatch(/duplicate feature name/i);
    });

    it("rejects required_keys that don't appear in features[]", () => {
      const bad = minimalContract({ required_keys: ["rpm", "sfm", "nonexistent"] });
      const res = engine.register(bad);
      expect(res.ok).toBe(false);
      expect(res.warning).toMatch(/required_key.*nonexistent.*not in features/i);
    });

    it("rejects contract with empty features[] (min 1 required)", () => {
      const bad = minimalContract({ features: [], required_keys: [] });
      const res = engine.register(bad);
      expect(res.ok).toBe(false);
      expect(res.warning).toMatch(/schema/i);
    });

    it("rejects bad version format (must match 'v<N>')", () => {
      const bad = minimalContract({ feature_group_version: "1.0" });
      const res = engine.register(bad);
      expect(res.ok).toBe(false);
      expect(res.warning).toMatch(/schema/i);
    });
  });

  // ────────────────────────────────────────────────────────────────────
  // seal() — immutability
  // ────────────────────────────────────────────────────────────────────

  describe("seal", () => {
    it("seals an unsealed contract and marks it immutable", () => {
      engine.register(minimalContract());
      const sealed = engine.seal("mill", "cut_recommendation_v1");
      expect(sealed.ok).toBe(true);
      expect(sealed.sealed).toBe(true);
      const got = engine.get("mill", "cut_recommendation_v1");
      expect(got.contract!.sealed).toBe(true);
    });

    it("seal on missing contract returns ok:false with 'no contract' warning", () => {
      const res = engine.seal("mill", "nonexistent");
      expect(res.ok).toBe(false);
      expect(res.warning).toMatch(/no contract/i);
    });

    it("seal is idempotent — sealing an already-sealed contract returns ok", () => {
      engine.register(minimalContract({ sealed: true }));
      const res = engine.seal("mill", "cut_recommendation_v1");
      expect(res.ok).toBe(true);
      expect(res.sealed).toBe(true);
    });

    it("rejects register() of DIFFERENT content on a sealed contract", () => {
      engine.register(minimalContract({ sealed: true }));
      const res = engine.register(
        minimalContract({ sealed: true, description: "this will not land" }),
      );
      expect(res.ok).toBe(false);
      expect(res.sealed).toBe(true);
      expect(res.warning).toMatch(/sealed/i);
      const got = engine.get("mill", "cut_recommendation_v1").contract!;
      expect(got.description).not.toBe("this will not land");
    });

    it("accepts register() of IDENTICAL content on a sealed contract (no-op ok)", () => {
      const input = minimalContract({ sealed: true });
      engine.register(input);
      const res = engine.register(input);
      expect(res.ok).toBe(true);
      expect(res.sealed).toBe(true);
    });
  });

  // ────────────────────────────────────────────────────────────────────
  // get / list / stats
  // ────────────────────────────────────────────────────────────────────

  describe("get/list/stats", () => {
    it("get returns ok:false and no contract field populated for unregistered group", () => {
      const res = engine.get("mill", "unregistered");
      expect(res.ok).toBe(false);
      expect(res.contract === undefined || res.contract === null).toBe(true);
      expect(res.warning).toMatch(/no contract/i);
    });

    it("list filters by domain", () => {
      engine.register(minimalContract());
      engine.register(minimalContract({
        domain: "lathe",
        feature_group: "turning_recommendation",
        required_keys: ["rpm"],
        features: [{ name: "rpm", type: "number" }],
      }));
      const mills = engine.list({ domain: "mill" });
      expect(mills).toHaveLength(1);
      expect(mills[0].domain).toBe("mill");
      const lathes = engine.list({ domain: "lathe" });
      expect(lathes).toHaveLength(1);
      expect(lathes[0].domain).toBe("lathe");
    });

    it("list filters by tag", () => {
      engine.register(minimalContract({ tags: ["sfc", "critical"] }));
      engine.register(minimalContract({
        feature_group: "quote_features",
        required_keys: ["rpm"],
        features: [{ name: "rpm", type: "number" }],
        tags: ["quote"],
      }));
      expect(engine.list({ tag: "critical" })).toHaveLength(1);
      expect(engine.list({ tag: "quote" })).toHaveLength(1);
      expect(engine.list({ tag: "nonexistent" })).toHaveLength(0);
    });

    it("list filters by sealed status", () => {
      engine.register(minimalContract({ sealed: true }));
      engine.register(minimalContract({
        feature_group: "unsealed_group",
        sealed: false,
        required_keys: ["rpm"],
        features: [{ name: "rpm", type: "number" }],
      }));
      const sealed = engine.list({ sealed: true });
      const unsealed = engine.list({ sealed: false });
      expect(sealed).toHaveLength(1);
      expect(sealed[0].sealed).toBe(true);
      expect(unsealed).toHaveLength(1);
      expect(unsealed[0].sealed).toBe(false);
    });

    it("stats reports totals + per-domain counts + sealed/unsealed split", () => {
      engine.register(minimalContract({ sealed: true }));
      engine.register(minimalContract({
        domain: "lathe", feature_group: "a",
        required_keys: ["x"], features: [{ name: "x", type: "number" }],
      }));
      engine.register(minimalContract({
        domain: "lathe", feature_group: "b",
        required_keys: ["y"], features: [{ name: "y", type: "number" }],
      }));
      const s = engine.stats();
      expect(s.total).toBe(3);
      expect(s.by_domain.mill).toBe(1);
      expect(s.by_domain.lathe).toBe(2);
      expect(s.sealed).toBe(1);
      expect(s.unsealed).toBe(2);
    });
  });

  // ────────────────────────────────────────────────────────────────────
  // Variability — multiple domains
  // ────────────────────────────────────────────────────────────────────

  it("isolates contracts across 5 domains with no cross-contamination", () => {
    const domains: Array<RegisterContractInput["domain"]> = ["mill", "lathe", "wedm", "grinder", "welder"];
    for (const d of domains) {
      const res = engine.register(minimalContract({
        domain: d,
        feature_group: `${d}_features`,
        required_keys: ["x"],
        features: [{ name: "x", type: "number" }],
      }));
      expect(res.ok).toBe(true);
    }
    const stats = engine.stats();
    expect(stats.total).toBe(5);
    expect(Object.keys(stats.by_domain)).toHaveLength(5);
    for (const d of domains) {
      expect(stats.by_domain[d]).toBe(1);
      const got = engine.get(d, `${d}_features`);
      expect(got.ok).toBe(true);
      expect(got.contract!.domain).toBe(d);
    }
  });

  // ────────────────────────────────────────────────────────────────────
  // Failure modes
  // ────────────────────────────────────────────────────────────────────

  describe("failure modes (never-throw contract)", () => {
    it("does not throw on badly-shaped input", () => {
      // @ts-expect-error — runtime bad input
      expect(() => engine.register({ domain: "mill" })).not.toThrow();
      // @ts-expect-error
      const res = engine.register({ domain: "mill" });
      expect(res.ok).toBe(false);
    });

    it("does not throw when root dir cannot be created (invalid path)", () => {
      const badEngine = new FeatureRegistryEngine("\0:/invalid/\0path");
      expect(() => badEngine.register(minimalContract())).not.toThrow();
      const res = badEngine.register(minimalContract());
      expect(res.ok).toBe(false);
    });
  });

  // ────────────────────────────────────────────────────────────────────
  // Self-awareness
  // ────────────────────────────────────────────────────────────────────

  it("getSelfAwareness() reports capabilities and dependencies", () => {
    const sa = FeatureRegistryEngine.getSelfAwareness();
    expect(sa.name).toBe("FeatureRegistryEngine");
    expect(sa.capabilities).toContain("register");
    expect(sa.capabilities).toContain("seal");
    expect(sa.dependencies).toContain("featureRegistrySchema");
  });
});
