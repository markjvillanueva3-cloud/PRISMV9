/**
 * Tests for InferenceLoRAGateEngine (U-LEARN-07).
 *
 * Proves:
 *   - baseline passes through unchanged when no adapter matches
 *   - additive / multiplicative / replace / clamp residuals work correctly
 *   - provenance tags every call with engine_name + domain + context + gate_version
 *   - lineage_id threads through
 *   - never-throw on bad input
 */

import { describe, it, expect, beforeEach, afterAll } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { LoRAAdapterRegistryEngine } from "../engines/LoRAAdapterRegistryEngine.js";
import { InferenceLoRAGateEngine } from "../engines/InferenceLoRAGateEngine.js";

function tmpRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "prism-gate-"));
}

describe("InferenceLoRAGateEngine — U-LEARN-07", () => {
  let root: string;
  let registry: LoRAAdapterRegistryEngine;
  let gate: InferenceLoRAGateEngine;
  const cleanups: string[] = [];

  beforeEach(() => {
    root = tmpRoot();
    registry = new LoRAAdapterRegistryEngine(root);
    gate = new InferenceLoRAGateEngine(registry);
    cleanups.push(root);
  });

  afterAll(() => {
    for (const r of cleanups) {
      try { fs.rmSync(r, { recursive: true, force: true }); } catch { /* ignore */ }
    }
  });

  it("no adapter → baseline passes through unchanged", () => {
    const res = gate.apply({
      engine_name: "SpeedFeed",
      domain: "mill",
      context: { material: "unknown" },
      baseline: { sfm: 120, ipt: 0.003, doc: 0.05 },
    });
    expect(res.adapted).toEqual(res.baseline);
    expect(res.adapter_used).toBeNull();
    expect(res.confidence).toBe(0);
  });

  it("provenance present on every call", () => {
    const res = gate.apply({
      engine_name: "SpeedFeed",
      domain: "mill",
      context: { material: "D2" },
      baseline: { sfm: 120 },
    });
    expect(res.provenance.engine_name).toBe("SpeedFeed");
    expect(res.provenance.domain).toBe("mill");
    expect(res.provenance.gate_version).toBe("1.0.0");
    expect(res.provenance.timestamp).toBeTruthy();
  });

  it("lineage_id threads through provenance", () => {
    const lid = "LNG-TEST-1";
    const res = gate.apply({
      engine_name: "Kienzle",
      domain: "mill",
      context: { material: "D2" },
      baseline: { force: 300 },
      lineage_id: lid,
    });
    expect(res.provenance.lineage_id).toBe(lid);
  });

  it("additive residual applies correctly", () => {
    registry.register({
      adapter_id: "additive-adapter",
      domain: "mill",
      version: "v1",
      context: { material: "D2" },
      residual: { sfm: { kind: "additive", value: -25 } },
      status: "active",
    });
    const res = gate.apply({
      engine_name: "SpeedFeed",
      domain: "mill",
      context: { material: "D2" },
      baseline: { sfm: 120 },
    });
    expect(res.adapted.sfm).toBe(95);
    expect(res.residual_applied.sfm).toBe(-25);
    expect(res.adapter_used).toBe("additive-adapter");
    expect(res.adapter_status).toBe("active");
  });

  it("multiplicative residual applies correctly", () => {
    registry.register({
      adapter_id: "multi-adapter",
      domain: "lathe",
      version: "v1",
      context: { material: "D2" },
      residual: { sfm: { kind: "multiplicative", value: 0.9 } },
      status: "active",
    });
    const res = gate.apply({
      engine_name: "SpeedFeed",
      domain: "lathe",
      context: { material: "D2" },
      baseline: { sfm: 200 },
    });
    expect(res.adapted.sfm).toBeCloseTo(180, 5);
  });

  it("replace residual overrides baseline", () => {
    registry.register({
      adapter_id: "replace-adapter",
      domain: "mill",
      version: "v1",
      context: { material: "6061-T6" },
      residual: { sfm: { kind: "replace", value: 600 } },
      status: "active",
    });
    const res = gate.apply({
      engine_name: "SpeedFeed",
      domain: "mill",
      context: { material: "6061-T6" },
      baseline: { sfm: 120 },
    });
    expect(res.adapted.sfm).toBe(600);
  });

  it("clamp residual bounds the baseline", () => {
    registry.register({
      adapter_id: "clamp-adapter",
      domain: "mill",
      version: "v1",
      context: { material: "D2" },
      residual: { sfm: { kind: "clamp", min: 50, max: 200 } },
      status: "active",
    });
    const low = gate.apply({
      engine_name: "SpeedFeed", domain: "mill",
      context: { material: "D2" }, baseline: { sfm: 10 },
    });
    expect(low.adapted.sfm).toBe(50);
    const high = gate.apply({
      engine_name: "SpeedFeed", domain: "mill",
      context: { material: "D2" }, baseline: { sfm: 500 },
    });
    expect(high.adapted.sfm).toBe(200);
    const midd = gate.apply({
      engine_name: "SpeedFeed", domain: "mill",
      context: { material: "D2" }, baseline: { sfm: 120 },
    });
    expect(midd.adapted.sfm).toBe(120);
  });

  it("residual only applies to fields present in baseline", () => {
    registry.register({
      adapter_id: "partial",
      domain: "mill",
      version: "v1",
      context: { material: "D2" },
      residual: {
        sfm: { kind: "additive", value: -20 },
        ipt: { kind: "multiplicative", value: 0.8 },
      },
      status: "active",
    });
    const res = gate.apply({
      engine_name: "SpeedFeed",
      domain: "mill",
      context: { material: "D2" },
      baseline: { sfm: 120 },           // only sfm — no ipt
    });
    expect(res.adapted.sfm).toBe(100);
    expect(res.adapted.ipt).toBeUndefined();
    expect(res.residual_applied.sfm).toBe(-20);
    expect(res.residual_applied.ipt).toBeUndefined();
  });

  it("canary adapters are used", () => {
    registry.register({
      adapter_id: "canary",
      domain: "mill",
      version: "v2",
      context: { material: "D2" },
      residual: { sfm: { kind: "additive", value: -10 } },
      status: "canary",
      confidence: 0.65,
    });
    const res = gate.apply({
      engine_name: "SpeedFeed", domain: "mill",
      context: { material: "D2" }, baseline: { sfm: 120 },
    });
    expect(res.adapter_used).toBe("canary");
    expect(res.adapter_status).toBe("canary");
    expect(res.confidence).toBe(0.65);
  });

  it("archived adapters are NOT used", () => {
    registry.register({
      adapter_id: "old",
      domain: "mill",
      version: "v1",
      context: { material: "D2" },
      residual: { sfm: { kind: "additive", value: -99 } },
      status: "archived",
    });
    const res = gate.apply({
      engine_name: "SpeedFeed", domain: "mill",
      context: { material: "D2" }, baseline: { sfm: 120 },
    });
    expect(res.adapter_used).toBeNull();
    expect(res.adapted.sfm).toBe(120);
  });

  it("never throws on bad input (missing required fields)", () => {
    expect(() =>
      gate.apply({
        engine_name: "",
        // @ts-expect-error — missing domain
        domain: undefined,
        context: {},
        baseline: { sfm: 120 },
      }),
    ).not.toThrow();
  });

  it("baseline is copied not mutated in place", () => {
    registry.register({
      adapter_id: "immut",
      domain: "mill",
      version: "v1",
      context: { material: "D2" },
      residual: { sfm: { kind: "additive", value: -10 } },
      status: "active",
    });
    const baseline = { sfm: 120 };
    const res = gate.apply({
      engine_name: "SpeedFeed", domain: "mill",
      context: { material: "D2" }, baseline,
    });
    expect(baseline.sfm).toBe(120);        // NOT mutated
    expect(res.adapted.sfm).toBe(110);
    expect(res.baseline.sfm).toBe(120);
  });

  it("self-awareness metadata surfaced", () => {
    const meta = InferenceLoRAGateEngine.getSelfAwareness();
    expect(meta.name).toBe("InferenceLoRAGateEngine");
    expect(meta.capabilities).toContain("apply");
  });
});
