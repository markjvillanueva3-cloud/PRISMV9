/** PluginPermissionMatrixEngine tests — HCAP16. */
import { describe, it, expect } from "vitest";
import { PluginPermissionMatrixEngine } from "../engines/PluginPermissionMatrixEngine.js";

describe("PluginPermissionMatrixEngine.set / lookup", () => {
  it("starts empty + lookup returns default_verdict", () => {
    const s = PluginPermissionMatrixEngine.empty("deny");
    const v = PluginPermissionMatrixEngine.lookup(s, "xlsx", "excel-read");
    expect(v.verdict).toBe("deny");
    expect(v.reason).toBe("default policy (no matrix entry)");
  });

  it("set + lookup returns the registered verdict", () => {
    let s = PluginPermissionMatrixEngine.empty();
    s = PluginPermissionMatrixEngine.set(s, {
      plugin_id: "xlsx", capability: "excel-read", verdict: "grant", reason: "trusted",
    });
    expect(PluginPermissionMatrixEngine.lookup(s, "xlsx", "excel-read").verdict).toBe("grant");
  });

  it("set replaces existing entry for same (plugin, capability)", () => {
    let s = PluginPermissionMatrixEngine.empty();
    s = PluginPermissionMatrixEngine.set(s, { plugin_id: "x", capability: "c", verdict: "grant" });
    s = PluginPermissionMatrixEngine.set(s, { plugin_id: "x", capability: "c", verdict: "deny" });
    expect(PluginPermissionMatrixEngine.lookup(s, "x", "c").verdict).toBe("deny");
    expect(s.entries.size).toBe(1);
  });

  it("default 'require-approval' surfaces on miss", () => {
    const s = PluginPermissionMatrixEngine.empty("require-approval");
    expect(PluginPermissionMatrixEngine.lookup(s, "x", "y").verdict).toBe("require-approval");
  });
});

describe("PluginPermissionMatrixEngine.remove", () => {
  it("removes the named (plugin, capability) entry", () => {
    let s = PluginPermissionMatrixEngine.empty();
    s = PluginPermissionMatrixEngine.set(s, { plugin_id: "x", capability: "c", verdict: "grant" });
    s = PluginPermissionMatrixEngine.remove(s, "x", "c");
    expect(s.entries.size).toBe(0);
  });

  it("remove throws when entry not found", () => {
    expect(() => PluginPermissionMatrixEngine.remove(PluginPermissionMatrixEngine.empty(), "x", "c")).toThrow(/not found/);
  });
});

describe("PluginPermissionMatrixEngine.filterByVerdict / stats", () => {
  let s = PluginPermissionMatrixEngine.empty();
  s = PluginPermissionMatrixEngine.set(s, { plugin_id: "a", capability: "c1", verdict: "grant" });
  s = PluginPermissionMatrixEngine.set(s, { plugin_id: "b", capability: "c2", verdict: "deny" });
  s = PluginPermissionMatrixEngine.set(s, { plugin_id: "c", capability: "c3", verdict: "require-approval" });

  it("filterByVerdict exact match returns only those entries", () => {
    expect(PluginPermissionMatrixEngine.filterByVerdict(s, "grant").map((e) => e.plugin_id)).toEqual(["a"]);
    expect(PluginPermissionMatrixEngine.filterByVerdict(s, "deny").map((e) => e.plugin_id)).toEqual(["b"]);
    expect(PluginPermissionMatrixEngine.filterByVerdict(s, "require-approval").map((e) => e.plugin_id)).toEqual(["c"]);
  });

  it("stats aggregates exactly", () => {
    const st = PluginPermissionMatrixEngine.stats(s);
    expect(st).toEqual({ grant: 1, deny: 1, require_approval: 1, total: 3 });
  });

  it("rejects unknown verdict (zod adversarial)", () => {
    expect(() => PluginPermissionMatrixEngine.set(PluginPermissionMatrixEngine.empty(), {
      plugin_id: "x", capability: "c", verdict: "yolo" as never,
    })).toThrow();
  });

  it("rejects unknown verdict in filterByVerdict", () => {
    expect(() => PluginPermissionMatrixEngine.filterByVerdict(s, "yolo" as never)).toThrow();
  });

  it("renderState shows default + per-verdict counts", () => {
    const md = PluginPermissionMatrixEngine.renderState(s);
    expect(md.includes("[PERM-MATRIX]")).toBe(true);
    expect(md.includes("total=3")).toBe(true);
    expect(md.includes("grant=1")).toBe(true);
  });
});
