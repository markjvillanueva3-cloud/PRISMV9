/**
 * Tests for businessDispatcher LoRAAdapterRegistry + InferenceLoRAGate actions
 * (PSAU P2.5-LEARN U-LEARN-07 — the belt).
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { businessDispatch } from "../../tools/dispatchers/businessDispatcher.js";

const REGISTRY_FILE = path.resolve(process.cwd(), "state/adapters/registry.jsonl");
const BACKUP = REGISTRY_FILE + ".psau-test-backup";

function backup(): void { if (fs.existsSync(REGISTRY_FILE)) fs.renameSync(REGISTRY_FILE, BACKUP); }
function restore(): void {
  if (fs.existsSync(REGISTRY_FILE)) fs.rmSync(REGISTRY_FILE);
  if (fs.existsSync(BACKUP)) fs.renameSync(BACKUP, REGISTRY_FILE);
}

describe("businessDispatcher — LoRAAdapterRegistry + InferenceLoRAGate (U-LEARN-07)", () => {
  beforeAll(backup);
  afterAll(restore);

  it("adapter_register: writes a valid adapter", async () => {
    const r = await businessDispatch({
      action: "adapter_register",
      adapter_id: "bd-test-1",
      domain: "mill",
      version: "v1",
      context: { material: "D2", operation: "roughing" },
      residual: { sfm: { kind: "additive", value: -20 } },
      status: "active",
    });
    expect(r.success).toBe(true);
  });

  it("adapter_register: rejects bad version", async () => {
    const r = await businessDispatch({
      action: "adapter_register",
      adapter_id: "bd-bad",
      domain: "mill",
      version: "1.0",
      context: {},
    });
    expect(r.success).toBe(false);
  });

  it("adapter_set_status: transitions staged → active", async () => {
    await businessDispatch({
      action: "adapter_register",
      adapter_id: "bd-set-status",
      domain: "lathe",
      version: "v1",
      context: { material: "M2" },
      status: "staged",
    });
    const r = await businessDispatch({
      action: "adapter_set_status",
      adapter_id: "bd-set-status",
      status: "active",
    });
    expect(r.success).toBe(true);
  });

  it("adapter_set_status: rejects unknown adapter", async () => {
    const r = await businessDispatch({
      action: "adapter_set_status",
      adapter_id: "missing-xyz",
      status: "active",
    });
    expect(r.success).toBe(false);
    expect(r.error).toContain("unknown");
  });

  it("adapter_resolve: returns the best-matching adapter", async () => {
    await businessDispatch({
      action: "adapter_register",
      adapter_id: "bd-resolve-exact",
      domain: "wedm",
      version: "v1",
      context: { material: "carbide", operation: "first_cut", machine: "mitsubishi-mv1200r" },
      residual: { power_w: { kind: "additive", value: 5 } },
      status: "active",
    });
    const r = await businessDispatch({
      action: "adapter_resolve",
      domain: "wedm",
      context: { material: "carbide", operation: "first_cut", machine: "mitsubishi-mv1200r" },
    });
    expect(r.success).toBe(true);
    const d = r.data as any;
    expect(d.adapter?.adapter_id).toBe("bd-resolve-exact");
  });

  it("adapter_resolve: returns null when nothing matches", async () => {
    const r = await businessDispatch({
      action: "adapter_resolve",
      domain: "grinder",
      context: { material: "unobtainium" },
    });
    const d = r.data as any;
    expect(d.adapter).toBeNull();
  });

  it("adapter_list: filters by domain", async () => {
    const r = await businessDispatch({ action: "adapter_list", domain: "mill" });
    expect(r.success).toBe(true);
    const d = r.data as any;
    expect(Array.isArray(d.adapters)).toBe(true);
  });

  it("adapter_stats: reports totals", async () => {
    const r = await businessDispatch({ action: "adapter_stats" });
    expect(r.success).toBe(true);
    const d = r.data as any;
    expect(typeof d.total).toBe("number");
    expect(d.total).toBeGreaterThan(0);
  });

  it("inference_gate_apply: passes baseline through when no adapter matches", async () => {
    const r = await businessDispatch({
      action: "inference_gate_apply",
      engine_name: "Kienzle",
      domain: "sinker_edm",                              // no adapter for this domain
      context: { material: "graphite" },
      baseline: { force: 150, power: 3500 },
    });
    expect(r.success).toBe(true);
    const d = r.data as any;
    expect(d.adapter_used).toBeNull();
    expect(d.adapted.force).toBe(150);
    expect(d.adapted.power).toBe(3500);
    expect(d.provenance.engine_name).toBe("Kienzle");
  });

  it("inference_gate_apply: applies additive residual when adapter exists", async () => {
    // Relies on bd-test-1 (mill/D2/roughing/additive sfm=-20)
    const r = await businessDispatch({
      action: "inference_gate_apply",
      engine_name: "SpeedFeed",
      domain: "mill",
      context: { material: "D2", operation: "roughing" },
      baseline: { sfm: 120 },
    });
    const d = r.data as any;
    expect(d.adapter_used).toBe("bd-test-1");
    expect(d.adapted.sfm).toBe(100);
    expect(d.residual_applied.sfm).toBe(-20);
  });

  it("inference_gate_apply: rejects missing domain", async () => {
    const r = await businessDispatch({
      action: "inference_gate_apply",
      engine_name: "SpeedFeed",
      context: { material: "D2" },
      baseline: { sfm: 120 },
    });
    expect(r.success).toBe(false);
  });

  it("adapter_rollback: restores archived peer (integration)", async () => {
    // Register v1 active, then v2 active (v1 archived), then rollback.
    await businessDispatch({
      action: "adapter_register",
      adapter_id: "rb-v1", domain: "laser", version: "v1",
      context: { material: "steel", machine: "L1" }, status: "active",
    });
    await businessDispatch({
      action: "adapter_register",
      adapter_id: "rb-v2", domain: "laser", version: "v2",
      context: { material: "steel", machine: "L1" }, status: "active",
    });
    const r = await businessDispatch({
      action: "adapter_rollback",
      domain: "laser",
      context: { material: "steel", machine: "L1" },
    });
    expect(r.success).toBe(true);
    const d = r.data as any;
    expect(d.adapter_id).toBe("rb-v1");
  });
});
