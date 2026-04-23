/**
 * Tests for LoRAAdapterRegistryEngine (U-LEARN-07).
 */

import { describe, it, expect, beforeEach, afterAll } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { LoRAAdapterRegistryEngine } from "../engines/LoRAAdapterRegistryEngine.js";

function tmpRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "prism-lora-"));
}

describe("LoRAAdapterRegistryEngine — U-LEARN-07", () => {
  let root: string;
  let reg: LoRAAdapterRegistryEngine;
  const cleanups: string[] = [];

  beforeEach(() => {
    root = tmpRoot();
    reg = new LoRAAdapterRegistryEngine(root);
    cleanups.push(root);
  });

  afterAll(() => {
    for (const r of cleanups) {
      try { fs.rmSync(r, { recursive: true, force: true }); } catch { /* ignore */ }
    }
  });

  it("register: writes a minimal adapter", () => {
    const res = reg.register({
      adapter_id: "ad-mill-D2-v1",
      domain: "mill",
      version: "v1",
      context: { material: "D2", operation: "roughing", machine: "haas-vf2ss-1" },
      residual: { sfm: { kind: "additive", value: -20 } },
      status: "active",
    });
    expect(res.ok).toBe(true);
    expect(reg.list().length).toBe(1);
  });

  it("register: rejects invalid version format", () => {
    const res = reg.register({
      adapter_id: "bad",
      domain: "mill",
      version: "1.0",
      context: {},
    });
    expect(res.ok).toBe(false);
  });

  it("register: promoting new active demotes current active with same context-key", () => {
    reg.register({
      adapter_id: "A",
      domain: "mill",
      version: "v1",
      context: { material: "D2", operation: "roughing", machine: "M1" },
      status: "active",
    });
    reg.register({
      adapter_id: "B",
      domain: "mill",
      version: "v2",
      context: { material: "D2", operation: "roughing", machine: "M1" },
      status: "active",
    });
    const all = reg.list("mill");
    const A = all.find((a) => a.adapter_id === "A")!;
    const B = all.find((a) => a.adapter_id === "B")!;
    expect(A.status).toBe("archived");
    expect(B.status).toBe("active");
  });

  it("setStatus: can move through staged → shadow → canary → active", () => {
    reg.register({ adapter_id: "X", domain: "mill", version: "v1", context: { material: "D2" }, status: "staged" });
    expect(reg.setStatus({ adapter_id: "X", status: "shadow" }).ok).toBe(true);
    expect(reg.setStatus({ adapter_id: "X", status: "canary" }).ok).toBe(true);
    expect(reg.setStatus({ adapter_id: "X", status: "active" }).ok).toBe(true);
    const x = reg.list().find((a) => a.adapter_id === "X")!;
    expect(x.status).toBe("active");
  });

  it("setStatus: rejects unknown adapter_id", () => {
    const res = reg.setStatus({ adapter_id: "missing", status: "active" });
    expect(res.ok).toBe(false);
    expect(res.warning).toContain("unknown");
  });

  it("rollback: restores the most recently archived peer", () => {
    reg.register({ adapter_id: "v1", domain: "mill", version: "v1", context: { material: "D2", machine: "M1" }, status: "active" });
    reg.register({ adapter_id: "v2", domain: "mill", version: "v2", context: { material: "D2", machine: "M1" }, status: "active" });
    // Now v1 is archived, v2 is active. Roll back.
    const res = reg.rollback("mill", { material: "D2", machine: "M1" });
    expect(res.ok).toBe(true);
    expect(res.adapter_id).toBe("v1");
    const state = reg.list("mill");
    expect(state.find((a) => a.adapter_id === "v1")!.status).toBe("active");
    expect(state.find((a) => a.adapter_id === "v2")!.status).toBe("archived");
  });

  it("resolve: exact context-key match wins over partial", () => {
    reg.register({ adapter_id: "partial", domain: "mill", version: "v1", context: { material: "D2" }, status: "active" });
    reg.register({ adapter_id: "exact",   domain: "mill", version: "v1", context: { material: "D2", operation: "roughing", machine: "M1" }, status: "active" });
    const { adapter } = reg.resolve({
      domain: "mill",
      context: { material: "D2", operation: "roughing", machine: "M1" },
      require_status: ["active"],
    });
    expect(adapter?.adapter_id).toBe("exact");
  });

  it("resolve: returns null when no candidate matches context", () => {
    reg.register({ adapter_id: "steel-only", domain: "mill", version: "v1", context: { material: "D2" }, status: "active" });
    const { adapter } = reg.resolve({
      domain: "mill",
      context: { material: "6061-T6" },   // different material
      require_status: ["active"],
    });
    expect(adapter).toBeNull();
  });

  it("resolve: require_status filter excludes archived", () => {
    reg.register({ adapter_id: "old", domain: "mill", version: "v1", context: { material: "D2" }, status: "archived" });
    const { adapter } = reg.resolve({
      domain: "mill",
      context: { material: "D2" },
      require_status: ["active", "canary"],
    });
    expect(adapter).toBeNull();
  });

  it("resolve: canary adapters are considered", () => {
    reg.register({ adapter_id: "canary-1", domain: "mill", version: "v3", context: { material: "D2" }, status: "canary" });
    const { adapter } = reg.resolve({
      domain: "mill",
      context: { material: "D2" },
      require_status: ["active", "canary"],
    });
    expect(adapter?.adapter_id).toBe("canary-1");
  });

  it("list: filters by domain and status", () => {
    reg.register({ adapter_id: "a1", domain: "mill",  version: "v1", context: {}, status: "active" });
    reg.register({ adapter_id: "a2", domain: "lathe", version: "v1", context: {}, status: "staged" });
    expect(reg.list("mill").length).toBe(1);
    expect(reg.list(undefined, "staged").length).toBe(1);
  });

  it("stats: counts by_domain + by_status", () => {
    reg.register({ adapter_id: "a1", domain: "mill",  version: "v1", context: { material: "D2" }, status: "active" });
    reg.register({ adapter_id: "a2", domain: "mill",  version: "v1", context: { material: "M2" }, status: "active" });
    reg.register({ adapter_id: "a3", domain: "lathe", version: "v1", context: { material: "D2" }, status: "staged" });
    const s = reg.stats();
    expect(s.total).toBe(3);
    expect(s.by_domain.mill).toBe(2);
    expect(s.by_domain.lathe).toBe(1);
    expect(s.by_status.active).toBe(2);
    expect(s.by_status.staged).toBe(1);
  });

  it("crash-tolerant: skips torn registry lines", () => {
    reg.register({ adapter_id: "ok", domain: "mill", version: "v1", context: { material: "D2" }, status: "active" });
    fs.appendFileSync(path.join(root, "registry.jsonl"), "{partial-no-close");
    const s = reg.stats();
    expect(s.total).toBe(1);
  });

  it("self-awareness metadata surfaced", () => {
    const meta = LoRAAdapterRegistryEngine.getSelfAwareness();
    expect(meta.name).toBe("LoRAAdapterRegistryEngine");
    expect(meta.capabilities).toContain("register");
    expect(meta.capabilities).toContain("resolve");
  });

  it("never throws on circular metadata in residual", () => {
    const circ: any = {};
    circ.self = circ;
    expect(() =>
      reg.register({
        adapter_id: "circ",
        domain: "mill",
        version: "v1",
        context: { material: "D2" },
        residual: { sfm: { kind: "additive", value: -10, ...circ } } as any,
        status: "staged",
      }),
    ).not.toThrow();
  });
});
