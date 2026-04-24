/**
 * Tests for DataQualityEngine (U-LEARN-02).
 */

import { describe, it, expect, beforeEach, afterAll } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { FeatureRegistryEngine } from "../engines/FeatureRegistryEngine.js";
import { DataQualityEngine } from "../engines/DataQualityEngine.js";
import type { RegisterContractInput } from "../schemas/featureRegistrySchema.js";

function tmpRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "prism-dq-"));
}

function millContract(overrides: Partial<RegisterContractInput> = {}): RegisterContractInput {
  return {
    domain: "mill",
    feature_group: "sf_recommendation",
    feature_group_version: "v1",
    required_keys: ["rpm", "sfm", "material_code", "machine_class"],
    features: [
      { name: "rpm", type: "number", nullable: false, range: [100, 24000] },
      { name: "sfm", type: "number", nullable: false, range: [10, 5000] },
      { name: "material_code", type: "string", nullable: false, regex: "^[A-Z0-9-]{2,16}$" },
      { name: "machine_class", type: "categorical", nullable: false, categories: ["vmc", "hmc", "swiss"] },
      { name: "note", type: "string", nullable: true },
      { name: "flutes", type: "integer", nullable: true, range: [1, 12] },
      {
        name: "cut_load",
        type: "number",
        nullable: true,
        range: [0, 1],
        drift: { psi_red: 0.25, psi_yellow: 0.10, ks_red: 0.20 },
      },
    ],
    sealed: false,
    ...overrides,
  };
}

function findingFor(findings: { feature: string; rule: string }[], feature: string, rule: string) {
  const f = findings.find((x) => x.feature === feature && x.rule === rule);
  if (!f) throw new Error(`expected finding for feature=${feature} rule=${rule}, got ${JSON.stringify(findings)}`);
  return f;
}

describe("DataQualityEngine — U-LEARN-02", () => {
  let root: string;
  let registry: FeatureRegistryEngine;
  let dq: DataQualityEngine;
  const cleanups: string[] = [];

  beforeEach(() => {
    root = tmpRoot();
    registry = new FeatureRegistryEngine(root);
    dq = new DataQualityEngine(registry);
    cleanups.push(root);
    const reg = registry.register(millContract());
    expect(reg.ok).toBe(true);
  });

  afterAll(() => {
    for (const r of cleanups) {
      try { fs.rmSync(r, { recursive: true, force: true }); } catch { /* ignore */ }
    }
  });

  // ────────────────────────────────────────────────────────────────────
  // validateRow — happy + negative paths
  // ────────────────────────────────────────────────────────────────────

  describe("validateRow", () => {
    it("returns verdict=green + blocked=false for a fully conforming row", () => {
      const res = dq.validateRow({
        domain: "mill",
        feature_group: "sf_recommendation",
        feature_values: {
          rpm: 8500,
          sfm: 300,
          material_code: "AL-6061",
          machine_class: "vmc",
          flutes: 4,
        },
      });
      expect(res.verdict).toBe("green");
      expect(res.blocked).toBe(false);
      expect(res.findings).toHaveLength(0);
      expect(res.contract_version).toBe("v1");
    });

    it("returns verdict=red + blocked=true when a required key is missing", () => {
      const res = dq.validateRow({
        domain: "mill",
        feature_group: "sf_recommendation",
        feature_values: { rpm: 8500, sfm: 300, material_code: "AL-6061" },
      });
      expect(res.verdict).toBe("red");
      expect(res.blocked).toBe(true);
      const required = findingFor(res.findings, "machine_class", "required");
      expect(required.severity).toBe("error");
      expect(required.message).toMatch(/machine_class.*missing/i);
    });

    it("returns verdict=red when a numeric value is below range", () => {
      const res = dq.validateRow({
        domain: "mill",
        feature_group: "sf_recommendation",
        feature_values: { rpm: 50, sfm: 300, material_code: "AL-6061", machine_class: "vmc" },
      });
      expect(res.verdict).toBe("red");
      expect(res.blocked).toBe(true);
      const range = findingFor(res.findings, "rpm", "range");
      expect(range.actual).toBe(50);
      expect(range.expected).toEqual([100, 24000]);
    });

    it("returns verdict=red when a numeric value is above range", () => {
      const res = dq.validateRow({
        domain: "mill",
        feature_group: "sf_recommendation",
        feature_values: { rpm: 30000, sfm: 300, material_code: "AL-6061", machine_class: "vmc" },
      });
      expect(res.verdict).toBe("red");
      const range = findingFor(res.findings, "rpm", "range");
      expect(range.actual).toBe(30000);
    });

    it("returns verdict=red when type mismatches (string where number expected)", () => {
      const res = dq.validateRow({
        domain: "mill",
        feature_group: "sf_recommendation",
        feature_values: { rpm: "eight-thousand", sfm: 300, material_code: "AL-6061", machine_class: "vmc" },
      });
      expect(res.verdict).toBe("red");
      const schema = findingFor(res.findings, "rpm", "schema");
      expect(schema.message).toMatch(/number.*string/i);
    });

    it("rejects null on non-nullable feature", () => {
      const res = dq.validateRow({
        domain: "mill",
        feature_group: "sf_recommendation",
        feature_values: { rpm: null, sfm: 300, material_code: "AL-6061", machine_class: "vmc" },
      });
      expect(res.verdict).toBe("red");
      const nullability = findingFor(res.findings, "rpm", "nullability");
      expect(nullability.severity).toBe("error");
    });

    it("accepts null on nullable feature (green)", () => {
      const res = dq.validateRow({
        domain: "mill",
        feature_group: "sf_recommendation",
        feature_values: {
          rpm: 8500, sfm: 300, material_code: "AL-6061", machine_class: "vmc",
          note: null, flutes: null,
        },
      });
      expect(res.verdict).toBe("green");
      expect(res.blocked).toBe(false);
    });

    it("rejects value outside categorical enum", () => {
      const res = dq.validateRow({
        domain: "mill",
        feature_group: "sf_recommendation",
        feature_values: { rpm: 8500, sfm: 300, material_code: "AL-6061", machine_class: "router" },
      });
      expect(res.verdict).toBe("red");
      const cat = findingFor(res.findings, "machine_class", "categories");
      expect(cat.actual).toBe("router");
      expect(cat.expected).toEqual(["vmc", "hmc", "swiss"]);
    });

    it("rejects string that fails regex pattern", () => {
      const res = dq.validateRow({
        domain: "mill",
        feature_group: "sf_recommendation",
        feature_values: { rpm: 8500, sfm: 300, material_code: "some lowercase junk!", machine_class: "vmc" },
      });
      expect(res.verdict).toBe("red");
      const regex = findingFor(res.findings, "material_code", "regex");
      expect(regex.actual).toBe("some lowercase junk!");
    });

    it("rejects integer type when value is non-integer number", () => {
      const res = dq.validateRow({
        domain: "mill",
        feature_group: "sf_recommendation",
        feature_values: {
          rpm: 8500, sfm: 300, material_code: "AL-6061", machine_class: "vmc",
          flutes: 4.5,
        },
      });
      expect(res.verdict).toBe("red");
      const schema = findingFor(res.findings, "flutes", "schema");
      expect(schema.actual).toBe(4.5);
    });

    it("returns verdict=red + blocked=true when contract is not registered", () => {
      const res = dq.validateRow({
        domain: "mill",
        feature_group: "never_registered",
        feature_values: { x: 1 },
      });
      expect(res.verdict).toBe("red");
      expect(res.blocked).toBe(true);
      expect(res.findings).toHaveLength(1);
      expect(res.findings[0].rule).toBe("schema");
      expect(res.findings[0].message).toMatch(/no contract registered/i);
    });

    it("rejects NaN as a numeric value", () => {
      const nanRes = dq.validateRow({
        domain: "mill",
        feature_group: "sf_recommendation",
        feature_values: { rpm: NaN, sfm: 300, material_code: "AL-6061", machine_class: "vmc" },
      });
      expect(nanRes.verdict).toBe("red");
      const schema = findingFor(nanRes.findings, "rpm", "schema");
      expect(schema.severity).toBe("error");
    });

    it("rejects Infinity as a numeric value", () => {
      const infRes = dq.validateRow({
        domain: "mill",
        feature_group: "sf_recommendation",
        feature_values: { rpm: Infinity, sfm: 300, material_code: "AL-6061", machine_class: "vmc" },
      });
      expect(infRes.verdict).toBe("red");
      const schema = findingFor(infRes.findings, "rpm", "schema");
      expect(schema.severity).toBe("error");
    });
  });

  // ────────────────────────────────────────────────────────────────────
  // validateBatch + drift
  // ────────────────────────────────────────────────────────────────────

  describe("validateBatch", () => {
    it("counts red/yellow/green rows and returns sampled findings", () => {
      const rows = [
        { entity_id: "e1", feature_values: { rpm: 8500, sfm: 300, material_code: "AL-6061", machine_class: "vmc" } },
        { entity_id: "e2", feature_values: { rpm: 50, sfm: 300, material_code: "AL-6061", machine_class: "vmc" } },
        { entity_id: "e3", feature_values: { rpm: 12000, sfm: 300, material_code: "AL-6061", machine_class: "hmc" } },
        { entity_id: "e4", feature_values: { rpm: 99999, sfm: 300, material_code: "AL-6061", machine_class: "vmc" } },
      ];
      const res = dq.validateBatch({ domain: "mill", feature_group: "sf_recommendation", rows });
      expect(res.total_rows).toBe(4);
      expect(res.green_rows).toBe(2);
      expect(res.red_rows).toBe(2);
      expect(res.yellow_rows).toBe(0);
      expect(res.verdict).toBe("red");
      expect(res.blocked).toBe(true);
      expect(res.findings_sample).toHaveLength(2);
      expect(res.findings_sample[0].entity_id).toBe("e2");
      expect(res.findings_sample[1].entity_id).toBe("e4");
    });

    it("detects drift when PSI > psi_red (shifted distribution)", () => {
      const ref = Array.from({ length: 100 }, () => Math.random() * 0.3);
      const cur = Array.from({ length: 100 }, () => 0.7 + Math.random() * 0.3);
      const res = dq.validateBatch({
        domain: "mill",
        feature_group: "sf_recommendation",
        rows: [{ feature_values: { rpm: 8500, sfm: 300, material_code: "AL-6061", machine_class: "vmc" } }],
        reference_distribution: { cut_load: ref },
        current_distribution: { cut_load: cur },
      });
      expect(res.drift.cut_load.psi).toBeGreaterThan(0.25);
      expect(res.drift.cut_load.verdict).toBe("red");
      expect(res.verdict).toBe("red");
      expect(res.blocked).toBe(true);
    });

    it("detects drift via KS when distributions are disjoint", () => {
      const ref = Array.from({ length: 50 }, (_, i) => i * 0.01);
      const cur = Array.from({ length: 50 }, (_, i) => 0.6 + i * 0.008);
      const res = dq.validateBatch({
        domain: "mill",
        feature_group: "sf_recommendation",
        rows: [{ feature_values: { rpm: 8500, sfm: 300, material_code: "AL-6061", machine_class: "vmc" } }],
        reference_distribution: { cut_load: ref },
        current_distribution: { cut_load: cur },
      });
      expect(res.drift.cut_load.ks).toBeGreaterThan(0.2);
      expect(res.drift.cut_load.verdict).toBe("red");
    });

    it("returns verdict=green when rows + distributions all pass", () => {
      const goodRef = Array.from({ length: 50 }, () => 0.5);
      const goodCur = Array.from({ length: 50 }, () => 0.5);
      const res = dq.validateBatch({
        domain: "mill",
        feature_group: "sf_recommendation",
        rows: [
          { feature_values: { rpm: 8500, sfm: 300, material_code: "AL-6061", machine_class: "vmc" } },
          { feature_values: { rpm: 12000, sfm: 250, material_code: "SS-304", machine_class: "hmc" } },
        ],
        reference_distribution: { cut_load: goodRef },
        current_distribution: { cut_load: goodCur },
      });
      expect(res.verdict).toBe("green");
      expect(res.blocked).toBe(false);
      expect(res.red_rows).toBe(0);
      expect(res.green_rows).toBe(2);
      expect(res.drift.cut_load.verdict).toBe("green");
    });

    it("fails closed when contract is missing (all rows counted as red)", () => {
      const res = dq.validateBatch({
        domain: "mill",
        feature_group: "not_registered",
        rows: [{ feature_values: { x: 1 } }, { feature_values: { x: 2 } }],
      });
      expect(res.verdict).toBe("red");
      expect(res.blocked).toBe(true);
      expect(res.red_rows).toBe(2);
      expect(res.green_rows).toBe(0);
    });
  });

  // ────────────────────────────────────────────────────────────────────
  // Variability — different types
  // ────────────────────────────────────────────────────────────────────

  it("handles boolean + timestamp + json types across different domains", () => {
    const r2 = registry.register({
      domain: "quality",
      feature_group: "fai_result",
      feature_group_version: "v1",
      required_keys: ["passed", "measured_at"],
      features: [
        { name: "passed", type: "boolean", nullable: false },
        { name: "measured_at", type: "timestamp", nullable: false },
        { name: "payload", type: "json", nullable: true },
      ],
      sealed: false,
    });
    expect(r2.ok).toBe(true);

    const good = dq.validateRow({
      domain: "quality",
      feature_group: "fai_result",
      feature_values: {
        passed: true,
        measured_at: "2026-04-24T12:30:00Z",
        payload: { characteristic: "bore_dia", value: 12.001 },
      },
    });
    expect(good.verdict).toBe("green");

    const badTs = dq.validateRow({
      domain: "quality",
      feature_group: "fai_result",
      feature_values: { passed: true, measured_at: "not-a-date" },
    });
    expect(badTs.verdict).toBe("red");
    const ts = findingFor(badTs.findings, "measured_at", "schema");
    expect(ts.severity).toBe("error");

    const badBool = dq.validateRow({
      domain: "quality",
      feature_group: "fai_result",
      feature_values: { passed: "yes", measured_at: "2026-04-24T12:30:00Z" },
    });
    expect(badBool.verdict).toBe("red");
    const b = findingFor(badBool.findings, "passed", "schema");
    expect(b.actual).toBe("yes");
  });

  // ────────────────────────────────────────────────────────────────────
  // Self-awareness
  // ────────────────────────────────────────────────────────────────────

  it("getSelfAwareness() reports capabilities and dependencies", () => {
    const sa = DataQualityEngine.getSelfAwareness();
    expect(sa.name).toBe("DataQualityEngine");
    expect(sa.capabilities).toContain("validateRow");
    expect(sa.capabilities).toContain("validateBatch");
    expect(sa.dependencies).toContain("FeatureRegistryEngine");
  });
});
