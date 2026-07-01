/**
 * PluginRegistryEngine tests — HCAP01.  Exact behavior on register/find/dedup.
 */
import { describe, it, expect } from "vitest";
import { PluginRegistryEngine, type PluginManifest } from "../engines/PluginRegistryEngine.js";

const mk = (id: string, side: PluginManifest["side_effect"] = "pure", caps: string[] = ["read"]): PluginManifest => ({
  plugin_id: id, name: id, version: "1.0.0",
  capabilities: caps, input_kinds: [], output_kinds: [],
  side_effect: side, hermes_compliant: true,
});

describe("PluginRegistryEngine.register", () => {
  it("starts empty; first register grows to 1", () => {
    const s = PluginRegistryEngine.register(PluginRegistryEngine.empty(), mk("p1"));
    expect(s.plugins).toHaveLength(1);
    expect(s.plugins[0].plugin_id).toBe("p1");
  });

  it("throws on duplicate plugin_id", () => {
    let s = PluginRegistryEngine.register(PluginRegistryEngine.empty(), mk("dup"));
    expect(() => PluginRegistryEngine.register(s, mk("dup"))).toThrow(/duplicate/);
  });

  it("rejects manifest with zero capabilities (zod min(1))", () => {
    expect(() => PluginRegistryEngine.register(PluginRegistryEngine.empty(), {
      ...mk("p1"), capabilities: [],
    })).toThrow();
  });

  it("rejects unknown side_effect enum", () => {
    expect(() => PluginRegistryEngine.register(PluginRegistryEngine.empty(), {
      ...mk("p1"), side_effect: "yolo" as never,
    })).toThrow();
  });
});

describe("PluginRegistryEngine.findByCapability", () => {
  it("returns plugins exposing the queried capability", () => {
    let s = PluginRegistryEngine.empty();
    s = PluginRegistryEngine.register(s, mk("xlsx-reader", "local-io", ["excel-read"]));
    s = PluginRegistryEngine.register(s, mk("pdf-reader", "local-io", ["pdf-read"]));
    const hits = PluginRegistryEngine.findByCapability(s, "excel-read");
    expect(hits.map((p) => p.plugin_id)).toEqual(["xlsx-reader"]);
  });

  it("returns empty when no plugin matches", () => {
    const s = PluginRegistryEngine.register(PluginRegistryEngine.empty(), mk("p1"));
    expect(PluginRegistryEngine.findByCapability(s, "missing")).toEqual([]);
  });
});

describe("PluginRegistryEngine.filterBySideEffect", () => {
  it("filters to exactly one tier", () => {
    let s = PluginRegistryEngine.empty();
    s = PluginRegistryEngine.register(s, mk("pure_a", "pure"));
    s = PluginRegistryEngine.register(s, mk("ext_b", "external"));
    s = PluginRegistryEngine.register(s, mk("loc_c", "local-io"));
    const ext = PluginRegistryEngine.filterBySideEffect(s, "external");
    expect(ext.map((p) => p.plugin_id)).toEqual(["ext_b"]);
  });
});

describe("PluginRegistryEngine.deregister", () => {
  it("removes the named plugin", () => {
    let s = PluginRegistryEngine.empty();
    s = PluginRegistryEngine.register(s, mk("a"));
    s = PluginRegistryEngine.register(s, mk("b"));
    s = PluginRegistryEngine.deregister(s, "a");
    expect(s.plugins.map((p) => p.plugin_id)).toEqual(["b"]);
  });

  it("throws when target plugin_id not found", () => {
    expect(() => PluginRegistryEngine.deregister(PluginRegistryEngine.empty(), "nope")).toThrow(/not found/);
  });
});

describe("PluginRegistryEngine.renderState", () => {
  it("renders (empty) banner when no plugins", () => {
    expect(PluginRegistryEngine.renderState(PluginRegistryEngine.empty())).toBe("[PLUGINS] (empty)");
  });

  it("renders per-plugin line with id, version, side-effect, cap count", () => {
    const s = PluginRegistryEngine.register(PluginRegistryEngine.empty(), mk("xlsx-reader", "local-io", ["excel-read", "csv-read"]));
    const md = PluginRegistryEngine.renderState(s);
    expect(md.includes("xlsx-reader@1.0.0")).toBe(true);
    expect(md.includes("[local-io]")).toBe(true);
    expect(md.includes("caps=2")).toBe(true);
  });
});
